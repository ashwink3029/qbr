// The player's year-by-year record, kept on the device. localStorage can be
// missing or throw (private mode, cleared data, some WKWebView states), so every
// access is guarded and the app works identically without it.
import type { Player, QuarterResult } from '@qbr/shared';

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
};

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

/** Fold one finished run into the record. */
export function recordRun(r: Record, promoted: boolean, meetingsWon: number): Record {
  return {
    ...r,
    runs: r.runs + 1,
    promotions: r.promotions + (promoted ? 1 : 0),
    bestMeetings: Math.max(r.bestMeetings, meetingsWon),
  };
}
