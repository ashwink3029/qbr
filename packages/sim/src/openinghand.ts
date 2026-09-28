// Opening-hand luck (/explore 2026-09-27). Marvel Snap's low-star reviews blame losses on
// "a bad starting hand" with "little recovery possible". QBR has no mulligan (Snap
// deliberately avoided one); does QBR's opening hand decide the match?
//
// Pre-registered bars (written here BEFORE the first run). Seat 0 and seat 1 both play the
// starter deck, both smart-greedy, 2000 seeds (the matchbars method). Group seat 0's
// matches by how many $ cards (the only cards a fresh home row can take) are in its
// 8-card opening hand.
//   H1. Recoverable: every group holding >= 5% of hands scores >= (overall - 15pp).
//   H2. (informative) the share gained per extra $ card, and by the $-card DIFFERENCE
//       between the two opening hands.
// Usage: tsx src/openinghand.ts [N=2000]
import {
  CARDS,
  DEFAULT_MATCH,
  MATCH_RULES,
  STARTER_DECK,
  greedyPolicy,
  matchPlayout,
  newMatch,
  smartPass,
} from '@qbr/shared';

const N = Number(process.argv[2] ?? 2000);
const deck = { player: STARTER_DECK, opponent: STARTER_DECK };
const smartG = smartPass(greedyPolicy);
const cheap = (hand: readonly string[]) => hand.filter((id) => CARDS[id]!.cost === 1).length;
const pct = (x: number) => `${(100 * x).toFixed(1)}%`;

const byMine = new Map<number, { n: number; s: number }>();
const byDiff = new Map<number, { n: number; s: number }>();
let total = 0;
for (let seed = 1; seed <= N; seed++) {
  const m = newMatch(seed, deck, DEFAULT_MATCH, MATCH_RULES);
  const mine = cheap(m.quarter.hands[0]);
  const diff = mine - cheap(m.quarter.hands[1]);
  const r = matchPlayout(seed, deck, [smartG, smartG], DEFAULT_MATCH, MATCH_RULES);
  const s = r.winner === null ? 0.5 : r.winner === 0 ? 1 : 0;
  total += s;
  for (const [map, k] of [[byMine, mine], [byDiff, Math.max(-3, Math.min(3, diff))]] as const) {
    const g = map.get(k) ?? { n: 0, s: 0 };
    g.n++;
    g.s += s;
    map.set(k, g);
  }
}
const overall = total / N;
console.log(`Opening-hand luck — ${N} starter-deck mirrors, smart-greedy both seats`);
console.log(`overall seat-0 share ${pct(overall)}\n`);
console.log('$ cards in seat 0\'s opening hand:');
let h1 = true;
for (const k of [...byMine.keys()].sort((a, b) => a - b)) {
  const g = byMine.get(k)!;
  const common = g.n / N >= 0.05;
  if (common && g.s / g.n < overall - 0.15) h1 = false;
  console.log(`  ${k}: ${pct(g.n / N).padStart(6)} of hands   share ${pct(g.s / g.n).padStart(6)}${common ? '' : '   (rare)'}`);
}
console.log('\n$ cards, seat 0 minus seat 1 (clamped to ±3):');
for (const k of [...byDiff.keys()].sort((a, b) => a - b)) {
  const g = byDiff.get(k)!;
  console.log(`  ${k >= 0 ? '+' : ''}${k}: ${pct(g.n / N).padStart(6)} of matches   share ${pct(g.s / g.n).padStart(6)}`);
}
console.log(`\nH1. recoverable (every common group >= overall - 15pp)   ${h1 ? 'PASS' : 'FAIL'}`);
