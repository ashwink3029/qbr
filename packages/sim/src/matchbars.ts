// Gwent layer gate: does a best-of-3 match with locking passes make PASSING a
// real decision, without breaking balance, skill or session length?
//
// Pre-registered bar (stated to the user and written here BEFORE the first run,
// 2026-09-25; the pass plan's defaults bankLead=5, concedeAt=6 were also fixed
// before the first run):
//   M1. Seat balance:     smart-greedy vs smart-greedy, first seat's match share
//                         (draw = half) within 40-60%.
//   M2. Passing matters:  smart-greedy beats never-pass-greedy >= 60% pooled.
//   M3. Headroom holds:   smart-lookahead beats smart-greedy >= 55% pooled.
//   M4. Length:           median total turns per match (smart-greedy mirror)
//                         <= 36 (one single-quarter game already runs ~32).
// Reported, not gated: share of matches reaching Q3, voluntary passes per match,
// cards left unplayed at the end.
//
// Usage: tsx src/matchbars.ts [seedsPerSeat=500]
import {
  DEFAULT_MATCH,
  STARTER_DECK,
  greedyPolicy,
  lookaheadPolicy,
  matchPlayout,
  neverPass,
  smartPass,
  type MatchPlayout,
  type MatchPolicy,
} from '@qbr/shared';

const N = Number(process.argv[2] ?? 500);

interface Side {
  w: number;
  d: number;
  runs: MatchPlayout[];
}

/** `a` vs `b` with `a` in each seat for seeds 1..N. Returns a's tally per seat. */
function duel(a: MatchPolicy, b: MatchPolicy): [Side, Side] {
  const out: [Side, Side] = [
    { w: 0, d: 0, runs: [] },
    { w: 0, d: 0, runs: [] },
  ];
  for (const seat of [0, 1] as const) {
    for (let seed = 1; seed <= N; seed++) {
      const r = matchPlayout(seed, STARTER_DECK, seat === 0 ? [a, b] : [b, a], DEFAULT_MATCH);
      if (r.winner === null) out[seat].d++;
      else if (r.winner === seat) out[seat].w++;
      out[seat].runs.push(r);
    }
  }
  return out;
}

const share = (s: Side): number => (s.w + 0.5 * s.d) / N;
const pooled = ([x, y]: [Side, Side]): number => (share(x) + share(y)) / 2;
const median = (xs: number[]): number => xs.slice().sort((p, q) => p - q)[Math.floor(xs.length / 2)]!;
const pct = (x: number): string => `${(100 * x).toFixed(1)}%`;
const verdict = (ok: boolean): string => (ok ? 'PASS' : 'FAIL');

const smartG = smartPass(greedyPolicy);
const smartL = smartPass(lookaheadPolicy);
const neverG = neverPass(greedyPolicy);

console.log(`QBR best-of-3 — ${N} seeded matches per seat per matchup`);
console.log(`config: opening hand ${DEFAULT_MATCH.openingHand}, draw after Q1/Q2 ${DEFAULT_MATCH.drawAfter.join('/')}, lives ${DEFAULT_MATCH.lives}\n`);

const mirror = duel(smartG, smartG);
const passing = duel(smartG, neverG);
const head = duel(smartL, smartG);

const mirrorRuns = mirror[0].runs;
const turns = mirrorRuns.map((r) => r.totalTurns);
const q3 = mirrorRuns.filter((r) => r.quarters === 3).length / mirrorRuns.length;
const vol = mirrorRuns.reduce((a, r) => a + r.voluntaryPasses[0] + r.voluntaryPasses[1], 0) / mirrorRuns.length;
const left = mirrorRuns.reduce((a, r) => a + r.cardsLeft[0] + r.cardsLeft[1], 0) / (2 * mirrorRuns.length);

for (const [label, d] of [
  ['smart-greedy vs smart-greedy', mirror],
  ['smart-greedy vs never-pass-greedy', passing],
  ['smart-lookahead vs smart-greedy', head],
] as const) {
  console.log(label);
  console.log(`  as first seat  W ${pct(d[0].w / N)}  D ${pct(d[0].d / N)}   share ${pct(share(d[0]))}`);
  console.log(`  as second seat W ${pct(d[1].w / N)}  D ${pct(d[1].d / N)}   share ${pct(share(d[1]))}`);
  console.log(`  pooled share ${pct(pooled(d))}\n`);
}

console.log('Shape of a match (smart-greedy mirror)');
console.log(`  total turns: median ${median(turns)}, p90 ${turns.slice().sort((a, b) => a - b)[Math.floor(0.9 * turns.length)]}`);
console.log(`  reaches Q3: ${pct(q3)}   voluntary passes per match: ${vol.toFixed(2)}   cards left per player: ${left.toFixed(1)}\n`);

const seat = share(mirror[0]);
console.log('Pre-registered bar');
console.log(`  M1. seat balance   first-seat share ${pct(seat)} in [40,60]    ${verdict(seat >= 0.4 && seat <= 0.6)}`);
console.log(`  M2. passing        smart > never-pass ${pct(pooled(passing))} >= 60     ${verdict(pooled(passing) >= 0.6)}`);
console.log(`  M3. headroom       lookahead > greedy ${pct(pooled(head))} >= 55     ${verdict(pooled(head) >= 0.55)}`);
console.log(`  M4. length         median turns ${median(turns)} <= 36              ${verdict(median(turns) <= 36)}`);
