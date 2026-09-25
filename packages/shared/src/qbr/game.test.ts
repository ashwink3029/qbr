import { describe, expect, it } from 'vitest';
import { STARTER_DECK, card } from './cards.js';
import {
  COLS,
  idx,
  legalPlays,
  newGame,
  reducer,
  revenue,
  rowResults,
  BASELINE_RULES,
  DEFAULT_RULES,
  spreadEffects,
  type Cell,
  type GameState,
  type Rules,
} from './game.js';
import { greedyPolicy, lookaheadPolicy, playout, randomPolicy } from './policies.js';

/** A game whose hands are fixed, so tests don't depend on the shuffle. */
function withHands(h0: string[], h1: string[]): GameState {
  return { ...newGame(1, STARTER_DECK, BASELINE_RULES), hands: [h0, h1] };
}

const at = (s: GameState, r: number, c: number): Cell => s.cells[idx(r, c)]!;

describe('setup', () => {
  it('each side owns its home column at budget 1', () => {
    const s = newGame(7, STARTER_DECK);
    for (let r = 0; r < 3; r++) {
      expect(at(s, r, 0)).toEqual({ owner: 0, budget: 1, card: null });
      expect(at(s, r, COLS - 1)).toEqual({ owner: 1, budget: 1, card: null });
      expect(at(s, r, 2).owner).toBeNull();
    }
    expect(s.hands[0]).toHaveLength(5);
    expect(s.decks[0]).toHaveLength(10);
  });

  it('is deterministic per seed', () => {
    expect(newGame(42, STARTER_DECK)).toEqual(newGame(42, STARTER_DECK));
    expect(newGame(42, STARTER_DECK).hands).not.toEqual(newGame(43, STARTER_DECK).hands);
  });
});

describe('spread', () => {
  it('claims neutral cells, bumps own cells, and places the card', () => {
    // Memo spreads up, down, forward. Placed mid-left: up/down are own home cells.
    const s = reducer(withHands(['memo'], []), { type: 'play', card: 'memo', cell: idx(1, 0) });
    expect(at(s, 1, 0).card).toBe('memo');
    expect(at(s, 1, 1)).toEqual({ owner: 0, budget: 1, card: null });
    expect(at(s, 0, 0).budget).toBe(2);
    expect(at(s, 2, 0).budget).toBe(2);
    expect(s.hands[0]).toEqual([]);
  });

  it('mirrors for the right-hand player', () => {
    let s = withHands(['memo'], ['coldcall']);
    s = reducer(s, { type: 'pass' });
    s = reducer(s, { type: 'play', card: 'coldcall', cell: idx(0, 4) });
    expect(at(s, 0, 3)).toEqual({ owner: 1, budget: 1, card: null });
  });

  it('takes an empty enemy cell but keeps its budget', () => {
    let s = withHands(['coldcall'], []);
    s = {
      ...s,
      cells: s.cells.map((c, i) => (i === idx(0, 1) ? { owner: 1, budget: 2, card: null } : c)),
    };
    s = reducer(s, { type: 'play', card: 'coldcall', cell: idx(0, 0) });
    expect(at(s, 0, 1)).toEqual({ owner: 0, budget: 3, card: null });
  });

  it('never touches a cell that holds a card', () => {
    let s = withHands(['coldcall'], []);
    s = {
      ...s,
      cells: s.cells.map((c, i) => (i === idx(0, 1) ? { owner: 1, budget: 1, card: 'memo' } : c)),
    };
    s = reducer(s, { type: 'play', card: 'coldcall', cell: idx(0, 0) });
    expect(at(s, 0, 1)).toEqual({ owner: 1, budget: 1, card: 'memo' });
  });

  it('caps budget at 3', () => {
    let s = withHands(['standup'], []);
    s = { ...s, cells: s.cells.map((c, i) => (i === idx(0, 0) ? { ...c, budget: 3 } : c)) };
    s = reducer(s, { type: 'play', card: 'standup', cell: idx(1, 0) });
    expect(at(s, 0, 0).budget).toBe(3);
  });
});

describe('legality', () => {
  it('rejects a card whose cost exceeds the cell budget', () => {
    const s = withHands(['headcount'], []);
    expect(legalPlays(s)).toEqual([]);
    expect(() => reducer(s, { type: 'play', card: 'headcount', cell: idx(0, 0) })).toThrow(/illegal/);
  });

  it('rejects playing on a cell you do not own', () => {
    const s = withHands(['memo'], []);
    expect(() => reducer(s, { type: 'play', card: 'memo', cell: idx(0, 4) })).toThrow(/illegal/);
  });
});

describe('turn flow', () => {
  it('ends the quarter on two consecutive passes, not one', () => {
    let s = withHands(['memo'], ['memo']);
    s = reducer(s, { type: 'pass' });
    expect(s.over).toBe(false);
    s = reducer(s, { type: 'play', card: 'memo', cell: idx(1, 4) });
    s = reducer(s, { type: 'pass' });
    expect(s.over).toBe(false);
    s = reducer(s, { type: 'pass' });
    expect(s.over).toBe(true);
  });

  it('the incoming player draws from their second turn on', () => {
    let s = newGame(3, STARTER_DECK);
    s = reducer(s, { type: 'pass' }); // P1's first turn: no draw
    expect(s.hands[1]).toHaveLength(5);
    s = reducer(s, { type: 'pass' });
    expect(s.over).toBe(true);
    let t = newGame(3, STARTER_DECK);
    t = reducer(t, legalPlays(t)[0]!);
    t = reducer(t, legalPlays(t)[0]!); // P0 now starts their second turn
    expect(t.hands[0]).toHaveLength(5); // played one, drew one
  });
});

describe('scoring', () => {
  it('the row leader banks the row, ties bank nothing', () => {
    const base = newGame(1, STARTER_DECK);
    const set = new Map<number, Cell>([
      [idx(0, 0), { owner: 0, budget: 1, card: 'slidedeck' }], // 6
      [idx(0, 4), { owner: 1, budget: 1, card: 'reorg' }], // 4
      [idx(1, 0), { owner: 0, budget: 1, card: 'memo' }], // 1
      [idx(1, 4), { owner: 1, budget: 1, card: 'memo' }], // 1 -> tie
      [idx(2, 4), { owner: 1, budget: 1, card: 'coldcall' }], // 2 uncontested
    ]);
    const s = { ...base, cells: base.cells.map((c, i) => set.get(i) ?? c) };
    expect(rowResults(s).map((r) => r.winner)).toEqual([0, null, 1]);
    expect(revenue(s)).toEqual([6, 2]);
  });
});

describe('playouts', () => {
  it('always terminate and replay identically from a seed', () => {
    for (const seats of [
      [randomPolicy, randomPolicy],
      [greedyPolicy, randomPolicy],
      [lookaheadPolicy, greedyPolicy],
    ] as const) {
      for (let seed = 1; seed <= 20; seed++) {
        const a = playout(seed, STARTER_DECK, seats);
        expect(a.final.over).toBe(true);
        expect(a.turns).toBeLessThan(80);
        expect(playout(seed, STARTER_DECK, seats).final).toEqual(a.final);
      }
    }
  });
});

describe('rule variants', () => {
  const rules = (r: Partial<Rules>): Rules => ({ ...BASELINE_RULES, ...r });
  const set = (s: GameState, cells: [number, Cell][]): GameState => {
    const m = new Map(cells);
    return { ...s, cells: s.cells.map((c, i) => m.get(i) ?? c) };
  };

  it('defaults to the adopted rules: all three on', () => {
    expect(newGame(1, STARTER_DECK).rules).toEqual(DEFAULT_RULES);
    expect(DEFAULT_RULES).toMatchObject({ pasteOver: true, takeover: true, cheapOpener: true, lockingPass: false });
  });

  it('spreadEffects previews exactly what the reducer does', () => {
    for (let seed = 1; seed <= 40; seed++) {
      let s = newGame(seed, STARTER_DECK);
      for (let turn = 0; turn < 12 && !s.over; turn++) {
        const plays = legalPlays(s);
        if (plays.length === 0) {
          s = reducer(s, { type: 'pass' });
          continue;
        }
        const a = plays[(seed * 7 + turn) % plays.length]!;
        const p = s.toMove;
        const fx = spreadEffects(s, a.card, a.cell);
        const next = reducer(s, a);
        const claim = new Set(fx.claim);
        const flip = new Set(fx.flip);
        next.cells.forEach((c, i) => {
          const was = s.cells[i]!;
          if (i === a.cell) expect(c.card).toBe(a.card);
          else if (claim.has(i)) expect(c).toEqual({ owner: p, budget: Math.min(3, was.budget + 1), card: null });
          else if (flip.has(i)) expect(c).toEqual({ ...was, owner: p });
          else expect(c).toEqual(was);
        });
        s = next;
      }
    }
  });

  it('paste-over: you may play onto your own occupied cell, replacing its card', () => {
    let s: GameState = { ...newGame(1, STARTER_DECK, rules({ pasteOver: true })), hands: [['coldcall'], []] as [string[], string[]] };
    s = set(s, [[idx(0, 0), { owner: 0, budget: 1, card: 'memo' }]]);
    expect(legalPlays(s).some((a) => a.cell === idx(0, 0))).toBe(true);
    s = reducer(s, { type: 'play', card: 'coldcall', cell: idx(0, 0) });
    expect(at(s, 0, 0).card).toBe('coldcall');
    expect(at(s, 0, 1).owner).toBe(0); // and it spreads again
  });

  it('paste-over is off in the baseline rules', () => {
    let s = withHands(['coldcall'], []);
    s = set(s, [[idx(0, 0), { owner: 0, budget: 1, card: 'memo' }]]);
    expect(legalPlays(s).some((a) => a.cell === idx(0, 0))).toBe(false);
  });

  it('paste-over never lets you play onto an enemy card', () => {
    let s: GameState = { ...newGame(1, STARTER_DECK, rules({ pasteOver: true })), hands: [['coldcall'], []] as [string[], string[]] };
    s = set(s, [[idx(0, 0), { owner: 1, budget: 1, card: 'memo' }]]);
    expect(legalPlays(s).some((a) => a.cell === idx(0, 0))).toBe(false);
  });

  it('takeover: a spread flips an enemy card only if it is weaker than the played card', () => {
    let s: GameState = { ...newGame(1, STARTER_DECK, rules({ takeover: true })), hands: [['coldcall', 'coldcall'], []] as [string[], string[]] };
    s = set(s, [
      [idx(0, 1), { owner: 1, budget: 1, card: 'memo' }], // value 1 < 2: flips
      [idx(1, 1), { owner: 1, budget: 1, card: 'reorg' }], // value 4 > 2: holds
    ]);
    s = reducer(s, { type: 'play', card: 'coldcall', cell: idx(0, 0) });
    expect(at(s, 0, 1)).toEqual({ owner: 0, budget: 1, card: 'memo' });
    s = reducer(s, { type: 'pass' });
    s = reducer(s, { type: 'play', card: 'coldcall', cell: idx(1, 0) });
    expect(at(s, 1, 1).owner).toBe(1);
  });

  it('cheap opener: every opening hand holds a $-cost card', () => {
    for (let seed = 1; seed <= 300; seed++) {
      const s = newGame(seed, STARTER_DECK, rules({ cheapOpener: true }));
      for (const hand of s.hands) expect(hand.some((id) => card(id).cost === 1)).toBe(true);
      expect(s.hands[0].length + s.decks[0].length).toBe(STARTER_DECK.length);
    }
  });

  it('without cheap opener, some opening hands have no $ card (the bug it fixes)', () => {
    let bad = 0;
    for (let seed = 1; seed <= 300; seed++) {
      if (!newGame(seed, STARTER_DECK, BASELINE_RULES).hands[0].some((id) => card(id).cost === 1)) bad++;
    }
    expect(bad).toBeGreaterThan(0);
  });
});
