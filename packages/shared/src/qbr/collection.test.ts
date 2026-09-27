import { describe, expect, it } from 'vitest';
import { CARDS, SPECIALS, STARTER_DECK, deckWith } from './cards.js';
import {
  COLLECTIBLES,
  STAR_CAP,
  UNLOCKABLES,
  collectionOf,
  defaultDeck,
  deckStars,
  deckProblem,
  newlyUnlockedCards,
  resolveDeck,
  stars,
  unlockProgress,
  unlockedCards,
} from './collection.js';

const fresh = { bestRung: 0, careers: 0 };
const veteran = { bestRung: 5, careers: 40, stakeCleared: 4, promotions: 10, meetings: 100 };

describe('the card collection', () => {
  it('is a big inventory: every unlockable is a real, unique card outside the starter deck', () => {
    expect(UNLOCKABLES.length).toBeGreaterThanOrEqual(20);
    const ids = UNLOCKABLES.map((u) => u.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const u of UNLOCKABLES) {
      expect(CARDS[u.id]).toBeTruthy();
      expect(STARTER_DECK).not.toContain(u.id);
      expect(STARTER_DECK).toContain(u.replaces); // the swap the balance bars measure
    }
    // The original specials come first, unchanged.
    expect(UNLOCKABLES.slice(0, SPECIALS.length).map((u) => u.id)).toEqual(SPECIALS.map((s) => s.id));
  });

  it('a new player owns exactly the starter deck; a veteran owns everything', () => {
    const c = collectionOf(fresh);
    expect([...c.values()].reduce((a, b) => a + b, 0)).toBe(STARTER_DECK.length);
    expect(c.get('memo')).toBe(2);
    expect(unlockedCards(fresh)).toEqual([]);
    expect(unlockedCards(veteran)).toEqual(UNLOCKABLES.map((u) => u.id));
    for (const u of COLLECTIBLES) expect(collectionOf(veteran).get(u.id)).toBe(u.copies ?? 1);
  });

  it('unlocks spread across many careers: meetings won, promotions, careers', () => {
    const early = unlockedCards({ bestRung: 1, careers: 1, meetings: 1, promotions: 0 });
    const later = unlockedCards({ bestRung: 5, careers: 12, meetings: 30, promotions: 3, stakeCleared: 1 });
    expect(early.length).toBeLessThan(3);
    expect(later.length).toBeGreaterThan(early.length + 8);
    expect(later.length).toBeLessThan(UNLOCKABLES.length);
    expect(newlyUnlockedCards({ ...fresh, meetings: 2 }, { ...fresh, meetings: 3 })).toContain(COLLECTIBLES[0]!.id);
  });

  it('reports progress toward a locked card', () => {
    const u = COLLECTIBLES.find((x) => x.unlock.kind === 'meetings')!;
    const need = (u.unlock as { count: number }).count;
    expect(unlockProgress(u, { ...fresh, meetings: 1 })).toEqual({ have: 1, need });
    expect(unlockProgress(u, { ...fresh, meetings: need + 5 })).toEqual({ have: need, need });
  });

  it('a deck is exactly 15 cards you own', () => {
    expect(deckProblem([...STARTER_DECK], fresh)).toBeNull();
    expect(deckProblem(STARTER_DECK.slice(1), fresh)).toMatch(/14/);
    expect(deckProblem([...STARTER_DECK.slice(0, -1), 'memo'], fresh)).toMatch(/Memo/); // a third Memo
    const swap = [...STARTER_DECK.slice(1), COLLECTIBLES[0]!.id];
    expect(deckProblem(swap, fresh)).not.toBeNull(); // locked
    expect(deckProblem(swap, veteran)).toBeNull();
  });

  it('every card has a 1-5 star rating; the starter deck and every default deck fit the cap', () => {
    for (const id of [...new Set(STARTER_DECK), ...UNLOCKABLES.map((u) => u.id)]) {
      expect(stars(id)).toBeGreaterThanOrEqual(1);
      expect(stars(id)).toBeLessThanOrEqual(5);
    }
    expect(deckStars(STARTER_DECK)).toBeLessThanOrEqual(STAR_CAP);
    for (let rung = 0; rung <= 5; rung++)
      for (const careers of [0, 3, 40])
        for (const stakeCleared of [0, 2, 3, 4]) {
          const d = defaultDeck({ bestRung: rung, careers, stakeCleared });
          expect(deckStars(d)).toBeLessThanOrEqual(STAR_CAP);
          expect(deckProblem(d, veteran)).toBeNull();
        }
  });

  it('the default deck takes specials in unlock order while they fit, and skips the rest', () => {
    const d = defaultDeck(veteran);
    const taken = SPECIALS.filter((s) => d.includes(s.id)).map((s) => s.id);
    expect(taken.length).toBeGreaterThan(0);
    expect(deckWith(taken)).toEqual(d);
  });

  it('a deck over the star cap is not a legal deck, and says so', () => {
    // Swap the lowest-rated starter cards for the highest-rated collectibles until over.
    const deck: string[] = [...STARTER_DECK];
    const strong = [...UNLOCKABLES.map((u) => u.id)].sort((a, b) => stars(b) - stars(a));
    for (const inn of strong) {
      if (deckStars(deck) > STAR_CAP) break;
      const out = [...deck].sort((a, b) => stars(a) - stars(b))[0]!;
      deck[deck.indexOf(out)] = inn;
    }
    expect(deckStars(deck)).toBeGreaterThan(STAR_CAP);
    expect(deckProblem(deck, veteran)).toMatch(/★/);
  });

  it('resolves the saved deck, else the default upgraded deck', () => {
    expect(resolveDeck(null, veteran)).toEqual(defaultDeck(veteran));
    const custom = [...STARTER_DECK.slice(1), COLLECTIBLES[0]!.id];
    expect(resolveDeck(custom, veteran)).toEqual(custom);
    // A saved deck that is no longer legal (e.g. progress reset) falls back.
    expect(resolveDeck(custom, fresh)).toEqual([...STARTER_DECK]);
  });
});
