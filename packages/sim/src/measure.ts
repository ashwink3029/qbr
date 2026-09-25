// Phase 0 gate for QBR: is a single quarter on the 3x5 sheet a game with skill in
// it, before any skin, joker or boss is layered on top?
//
// Pre-registered bar (written before the first run, kept verbatim so the result
// can be read against what was promised):
//   1. Seat balance:   greedy-vs-greedy first-seat win rate within 40-60%.
//   2. Skill floor:    greedy beats random >= 80% (both seats pooled).
//   3. Skill headroom: lookahead beats greedy >= 55% (both seats pooled). If a
//                      one-ply player is already unbeatable, the game is shallow.
//   4. Real choices:   median legal plays per decision >= 4, and fewer than 25%
//                      of decisions offer 0-1 plays.
import { POLICIES, STARTER_DECK, playout, type PolicyName } from '@qbr/shared';

const N = Number(process.argv[2] ?? 1000);

interface Tally {
  w: number;
  d: number;
  l: number;
  turns: number[];
  options: number[];
  margin: number[];
}

/** `a` vs `b`, with `a` in seat 0 for seeds [1..N] and in seat 1 for [1..N]. */
function match(a: PolicyName, b: PolicyName): { asFirst: Tally; asSecond: Tally } {
  const run = (aSeat: 0 | 1): Tally => {
    const t: Tally = { w: 0, d: 0, l: 0, turns: [], options: [], margin: [] };
    for (let seed = 1; seed <= N; seed++) {
      const seats = aSeat === 0 ? ([POLICIES[a], POLICIES[b]] as const) : ([POLICIES[b], POLICIES[a]] as const);
      const r = playout(seed, STARTER_DECK, seats);
      if (r.winner === null) t.d++;
      else if (r.winner === aSeat) t.w++;
      else t.l++;
      t.turns.push(r.turns);
      t.options.push(...r.options[aSeat]);
      t.margin.push(r.revenue[aSeat] - r.revenue[aSeat === 0 ? 1 : 0]);
    }
    return t;
  };
  return { asFirst: run(0), asSecond: run(1) };
}

const pct = (x: number, n: number): string => `${((100 * x) / n).toFixed(1)}%`;
const q = (xs: number[], p: number): number => {
  const s = xs.slice().sort((x, y) => x - y);
  return s[Math.min(s.length - 1, Math.floor(p * s.length))]!;
};
const mean = (xs: number[]): number => xs.reduce((a, b) => a + b, 0) / xs.length;

/** Win share counting a draw as half, pooled over both seats. */
const pooled = (m: { asFirst: Tally; asSecond: Tally }): number =>
  (m.asFirst.w + m.asSecond.w + 0.5 * (m.asFirst.d + m.asSecond.d)) / (2 * N);

function line(label: string, t: Tally): void {
  console.log(
    `  ${label.padEnd(22)} W ${pct(t.w, N).padStart(6)}  D ${pct(t.d, N).padStart(6)}  L ${pct(t.l, N).padStart(6)}` +
      `   margin mean ${mean(t.margin).toFixed(1).padStart(5)}   turns med ${q(t.turns, 0.5)}`,
  );
}

console.log(`QBR Phase 0 — ${N} seeded quarters per seat per matchup\n`);
const results: Record<string, { asFirst: Tally; asSecond: Tally }> = {};
for (const [a, b] of [
  ['random', 'random'],
  ['greedy', 'greedy'],
  ['lookahead', 'lookahead'],
  ['greedy', 'random'],
  ['lookahead', 'greedy'],
] as [PolicyName, PolicyName][]) {
  const m = match(a, b);
  results[`${a}-${b}`] = m;
  console.log(`${a} vs ${b}`);
  line(`${a} as first seat`, m.asFirst);
  line(`${a} as second seat`, m.asSecond);
  console.log(`  pooled ${a} share: ${(100 * pooled(m)).toFixed(1)}%\n`);
}

const gg = results['greedy-greedy']!.asFirst;
const seat = (gg.w + 0.5 * gg.d) / N;
const floor = pooled(results['greedy-random']!);
const head = pooled(results['lookahead-greedy']!);
const opts = [...gg.options, ...results['greedy-greedy']!.asSecond.options];
const medOpts = q(opts, 0.5);
const thin = opts.filter((o) => o <= 1).length / opts.length;

console.log('Decision richness (greedy vs greedy, all decisions)');
console.log(
  `  legal plays per decision: p10 ${q(opts, 0.1)}  med ${medOpts}  p90 ${q(opts, 0.9)}  mean ${mean(opts).toFixed(1)}`,
);
console.log(`  decisions with 0-1 plays: ${(100 * thin).toFixed(1)}%\n`);

const verdict = (ok: boolean): string => (ok ? 'PASS' : 'FAIL');
console.log('Pre-registered bar');
console.log(`  1. seat balance   first-seat share ${(100 * seat).toFixed(1)}% in [40,60]   ${verdict(seat >= 0.4 && seat <= 0.6)}`);
console.log(`  2. skill floor    greedy > random ${(100 * floor).toFixed(1)}% >= 80        ${verdict(floor >= 0.8)}`);
console.log(`  3. headroom       lookahead > greedy ${(100 * head).toFixed(1)}% >= 55     ${verdict(head >= 0.55)}`);
console.log(
  `  4. real choices   median ${medOpts} >= 4, thin ${(100 * thin).toFixed(1)}% < 25        ${verdict(medOpts >= 4 && thin < 0.25)}`,
);
