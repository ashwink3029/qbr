// Every combination of the optional rules against the same pre-registered bars.
// Usage: tsx src/sweep.ts [seedsPerSeat=600]
import { DEFAULT_RULES, type Rules } from '@qbr/shared';
import { bars, describeRules } from './bars.js';

const N = Number(process.argv[2] ?? 600);
const pct = (x: number): string => `${(100 * x).toFixed(1)}%`.padStart(6);
const mark = (ok: boolean): string => (ok ? '✓' : '✗');

console.log(`QBR rules sweep — ${N} seeded quarters per seat per matchup\n`);
console.log('rules                          seat    floor   headroom  medOpt  thin    turns  bars');
for (let mask = 0; mask < 8; mask++) {
  const rules: Rules = { ...DEFAULT_RULES, pasteOver: !!(mask & 1), takeover: !!(mask & 2), cheapOpener: !!(mask & 4) };
  const b = bars(N, rules);
  console.log(
    `${describeRules(rules).padEnd(30)} ${pct(b.seat)} ${mark(b.pass[0])} ${pct(b.floor)} ${mark(b.pass[1])} ${pct(b.headroom)} ${mark(b.pass[2])}` +
      `   ${String(b.medianOptions).padStart(3)}   ${pct(b.thin)} ${mark(b.pass[3])}  ${String(b.turns).padStart(3)}   ${b.pass.filter(Boolean).length}/4`,
  );
}
