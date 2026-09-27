// Every card's power, measured: the average change in seat 0's share when ONE card of
// the starter deck is swapped for this card, averaged over every starter card type it
// could replace (smart-greedy both seats, seat 1 plays the starter deck, same seeds).
// Starter cards are measured the same way (swapping a card type for itself is skipped),
// so a card that makes almost any deck better is strong, and one that makes almost any
// deck worse is weak. Feeds the rebalance (rebalancebars.ts) and the pay grades.
//
// Rebalance bars (user request 2026-09-27 "rebalance"; pre-registered BEFORE any
// rebalance run). Measured before: power is set by cost — $ cards +0.6..+10.7pp,
// $$ -3.2..-0.3pp, $$$ -7.8..-7.2pp; starter spread 18.5pp.
//   R1. Flatter starter set: starter spread (strongest - weakest) <= 9.2pp (half).
//   R2. Nothing else breaks: every existing pre-registered bar still passes after the
//       change (matchbars, runbars, stakebars, firstcareer, unlockbars; daily re-vetted).
// Usage: tsx src/cardpower.ts [N=1000] [--json] [--starter]   (PATCH='{...}' env to try stats)
import {
  CARDS,
  DEFAULT_MATCH,
  MATCH_RULES,
  NO_MODS,
  STARTER_DECK,
  UNLOCKABLES,
  greedyPolicy,
  matchPlayout,
  smartPass,
} from '@qbr/shared';

const N = Number(process.argv[2] ?? 1000);
const JSON_OUT = process.argv.includes('--json');
const STARTER_ONLY = process.argv.includes('--starter');
// Try stat changes without editing cards.ts: PATCH='{"standup":{"value":1}}'.
for (const [id, p] of Object.entries(JSON.parse(process.env.PATCH ?? '{}') as Record<string, object>))
  Object.assign(CARDS[id] as object, p);
const smartG = smartPass(greedyPolicy);

function share(player: readonly string[]): number {
  let s = 0;
  for (let seed = 1; seed <= N; seed++) {
    const r = matchPlayout(seed, { player, opponent: STARTER_DECK }, [smartG, smartG], DEFAULT_MATCH, MATCH_RULES, NO_MODS);
    s += r.winner === null ? 0.5 : r.winner === 0 ? 1 : 0;
  }
  return s / N;
}

export function cardPowers(): Record<string, number> {
  const base = share(STARTER_DECK);
  const types = [...new Set(STARTER_DECK)];
  const pool = STARTER_ONLY ? types : [...types, ...UNLOCKABLES.map((u) => u.id)];
  const out: Record<string, number> = {};
  for (const x of pool) {
    let sum = 0;
    let n = 0;
    for (const y of types) {
      if (y === x) continue;
      const d = STARTER_DECK.slice();
      d[d.indexOf(y)] = x;
      sum += share(d) - base;
      n++;
    }
    out[x] = sum / n;
  }
  return out;
}

const p = cardPowers();
if (JSON_OUT) console.log(JSON.stringify(p));
else {
  const starter = new Set(STARTER_DECK);
  console.log(`Card power (mean swap lift, ${N} seeds per deck)\n`);
  for (const [id, v] of Object.entries(p).sort((a, b) => b[1] - a[1])) {
    const c = CARDS[id]!;
    console.log(
      `  ${(v >= 0 ? '+' : '') + (100 * v).toFixed(1).padStart(5)}pp  ${'$'.repeat(c.cost).padEnd(3)} v${String(c.value).padEnd(3)} ${c.name.replace(/­/g, '')}${starter.has(id) ? '  (starter)' : ''}`,
    );
  }
  const sv = [...starter].map((id) => p[id]!);
  console.log(`\n  starter mirror (seat 0 share): ${(100 * share(STARTER_DECK)).toFixed(1)}%`);
  console.log(`  starter spread (max - min): ${(100 * (Math.max(...sv) - Math.min(...sv))).toFixed(1)}pp`);
}
