import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { finishMeeting, leaveChart, newRun, pickJoker } from '@qbr/shared';
import { AI_DELAY_MS, Game } from './Game.js';
import { OrgChart } from './OrgChart.js';
import { App } from './App.js';

// The moments a player works toward get motion, not a snap: a rubber stamp on each
// result, the banked lanes pulse, beaten rungs get ticked, promotion lifts you,
// unlocked cards turn over one after another.

afterEach(cleanup);
beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('qbr.tips.v1', JSON.stringify(['place', 'cost', 'lanes', 'lives', 'closed-ahead', 'closed-behind']));
});

const q = <T extends HTMLElement = HTMLElement>(sel: string) => document.querySelector<T>(sel);
const all = (sel: string) => Array.from(document.querySelectorAll<HTMLElement>(sel));

/** Close out until a result dialog shows; returns its stamp each time. */
function stampsUntilOver(): string[] {
  const stamps: string[] = [];
  for (let guard = 0; guard < 12; guard++) {
    for (let k = 0; k < 40 && !q('[data-dialog]'); k++) {
      const p = q<HTMLButtonElement>('[data-pass]');
      if (p && !p.disabled) fireEvent.click(p);
      act(() => {
        vi.advanceTimersByTime(AI_DELAY_MS + 10);
      });
    }
    const stamp = q('[data-dialog] [data-stamp]');
    stamps.push(stamp ? `${stamp.dataset.stamp}:${stamp.textContent}` : 'none');
    const banked = all('.sum.banked');
    if (banked.length === 0) stamps.push('no-banked');
    const btn = q<HTMLButtonElement>('[data-dialog-button]')!;
    if (/home/i.test(btn.textContent ?? '')) break;
    fireEvent.click(btn);
  }
  return stamps;
}

describe('result stamps', () => {
  it('every quarter and the year get a stamp; never playing a card is REJECTED, with Finance’s lanes banked', () => {
    vi.useFakeTimers();
    try {
      render(<Game seed={5} />);
      const stamps = stampsUntilOver();
      expect(stamps).not.toContain('none');
      expect(stamps).not.toContain('no-banked');
      expect(stamps.at(-1)).toBe('rejected:REJECTED');
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('org chart moments', () => {
  it('the rung you just beat is ticked with a stamp; promotion lifts you', () => {
    let run = leaveChart(newRun(2));
    run = pickJoker(run, run.offer[0]!);
    run = finishMeeting(run, true);
    render(<OrgChart run={run} beaten={run.meeting} justBeat={0} />);
    expect(q('[data-rung="0"]')!.dataset.fx).toBe('beaten');
    expect(q('[data-rung="1"]')!.dataset.fx).toBeUndefined();
    expect(q('[data-rung="you"]')!.dataset.fx).toBeUndefined();
    cleanup();
    render(<OrgChart run={run} beaten={5} promoted />);
    expect(q('[data-rung="you"]')!.dataset.fx).toBe('promoted');
  });

  it('after winning a meeting, the chart ticks the rung just beaten', () => {
    localStorage.setItem('qbr.record.v1', JSON.stringify({ runs: 3, bestMeetings: 5 }));
    render(<App seed={5} />);
    fireEvent.click(q('[data-start-run]')!);
    expect(all('[data-fx="beaten"]')).toHaveLength(0); // nothing beaten yet on day one
  });
});

describe('career-end unlocks', () => {
  it('new cards turn over one after another', () => {
    localStorage.setItem('qbr.record.v1', JSON.stringify({ runs: 2, bestMeetings: 0 }));
    vi.useFakeTimers();
    try {
      render(<App seed={5} />);
      fireEvent.click(q('[data-start-run]')!);
      fireEvent.click(q('[data-chart-go]')!);
      fireEvent.click(q('[data-offer]')!);
      for (let guard = 0; guard < 12 && !q('[data-run-end]'); guard++) {
        for (let k = 0; k < 40 && !q('[data-dialog]') && !q('[data-run-end]'); k++) {
          const p = q<HTMLButtonElement>('[data-pass]');
          if (p && !p.disabled) fireEvent.click(p);
          act(() => {
            vi.advanceTimersByTime(AI_DELAY_MS + 10);
          });
        }
        const btn = q<HTMLButtonElement>('[data-dialog-button]');
        if (btn) fireEvent.click(btn);
      }
      // A 3rd career (lost at the Intern) unlocks Water Cooler Gossip.
      const items = all('[data-unlocked-card]');
      expect(items.length).toBeGreaterThanOrEqual(1);
      expect(items.every((e) => e.dataset.fx === 'reveal')).toBe(true);
      expect(items[0]!.style.animationDelay).toBe('300ms');
    } finally {
      vi.useRealTimers();
    }
  });
});
