import { describe, expect, it } from 'vitest';
import { STARTER_DECK, idx, newGame, type Cell, type GameState } from '@qbr/shared';
import { moveFx, FX_MAX_MS } from './motion.js';

function board(cells: [number, Cell][], hand: string[]): GameState {
  const s = newGame(1, STARTER_DECK);
  const set = new Map(cells);
  return { ...s, cells: s.cells.map((c, i) => set.get(i) ?? c), hands: [hand, []] };
}

describe('moveFx: what a play visibly changes', () => {
  it('a pass animates nothing', () => {
    expect(moveFx(newGame(1, STARTER_DECK), { type: 'pass' })).toBeNull();
  });

  it('marks the placed cell, the claimed cells nearest-first, and the flips', () => {
    // Reorg (spread: forward 1 and 2) from P0's home in lane 0; the far cell holds
    // a weaker Finance card, which Reorg (4) takes over.
    const s = board([[idx(0, 2), { owner: 1, budget: 1, card: 'memo' }]], ['coldcall', 'reorg']);
    const withBudget = { ...s, cells: s.cells.map((c, i) => (i === idx(0, 0) ? { ...c, budget: 2 } : c)) };
    const fx = moveFx(withBudget, { type: 'play', card: 'reorg', cell: idx(0, 0) })!;
    expect(fx.placed).toBe(idx(0, 0));
    expect(fx.by).toBe(0);
    expect(fx.claim).toEqual([{ cell: idx(0, 1), order: 0 }]);
    expect(fx.flip).toEqual([idx(0, 2)]);
  });

  it('orders claims by distance so a spread ripples outward', () => {
    // Vision Statement spreads to all 8 neighbours: adjacent first, diagonals next.
    const s = board([[idx(1, 1), { owner: 0, budget: 3, card: null }]], ['vision']);
    const fx = moveFx(s, { type: 'play', card: 'vision', cell: idx(1, 1) })!;
    const byCell = new Map(fx.claim.map((c) => [c.cell, c.order]));
    expect(byCell.get(idx(1, 2))).toBe(0); // orthogonal
    expect(byCell.get(idx(0, 2))).toBe(1); // diagonal
    expect(Math.max(...fx.claim.map((c) => c.order))).toBe(1);
  });

  it('marks ability targets: boosted cards, weakened cards, and destroyed ones', () => {
    const boost = board(
      [
        [idx(0, 0), { owner: 0, budget: 2, card: null }],
        [idx(1, 0), { owner: 0, budget: 1, card: 'coldcall' }],
      ],
      ['teambuilding'],
    );
    expect(moveFx(boost, { type: 'play', card: 'teambuilding', cell: idx(0, 0) })!.boost).toEqual([idx(1, 0)]);
    // PIP weakens every Finance card in its lane: Headcount survives, a worn Reorg is removed.
    const weaken = board(
      [
        [idx(1, 0), { owner: 0, budget: 2, card: null }],
        [idx(1, 3), { owner: 1, budget: 1, card: 'headcount' }],
        [idx(1, 4), { owner: 1, budget: 1, card: 'reorg', mod: -2 }],
      ],
      ['pip'],
    );
    const fx = moveFx(weaken, { type: 'play', card: 'pip', cell: idx(1, 0) })!;
    expect(fx.weaken).toEqual([idx(1, 3)]);
    expect(fx.destroy).toEqual([idx(1, 4)]);
  });

  it('every animation finishes inside the opponent’s thinking delay', () => {
    expect(FX_MAX_MS).toBeLessThanOrEqual(450);
  });
});
