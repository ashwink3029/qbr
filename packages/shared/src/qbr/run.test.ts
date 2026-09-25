import { describe, expect, it } from 'vitest';
import { BOSSES, JOKERS } from './mods.js';
import { MEETINGS, currentMeeting, finishMeeting, meetingMods, newRun, pickJoker, skipDraft } from './run.js';

describe('run', () => {
  it('starts drafting at the Quick sync with a known boss waiting at the review', () => {
    const r = newRun(1);
    expect(r.status).toBe('draft');
    expect(currentMeeting(r).name).toBe('Quick sync');
    expect(r.offer.length).toBe(3);
    expect(new Set(r.offer).size).toBe(3);
    expect(Object.keys(BOSSES)).toContain(r.boss);
    expect(meetingMods(pickJoker(r, r.offer[0]!)).boss).toBeNull();
  });

  it('picks accumulate, never re-offer an owned joker, and the boss appears only at the review', () => {
    let r = newRun(7);
    for (let m = 0; m < MEETINGS.length; m++) {
      if (r.status === 'draft') {
        for (const o of r.offer) expect(r.jokers).not.toContain(o);
        r = pickJoker(r, r.offer[0]!);
      }
      expect(r.status).toBe('meeting');
      expect(meetingMods(r).boss).toBe(MEETINGS[m]!.boss ? r.boss : null);
      r = finishMeeting(r, true);
    }
    expect(r.status).toBe('won');
    expect(r.jokers.length).toBeLessThanOrEqual(Object.keys(JOKERS).length);
  });

  it('losing any meeting ends the run', () => {
    const r = finishMeeting(pickJoker(newRun(3), newRun(3).offer[0]!), false);
    expect(r.status).toBe('lost');
    expect(() => finishMeeting(r, true)).toThrow();
  });

  it('rejects picking a joker that is not on offer, and can skip the draft', () => {
    const r = newRun(4);
    const notOffered = Object.keys(JOKERS).find((j) => !r.offer.includes(j))!;
    expect(() => pickJoker(r, notOffered)).toThrow();
    expect(skipDraft(r).status).toBe('meeting');
  });

  it('is deterministic per seed and varies across seeds', () => {
    expect(newRun(11)).toEqual(newRun(11));
    const bosses = new Set(Array.from({ length: 40 }, (_, s) => newRun(s).boss));
    expect(bosses.size).toBe(Object.keys(BOSSES).length);
  });
});
