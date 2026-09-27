import { useState } from 'react';
import {
  CARDS,
  DECK_SIZE,
  STARTER_DECK,
  UNLOCKABLES,
  collectionOf,
  deckProblem,
  isUnlocked,
  playerDeck,
  resolveDeck,
  unlockProgress,
  type Progress,
} from '@qbr/shared';
import { CardFace } from './CardFace.js';

const plain = (name: string) => name.replace(/­/g, '');
// Cheapest first, then by value: the order you'd reason about a hand in.
const byCost = (a: string, b: string) => CARDS[a]!.cost - CARDS[b]!.cost || CARDS[a]!.value - CARDS[b]!.value;
const starterIds = new Set(STARTER_DECK);

/**
 * Your deck, built from your collection (Home -> Your deck, or a career's opening
 * org chart). Tap a card in the deck to take it out; tap a card in the collection
 * to put it in. Every winnable card is on show from day one: locked ones are
 * greyed out with how to earn them and how far along you are.
 */
export function DeckView({
  progress,
  saved,
  onSave,
  onClose,
}: {
  progress: Progress;
  /** The built deck, or null for the default (starter + unlocked specials). */
  saved: readonly string[] | null;
  /** Called with each full, legal deck (or null for "Default deck"). */
  onSave: (deck: string[] | null) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<string[]>(() => resolveDeck(saved, progress));
  const owned = collectionOf(progress);
  const used = new Map<string, number>();
  for (const id of draft) used.set(id, (used.get(id) ?? 0) + 1);

  // Tapped a collection card while the deck was full: say how to make room.
  const [full, setFull] = useState(false);
  const change = (next: string[]) => {
    setFull(false);
    setDraft(next);
    if (deckProblem(next, progress) === null) onSave(next);
  };
  const remove = (id: string) => {
    const at = draft.indexOf(id);
    change([...draft.slice(0, at), ...draft.slice(at + 1)]);
  };
  const add = (id: string) => change([...draft, id]);

  const inDeck = [...used.keys()].sort(byCost);
  const unlocked = UNLOCKABLES.filter((u) => isUnlocked(u, progress));
  const locked = UNLOCKABLES.filter((u) => !isUnlocked(u, progress));
  const collection = [...owned.keys()].sort(byCost);
  const short = DECK_SIZE - draft.length;

  return (
    <div className="app home deck-screen" data-deck-view>
      <div className="window start-window deck-window">
        <div className="titlebar">
          <span>
            Your deck — {draft.length}/{DECK_SIZE}
          </span>
          <span className="tb-buttons">
            <button className="tb-close" data-exit aria-label="Back to home" onClick={onClose}>
              ×
            </button>
          </span>
        </div>
        <div className="start-body deck-body">
          <p className={`deck-status ${short > 0 || full ? 'short' : ''}`} data-deck-status>
            {short > 0
              ? `Add ${short} more — until then, careers use your last full deck.`
              : full
                ? 'Your deck is full. Tap a card in it to take it out first.'
                : 'Tap a card to take it out; add one from your collection below.'}
          </p>
          <div className="deck-grid" data-in-deck>
            {inDeck.map((id) => (
              <button
                key={id}
                className={`card deck-card ${starterIds.has(id) ? '' : 'special'}`}
                data-deck-card={id}
                aria-label={`Take a ${plain(CARDS[id]!.name)} out of your deck`}
                onClick={() => remove(id)}
              >
                <CardFace id={id} />
                {used.get(id)! > 1 && <span className="copies">×{used.get(id)}</span>}
              </button>
            ))}
          </div>

          <h3 className="deck-h">
            Collection · {unlocked.length}/{UNLOCKABLES.length} unlocked
          </h3>
          <p className="deck-hint">A career’s first org chart shows the VP’s boss — tailor your deck there.</p>
          <div className="deck-grid" data-collection>
            {collection.map((id) => {
              const left = owned.get(id)! - (used.get(id) ?? 0);
              return (
                <button
                  key={id}
                  className={`card deck-card coll-card ${starterIds.has(id) ? '' : 'special'}`}
                  data-coll-card={id}
                  disabled={left === 0}
                  aria-disabled={short === 0}
                  aria-label={`Add ${plain(CARDS[id]!.name)} to your deck, ${left} left`}
                  onClick={() => (short === 0 ? setFull(true) : add(id))}
                >
                  <CardFace id={id} />
                  <span className="left">{left} left</span>
                </button>
              );
            })}
            {locked.map((u) => {
              const { have, need } = unlockProgress(u, progress);
              return (
                <div key={u.id} className="card deck-card locked-card" data-locked-card={u.id}>
                  <CardFace id={u.id} />
                  <span className="lock-how">
                    <span aria-hidden>🔒 </span>
                    {u.how}
                    {/* A count reads as progress; a stake or a rung is a single goal. */}
                    {(u.unlock.kind === 'meetings' || u.unlock.kind === 'careers' || u.unlock.kind === 'promotions') && need > 1 && (
                      <b className="lock-progress">
                        {' '}
                        {have}/{need}
                      </b>
                    )}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="row-buttons">
            <button
              className="btn"
              data-deck-default
              onClick={() => {
                setDraft(playerDeck(progress));
                onSave(null);
              }}
            >
              Default deck
            </button>
            <button className="btn primary" onClick={onClose}>
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
