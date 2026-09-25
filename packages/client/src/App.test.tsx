import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { App } from './App.js';
import { AI_DELAY_MS } from './Game.js';

// The Home Screen flow, end to end through the real components: launch lands on
// Home; Start opens a year; the window's × goes home and Resume returns to the
// same board; finishing a year returns home and updates the saved record.

afterEach(cleanup);
beforeEach(() => localStorage.clear());

const q = <T extends Element = HTMLElement>(sel: string): T | null => document.querySelector<T>(sel);
const home = () => q('[data-home]');
const board = () => Array.from(document.querySelectorAll<HTMLElement>('[data-cell]'));
const visible = (el: Element | null) => !!el && !el.closest('[hidden]');

/** Close out every quarter and let Finance play each one out. */
function loseTheYear(): void {
  for (let guard = 0; guard < 10 && !home(); guard++) {
    const pass = q<HTMLButtonElement>('[data-pass]');
    if (pass && !pass.disabled) fireEvent.click(pass);
    for (let k = 0; k < 40 && !q('[data-dialog]'); k++) {
      act(() => {
        vi.advanceTimersByTime(AI_DELAY_MS + 10);
      });
      const p = q<HTMLButtonElement>('[data-pass]');
      if (p && !p.disabled) fireEvent.click(p);
    }
    const btn = q<HTMLButtonElement>('[data-dialog-button]');
    if (btn) fireEvent.click(btn);
  }
}

describe('home screen', () => {
  it('is what the app opens to, with no board mounted', () => {
    render(<App seed={5} />);
    expect(home()).toBeTruthy();
    expect(q('[data-start]')!.textContent).toMatch(/Start fiscal year/);
    expect(q('[data-resume]')).toBeNull();
    expect(board()).toHaveLength(0);
    expect(q('[data-record]')!.textContent).toMatch(/No years/);
  });

  it('Start opens a year; × returns home; Resume restores the same board', () => {
    vi.useFakeTimers();
    try {
      render(<App seed={5} />);
      fireEvent.click(q('[data-start]')!);
      expect(home()).toBeNull();
      expect(board().filter(visible)).toHaveLength(15);

      // Make a play so there is something to resume.
      fireEvent.click(Array.from(document.querySelectorAll<HTMLButtonElement>('[data-card]')).find((b) => !b.disabled)!);
      const target = board().find((c) => c.classList.contains('legal'))!;
      fireEvent.click(target);
      fireEvent.click(target);
      const placedCell = target.dataset.cell;

      fireEvent.click(q('[data-exit]')!);
      expect(home()).toBeTruthy();
      expect(q('[data-resume]')).toBeTruthy();
      // Finance must not move while we are home.
      const before = board().map((c) => c.textContent).join('|');
      act(() => {
        vi.advanceTimersByTime(AI_DELAY_MS * 10);
      });
      expect(board().map((c) => c.textContent).join('|')).toBe(before);

      fireEvent.click(q('[data-resume]')!);
      expect(home()).toBeNull();
      expect(q(`[data-cell="${placedCell}"] .placed`)).toBeTruthy();
    } finally {
      vi.useRealTimers();
    }
  });

  it('finishing a year returns home and records it', () => {
    vi.useFakeTimers();
    try {
      render(<App seed={5} />);
      fireEvent.click(q('[data-start]')!);
      loseTheYear();
      expect(home(), 'did not return home after the year').toBeTruthy();
      expect(q('[data-resume]')).toBeNull();
      expect(q('[data-record]')!.textContent).toMatch(/0W · 1L|Record/);
      expect(q('[data-record]')!.textContent).toMatch(/performance review|flat/);
      expect(JSON.parse(localStorage.getItem('qbr.record.v1')!)).toMatchObject({ losses: 1 });
    } finally {
      vi.useRealTimers();
    }
  });
});
