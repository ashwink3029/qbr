// Words for what the board shows in colour — VoiceOver labels in spreadsheet
// language (cell addresses like "A5", lanes by business unit). Screen-relative,
// like the board itself: "ahead" is up the sheet toward the opponent.
import { card, cellValue, type GameState, type Offset } from '@qbr/shared';
import { spreadToScreen } from './layout.js';

export const LANE_LETTERS = ['A', 'B', 'C'] as const;
export const UNITS = ['Sales', 'Ops', 'R&D'] as const;

const plain = (name: string) => name.replace(/­/g, '');

function offsetWord(o: Offset): string {
  const { dx, dy } = spreadToScreen(o);
  if (dx === 0) return dy < 0 ? `${-dy} ahead` : `${dy} behind`;
  const side = dx < 0 ? 'left' : 'right';
  if (dy === 0) return Math.abs(dx) > 1 ? `${Math.abs(dx)} ${side}` : side;
  return `${dy < 0 ? 'ahead' : 'behind'}-${side}`;
}

/** A card's spread in words, in the card's own order. */
export function spreadWords(id: string): string {
  const s = card(id).spread;
  return s.length === 0 ? 'nowhere' : s.map(offsetWord).join(', ');
}

export function cardLabel(id: string): string {
  const c = card(id);
  return `${plain(c.name)}, costs ${'$'.repeat(c.cost)}, value ${c.value}, spreads ${spreadWords(id)}`;
}

/** A board cell by its on-screen spreadsheet address. */
export function cellLabel(
  game: GameState,
  i: number,
  pos: { sr: number; sc: number },
  who: string,
  locked: boolean,
): string {
  const cell = game.cells[i]!;
  const addr = `${LANE_LETTERS[pos.sc]}${pos.sr + 1}`;
  const owner = cell.owner === 0 ? 'your' : cell.owner === 1 ? `${who}'s` : null;
  let text: string;
  if (cell.card) text = `${addr}, ${owner ?? 'a'} ${plain(card(cell.card).name)}, value ${cellValue(game, i)}`;
  else if (owner === null) text = `${addr}, empty cell`;
  else text = `${addr}, ${owner} cell, budget ${cell.budget > 0 ? '$'.repeat(cell.budget) : 'none'}`;
  return locked ? `${text}, locked` : text;
}

export function laneLabel(lane: number, you: number, them: number, who: string): string {
  const lead = you > them ? 'you lead' : them > you ? `${who} leads` : 'tied';
  return `${UNITS[lane]}: you ${you}, ${who} ${them}, ${lead}`;
}
