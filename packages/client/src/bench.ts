// Which unlocked specials the player has benched (deck building). Guarded like
// record.ts: storage can be missing or throw, and the app works without it.
import { SPECIALS } from '@qbr/shared';

const KEY = 'qbr.bench.v1';

export function loadBench(): string[] {
  try {
    const raw = globalThis.localStorage?.getItem(KEY);
    const ids: unknown = raw ? JSON.parse(raw) : [];
    const known = new Set(SPECIALS.map((s) => s.id));
    return Array.isArray(ids) ? ids.filter((x): x is string => typeof x === 'string' && known.has(x)) : [];
  } catch {
    return [];
  }
}

export function saveBench(ids: readonly string[]): void {
  try {
    globalThis.localStorage?.setItem(KEY, JSON.stringify(ids));
  } catch {
    // Storage unavailable: the bench lasts for this session only.
  }
}
