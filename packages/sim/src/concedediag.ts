// Diagnostic (iteration 18): is "conceding is worthless" a property of the game, or of
// a concede rule that rarely fires? For each seed, play smart-with-concede vs the same
// plan without it; count games where the two diverge (the concede actually fired) and
// compare outcomes on exactly those games. Also sweeps the concede threshold.
// Usage: tsx src/concedediag.ts [seedsPerSeat=1000]
import { MATCH_RULES, DEFAULT_MATCH, STARTER_DECK, greedyPolicy, matchPlayout, smartPass } from '@qbr/shared';

const N = Number(process.argv[2] ?? 1000);
const opp = smartPass(greedyPolicy);
const pct = (x: number) => `${(100 * x).toFixed(1)}%`;

const variants: [string, Parameters<typeof smartPass>[1]][] = [
  ...[1, 3, 6].map((c) => [`deficit ${c}`, { bankLead: 5, concedeAt: c }] as [string, Parameters<typeof smartPass>[1]]),
  ['hopeless', { bankLead: 5, concedeAt: 99, concede: 'hopeless' }],
];
for (const [label, plan] of variants) {
  const withC = smartPass(greedyPolicy, plan);
  const without = smartPass(greedyPolicy, { bankLead: 5, concedeAt: 99 });
  let diverged = 0, wC = 0, wN = 0, allC = 0, allN = 0;
  for (const seat of [0, 1] as const) {
    for (let seed = 1; seed <= N; seed++) {
      const seats = (p: typeof withC) => (seat === 0 ? [p, opp] : [opp, p]) as [typeof p, typeof p];
      const a = matchPlayout(seed, STARTER_DECK, seats(withC), DEFAULT_MATCH, MATCH_RULES);
      const b = matchPlayout(seed, STARTER_DECK, seats(without), DEFAULT_MATCH, MATCH_RULES);
      const sa = a.winner === null ? 0.5 : a.winner === seat ? 1 : 0;
      const sb = b.winner === null ? 0.5 : b.winner === seat ? 1 : 0;
      allC += sa;
      allN += sb;
      if (a.totalTurns !== b.totalTurns || a.winner !== b.winner || a.quarters !== b.quarters) {
        diverged++;
        wC += sa;
        wN += sb;
      }
    }
  }
  const G = 2 * N;
  console.log(
    `${label.padEnd(9)}: fires in ${pct(diverged / G).padStart(6)} of games | on those: with ${pct(wC / Math.max(1, diverged))} vs without ${pct(wN / Math.max(1, diverged))} | overall ${pct(allC / G)} vs ${pct(allN / G)}`,
  );
}
