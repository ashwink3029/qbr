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
  lookaheadPolicy,
  matchPlayout,
  meetingMods,
  meetingSeed,
  newRun,
  nextInt,
  pickJoker,
  smartPass,
  type MatchPolicy,
  type Mods,
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

// Full runs: random drafting, the real meeting ladder.
let cleared = 0;
const reached = [0, 0, 0];
for (let seed = 1; seed <= N; seed++) {
  let run = newRun(seed);
  let rng: RngState = (seed * 40503) >>> 0;
  while (run.status === 'draft' || run.status === 'meeting') {
    if (run.status === 'draft') {
      let k: number;
      [rng, k] = nextInt(rng, run.offer.length);
      run = pickJoker(run, run.offer[k]!);
    }
    reached[run.meeting]!++;
    const m = MEETINGS[run.meeting]!;
    const opp = m.opponent === 'greedy' ? smartG : smartL;
    const r = matchPlayout(meetingSeed(run), STARTER_DECK, [smartL, opp], DEFAULT_MATCH, MATCH_RULES, meetingMods(run));
    run = finishMeeting(run, r.winner === 0);
  }
  if (run.status === 'won') cleared++;
}
const clearRate = cleared / N;
console.log(`\nRuns (smart-lookahead player, random drafts): cleared ${pct(clearRate)}`);
console.log(`  reached: ${MEETINGS.map((m, i) => `${m.name} ${pct(reached[i]! / N)}`).join(' · ')}\n`);

const minJ = Math.min(...Object.values(jokerShares));
const maxJ = Math.max(...Object.values(jokerShares));
const minDrop = Math.min(...Object.values(bossDrops));
console.log('Pre-registered bar');
console.log(`  J1. every joker helps     weakest ${pct(minJ)} >= 53%            ${verdict(minJ >= 0.53)}`);
console.log(`  J2. no joker broken       strongest ${pct(maxJ)} <= 70%          ${verdict(maxJ <= 0.7)}`);
console.log(`  B1. every boss hurts      smallest drop ${(100 * minDrop).toFixed(1)}pp >= 5pp     ${verdict(minDrop >= 0.05)}`);
console.log(`  R1. winnable, not trivial clear rate ${pct(clearRate)} in [10,50]      ${verdict(clearRate >= 0.1 && clearRate <= 0.5)}`);
