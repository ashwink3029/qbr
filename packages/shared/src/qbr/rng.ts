// mulberry32 — copied verbatim from chain (which took it from cubes, which took
// it from casual) so the projects share one PRNG lineage. All randomness in the
// reducer (deck shuffles) and in the sim's policies flows through an explicit
// RngState, never Math.random(), so a game is replayable from its seed.
export type RngState = number;

export function nextRng(state: RngState): [RngState, number] {
  let t = (state + 0x6d2b79f5) | 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  const value = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  return [t, value];
}

export function nextInt(state: RngState, maxExclusive: number): [RngState, number] {
  const [next, value] = nextRng(state);
  return [next, Math.floor(value * maxExclusive)];
}

export function shuffle<T>(state: RngState, items: readonly T[]): [RngState, T[]] {
  const out = items.slice();
  let s = state;
  for (let i = out.length - 1; i > 0; i--) {
    let j: number;
    [s, j] = nextInt(s, i + 1);
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return [s, out];
}
