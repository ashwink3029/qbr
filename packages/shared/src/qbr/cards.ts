// The card pool. Original to QBR — the mechanic family (cost-gated placement on a
// grid, a card "spreading" control in a fixed shape) is Queen's Blood-shaped,
// but names, numbers and shapes are ours. Keep it that way: see CLAUDE.md.
//
// A card's `spread` is written from the LEFT player's point of view as
// [dRow, dCol] offsets, where +dCol points toward the opponent. The reducer
// mirrors dCol for the right player, so one definition serves both seats.

export type Offset = readonly [dRow: number, dCol: number];

export interface CardDef {
  readonly id: string;
  readonly name: string;
  /** Budget the target cell must hold before this card may be placed on it. */
  readonly cost: 1 | 2 | 3;
  /** Revenue this card contributes to its row. */
  readonly value: number;
  readonly spread: readonly Offset[];
}

const up: Offset = [-1, 0];
const down: Offset = [1, 0];
const fwd: Offset = [0, 1];
const back: Offset = [0, -1];

export const CARDS: Readonly<Record<string, CardDef>> = {
  memo: { id: 'memo', name: 'Memo', cost: 1, value: 1, spread: [up, down, fwd] },
  coldcall: { id: 'coldcall', name: 'Cold Call', cost: 1, value: 2, spread: [fwd] },
  cc: { id: 'cc', name: 'CC Everyone', cost: 1, value: 1, spread: [up, down, [-1, 1], [1, 1]] },
  standup: { id: 'standup', name: 'Standup', cost: 1, value: 2, spread: [up, down] },
  synergy: { id: 'synergy', name: 'Synergy', cost: 2, value: 3, spread: [up, down, fwd, back] },
  offsite: { id: 'offsite', name: 'Offsite', cost: 2, value: 2, spread: [[-1, -1], [-1, 1], [1, -1], [1, 1]] },
  reorg: { id: 'reorg', name: 'Reorg', cost: 2, value: 4, spread: [fwd, [0, 2]] },
  stakeholder: { id: 'stakeholder', name: 'Stakeholder', cost: 2, value: 3, spread: [[-1, 1], fwd, [1, 1]] },
  slidedeck: { id: 'slidedeck', name: 'Slide Deck', cost: 3, value: 6, spread: [fwd] },
  headcount: { id: 'headcount', name: 'Headcount', cost: 3, value: 7, spread: [] },
  vision: {
    id: 'vision',
    name: 'Vision Statement',
    cost: 3,
    value: 4,
    spread: [up, down, fwd, back, [-1, -1], [-1, 1], [1, -1], [1, 1]],
  },
};

/** Both seats play the same 15-card list (shuffled independently), so a seat
 *  win-rate measures the seat, not the deck. */
export const STARTER_DECK: readonly string[] = [
  'memo', 'memo', 'coldcall', 'coldcall', 'cc', 'standup', 'standup',
  'synergy', 'offsite', 'reorg', 'stakeholder', 'stakeholder',
  'slidedeck', 'headcount', 'vision',
];

export function card(id: string): CardDef {
  const c = CARDS[id];
  if (!c) throw new Error(`unknown card: ${id}`);
  return c;
}
