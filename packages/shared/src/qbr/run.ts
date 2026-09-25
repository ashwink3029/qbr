// A run — the Balatro layer's spine. Three meetings, each a best-of-3 match,
// escalating like Balatro's small blind / big blind / boss blind:
//   1. Quick sync        vs a greedy Finance
//   2. Standup           vs a lookahead Finance
//   3. Quarterly Review  vs a lookahead Finance plus a boss rule
// Before each meeting the player drafts one joker from up to three offered (the
// supply closet). Lose a meeting and the run is over; win the review and you are
// promoted. Pure and seeded, like everything in shared.
import { BOSSES, JOKERS, type Mods } from './mods.js';
import { nextInt, shuffle, type RngState } from './rng.js';

export interface Meeting {
  readonly name: string;
  readonly opponent: 'greedy' | 'lookahead';
  readonly boss: boolean;
}

export const MEETINGS: readonly Meeting[] = [
  { name: 'Quick sync', opponent: 'greedy', boss: false },
  { name: 'Standup', opponent: 'lookahead', boss: false },
  { name: 'Quarterly Review', opponent: 'lookahead', boss: true },
];

export const OFFER_SIZE = 3;

export type RunStatus = 'draft' | 'meeting' | 'won' | 'lost';

export interface RunState {
  readonly seed: number;
  /** Index into MEETINGS of the current (or next) meeting. */
  readonly meeting: number;
  readonly jokers: readonly string[];
  /** The boss waiting at the Quarterly Review, known from the start (like Balatro). */
  readonly boss: string;
  /** Jokers on offer while drafting; empty otherwise. */
  readonly offer: readonly string[];
  readonly status: RunStatus;
  readonly rngState: RngState;
}

function draft(rng: RngState, owned: readonly string[]): [RngState, string[]] {
  const pool = Object.keys(JOKERS).filter((j) => !owned.includes(j));
  const [next, order] = shuffle(rng, pool);
  return [next, order.slice(0, OFFER_SIZE)];
}

export function newRun(seed: number): RunState {
  let rng: RngState = (seed ^ 0x9e3779b9) >>> 0;
  const bosses = Object.keys(BOSSES);
  let b: number;
  [rng, b] = nextInt(rng, bosses.length);
  let offer: string[];
  [rng, offer] = draft(rng, []);
  return { seed, meeting: 0, jokers: [], boss: bosses[b]!, offer, status: 'draft', rngState: rng };
}

export function pickJoker(run: RunState, id: string): RunState {
  if (run.status !== 'draft' || !run.offer.includes(id)) throw new Error(`cannot pick ${id} now`);
  return { ...run, jokers: [...run.jokers, id], offer: [], status: 'meeting' };
}

/** Skip the draft (nothing left to offer, or the player declines). */
export function skipDraft(run: RunState): RunState {
  if (run.status !== 'draft') throw new Error('not drafting');
  return { ...run, offer: [], status: 'meeting' };
}

export function finishMeeting(run: RunState, won: boolean): RunState {
  if (run.status !== 'meeting') throw new Error('no meeting in progress');
  if (!won) return { ...run, status: 'lost' };
  if (run.meeting >= MEETINGS.length - 1) return { ...run, status: 'won' };
  const [rng, offer] = draft(run.rngState, run.jokers);
  return {
    ...run,
    meeting: run.meeting + 1,
    offer,
    status: offer.length > 0 ? 'draft' : 'meeting',
    rngState: rng,
  };
}

export function currentMeeting(run: RunState): Meeting {
  return MEETINGS[run.meeting]!;
}

export function meetingMods(run: RunState): Mods {
  return { jokers: run.jokers, boss: currentMeeting(run).boss ? run.boss : null };
}

/** A distinct, reproducible deal for each meeting of a run. */
export function meetingSeed(run: RunState): number {
  return (Math.imul(run.seed, 31) + run.meeting * 7919 + 1) >>> 0;
}
