// A career (called a "run" in code) — the Balatro layer's spine. You climb the
// org chart one best-of-3 meeting at a time, each rung a stronger opponent:
//   1. The Intern   — Onboarding sync   — greedy, never passes on purpose
//   2. The Manager  — Weekly 1:1        — greedy + smart passing
//   3. Finance      — Budget review     — lookahead + smart passing
//   4. The VP       — Quarterly Review  — lookahead + a boss drawn at the start
//   5. The CEO      — Board meeting     — lookahead + Reply-All (the CEO's inbox)
// Flow: org chart -> supply closet (draft 1 of up to 3 jokers) -> meeting ->
// org chart ... Lose a meeting and the career ends where you stood; beat the CEO
// and you are promoted. Pure and seeded, like everything in shared.
import { neverPass, smartPass, type MatchPolicy } from './match.js';
import { BOSSES, JOKERS, type Mods } from './mods.js';
import { greedyPolicy, lookaheadPolicy, randomPolicy } from './policies.js';
import { nextInt, shuffle, type RngState } from './rng.js';

/** How the opponent plays. One mapping for the app and the sim, so the
 *  measured ladder IS the shipped ladder. */
export type OpponentKind = 'rookie' | 'greedy' | 'lookahead';

export function opponentPolicy(kind: OpponentKind): MatchPolicy {
  switch (kind) {
    case 'rookie':
      return neverPass(randomPolicy); // the Intern plays anything, never passes on purpose
    case 'greedy':
      return smartPass(greedyPolicy);
    case 'lookahead':
      return smartPass(lookaheadPolicy);
  }
}

export interface Meeting {
  /** The opponent's role on the org chart. */
  readonly role: string;
  /** Avatar initials on the opponent strip. */
  readonly initials: string;
  /** The meeting's name — the game window's title. */
  readonly name: string;
  readonly opponent: OpponentKind;
  /** null = no boss rule; 'drawn' = the career's boss (drawn at the start and
   *  shown up front); anything else = that boss id, always. */
  readonly boss: null | 'drawn' | string;
  /** Extra cards the opponent draws every quarter: seniority's edge, which is
   *  what keeps the climb steep while the player's jokers stack up. */
  readonly edge: number;
  /** Opponent home cells starting at $$ (seniority's head start). */
  readonly homeBoost: number;
}

export const MEETINGS: readonly Meeting[] = [
  { role: 'The Intern', initials: 'INT', name: 'Onboarding sync', opponent: 'rookie', boss: null, edge: 0, homeBoost: 0 },
  { role: 'The Manager', initials: 'MGR', name: 'Weekly 1:1', opponent: 'greedy', boss: null, edge: 0, homeBoost: 0 },
  { role: 'Finance', initials: 'FIN', name: 'Budget review', opponent: 'lookahead', boss: null, edge: 1, homeBoost: 0 },
  { role: 'The VP', initials: 'VP', name: 'Quarterly Review', opponent: 'lookahead', boss: 'drawn', edge: 1, homeBoost: 1 },
  { role: 'The CEO', initials: 'CEO', name: 'Board meeting', opponent: 'lookahead', boss: 'replyall', edge: 2, homeBoost: 2 },
];

/** Bosses the VP can draw — every boss not already fixed to a rung. */
export const DRAWABLE_BOSSES: readonly string[] = Object.keys(BOSSES).filter(
  (b) => !MEETINGS.some((m) => m.boss === b),
);

/**
 * Career stakes (Balatro's post-win difficulty tiers): promoting at stake N
 * unlocks N+1. Each stake is a set of seniority levers applied to EVERY rung on
 * top of the rung's own, cumulative by construction. Measured in
 * sim/src/stakebars.ts against pre-registered bars before shipping.
 */
export interface Stake {
  readonly name: string;
  readonly blurb: string;
  readonly oppEdge: number;
  readonly oppHomeBoost: number;
}

export const STAKES: readonly Stake[] = [
  { name: 'Standard', blurb: 'The org chart as it is.', oppEdge: 0, oppHomeBoost: 0 },
  { name: 'Budget freeze', blurb: 'Every opponent draws +1 card a quarter.', oppEdge: 1, oppHomeBoost: 0 },
  { name: 'Restructuring', blurb: 'Opponents draw +1 card a quarter and start with a $$ home cell.', oppEdge: 1, oppHomeBoost: 1 },
  { name: 'Hostile board', blurb: 'Opponents draw +1 card a quarter and start with two $$ home cells.', oppEdge: 1, oppHomeBoost: 2 },
];

export const OFFER_SIZE = 3;
/** Your desk holds this many jokers; with a full desk the closet stays shut. With
 *  6 jokers a career could otherwise draft a 5th before the CEO, which made the CEO
 *  easier than the VP (runbars L1: 78.2% vs 65.8%); the ladder was tuned at 4. */
export const MAX_JOKERS = 4;

/** 'chart' = on the org chart before the next meeting; 'draft' = in the supply
 *  closet; 'meeting' = playing; 'won' / 'lost' = the career is over. */
export type RunStatus = 'chart' | 'draft' | 'meeting' | 'won' | 'lost';

export interface RunState {
  readonly seed: number;
  /** 1-based index into STAKES. */
  readonly stake: number;
  /** Index into MEETINGS of the current (or next) rung. */
  readonly meeting: number;
  readonly jokers: readonly string[];
  /** The VP's boss, drawn at the start and shown on the org chart. */
  readonly boss: string;
  /** Jokers on offer for the next draft (prepared on the chart). */
  readonly offer: readonly string[];
  readonly status: RunStatus;
  readonly rngState: RngState;
}

function draft(rng: RngState, owned: readonly string[]): [RngState, string[]] {
  const pool = Object.keys(JOKERS).filter((j) => !owned.includes(j));
  const [next, order] = shuffle(rng, pool);
  return [next, owned.length >= MAX_JOKERS ? [] : order.slice(0, OFFER_SIZE)];
}

/** The joker a first career starts with instead of a closet. Measured in
 *  sim/src/firstcareer.ts: with NO joker the Intern fell to 69.8% (bar 75%) and
 *  promotion to 6.8% (bar 10%); Coffee Mug keeps 84.1% / 15.8% and is the easiest
 *  joker to read. */
export const STARTER_JOKER = 'mug';

/** `firstCareer`: a brand-new player's first career walks from the org chart
 *  straight into the Intern with a Coffee Mug — no closet of jokers they cannot
 *  read yet. The closet first opens after beating the Intern. */
export function newRun(seed: number, stake = 1, opts: { firstCareer?: boolean } = {}): RunState {
  if (stake < 1 || stake > STAKES.length) throw new Error(`no stake ${stake}`);
  let rng: RngState = (seed ^ 0x9e3779b9) >>> 0;
  let b: number;
  [rng, b] = nextInt(rng, DRAWABLE_BOSSES.length);
  let offer: string[];
  // Drawn even when discarded, so a seed's boss and later offers stay the same.
  [rng, offer] = draft(rng, []);
  if (opts.firstCareer) offer = [];
  const jokers = opts.firstCareer ? [STARTER_JOKER] : [];
  return { seed, stake, meeting: 0, jokers, boss: DRAWABLE_BOSSES[b]!, offer, status: 'chart', rngState: rng };
}

/** Leave the org chart: to the supply closet, or straight to the meeting when
 *  nothing is left to offer. */
export function leaveChart(run: RunState): RunState {
  if (run.status !== 'chart') throw new Error('not on the org chart');
  return { ...run, status: run.offer.length > 0 ? 'draft' : 'meeting' };
}

export function pickJoker(run: RunState, id: string): RunState {
  if (run.status !== 'draft' || !run.offer.includes(id)) throw new Error(`cannot pick ${id} now`);
  return { ...run, jokers: [...run.jokers, id], offer: [], status: 'meeting' };
}

/** Skip the draft (the player declines everything on offer). */
export function skipDraft(run: RunState): RunState {
  if (run.status !== 'draft') throw new Error('not drafting');
  return { ...run, offer: [], status: 'meeting' };
}

export function finishMeeting(run: RunState, won: boolean): RunState {
  if (run.status !== 'meeting') throw new Error('no meeting in progress');
  if (!won) return { ...run, status: 'lost' };
  if (run.meeting >= MEETINGS.length - 1) return { ...run, status: 'won' };
  const [rng, offer] = draft(run.rngState, run.jokers);
  return { ...run, meeting: run.meeting + 1, offer, status: 'chart', rngState: rng };
}

export function currentMeeting(run: RunState): Meeting {
  return MEETINGS[run.meeting]!;
}

/** The boss rule a rung brings in this career, or null. */
export function bossFor(run: RunState, rung: number): string | null {
  const b = MEETINGS[rung]!.boss;
  return b === null ? null : b === 'drawn' ? run.boss : b;
}

export function meetingMods(run: RunState): Mods {
  const m = currentMeeting(run);
  const s = STAKES[run.stake - 1]!;
  return {
    jokers: run.jokers,
    boss: bossFor(run, run.meeting),
    oppEdge: m.edge + s.oppEdge,
    oppHomeBoost: Math.min(3, m.homeBoost + s.oppHomeBoost),
  };
}

/** A distinct, reproducible deal for each meeting of a career. */
export function meetingSeed(run: RunState): number {
  return (Math.imul(run.seed, 31) + run.meeting * 7919 + 1) >>> 0;
}
