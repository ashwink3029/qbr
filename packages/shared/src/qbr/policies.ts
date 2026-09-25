// Opponent policies. They double as the Phase 0 measuring instruments: the gap
// between `random`, `greedy` and `lookahead` IS the game's skill headroom. If a
// one-ply greedy player can't be beaten by looking one reply deeper, the game is
// shallow no matter how it is skinned.
import {
  legalPlays,
  newGame,
  reducer,
  revenue,
  rowResults,
  DEFAULT_RULES,
  type Action,
  type GameState,
  type Player,
  type Rules,
} from './game.js';
import { nextInt, type RngState } from './rng.js';

export type Policy = (state: GameState, rng: RngState) => [RngState, Action];

const PASS: Action = { type: 'pass' };

/** Uniform over legal plays; passes only when forced. */
export const randomPolicy: Policy = (state, rng) => {
  const plays = legalPlays(state);
  if (plays.length === 0) return [rng, PASS];
  const [next, i] = nextInt(rng, plays.length);
  return [next, plays[i]!];
};

/**
 * Static evaluation from `me`'s side: banked revenue lead, plus a small credit
 * for row leads not yet decided and for board position (empty cells you own are
 * future placements; budget on them is future card size).
 */
export function evaluate(state: GameState, me: Player): number {
  const them: Player = me === 0 ? 1 : 0;
  const rev = revenue(state);
  let score = rev[me] - rev[them];
  for (const row of rowResults(state)) score += 0.1 * (row.totals[me] - row.totals[them]);
  for (const cell of state.cells) {
    if (cell.card !== null || cell.owner === null) continue;
    const w = 0.4 + 0.15 * cell.budget;
    score += cell.owner === me ? w : -w;
  }
  return score;
}

/** Pick the argmax of `score` over `plays`, breaking ties through the rng so the
 *  policy stays deterministic per seed without always favouring list order. */
function argmax(
  plays: readonly Action[],
  score: (a: Action) => number,
  rng: RngState,
): [RngState, Action] {
  let best = -Infinity;
  let ties: Action[] = [];
  for (const a of plays) {
    const s = score(a);
    if (s > best + 1e-9) {
      best = s;
      ties = [a];
    } else if (Math.abs(s - best) <= 1e-9) {
      ties.push(a);
    }
  }
  const [next, i] = nextInt(rng, ties.length);
  return [next, ties[i]!];
}

/** One ply: the play that maximises the static evaluation right after it. */
export const greedyPolicy: Policy = (state, rng) => {
  const plays = legalPlays(state);
  if (plays.length === 0) return [rng, PASS];
  const me = state.toMove;
  return argmax(plays, (a) => evaluate(reducer(state, a), me), rng);
};

/** Two ply: assume the opponent replies with its best one-ply answer (or passes
 *  if it has none), and pick the play whose worst case is best. */
export const lookaheadPolicy: Policy = (state, rng) => {
  const plays = legalPlays(state);
  if (plays.length === 0) return [rng, PASS];
  const me = state.toMove;
  return argmax(
    plays,
    (a) => {
      const after = reducer(state, a);
      if (after.over) return evaluate(after, me);
      const replies: Action[] = legalPlays(after);
      if (replies.length === 0) replies.push(PASS);
      let worst = Infinity;
      for (const r of replies) worst = Math.min(worst, evaluate(reducer(after, r), me));
      return worst;
    },
    rng,
  );
};

export const POLICIES = {
  random: randomPolicy,
  greedy: greedyPolicy,
  lookahead: lookaheadPolicy,
} as const;
export type PolicyName = keyof typeof POLICIES;

export interface PlayoutResult {
  readonly final: GameState;
  readonly winner: Player | null;
  readonly revenue: readonly [number, number];
  readonly turns: number;
  /** Legal-play count at every decision point, per seat. */
  readonly options: readonly [number[], number[]];
}

/** Play a full quarter between two policies from a seed. Pure and replayable. */
export function playout(
  seed: number,
  deck: readonly string[],
  seats: readonly [Policy, Policy],
  rules: Rules = DEFAULT_RULES,
): PlayoutResult {
  let state = newGame(seed, deck, rules);
  let rng: RngState = (seed * 2654435761) >>> 0;
  const options: [number[], number[]] = [[], []];
  while (!state.over) {
    const p = state.toMove;
    options[p].push(legalPlays(state).length);
    let action: Action;
    [rng, action] = seats[p](state, rng);
    state = reducer(state, action);
  }
  const rev = revenue(state);
  return {
    final: state,
    winner: rev[0] > rev[1] ? 0 : rev[1] > rev[0] ? 1 : null,
    revenue: rev,
    turns: state.turn,
    options,
  };
}
