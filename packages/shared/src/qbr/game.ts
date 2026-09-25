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
// pass back to back (or, under `lockingPass`, once both have passed). A
// best-of-3 match of quarters is layered on top in match.ts.
import { card } from './cards.js';
import { NO_MODS, bonusDraw, hasJoker, type Mods } from './mods.js';
import { nextRng, shuffle, type RngState } from './rng.js';

export const ROWS = 3;
export const COLS = 5;
export const MAX_BUDGET = 3;
export const HAND_SIZE = 5;

export type Player = 0 | 1;

/**
 * Optional rules, each a candidate fix for a Phase 0 finding, so the sim can
 * measure them side by side (`pnpm sweep`).
 */
export interface Rules {
  /** You may play onto your OWN cell that already holds a card, replacing it
   *  (the old card is discarded) — "paste over". Relieves territory starvation. */
  readonly pasteOver: boolean;
  /** A spread that reaches an enemy card of strictly lower value flips it to you. */
  readonly takeover: boolean;
  /** Each opening hand is guaranteed at least one $-cost card. */
  readonly cheapOpener: boolean;
  /** Opening hand size. */
  readonly handSize: number;
  /** The incoming player draws a card each turn (single-quarter play). In a
   *  best-of-3 match hands persist and draws come only between quarters. */
  readonly drawPerTurn: boolean;
  /** Gwent-style pass: once you pass you are out for the rest of the quarter and
   *  the opponent plays on alone until they pass. Otherwise two consecutive
   *  passes end the quarter and a pass costs nothing. */
  readonly lockingPass: boolean;
}

/** The rules Phase 0 was first measured on (2/4 bars). Kept for reproducibility. */
export const BASELINE_RULES: Rules = {
  pasteOver: false,
  takeover: false,
  cheapOpener: false,
  handSize: HAND_SIZE,
  drawPerTurn: true,
  lockingPass: false,
};

/** Adopted 2026-09-25 after `pnpm sweep`: all three pass 4/4 pre-registered bars
 *  (2000 seeds: seat 48.8%, floor 90.7%, headroom 83.6%, median 10 plays, 14.4%
 *  thin). pasteOver alone passes; takeover adds headroom 75% -> 83%; cheapOpener
 *  moves no bar but removes the "no legal first move" opening. */
export const DEFAULT_RULES: Rules = { ...BASELINE_RULES, pasteOver: true, takeover: true, cheapOpener: true };

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
  /** Consecutive passes; two ends the quarter (non-locking pass). */
  readonly passes: number;
  /** Who has passed this quarter (locking pass). */
  readonly passed: readonly [boolean, boolean];
  readonly turn: number;
  readonly over: boolean;
  readonly rngState: RngState;
  readonly rules: Rules;
  /** Jokers (seat 0) and boss (seat 1) in force — see mods.ts. */
  readonly mods: Mods;
}

export type Action =
  | { readonly type: 'play'; readonly card: string; readonly cell: number }
  | { readonly type: 'pass' };

export const idx = (row: number, col: number): number => row * COLS + col;
export const rowOf = (i: number): number => Math.floor(i / COLS);
export const colOf = (i: number): number => i % COLS;

export function newGame(
  seed: number,
  deck: readonly string[],
  rules: Rules = DEFAULT_RULES,
  mods: Mods = NO_MODS,
): GameState {
  let rng: RngState = seed;
  let d0: string[];
  let d1: string[];
  [rng, d0] = shuffle(rng, deck);
  [rng, d1] = shuffle(rng, deck);
  if (rules.cheapOpener) {
    d0 = withCheapOpener(d0, rules.handSize);
    d1 = withCheapOpener(d1, rules.handSize);
  }
  const n0 = rules.handSize + bonusDraw(mods, 0);
  const n1 = rules.handSize + bonusDraw(mods, 1);
  return {
    cells: freshBoard(mods),
    hands: [d0.slice(0, n0), d1.slice(0, n1)],
    decks: [d0.slice(n0), d1.slice(n1)],
    toMove: 0,
    passes: 0,
    passed: [false, false],
    turn: 0,
    over: false,
    // Advance once so the reducer's stream is decorrelated from the shuffle.
    rngState: nextRng(rng)[0],
    rules,
    mods,
  };
}

/** Cells nobody may place on or claim, from the boss in force. */
export function blockedCells(mods: Mods): ReadonlySet<number> {
  if (mods.boss === 'micromanager') return new Set([idx(0, 1), idx(1, 1)]);
  return EMPTY_SET;
}
const EMPTY_SET: ReadonlySet<number> = new Set();

/** Does seat 0 lead lane `r` on printed values (+ Stamp)? Conditional
 *  Formatting's trigger — computed without its own bonus, so it cannot feed itself. */
function leadsLane(state: GameState, r: number): boolean {
  let mine = 0;
  let theirs = 0;
  for (let c = 0; c < COLS; c++) {
    const cell = state.cells[idx(r, c)]!;
    if (cell.card === null) continue;
    const def = card(cell.card);
    if (cell.owner === 0) mine += def.value + (hasJoker(state.mods, 'stamp') && def.cost >= 2 ? 1 : 0);
    else if (cell.owner === 1) theirs += def.value;
  }
  return mine > theirs;
}

/** Base value of a card id plus seat-0 joker bonuses. */
function jokerBase(state: GameState, i: number, cardId: string): number {
  const def = card(cardId);
  let v = def.value;
  if (hasJoker(state.mods, 'stamp') && def.cost >= 2) v += 1;
  if (hasJoker(state.mods, 'formatting') && leadsLane(state, rowOf(i))) v += 1;
  return v;
}

/**
 * What the card in cell `i` is worth for scoring, after jokers (seat 0's cards)
 * and the boss (The Auditor halves seat 0's single best card, rounding down).
 * Takeover still compares printed card values — see spreadEffects.
 */
export function cellValue(state: GameState, i: number): number {
  const cell = state.cells[i]!;
  if (cell.card === null) return 0;
  if (cell.owner !== 0) return card(cell.card).value;
  const v = jokerBase(state, i, cell.card);
  if (state.mods.boss !== 'auditor') return v;
  let best = -1;
  let bestAt = -1;
  state.cells.forEach((c, k) => {
    if (c.owner === 0 && c.card !== null) {
      const kv = jokerBase(state, k, c.card);
      if (kv > best) {
        best = kv;
        bestAt = k;
      }
    }
  });
  return bestAt === i ? Math.floor(v / 2) : v;
}

/** Home columns owned at budget 1, everything else neutral and empty. Under
 *  Legacy System, Finance's Ops-lane home cell starts at budget 2. */
export function freshBoard(mods: Mods = NO_MODS): Cell[] {
  const cells: Cell[] = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const owner: Player | null = c === 0 ? 0 : c === COLS - 1 ? 1 : null;
      const boosted = owner === 1 && ((r === 1 && mods.boss === 'legacy') || r < (mods.oppHomeBoost ?? 0));
      const budget = owner === null ? 0 : boosted ? 2 : 1;
      cells.push({ owner, budget, card: null });
    }
  }
  return cells;
}

/** If the top `n` cards hold no $-cost card, swap the first one found deeper
 *  in the deck with the last card of the hand. Deterministic. */
function withCheapOpener(deck: string[], n: number): string[] {
  if (deck.slice(0, n).some((id) => card(id).cost === 1)) return deck;
  const j = deck.findIndex((id, k) => k >= n && card(id).cost === 1);
  if (j < 0) return deck;
  const out = deck.slice();
  [out[n - 1], out[j]] = [out[j]!, out[n - 1]!];
  return out;
}

/** Cells reached by `cardId` placed at `at` by `player`, in-bounds only. With
 *  `wrapLanes` (Circular Reference) a spread off one side re-enters on the other. */
export function spreadTargets(cardId: string, at: number, player: Player, wrapLanes = false): number[] {
  const r0 = rowOf(at);
  const c0 = colOf(at);
  const dir = player === 0 ? 1 : -1;
  const out: number[] = [];
  for (const [dr, dc] of card(cardId).spread) {
    let r = r0 + dr;
    const c = c0 + dc * dir;
    if (wrapLanes) r = ((r % ROWS) + ROWS) % ROWS;
    if (r >= 0 && r < ROWS && c >= 0 && c < COLS) {
      const t = idx(r, c);
      if (t !== at && !out.includes(t)) out.push(t);
    }
  }
  return out;
}

export interface SpreadEffects {
  /** Empty cells that become the player's, each gaining +1 budget. */
  readonly claim: readonly number[];
  /** Enemy cards that flip to the player (takeover rule). */
  readonly flip: readonly number[];
}

/** Exactly what placing `cardId` at `at` would change. The reducer applies this
 *  and the client previews it, so the preview can never disagree with the move. */
export function spreadEffects(state: GameState, cardId: string, at: number, player: Player = state.toMove): SpreadEffects {
  const power = card(cardId).value;
  const claim: number[] = [];
  const flip: number[] = [];
  const wrap = player === 0 && hasJoker(state.mods, 'circular');
  const blocked = blockedCells(state.mods);
  for (const t of spreadTargets(cardId, at, player, wrap)) {
    if (blocked.has(t)) continue;
    const c = state.cells[t]!;
    if (c.card === null) claim.push(t);
    else if (state.rules.takeover && c.owner !== player && card(c.card).value < power) flip.push(t);
  }
  return { claim, flip };
}

export function canPlay(state: GameState, cardId: string, at: number): boolean {
  if (state.over) return false;
  const p = state.toMove;
  const cell = state.cells[at];
  return (
    cell !== undefined &&
    !blockedCells(state.mods).has(at) &&
    state.hands[p].includes(cardId) &&
    cell.owner === p &&
    (cell.card === null || state.rules.pasteOver) &&
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
    const { claim, flip } = spreadEffects(state, action.card, action.cell, p);
    for (const t of claim) {
      next[t] = { owner: p, budget: Math.min(MAX_BUDGET, next[t]!.budget + 1), card: null };
    }
    for (const t of flip) next[t] = { ...next[t]!, owner: p };
    cells = next;
    const hand = hands[p].slice();
    hand.splice(hand.indexOf(action.card), 1);
    hands = p === 0 ? [hand, hands[1]] : [hands[0], hand];
    passes = 0;
  }

  const other: Player = p === 0 ? 1 : 0;
  let passed = state.passed;
  let over: boolean;
  let toMove: Player;
  if (state.rules.lockingPass) {
    if (action.type === 'pass') passed = p === 0 ? [true, passed[1]] : [passed[0], true];
    over = passed[0] && passed[1];
    // Whoever has not passed keeps the turn; alternate while both are in.
    toMove = passed[other] ? p : other;
  } else {
    over = passes >= 2;
    toMove = other;
  }

  // The incoming player draws one, as in most lane card games. Nobody draws on
  // the very first two turns — opening hands are the whole first decision.
  let decks = state.decks;
  if (state.rules.drawPerTurn && !over && state.turn >= 1 && decks[toMove].length > 0) {
    const [top, ...rest] = decks[toMove];
    const hand = [...hands[toMove], top!];
    hands = toMove === 0 ? [hand, hands[1]] : [hands[0], hand];
    decks = toMove === 0 ? [rest, decks[1]] : [decks[0], rest];
  }

  return { ...state, cells, hands, decks, toMove, passes, passed, turn: state.turn + 1, over };
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
      if (cell.card !== null && cell.owner !== null) totals[cell.owner] += cellValue(state, idx(r, c));
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
