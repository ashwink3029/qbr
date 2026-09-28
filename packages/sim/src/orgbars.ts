// Orgs (backlog item 15): is every org's ladder a real climb, and do later orgs get harder?
//
// Pre-registered bars (written here BEFORE the first run, 2026-09-28). Method = runbars'
// career loop: a smart-lookahead player on the starter deck, random drafts, Standard
// stake, N careers per org; each org's opponents play the org's own deck and bosses.
//   O1. Each org is a ladder: its rung win rates never rise by more than 2pp (runbars L1),
//       its first rung is beaten >= 75% (L3), and it promotes 5-40% of careers.
//   O2. Later orgs are harder: promotion Finance > Tech > HR, each step >= 1pp.
//   O3. (informative) the org's opponent deck vs the starter deck, mirror-free: the
//       starter deck's share against it, smart-greedy both seats.
// Usage: tsx src/orgbars.ts [N=2000]
import {
  DEFAULT_MATCH,
  MATCH_RULES,
  ORGS,
  STARTER_DECK,
  finishMeeting,
  greedyPolicy,
  leaveChart,
  lookaheadPolicy,
  matchPlayout,
  meetingDeck,
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
const pct = (x: number) => `${(100 * x).toFixed(1)}%`;
const smartL = smartPass(lookaheadPolicy);
const smartG = smartPass(greedyPolicy);

const promoted: number[] = [];
let o1 = true;
// ONLY=hr measures one org (tuning); the bars need all three.
const only = process.env.ONLY;
for (const org of ORGS.filter((o) => !only || o.id === only)) {
  let cleared = 0;
  const reached = org.meetings.map(() => 0);
  const won = org.meetings.map(() => 0);
  for (let seed = 1; seed <= N; seed++) {
    let run = newRun(seed, 1, { org: org.id });
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
      const opp = opponentPolicy(org.meetings[rung]!.opponent);
      const deck = { player: STARTER_DECK, opponent: meetingDeck(run) };
      const r = matchPlayout(meetingSeed(run), deck, [smartL, opp], DEFAULT_MATCH, MATCH_RULES, meetingMods(run));
      if (r.winner === 0) won[rung]!++;
      run = finishMeeting(run, r.winner === 0);
    }
    if (run.status === 'won') cleared++;
  }
  const rate = org.meetings.map((_, i) => (reached[i]! ? won[i]! / reached[i]! : 0));
  let climbs = true;
  for (let i = 1; i < rate.length; i++) if (rate[i]! > rate[i - 1]! + 0.02) climbs = false;
  const p = cleared / N;
  promoted.push(p);
  const ok = climbs && rate[0]! >= 0.75 && p >= 0.05 && p <= 0.4;
  o1 &&= ok;
  // O3: the org deck as an opponent, smart-greedy both seats.
  let s = 0;
  for (let seed = 1; seed <= N; seed++) {
    const r = matchPlayout(seed, { player: STARTER_DECK, opponent: org.opponentDeck }, [smartG, smartG], DEFAULT_MATCH, MATCH_RULES);
    s += r.winner === null ? 0.5 : r.winner === 0 ? 1 : 0;
  }
  console.log(
    `${org.name.padEnd(8)} promoted ${pct(p).padStart(6)}   rungs ${rate.map(pct).join(' > ')}   starter vs its deck ${pct(s / N)}   ${ok ? 'ok' : 'FAIL'}`,
  );
}
let o2 = true;
for (let i = 1; i < promoted.length; i++) if (promoted[i]! > promoted[i - 1]! - 0.01) o2 = false;
console.log('\nPre-registered bars');
console.log(`  O1. each org is a ladder (climbs, first rung >= 75%, promoted 5-40%)   ${o1 ? 'PASS' : 'FAIL'}`);
console.log(`  O2. later orgs harder (${promoted.map(pct).join(' > ')}, steps >= 1pp)   ${o2 ? 'PASS' : 'FAIL'}`);
