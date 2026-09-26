// Vet daily-career seeds offline. For each date, try candidate seeds hash(date#k),
// k = 0, 1, 2, ... and keep the first one a smart-lookahead player promotes with at
// least 1 of 20 random draft orderings (dailybars.ts D2's own criterion). Prints the
// per-day k's as a digit string for shared/src/qbr/daily.ts, plus the resulting D1.
// Usage: tsx src/dailyvet.ts [firstDay=2026-10-01] [days=365] [stake=1]
import {
  DEFAULT_MATCH,
  MATCH_RULES,
  MEETINGS,
  STARTER_DECK,
  dailyCandidate,
  dayKey,
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

const [y, mo, d] = (process.argv[2] ?? '2026-10-01').split('-').map(Number) as [number, number, number];
const DAYS = Number(process.argv[3] ?? 365);
const STAKE = Number(process.argv[4] ?? 1);
const ORDERINGS = 20;
const smartL = smartPass(lookaheadPolicy);

function promoted(seed: number, pickSeed: number): boolean {
  let run = newRun(seed, STAKE);
  let rng: RngState = (pickSeed * 40503 + 17) >>> 0;
  while (run.status !== 'won' && run.status !== 'lost') {
    if (run.status === 'chart') run = leaveChart(run);
    if (run.status === 'draft') {
      let k: number;
      [rng, k] = nextInt(rng, run.offer.length);
      run = pickJoker(run, run.offer[k]!);
    }
    const opp = opponentPolicy(MEETINGS[run.meeting]!.opponent);
    const r = matchPlayout(meetingSeed(run), STARTER_DECK, [smartL, opp], DEFAULT_MATCH, MATCH_RULES, meetingMods(run));
    run = finishMeeting(run, r.winner === 0);
  }
  return run.status === 'won';
}

const t0 = Date.now();
let ks = '';
let once = 0;
let careers = 0;
for (let i = 0; i < DAYS; i++) {
  const day = dayKey(new Date(y, mo - 1, d + i));
  let k = 0;
  for (; k < 36; k++) {
    const seed = dailyCandidate(day, k);
    let any = false;
    for (let o = 1; o <= ORDERINGS && !any; o++) {
      careers++;
      any = promoted(seed, o);
    }
    if (any) break;
  }
  if (k === 36) throw new Error(`no winnable candidate for ${day}`);
  ks += k.toString(36);
  if (promoted(dailyCandidate(day, k), 0)) once++;
}
console.log(`vetted ${DAYS} days from ${process.argv[2] ?? '2026-10-01'} at stake ${STAKE}: ${careers} careers, ${((Date.now() - t0) / 1000).toFixed(0)}s`);
console.log(`D1 on vetted seeds (1 career per day): ${((100 * once) / DAYS).toFixed(1)}%`);
console.log(`K=${ks}`);
