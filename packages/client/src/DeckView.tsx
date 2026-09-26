import { CARDS, SPECIALS, isUnlocked, playerDeck, type Progress } from '@qbr/shared';
import { CardFace } from './CardFace.js';

/**
 * Your deck and the special-card collection, from the Home Screen. Owned cards
 * show with their copy count; specials you have not unlocked are silhouettes
 * that say how to earn them and which starter card they will replace.
 */
export function DeckView({
  progress,
  benched = [],
  onBench,
  onClose,
}: {
  progress: Progress;
  /** Unlocked specials the player has taken out (their starter card is back). */
  benched?: readonly string[];
  onBench?: (benched: string[]) => void;
  onClose: () => void;
}) {
  const deck = playerDeck(progress, benched);
  const unlocked = SPECIALS.filter((s) => isUnlocked(s, progress));
  const toggle = (id: string) =>
    onBench?.(benched.includes(id) ? benched.filter((b) => b !== id) : [...benched, id]);
  const counts = new Map<string, number>();
  for (const id of deck) counts.set(id, (counts.get(id) ?? 0) + 1);
  // Cheapest first, then by value: the order you'd reason about a hand in.
  const owned = [...counts.keys()].sort((a, b) => CARDS[a]!.cost - CARDS[b]!.cost || CARDS[a]!.value - CARDS[b]!.value);
  const locked = SPECIALS.filter((s) => !isUnlocked(s, progress));
  const specialIds = new Set(SPECIALS.map((s) => s.id));

  return (
    <div className="app home deck-screen" data-deck-view>
      <div className="window start-window deck-window">
        <div className="titlebar">
          <span>Your deck — {deck.length} cards</span>
          <span className="tb-buttons">
            <button className="tb-close" data-exit aria-label="Back to home" onClick={onClose}>
              ×
            </button>
          </span>
        </div>
        <div className="start-body deck-body">
          <div className="deck-grid" data-owned>
            {owned.map((id) => (
              <div key={id} className={`card deck-card ${specialIds.has(id) ? 'special' : ''}`} data-owned-card={id}>
                <CardFace id={id} />
                {counts.get(id)! > 1 && <span className="copies">×{counts.get(id)}</span>}
              </div>
            ))}
          </div>

          <h3 className="deck-h">
            Special cards · {SPECIALS.length - locked.length}/{SPECIALS.length} unlocked
          </h3>
          {unlocked.length > 0 && (
            <>
              <p className="deck-hint">Bench a special to put its starter card back. A career’s first org chart shows the VP’s boss — tailor your deck there.</p>
              <ul className="bench-list" data-bench-list>
                {unlocked.map((s) => {
                  const off = benched.includes(s.id);
                  return (
                    <li key={s.id} className={`bench-row ${off ? 'off' : ''}`}>
                      <span className="rung-text">
                        <b>{CARDS[s.id]!.name}</b>
                        <small>replaces a {CARDS[s.replaces]!.name.replace(/\u00AD/g, '')}</small>
                      </span>
                      <button
                        className="btn bench-toggle"
                        data-bench={s.id}
                        aria-pressed={off}
                        aria-label={`${CARDS[s.id]!.name}: ${off ? 'benched' : 'in deck'}`}
                        onClick={() => toggle(s.id)}
                      >
                        {off ? 'Benched' : 'In deck'}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
          {locked.length === 0 ? (
            <p className="pitch">Every special is on your desk. More are coming.</p>
          ) : (
            <ul className="locked-list" data-locked>
              {locked.map((s) => (
                <li key={s.id} className="locked" data-locked-card={s.id}>
                  <span className="lock-sil" aria-hidden>
                    ?
                  </span>
                  <span className="rung-text">
                    <b>{CARDS[s.id]!.name}</b>
                    <small>{s.how}</small>
                    <small className="threat">replaces a {CARDS[s.replaces]!.name.replace(/­/g, '')}</small>
                  </span>
                </li>
              ))}
            </ul>
          )}
          <button className="btn" onClick={onClose}>
            Back to home
          </button>
        </div>
      </div>
    </div>
  );
}
