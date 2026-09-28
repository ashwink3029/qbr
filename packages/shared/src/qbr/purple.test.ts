import { describe, expect, it } from 'vitest';
import { STARTER_DECK, card } from './cards.js';
import { DEFAULT_RULES, idx, newGame, reducer, spreadEffects, type Cell, type GameState, type Rules } from './game.js';
import { MATCH_RULES } from './match.js';
import { NO_MODS } from './mods.js';

// Purple takeover cells (backlog item 16, user request 2026-09-27): an ordinary card
// does not overpower an adjacent enemy card. Its green reach only claims EMPTY cells.
// Only a card's purple cells (`takes`) take over: a purple reach flips the enemy card
// there, whatever its value. (User asked for "completely flip"; no value check.)

function board(cells: [number, Cell][], hand: string[], rules: Rules = MATCH_RULES): GameState {
  const s = newGame(1, STARTER_DECK, rules);
  const set = new Map(cells);
  return { ...s, cells: s.cells.map((c, i) => set.get(i) ?? c), hands: [hand, []] };
}
const mine = (budget: number): Cell => ({ owner: 0, budget, card: null });
const theirs = (id: string): Cell => ({ owner: 1, budget: 1, card: id });

describe('purple takeover cells', () => {
  it('green reach never flips an enemy card, even a weaker one', () => {
    // Cold Call (value 2) reaches forward onto Finance's Memo (value 1).
    const s = board([[idx(0, 0), mine(1)], [idx(0, 1), theirs('memo')]], ['coldcall']);
    expect(spreadEffects(s, 'coldcall', idx(0, 0)).flip).toEqual([]);
  });

  it('a purple cell flips the enemy card it reaches, whatever its value', () => {
    // Stakeholder (value 3) takes forward; Finance's Headcount there is worth 7.
    const s = board([[idx(1, 0), mine(2)], [idx(1, 1), theirs('headcount')]], ['stakeholder']);
    expect(spreadEffects(s, 'stakeholder', idx(1, 0)).flip).toEqual([idx(1, 1)]);
    const after = reducer(s, { type: 'play', card: 'stakeholder', cell: idx(1, 0) });
    expect(after.cells[idx(1, 1)]!.owner).toBe(0);
    expect(after.cells[idx(1, 1)]!.card).toBe('headcount');
  });

  it('a purple cell on an empty square claims it like green', () => {
    const s = board([[idx(1, 0), mine(2)]], ['stakeholder']);
    const fx = spreadEffects(s, 'stakeholder', idx(1, 0));
    expect(fx.claim).toContain(idx(1, 1)); // purple, forward
    expect(fx.claim).toContain(idx(0, 1)); // green, diagonal
    expect(fx.flip).toEqual([]);
  });

  it('green diagonals of a purple card still leave enemy cards alone', () => {
    const s = board([[idx(1, 0), mine(2)], [idx(0, 1), theirs('memo')]], ['stakeholder']);
    expect(spreadEffects(s, 'stakeholder', idx(1, 0)).flip).toEqual([]);
  });

  it('Change Freeze still stops your purple takeovers', () => {
    const s = { ...board([[idx(1, 0), mine(2)], [idx(1, 1), theirs('memo')]], ['stakeholder']), mods: { ...NO_MODS, boss: 'freeze' } };
    expect(spreadEffects(s, 'stakeholder', idx(1, 0)).flip).toEqual([]);
  });

  it('the purple family: Stakeholder, its upgrades, Hostile Takeover and Merger take forward', () => {
    // Hostile Takeover's whole fan was purple at first: +9.9pp alone and the specials
    // at 79.2% (U3 caps 75%) — so only its forward cell takes over.
    for (const id of ['stakeholder', 'pip', 'deadline', 'merger', 'takeover']) expect(card(id).takes).toEqual([[0, 1]]);
    expect(card('memo').takes ?? []).toEqual([]);
    // Every other card is plain green.
    expect(card('coldcall').takes).toBeUndefined();
  });

  it('Phase 0 single-quarter rules keep the old "weaker card flips" rule, for reproducibility', () => {
    const s = board([[idx(0, 0), mine(1)], [idx(0, 1), theirs('memo')]], ['coldcall'], DEFAULT_RULES);
    expect(spreadEffects(s, 'coldcall', idx(0, 0)).flip).toEqual([idx(0, 1)]);
  });
});
