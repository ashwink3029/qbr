// Discovery + consent for "Play your coworker" — the I/O shell around the pure
// pairingReducer (shared/net/coworker.ts), ported from Cubes' useNearby. One change
// from Cubes: discovery starts only when the player opens the coworker screen, never
// in the background — so iOS's local-network permission prompt appears right after a
// tap that explains it (Cubes' own notes call its background start a risk: a denial
// is sticky and silently kills nearby play).
import { useCallback, useEffect, useRef, useState } from 'react';
import { initialPairState, pairingReducer, type PairEvent, type PairState } from '@qbr/shared';
import type { NetLink } from './multipeerLink.js';
import type { Transport } from './transport.js';

const ASK_TIMEOUT_MS = 20_000;
const DECLINED_LINGER_MS = 2_600;

export interface Nearby {
  readonly state: PairState;
  /** Both sides agreed: hand this to NetGame. */
  readonly ready: Transport | null;
  readonly play: () => void;
  readonly accept: () => void;
  readonly decline: () => void;
  readonly error: string | null;
}

export function useNearby(link: NetLink | null, myName: string): Nearby {
  const [state, setState] = useState<PairState>(initialPairState);
  const [ready, setReady] = useState<Transport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const conn = useRef<Transport | null>(null);
  const stateRef = useRef<PairState>(initialPairState);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clear = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };

  const dispatch = useCallback(
    (e: PairEvent) => {
      const prev = stateRef.current;
      const { state: next, send, teardown } = pairingReducer(prev, e);
      for (const m of send) conn.current?.send(m);
      stateRef.current = next;
      setState(next);
      if (next.phase !== prev.phase) clear();
      if (next.phase === 'joined') {
        if (conn.current) setReady(conn.current);
        return;
      }
      if (teardown) {
        conn.current = null;
        link?.cancel();
        link?.pair(); // keep looking: this screen is still open
        return;
      }
      if (next.phase === 'asking') timer.current = setTimeout(() => dispatch({ t: 'ask-timeout' }), ASK_TIMEOUT_MS);
      if (next.phase === 'declined') timer.current = setTimeout(() => dispatch({ t: 'linger-done' }), DECLINED_LINGER_MS);
    },
    [link],
  );

  useEffect(() => {
    if (!link) return undefined;
    const off = link.listen({
      onError: (m) => setError(m),
      onConnected: (t) => {
        conn.current = t;
        setError(null);
        dispatch({ t: 'connected' });
        t.onMessage((msg) => {
          // Pairing messages only; once joined, NetGame owns the transport.
          if (msg.t === 'join-req' || msg.t === 'join-ok' || msg.t === 'join-no') dispatch({ t: 'recv', msg });
        });
        t.onClose(() => {
          if (stateRef.current.phase === 'joined') return;
          conn.current = null;
          dispatch({ t: 'disconnected' });
        });
      },
    });
    link.pair();
    return () => {
      off();
      clear();
      if (stateRef.current.phase !== 'joined') link.cancel();
    };
  }, [link, dispatch]);

  return {
    state,
    ready,
    error,
    play: useCallback(() => dispatch({ t: 'tap-play', name: myName }), [dispatch, myName]),
    accept: useCallback(() => dispatch({ t: 'tap-accept' }), [dispatch]),
    decline: useCallback(() => dispatch({ t: 'tap-decline' }), [dispatch]),
  };
}
