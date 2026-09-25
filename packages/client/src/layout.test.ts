import { describe, expect, it } from 'vitest';
import { COLS, ROWS, STARTER_DECK, idx, newGame, reducer, spreadTargets } from '@qbr/shared';
import { fromScreen, spreadToScreen, toScreen } from './layout.js';

describe('portrait layout', () => {
  it('puts your home column on the bottom row and theirs on the top row', () => {
    for (let r = 0; r < ROWS; r++) {
      expect(toScreen(idx(r, 0))).toEqual({ sr: COLS - 1, sc: r });
      expect(toScreen(idx(r, COLS - 1))).toEqual({ sr: 0, sc: r });
    }
  });

  it('is a bijection', () => {
    const seen = new Set<string>();
    for (let i = 0; i < ROWS * COLS; i++) {
      const { sr, sc } = toScreen(i);
      expect(fromScreen(sr, sc)).toBe(i);
      seen.add(`${sr},${sc}`);
    }
    expect(seen.size).toBe(ROWS * COLS);
  });

  it('a Cold Call claims the cell directly above it on screen', () => {
    const s0 = { ...newGame(1, STARTER_DECK), hands: [['coldcall'], []] as [string[], string[]] };
    const at = idx(1, 0);
    const [target] = spreadTargets('coldcall', at, 0);
    const from = toScreen(at);
    expect(toScreen(target!)).toEqual({ sr: from.sr - 1, sc: from.sc });
    const s1 = reducer(s0, { type: 'play', card: 'coldcall', cell: at });
    const above = s1.cells[fromScreen(from.sr - 1, from.sc)]!;
    expect(above.owner).toBe(0);
  });

  it('draws forward as up in card glyphs', () => {
    expect(spreadToScreen([0, 1])).toEqual({ dx: 0, dy: -1 });
    expect(spreadToScreen([-1, 0])).toEqual({ dx: -1, dy: 0 });
  });
});
