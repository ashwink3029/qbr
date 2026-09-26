import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { STARTER_DECK, finishMeeting, leaveChart, newRun } from '@qbr/shared';
import { Run, careerEndProgress } from './Run.js';

afterEach(cleanup);
beforeEach(() => localStorage.clear());

const q = (sel: string) => document.querySelector<HTMLElement>(sel);

describe('first career: org chart -> Intern, no closet', () => {
  it('a brand-new player walks straight into the Intern with a Coffee Mug on the desk', () => {
    render(<Run seed={3} deck={STARTER_DECK} progress={{ bestRung: 0, careers: 0 }} onExit={() => {}} onRunEnd={() => {}} />);
    expect(q('[data-chart-go]')!.textContent).toMatch(/Walk into the Onboarding sync/);
    expect(q('[data-starter-joker]')!.textContent).toMatch(/Coffee Mug[\s\S]*\+1 card/);
    fireEvent.click(q('[data-chart-go]')!);
    expect(q('.closet')).toBeNull();
    expect(q('[data-tray] [data-joker="mug"]')).toBeTruthy();
  });

  it('a returning player still starts in the supply closet', () => {
    render(<Run seed={3} deck={STARTER_DECK} progress={{ bestRung: 1, careers: 1 }} onExit={() => {}} onRunEnd={() => {}} />);
    expect(q('[data-chart-go]')!.textContent).toMatch(/supply closet/);
    expect(q('[data-starter-joker]')).toBeNull();
  });
});

describe('career end', () => {
  it('a promotion counts toward the stake cleared, so stake unlocks are announced', () => {
    let run = newRun(1, 2);
    run = { ...run, meeting: 4, status: 'meeting', offer: [] };
    run = finishMeeting(run, true);
    expect(run.status).toBe('won');
    expect(careerEndProgress({ bestRung: 5, careers: 3, stakeCleared: 1 }, run)).toEqual({
      bestRung: 5,
      careers: 4,
      stakeCleared: 2,
    });
    const lost = finishMeeting(leaveChart({ ...newRun(1, 3), offer: [] }), false);
    expect(careerEndProgress({ bestRung: 5, careers: 3, stakeCleared: 2 }, lost).stakeCleared).toBe(2);
  });
});
