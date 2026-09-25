// A best-of-3 match of quarters — the Gwent layer.
//
// One hand lasts the whole match: an opening hand, no per-turn draw, and a small
// top-up between quarters. Passing is locking (you are out for the rest of the
// quarter; the opponent plays on alone). Each quarter starts on a fresh board and
// is won on revenue. Each side has two lives: losing a quarter costs one, a tied
// quarter costs both one. The match ends when someone is out of lives, or after
// the third quarter.
//
// The tension this is for: cards are the match-long resource, so winning a
// quarter cheaply — or conceding one to keep cards — is the decision. See
// sim/src/matchbars.ts for the pre-registered bars that test whether it works.
import {
  DEFAULT_RULES,
  freshBoard,
  legalPlays,
  newGame,
  reducer,
  revenue,
  type Action,
  type GameState,
  type Player,
  type Rules,
} from './game.js';
import type { Policy } from './policies.js';
import type { RngState } from './rng.js';

export interface MatchConfig {
  readonly openingHand: number;
  /** Cards each player draws before quarter 2, quarter 3. */
  readonly drawAfter: readonly number[];
  readonly lives: number;
}

export const DEFAULT_MATCH: MatchConfig = { openingHand: 8, drawAfter: [3, 2], lives: 2 };

/** Quarter rules inside a match: the adopted single-quarter rules, plus locking
 *  pass and no per-turn draw. */
export const MATCH_RULES: Rules = { ...DEFAULT_RULES, drawPerTurn: false, lockingPass: true };

export interface QuarterResult {
  readonly revenue: readonly [number, number];
  readonly winner: Player | null;
  readonly turns: number;
}

export interface MatchState {
  /** The quarter in play (after the match ends: the last quarter's final board). */
  readonly quarter: GameState;
  /** 1-based. */
  readonly quarterNo: number;
  readonly lives: readonly [number, number];
  readonly results: readonly QuarterResult[];
  /** Who moved first this quarter; the other player starts the next one. */
  readonly starter: Player;
  readonly totalTurns: number;
  readonly over: boolean;
  readonly winner: Player | null;
  readonly config: MatchConfig;
}

export function newMatch(
  seed: number,
  deck: readonly string[],
  config: MatchConfig = DEFAULT_MATCH,
  rules: Rules = MATCH_RULES,
): MatchState {
  return {
    quarter: newGame(seed, deck, { ...rules, handSize: config.openingHand }),
    quarterNo: 1,
    lives: [config.lives, config.lives],
    results: [],
    starter: 0,
    totalTurns: 0,
    over: false,
    winner: null,
    config,
  };
}

export function matchReducer(m: MatchState, action: Action): MatchState {
  if (m.over) throw new Error('match is over');
  const q = reducer(m.quarter, action);
  const totalTurns = m.totalTurns + 1;
  if (!q.over) return { ...m, quarter: q, totalTurns };

  const rev = revenue(q);
  const qWinner: Player | null = rev[0] > rev[1] ? 0 : rev[1] > rev[0] ? 1 : null;
  const lives: [number, number] = [
    m.lives[0] - (qWinner === 0 ? 0 : 1),
    m.lives[1] - (qWinner === 1 ? 0 : 1),
  ];
  const results = [...m.results, { revenue: rev, winner: qWinner, turns: q.turn }];
  const over = lives[0] <= 0 || lives[1] <= 0 || results.length >= 3;
  if (over) {
    const winner: Player | null = lives[0] > lives[1] ? 0 : lives[1] > lives[0] ? 1 : null;
    return { ...m, quarter: q, lives, results, totalTurns, over, winner };
  }

  const n = m.config.drawAfter[results.length - 1] ?? 0;
  const draw = (p: Player): [string[], string[]] => {
    const deck = q.decks[p];
    return [[...q.hands[p], ...deck.slice(0, n)], deck.slice(n)];
  };
  const [h0, d0] = draw(0);
  const [h1, d1] = draw(1);
  const starter: Player = m.starter === 0 ? 1 : 0;
  const next: GameState = {
    ...q,
    cells: freshBoard(),
    hands: [h0, h1],
    decks: [d0, d1],
    toMove: starter,
    passes: 0,
    passed: [false, false],
    turn: 0,
    over: false,
  };
  return { ...m, quarter: next, quarterNo: m.quarterNo + 1, lives, results, starter, totalTurns };
}

// ── Match policies ────────────────────────────────────────────────────────────

export type MatchPolicy = (m: MatchState, rng: RngState) => [RngState, Action];

const PASS: Action = { type: 'pass' };

/** Plays the quarter policy and passes only when it has no legal play — the
 *  control that shows whether choosing WHEN to pass is worth anything. */
export function neverPass(p: Policy): MatchPolicy {
  return (m, rng) => (legalPlays(m.quarter).length === 0 ? [rng, PASS] : p(m.quarter, rng));
}

export interface PassPlan {
  /** Pass while the opponent is still playing once you lead by this much and
   *  hold no more cards than they do — make them spend to catch up. */
  readonly bankLead: number;
  /** Concede a non-deciding quarter when trailing by this much after the
   *  opponent has passed — keep your cards for later. */
  readonly concedeAt: number;
}

export const DEFAULT_PASS_PLAN: PassPlan = { bankLead: 5, concedeAt: 6 };

/**
 * The quarter policy for card choice, plus a Gwent-style pass plan:
 *  - opponent passed and you lead: pass (they cannot answer; keep your cards)
 *  - opponent passed, you trail badly, and this is not a deciding quarter: concede
 *  - opponent still in, you lead comfortably, not deciding: pass to bank it
 *  - a deciding quarter (either side on its last life): never pass voluntarily
 *    unless already winning after the opponent passed.
 */
export function smartPass(p: Policy, plan: PassPlan = DEFAULT_PASS_PLAN): MatchPolicy {
  return (m, rng) => {
    const q = m.quarter;
    if (legalPlays(q).length === 0) return [rng, PASS];
    const me = q.toMove;
    const them: Player = me === 0 ? 1 : 0;
    const rev = revenue(q);
    const lead = rev[me] - rev[them];
    const deciding = m.lives[me] === 1 || m.lives[them] === 1;
    if (q.passed[them]) {
      if (lead > 0) return [rng, PASS];
      if (!deciding && lead <= -plan.concedeAt) return [rng, PASS];
      return p(q, rng);
    }
    if (!deciding && lead >= plan.bankLead && q.hands[me].length <= q.hands[them].length) {
      return [rng, PASS];
    }
    return p(q, rng);
  };
}

export interface MatchPlayout {
  readonly final: MatchState;
  readonly winner: Player | null;
  readonly quarters: number;
  readonly totalTurns: number;
  readonly cardsLeft: readonly [number, number];
  /** Voluntary passes: passes made while holding at least one legal play. */
  readonly voluntaryPasses: readonly [number, number];
}

export function matchPlayout(
  seed: number,
  deck: readonly string[],
  seats: readonly [MatchPolicy, MatchPolicy],
  config: MatchConfig = DEFAULT_MATCH,
  rules: Rules = MATCH_RULES,
): MatchPlayout {
  let m = newMatch(seed, deck, config, rules);
  let rng: RngState = (seed * 2654435761) >>> 0;
  const voluntary: [number, number] = [0, 0];
  while (!m.over) {
    const p = m.quarter.toMove;
    let action: Action;
    [rng, action] = seats[p](m, rng);
    if (action.type === 'pass' && legalPlays(m.quarter).length > 0) voluntary[p]++;
    m = matchReducer(m, action);
  }
  return {
    final: m,
    winner: m.winner,
    quarters: m.results.length,
    totalTurns: m.totalTurns,
    cardsLeft: [m.quarter.hands[0].length, m.quarter.hands[1].length],
    voluntaryPasses: voluntary,
  };
}
