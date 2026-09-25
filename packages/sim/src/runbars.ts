// Balatro layer gate: are jokers worth drafting, are bosses a real threat, and is
// a 3-meeting run winnable but not trivial?
//
// Pre-registered bar (stated to the user and written here BEFORE the first run,
// 2026-09-25):
//   J1. Every joker helps:     seat 0 with the joker, smart-greedy mirror, wins
//                              >= 53% (draw = half).
//   J2. No joker is broken:    that share is <= 70%.
//   B1. Every boss hurts:      a smart-lookahead player's share vs smart-lookahead
//                              Finance WITH the boss is >= 5pp lower than without.
//   R1. Winnable, not trivial: a smart-lookahead player drafting at random clears
//                              the full run 10-50% of the time.
//
// Usage: tsx src/runbars.ts [seeds=1000]
import {
  BOSSES,
  JOKERS,
  MEETINGS,
  NO_MODS,
  STARTER_DECK,
  DEFAULT_MATCH,
  MATCH_RULES,
  finishMeeting,
  greedyPolicy,
  leaveChart,
  lookaheadPolicy,
  matchPlayout,
  meetingMods,
  meetingSeed,
  newRun,
  opponentPolicy,
  nextInt,
  pickJoker,
  smartPass,
  type MatchPolicy,
  type Mods,
  type OpponentKind,
  type RngState,
} from '@qbr/shared';

const N = Number(process.argv[2] ?? 1000);
const pct = (x: number): string => `${(100 * x).toFixed(1)}%`;
const verdict = (ok: boolean): string => (ok ? 'PASS' : 'FAIL');

const smartG = smartPass(greedyPolicy);
const smartL = smartPass(lookaheadPolicy);

/** Seat 0's share over seeds 1..n with the given policies and mods. */
function share(p0: MatchPolicy, p1: MatchPolicy, mods: Mods, n = N): number {
  let s = 0;
  for (let seed = 1; seed <= n; seed++) {
    const r = matchPlayout(seed, STARTER_DECK, [p0, p1], DEFAULT_MATCH, MATCH_RULES, mods);
    s += r.winner === null ? 0.5 : r.winner === 0 ? 1 : 0;
  }
  return s / n;
}

console.log(`QBR run layer — ${N} seeds per measurement\n`);

const base = share(smartG, smartG, NO_MODS);
console.log(`Jokers (seat 0 smart-greedy vs smart-greedy; no-joker baseline ${pct(base)})`);
const jokerShares: Record<string, number> = {};
for (const id of Object.keys(JOKERS)) {
  const s = share(smartG, smartG, { jokers: [id], boss: null });
  jokerShares[id] = s;
  console.log(`  ${JOKERS[id]!.name.padEnd(24)} ${pct(s).padStart(6)}  (${s - base >= 0 ? '+' : ''}${(100 * (s - base)).toFixed(1)}pp)`);
}

const plainL = share(smartL, smartL, NO_MODS);
console.log(`\nBosses (smart-lookahead vs smart-lookahead; no-boss baseline ${pct(plainL)})`);
const bossDrops: Record<string, number> = {};
for (const id of Object.keys(BOSSES)) {
  const s = share(smartL, smartL, { jokers: [], boss: id });
  bossDrops[id] = plainL - s;
  console.log(`  ${BOSSES[id]!.name.padEnd(24)} ${pct(s).padStart(6)}  (-${(100 * (plainL - s)).toFixed(1)}pp)`);
}

// Full careers: random drafting, the real org-chart ladder.
//
// LADDER bars — pre-registered 2026-09-25 when the 3-meeting run became the
// 5-rung org chart (Intern -> Manager -> Finance -> VP -> CEO), stated to the
// user BEFORE the first ladder run. They replace R1, which was defined for the
// old 3-meeting run (R1 last result: 36.1% clear at 2000 seeds, PASS).
//   L1. Difficulty climbs:  each rung's win rate (among careers that reach it)
//                           <= the previous rung's + 2pp.
//   L2. Winnable, not trivial: a smart-lookahead player drafting at random
//                           clears the whole ladder 10-40% of the time.
//   L3. Gentle on-ramp:     the Intern is beaten >= 75% of the time.
// The same kind -> policy mapping the app ships (shared run.ts).
const OPP: Record<OpponentKind, MatchPolicy> = {
  rookie: opponentPolicy('rookie'),
  greedy: opponentPolicy('greedy'),
  lookahead: opponentPolicy('lookahead'),
};
let cleared = 0;
const reached = MEETINGS.map(() => 0);
const won = MEETINGS.map(() => 0);
for (let seed = 1; seed <= N; seed++) {
  let run = newRun(seed);
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
    const opp = OPP[MEETINGS[rung]!.opponent];
    const r = matchPlayout(meetingSeed(run), STARTER_DECK, [smartL, opp], DEFAULT_MATCH, MATCH_RULES, meetingMods(run));
    if (r.winner === 0) won[rung]!++;
    run = finishMeeting(run, r.winner === 0);
  }
  if (run.status === 'won') cleared++;
}
const clearRate = cleared / N;
const rungRate = MEETINGS.map((_, i) => (reached[i]! ? won[i]! / reached[i]! : 0));
console.log(`\nCareers (smart-lookahead player, random drafts): promoted ${pct(clearRate)}`);
for (const [i, m] of MEETINGS.entries()) {
  console.log(`  ${m.role.padEnd(12)} reached ${pct(reached[i]! / N).padStart(6)}   beaten ${pct(rungRate[i]!).padStart(6)} of those`);
}
console.log('');
let climbs = true;
for (let i = 1; i < rungRate.length; i++) if (rungRate[i]! > rungRate[i - 1]! + 0.02) climbs = false;

const minJ = Math.min(...Object.values(jokerShares));
const maxJ = Math.max(...Object.values(jokerShares));
const minDrop = Math.min(...Object.values(bossDrops));
console.log('Pre-registered bar');
console.log(`  J1. every joker helps     weakest ${pct(minJ)} >= 53%            ${verdict(minJ >= 0.53)}`);
console.log(`  J2. no joker broken       strongest ${pct(maxJ)} <= 70%          ${verdict(maxJ <= 0.7)}`);
console.log(`  B1. every boss hurts      smallest drop ${(100 * minDrop).toFixed(1)}pp >= 5pp     ${verdict(minDrop >= 0.05)}`);
console.log(`  L1. difficulty climbs     ${rungRate.map((r) => pct(r)).join(' > ')}   ${verdict(climbs)}`);
console.log(`  L2. winnable, not trivial promoted ${pct(clearRate)} in [10,40]        ${verdict(clearRate >= 0.1 && clearRate <= 0.4)}`);
console.log(`  L3. gentle on-ramp        Intern beaten ${pct(rungRate[0]!)} >= 75%      ${verdict(rungRate[0]! >= 0.75)}`);
