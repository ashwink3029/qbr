// Research (simulator-optimization goal, 2026-09-26): how long does each opponent
// move take to compute? The app runs the AI synchronously on the main thread when
// its 450ms "thinking" timer fires, so a slow move freezes the screen. Measured per
// rung of the career ladder (the CEO has the biggest hands: +2 cards and Reply-All),
// with the player holding a full desk of jokers.
// Usage: tsx src/thinktime.ts [matches=150]
import {
  DEFAULT_MATCH,
  MATCH_RULES,
  MEETINGS,
  STARTER_DECK,
  matchReducer,
  meetingMods,
  newMatch,
  newRun,
  opponentPolicy,
  smartPass,
  greedyPolicy,
  type Action,
  type RngState,
} from '@qbr/shared';

const N = Number(process.argv[2] ?? 150);
const q = (xs: number[], p: number) => xs.slice().sort((a, b) => a - b)[Math.min(xs.length - 1, Math.floor(p * xs.length))]!;

for (const [rung, m] of MEETINGS.entries()) {
  const times: number[] = [];
  const opp = opponentPolicy(m.opponent);
  const me = smartPass(greedyPolicy);
  for (let seed = 1; seed <= N; seed++) {
    let run = newRun(seed, 4);
    run = { ...run, meeting: rung, jokers: ['mug', 'stamp', 'formatting', 'circular'], status: 'meeting' };
    let mt = newMatch(seed, STARTER_DECK, DEFAULT_MATCH, MATCH_RULES, meetingMods(run));
    let rng: RngState = (seed * 7919) >>> 0;
    while (!mt.over) {
      let a: Action;
      if (mt.quarter.toMove === 1) {
        const t0 = performance.now();
        [rng, a] = opp(mt, rng);
        times.push(performance.now() - t0);
      } else {
        [rng, a] = me(mt, rng);
      }
      mt = matchReducer(mt, a);
    }
  }
  console.log(
    `${m.role.padEnd(12)} ${m.opponent.padEnd(9)} moves ${String(times.length).padStart(5)}  median ${q(times, 0.5).toFixed(1).padStart(6)}ms  p95 ${q(times, 0.95).toFixed(1).padStart(6)}ms  p99 ${q(times, 0.99).toFixed(1).padStart(6)}ms  max ${Math.max(...times).toFixed(1).padStart(6)}ms`,
  );
}
