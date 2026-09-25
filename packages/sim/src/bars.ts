// The Phase 0 pre-registered bars as a reusable computation, so `measure` (one
// rule set, full report) and `sweep` (every rule set, one line each) read from
// the same code and can never disagree about what "pass" means.
import { DEFAULT_RULES, POLICIES, STARTER_DECK, playout, type PolicyName, type Rules } from '@qbr/shared';

export interface Tally {
  w: number;
  d: number;
  l: number;
  turns: number[];
  options: number[];
  margin: number[];
}

export interface Match {
  asFirst: Tally;
  asSecond: Tally;
}

/** `a` vs `b`, with `a` in seat 0 for seeds [1..n] and in seat 1 for [1..n]. */
export function match(a: PolicyName, b: PolicyName, n: number, rules: Rules): Match {
  const run = (aSeat: 0 | 1): Tally => {
    const t: Tally = { w: 0, d: 0, l: 0, turns: [], options: [], margin: [] };
    for (let seed = 1; seed <= n; seed++) {
      const seats = aSeat === 0 ? ([POLICIES[a], POLICIES[b]] as const) : ([POLICIES[b], POLICIES[a]] as const);
      const r = playout(seed, STARTER_DECK, seats, rules);
      if (r.winner === null) t.d++;
      else if (r.winner === aSeat) t.w++;
      else t.l++;
      t.turns.push(r.turns);
      t.options.push(...r.options[aSeat]);
      t.margin.push(r.revenue[aSeat] - r.revenue[aSeat === 0 ? 1 : 0]);
    }
    return t;
  };
  return { asFirst: run(0), asSecond: run(1) };
}

export const quantile = (xs: number[], p: number): number => {
  const s = xs.slice().sort((x, y) => x - y);
  return s[Math.min(s.length - 1, Math.floor(p * s.length))]!;
};
export const mean = (xs: number[]): number => xs.reduce((a, b) => a + b, 0) / xs.length;

/** Win share counting a draw as half, pooled over both seats. */
export const pooled = (m: Match, n: number): number =>
  (m.asFirst.w + m.asSecond.w + 0.5 * (m.asFirst.d + m.asSecond.d)) / (2 * n);

export interface Bars {
  seat: number;
  floor: number;
  headroom: number;
  medianOptions: number;
  thin: number;
  turns: number;
  pass: [boolean, boolean, boolean, boolean];
}

/**
 * Pre-registered bar (written before the first run, 2026-09-25, not moved since):
 *   1. Seat balance:   greedy-vs-greedy first-seat win share within 40-60%.
 *   2. Skill floor:    greedy beats random >= 80% (both seats pooled).
 *   3. Skill headroom: lookahead beats greedy >= 55% (both seats pooled).
 *   4. Real choices:   median legal plays per decision >= 4, and fewer than 25%
 *                      of decisions offer 0-1 plays.
 */
export function bars(n: number, rules: Rules, matches?: Record<string, Match>): Bars {
  const gg = matches?.['greedy-greedy'] ?? match('greedy', 'greedy', n, rules);
  const gr = matches?.['greedy-random'] ?? match('greedy', 'random', n, rules);
  const lg = matches?.['lookahead-greedy'] ?? match('lookahead', 'greedy', n, rules);
  const seat = (gg.asFirst.w + 0.5 * gg.asFirst.d) / n;
  const floor = pooled(gr, n);
  const headroom = pooled(lg, n);
  const opts = [...gg.asFirst.options, ...gg.asSecond.options];
  const medianOptions = quantile(opts, 0.5);
  const thin = opts.filter((o) => o <= 1).length / opts.length;
  return {
    seat,
    floor,
    headroom,
    medianOptions,
    thin,
    turns: quantile(gg.asFirst.turns, 0.5),
    pass: [seat >= 0.4 && seat <= 0.6, floor >= 0.8, headroom >= 0.55, medianOptions >= 4 && thin < 0.25],
  };
}

export function parseRules(arg: string | undefined): Rules {
  const on = new Set((arg ?? '').split(',').filter(Boolean));
  for (const k of on) {
    if (!['pasteOver', 'takeover', 'cheapOpener'].includes(k)) throw new Error(`unknown rule: ${k}`);
  }
  return { ...DEFAULT_RULES, pasteOver: on.has('pasteOver'), takeover: on.has('takeover'), cheapOpener: on.has('cheapOpener') };
}

export const describeRules = (r: Rules): string =>
  (['pasteOver', 'takeover', 'cheapOpener'] as const)
    .filter((k) => r[k])
    .join('+') || 'baseline';
