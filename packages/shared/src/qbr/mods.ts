// Jokers (the player's desk objects) and bosses (the opponent's rule-breakers) —
// the Balatro layer's modifiers. They are data on GameState (`mods`), and every
// rule that reads them lives here, so the reducer, scoring, the AI's evaluation
// and the client's preview all see the same effects.
//
// Jokers always belong to seat 0 (the human in the app, the "player" in sims);
// the boss always sides with seat 1.

export interface Mods {
  readonly jokers: readonly string[];
  readonly boss: string | null;
  /** Extra cards the opponent (seat 1) draws every quarter — a senior rung's
   *  "edge" on the career ladder. Absent = 0. */
  readonly oppEdge?: number;
  /** How many of the opponent's home cells (from the Sales lane down) start at
   *  $$ instead of $ — a senior rung's head start. Absent = 0. */
  readonly oppHomeBoost?: number;
}

export const NO_MODS: Mods = { jokers: [], boss: null };

export interface ModDef {
  readonly id: string;
  readonly name: string;
  /** One line, shown on the joker tile / boss card. */
  readonly blurb: string;
  /** Short art stand-in until the pixel art exists (see IP guardrails). */
  readonly glyph: string;
}

export const JOKERS: Readonly<Record<string, ModDef>> = {
  mug: { id: 'mug', name: 'Coffee Mug', blurb: '+1 card in your opening hand', glyph: 'MUG' },
  stamp: { id: 'stamp', name: 'APPROVED Stamp', blurb: 'Your $$ and $$$ cards are worth +1', glyph: 'OK' },
  formatting: {
    id: 'formatting',
    name: 'Conditional Formatting',
    blurb: '+1 to each of your cards in a lane you lead',
    glyph: 'CF',
  },
  circular: {
    id: 'circular',
    name: 'Circular Reference',
    blurb: 'Your spreads wrap around the sheet’s sides',
    glyph: '↻',
  },
  paste: { id: 'paste', name: 'Paste Special', blurb: 'Play over your own cards; a pasted card flips weaker cards it reaches', glyph: '⌘V' },
  // (Newton's Cradle — claims gain +2 budget — measured +33.7pp: broken. See CLAUDE.md.)
  chair: { id: 'chair', name: 'Ergonomic Chair', blurb: 'Your Ops home cell starts with $$', glyph: 'EC' },
  // Item 25: more desk upgrades, including a tradeoff (a Slay the Spire boss-relic shape).
  label: { id: 'label', name: 'Label Maker', blurb: 'Your cards in your home row are worth +1', glyph: 'LM' },
  monitor: { id: 'monitor', name: 'Second Monitor', blurb: '+1 card before Q2', glyph: '2M' },
  energy: { id: 'energy', name: 'Energy Drink', blurb: '+2 cards in your opening hand, but 1 fewer before Q3', glyph: 'ED' },
  // (Expense Account — $$$ cards on $$ cells — cut: anywhere 72.6%, home row 70.9% (J2 caps 70),
  //  home row + "$ cards -1" only +5.8pp, which diluted random drafts (top stake 1.9%). See CLAUDE.md item 25.)
  corner: { id: 'corner', name: 'Corner Office', blurb: 'Your Ops cards are worth +1, your Sales cards −1', glyph: 'CO' },
};

export const BOSSES: Readonly<Record<string, ModDef>> = {
  micromanager: {
    id: 'micromanager',
    name: 'The Micromanager',
    blurb: 'Locks the cells in front of your Sales and Ops homes',
    glyph: 'MM',
  },
  legacy: { id: 'legacy', name: 'Legacy System', blurb: 'Their Ops home cell starts with $$', glyph: 'LS' },
  auditor: { id: 'auditor', name: 'The Auditor', blurb: 'Your best card on the sheet counts half', glyph: 'AU' },
  freeze: { id: 'freeze', name: 'Change Freeze', blurb: 'Your spreads stop at the middle row and take nothing over', glyph: 'CZ' },
  replyall: { id: 'replyall', name: 'Reply-All', blurb: 'Draws +2 extra cards every quarter', glyph: 'RE' },
  // Exec modifiers (item 25): rules that change HOW you play, one per org to start.
  quota: { id: 'quota', name: 'Quota', blurb: 'Lead the Sales lane or you bank nothing that quarter', glyph: 'QT' },
  teamsync: { id: 'teamsync', name: 'Synergy Offsite', blurb: 'Their cards next to another of theirs are worth +1', glyph: 'SO' },
  scope: { id: 'scope', name: 'Scope Creep', blurb: 'Their spreads reach one cell further forward', glyph: 'SC' },
  redtape: { id: 'redtape', name: 'Red Tape', blurb: 'You can only place in your home row and the row in front', glyph: 'RT' },
  outreach: { id: 'outreach', name: 'Cold Outreach', blurb: 'They start each quarter with the cell in front of each home claimed', glyph: 'OR' },
  politics: { id: 'politics', name: 'Office Politics', blurb: 'Every card they place lowers your cards in its lane by 2', glyph: 'OP' },
};

export const hasJoker = (mods: Mods, id: string): boolean => mods.jokers.includes(id);

/** Extra cards a seat receives at the start of a quarter: the opening hand, or a
 *  between-quarter refill. The Coffee Mug is opening-only (it gave +1 every quarter
 *  until the 2026-09-27 Cold Call rebalance made it 74% — over J2's 70%). */
export function bonusDraw(mods: Mods, seat: 0 | 1, opening = true, refill = 0): number {
  if (seat === 0) {
    let n = 0;
    if (opening && hasJoker(mods, 'mug')) n += 1;
    if (!opening && refill === 1 && hasJoker(mods, 'monitor')) n += 1; // before Q2 only
    if (hasJoker(mods, 'energy')) n += opening ? 2 : refill === 2 ? -1 : 0; // the crash comes before Q3
    return n;
  }
  return (mods.boss === 'replyall' ? 2 : 0) + (mods.oppEdge ?? 0);
}
