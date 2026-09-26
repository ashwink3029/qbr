import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { STAKES } from '@qbr/shared';
import { App } from './App.js';
import { EMPTY_RECORD, recordRun } from './record.js';

afterEach(cleanup);
beforeEach(() => localStorage.clear());

const q = (sel: string) => document.querySelector<HTMLElement>(sel);

describe('career stakes', () => {
  it('a promotion at a stake unlocks the next one; a lost career does not', () => {
    const won = recordRun(EMPTY_RECORD, true, 5, 1);
    expect(won.stakeCleared).toBe(1);
    expect(recordRun(won, false, 2, 2).stakeCleared).toBe(1);
    expect(recordRun(won, true, 5, 2).stakeCleared).toBe(2);
    expect(recordRun(recordRun(won, true, 5, 2), true, 5, 1).stakeCleared).toBe(2); // never goes down
  });

  it('Home shows no difficulty picker until the first promotion', () => {
    render(<App seed={5} />);
    expect(q('[data-stake-picker]')).toBeNull();
  });

  it('after a promotion, Home offers the next stake, and the career starts at it', () => {
    localStorage.setItem('qbr.record.v1', JSON.stringify({ runs: 1, promotions: 1, bestMeetings: 5, stakeCleared: 1 }));
    render(<App seed={5} />);
    const picker = q('[data-stake-picker]')!;
    expect(picker.textContent).toMatch(/Standard/);
    fireEvent.click(q('[data-stake-next]')!);
    expect(q('[data-stake-picker]')!.textContent).toMatch(new RegExp(STAKES[1]!.name));
    expect(q('[data-stake-picker]')!.textContent).toMatch(/draws \+1 card/);
    // Only stakes up to cleared + 1 are open.
    expect((q('[data-stake-next]') as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(q('[data-start-run]')!);
    expect(q('[data-chart] .titlebar')!.textContent).toMatch(new RegExp(STAKES[1]!.name));
  });
});
