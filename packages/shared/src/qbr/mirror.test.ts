import { describe, expect, it } from 'vitest';
import { STARTER_DECK, deckWith } from './cards.js';
import { COLS, idx, legalPlays, type Action } from './game.js';
import { DEFAULT_MATCH, MATCH_RULES, matchReducer, newMatch, type MatchState } from './match.js';
import { mirrorAction, mirrorMatch } from './mirror.js';
import { nextInt, type RngState } from './rng.js';

// "Play your coworker": the guest is seat 1, but every screen is drawn for seat 0.
// The guest therefore renders mirrorMatch(real) — the same match seen from the other
// chair — and its taps go back through mirrorAction. That is only safe if mirroring
// COMMUTES with the rules: mirror(reduce(m, a)) === reduce(mirror(m), mirror(a)).

function randomPlayouts(seeds: number, fn: (m: MatchState, a: Action) => void): number {
  let checked = 0;
  for (let seed = 1; seed <= seeds; seed++) {
    const deck = { player: deckWith(['coffeerun', 'pip', 'teambuilding']), opponent: STARTER_DECK };
    let m = newMatch(seed, deck, DEFAULT_MATCH, MATCH_RULES);
    let rng: RngState = (seed * 7919) >>> 0;
    while (!m.over) {
      const plays = legalPlays(m.quarter);
      let k: number;
      [rng, k] = nextInt(rng, plays.length + 1); // + pass
      const a: Action = k === plays.length ? { type: 'pass' } : plays[k]!;
      fn(m, a);
      checked++;
      m = matchReducer(m, a);
    }
  }
  return checked;
}

describe('mirror: the match seen from the other chair', () => {
  it('is an involution: mirroring twice gives the same match back', () => {
    randomPlayouts(30, (m) => expect(mirrorMatch(mirrorMatch(m))).toEqual(m));
  });

  it('swaps the seats and flips the board left-right', () => {
    const m = newMatch(3, { player: deckWith(['coffeerun']), opponent: STARTER_DECK });
    const v = mirrorMatch(m);
    expect(v.quarter.hands[0]).toEqual(m.quarter.hands[1]);
    expect(v.quarter.hands[1]).toEqual(m.quarter.hands[0]);
    expect(v.quarter.cells[idx(0, 0)]).toEqual({ ...m.quarter.cells[idx(0, COLS - 1)]!, owner: 0 });
    expect(v.quarter.toMove).toBe(1 - m.quarter.toMove);
    expect(mirrorAction({ type: 'play', card: 'memo', cell: idx(2, 1) })).toEqual({ type: 'play', card: 'memo', cell: idx(2, COLS - 2) });
    expect(mirrorAction({ type: 'pass' })).toEqual({ type: 'pass' });
  });

  it('commutes with the rules over whole random matches (both decks, abilities, takeovers, quarters)', () => {
    const checked = randomPlayouts(200, (m, a) => {
      expect(mirrorMatch(matchReducer(m, a))).toEqual(matchReducer(mirrorMatch(m), mirrorAction(a)));
    });
    expect(checked).toBeGreaterThan(2000);
  });

  it('refuses a match with mods: jokers and bosses belong to fixed seats', () => {
    const m = newMatch(1, STARTER_DECK, DEFAULT_MATCH, MATCH_RULES, { jokers: ['mug'], boss: null });
    expect(() => mirrorMatch(m)).toThrow(/mods/);
  });
});
