// One quarter (a single round) of QBR, as a pure, action-sourced reducer.
//
// The sheet is 3 rows (business units) x 5 columns. Each cell has an owner, a
// budget of 0..MAX_BUDGET and at most one card. You may place a card only on an
// empty cell you own whose budget covers the card's cost. Placing it "spreads"
// along the card's shape: every EMPTY cell it reaches becomes yours, and its
// budget goes up by one (capped) — so a cell you took from the opponent keeps
// the budget they built there. Cells holding a card are never touched.
//
// A row is won by whoever has more card value in it, and the winner banks that
// row's value as revenue. Ties bank nothing. The quarter ends when both players
// pass back to back.
import { card } from './cards.js';
import { nextRng, shuffle, type RngState } from './rng.js';

export const ROWS = 3;
export const COLS = 5;
export const MAX_BUDGET = 3;
export const HAND_SIZE = 5;

export type Player = 0 | 1;

export interface Cell {
  readonly owner: Player | null;
  readonly budget: number;
  readonly card: string | null;
}

export interface GameState {
  /** Row-major, length ROWS * COLS. */
  readonly cells: readonly Cell[];
  readonly hands: readonly [readonly string[], readonly string[]];
  readonly decks: readonly [readonly string[], readonly string[]];
  readonly toMove: Player;
  /** Consecutive passes; two ends the quarter. */
  readonly passes: number;
  readonly turn: number;
  readonly over: boolean;
  readonly rngState: RngState;
}

export type Action =
  | { readonly type: 'play'; readonly card: string; readonly cell: number }
  | { readonly type: 'pass' };

export const idx = (row: number, col: number): number => row * COLS + col;
export const rowOf = (i: number): number => Math.floor(i / COLS);
export const colOf = (i: number): number => i % COLS;

export function newGame(seed: number, deck0: readonly string[], deck1: readonly string[] = deck0): GameState {
  let rng: RngState = seed;
  let d0: string[];
  let d1: string[];
  [rng, d0] = shuffle(rng, deck0);
  [rng, d1] = shuffle(rng, deck1);
  const cells: Cell[] = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const owner: Player | null = c === 0 ? 0 : c === COLS - 1 ? 1 : null;
      cells.push({ owner, budget: owner === null ? 0 : 1, card: null });
    }
  }
  return {
    cells,
    hands: [d0.slice(0, HAND_SIZE), d1.slice(0, HAND_SIZE)],
    decks: [d0.slice(HAND_SIZE), d1.slice(HAND_SIZE)],
    toMove: 0,
    passes: 0,
    turn: 0,
    over: false,
    // Advance once so the reducer's stream is decorrelated from the shuffle.
    rngState: nextRng(rng)[0],
  };
}

/** Cells reached by `cardId` placed at `at` by `player`, in-bounds only. */
export function spreadTargets(cardId: string, at: number, player: Player): number[] {
  const r0 = rowOf(at);
  const c0 = colOf(at);
  const dir = player === 0 ? 1 : -1;
  const out: number[] = [];
  for (const [dr, dc] of card(cardId).spread) {
    const r = r0 + dr;
    const c = c0 + dc * dir;
    if (r >= 0 && r < ROWS && c >= 0 && c < COLS) out.push(idx(r, c));
  }
  return out;
}

export function canPlay(state: GameState, cardId: string, at: number): boolean {
  if (state.over) return false;
  const p = state.toMove;
  const cell = state.cells[at];
  return (
    cell !== undefined &&
    state.hands[p].includes(cardId) &&
    cell.owner === p &&
    cell.card === null &&
    cell.budget >= card(cardId).cost
  );
}

/** Every legal play for the side to move, one per distinct (card, cell). Pass is
 *  always legal and is not listed. */
export function legalPlays(state: GameState): Extract<Action, { type: 'play' }>[] {
  if (state.over) return [];
  const p = state.toMove;
  const out: Extract<Action, { type: 'play' }>[] = [];
  for (const id of new Set(state.hands[p])) {
    for (let i = 0; i < state.cells.length; i++) {
      if (canPlay(state, id, i)) out.push({ type: 'play', card: id, cell: i });
    }
  }
  return out;
}

export function reducer(state: GameState, action: Action): GameState {
  if (state.over) throw new Error('quarter is over');
  const p = state.toMove;
  let cells = state.cells;
  let hands = state.hands;
  let passes: number;

  if (action.type === 'pass') {
    passes = state.passes + 1;
  } else {
    if (!canPlay(state, action.card, action.cell)) {
      throw new Error(`illegal play: ${action.card} @ ${action.cell}`);
    }
    const next = cells.slice();
    const placed = next[action.cell]!;
    next[action.cell] = { ...placed, card: action.card };
    for (const t of spreadTargets(action.card, action.cell, p)) {
      const c = next[t]!;
      if (c.card !== null) continue;
      next[t] = { owner: p, budget: Math.min(MAX_BUDGET, c.budget + 1), card: null };
    }
    cells = next;
    const hand = hands[p].slice();
    hand.splice(hand.indexOf(action.card), 1);
    hands = p === 0 ? [hand, hands[1]] : [hands[0], hand];
    passes = 0;
  }

  const over = passes >= 2;
  const toMove: Player = p === 0 ? 1 : 0;
  // The incoming player draws one, as in most lane card games. Nobody draws on
  // the very first two turns — opening hands are the whole first decision.
  let decks = state.decks;
  if (!over && state.turn >= 1 && decks[toMove].length > 0) {
    const [top, ...rest] = decks[toMove];
    const hand = [...hands[toMove], top!];
    hands = toMove === 0 ? [hand, hands[1]] : [hands[0], hand];
    decks = toMove === 0 ? [rest, decks[1]] : [decks[0], rest];
  }

  return { ...state, cells, hands, decks, toMove, passes, turn: state.turn + 1, over };
}

export interface RowResult {
  /** Card value each player holds in this row. */
  readonly totals: readonly [number, number];
  readonly winner: Player | null;
}

export function rowResults(state: GameState): RowResult[] {
  const out: RowResult[] = [];
  for (let r = 0; r < ROWS; r++) {
    const totals: [number, number] = [0, 0];
    for (let c = 0; c < COLS; c++) {
      const cell = state.cells[idx(r, c)]!;
      if (cell.card !== null && cell.owner !== null) totals[cell.owner] += card(cell.card).value;
    }
    const winner = totals[0] > totals[1] ? 0 : totals[1] > totals[0] ? 1 : null;
    out.push({ totals, winner });
  }
  return out;
}

/** Revenue banked by each player: the sum of the rows they win. */
export function revenue(state: GameState): [number, number] {
  const out: [number, number] = [0, 0];
  for (const row of rowResults(state)) {
    if (row.winner !== null) out[row.winner] += row.totals[row.winner];
  }
  return out;
}

export function winner(state: GameState): Player | null {
  const [a, b] = revenue(state);
  return a > b ? 0 : b > a ? 1 : null;
}
