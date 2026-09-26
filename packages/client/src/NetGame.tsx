import { useEffect, useRef, useState } from 'react';
import {
  coworkerReducer,
  coworkerStart,
  matchHash,
  mirrorAction,
  mirrorMatch,
  type Action,
  type CoworkerEvent,
  type CoworkerMessage,
  type CoworkerState,
  type MatchState,
  type Player,
  type QuarterResult,
} from '@qbr/shared';
import { Game } from './Game.js';
import type { Transport } from './net/transport.js';

/**
 * "Play your coworker": one match across two phones, in lockstep (shared/net/
 * coworker.ts). Each phone renders the match from its own chair — the guest sees
 * mirrorMatch(real) — so both players get the normal game view with the OTHER
 * person across the table. Game holds that view and reduces view-space moves; this
 * wrapper translates them to real seats for the protocol, and back.
 */
export interface NetGameProps {
  readonly transport: Transport;
  /** This phone's player name and deck (each player brings their own). */
  readonly name: string;
  readonly deck: readonly string[];
  /** Unique per phone; the larger one hosts. Random at the call site. */
  readonly token: number;
  /** Host only: the deal (random at the call site, so this stays deterministic in tests). */
  readonly seed?: number;
  /** The year is over (in MY terms: winner 0 = me) and the result was dismissed. */
  readonly onEnd: (winner: Player | null, results: readonly QuarterResult[]) => void;
  /** Leave: the coworker left, the boards diverged, or the player backed out. */
  readonly onLeave: (reason: string) => void;
}

const initials = (name: string) =>
  name
    .split(/\s+/)
    .map((w) => w[0] ?? '')
    .join('')
    .slice(0, 3)
    .toUpperCase() || 'CW';

export function NetGame({ transport, name, deck, token, seed, onEnd, onLeave }: NetGameProps) {
  const cw = useRef<CoworkerState | null>(null);
  const [state, setState] = useState<CoworkerState | null>(null);
  // The first view of the match (Game keeps it from there) and the coworker's moves.
  const [start, setStart] = useState<MatchState | null>(null);
  const [incoming, setIncoming] = useState<{ id: number; action: Action } | null>(null);

  const toView = (m: MatchState, seat: Player) => (seat === 0 ? m : mirrorMatch(m));
  const viewAction = (a: Action, seat: Player) => (seat === 0 ? a : mirrorAction(a));

  const dispatch = (e: CoworkerEvent) => {
    const prev = cw.current;
    if (!prev) return;
    const r = coworkerReducer(prev, e);
    cw.current = r.state;
    for (const m of r.send) transport.send(m);
    if (r.state !== prev) setState(r.state);
    const s = r.state;
    if (s.phase === 'desync' || s.phase === 'error') onLeave(s.error ?? 'The boards no longer match.');
    // The match just began: hand Game its first view.
    if (s.match && !prev.match) setStart(toView(s.match, s.seat!));
    // The coworker moved: pass it to Game in view terms.
    if (e.t === 'recv' && e.msg.t === 'act' && s.n > prev.n) {
      setIncoming({ id: s.n, action: viewAction(e.msg.action, s.seat!) });
    }
    // The host deals once both hellos are in.
    if (s.seat === 0 && s.peer && !s.match && s.phase === 'hello') {
      dispatch({ t: 'seed', seed: seed ?? ((Date.now() ^ (Math.random() * 0x7fffffff)) >>> 0) });
    }
  };

  useEffect(() => {
    const r = coworkerStart(token, name, deck);
    cw.current = r.state;
    setState(r.state);
    const offMsg = transport.onMessage((msg: CoworkerMessage) => dispatch({ t: 'recv', msg }));
    const offClose = transport.onClose(() => onLeave('Your coworker left.'));
    for (const m of r.send) transport.send(m);
    return () => {
      offMsg();
      offClose();
    };
  }, [transport]);

  if (!state || !start || state.seat === null) {
    return (
      <div className="app home" data-coworker-wait>
        <div className="window start-window">
          <div className="titlebar">
            <span>Play your coworker</span>
          </div>
          <div className="start-body">
            <p className="pitch">Setting up the meeting…</p>
          </div>
        </div>
      </div>
    );
  }

  const peer = state.peer!;
  const seat = state.seat;
  return (
    <div data-coworker-game data-seat={seat}>
      <Game
        initialMatch={start}
        opponentName={peer.name || 'Your coworker'}
        opponentInitials={initials(peer.name)}
        meetingName="Coworker"
        onExit={() => {
          transport.close();
          onLeave('You left the meeting.');
        }}
        onYearEnd={onEnd}
        remote={{
          incoming,
          onLocalAction: (a) => {
            dispatch({ t: 'local', action: seat === 0 ? a : mirrorAction(a) });
          },
        }}
      />
    </div>
  );
}

/** For tests and debugging: this phone's view hash of the real match. */
export const viewHash = (m: MatchState, seat: Player): number => matchHash(seat === 0 ? m : mirrorMatch(m));
