import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { EMPTY_RECORD, loadRecord, recordDailyEnd, recordDailyStart, saveRecord } from './record.js';
import { App } from './App.js';

afterEach(cleanup);
beforeEach(() => localStorage.clear());

const q = (sel: string) => document.querySelector<HTMLElement>(sel);

describe('daily record: one attempt a day, a streak for consecutive days', () => {
  it('starting marks today attempted; consecutive days extend the streak, a gap resets it', () => {
    let r = recordDailyStart(EMPTY_RECORD, '2026-10-01');
    expect(r.daily).toEqual({ day: '2026-10-01', beaten: null, promoted: false, streak: 1 });
    r = recordDailyEnd(r, '2026-10-01', 2, false);
    expect(r.daily).toEqual({ day: '2026-10-01', beaten: 2, promoted: false, streak: 1 });
    r = recordDailyStart(r, '2026-10-02');
    expect(r.daily!.streak).toBe(2);
    r = recordDailyStart(r, '2026-10-05');
    expect(r.daily!.streak).toBe(1);
    // Month boundaries count as consecutive.
    expect(recordDailyStart(recordDailyStart(EMPTY_RECORD, '2026-10-31'), '2026-11-01').daily!.streak).toBe(2);
  });

  it('survives a save / load round trip, and a missing daily loads as none', () => {
    saveRecord(recordDailyEnd(recordDailyStart(EMPTY_RECORD, '2026-10-01'), '2026-10-01', 5, true));
    expect(loadRecord().daily).toEqual({ day: '2026-10-01', beaten: 5, promoted: true, streak: 1 });
    localStorage.setItem('qbr.record.v1', JSON.stringify({ runs: 1 }));
    expect(loadRecord().daily).toBeNull();
  });
});

describe('Home -> Daily career', () => {
  it('is not offered before the first career', () => {
    render(<App seed={5} today="2026-10-01" />);
    expect(q('[data-daily]')).toBeNull();
  });

  it('starts today’s career: Budget freeze, starter deck, marked attempted', () => {
    localStorage.setItem('qbr.record.v1', JSON.stringify({ runs: 3, bestMeetings: 5, promotions: 1, stakeCleared: 1 }));
    render(<App seed={5} today="2026-10-01" />);
    expect(q('[data-daily]')!.textContent).toMatch(/Daily career/);
    fireEvent.click(q('[data-daily]')!);
    expect(q('[data-chart]')).toBeTruthy();
    expect(document.querySelector('.titlebar')!.textContent).toMatch(/Daily · Budget freeze/);
    expect(loadRecord().daily).toMatchObject({ day: '2026-10-01', beaten: null });
    // One attempt: back on Home, today's daily can be resumed but not restarted.
    fireEvent.click(q('[data-exit]')!);
    expect(q('[data-daily]')).toBeNull();
    // The Resume button says it, so no separate status line (it cost an iPhone SE 38px).
    expect(q('[data-resume]')!.textContent).toBe('Resume today’s career');
    expect(q('[data-daily-status]')).toBeNull();
    // Walking away into something else forfeits it: still no second try today.
    fireEvent.click(q('[data-start]')!);
    fireEvent.click(q('[data-exit]')!);
    expect(q('[data-daily]')).toBeNull();
    expect(q('[data-daily-status]')).toBeNull(); // a year is resumable: no room for the status
    fireEvent.click(q('[data-resume]')!);
    // A relaunch the same day (the session is gone): the status reads walked out.
    cleanup();
    render(<App seed={5} today="2026-10-01" />);
    expect(q('[data-daily-status]')!.textContent).toMatch(/Today’s career: walked out/);
  });

  it('once today’s career is done, Home shows how far you got and the streak', () => {
    localStorage.setItem(
      'qbr.record.v1',
      JSON.stringify({ runs: 3, bestMeetings: 5, daily: { day: '2026-10-01', beaten: 2, promoted: false, streak: 4 } }),
    );
    render(<App seed={5} today="2026-10-01" />);
    expect(q('[data-daily]')).toBeNull();
    expect(q('[data-daily-status]')!.textContent).toMatch(/Today’s career: beat the Manager · streak 4/);
  });

  it('a new day offers a new daily, and shows the running streak', () => {
    localStorage.setItem(
      'qbr.record.v1',
      JSON.stringify({ runs: 3, bestMeetings: 5, daily: { day: '2026-10-01', beaten: 5, promoted: true, streak: 4 } }),
    );
    render(<App seed={5} today="2026-10-02" />);
    expect(q('[data-daily]')!.textContent).toMatch(/Daily career · streak 4/);
  });
});
