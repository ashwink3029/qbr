import { describe, expect, it } from 'vitest';
import { BOSSES, JOKERS } from './mods.js';
import {
  DRAWABLE_BOSSES,
  MEETINGS,
  STAKES,
  STARTER_JOKER,
  bossFor,
  currentMeeting,
  finishMeeting,
  leaveChart,
  meetingMods,
  newRun,
  pickJoker,
  skipDraft,
  type RunState,
} from './run.js';

/** Chart -> draft (pick the first offer, if any) -> meeting. */
function toMeeting(r: RunState): RunState {
  let s = leaveChart(r);
  if (s.status === 'draft') s = pickJoker(s, s.offer[0]!);
  return s;
}

describe('career ladder', () => {
  it('climbs Intern -> Manager -> Finance -> VP -> CEO', () => {
    expect(MEETINGS.map((m) => m.role)).toEqual(['The Intern', 'The Manager', 'Finance', 'The VP', 'The CEO']);
    expect(MEETINGS.map((m) => m.opponent)).toEqual(['rookie', 'greedy', 'lookahead', 'lookahead', 'lookahead']);
  });

  it('starts on the org chart with the VP’s boss already drawn, and a draft ready', () => {
    const r = newRun(1);
    expect(r.status).toBe('chart');
    expect(currentMeeting(r).role).toBe('The Intern');
    expect(DRAWABLE_BOSSES).toContain(r.boss);
    expect(DRAWABLE_BOSSES).not.toContain('replyall'); // the CEO's, fixed
    expect(r.offer).toHaveLength(3);
    expect(leaveChart(r).status).toBe('draft');
  });

  it('a first career skips the closet before the Intern, starting with a Coffee Mug; the closet opens after the first win', () => {
    const r = newRun(1, 1, { firstCareer: true });
    expect(r.status).toBe('chart');
    expect(r.offer).toEqual([]);
    expect(r.jokers).toEqual([STARTER_JOKER]);
    expect(STARTER_JOKER).toBe('mug');
    const m = leaveChart(r);
    expect(m.status).toBe('meeting'); // chart -> Intern, no draft
    const next = finishMeeting(m, true);
    expect(next.offer).toHaveLength(3); // the closet is the reward for beating the Intern
    expect(next.offer).not.toContain('mug');
    expect(leaveChart(next).status).toBe('draft');
    // Same VP boss as an ordinary career from the same seed.
    expect(r.boss).toBe(newRun(1).boss);
  });

  it('bosses appear only at the VP (drawn) and the CEO (Reply-All)', () => {
    const r = newRun(3);
    expect([0, 1, 2].map((i) => bossFor(r, i))).toEqual([null, null, null]);
    expect(bossFor(r, 3)).toBe(r.boss);
    expect(bossFor(r, 4)).toBe('replyall');
  });

  it('every win returns to the org chart one rung up; beating the CEO is promotion', () => {
    let r = newRun(7);
    for (let m = 0; m < MEETINGS.length; m++) {
      expect(r.status).toBe('chart');
      expect(r.meeting).toBe(m);
      r = toMeeting(r);
      expect(r.status).toBe('meeting');
      for (const o of r.offer) expect(r.jokers).not.toContain(o);
      expect(meetingMods(r).boss).toBe(bossFor(r, m));
      r = finishMeeting(r, true);
    }
    expect(r.status).toBe('won');
    expect(new Set(r.jokers).size).toBe(r.jokers.length);
    expect(r.jokers.length).toBeLessThanOrEqual(Object.keys(JOKERS).length);
  });

  it('with every joker owned, the chart goes straight to the meeting', () => {
    let r = newRun(9);
    for (let m = 0; m < MEETINGS.length - 1; m++) r = finishMeeting(toMeeting(r), true);
    // 4 jokers, 5 rungs: by the CEO nothing is left to offer.
    expect(r.offer).toHaveLength(0);
    expect(leaveChart(r).status).toBe('meeting');
  });

  it('losing ends the career at that rung', () => {
    const beatIntern = finishMeeting(toMeeting(newRun(3)), true);
    const r = finishMeeting(toMeeting(beatIntern), false);
    expect(r.status).toBe('lost');
    expect(currentMeeting(r).role).toBe('The Manager');
    expect(() => finishMeeting(r, true)).toThrow();
  });

  it('rejects out-of-order moves and picks that are not on offer', () => {
    const r = newRun(4);
    expect(() => pickJoker(r, r.offer[0]!)).toThrow(); // still on the chart
    const d = leaveChart(r);
    const notOffered = Object.keys(JOKERS).find((j) => !d.offer.includes(j))!;
    expect(() => pickJoker(d, notOffered)).toThrow();
    expect(skipDraft(d).status).toBe('meeting');
  });

  it('a stake adds its seniority levers to every rung, on top of the rung’s own', () => {
    for (const [i, s] of STAKES.entries()) {
      const r = leaveChart(newRun(5, i + 1));
      const m = meetingMods(r.status === 'draft' ? pickJoker(r, r.offer[0]!) : r);
      expect(m.oppEdge).toBe(MEETINGS[0]!.edge + s.oppEdge);
      expect(m.oppHomeBoost).toBe(Math.min(3, MEETINGS[0]!.homeBoost + s.oppHomeBoost));
    }
    expect(newRun(5).stake).toBe(1);
    expect(() => newRun(5, STAKES.length + 1)).toThrow();
  });

  it('is deterministic per seed and draws every drawable boss across seeds', () => {
    expect(newRun(11)).toEqual(newRun(11));
    const drawn = new Set(Array.from({ length: 40 }, (_, s) => newRun(s).boss));
    expect([...drawn].sort()).toEqual([...DRAWABLE_BOSSES].sort());
    expect(Object.keys(BOSSES)).toEqual(expect.arrayContaining([...drawn]));
  });
});
