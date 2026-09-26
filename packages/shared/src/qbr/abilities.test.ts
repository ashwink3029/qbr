import { describe, expect, it } from 'vitest';
import { STARTER_DECK, card } from './cards.js';
import { cellValue, idx, legalPlays, newGame, reducer, spreadEffects, type Cell, type GameState } from './game.js';

// On-play abilities (the Queen's Blood-style depth layer). They act on the cells
// a card's spread reaches, AFTER claims and takeover flips:
//   boost +N:  your cards there gain +N value (a persistent per-cell modifier)
//   weaken -N: opponent cards there lose N; at 0 or below the card is destroyed

function board(cells: [number, Cell][], hand: string[]): GameState {
  const s = newGame(1, STARTER_DECK);
  const set = new Map(cells);
  return { ...s, cells: s.cells.map((c, i) => set.get(i) ?? c), hands: [hand, []] };
}

describe('ability cards', () => {
  it('exist with the documented abilities', () => {
    expect(card('teambuilding').ability).toEqual({ kind: 'boost', amount: 2 });
    expect(card('pip').ability).toEqual({ kind: 'weaken', amount: 2, reach: 'lane' });
    expect(card('memo').ability).toBeUndefined();
  });
});

describe('boost', () => {
  it('raises your cards the spread reaches, and scores them higher', () => {
    // Team Building spreads up/down/forward; your Cold Call sits "down" (lane 1).
    const s = board(
      [
        [idx(0, 0), { owner: 0, budget: 2, card: null }],
        [idx(1, 0), { owner: 0, budget: 1, card: 'coldcall' }],
      ],
      ['teambuilding'],
    );
    expect(spreadEffects(s, 'teambuilding', idx(0, 0), 0).boost).toEqual([idx(1, 0)]);
    const next = reducer(s, { type: 'play', card: 'teambuilding', cell: idx(0, 0) });
    expect(next.cells[idx(1, 0)]!.mod).toBe(2);
    expect(cellValue(next, idx(1, 0))).toBe(4); // Cold Call 2 + 2
  });

  it('never touches opponent cards', () => {
    const s = board(
      [
        [idx(0, 0), { owner: 0, budget: 2, card: null }],
        [idx(0, 1), { owner: 1, budget: 1, card: 'headcount' }], // too strong to flip
      ],
      ['teambuilding'],
    );
    expect(spreadEffects(s, 'teambuilding', idx(0, 0), 0).boost).toEqual([]);
  });
});

describe('weaken (PIP: every opponent card in its lane)', () => {
  it('lowers every opponent card in the lane, not just the ones the spread reaches', () => {
    // PIP ($$ v2) spreads forward only; its weaken reaches the whole lane.
    const s = board(
      [
        [idx(1, 0), { owner: 0, budget: 2, card: null }],
        [idx(1, 1), { owner: 1, budget: 1, card: 'memo' }], // printed 1 < 2: flipped, so spared
        [idx(1, 3), { owner: 1, budget: 1, card: 'headcount' }], // 7 -> 5, far from the spread
        [idx(1, 4), { owner: 1, budget: 1, card: 'reorg' }], // 4 -> 2
        [idx(0, 3), { owner: 1, budget: 1, card: 'reorg' }], // another lane: untouched
      ],
      ['pip'],
    );
    const fx = spreadEffects(s, 'pip', idx(1, 0), 0);
    expect(fx.flip).toEqual([idx(1, 1)]);
    expect(fx.weaken).toEqual([
      { cell: idx(1, 3), destroys: false },
      { cell: idx(1, 4), destroys: false },
    ]);
    const next = reducer(s, { type: 'play', card: 'pip', cell: idx(1, 0) });
    expect(cellValue(next, idx(1, 3))).toBe(5);
    expect(cellValue(next, idx(1, 4))).toBe(2);
    expect(cellValue(next, idx(0, 3))).toBe(4);
    expect(next.cells[idx(1, 1)]!.owner).toBe(0); // the flip still happened
  });

  it('destroys a card whose value falls to 0, leaving an empty cell its owner keeps', () => {
    const s = board(
      [
        [idx(1, 0), { owner: 0, budget: 2, card: null }],
        [idx(1, 4), { owner: 1, budget: 2, card: 'reorg', mod: -2 }], // effective 2: 4-2
      ],
      ['pip'],
    );
    const fx = spreadEffects(s, 'pip', idx(1, 0), 0);
    expect(fx.weaken).toEqual([{ cell: idx(1, 4), destroys: true }]);
    const next = reducer(s, { type: 'play', card: 'pip', cell: idx(1, 0) });
    expect(next.cells[idx(1, 4)]).toEqual({ owner: 1, budget: 2, card: null });
    // An emptied cell is an open cell for its owner again.
    const theirTurn = { ...next, hands: [next.hands[0], ['memo']] as [string[], string[]] };
    expect(legalPlays(theirTurn).some((a) => a.cell === idx(1, 4))).toBe(true);
  });
});
