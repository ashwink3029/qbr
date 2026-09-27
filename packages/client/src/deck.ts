// The deck the player built (Your deck), or null for the default deck. Guarded like
// record.ts: storage can be missing or throw, and the app works without it. Replaces
// the older bench (`qbr.bench.v1`), which carries over once as a built deck.
import { playerDeck, type Progress } from '@qbr/shared';

const KEY = 'qbr.deck.v1';
const BENCH_KEY = 'qbr.bench.v1';

export function loadDeck(progress: Progress): string[] | null {
  try {
    const raw = globalThis.localStorage?.getItem(KEY);
    if (raw) {
      const ids: unknown = JSON.parse(raw);
      return Array.isArray(ids) && ids.every((x) => typeof x === 'string') ? (ids as string[]) : null;
    }
    // One-time carry-over: specials benched in the old builder become a built deck.
    const bench: unknown = JSON.parse(globalThis.localStorage?.getItem(BENCH_KEY) ?? '[]');
    if (Array.isArray(bench) && bench.length > 0) {
      const deck = playerDeck(progress, bench.filter((x): x is string => typeof x === 'string'));
      saveDeck(deck);
      globalThis.localStorage?.removeItem(BENCH_KEY);
      return deck;
    }
    return null;
  } catch {
    return null;
  }
}

export function saveDeck(deck: readonly string[] | null): void {
  try {
    if (deck) globalThis.localStorage?.setItem(KEY, JSON.stringify(deck));
    else globalThis.localStorage?.removeItem(KEY);
  } catch {
    // Storage unavailable: the deck lasts for this session only.
  }
}
