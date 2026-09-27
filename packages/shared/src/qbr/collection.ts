// The card collection and deck building (user request 2026-09-27: "rather than
// upgrading my cards on wins, you should get more cards — then the player has to
// strategize how to form a good deck of 15").
//
// You own the starter deck plus every card you have unlocked (`copies` each). Your
// deck is any 15 cards you own. Until you build one, the deck is the old default:
// the starter deck with each unlocked SPECIAL swapped in (`playerDeck`), so a player
// who never opens the builder is still upgraded, and every older bar still holds.
//
// Collectibles are unlocked by milestones spread over many careers (meetings won,
// promotions, careers finished, stakes), and the builder shows the locked ones
// greyed out, with progress, from day one. Every collectible must pass the
// collection bars in sim/src/collectionbars.ts before it ships.
import {
  CARDS,
  SPECIALS,
  STARTER_DECK,
  deckWith,
  isUnlocked,
  playerDeck,
  type Progress,
  type UnlockCondition,
} from './cards.js';

export interface Unlockable {
  readonly id: string;
  /** For a SPECIAL, the starter card it replaces in the default deck. For a
   *  collectible, the like-for-like starter card the balance bars swap it for. */
  readonly replaces: string;
  readonly unlock: UnlockCondition;
  readonly how: string;
  readonly flavor: string;
  /** Copies you own once unlocked (default 1). */
  readonly copies?: number;
}

/** Cards that join your collection (never auto-added to a deck), in unlock order. */
export const COLLECTIBLES: readonly Unlockable[] = [
  { id: 'stickynote', replaces: 'coldcall', copies: 2, unlock: { kind: 'meetings', count: 3 }, how: 'Win 3 meetings', flavor: 'Stuck to the next cell over. And the one after.' },
  { id: 'ooo', replaces: 'standup', copies: 2, unlock: { kind: 'careers', count: 2 }, how: 'Finish 2 careers', flavor: 'Limited access to email. Unlimited access to value.' },
  { id: 'highfive', replaces: 'standup', unlock: { kind: 'meetings', count: 6 }, how: 'Win 6 meetings', flavor: 'Up top. Down low. Plus one.' },
  { id: 'emailchain', replaces: 'coldcall', copies: 2, unlock: { kind: 'careers', count: 5 }, how: 'Finish 5 careers', flavor: 'RE: RE: FWD: RE: quick question' },
  { id: 'redpen', replaces: 'coldcall', copies: 2, unlock: { kind: 'meetings', count: 10 }, how: 'Win 10 meetings', flavor: 'See comments. All of them.' },
  { id: 'keynote', replaces: 'slidedeck', unlock: { kind: 'promotions', count: 2 }, how: 'Get promoted twice', flavor: 'One more thing.' },
  { id: 'whiteboard', replaces: 'offsite', unlock: { kind: 'meetings', count: 15 }, how: 'Win 15 meetings', flavor: 'Do not erase. Do not understand.' },
  { id: 'pivot', replaces: 'synergy', unlock: { kind: 'careers', count: 8 }, how: 'Finish 8 careers', flavor: 'Same team, new direction: backwards.' },
  { id: 'mentorship', replaces: 'offsite', unlock: { kind: 'meetings', count: 20 }, how: 'Win 20 meetings', flavor: 'Lifts everyone in the lane.' },
  { id: 'deadline', replaces: 'stakeholder', unlock: { kind: 'promotions', count: 3 }, how: 'Get promoted 3 times', flavor: 'EOD. Whose day, unclear.' },
  { id: 'hackathon', replaces: 'reorg', unlock: { kind: 'careers', count: 12 }, how: 'Finish 12 careers', flavor: 'Pizza at midnight, ship at dawn.' },
  { id: 'summerintern', replaces: 'memo', unlock: { kind: 'meetings', count: 30 }, how: 'Win 30 meetings', flavor: 'Eager. Everywhere. Unpaid.' },
  { id: 'ipo', replaces: 'headcount', unlock: { kind: 'stake', cleared: 4 }, how: 'Get promoted on Hostile board', flavor: 'Ring the bell. Then the lawyers.' },
  { id: 'corneroffice', replaces: 'vision', unlock: { kind: 'promotions', count: 5 }, how: 'Get promoted 5 times', flavor: 'Two windows. One plant. Everyone works harder.' },
  { id: 'merger', replaces: 'slidedeck', unlock: { kind: 'meetings', count: 45 }, how: 'Win 45 meetings', flavor: 'Synergies have been identified.' },
  { id: 'bluesky', replaces: 'offsite', unlock: { kind: 'careers', count: 20 }, how: 'Finish 20 careers', flavor: 'Not here. Over there. Further.' },
];

/** Everything winnable: the original specials first, then the collectibles. */
export const UNLOCKABLES: readonly Unlockable[] = [...SPECIALS, ...COLLECTIBLES];

export const DECK_SIZE = 15;

/**
 * Every card's star rating (1-5), the power ceiling's unit: a deck's stars may not add
 * up to more than STAR_CAP. Ratings are MEASURED, not guessed: sim/src/starfit.ts fits
 * each card's additive contribution to win share by ridge regression over 500 random
 * legal decks plus every deck a capped hill climb found (6 rounds, 3 climbs each, 2026-09-27), then
 * bins the weights at the 20/40/60/80th percentiles. Power follows reach and cost in
 * QBR: cheap cards that spread sideways rate highest, $$$ cards lowest. Re-fit
 * whenever a card changes.
 */
export const STARS: Readonly<Record<string, number>> = {
  // 5★
  memo: 5, cc: 5, coffeerun: 5, budgetcut: 5, ooo: 5, highfive: 5, summerintern: 5,
  // 4★
  coldcall: 4, standup: 4, gossip: 4, emailchain: 4, redpen: 4, pivot: 4, hackathon: 4,
  // 3★
  synergy: 3, reorg: 3, stakeholder: 3, teambuilding: 3, pip: 3, deadline: 3, bluesky: 3,
  // 2★
  vision: 2, perfreview: 2, takeover: 2, stickynote: 2, mentorship: 2, ipo: 2, merger: 2,
  // 1★
  offsite: 1, slidedeck: 1, headcount: 1, parachute: 1, keynote: 1, whiteboard: 1, corneroffice: 1,
};

/** The most stars a deck may hold (the starter deck is 48★). Tuned by
 *  sim/src/collectionbars.ts P1/P2. */
export const STAR_CAP = 49;

export function stars(id: string): number {
  const s = STARS[id];
  if (s === undefined) throw new Error(`no star rating: ${id}`);
  return s;
}

export function deckStars(deck: readonly string[]): number {
  return deck.reduce((sum, id) => sum + stars(id), 0);
}

export function unlockedCards(p: Progress): string[] {
  return UNLOCKABLES.filter((u) => isUnlocked(u, p)).map((u) => u.id);
}

/** Cards `after` has and `before` did not — what a career just earned. */
export function newlyUnlockedCards(before: Progress, after: Progress): string[] {
  const had = new Set(unlockedCards(before));
  return unlockedCards(after).filter((id) => !had.has(id));
}

/** How far along a card's unlock is (have is capped at need). */
export function unlockProgress(u: Unlockable, p: Progress): { have: number; need: number } {
  const c = u.unlock;
  const [have, need] =
    c.kind === 'rung'
      ? [p.bestRung, c.rungsBeaten]
      : c.kind === 'careers'
        ? [p.careers, c.count]
        : c.kind === 'stake'
          ? [p.stakeCleared ?? 0, c.cleared]
          : c.kind === 'promotions'
            ? [p.promotions ?? 0, c.count]
            : [p.meetings ?? 0, c.count];
  return { have: Math.min(have, need), need };
}

/** Card id -> copies owned. */
export function collectionOf(p: Progress): Map<string, number> {
  const owned = new Map<string, number>();
  for (const id of STARTER_DECK) owned.set(id, (owned.get(id) ?? 0) + 1);
  for (const u of UNLOCKABLES) if (isUnlocked(u, p)) owned.set(u.id, u.copies ?? 1);
  return owned;
}

/** Why `deck` is not a legal deck for this player, or null if it is. */
export function deckProblem(deck: readonly string[], p: Progress): string | null {
  if (deck.length !== DECK_SIZE) return `A deck is ${DECK_SIZE} cards; this one has ${deck.length}.`;
  const owned = collectionOf(p);
  const used = new Map<string, number>();
  for (const id of deck) used.set(id, (used.get(id) ?? 0) + 1);
  for (const [id, n] of used) {
    const have = owned.get(id) ?? 0;
    const name = (CARDS[id]?.name ?? id).replace(/­/g, '');
    if (have === 0) return `${name} isn't in your collection yet.`;
    if (n > have) return `You own ${have} ${name}; this deck uses ${n}.`;
  }
  const total = deckStars(deck);
  if (total > STAR_CAP) return `${total}★ is over the ${STAR_CAP}★ limit.`;
  return null;
}

/** The default deck: the starter deck with each unlocked special swapped in, in unlock
 *  order, while the deck stays within the cap. A player who never builds is still
 *  upgraded and never over the limit; later specials are theirs to fit in by hand. */
export function defaultDeck(p: Progress, cap = STAR_CAP): string[] {
  let taken: string[] = [];
  for (const s of SPECIALS) {
    if (!isUnlocked(s, p)) continue;
    if (deckStars(deckWith([...taken, s.id])) <= cap) taken = [...taken, s.id];
  }
  return deckWith(taken);
}

/** The deck a career uses: the saved one if it is still legal, else the default. */
export function resolveDeck(saved: readonly string[] | null, p: Progress): string[] {
  return saved && deckProblem(saved, p) === null ? [...saved] : defaultDeck(p);
}
