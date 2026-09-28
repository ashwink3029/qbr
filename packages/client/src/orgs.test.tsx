import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { orgOf } from '@qbr/shared';
import { App } from './App.js';
import { EMPTY_RECORD, progressOf, recordRun } from './record.js';

// Orgs (item 15, user request): the app should feel expansive to a new player — choose
// which org to climb, most of them visibly locked from day one. The picker lives on the
// career's opening org chart (user, 2026-09-28): browsing an org shows its whole tree —
// every rung's character, meeting and what beating it unlocks.

const q = (s: string) => document.querySelector<HTMLElement>(s);
const chart = () => q('[data-orgchart]')!.textContent!;

describe('the org picker on the career’s org chart', () => {
  beforeEach(() => localStorage.clear());
  afterEach(cleanup);

  it('is not on Home; Start career opens the chart with the picker on Finance', () => {
    render(<App seed={5} />);
    expect(q('[data-org-picker]')).toBeNull();
    fireEvent.click(q('[data-start-run]')!);
    expect(q('[data-org-picker]')!.textContent).toMatch(/Finance/);
    expect(chart()).toContain('The Intern');
    expect((q('[data-chart-go]') as HTMLButtonElement).disabled).toBe(false);
  });

  it('browsing to a locked org shows its full tree, but you cannot start it yet', () => {
    render(<App seed={5} />);
    fireEvent.click(q('[data-start-run]')!);
    fireEvent.click(q('[data-org-next]')!);
    expect(q('[data-org-picker]')!.textContent).toMatch(/Tech/);
    expect(q('[data-org-locked]')!.textContent).toMatch(/promoted in Finance/i);
    for (const m of orgOf('tech').meetings) expect(chart()).toContain(m.role);
    expect(document.querySelectorAll('[data-orgchart] [data-rung] svg[data-avatar]').length).toBe(5); // every portrait
    expect((q('[data-chart-go]') as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(q('[data-org-prev]')!);
    expect((q('[data-chart-go]') as HTMLButtonElement).disabled).toBe(false);
  });

  it('each rung says what beating it unlocks; the top rung, which org promotion opens', () => {
    render(<App seed={5} />);
    fireEvent.click(q('[data-start-run]')!);
    expect(q('[data-rung="0"] [data-unlock]')!.textContent).toMatch(/Coffee Run/);
    expect(q('[data-rung="4"] [data-unlock]')!.textContent).toMatch(/Tech/);
  });

  it('once promoted in Finance, a Tech career climbs the Tech cast and is recorded as Tech', () => {
    localStorage.setItem('qbr.record.v1', JSON.stringify({ runs: 3, promotions: 1, bestMeetings: 5, meetings: 12, orgsPromoted: ['finance'] }));
    render(<App seed={5} />);
    fireEvent.click(q('[data-start-run]')!);
    fireEvent.click(q('[data-org-next]')!);
    expect(q('[data-org-locked]')).toBeNull();
    expect(chart()).toContain('The New Grad');
    expect(chart()).not.toContain('The Intern');
    expect((q('[data-chart-go]') as HTMLButtonElement).disabled).toBe(false);
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
  });
});
