// Career stakes: is each stake genuinely harder, and is the top one still
// winnable?
//
// Pre-registered bar (stated to the user and written here BEFORE the first run,
// 2026-09-26). Method: the same career simulation as runbars.ts (smart-lookahead
// player, random drafts, the real ladder via the shared opponentPolicy), at each
// stake, over the same seeds.
//   S1. Each stake is harder:   promotion rate falls by >= 2pp from stake N to N+1.
//   S2. The top stake is winnable: promotion rate at the top stake >= 2%.
//   S3. Standard is untouched:  stake 1 equals the ladder baseline (runbars L2 at 2000
//                               seeds) — the stake plumbing must not move it. L2 was
//                               14.0%; iteration 13's bigger joker/boss pool moved L2
//                               itself to 19.1%, so the reference follows L2 (the bar's
//                               definition), not the old literal.
// Usage: tsx src/stakebars.ts [seeds=2000]
import {
  DEFAULT_MATCH,
  MATCH_RULES,
  MEETINGS,
  STAKES,
  STARTER_DECK,
  finishMeeting,
  leaveChart,
  lookaheadPolicy,
  matchPlayout,
  meetingMods,
  meetingSeed,
  newRun,
  nextInt,
  opponentPolicy,
  pickJoker,
  smartPass,
  type RngState,
} from '@qbr/shared';

const N = Number(process.argv[2] ?? 2000);
const pct = (x: number): string => `${(100 * x).toFixed(1)}%`;
const verdict = (ok: boolean): string => (ok ? 'PASS' : 'FAIL');
const player = smartPass(lookaheadPolicy);

function promotionRate(stake: number): { rate: number; reached: number[] } {
  let promoted = 0;
  const reached = MEETINGS.map(() => 0);
  for (let seed = 1; seed <= N; seed++) {
    let run = newRun(seed, stake);
    let rng: RngState = (seed * 40503) >>> 0;
    while (run.status !== 'won' && run.status !== 'lost') {
      if (run.status === 'chart') run = leaveChart(run);
      if (run.status === 'draft') {
        let k: number;
        [rng, k] = nextInt(rng, run.offer.length);
        run = pickJoker(run, run.offer[k]!);
      }
      reached[run.meeting]!++;
      const opp = opponentPolicy(MEETINGS[run.meeting]!.opponent);
      const r = matchPlayout(meetingSeed(run), STARTER_DECK, [player, opp], DEFAULT_MATCH, MATCH_RULES, meetingMods(run));
      run = finishMeeting(run, r.winner === 0);
    }
    if (run.status === 'won') promoted++;
  }
  return { rate: promoted / N, reached: reached.map((r) => r / N) };
}

console.log(`QBR career stakes — ${N} careers per stake\n`);
const rates: number[] = [];
for (const [i, s] of STAKES.entries()) {
  const { rate, reached } = promotionRate(i + 1);
  rates.push(rate);
  console.log(
    `  ${String(i + 1)}. ${s.name.padEnd(15)} promoted ${pct(rate).padStart(6)}   reached: ${reached.map((r) => pct(r)).join(' > ')}`,
  );
}

let falls = true;
for (let i = 1; i < rates.length; i++) if (rates[i]! > rates[i - 1]! - 0.02) falls = false;
console.log('\nPre-registered bar');
console.log(`  S1. each stake harder    ${rates.map((r) => pct(r)).join(' > ')} (>= 2pp steps)   ${verdict(falls)}`);
console.log(`  S2. top stake winnable   ${pct(rates.at(-1)!)} >= 2%                            ${verdict(rates.at(-1)! >= 0.02)}`);
console.log(`  (stake 1 exact: ${rates[0]!.toFixed(4)})`);
const L2 = 0.1915; // runbars.ts L2 at 2000 seeds (iteration 13)
console.log(`  S3. standard untouched   ${pct(rates[0]!)} == ${pct(L2)} baseline                  ${verdict(Math.abs(rates[0]! - L2) < 0.0005)}`);
