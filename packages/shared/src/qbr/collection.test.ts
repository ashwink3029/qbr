import { describe, expect, it } from 'vitest';
import { CARDS, SPECIALS, STARTER_DECK, deckWith, playerDeck } from './cards.js';
import * as shared from '../index.js';
import {
  COLLECTIBLES,
  UNLOCKABLES,
  collectionOf,
  defaultDeck,
  deckProblem,
  newlyUnlockedCards,
  resolveDeck,
  unlockProgress,
  unlockedCards,
} from './collection.js';

const fresh = { bestRung: 0, careers: 0 };
const veteran = { bestRung: 5, careers: 40, stakeCleared: 4, promotions: 10, meetings: 100, orgsPromoted: ['finance', 'marketing', 'sales', 'legal', 'tech', 'hr'] };

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

  it('there is no power ceiling (user decision 2026-09-27): the strongest measured build is legal', () => {
    // The best deck the item-14 climbs found (88.2% vs the starter-deck ladder).
    const strongest = ['cc', 'coffeerun', 'corneroffice', 'deadline', 'gossip', 'hackathon', 'highfive', 'memo', 'pip', 'pivot', 'stakeholder', 'stakeholder', 'summerintern', 'teambuilding', 'vision'];
    expect(deckProblem(strongest, veteran)).toBeNull();
    expect('STAR_CAP' in shared).toBe(false);
    expect('stars' in shared).toBe(false);
  });

  it('the default deck is the starter deck with every unlocked special swapped in', () => {
    expect(defaultDeck(veteran)).toEqual(deckWith(SPECIALS.map((s) => s.id)));
    for (let rung = 0; rung <= 5; rung++)
      for (const careers of [0, 3, 40])
        for (const stakeCleared of [0, 2, 3, 4]) {
          const p = { bestRung: rung, careers, stakeCleared };
          expect(defaultDeck(p)).toEqual(playerDeck(p));
          expect(deckProblem(defaultDeck(p), veteran)).toBeNull();
        }
  });

  it('resolves the saved deck, else the default upgraded deck', () => {
    expect(resolveDeck(null, veteran)).toEqual(defaultDeck(veteran));
    const custom = [...STARTER_DECK.slice(1), COLLECTIBLES[0]!.id];
    expect(resolveDeck(custom, veteran)).toEqual(custom);
    // A saved deck that is no longer legal (e.g. progress reset) falls back.
    expect(resolveDeck(custom, fresh)).toEqual([...STARTER_DECK]);
  });
});
