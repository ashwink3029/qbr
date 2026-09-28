// Informative for backlog item 16 (purple takeover cells): how often cards change hands.
// Starter-deck mirrors, smart-greedy both seats (the matchbars method); counts every
// play's flips via the shared spreadEffects, so it measures whatever rule is current.
// Usage: tsx src/flipcount.ts [N=2000]
import {
  DEFAULT_MATCH,
  MATCH_RULES,
  STARTER_DECK,
  greedyPolicy,
  matchReducer,
  newMatch,
  smartPass,
  spreadEffects,
  type Action,
  type RngState,
} from '@qbr/shared';

const N = Number(process.argv[2] ?? 2000);
const smartG = smartPass(greedyPolicy);
let flips = 0;
let plays = 0;
let matchesWithFlip = 0;
for (let seed = 1; seed <= N; seed++) {
  let m = newMatch(seed, { player: STARTER_DECK, opponent: STARTER_DECK }, DEFAULT_MATCH, MATCH_RULES);
  let rng: RngState = (seed * 2654435761) >>> 0;
  let here = 0;
  while (!m.over) {
    let a: Action;
    [rng, a] = smartG(m, rng);
    if (a.type === 'play') {
      plays++;
      here += spreadEffects(m.quarter, a.card, a.cell).flip.length;
    }
    m = matchReducer(m, a);
  }
  flips += here;
  if (here > 0) matchesWithFlip++;
}
console.log(`flips per match ${(flips / N).toFixed(2)} · flips per play ${(flips / plays).toFixed(3)} · matches with a flip ${((100 * matchesWithFlip) / N).toFixed(1)}%`);
