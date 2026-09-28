// A career (called a "run" in code) — the Balatro layer's spine. You climb the
// org chart one best-of-3 meeting at a time, each rung a stronger opponent:
//   1. The Intern   — Onboarding sync   — greedy, never passes on purpose
//   2. The Manager  — Weekly 1:1        — greedy + smart passing
//   3. Finance      — Budget review     — lookahead + smart passing
//   4. The VP       — Quarterly Review  — lookahead + a boss drawn at the start
//   5. The CEO      — Board meeting     — lookahead + Reply-All (the CEO's inbox)
// Flow: org chart -> supply closet (draft 1 of up to 3 jokers) -> meeting ->
// org chart ... Lose a meeting and the career ends where you stood; beat the CEO
// and you are promoted. Pure and seeded, like everything in shared.
import { neverPass, smartPass, type MatchPolicy } from './match.js';
import { BOSSES, JOKERS, type Mods } from './mods.js';
import { greedyPolicy, lookaheadPolicy, randomPolicy } from './policies.js';
import { nextInt, shuffle, type RngState } from './rng.js';
import { STARTER_DECK, type Progress } from './cards.js';

/** How the opponent plays. One mapping for the app and the sim, so the
 *  measured ladder IS the shipped ladder. */
export type OpponentKind = 'rookie' | 'greedy' | 'lookahead';

export function opponentPolicy(kind: OpponentKind): MatchPolicy {
  switch (kind) {
    case 'rookie':
      return neverPass(randomPolicy); // the Intern plays anything, never passes on purpose
    case 'greedy':
      return smartPass(greedyPolicy);
    case 'lookahead':
      return smartPass(lookaheadPolicy);
  }
}

export interface Meeting {
  /** The opponent's role on the org chart. */
  readonly role: string;
  /** Avatar initials on the opponent strip. */
  readonly initials: string;
  /** The meeting's name — the game window's title. */
  readonly name: string;
  readonly opponent: OpponentKind;
  /** null = no boss rule; 'drawn' = the career's boss (drawn at the start and
   *  shown up front); anything else = that boss id, always. */
  readonly boss: null | 'drawn' | string;
  /** Extra cards the opponent draws every quarter: seniority's edge, which is
   *  what keeps the climb steep while the player's jokers stack up. */
  readonly edge: number;
  /** Opponent home cells starting at $$ (seniority's head start). */
  readonly homeBoost: number;
}

export const MEETINGS: readonly Meeting[] = [
  { role: 'The Intern', initials: 'INT', name: 'Onboarding sync', opponent: 'rookie', boss: null, edge: 0, homeBoost: 0 },
  { role: 'The Manager', initials: 'MGR', name: 'Weekly 1:1', opponent: 'greedy', boss: null, edge: 0, homeBoost: 0 },
  { role: 'The Controller', initials: 'CTL', name: 'Budget review', opponent: 'lookahead', boss: null, edge: 0, homeBoost: 0 },
  { role: 'The VP', initials: 'VP', name: 'Quarterly Review', opponent: 'lookahead', boss: 'drawn', edge: 0, homeBoost: 1 },
  { role: 'The CEO', initials: 'CEO', name: 'Board meeting', opponent: 'lookahead', boss: 'replyall', edge: 1, homeBoost: 2 },
];

/** Bosses Finance's VP can draw. Pinned (it was "every boss not fixed to a rung"), so new
 *  exec modifiers for other orgs never reshuffle Finance careers or the vetted daily seeds. */
export const DRAWABLE_BOSSES: readonly string[] = ['micromanager', 'legacy', 'auditor', 'freeze'];

/**
 * Orgs (backlog item 15): which org you climb, chosen like a Balatro deck. Each is its
 * own cast of five, its own pool of VP bosses and top boss, and its own opponent deck,
 * so orgs differ in play, not only in look. Finance is the original ladder; getting
 * promoted in one org opens the next. Measured per org in sim/src/orgbars.ts.
 */
export interface Org {
  readonly id: string;
  readonly name: string;
  /** One line for the picker. */
  readonly blurb: string;
  readonly meetings: readonly Meeting[];
  /** Bosses the org's VP-rung can draw at the start of a career. */
  readonly bosses: readonly string[];
  /** The deck every opponent in this org plays. */
  readonly opponentDeck: readonly string[];
}

/** Tech ships fast: a forward rush of cheap reach and no takeovers. */
const TECH_DECK: readonly string[] = [
  'emailchain', 'emailchain', 'stickynote', 'stickynote', 'hackathon', 'hackathon', 'coldcall', 'coldcall',
  'reorg', 'reorg', 'memo', 'memo', 'bluesky', 'slidedeck', 'keynote',
];
/** Sales works the phones: cheap forward fans, lots of them. */
const SALES_DECK: readonly string[] = [
  'coldcall', 'coldcall', 'coldcall', 'cc', 'cc', 'memo', 'memo', 'standup', 'standup',
  'stakeholder', 'stakeholder', 'offsite', 'synergy', 'reorg', 'slidedeck',
];
/** Marketing builds the brand: boosts and wide, sideways spreads. */
const MARKETING_DECK: readonly string[] = [
  'highfive', 'teambuilding', 'cc', 'cc', 'bluesky', 'whiteboard', 'memo', 'memo', 'standup',
  'standup', 'synergy', 'offsite', 'offsite', 'highfive', 'keynote',
];
/** Legal redlines: weakens, purple and big numbers. */
const LEGAL_DECK: readonly string[] = [
  'redpen', 'redpen', 'deadline', 'stakeholder', 'stakeholder', 'merger', 'headcount', 'slidedeck',
  'synergy', 'reorg', 'memo', 'memo', 'standup', 'standup', 'cc',
];
/** HR manages people: boosts, weakens, and the purple performance-review family. */
const HR_DECK: readonly string[] = [
  'highfive', 'highfive', 'standup', 'standup', 'mentorship', 'pip', 'deadline', 'stakeholder',
  'synergy', 'cc', 'memo', 'offsite', 'offsite', 'headcount', 'slidedeck',
];

export const ORGS: readonly Org[] = [
  {
    id: 'finance',
    name: 'Finance',
    blurb: 'The numbers people. Where every career starts.',
    meetings: MEETINGS,
    bosses: DRAWABLE_BOSSES,
    opponentDeck: STARTER_DECK,
  },
  {
    id: 'marketing',
    name: 'Marketing',
    blurb: 'All about the brand: boosts, and spreads that go wide.',
    meetings: [
      { role: 'The Content Writer', initials: 'CW', name: 'Content sync', opponent: 'rookie', boss: null, edge: 0, homeBoost: 0 },
      { role: 'The Designer', initials: 'DSN', name: 'Creative review', opponent: 'greedy', boss: null, edge: 0, homeBoost: 0 },
      { role: 'The Growth Lead', initials: 'GRW', name: 'Campaign retro', opponent: 'lookahead', boss: null, edge: 0, homeBoost: 0 },
      { role: 'The Marketing Director', initials: 'MKD', name: 'Launch review', opponent: 'lookahead', boss: 'drawn', edge: 0, homeBoost: 2 },
      { role: 'The CMO', initials: 'CMO', name: 'Brand summit', opponent: 'lookahead', boss: 'teamsync', edge: 0, homeBoost: 1 },
    ],
    bosses: ['legacy', 'auditor'],
    opponentDeck: MARKETING_DECK,
  },
  {
    id: 'sales',
    name: 'Sales',
    blurb: 'Always be closing: cheap cards, thrown fast and far.',
    meetings: [
      { role: 'The SDR', initials: 'SDR', name: 'Call block', opponent: 'rookie', boss: null, edge: 0, homeBoost: 0 },
      { role: 'The Account Exec', initials: 'AE', name: 'Pipeline review', opponent: 'greedy', boss: null, edge: 0, homeBoost: 0 },
      { role: 'The Sales Manager', initials: 'SLM', name: 'Forecast call', opponent: 'lookahead', boss: null, edge: 0, homeBoost: 0 },
      { role: 'The VP of Sales', initials: 'VPS', name: 'Deal desk', opponent: 'lookahead', boss: 'drawn', edge: 0, homeBoost: 1 },
      { role: 'The CRO', initials: 'CRO', name: 'Sales kickoff', opponent: 'lookahead', boss: 'quota', edge: 1, homeBoost: 0 },
    ],
    bosses: ['auditor', 'freeze'],
    opponentDeck: SALES_DECK,
  },
  {
    id: 'legal',
    name: 'Legal',
    blurb: 'Every clause is a trap: red pens, purple, and big numbers.',
    meetings: [
      { role: 'The Paralegal', initials: 'PL', name: 'Intake', opponent: 'rookie', boss: null, edge: 0, homeBoost: 0 },
      { role: 'The Associate', initials: 'ASC', name: 'Document review', opponent: 'greedy', boss: null, edge: 0, homeBoost: 0 },
      { role: 'The Senior Counsel', initials: 'SC', name: 'Redline', opponent: 'lookahead', boss: null, edge: 0, homeBoost: 0 },
      { role: 'The General Counsel', initials: 'GC', name: 'Compliance review', opponent: 'lookahead', boss: 'drawn', edge: 0, homeBoost: 0 },
      { role: 'The Managing Partner', initials: 'MP', name: 'Deposition', opponent: 'lookahead', boss: 'replyall', edge: 2, homeBoost: 2 },
    ],
    bosses: ['auditor', 'redtape'],
    opponentDeck: LEGAL_DECK,
  },
  {
    id: 'tech',
    name: 'Tech',
    blurb: 'They ship fast and reach far — no takeovers, all rush.',
    meetings: [
      { role: 'The New Grad', initials: 'NG', name: 'Onboarding standup', opponent: 'rookie', boss: null, edge: 0, homeBoost: 0 },
      { role: 'The Scrum Master', initials: 'SM', name: 'Sprint planning', opponent: 'greedy', boss: null, edge: 0, homeBoost: 0 },
      { role: 'The Tech Lead', initials: 'TL', name: 'Code review', opponent: 'lookahead', boss: null, edge: 0, homeBoost: 0 },
      { role: 'The CTO', initials: 'CTO', name: 'Architecture review', opponent: 'lookahead', boss: 'drawn', edge: 0, homeBoost: 1 },
      { role: 'The Founder', initials: 'FDR', name: 'All-hands', opponent: 'lookahead', boss: 'freeze', edge: 1, homeBoost: 2 },
    ],
    bosses: ['legacy', 'scope'],
    opponentDeck: TECH_DECK,
  },
  {
    id: 'hr',
    name: 'HR',
    blurb: 'Every card lifts a colleague or reviews one — watch their purple.',
    meetings: [
      { role: 'The Recruiter', initials: 'REC', name: 'Phone screen', opponent: 'rookie', boss: null, edge: 0, homeBoost: 0 },
      { role: 'The HR Partner', initials: 'HRP', name: 'Check-in', opponent: 'greedy', boss: null, edge: 0, homeBoost: 0 },
      { role: 'The Comp Lead', initials: 'CMP', name: 'Calibration', opponent: 'lookahead', boss: null, edge: 1, homeBoost: 0 },
      { role: 'The CHRO', initials: 'CHR', name: 'Talent review', opponent: 'lookahead', boss: 'drawn', edge: 2, homeBoost: 0 },
      { role: 'The Board Chair', initials: 'BC', name: 'Governance review', opponent: 'lookahead', boss: 'replyall', edge: 3, homeBoost: 2 },
    ],
    bosses: ['politics', 'micromanager'],
    opponentDeck: HR_DECK,
  },
];

export function orgOf(id: string): Org {
  const o = ORGS.find((x) => x.id === id);
  if (!o) throw new Error(`no org ${id}`);
  return o;
}

/** Finance is always open; each later org opens once you are promoted in the one before
 *  (a promotion from before orgs existed counts as Finance). An org you were already promoted
 *  in stays open even if new orgs are later inserted before it. */
export function orgUnlocked(id: string, p: Progress): boolean {
  const i = ORGS.findIndex((o) => o.id === id);
  if (i < 0) return false;
  if (i === 0) return true;
  const done = p.orgsPromoted ?? [];
  if (done.includes(id)) return true;
  const prev = ORGS[i - 1]!.id;
  return done.includes(prev) || (prev === 'finance' && (p.promotions ?? 0) > 0);
}

/**
 * Career stakes (Balatro's post-win difficulty tiers): promoting at stake N
 * unlocks N+1. Each stake is a set of seniority levers applied to EVERY rung on
 * top of the rung's own, cumulative by construction. Measured in
 * sim/src/stakebars.ts against pre-registered bars before shipping.
 */
export interface Stake {
  readonly name: string;
  readonly blurb: string;
  readonly oppEdge: number;
  readonly oppHomeBoost: number;
}

export const STAKES: readonly Stake[] = [
  { name: 'Standard', blurb: 'The org chart as it is.', oppEdge: 0, oppHomeBoost: 0 },
  { name: 'Budget freeze', blurb: 'Every opponent starts with a $$ home cell.', oppEdge: 0, oppHomeBoost: 1 },
  { name: 'Restructuring', blurb: 'Opponents draw +1 card a quarter.', oppEdge: 1, oppHomeBoost: 0 },
  { name: 'Hostile board', blurb: 'Opponents draw +1 card a quarter and start with a $$ home cell.', oppEdge: 1, oppHomeBoost: 1 },
];

export const OFFER_SIZE = 3;
/** Your desk holds this many jokers; with a full desk the closet stays shut. With
 *  6 jokers a career could otherwise draft a 5th before the CEO, which made the CEO
 *  easier than the VP (runbars L1: 78.2% vs 65.8%); the ladder was tuned at 4. */
export const MAX_JOKERS = 4;

/** 'chart' = on the org chart before the next meeting; 'draft' = in the supply
 *  closet; 'meeting' = playing; 'won' / 'lost' = the career is over. */
export type RunStatus = 'chart' | 'draft' | 'meeting' | 'won' | 'lost';

export interface RunState {
  readonly seed: number;
  /** Which org this career climbs (ORGS id). */
  readonly org: string;
  /** 1-based index into STAKES. */
  readonly stake: number;
  /** Index into MEETINGS of the current (or next) rung. */
  readonly meeting: number;
  readonly jokers: readonly string[];
  /** The VP's boss, drawn at the start and shown on the org chart. */
  readonly boss: string;
  /** Jokers on offer for the next draft (prepared on the chart). */
  readonly offer: readonly string[];
  readonly status: RunStatus;
  readonly rngState: RngState;
}

function draft(rng: RngState, owned: readonly string[]): [RngState, string[]] {
  const pool = Object.keys(JOKERS).filter((j) => !owned.includes(j));
  const [next, order] = shuffle(rng, pool);
  return [next, owned.length >= MAX_JOKERS ? [] : order.slice(0, OFFER_SIZE)];
}

/** The joker a first career starts with instead of a closet. Measured in
 *  sim/src/firstcareer.ts: with NO joker the Intern fell to 69.8% (bar 75%) and
 *  promotion to 6.8% (bar 10%); Coffee Mug keeps 84.1% / 15.8% and is the easiest
 *  joker to read. */
export const STARTER_JOKER = 'mug';

/** `firstCareer`: a brand-new player's first career walks from the org chart
 *  straight into the Intern with a Coffee Mug — no closet of jokers they cannot
 *  read yet. The closet first opens after beating the Intern. */
export function newRun(seed: number, stake = 1, opts: { firstCareer?: boolean; org?: string } = {}): RunState {
  if (stake < 1 || stake > STAKES.length) throw new Error(`no stake ${stake}`);
  const org = orgOf(opts.org ?? 'finance');
  let rng: RngState = (seed ^ 0x9e3779b9) >>> 0;
  let b: number;
  [rng, b] = nextInt(rng, org.bosses.length);
  let offer: string[];
  // Drawn even when discarded, so a seed's boss and later offers stay the same.
  [rng, offer] = draft(rng, []);
  if (opts.firstCareer) offer = [];
  const jokers = opts.firstCareer ? [STARTER_JOKER] : [];
  return { seed, org: org.id, stake, meeting: 0, jokers, boss: org.bosses[b]!, offer, status: 'chart', rngState: rng };
}

/** Leave the org chart: to the supply closet, or straight to the meeting when
 *  nothing is left to offer. */
export function leaveChart(run: RunState): RunState {
  if (run.status !== 'chart') throw new Error('not on the org chart');
  return { ...run, status: run.offer.length > 0 ? 'draft' : 'meeting' };
}

export function pickJoker(run: RunState, id: string): RunState {
  if (run.status !== 'draft' || !run.offer.includes(id)) throw new Error(`cannot pick ${id} now`);
  return { ...run, jokers: [...run.jokers, id], offer: [], status: 'meeting' };
}

/** Skip the draft (the player declines everything on offer). */
export function skipDraft(run: RunState): RunState {
  if (run.status !== 'draft') throw new Error('not drafting');
  return { ...run, offer: [], status: 'meeting' };
}

export function finishMeeting(run: RunState, won: boolean): RunState {
  if (run.status !== 'meeting') throw new Error('no meeting in progress');
  if (!won) return { ...run, status: 'lost' };
  if (run.meeting >= ladder(run).length - 1) return { ...run, status: 'won' };
  const [rng, offer] = draft(run.rngState, run.jokers);
  return { ...run, meeting: run.meeting + 1, offer, status: 'chart', rngState: rng };
}

/** The rungs of this career's org (a run saved before orgs existed is Finance). */
export function ladder(run: RunState): readonly Meeting[] {
  return orgOf(run.org ?? 'finance').meetings;
}

export function currentMeeting(run: RunState): Meeting {
  return ladder(run)[run.meeting]!;
}

/** The deck this career's opponents play. */
export function meetingDeck(run: RunState): readonly string[] {
  return orgOf(run.org ?? 'finance').opponentDeck;
}

/** The boss rule a rung brings in this career, or null. */
export function bossFor(run: RunState, rung: number): string | null {
  const b = ladder(run)[rung]!.boss;
  return b === null ? null : b === 'drawn' ? run.boss : b;
}

export function meetingMods(run: RunState): Mods {
  const m = currentMeeting(run);
  const s = STAKES[run.stake - 1]!;
  return {
    jokers: run.jokers,
    boss: bossFor(run, run.meeting),
    oppEdge: m.edge + s.oppEdge,
    oppHomeBoost: Math.min(3, m.homeBoost + s.oppHomeBoost),
  };
}

/** A distinct, reproducible deal for each meeting of a career. */
export function meetingSeed(run: RunState): number {
  return (Math.imul(run.seed, 31) + run.meeting * 7919 + 1) >>> 0;
}
