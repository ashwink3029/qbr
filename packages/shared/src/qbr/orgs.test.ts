import { describe, expect, it } from 'vitest';
import { CARDS, STARTER_DECK } from './cards.js';
import { BOSSES } from './mods.js';
import { ORGS, orgOf, orgUnlocked } from './orgs.js';
import { DRAWABLE_BOSSES, MEETINGS, bossFor, currentMeeting, finishMeeting, leaveChart, meetingDeck, newRun, pickJoker } from './run.js';

// Orgs (backlog item 15, user request 2026-09-27): like Balatro's decks, you choose which
// org to climb — Finance first, then Tech, then HR — most locked from day one. Each org
// is its own cast, its own VP boss pool and top boss, and its own opponent deck.

describe('the orgs', () => {
  it('Finance, then Tech, then HR; each a 5-rung ladder with its own cast', () => {
    expect(ORGS.map((o) => o.id)).toEqual(['finance', 'tech', 'hr']);
    const roles = new Set<string>();
    for (const o of ORGS) {
      expect(o.meetings).toHaveLength(5);
      expect(o.meetings.map((m) => m.opponent)).toEqual(['rookie', 'greedy', 'lookahead', 'lookahead', 'lookahead']);
      for (const m of o.meetings) {
        expect(roles.has(m.role)).toBe(false); // a new character on every rung of every org
        roles.add(m.role);
      }
    }
  });

  it('Finance is today\'s ladder (the third rung renamed so it no longer clashes with the org)', () => {
    const f = orgOf('finance');
    expect(f.meetings).toBe(MEETINGS);
    expect(MEETINGS.map((m) => m.role)).toEqual(['The Intern', 'The Manager', 'The Controller', 'The VP', 'The CEO']);
    expect(f.opponentDeck).toBe(STARTER_DECK);
    expect(f.bosses).toEqual(DRAWABLE_BOSSES);
  });

  it('every org deck is 15 real cards, and every boss is real and not both drawable and fixed', () => {
    for (const o of ORGS) {
      expect(o.opponentDeck).toHaveLength(15);
      for (const id of o.opponentDeck) expect(CARDS[id], `${o.id}: ${id}`).toBeDefined();
      const fixed = o.meetings.map((m) => m.boss).filter((b): b is string => b !== null && b !== 'drawn');
      for (const b of [...o.bosses, ...fixed]) expect(BOSSES[b], `${o.id}: ${b}`).toBeDefined();
      for (const b of o.bosses) expect(fixed).not.toContain(b);
      expect(o.bosses.length).toBeGreaterThan(0);
    }
  });

  it('opens one after another: Finance always, Tech once promoted in Finance, HR once promoted in Tech', () => {
    const fresh = { bestRung: 0, careers: 0 };
    expect(ORGS.map((o) => orgUnlocked(o.id, fresh))).toEqual([true, false, false]);
    expect(ORGS.map((o) => orgUnlocked(o.id, { ...fresh, orgsPromoted: ['finance'] }))).toEqual([true, true, false]);
    expect(ORGS.map((o) => orgUnlocked(o.id, { ...fresh, orgsPromoted: ['finance', 'tech'] }))).toEqual([true, true, true]);
    // A player promoted before orgs existed has already cleared Finance.
    expect(orgUnlocked('tech', { ...fresh, promotions: 1 })).toBe(true);
  });
});

describe('a career in an org', () => {
  it('a Finance career deals exactly what it did before orgs (same boss and offers per seed)', () => {
    for (const seed of [1, 7, 42, 999]) {
      const r = newRun(seed);
      expect(r.org).toBe('finance');
      expect(newRun(seed, 1, { org: 'finance' })).toEqual(r);
    }
  });

  it('a Tech career meets the Tech cast, draws its VP boss from the Tech pool, and faces the Tech deck', () => {
    for (const seed of [1, 2, 3, 4, 5, 6]) {
      let r = newRun(seed, 1, { org: 'tech' });
      expect(orgOf('tech').bosses).toContain(r.boss);
      expect(currentMeeting(r).role).toBe(orgOf('tech').meetings[0]!.role);
      expect(meetingDeck(r)).toBe(orgOf('tech').opponentDeck);
      // Walk to the top rung: its fixed boss is Tech's.
      for (let i = 0; i < 4; i++) {
        r = leaveChart(r);
        if (r.status === 'draft') r = pickJoker(r, r.offer[0]!);
        r = finishMeeting(r, true);
      }
      expect(currentMeeting(r).role).toBe(orgOf('tech').meetings[4]!.role);
      expect(bossFor(r, 4)).toBe(orgOf('tech').meetings[4]!.boss);
    }
  });

  it('an unknown org is refused', () => {
    expect(() => newRun(1, 1, { org: 'legal' })).toThrow();
  });
});
