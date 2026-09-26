// First career: straight from the org chart into the Intern, no supply closet.
//
// Pre-registered bar (written here BEFORE the first run, 2026-09-26, /explore
// iteration 8). A brand-new player's first career skips the rung-1 draft (a closet
// full of jokers they cannot yet read); the closet first opens after beating the
// Intern, as the session-one reward. Same method as runbars.ts L2/L3:
// smart-lookahead player, random drafts, the app's rung -> AI mapping.
//   F1. Gentle on-ramp holds:  the first career's Intern is beaten >= 75%.
//   F2. Still winnable:        the first career promotes in [10,40]%.
// (+ runbars' L1 on the first career: each rung <= the previous + 2pp.)
// First run: with NO joker, F1 69.8% and F2 6.8% — both FAIL (a joker is worth ~12pp
// against the Intern). Revised design, bars unchanged: the first career starts with a
// fixed STARTER_JOKER instead of a choice. All four measured as the starter:
//   mug 84.1% / 15.8%, stamp 75.1% / 11.6%, formatting 83.5% / 12.3%,
//   circular 83.4% / 16.1% — Coffee Mug chosen: passes, and is the easiest to read.
// Usage: tsx src/firstcareer.ts [careers=2000]
import {
  DEFAULT_MATCH,
  MATCH_RULES,
  MEETINGS,
  STARTER_DECK,
  finishMeeting,
  leaveChart,
  matchPlayout,
  meetingMods,
  meetingSeed,
  newRun,
  nextInt,
  opponentPolicy,
  pickJoker,
  lookaheadPolicy,
  smartPass,
  type RngState,
} from '@qbr/shared';

const N = Number(process.argv[2] ?? 2000);
const pct = (x: number): string => `${(100 * x).toFixed(1)}%`;
const verdict = (ok: boolean): string => (ok ? 'PASS' : 'FAIL');
const smartL = smartPass(lookaheadPolicy);

function careers(first: boolean): { promoted: number; rungRate: number[] } {
  let cleared = 0;
  const reached = MEETINGS.map(() => 0);
  const won = MEETINGS.map(() => 0);
  for (let seed = 1; seed <= N; seed++) {
    let run = newRun(seed, 1, { firstCareer: first });
    let rng: RngState = (seed * 40503) >>> 0;
    while (run.status !== 'won' && run.status !== 'lost') {
      if (run.status === 'chart') run = leaveChart(run);
      if (run.status === 'draft') {
        let k: number;
        [rng, k] = nextInt(rng, run.offer.length);
        run = pickJoker(run, run.offer[k]!);
      }
      const rung = run.meeting;
      reached[rung]!++;
      const opp = opponentPolicy(MEETINGS[rung]!.opponent);
      const r = matchPlayout(meetingSeed(run), STARTER_DECK, [smartL, opp], DEFAULT_MATCH, MATCH_RULES, meetingMods(run));
      if (r.winner === 0) won[rung]!++;
      run = finishMeeting(run, r.winner === 0);
    }
    if (run.status === 'won') cleared++;
  }
  return { promoted: cleared / N, rungRate: MEETINGS.map((_, i) => (reached[i]! ? won[i]! / reached[i]! : 0)) };
}

console.log(`QBR first career — ${N} careers each\n`);
const normal = careers(false);
const first = careers(true);
for (const [name, c] of [['every career', normal], ['first career', first]] as const) {
  console.log(`  ${name.padEnd(13)} promoted ${pct(c.promoted).padStart(6)}   by rung: ${c.rungRate.map(pct).join(' > ')}`);
}
console.log('\nPre-registered bar');
let climbs = true;
for (let i = 1; i < first.rungRate.length; i++) if (first.rungRate[i]! > first.rungRate[i - 1]! + 0.02) climbs = false;
console.log(`  F1. on-ramp holds   first-career Intern beaten ${pct(first.rungRate[0]!)} >= 75%   ${verdict(first.rungRate[0]! >= 0.75)}`);
console.log(`  F2. still winnable  first career promoted ${pct(first.promoted)} in [10,40]    ${verdict(first.promoted >= 0.1 && first.promoted <= 0.4)}`);
console.log(`  L1 (first career)   ${first.rungRate.map(pct).join(' > ')}   ${verdict(climbs)}`);
