// Fit the star ratings: each card's ADDITIVE contribution to a deck's win share, by
// ridge regression over many decks (random legal decks from the whole collection, the
// default decks, and every deck the capped hill climb found — so the fit learns where
// the exploits live). Ratings from a single context moved the exploit around: a card
// weak beside the starter deck is strong in a deck of sideways spreaders, and back.
//
// Round loop: fit -> stars (5 bins) -> cap = the all-specials default deck's stars ->
// hill climb under the cap -> add the found deck and its one-swap neighbours -> refit.
// Prints the STARS table to paste into shared/src/qbr/collection.ts.
// Usage: tsx src/starfit.ts [ROUNDS=4] [RANDOM=500] [SEEDS=200]
import {
  CARDS,
  DEFAULT_MATCH,
  MATCH_RULES,
  NO_MODS,
  SPECIALS,
  STARTER_DECK,
  UNLOCKABLES,
  collectionOf,
  deckWith,
  greedyPolicy,
  matchPlayout,
  shuffle,
  smartPass,
  type RngState,
} from '@qbr/shared';

const ROUNDS = Number(process.argv[2] ?? 4);
const RANDOM = Number(process.argv[3] ?? 500);
const SEEDS = Number(process.argv[4] ?? 200);
const smartG = smartPass(greedyPolicy);

function share(player: readonly string[], n = SEEDS): number {
  let s = 0;
  for (let seed = 1; seed <= n; seed++) {
    const r = matchPlayout(seed, { player, opponent: STARTER_DECK }, [smartG, smartG], DEFAULT_MATCH, MATCH_RULES, NO_MODS);
    s += r.winner === null ? 0.5 : r.winner === 0 ? 1 : 0;
  }
  return s / n;
}

const VETERAN = { bestRung: 5, careers: 999, stakeCleared: 99, promotions: 999, meetings: 9999 };
const owned = collectionOf({ bestRung: 5, careers: 999, stakeCleared: 99, promotions: 999, meetings: 9999 });
const ids = [...owned.keys()];
const col = new Map(ids.map((id, i) => [id, i]));
const multiset = ids.flatMap((id) => Array<string>(owned.get(id)!).fill(id));

let rng: RngState = 20260927;
function randomDeck(): string[] {
  const [next, pool] = shuffle(rng, multiset);
  rng = next;
  return pool.slice(0, 15);
}

const X: number[][] = [];
const y: number[] = [];
const add = (d: readonly string[], v = share(d)) => {
  const row = Array<number>(ids.length).fill(0);
  for (const id of d) row[col.get(id)!]! += 1;
  X.push(row);
  y.push(v);
};

/** Ridge least squares with an intercept: minimise |Xw + b - y|^2 + lambda |w|^2. */
function fit(lambda = 0.5): { w: number[]; b: number } {
  const k = ids.length + 1;
  const A = Array.from({ length: k }, () => Array<number>(k).fill(0));
  const v = Array<number>(k).fill(0);
  X.forEach((row, r) => {
    const x = [...row, 1];
    for (let i = 0; i < k; i++) {
      v[i]! += x[i]! * y[r]!;
      for (let j = 0; j < k; j++) A[i]![j]! += x[i]! * x[j]!;
    }
  });
  for (let i = 0; i < k - 1; i++) A[i]![i]! += lambda;
  // Gaussian elimination with partial pivoting.
  for (let c = 0; c < k; c++) {
    let p = c;
    for (let r = c + 1; r < k; r++) if (Math.abs(A[r]![c]!) > Math.abs(A[p]![c]!)) p = r;
    [A[c], A[p]] = [A[p]!, A[c]!];
    [v[c], v[p]] = [v[p]!, v[c]!];
    for (let r = 0; r < k; r++) {
      if (r === c) continue;
      const f = A[r]![c]! / A[c]![c]!;
      for (let j = c; j < k; j++) A[r]![j]! -= f * A[c]![j]!;
      v[r]! -= f * v[c]!;
    }
  }
  const sol = v.map((x, i) => x / A[i]![i]!);
  return { w: sol.slice(0, -1), b: sol[k - 1]! };
}

/** 5 bins at the 20/40/60/80th percentiles of the fitted weights. */
function toStars(w: number[]): Record<string, number> {
  const sorted = [...w].sort((a, b) => a - b);
  const q = (p: number) => sorted[Math.floor(p * (sorted.length - 1))]!;
  const cuts = [q(0.2), q(0.4), q(0.6), q(0.8)];
  return Object.fromEntries(ids.map((id, i) => [id, 1 + cuts.filter((c) => w[i]! > c).length]));
}

const deckStars = (d: readonly string[], st: Record<string, number>) => d.reduce((s, id) => s + st[id]!, 0);
/** shared defaultDeck(), but under this round's star table. */
function defaultDeck(_p: unknown, cap: number, st: Record<string, number>): string[] {
  let taken: string[] = [];
  for (const s of SPECIALS) if (deckStars(deckWith([...taken, s.id]), st) <= cap) taken = [...taken, s.id];
  return deckWith(taken);
}

function climb(st: Record<string, number>, cap: number, start: readonly string[]): string[] {
  const deck = start.slice();
  let score = share(deck);
  for (let step = 0; step < 10; step++) {
    const used = new Map<string, number>();
    for (const id of deck) used.set(id, (used.get(id) ?? 0) + 1);
    let best: { d: string[]; v: number } | null = null;
    for (const out of used.keys())
      for (const [inn, have] of owned) {
        if (inn === out || (used.get(inn) ?? 0) >= have) continue;
        const d = deck.slice();
        d[d.indexOf(out)] = inn;
        if (deckStars(d, st) > cap) continue;
        const v = share(d);
        add(d, v); // every evaluated neighbour teaches the fit
        if (!best || v > best.v) best = { d, v };
      }
    if (!best || best.v <= score + 0.005) break;
    deck.splice(0, 15, ...best.d);
    score = best.v;
  }
  return deck;
}

console.log(`starfit: ${RANDOM} random decks + defaults, ${SEEDS} seeds each, ${ROUNDS} rounds\n`);
for (let i = 0; i < RANDOM; i++) add(randomDeck());
add(STARTER_DECK);
for (const s of SPECIALS) add(deckWith([s.id]));
add(deckWith(SPECIALS.map((s) => s.id)));

let st: Record<string, number> = {};
// Several starts per round (the default deck + random decks under the cap), so the fit
// sees every archetype the climb can reach — one start only ever found the "sideways"
// decks and missed a forward-rush deck that a later cap then allowed (92.8%).
const STARTS = Number(process.env.STARTS ?? 3);
for (let round = 1; round <= ROUNDS; round++) {
  const { w } = fit();
  st = toStars(w);
  const cap = deckStars(STARTER_DECK, st) + 3;
  const starts: string[][] = [defaultDeck(VETERAN, cap, st)];
  for (let tries = 0; starts.length < STARTS && tries < 500; tries++) {
    const d = randomDeck();
    if (deckStars(d, st) <= cap) starts.push(d);
  }
  const bests = starts.map((s0) => {
    const best = climb(st, cap, s0);
    return { best, v: share(best, 1000) };
  });
  const top = bests.sort((a, b) => b.v - a.v)[0]!;
  console.log(
    `round ${round}: cap ${cap}★ (starter ${deckStars(STARTER_DECK, st)}★)  best of ${starts.length} climbs ${(100 * top.v).toFixed(1)}% at 1000 seeds  | ${[...top.best].sort().join(' ')}`,
  );
}
const { w } = fit();
st = toStars(w);
console.log('\nweights (pp per copy) and stars:');
for (const i of ids.map((_, i) => i).sort((a, b) => w[b]! - w[a]!))
  console.log(`  ${(100 * w[i]!).toFixed(1).padStart(6)}  ${'$'.repeat(CARDS[ids[i]!]!.cost).padEnd(3)} ${st[ids[i]!]}★ ${ids[i]}`);
console.log(`\nstarter ${deckStars(STARTER_DECK, st)}★`);
console.log(`STARS ${JSON.stringify(st)}`);
void UNLOCKABLES;
