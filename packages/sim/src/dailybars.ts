// Daily career: one shared seed per calendar day (dailySeed), starter deck, DAILY_STAKE.
//
// Pre-registered bar (written here BEFORE the first run, 2026-09-26, /explore iteration
// 10), over 365 consecutive date seeds from 2026-10-01. Player = smart-lookahead, as in
// runbars.ts; drafts are random, varied by a separate "player" rng.
//   D1. Normal difficulty: promotion across dates (1 career per date) is in [10,40]%.
//   D2. Every day winnable: on >= 95% of dates, at least 1 of 20 draft orderings is promoted.
//   D3. Days differ:        >= 300 distinct (VP boss, first closet offer) pairs of 365.
// FIRST RUN (raw date hash, Standard): D1 16.4% PASS, D2 31.2% FAIL, D3 72 FAIL.
//   D3 was mis-designed: 4 jokers x 3 bosses allow at most 72 (boss, offer) setups, so
//   >= 300 was impossible; day-to-day variety lives in the DEALS. Kept as a FAIL.
//   D2 was real: on 69% of dates 20 drafts all lost (63.6% winnable even with varied
//   play) — the deals decide too much. Fix (bars unchanged): seeds VETTED offline
//   (dailyvet.ts, daily.ts DAILY_K), which pushed D1 to 46.7% at Standard, so the daily
//   runs at DAILY_STAKE = Budget freeze.
// Usage: tsx src/dailybars.ts [days=365] [orderings=20]
import {
  DEFAULT_MATCH,
  MATCH_RULES,
  MEETINGS,
  STARTER_DECK,
  DAILY_STAKE,
  dailySeed,
  dayKey,
  finishMeeting,
  leaveChart,
  lookaheadPolicy,
  matchPlayout,
  matchReducer,
  newMatch,
  type Action,
  meetingMods,
  meetingSeed,
  newRun,
  nextInt,
  opponentPolicy,
  pickJoker,
  smartPass,
  type RngState,
} from '@qbr/shared';

const DAYS = Number(process.argv[2] ?? 365);
const ORDERINGS = Number(process.argv[3] ?? 20);
const pct = (x: number): string => `${(100 * x).toFixed(1)}%`;
const verdict = (ok: boolean): string => (ok ? 'PASS' : 'FAIL');
const smartL = smartPass(lookaheadPolicy);

/** One match with the same deals but a different player/AI rng stream (tie-breaks,
 *  the Intern's random plays): a different game from the same day. */
function variedMatch(seed: number, stream: number, mods: ReturnType<typeof meetingMods>, oppKind: string): 0 | 1 | null {
  let m = newMatch(seed, STARTER_DECK, DEFAULT_MATCH, MATCH_RULES, mods);
  let rng: RngState = (Math.imul(seed, 2654435761) ^ Math.imul(stream + 1, 0x9e3779b1)) >>> 0;
  const seats = [smartL, opponentPolicy(oppKind as 'rookie')] as const;
  while (!m.over) {
    let a: Action;
    [rng, a] = seats[m.quarter.toMove](m, rng);
    m = matchReducer(m, a);
  }
  return m.winner;
}

function promotedVaried(seed: number, stream: number): boolean {
  let run = newRun(seed, DAILY_STAKE);
  let rng: RngState = (stream * 40503 + 17) >>> 0;
  while (run.status !== 'won' && run.status !== 'lost') {
    if (run.status === 'chart') run = leaveChart(run);
    if (run.status === 'draft') {
      let k: number;
      [rng, k] = nextInt(rng, run.offer.length);
      run = pickJoker(run, run.offer[k]!);
    }
    const w = variedMatch(meetingSeed(run), stream, meetingMods(run), MEETINGS[run.meeting]!.opponent);
    run = finishMeeting(run, w === 0);
  }
  return run.status === 'won';
}

function promoted(seed: number, pickSeed: number): boolean {
  let run = newRun(seed, DAILY_STAKE);
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

const days: string[] = [];
for (let i = 0; i < DAYS; i++) days.push(dayKey(new Date(2026, 9, 1 + i)));
const seeds = days.map(dailySeed);

let once = 0;
let winnable = 0;
const perDay: number[] = [];
for (const [i, seed] of seeds.entries()) {
  let wins = 0;
  for (let o = 0; o < ORDERINGS; o++) if (promoted(seed, o + 1)) wins++;
  if (promoted(seed, 0)) once++;
  if (wins > 0) winnable++;
  perDay.push(wins / ORDERINGS);
  if (i % 73 === 0) console.log(`  ${days[i]}  seed ${seed}  promoted ${wins}/${ORDERINGS}`);
}
const pairs = new Set(seeds.map((s) => { const r = newRun(s); return `${r.boss}|${r.offer.join(',')}`; }));

perDay.sort((a, b) => a - b);
const d1 = once / DAYS;
const d2 = winnable / DAYS;
console.log(`\nQBR daily career — ${DAYS} days x ${ORDERINGS} draft orderings`);
console.log(`  per-day promotion rate: p10 ${pct(perDay[Math.floor(DAYS * 0.1)]!)}, median ${pct(perDay[Math.floor(DAYS / 2)]!)}, p90 ${pct(perDay[Math.floor(DAYS * 0.9)]!)}`);
console.log('\nPre-registered bar');
console.log(`  D1. normal difficulty  promoted ${pct(d1)} in [10,40]            ${verdict(d1 >= 0.1 && d1 <= 0.4)}`);
console.log(`  D2. every day winnable ${pct(d2)} of days >= 95%               ${verdict(d2 >= 0.95)}`);
console.log(`  D3. days differ        ${pairs.size} distinct setups >= 300          ${verdict(pairs.size >= 300)}`);

// Diagnostic (NOT a bar; added after the first run): D2 varied only the drafts, while
// the player's and the AI's rng were pinned by the seed, so a day was ~one fixed game.
// Here each of the orderings is also a different rng stream: same deals, different play.
let winnableVaried = 0;
for (const seed of seeds) {
  let any = false;
  for (let o = 0; o < ORDERINGS && !any; o++) any = promotedVaried(seed, o + 1);
  if (any) winnableVaried++;
}
console.log(`\nDiagnostic: days with >= 1 promotion when play varies too: ${pct(winnableVaried / DAYS)}`);
