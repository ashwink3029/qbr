import { describe, expect, it } from 'vitest';
import {
  CARDS,
  SPECIALS,
  STARTER_DECK,
  deckWith,
  isUnlocked,
  newlyUnlocked,
  playerDeck,
  unlockedSpecials,
} from './cards.js';
import { newGame } from './game.js';

const fresh = { bestRung: 0, careers: 0 };

describe('special cards', () => {
  it('every special is a real card and replaces a real starter card', () => {
    for (const s of SPECIALS) {
      expect(CARDS[s.id]).toBeTruthy();
      expect(STARTER_DECK).toContain(s.replaces);
    }
  });

  it('unlock by rungs beaten or careers finished', () => {
    expect(unlockedSpecials(fresh)).toEqual([]);
    expect(unlockedSpecials({ bestRung: 1, careers: 1 })).toEqual(['coffeerun']);
    expect(unlockedSpecials({ bestRung: 5, careers: 1 })).toEqual(['coffeerun', 'perfreview', 'budgetcut', 'takeover', 'parachute']);
    expect(isUnlocked(SPECIALS.find((s) => s.id === 'gossip')!, { bestRung: 0, careers: 3 })).toBe(true);
  });

  it('reports what a career newly unlocked', () => {
    expect(newlyUnlocked({ bestRung: 1, careers: 2 }, { bestRung: 3, careers: 3 })).toEqual(['perfreview', 'budgetcut', 'gossip']);
    expect(newlyUnlocked({ bestRung: 3, careers: 3 }, { bestRung: 2, careers: 4 })).toEqual([]);
  });

  it('upgrades the deck in place: always 15 cards, one copy swapped per special', () => {
    expect(playerDeck(fresh)).toEqual([...STARTER_DECK]);
    const all = deckWith(SPECIALS.map((s) => s.id));
    expect(all).toHaveLength(STARTER_DECK.length);
    for (const s of SPECIALS) expect(all).toContain(s.id);
    // Memo appears twice in the starter deck; Coffee Run replaces exactly one.
    expect(deckWith(['coffeerun']).filter((c) => c === 'memo')).toHaveLength(1);
    expect(() => deckWith(['nope'])).toThrow();
  });

  it('a benched special gives its starter card back; benching a locked one does nothing', () => {
    const p = { bestRung: 2, careers: 0 }; // Coffee Run + Performance Review
    expect(playerDeck(p, ['coffeerun'])).toEqual(deckWith(['perfreview']));
    expect(playerDeck(p, ['coffeerun', 'perfreview'])).toEqual([...STARTER_DECK]);
    expect(playerDeck(p, ['parachute'])).toEqual(playerDeck(p)); // not unlocked yet
  });

  it('a split deck deals the player their upgraded deck and the opponent the starter', () => {
    const player = deckWith(SPECIALS.map((s) => s.id));
    const s = newGame(4, { player, opponent: STARTER_DECK });
    const mine = [...s.hands[0], ...s.decks[0]].sort();
    const theirs = [...s.hands[1], ...s.decks[1]].sort();
    expect(mine).toEqual([...player].sort());
    expect(theirs).toEqual([...STARTER_DECK].sort());
  });
});
