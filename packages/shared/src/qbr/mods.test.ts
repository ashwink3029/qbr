import { describe, expect, it } from 'vitest';
import { STARTER_DECK } from './cards.js';
import {
  DEFAULT_RULES,
  blockedCells,
  canPlay,
  cellValue,
  idx,
  newGame,
  revenue,
  spreadEffects,
  type Cell,
  type GameState,
} from './game.js';
import { DEFAULT_MATCH, matchReducer, newMatch } from './match.js';
import { NO_MODS, type Mods } from './mods.js';

const mods = (m: Partial<Mods>): Mods => ({ ...NO_MODS, ...m });

function board(m: Mods, cells: [number, Cell][], hand: string[] = []): GameState {
  const s = newGame(1, STARTER_DECK, DEFAULT_RULES, m);
  const set = new Map(cells);
  return { ...s, cells: s.cells.map((c, i) => set.get(i) ?? c), hands: [hand, []] };
}

describe('jokers', () => {
  it('Coffee Mug: +1 card at the start of the match and at every refill', () => {
    const plain = newMatch(1, STARTER_DECK);
    const mug = newMatch(1, STARTER_DECK, DEFAULT_MATCH, undefined, mods({ jokers: ['mug'] }));
    expect(mug.quarter.hands[0].length).toBe(plain.quarter.hands[0].length + 1);
    expect(mug.quarter.hands[1].length).toBe(plain.quarter.hands[1].length);
    const pass = { type: 'pass' } as const;
    const q2 = matchReducer(matchReducer(mug, pass), pass);
    expect(q2.quarter.hands[0].length).toBe(mug.quarter.hands[0].length + DEFAULT_MATCH.drawAfter[0]! + 1);
  });

  it('APPROVED Stamp: your $$ and $$$ cards are worth +1, $ cards and Finance unaffected', () => {
    const s = board(mods({ jokers: ['stamp'] }), [
      [idx(0, 0), { owner: 0, budget: 3, card: 'slidedeck' }], // $$$ 6 -> 7
      [idx(0, 1), { owner: 0, budget: 2, card: 'reorg' }], // $$ 4 -> 5
      [idx(1, 0), { owner: 0, budget: 1, card: 'memo' }], // $ 1
      [idx(2, 4), { owner: 1, budget: 3, card: 'headcount' }], // Finance's $$$ 7
    ]);
    expect(cellValue(s, idx(0, 0))).toBe(7);
    expect(cellValue(s, idx(0, 1))).toBe(5);
    expect(cellValue(s, idx(1, 0))).toBe(1);
    expect(cellValue(s, idx(2, 4))).toBe(7);
  });

  it('Conditional Formatting: +1 to each of your cards in a lane you lead, nothing where you trail or tie', () => {
    const s = board(mods({ jokers: ['formatting'] }), [
      [idx(0, 0), { owner: 0, budget: 1, card: 'coldcall' }], // Sales: 2 vs 1 -> lead
      [idx(0, 1), { owner: 0, budget: 1, card: 'memo' }],
      [idx(0, 4), { owner: 1, budget: 1, card: 'memo' }],
      [idx(1, 0), { owner: 0, budget: 1, card: 'memo' }], // Ops: 1 vs 4 -> trail
      [idx(1, 4), { owner: 1, budget: 2, card: 'reorg' }],
      [idx(2, 0), { owner: 0, budget: 1, card: 'memo' }], // R&D: 1 vs 1 -> tie
      [idx(2, 4), { owner: 1, budget: 1, card: 'memo' }],
    ]);
    expect(cellValue(s, idx(0, 0))).toBe(3);
    expect(cellValue(s, idx(0, 1))).toBe(2);
    expect(cellValue(s, idx(0, 4))).toBe(1); // Finance's card unchanged
    expect(cellValue(s, idx(1, 0))).toBe(1);
    expect(cellValue(s, idx(2, 0))).toBe(1);
  });

  it('Circular Reference: a spread off the edge lane wraps to the other side', () => {
    // CC Everyone spreads up/down and diagonally forward; from lane 0 "up" is off-sheet.
    const at = idx(0, 0);
    const plain = spreadEffects(board(NO_MODS, [], ['cc']), 'cc', at, 0);
    const wrapped = spreadEffects(board(mods({ jokers: ['circular'] }), [], ['cc']), 'cc', at, 0);
    expect(plain.claim).not.toContain(idx(2, 0));
    expect(wrapped.claim).toContain(idx(2, 0));
    expect(wrapped.claim).toContain(idx(2, 1));
  });
});

describe('bosses', () => {
  it('Legacy System: Finance’s Ops home cell starts at $$, every quarter', () => {
    const m = newMatch(1, STARTER_DECK, DEFAULT_MATCH, undefined, mods({ boss: 'legacy' }));
    for (let r = 0; r < 3; r++) {
      expect(m.quarter.cells[idx(r, 4)]!.budget).toBe(r === 1 ? 2 : 1);
      expect(m.quarter.cells[idx(r, 0)]!.budget).toBe(1);
    }
    const pass = { type: 'pass' } as const;
    const q2 = matchReducer(matchReducer(m, pass), pass);
    expect(q2.quarter.cells[idx(1, 4)]!.budget).toBe(2);
    expect(blockedCells(mods({ boss: 'legacy' })).size).toBe(0);
  });

  it('The Micromanager: the cell in front of your Ops home is locked — no placing, no claiming', () => {
    const m = mods({ boss: 'micromanager' });
    expect([...blockedCells(m)].sort()).toEqual([idx(0, 1), idx(1, 1)].sort());
    const s = board(m, [], ['coldcall']);
    expect(spreadEffects(s, 'coldcall', idx(1, 0), 0).claim).not.toContain(idx(1, 1));
    const owned = { ...s, cells: s.cells.map((c, i) => (i === idx(1, 1) ? { owner: 0 as const, budget: 3, card: null } : c)) };
    expect(canPlay(owned, 'coldcall', idx(1, 1))).toBe(false);
    expect(canPlay(s, 'coldcall', idx(1, 0))).toBe(true);
  });

  it('The Auditor: your single best card counts half (rounded down)', () => {
    const s = board(mods({ boss: 'auditor' }), [
      [idx(0, 0), { owner: 0, budget: 3, card: 'headcount' }], // 7 -> 3
      [idx(1, 0), { owner: 0, budget: 3, card: 'slidedeck' }], // 6 stays
      [idx(2, 4), { owner: 1, budget: 3, card: 'headcount' }], // Finance's 7 stays
    ]);
    expect(cellValue(s, idx(0, 0))).toBe(3);
    expect(cellValue(s, idx(1, 0))).toBe(6);
    expect(cellValue(s, idx(2, 4))).toBe(7);
    expect(revenue(s)).toEqual([3 + 6, 7]);
  });

  it('seniority: an opponent edge adds cards every quarter; a home boost starts home cells at $$', () => {
    const plain = newMatch(1, STARTER_DECK);
    const senior = newMatch(1, STARTER_DECK, DEFAULT_MATCH, undefined, mods({ oppEdge: 2, oppHomeBoost: 2 }));
    expect(senior.quarter.hands[1].length).toBe(plain.quarter.hands[1].length + 2);
    expect(senior.quarter.hands[0].length).toBe(plain.quarter.hands[0].length);
    expect([0, 1, 2].map((r) => senior.quarter.cells[idx(r, 4)]!.budget)).toEqual([2, 2, 1]);
    expect([0, 1, 2].map((r) => senior.quarter.cells[idx(r, 0)]!.budget)).toEqual([1, 1, 1]);
    const pass = { type: 'pass' } as const;
    const q2 = matchReducer(matchReducer(senior, pass), pass);
    expect(q2.quarter.cells[idx(0, 4)]!.budget).toBe(2); // every quarter
  });

  it('Reply-All: Finance draws +2 at the start and at every refill', () => {
    const plain = newMatch(1, STARTER_DECK);
    const ra = newMatch(1, STARTER_DECK, DEFAULT_MATCH, undefined, mods({ boss: 'replyall' }));
    expect(ra.quarter.hands[1].length).toBe(plain.quarter.hands[1].length + 2);
    expect(ra.quarter.hands[0].length).toBe(plain.quarter.hands[0].length);
  });
});
