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
  mug: { id: 'mug', name: 'Coffee Mug', blurb: '+1 card at the start of every quarter', glyph: 'MUG' },
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
};

export const BOSSES: Readonly<Record<string, ModDef>> = {
  micromanager: {
    id: 'micromanager',
    name: 'The Micromanager',
    blurb: 'Locks the cells in front of your Sales and Ops homes',
    glyph: 'MM',
  },
  legacy: { id: 'legacy', name: 'Legacy System', blurb: 'Finance’s Ops home cell starts with $$', glyph: 'LS' },
  auditor: { id: 'auditor', name: 'The Auditor', blurb: 'Your best card on the sheet counts half', glyph: 'AU' },
  replyall: { id: 'replyall', name: 'Reply-All', blurb: 'Finance draws +2 cards every quarter', glyph: 'RE' },
};

export const hasJoker = (mods: Mods, id: string): boolean => mods.jokers.includes(id);

/** Extra cards a seat receives at the start of every quarter (opening and refills). */
export function bonusDraw(mods: Mods, seat: 0 | 1): number {
  if (seat === 0) return hasJoker(mods, 'mug') ? 1 : 0;
  return mods.boss === 'replyall' ? 2 : 0;
}
