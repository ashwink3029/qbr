import { useMemo, useState } from 'react';
import type { Player, QuarterResult } from '@qbr/shared';
import { NetGame } from './NetGame.js';
import type { NetLink } from './net/multipeerLink.js';
import { useNearby } from './net/useNearby.js';

/**
 * "Play your coworker": name yourself, look for a phone nearby (the tap that
 * explains iOS's local-network prompt), agree on both sides, then play one year
 * with them across the table. Each player brings their own deck.
 */
export function CoworkerView({
  makeLink,
  name: savedName,
  deck,
  onName,
  onEnd,
  onClose,
}: {
  makeLink: () => NetLink;
  name: string;
  deck: readonly string[];
  onName: (name: string) => void;
  /** A year ended — record it (winner in MY terms, 0 = me). May be called per rematch. */
  onEnd: (winner: Player | null, results: readonly QuarterResult[]) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(savedName);
  const [looking, setLooking] = useState(false);
  const link = useMemo(() => (looking ? makeLink() : null), [looking]);
  const nearby = useNearby(link, name.trim() || 'A coworker');
  const [left, setLeft] = useState<string | null>(null);
  const token = useMemo(() => (Math.random() * 0x7fffffff) >>> 0, []);

  if (nearby.ready && !left) {
    return (
      <NetGame
        transport={nearby.ready}
        name={name.trim() || 'A coworker'}
        deck={deck}
        token={token}
        onEnd={onEnd}
        onDone={onClose}
        onLeave={(reason) => setLeft(reason)}
      />
    );
  }

  const who = nearby.state.friendName ?? 'Your coworker';
  const phase = nearby.state.phase;
  return (
    <div className="app home" data-coworker-screen>
      <div className="window start-window coworker-window">
        <div className="titlebar">
          <span>Play your coworker</span>
          <span className="tb-buttons">
            <button className="tb-close" data-exit aria-label="Back to home" onClick={onClose}>
              ×
            </button>
          </span>
        </div>
        <div className="start-body">
          {left ? (
            <>
              <p className="pitch">{left}</p>
              <button className="btn primary" onClick={onClose}>
                Back to home
              </button>
            </>
          ) : !looking ? (
            <>
              <p className="pitch">
                Play one year against a coworker on a phone nearby. You each bring your own deck.
              </p>
              <label className="coworker-name">
                Your name
                <input
                  data-coworker-name
                  value={name}
                  maxLength={24}
                  placeholder="shown to your coworker"
                  onChange={(e) => setName(e.target.value)}
                />
              </label>
              <button
                className="btn primary"
                data-coworker-look
                onClick={() => {
                  onName(name.trim());
                  setLooking(true);
                }}
              >
                Look for a coworker
              </button>
              <small className="deck-hint">Your phone will ask to use the local network — that’s how it finds theirs.</small>
            </>
          ) : phase === 'invited' ? (
            <>
              <p className="pitch">
                <b>{who}</b> wants to play.
              </p>
              <button className="btn primary" data-coworker-accept onClick={nearby.accept}>
                Let’s go
              </button>
              <button className="btn" data-coworker-decline onClick={nearby.decline}>
                Not now
              </button>
            </>
          ) : phase === 'asking' ? (
            <p className="pitch">Waiting for them to accept…</p>
          ) : phase === 'found' ? (
            <>
              <p className="pitch">A coworker is nearby.</p>
              <button className="btn primary" data-coworker-play onClick={nearby.play}>
                Play them
              </button>
            </>
          ) : phase === 'declined' ? (
            <p className="pitch">Maybe later.</p>
          ) : (
            <p className="pitch">Looking for a coworker nearby… Ask them to open QBR and tap “Play your coworker”.</p>
          )}
          {nearby.error && <p className="deck-hint">{nearby.error}</p>}
        </div>
      </div>
    </div>
  );
}
