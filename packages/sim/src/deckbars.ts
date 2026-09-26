// Deck building: the player may bench any unlocked special (the starter card it
// replaced comes back; the deck stays 15). Is any build broken, and is choosing real?
//
// Pre-registered bar (written here BEFORE the first run, 2026-09-26, /explore
// iteration 11). Same method as unlockbars.ts: seat 0 plays the build, seat 1 the
// starter deck, both smart-greedy, draws as half.
//   DB1. No broken build: no subset of SPECIALS lifts seat 0 above 75% (the U3 cap).
//        Screened on all 2^n subsets at SCREEN seeds; the top 5 re-measured at N.
//   DB2. A real choice (informative): at least one build with a special benched
//        scores >= the all-in build at N seeds. If not, benching is only a downgrade.
// Usage: tsx src/deckbars.ts [N=2000] [SCREEN=400]
import {
  DEFAULT_MATCH,
  MATCH_RULES,
  NO_MODS,
  SPECIALS,
  STARTER_DECK,
  deckWith,
  greedyPolicy,
  matchPlayout,
  smartPass,
} from '@qbr/shared';

const N = Number(process.argv[2] ?? 2000);
const SCREEN = Number(process.argv[3] ?? 400);
const pct = (x: number): string => `${(100 * x).toFixed(1)}%`;
const verdict = (ok: boolean): string => (ok ? 'PASS' : 'FAIL');
const smartG = smartPass(greedyPolicy);

function share(ids: readonly string[], n: number): number {
  const deck = { player: deckWith(ids), opponent: STARTER_DECK };
  let s = 0;
  for (let seed = 1; seed <= n; seed++) {
    const r = matchPlayout(seed, deck, [smartG, smartG], DEFAULT_MATCH, MATCH_RULES, NO_MODS);
    s += r.winner === null ? 0.5 : r.winner === 0 ? 1 : 0;
  }
  return s / n;
}

const ids = SPECIALS.map((s) => s.id);
const subsets: string[][] = [];
for (let mask = 0; mask < 1 << ids.length; mask++) subsets.push(ids.filter((_, i) => mask & (1 << i)));

console.log(`QBR deck building — ${subsets.length} builds screened at ${SCREEN} seeds\n`);
const screened = subsets.map((sub) => ({ sub, v: share(sub, SCREEN) })).sort((a, b) => b.v - a.v);
const top = screened.slice(0, 5).map(({ sub }) => ({ sub, v: share(sub, N) }));
const all = share(ids, N);
for (const t of top) console.log(`  ${pct(t.v)}  ${t.sub.length === ids.length ? 'ALL' : `bench: ${ids.filter((i) => !t.sub.includes(i)).join(', ') || '-'}`}`);
console.log(`\n  all-in at ${N}: ${pct(all)}`);
const best = Math.max(...top.map((t) => t.v), all);
const bestBenched = Math.max(...top.filter((t) => t.sub.length < ids.length).map((t) => t.v), 0);

console.log('\nPre-registered bar');
console.log(`  DB1. no broken build   best ${pct(best)} <= 75%              ${verdict(best <= 0.75)}`);
console.log(`  DB2. a real choice     best benched ${pct(bestBenched)} >= all-in ${pct(all)}   ${verdict(bestBenched >= all)}`);
