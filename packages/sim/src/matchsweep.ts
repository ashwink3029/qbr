// Card-economy sweep for the best-of-3 layer: opening hand x between-quarter
// draws, each judged on all four pre-registered match bars (M1-M4) with the
// pre-set DEFAULT_PASS_PLAN. Also reports how much conceding is worth: smart
// with concede vs the same plan with conceding disabled.
// Usage: tsx src/matchsweep.ts [seedsPerSeat=600]
import {
  STARTER_DECK,
  greedyPolicy,
  lookaheadPolicy,
  matchPlayout,
  neverPass,
  smartPass,
  type MatchConfig,
  type MatchPolicy,
} from '@qbr/shared';

const N = Number(process.argv[2] ?? 600);

function duel(a: MatchPolicy, b: MatchPolicy, cfg: MatchConfig): { share: number; firstSeat: number; turns: number[]; q3: number; left: number } {
  let pooled = 0;
  let first = 0;
  const turns: number[] = [];
  let q3 = 0;
  let left = 0;
  for (const seat of [0, 1] as const) {
    for (let seed = 1; seed <= N; seed++) {
      const r = matchPlayout(seed, STARTER_DECK, seat === 0 ? [a, b] : [b, a], cfg);
      const s = r.winner === null ? 0.5 : r.winner === seat ? 1 : 0;
      pooled += s;
      if (seat === 0) {
        first += s;
        turns.push(r.totalTurns);
        if (r.quarters === 3) q3++;
        left += (r.cardsLeft[0] + r.cardsLeft[1]) / 2;
      }
    }
  }
  return { share: pooled / (2 * N), firstSeat: first / N, turns, q3: q3 / N, left: left / N };
}

const median = (xs: number[]): number => xs.slice().sort((p, q) => p - q)[Math.floor(xs.length / 2)]!;
const p = (x: number): string => `${(100 * x).toFixed(1)}%`.padStart(6);
const ok = (b: boolean): string => (b ? '✓' : '✗');

const smartG = smartPass(greedyPolicy);
const noConcede = smartPass(greedyPolicy, { bankLead: 5, concedeAt: 99 });
console.log(`best-of-3 card economy sweep — ${N} seeds per seat\n`);
console.log('hand draws   M1 seat   M2 pass   M3 head   M4 turns  bars  | Q3     left  concede-worth');
for (const openingHand of [5, 6, 7, 8, 10]) {
  for (const drawAfter of [[1, 1], [2, 1], [3, 2]]) {
    const cfg: MatchConfig = { openingHand, drawAfter, lives: 2 };
    const mirror = duel(smartG, smartG, cfg);
    const pass = duel(smartG, neverPass(greedyPolicy), cfg);
    const head = duel(smartPass(lookaheadPolicy), smartG, cfg);
    const concede = duel(smartG, noConcede, cfg);
    const t = median(mirror.turns);
    const bars = [mirror.firstSeat >= 0.4 && mirror.firstSeat <= 0.6, pass.share >= 0.6, head.share >= 0.55, t <= 36];
    console.log(
      `${String(openingHand).padStart(3)}  ${drawAfter.join('/')}   ${p(mirror.firstSeat)} ${ok(bars[0]!)} ${p(pass.share)} ${ok(bars[1]!)} ${p(head.share)} ${ok(bars[2]!)}   ${String(t).padStart(3)} ${ok(bars[3]!)}   ${bars.filter(Boolean).length}/4  | ${p(mirror.q3)}  ${mirror.left.toFixed(1).padStart(4)}   ${p(concede.share)}`,
    );
  }
}
