// Unlockable special cards: is each one worth earning, without breaking the game?
//
// Pre-registered bar (stated to the user and written here BEFORE the first run,
// 2026-09-25). Method: seat 0 plays the starter deck UPGRADED by the special(s)
// (first run ADDED them instead — see the note at the bottom); seat 1
// plays the plain starter deck; both smart-greedy; seat share with draws as half,
// compared with the starter-vs-starter baseline over the same seeds.
//   U1. Worth unlocking:     every special lifts seat 0's share by >= +1pp.
//   U2. Not broken alone:    no single special lifts it by more than +10pp.
//   U3. Collection is fair:  the whole collection together keeps the share <= 75%.
// Usage: tsx src/unlockbars.ts [seeds=2000]
import {
  CARDS,
  DEFAULT_MATCH,
  MATCH_RULES,
  NO_MODS,
  SPECIALS,
  STARTER_DECK,
  deckWith,
  greedyPolicy,
  matchPlayout,
  smartPass,
  type Deck,
} from '@qbr/shared';

const N = Number(process.argv[2] ?? 2000);
const pct = (x: number): string => `${(100 * x).toFixed(1)}%`;
const verdict = (ok: boolean): string => (ok ? 'PASS' : 'FAIL');
const smartG = smartPass(greedyPolicy);

function share(deck: Deck): number {
  let s = 0;
  for (let seed = 1; seed <= N; seed++) {
    const r = matchPlayout(seed, deck, [smartG, smartG], DEFAULT_MATCH, MATCH_RULES, NO_MODS);
    s += r.winner === null ? 0.5 : r.winner === 0 ? 1 : 0;
  }
  return s / N;
}

console.log(`QBR special cards — ${N} seeded matches each\n`);
const base = share({ player: STARTER_DECK, opponent: STARTER_DECK });
console.log(`baseline (starter vs starter): ${pct(base)}\n`);

const lifts: Record<string, number> = {};
for (const s of SPECIALS) {
  const v = share({ player: deckWith([s.id]), opponent: STARTER_DECK });
  lifts[s.id] = v - base;
  const c = CARDS[s.id]!;
  console.log(
    `  ${c.name.padEnd(22)} ${'$'.repeat(c.cost).padEnd(3)} v${String(c.value).padEnd(3)} ${pct(v).padStart(6)}  (${v - base >= 0 ? '+' : ''}${(100 * (v - base)).toFixed(1)}pp)   ${s.how}`,
  );
}
const all = share({ player: deckWith(SPECIALS.map((s) => s.id)), opponent: STARTER_DECK });
console.log(`\n  whole collection          ${pct(all)}  (+${(100 * (all - base)).toFixed(1)}pp)\n`);

const minLift = Math.min(...Object.values(lifts));
const maxLift = Math.max(...Object.values(lifts));
console.log('Pre-registered bar');
console.log(`  U1. worth unlocking    smallest lift ${(100 * minLift).toFixed(1)}pp >= +1pp     ${verdict(minLift >= 0.01)}`);
console.log(`  U2. not broken alone   largest lift ${(100 * maxLift).toFixed(1)}pp <= +10pp     ${verdict(maxLift <= 0.1)}`);
console.log(`  U3. collection is fair all specials ${pct(all)} <= 75%          ${verdict(all <= 0.75)}`);
