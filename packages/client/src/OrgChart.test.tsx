import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { MEETINGS, finishMeeting, leaveChart, newRun, pickJoker } from '@qbr/shared';
import { OrgChart, TITLES, yourTitle } from './OrgChart.js';

afterEach(cleanup);

const state = (i: number | 'you') => document.querySelector<HTMLElement>(`[data-rung="${i}"]`);

describe('org chart', () => {
  it('after beating the Intern: Intern ticked, the Manager is next, you are an Associate', () => {
    let run = leaveChart(newRun(2));
    run = pickJoker(run, run.offer[0]!);
    run = finishMeeting(run, true);
    render(<OrgChart run={run} beaten={run.meeting} />);
    expect(state(0)!.dataset.state).toBe('beaten');
    expect(state(0)!.textContent).toMatch(/beaten in the Onboarding sync/);
    expect(state(1)!.dataset.state).toBe('next');
    expect(state(1)!.textContent).toMatch(/next: Weekly 1:1/);
    expect(state(4)!.dataset.state).toBe('above');
    expect(state('you')!.textContent).toMatch(/Associate/);
  });

  it('names what makes each rung hard: boss, extra cards, $$ home cells', () => {
    const run = newRun(2);
    render(<OrgChart run={run} beaten={0} />);
    expect(state(0)!.textContent).toMatch(/plays anything/);
    expect(state(2)!.textContent).toMatch(/\+1 card each quarter/);
    expect(state(4)!.textContent).toMatch(/Reply-All[\s\S]*\+2 cards each quarter[\s\S]*2 home cells start at \$\$/);
  });

  it('has a title for every step up, ending in Promoted', () => {
    expect(TITLES).toHaveLength(MEETINGS.length + 1);
    expect(yourTitle(0)).toBe('New hire');
    expect(yourTitle(MEETINGS.length)).toBe('Promoted');
  });
});
