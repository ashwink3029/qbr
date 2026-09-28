import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { orgOf } from '@qbr/shared';
import { App } from './App.js';
import { EMPTY_RECORD, progressOf, recordRun } from './record.js';

// Orgs (item 15, user request): the app should feel expansive to a new player — choose
// which org to climb, most of them visibly locked from day one.

const q = (s: string) => document.querySelector<HTMLElement>(s);
const all = (s: string) => Array.from(document.querySelectorAll<HTMLElement>(s));

describe('the org picker on Home', () => {
  beforeEach(() => localStorage.clear());
  afterEach(cleanup);

  it('shows from day one: Finance open, Tech and HR locked with how to open them', () => {
    render(<App seed={5} />);
    expect(q('[data-org-picker]')!.textContent).toMatch(/Finance/);
    expect((q('[data-start-run]') as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(q('[data-org-next]')!);
    expect(q('[data-org-picker]')!.textContent).toMatch(/Tech/);
    expect(q('[data-org-picker]')!.textContent).toMatch(/promoted in Finance/i);
    expect(q('[data-org-locked]')).toBeTruthy();
    expect((q('[data-start-run]') as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(q('[data-org-next]')!);
    expect(q('[data-org-picker]')!.textContent).toMatch(/HR/);
    expect(q('[data-org-picker]')!.textContent).toMatch(/promoted in Tech/i);
  });

  it('once promoted in Finance, a Tech career climbs the Tech cast', () => {
    localStorage.setItem('qbr.record.v1', JSON.stringify({ runs: 3, promotions: 1, bestMeetings: 5, meetings: 12, orgsPromoted: ['finance'] }));
    render(<App seed={5} />);
    fireEvent.click(q('[data-org-next]')!);
    expect(q('[data-org-locked]')).toBeNull();
    fireEvent.click(q('[data-start-run]')!);
    const chart = q('[data-orgchart]')!.textContent!;
    for (const m of orgOf('tech').meetings) expect(chart).toContain(m.role);
    expect(chart).not.toContain('The Intern');
  });
});

describe('the record remembers which orgs you were promoted in', () => {
  it('a promotion adds its org (once); a loss does not', () => {
    const lost = recordRun(EMPTY_RECORD, false, 3, 1, 'tech');
    expect(lost.orgsPromoted).toEqual([]);
    const won = recordRun(EMPTY_RECORD, true, 5, 1, 'finance');
    expect(won.orgsPromoted).toEqual(['finance']);
    expect(recordRun(won, true, 5, 1, 'finance').orgsPromoted).toEqual(['finance']);
    expect(progressOf(recordRun(won, true, 5, 1, 'tech')).orgsPromoted).toEqual(['finance', 'tech']);
    expect(all('[data-never]')).toHaveLength(0);
  });
});
