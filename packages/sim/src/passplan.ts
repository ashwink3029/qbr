// How much can passing be worth? Sweeps the smart-pass plan's two thresholds
// against the never-pass control. Informational: the M2 bar in matchbars.ts is
// judged on the pre-set DEFAULT_PASS_PLAN, not on the best row here.
// Usage: tsx src/passplan.ts [seedsPerSeat=1000]
import { DEFAULT_MATCH, STARTER_DECK, greedyPolicy, matchPlayout, neverPass, smartPass } from '@qbr/shared';

const N = Number(process.argv[2] ?? 1000);
const never = neverPass(greedyPolicy);
const rows: [number, number, number][] = [];
for (const bankLead of [3, 4, 5, 6, 8, 99]) {
  for (const concedeAt of [3, 4, 6, 8, 99]) {
    const smart = smartPass(greedyPolicy, { bankLead, concedeAt });
    let s = 0;
    for (const seat of [0, 1] as const) {
      for (let seed = 1; seed <= N; seed++) {
        const r = matchPlayout(seed, STARTER_DECK, seat === 0 ? [smart, never] : [never, smart], DEFAULT_MATCH);
        s += r.winner === null ? 0.5 : r.winner === seat ? 1 : 0;
      }
    }
    rows.push([bankLead, concedeAt, s / (2 * N)]);
  }
}
rows.sort((a, b) => b[2] - a[2]);
console.log(`smart-greedy vs never-pass-greedy, ${N} seeds per seat (99 = never)\n bankLead concedeAt  share`);
for (const [b, c, s] of rows) console.log(`   ${String(b).padStart(3)}      ${String(c).padStart(3)}    ${(100 * s).toFixed(1)}%${b === 5 && c === 6 ? '   <- pre-set default' : ''}`);
