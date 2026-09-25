import { describe, expect, it } from 'vitest';
import { STARTER_DECK } from './cards.js';
import { idx, legalPlays, revenue, type GameState } from './game.js';
import {
  DEFAULT_MATCH,
  matchPlayout,
  matchReducer,
  neverPass,
  newMatch,
  smartPass,
  type MatchState,
} from './match.js';
import { greedyPolicy, lookaheadPolicy, randomPolicy } from './policies.js';

const pass = { type: 'pass' } as const;

/** Replace the quarter's board so revenue is fixed: P0 holds `a`, P1 holds `b`. */
function rigged(m: MatchState, a: string | null, b: string | null): MatchState {
  const q = m.quarter;
  const cells = q.cells.map((c, i) =>
    i === idx(0, 0) && a ? { ...c, card: a } : i === idx(0, 4) && b ? { ...c, card: b } : c,
  );
  return { ...m, quarter: { ...q, cells } as GameState };
}

describe('match setup', () => {
  it('deals the opening hand and never draws per turn', () => {
    let m = newMatch(1, STARTER_DECK);
    expect(m.quarter.hands[0]).toHaveLength(DEFAULT_MATCH.openingHand);
    expect(m.lives).toEqual([2, 2]);
    for (let t = 0; t < 4; t++) m = matchReducer(m, legalPlays(m.quarter)[0] ?? pass);
    expect(m.quarter.hands[0].length + m.quarter.hands[1].length).toBe(2 * DEFAULT_MATCH.openingHand - 4);
  });
});

describe('filled cells', () => {
  it('in a match you can never place on a cell that already holds a card, even your own', () => {
    let m = newMatch(9, STARTER_DECK);
    for (let t = 0; t < 12 && !m.over; t++) {
      for (const a of legalPlays(m.quarter)) expect(m.quarter.cells[a.cell]!.card).toBeNull();
      m = matchReducer(m, legalPlays(m.quarter)[0] ?? pass);
    }
  });
});

describe('locking pass', () => {
  it('after you pass, the opponent keeps the turn until they pass', () => {
    let m = newMatch(2, STARTER_DECK);
    m = matchReducer(m, pass); // P0 out
    expect(m.quarter.toMove).toBe(1);
    const play = legalPlays(m.quarter)[0]!;
    m = matchReducer(m, play);
    expect(m.quarter.toMove).toBe(1); // still P1
    expect(m.quarterNo).toBe(1);
    m = matchReducer(m, pass);
    expect(m.quarterNo).toBe(2);
  });
});

describe('quarter transitions', () => {
  it('scores the quarter, costs the loser a life, resets the board, tops up hands, alternates the starter', () => {
    let m = rigged(newMatch(3, STARTER_DECK), 'reorg', 'memo');
    const hands = m.quarter.hands.map((h) => h.length);
    m = matchReducer(matchReducer(m, pass), pass);
    expect(m.results[0]!.winner).toBe(0);
    expect(m.lives).toEqual([2, 1]);
    expect(m.quarterNo).toBe(2);
    expect(m.quarter.cells.every((c) => c.card === null)).toBe(true);
    expect(m.quarter.hands.map((h) => h.length)).toEqual(hands.map((n) => n + DEFAULT_MATCH.drawAfter[0]!));
    expect(m.quarter.toMove).toBe(1);
    expect(m.quarter.passed).toEqual([false, false]);
  });

  it('a tied quarter costs both sides a life', () => {
    let m = newMatch(4, STARTER_DECK);
    m = matchReducer(matchReducer(m, pass), pass);
    expect(revenue(m.quarter)).toEqual([0, 0]);
    expect(m.lives).toEqual([1, 1]);
  });

  it('ends when a side runs out of lives, with the right winner', () => {
    let m = rigged(newMatch(5, STARTER_DECK), 'reorg', null);
    m = matchReducer(matchReducer(m, pass), pass); // P0 wins Q1
    m = rigged(m, 'reorg', null);
    m = matchReducer(matchReducer(m, pass), pass); // P0 wins Q2
    expect(m.over).toBe(true);
    expect(m.winner).toBe(0);
    expect(m.results).toHaveLength(2);
  });

  it('a match of three ties is a draw', () => {
    let m = newMatch(6, STARTER_DECK, { ...DEFAULT_MATCH, lives: 3 });
    for (let q = 0; q < 3; q++) m = matchReducer(matchReducer(m, pass), pass);
    expect(m.over).toBe(true);
    expect(m.winner).toBeNull();
    expect(m.lives).toEqual([0, 0]);
  });
});

describe('match playouts', () => {
  it('terminate and replay identically', () => {
    const seats = [
      [neverPass(randomPolicy), neverPass(randomPolicy)],
      [smartPass(greedyPolicy), neverPass(greedyPolicy)],
      [smartPass(lookaheadPolicy), smartPass(greedyPolicy)],
    ] as const;
    for (const s of seats) {
      for (let seed = 1; seed <= 15; seed++) {
        const a = matchPlayout(seed, STARTER_DECK, s);
        expect(a.final.over).toBe(true);
        expect(a.quarters).toBeGreaterThanOrEqual(2);
        expect(a.quarters).toBeLessThanOrEqual(3);
        expect(matchPlayout(seed, STARTER_DECK, s).final).toEqual(a.final);
      }
    }
  });

  it('smart passers actually pass voluntarily; never-pass players do not', () => {
    let smart = 0;
    let never = 0;
    for (let seed = 1; seed <= 30; seed++) {
      const r = matchPlayout(seed, STARTER_DECK, [smartPass(greedyPolicy), neverPass(greedyPolicy)]);
      smart += r.voluntaryPasses[0];
      never += r.voluntaryPasses[1];
    }
    expect(smart).toBeGreaterThan(0);
    expect(never).toBe(0);
  });
});
