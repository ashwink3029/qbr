// The card collection (user request 2026-09-27): wins earn MORE cards, and the player
// builds their own 15. Is every collectible worth owning, none broken, and is the
// best buildable deck still fair?
//
// Pre-registered bars (written here BEFORE the first run, 2026-09-27). Method as in
// unlockbars.ts: seat 0 plays the deck under test, seat 1 the starter deck, both
// smart-greedy, draws count half, same seeds for every deck (common random numbers).
// A collectible is measured swapped for ONE copy of its like-for-like `replaces`.
//   C1. Not broken alone:  no collectible lifts seat 0 by more than +10pp (U2's cap),
//                          no boss.
//   C2. Every card has a use: each collectible lifts seat 0 by >= +1pp in at least
//                          one context — no boss, or one of the VP/CEO bosses.
//   C3. The collection is fair: a hill-climbing deck builder over the WHOLE collection
//                          (every unlockable owned), starting from the all-specials
//                          default deck, finds no deck above 75% (U3's / DB1's cap),
//                          re-measured at N seeds.
//   C4. (informative) Building is a skill: the naive "15 cheapest cards" deck scores
//                          below the builder's best.
//
// Power ceiling (user request 2026-09-27; RETIRED the same day). A star cap (every card
// 1-5★, a deck <= 49★) held the best build to 84.0% (P1 <= 75% a recorded FAIL); the user
// found stars too much to read. Caps on the card-face currencies were measured next
// (CLAUDE.md item 14: VCAP / DCAP / FLOOR below) and hold nothing (88.2% vs 88.4% with no
// cap), so by user decision decks have NO ceiling: C3 below is the live check.
//   Q2. (item 14) best build under a currency cap <= 84.0%: FAIL for every cap.
//   Q3. building still matters: best build >= the default + 3pp (printed as P2).
// Usage: tsx src/collectionbars.ts [N=2000] [SCREEN=300] [only=c1c2|c3]
import {
  BOSSES,
  CARDS,
  COLLECTIBLES,
  DEFAULT_MATCH,
  MATCH_RULES,
  NO_MODS,
  SPECIALS,
  STARTER_DECK,
  collectionOf,
  defaultDeck,
  deckWith,
  greedyPolicy,
  matchPlayout,
  smartPass,
  type Mods,
} from '@qbr/shared';

const N = Number(process.argv[2] ?? 2000);
const SCREEN = Number(process.argv[3] ?? 300);
const ONLY = process.argv[4] ?? 'all';
const pct = (x: number): string => `${(100 * x).toFixed(1)}%`;
const pp = (x: number): string => `${x >= 0 ? '+' : ''}${(100 * x).toFixed(1)}pp`;
const verdict = (ok: boolean): string => (ok ? 'PASS' : 'FAIL');
const smartG = smartPass(greedyPolicy);
// Try stat changes without editing cards.ts: PATCH='{"coldcall":{"value":2}}'.
for (const [id, p] of Object.entries(JSON.parse(process.env.PATCH ?? '{}') as Record<string, object>))
  Object.assign(CARDS[id] as object, p);
// Minimum total $ cost of a built deck (0 = no floor), for trying the budget rule.
const FLOOR = Number(process.env.FLOOR ?? 0);
const deckCost = (d: readonly string[]): number => d.reduce((s, id) => s + CARDS[id]!.cost, 0);
const VETERAN = { bestRung: 5, careers: 999, stakeCleared: 99, promotions: 999, meetings: 9999 };
// Backlog item 14 exploration: caps in the currencies on the card faces.
// VCAP = most total value, DCAP = most total $, FLOOR (above) = least total $. Setting any
// of them turns the cap on (default: no cap).
const VCAP = Number(process.env.VCAP ?? 999);
const DCAP = Number(process.env.DCAP ?? 999);
const CURRENCY = process.env.VCAP !== undefined || process.env.DCAP !== undefined || FLOOR > 0;
const deckValue = (d: readonly string[]): number => d.reduce((s, id) => s + CARDS[id]!.value, 0);
const fitsCurrency = (d: readonly string[]): boolean => deckValue(d) <= VCAP && deckCost(d) <= DCAP && deckCost(d) >= FLOOR;
// The default deck a veteran gets: every special that fits under the cap.
function currencyDefault(): string[] {
  let taken: string[] = [];
  for (const sp of SPECIALS) if (fitsCurrency(deckWith([...taken, sp.id]))) taken = [...taken, sp.id];
  return deckWith(taken);
}
const DEFAULT = CURRENCY ? currencyDefault() : defaultDeck(VETERAN);
// Exploration: cap the $ cards / floor the $$$ cards in a built deck.
const MAXCHEAP = Number(process.env.MAXCHEAP ?? 99);
const MINSENIOR = Number(process.env.MINSENIOR ?? 0);

function share(player: readonly string[], n: number, mods: Mods = NO_MODS): number {
  const deck = { player, opponent: STARTER_DECK };
  let s = 0;
  for (let seed = 1; seed <= n; seed++) {
    const r = matchPlayout(seed, deck, [smartG, smartG], DEFAULT_MATCH, MATCH_RULES, mods);
    s += r.winner === null ? 0.5 : r.winner === 0 ? 1 : 0;
  }
  return s / n;
}

function swapIn(id: string, replaces: string): string[] {
  const d = STARTER_DECK.slice();
  d[d.indexOf(replaces)] = id;
  return d;
}

const contexts: { name: string; mods: Mods }[] = [
  { name: 'no boss', mods: NO_MODS },
  ...Object.keys(BOSSES).map((boss) => ({ name: boss, mods: { jokers: [], boss } as Mods })),
];

let c1 = true;
let c2 = true;
if (ONLY !== 'c3') {
  console.log(`QBR collectibles — ${N} seeded matches each, per context\n`);
  const bases = contexts.map((c) => share(STARTER_DECK, N, c.mods));
  console.log(`baselines: ${contexts.map((c, i) => `${c.name} ${pct(bases[i]!)}`).join(' · ')}\n`);
  for (const u of COLLECTIBLES) {
    const d = swapIn(u.id, u.replaces);
    const lifts = contexts.map((c, i) => share(d, N, c.mods) - bases[i]!);
    const best = Math.max(...lifts);
    const k = lifts.indexOf(best);
    c1 &&= lifts[0]! <= 0.1;
    c2 &&= best >= 0.01;
    const c = CARDS[u.id]!;
    console.log(
      `  ${c.name.replace(/­/g, '').padEnd(18)} ${'$'.repeat(c.cost).padEnd(3)} v${String(c.value).padEnd(3)} for ${u.replaces.padEnd(11)} no boss ${pp(lifts[0]!).padStart(7)}   best ${pp(best).padStart(7)} (${contexts[k]!.name})${lifts[0]! > 0.1 ? '  BROKEN' : best < 0.01 ? '  NO USE' : ''}`,
    );
  }
}

let c3 = true;
let p2 = true;
if (ONLY !== 'c1c2') {
  // Hill-climb: one-copy swaps from the whole collection, best improving swap each step.
  const owned = collectionOf({ bestRung: 5, careers: 999, stakeCleared: 99, promotions: 999, meetings: 9999 });
  let deck = DEFAULT.slice();
  let score = share(deck, SCREEN);
  console.log(`\nDeck builder (hill climb at ${SCREEN} seeds) from the all-specials deck: ${pct(score)}`);
  for (let step = 0; step < 12; step++) {
    const used = new Map<string, number>();
    for (const id of deck) used.set(id, (used.get(id) ?? 0) + 1);
    let bestMove: { out: string; inn: string; v: number } | null = null;
    for (const out of used.keys()) {
      for (const [inn, have] of owned) {
        if (inn === out || (used.get(inn) ?? 0) >= have) continue;
        if (deckCost(deck) - CARDS[out]!.cost + CARDS[inn]!.cost < FLOOR) continue;
        const d = deck.slice();
        d[d.indexOf(out)] = inn;
        if (CURRENCY && !fitsCurrency(d)) continue;
        if (d.filter((id) => CARDS[id]!.cost === 1).length > MAXCHEAP) continue;
        if (d.filter((id) => CARDS[id]!.cost === 3).length < MINSENIOR) continue;
        const v = share(d, SCREEN);
        if (!bestMove || v > bestMove.v) bestMove = { out, inn, v };
      }
    }
    if (!bestMove || bestMove.v <= score + 0.005) break;
    deck[deck.indexOf(bestMove.out)] = bestMove.inn;
    score = bestMove.v;
    console.log(`  step ${step + 1}: ${bestMove.out} -> ${bestMove.inn}   ${pct(score)}`);
  }
  const final = share(deck, N);
  const allIn = share(DEFAULT, N);
  c3 = final <= 0.75;
  p2 = final >= allIn + 0.03;
  const tot = (d: readonly string[]) => `v${deckValue(d)} $${deckCost(d)}`;
  const rule = CURRENCY ? `value<=${VCAP} $<=${DCAP} $>=${FLOOR}` : 'no cap';
  console.log(`\n  best found (${tot(deck)} / ${rule}): ${[...deck].sort().join(' ')}`);
  console.log(`  best found at ${N}: ${pct(final)}   (default deck ${pct(allIn)}, ${tot(DEFAULT)})`);
  const cheapest = [...owned.entries()]
    .flatMap(([id, n]) => Array<string>(n).fill(id))
    .sort((a, b) => CARDS[a]!.cost - CARDS[b]!.cost || CARDS[b]!.value - CARDS[a]!.value)
    .slice(0, 15);
  const naive = share(cheapest, N);
  console.log(`  C4 (informative) naive 15 cheapest: ${pct(naive)} — ${naive < final ? 'below the builder' : 'NOT below the builder'}`);
}

console.log('\nPre-registered bars');
if (ONLY !== 'c3') {
  console.log(`  C1. not broken alone   ${verdict(c1)}`);
  console.log(`  C2. every card has a use   ${verdict(c2)}`);
}
if (ONLY !== 'c1c2') {
  console.log(`  C3. collection is fair (best built <= 75%)   ${verdict(c3)}`);
  console.log(`  P2. building still matters (best >= default + 3pp)   ${verdict(p2)}`);
}
