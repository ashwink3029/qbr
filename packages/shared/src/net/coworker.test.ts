import { describe, expect, it } from 'vitest';
import { STARTER_DECK, deckWith } from '../qbr/cards.js';
import { greedyPolicy, lookaheadPolicy } from '../qbr/policies.js';
import { smartPass, type MatchPolicy } from '../qbr/match.js';
import type { RngState } from '../qbr/rng.js';
import {
  coworkerReducer,
  coworkerStart,
  initialPairState,
  matchHash,
  pairingReducer,
  type CoworkerMessage,
  type CoworkerState,
} from './coworker.js';

describe('pairing (consent before a match)', () => {
  it('a coworker in range is only an offer; my tap asks; their OK joins', () => {
    let r = pairingReducer(initialPairState, { t: 'connected' });
    expect(r.state.phase).toBe('found');
    r = pairingReducer(r.state, { t: 'tap-play', name: 'Ada' });
    expect(r.state.phase).toBe('asking');
    expect(r.send).toEqual([{ t: 'join-req', name: 'Ada' }]);
    r = pairingReducer(r.state, { t: 'recv', msg: { t: 'join-ok' } });
    expect(r.state.phase).toBe('joined');
  });

  it('both tapping at once joins both, instead of deadlocking', () => {
    const a = pairingReducer(pairingReducer(initialPairState, { t: 'connected' }).state, { t: 'tap-play', name: 'A' });
    const b = pairingReducer(pairingReducer(initialPairState, { t: 'connected' }).state, { t: 'tap-play', name: 'B' });
    const a2 = pairingReducer(a.state, { t: 'recv', msg: b.send[0]! });
    const b2 = pairingReducer(b.state, { t: 'recv', msg: a.send[0]! });
    expect([a2.state.phase, b2.state.phase]).toEqual(['joined', 'joined']);
  });

  it('a stray OK never drags me into a match; a decline tears down', () => {
    const found = pairingReducer(initialPairState, { t: 'connected' }).state;
    expect(pairingReducer(found, { t: 'recv', msg: { t: 'join-ok' } }).state.phase).toBe('found');
    const invited = pairingReducer(found, { t: 'recv', msg: { t: 'join-req', name: 'Bo' } }).state;
    expect(invited).toMatchObject({ phase: 'invited', friendName: 'Bo' });
    const no = pairingReducer(invited, { t: 'tap-decline' });
    expect(no.send).toEqual([{ t: 'join-no' }]);
    expect(no.teardown).toBe(true);
  });
});

/** Two phones over an in-memory FIFO link. Each side's AI plays its OWN seat. */
function loopback(seed: number, policies: [MatchPolicy, MatchPolicy]) {
  const hostDeck = deckWith(['coffeerun', 'pip', 'teambuilding']);
  const guestDeck = deckWith(['parachute', 'gossip']);
  let a = coworkerStart(900 + seed, 'Host', hostDeck); // larger token: host
  let b = coworkerStart(100 + seed, 'Guest', guestDeck);
  const wire: { to: 'a' | 'b'; msg: CoworkerMessage }[] = [
    ...a.send.map((msg) => ({ to: 'b' as const, msg })),
    ...b.send.map((msg) => ({ to: 'a' as const, msg })),
  ];
  let A: CoworkerState = a.state;
  let B: CoworkerState = b.state;
  const flush = () => {
    while (wire.length) {
      const { to, msg } = wire.shift()!;
      if (to === 'a') {
        const r = coworkerReducer(A, { t: 'recv', msg });
        A = r.state;
        wire.push(...r.send.map((m) => ({ to: 'b' as const, msg: m })));
      } else {
        const r = coworkerReducer(B, { t: 'recv', msg });
        B = r.state;
        wire.push(...r.send.map((m) => ({ to: 'a' as const, msg: m })));
      }
    }
  };
  flush();
  expect([A.seat, B.seat]).toEqual([0, 1]);
  const s = coworkerReducer(A, { t: 'seed', seed });
  A = s.state;
  wire.push(...s.send.map((m) => ({ to: 'b' as const, msg: m })));
  flush();
  let rng: RngState = (seed * 2654435761) >>> 0;
  let steps = 0;
  while (A.phase === 'playing') {
    expect(B.phase).toBe('playing');
    expect(matchHash(B.match!)).toBe(matchHash(A.match!)); // identical after every move
    const mover = A.match!.quarter.toMove; // seat 0 = A, seat 1 = B
    const local = mover === 0 ? A : B;
    let action;
    [rng, action] = policies[mover](local.match!, rng);
    const r = coworkerReducer(local, { t: 'local', action });
    if (mover === 0) A = r.state;
    else B = r.state;
    wire.push(...r.send.map((m) => ({ to: (mover === 0 ? 'b' : 'a') as 'a' | 'b', msg: m })));
    flush();
    steps++;
  }
  return { A, B, steps, hostDeck, guestDeck };
}

describe('lockstep over a loopback link', () => {
  it('the larger token hosts; each side plays its own deck; boards stay identical to the end', () => {
    let totalSteps = 0;
    const winners = new Set<number | null>();
    for (let seed = 1; seed <= 40; seed++) {
      const { A, B, steps, hostDeck, guestDeck } = loopback(seed, [smartPass(lookaheadPolicy), smartPass(greedyPolicy)]);
      expect(A.phase).toBe('over');
      expect(B.phase).toBe('over');
      expect(matchHash(A.match!)).toBe(matchHash(B.match!));
      expect(A.match!.winner).toBe(B.match!.winner);
      winners.add(A.match!.winner);
      // Each seat drew only from its own deck.
      const seen = (seat: 0 | 1) => [...A.match!.quarter.hands[seat], ...A.match!.quarter.decks[seat]];
      for (const c of seen(0)) expect(hostDeck).toContain(c);
      for (const c of seen(1)) expect(guestDeck).toContain(c);
      totalSteps += steps;
    }
    expect(totalSteps).toBeGreaterThan(400);
    expect(winners.size).toBeGreaterThan(1); // real games, not a scripted result
  });
});

describe('guards', () => {
  function playing(): { host: CoworkerState; guest: CoworkerState } {
    let host = coworkerStart(9, 'H', STARTER_DECK).state;
    let guest = coworkerStart(1, 'G', STARTER_DECK).state;
    host = coworkerReducer(host, { t: 'recv', msg: { t: 'hello', v: 1, token: 1, name: 'G', deck: STARTER_DECK } }).state;
    guest = coworkerReducer(guest, { t: 'recv', msg: { t: 'hello', v: 1, token: 9, name: 'H', deck: STARTER_DECK } }).state;
    const s = coworkerReducer(host, { t: 'seed', seed: 4 });
    host = s.state;
    guest = coworkerReducer(guest, { t: 'recv', msg: s.send[0]! }).state;
    return { host, guest };
  }

  it('rejects a bad deck and a different protocol version', () => {
    const me = coworkerStart(5, 'Me', STARTER_DECK).state;
    expect(coworkerReducer(me, { t: 'recv', msg: { t: 'hello', v: 1, token: 2, name: 'X', deck: ['memo'] } }).state.phase).toBe('error');
    expect(coworkerReducer(me, { t: 'recv', msg: { t: 'hello', v: 99, token: 2, name: 'X', deck: STARTER_DECK } }).state.error).toMatch(/version/);
  });

  it('a move out of turn, out of sequence, illegal, or with a wrong hash is a desync — never played through', () => {
    const { host, guest } = playing();
    const mover = host.match!.quarter.toMove === 0 ? host : guest;
    const waiter = mover === host ? guest : host;
    const r = coworkerReducer(mover, { t: 'local', action: { type: 'pass' } });
    const act = r.send[0] as Extract<CoworkerMessage, { t: 'act' }>;
    expect(coworkerReducer(waiter, { t: 'recv', msg: { ...act, hash: act.hash ^ 1 } }).state.phase).toBe('desync');
    expect(coworkerReducer(waiter, { t: 'recv', msg: { ...act, n: 5 } }).state.phase).toBe('desync');
    expect(coworkerReducer(mover, { t: 'recv', msg: act }).state.phase).toBe('desync'); // "their" move on my turn
    expect(
      coworkerReducer(waiter, { t: 'recv', msg: { ...act, action: { type: 'play', card: 'headcount', cell: 0 } } }).state.phase,
    ).toBe('desync');
    expect(coworkerReducer(waiter, { t: 'recv', msg: act }).state.phase).toBe('playing'); // the honest one applies
  });

  it('the UI cannot move for me out of turn', () => {
    const { host, guest } = playing();
    const waiter = host.match!.quarter.toMove === 0 ? guest : host;
    const r = coworkerReducer(waiter, { t: 'local', action: { type: 'pass' } });
    expect(r.send).toEqual([]);
    expect(r.state).toBe(waiter);
  });
});
