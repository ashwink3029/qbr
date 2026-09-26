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
  /** May carry soft hyphens (U+00AD) so a long single word breaks cleanly on a
   *  phone-width card instead of overflowing; invisible when it fits. */
  readonly name: string;
  /** Budget the target cell must hold before this card may be placed on it. */
  readonly cost: 1 | 2 | 3;
  /** Revenue this card contributes to its row. */
  readonly value: number;
  readonly spread: readonly Offset[];
  /** On-play ability, acting after claims and takeover flips: `boost` raises
   *  your cards, `weaken` lowers the opponent's (a card at 0 or below is
   *  destroyed). It reaches the cells the spread reaches, or with
   *  `reach: 'lane'` every card in the lane the card is placed in. */
  readonly ability?: {
    readonly kind: 'boost' | 'weaken';
    readonly amount: number;
    readonly reach?: 'spread' | 'lane';
  };
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
  stakeholder: { id: 'stakeholder', name: 'Stake\u00ADholder', cost: 2, value: 3, spread: [[-1, 1], fwd, [1, 1]] },
  slidedeck: { id: 'slidedeck', name: 'Slide Deck', cost: 3, value: 6, spread: [fwd] },
  headcount: { id: 'headcount', name: 'Head\u00ADcount', cost: 3, value: 7, spread: [] },
  vision: {
    id: 'vision',
    name: 'Vision Statement',
    cost: 3,
    value: 4,
    spread: [up, down, fwd, back, [-1, -1], [-1, 1], [1, -1], [1, 1]],
  },

  // ── Special cards: unlocked by climbing careers (see SPECIALS below) ──
  coffeerun: { id: 'coffeerun', name: 'Coffee Run', cost: 1, value: 2, spread: [up, down, [0, 2]] },
  perfreview: { id: 'perfreview', name: 'Performance Review', cost: 2, value: 5, spread: [fwd] },
  budgetcut: { id: 'budgetcut', name: 'Budget Cut', cost: 1, value: 1, spread: [[-1, 1], fwd, [1, 1], [0, 2]] },
  takeover: { id: 'takeover', name: 'Hostile Takeover', cost: 3, value: 8, spread: [[-1, 1], fwd, [1, 1]] },
  parachute: { id: 'parachute', name: 'Golden Parachute', cost: 2, value: 8, spread: [] },
  gossip: { id: 'gossip', name: 'Water Cooler Gossip', cost: 1, value: 1, spread: [up, down, [-1, -1], [1, -1]] },

  // ── Ability specials (unlocked by clearing career stakes) ──
  teambuilding: {
    id: 'teambuilding',
    name: 'Team Building',
    cost: 2,
    value: 3,
    spread: [up, down, fwd, back],
    ability: { kind: 'boost', amount: 2 },
  },
  pip: {
    id: 'pip',
    name: 'Performance Improvement Plan',
    cost: 2,
    value: 3,
    spread: [[-1, 1], fwd, [1, 1]],
    ability: { kind: 'weaken', amount: 2, reach: 'lane' },
  },
};

/** Both seats play the same 15-card list (shuffled independently), so a seat
 *  win-rate measures the seat, not the deck. Opponents always play this; the
 *  player's deck grows with unlocked specials (`playerDeck`). */
export const STARTER_DECK: readonly string[] = [
  'memo', 'memo', 'coldcall', 'coldcall', 'cc', 'standup', 'standup',
  'synergy', 'offsite', 'reorg', 'stakeholder', 'stakeholder',
  'slidedeck', 'headcount', 'vision',
];

/** What the player has achieved, as far as unlocks care. */
export interface Progress {
  /** Most rungs beaten in one career (5 = promoted). */
  readonly bestRung: number;
  /** Careers finished (won or lost). */
  readonly careers: number;
  /** Highest career stake promoted at (0 = none). */
  readonly stakeCleared?: number;
}

export type UnlockCondition =
  | { readonly kind: 'rung'; readonly rungsBeaten: number }
  | { readonly kind: 'careers'; readonly count: number }
  | { readonly kind: 'stake'; readonly cleared: number };

export interface Special {
  readonly id: string;
  /** The starter card this special replaces in the player's deck (one copy).
   *  Specials are UPGRADES, not additions: measured in unlockbars.ts, adding
   *  cards made expensive specials a net loss (dead in the opening hand) and
   *  cheap ones broken — replacing keeps the deck at 15 and every unlock a step up. */
  readonly replaces: string;
  readonly unlock: UnlockCondition;
  /** How the collection screen describes the unlock. */
  readonly how: string;
  /** One line of flavour for the collection screen. */
  readonly flavor: string;
}

/** The special-card inventory, in unlock order. Every entry must pass the
 *  unlock bars in sim/src/unlockbars.ts before it ships. */
export const SPECIALS: readonly Special[] = [
  { id: 'coffeerun', replaces: 'memo', unlock: { kind: 'rung', rungsBeaten: 1 }, how: 'Beat the Intern', flavor: 'Everyone wants a latte. Everyone owes you one.' },
  { id: 'perfreview', replaces: 'slidedeck', unlock: { kind: 'rung', rungsBeaten: 2 }, how: 'Beat the Manager', flavor: 'Exceeds expectations. Barely fits the form.' },
  { id: 'budgetcut', replaces: 'coldcall', unlock: { kind: 'rung', rungsBeaten: 3 }, how: 'Beat Finance', flavor: 'Their line item, your headcount.' },
  { id: 'takeover', replaces: 'vision', unlock: { kind: 'rung', rungsBeaten: 4 }, how: 'Beat the VP', flavor: 'It was never really their department.' },
  { id: 'parachute', replaces: 'headcount', unlock: { kind: 'rung', rungsBeaten: 5 }, how: 'Get promoted (beat the CEO)', flavor: 'Land softly. Land expensively.' },
  { id: 'gossip', replaces: 'standup', unlock: { kind: 'careers', count: 3 }, how: 'Finish 3 careers', flavor: 'Heard it from someone in R&D.' },
  { id: 'teambuilding', replaces: 'synergy', unlock: { kind: 'stake', cleared: 2 }, how: 'Get promoted on Budget freeze', flavor: 'Mandatory fun. Measurable results.' },
  { id: 'pip', replaces: 'stakeholder', unlock: { kind: 'stake', cleared: 3 }, how: 'Get promoted on Restructuring', flavor: 'Thirty days to turn it around.' },
];

export function isUnlocked(s: Special, p: Progress): boolean {
  switch (s.unlock.kind) {
    case 'rung':
      return p.bestRung >= s.unlock.rungsBeaten;
    case 'careers':
      return p.careers >= s.unlock.count;
    case 'stake':
      return (p.stakeCleared ?? 0) >= s.unlock.cleared;
  }
}

export function unlockedSpecials(p: Progress): string[] {
  return SPECIALS.filter((s) => isUnlocked(s, p)).map((s) => s.id);
}

/** Specials that `after` has and `before` did not — what a career just earned. */
export function newlyUnlocked(before: Progress, after: Progress): string[] {
  const had = new Set(unlockedSpecials(before));
  return unlockedSpecials(after).filter((id) => !had.has(id));
}

/** The starter deck with each given special swapped in for one copy of the
 *  card it replaces. Always 15 cards. */
export function deckWith(specialIds: readonly string[]): string[] {
  const deck = STARTER_DECK.slice();
  for (const id of specialIds) {
    const s = SPECIALS.find((x) => x.id === id);
    if (!s) throw new Error(`not a special: ${id}`);
    const at = deck.indexOf(s.replaces);
    if (at < 0) throw new Error(`${id} has no ${s.replaces} left to replace`);
    deck[at] = id;
  }
  return deck;
}

/** The player's deck: the starter deck upgraded by every unlocked special. */
export function playerDeck(p: Progress): string[] {
  return deckWith(unlockedSpecials(p));
}

export function card(id: string): CardDef {
  const c = CARDS[id];
  if (!c) throw new Error(`unknown card: ${id}`);
  return c;
}
