// Diagnostic for deckbars.ts DB2 (added after its first run): against a KNOWN boss,
// does benching a special ever beat all-in? If so, deck building is a real,
// boss-dependent choice (the VP's boss is shown from the start of a career).
// Usage: tsx src/deckboss.ts [N=2000]
import {
  BOSSES,
  DEFAULT_MATCH,
  MATCH_RULES,
  SPECIALS,
  STARTER_DECK,
  deckWith,
  greedyPolicy,
  matchPlayout,
  smartPass,
  type Mods,
} from '@qbr/shared';

const N = Number(process.argv[2] ?? 2000);
const pct = (x: number): string => `${(100 * x).toFixed(1)}%`;
const smartG = smartPass(greedyPolicy);
const ids = SPECIALS.map((s) => s.id);

function share(sub: readonly string[], mods: Mods): number {
  const deck = { player: deckWith(sub), opponent: STARTER_DECK };
  let s = 0;
  for (let seed = 1; seed <= N; seed++) {
    const r = matchPlayout(seed, deck, [smartG, smartG], DEFAULT_MATCH, MATCH_RULES, mods);
    s += r.winner === null ? 0.5 : r.winner === 0 ? 1 : 0;
  }
  return s / N;
}

for (const boss of Object.keys(BOSSES)) {
  const mods: Mods = { jokers: [], boss };
  const all = share(ids, mods);
  const benches = ids.map((b) => ({ b, v: share(ids.filter((i) => i !== b), mods) })).sort((x, y) => y.v - x.v);
  const best = benches[0]!;
  console.log(
    `${boss.padEnd(13)} all-in ${pct(all)}   best bench: ${best.b} ${pct(best.v)} (${best.v - all >= 0 ? '+' : ''}${(100 * (best.v - all)).toFixed(1)}pp)`,
  );
}
