// Backlog probe (user request 2026-09-25): what happens to the best-of-3 match
// bars if cards may NOT be placed on filled cells (pasteOver off)? Same bars and
// policies as matchbars.ts; only the rule changes.
// Usage: tsx src/nopaste.ts [seedsPerSeat=1000]
import {
  DEFAULT_MATCH,
  MATCH_RULES,
  STARTER_DECK,
  greedyPolicy,
  lookaheadPolicy,
  matchPlayout,
  neverPass,
  smartPass,
  type MatchPolicy,
  type Rules,
} from '@qbr/shared';

const N = Number(process.argv[2] ?? 1000);

function duel(a: MatchPolicy, b: MatchPolicy, rules: Rules): { pooled: number; first: number; turns: number[]; left: number } {
  let pooled = 0;
  let first = 0;
  let left = 0;
  const turns: number[] = [];
  for (const seat of [0, 1] as const) {
    for (let seed = 1; seed <= N; seed++) {
      const r = matchPlayout(seed, STARTER_DECK, seat === 0 ? [a, b] : [b, a], DEFAULT_MATCH, rules);
      const s = r.winner === null ? 0.5 : r.winner === seat ? 1 : 0;
      pooled += s;
      if (seat === 0) {
        first += s;
        turns.push(r.totalTurns);
        left += (r.cardsLeft[0] + r.cardsLeft[1]) / 2;
      }
    }
  }
  return { pooled: pooled / (2 * N), first: first / N, turns, left: left / N };
}

const median = (xs: number[]): number => xs.slice().sort((p, q) => p - q)[Math.floor(xs.length / 2)]!;
const p = (x: number): string => `${(100 * x).toFixed(1)}%`;
const smartG = smartPass(greedyPolicy);

for (const [label, rules] of [
  ['pasteOver ON  (current)', MATCH_RULES],
  ['pasteOver OFF (request)', { ...MATCH_RULES, pasteOver: false }],
] as const) {
  const mirror = duel(smartG, smartG, rules);
  const pass = duel(smartG, neverPass(greedyPolicy), rules);
  const head = duel(smartPass(lookaheadPolicy), smartG, rules);
  const t = median(mirror.turns);
  const bars = [mirror.first >= 0.4 && mirror.first <= 0.6, pass.pooled >= 0.6, head.pooled >= 0.55, t <= 36];
  console.log(
    `${label}: M1 ${p(mirror.first)} M2 ${p(pass.pooled)} M3 ${p(head.pooled)} M4 ${t} turns -> ${bars.filter(Boolean).length}/4   (cards left/player ${mirror.left.toFixed(1)})`,
  );
}
