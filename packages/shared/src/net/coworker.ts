// "Play your coworker": two phones, one match, no server. A PURE reducer, so the
// part that can be wrong is testable without a transport (Multipeer needs two
// physical iPhones) — the same reasoning as Cubes' pairing reducer, which the
// consent half below is ported from.
//
// LOCKSTEP, not host-authoritative: QBR's match reducer is pure and seeded, so both
// phones hold the SAME real match and exchange only actions. Each `act` carries the
// sender's move number and a hash of the match after it; the receiver checks the
// move is the sender's turn, legal and in sequence, applies it, and compares hashes —
// a divergence is reported as `desync`, never silently played through.
//
// Flow once both players have agreed (pairing phase 'joined'):
//   both   -> hello {v, token, name, deck}      each brings their own deck
//   host   -> start {seed}                      host = the larger token, seat 0
//   either -> act {n, action, hash}             in turn order, both sides apply
import { CARDS } from '../qbr/cards.js';
import { legalPlays, type Action, type Player } from '../qbr/game.js';
import { DEFAULT_MATCH, MATCH_RULES, matchReducer, newMatch, type MatchState } from '../qbr/match.js';

export const PROTOCOL = 1;

export type CoworkerMessage =
  | { t: 'join-req'; name: string }
  | { t: 'join-ok' }
  | { t: 'join-no' }
  | { t: 'hello'; v: number; token: number; name: string; deck: readonly string[] }
  | { t: 'start'; seed: number }
  | { t: 'act'; n: number; action: Action; hash: number };

// ── Consent (ported from Cubes' pairingReducer) ────────────────────────────
export type PairPhase = 'idle' | 'found' | 'asking' | 'invited' | 'declined' | 'joined';
export interface PairState {
  readonly phase: PairPhase;
  readonly iAsked: boolean;
  readonly theyAsked: boolean;
  readonly friendName?: string | undefined;
}
export const initialPairState: PairState = { phase: 'idle', iAsked: false, theyAsked: false };
export type PairEvent =
  | { t: 'connected' }
  | { t: 'disconnected' }
  | { t: 'tap-play'; name: string }
  | { t: 'tap-accept' }
  | { t: 'tap-decline' }
  | { t: 'tap-dismiss' }
  | { t: 'ask-timeout' }
  | { t: 'linger-done' }
  | { t: 'recv'; msg: CoworkerMessage };
export interface PairResult {
  readonly state: PairState;
  readonly send: CoworkerMessage[];
  /** Drop the connection (a decline must not re-offer). */
  readonly teardown: boolean;
}
const pr = (state: PairState, send: CoworkerMessage[] = [], teardown = false): PairResult => ({ state, send, teardown });

export function pairingReducer(s: PairState, e: PairEvent): PairResult {
  switch (e.t) {
    case 'connected':
      return pr({ ...initialPairState, phase: 'found' }); // a coworker is near: offer, don't impose
    case 'disconnected':
      return pr(initialPairState);
    case 'tap-play':
      // If they already asked, my tap IS the acceptance.
      if (s.theyAsked) return pr({ ...s, iAsked: true, phase: 'joined' }, [{ t: 'join-ok' }]);
      return pr({ ...s, iAsked: true, phase: 'asking' }, [{ t: 'join-req', name: e.name }]);
    case 'tap-accept':
      return s.theyAsked ? pr({ ...s, iAsked: true, phase: 'joined' }, [{ t: 'join-ok' }]) : pr(s);
    case 'tap-decline':
      return pr(initialPairState, [{ t: 'join-no' }], true);
    case 'tap-dismiss':
      return pr(initialPairState, [], true);
    case 'ask-timeout':
      return s.phase === 'asking' ? pr({ ...s, iAsked: false, phase: 'found' }) : pr(s);
    case 'linger-done':
      return s.phase === 'declined' ? pr(initialPairState, [], true) : pr(s);
    case 'recv':
      switch (e.msg.t) {
        case 'join-req': {
          const next = { ...s, theyAsked: true, friendName: e.msg.name || undefined };
          // Both tapped at once: answering makes the race benign, not a deadlock.
          if (s.iAsked) return pr({ ...next, phase: 'joined' }, [{ t: 'join-ok' }]);
          return pr({ ...next, phase: 'invited' });
        }
        case 'join-ok':
          // Only meaningful if I asked — a stray OK must not drag me into a match.
          return s.iAsked ? pr({ ...s, phase: 'joined' }) : pr(s);
        case 'join-no':
          return pr({ ...s, iAsked: false, theyAsked: false, phase: 'declined' });
        default:
          return pr(s);
      }
  }
}

// ── The match, in lockstep ────────────────────────────────────────────────
export type MatchPhase = 'hello' | 'playing' | 'over' | 'desync' | 'error';

export interface CoworkerState {
  readonly phase: MatchPhase;
  readonly me: { readonly token: number; readonly name: string; readonly deck: readonly string[] };
  readonly peer: { readonly token: number; readonly name: string; readonly deck: readonly string[] } | null;
  /** My seat once elected: the larger token hosts and is seat 0. */
  readonly seat: Player | null;
  readonly match: MatchState | null;
  /** Moves applied so far (both players'), i.e. the next move's number. */
  readonly n: number;
  readonly error?: string;
}

export type CoworkerEvent =
  | { t: 'recv'; msg: CoworkerMessage }
  /** The local player's move (from the UI, already in REAL seat terms). */
  | { t: 'local'; action: Action }
  /** Host only: the seed to deal with (random at the call site, so this stays pure). */
  | { t: 'seed'; seed: number };

export interface CoworkerResult {
  readonly state: CoworkerState;
  readonly send: CoworkerMessage[];
}

/** A stable 32-bit hash of the match (FNV-1a over its JSON). */
export function matchHash(m: MatchState): number {
  const s = JSON.stringify(m);
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193);
  return h >>> 0;
}

/** A deck a coworker may bring: 15 known cards. */
export function validDeck(deck: unknown): deck is string[] {
  return Array.isArray(deck) && deck.length === 15 && deck.every((c) => typeof c === 'string' && c in CARDS);
}

/** Start: I have agreed to play (pairing 'joined'); announce myself and my deck. */
export function coworkerStart(token: number, name: string, deck: readonly string[]): CoworkerResult {
  const state: CoworkerState = { phase: 'hello', me: { token, name, deck }, peer: null, seat: null, match: null, n: 0 };
  return { state, send: [{ t: 'hello', v: PROTOCOL, token, name, deck }] };
}

const fail = (s: CoworkerState, error: string, phase: MatchPhase = 'error'): CoworkerResult => ({
  state: { ...s, phase, error },
  send: [],
});

function begin(s: CoworkerState, seed: number): CoworkerState {
  const host = s.seat === 0 ? s.me : s.peer!;
  const guest = s.seat === 0 ? s.peer! : s.me;
  const match = newMatch(seed, { player: host.deck, opponent: guest.deck }, DEFAULT_MATCH, MATCH_RULES);
  return { ...s, phase: 'playing', match, n: 0 };
}

function isLegal(m: MatchState, a: Action): boolean {
  if (a.type === 'pass') return true;
  return legalPlays(m.quarter).some((p) => p.card === a.card && p.cell === a.cell);
}

export function coworkerReducer(s: CoworkerState, e: CoworkerEvent): CoworkerResult {
  if (s.phase === 'error' || s.phase === 'desync') return { state: s, send: [] };

  if (e.t === 'seed') {
    if (s.seat !== 0 || s.phase !== 'hello' || !s.peer) return { state: s, send: [] };
    return { state: begin(s, e.seed), send: [{ t: 'start', seed: e.seed }] };
  }

  if (e.t === 'local') {
    const m = s.match;
    if (s.phase !== 'playing' || !m || m.over) return { state: s, send: [] };
    if (m.quarter.toMove !== s.seat || !isLegal(m, e.action)) return { state: s, send: [] };
    const next = matchReducer(m, e.action);
    return {
      state: { ...s, match: next, n: s.n + 1, phase: next.over ? 'over' : 'playing' },
      send: [{ t: 'act', n: s.n, action: e.action, hash: matchHash(next) }],
    };
  }

  const msg = e.msg;
  switch (msg.t) {
    case 'hello': {
      if (s.phase !== 'hello' || s.peer) return { state: s, send: [] };
      if (msg.v !== PROTOCOL) return fail(s, `coworker has a different version (${msg.v} vs ${PROTOCOL})`);
      if (!validDeck(msg.deck)) return fail(s, 'coworker sent an invalid deck');
      if (msg.token === s.me.token) return fail(s, 'token collision — start again');
      const seat: Player = s.me.token > msg.token ? 0 : 1;
      return { state: { ...s, peer: { token: msg.token, name: msg.name, deck: msg.deck }, seat }, send: [] };
    }
    case 'start': {
      if (s.phase !== 'hello' || s.seat !== 1 || !s.peer) return { state: s, send: [] };
      return { state: begin(s, msg.seed), send: [] };
    }
    case 'act': {
      const m = s.match;
      if (s.phase !== 'playing' || !m) return { state: s, send: [] };
      const them: Player = s.seat === 0 ? 1 : 0;
      if (msg.n !== s.n) return fail(s, `move ${msg.n} arrived, expected ${s.n}`, 'desync');
      if (m.quarter.toMove !== them) return fail(s, 'coworker moved out of turn', 'desync');
      if (!isLegal(m, msg.action)) return fail(s, 'coworker sent an illegal move', 'desync');
      const next = matchReducer(m, msg.action);
      if (matchHash(next) !== msg.hash) return fail(s, 'boards no longer match', 'desync');
      return { state: { ...s, match: next, n: s.n + 1, phase: next.over ? 'over' : 'playing' }, send: [] };
    }
    default:
      return { state: s, send: [] }; // pairing messages are the pairing reducer's
  }
}
