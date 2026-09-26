// The player's year-by-year record, kept on the device. localStorage can be
// missing or throw (private mode, cleared data, some WKWebView states), so every
// access is guarded and the app works identically without it.
import type { Player, Progress, QuarterResult } from '@qbr/shared';

export interface Record {
  readonly wins: number;
  readonly losses: number;
  readonly draws: number;
  /** Last year's quarters from the player's side, e.g. "W L W". */
  readonly last: string | null;
  readonly lastOutcome: 'win' | 'loss' | 'draw' | null;
  /** Runs started and finished (won or lost), and runs that ended in promotion. */
  readonly runs: number;
  readonly promotions: number;
  /** Most meetings won in a single run (3 = promoted). */
  readonly bestMeetings: number;
  /** Highest career stake promoted at (0 = none). Stake N+1 is open to play. */
  readonly stakeCleared: number;
  /** The last daily career attempted (one a day), or null. */
  readonly daily: Daily | null;
  /** Years against a coworker's phone ("Play your coworker"), kept apart. */
  readonly coworker: { readonly wins: number; readonly losses: number; readonly draws: number };
}

export interface Daily {
  /** `YYYY-MM-DD`, local. */
  readonly day: string;
  /** Rungs beaten (5 = promoted); null while that day's career is in progress. */
  readonly beaten: number | null;
  readonly promoted: boolean;
  /** Consecutive days with a daily attempted, ending at `day`. */
  readonly streak: number;
}

export const EMPTY_RECORD: Record = {
  wins: 0,
  losses: 0,
  draws: 0,
  last: null,
  lastOutcome: null,
  runs: 0,
  promotions: 0,
  bestMeetings: 0,
  stakeCleared: 0,
  daily: null,
  coworker: { wins: 0, losses: 0, draws: 0 },
};

function loadDaily(d: unknown): Daily | null {
  if (!d || typeof d !== 'object') return null;
  const x = d as Partial<Daily>;
  if (typeof x.day !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(x.day)) return null;
  return {
    day: x.day,
    beaten: x.beaten === null || x.beaten === undefined ? null : Number(x.beaten) || 0,
    promoted: x.promoted === true,
    streak: Math.max(1, Number(x.streak) || 1),
  };
}

/** The calendar day after `day` (both `YYYY-MM-DD`). */
export function nextDay(day: string): string {
  const [y, m, d] = day.split('-').map(Number) as [number, number, number];
  const t = new Date(Date.UTC(y, m - 1, d + 1));
  return t.toISOString().slice(0, 10);
}

/** Today's daily is starting: it counts as attempted from this moment. */
export function recordDailyStart(r: Record, day: string): Record {
  const streak = r.daily && nextDay(r.daily.day) === day ? r.daily.streak + 1 : r.daily?.day === day ? r.daily.streak : 1;
  return { ...r, daily: { day, beaten: null, promoted: false, streak } };
}

/** Today's daily finished (also folded into the career record by recordRun). */
export function recordDailyEnd(r: Record, day: string, beaten: number, promoted: boolean): Record {
  return { ...r, daily: { day, beaten, promoted, streak: r.daily?.day === day ? r.daily.streak : 1 } };
}

/** The streak still alive on `today` (attempted today or yesterday), else 0. */
export function liveStreak(r: Record, today: string): number {
  if (!r.daily) return 0;
  return r.daily.day === today || nextDay(r.daily.day) === today ? r.daily.streak : 0;
}

const KEY = 'qbr.record.v1';

export function loadRecord(): Record {
  try {
    const raw = globalThis.localStorage?.getItem(KEY);
    if (!raw) return EMPTY_RECORD;
    const r = JSON.parse(raw) as Partial<Record>;
    return {
      wins: Number(r.wins) || 0,
      losses: Number(r.losses) || 0,
      draws: Number(r.draws) || 0,
      last: typeof r.last === 'string' ? r.last : null,
      lastOutcome: r.lastOutcome === 'win' || r.lastOutcome === 'loss' || r.lastOutcome === 'draw' ? r.lastOutcome : null,
      runs: Number(r.runs) || 0,
      promotions: Number(r.promotions) || 0,
      bestMeetings: Number(r.bestMeetings) || 0,
      stakeCleared: Number(r.stakeCleared) || 0,
      daily: loadDaily(r.daily),
      coworker: {
        wins: Number(r.coworker?.wins) || 0,
        losses: Number(r.coworker?.losses) || 0,
        draws: Number(r.coworker?.draws) || 0,
      },
    };
  } catch {
    return EMPTY_RECORD;
  }
}

export function saveRecord(r: Record): void {
  try {
    globalThis.localStorage?.setItem(KEY, JSON.stringify(r));
  } catch {
    // Storage unavailable: the record lasts for this session only.
  }
}

/** Fold one finished year (the player is seat 0) into the record. */
export function recordYear(r: Record, winner: Player | null, results: readonly QuarterResult[]): Record {
  const outcome = winner === 0 ? 'win' : winner === 1 ? 'loss' : 'draw';
  return {
    ...r,
    wins: r.wins + (outcome === 'win' ? 1 : 0),
    losses: r.losses + (outcome === 'loss' ? 1 : 0),
    draws: r.draws + (outcome === 'draw' ? 1 : 0),
    last: results.map((q) => (q.winner === 0 ? 'W' : q.winner === 1 ? 'L' : 'T')).join(' '),
    lastOutcome: outcome,
  };
}

/** What unlocks care about, from the record. A career's rungs beaten = its
 *  `meetingsWon`, so `bestMeetings` is the best rung reached. */
export function progressOf(r: Record): Progress {
  return { bestRung: r.bestMeetings, careers: r.runs, stakeCleared: r.stakeCleared };
}

/** Fold one finished run into the record. */
export function recordRun(r: Record, promoted: boolean, meetingsWon: number, stake = 1): Record {
  return {
    ...r,
    runs: r.runs + 1,
    promotions: r.promotions + (promoted ? 1 : 0),
    bestMeetings: Math.max(r.bestMeetings, meetingsWon),
    stakeCleared: promoted ? Math.max(r.stakeCleared, stake) : r.stakeCleared,
  };
}

/** Fold one finished coworker year into the record (winner 0 = me). */
export function recordCoworker(r: Record, winner: Player | null): Record {
  const c = r.coworker;
  return {
    ...r,
    coworker: {
      wins: c.wins + (winner === 0 ? 1 : 0),
      losses: c.losses + (winner === 1 ? 1 : 0),
      draws: c.draws + (winner === null ? 1 : 0),
    },
  };
}
