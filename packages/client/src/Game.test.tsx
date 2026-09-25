import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { AI_DELAY_MS, Game } from './Game.js';

// Verified headlessly, like chain: mount the real component, make a real play
// through the DOM, let the real AI reply on its timer, and assert the sheet
// changed. Catches a board that renders but does nothing when touched.

afterEach(cleanup);

const cells = (): HTMLElement[] => Array.from(document.querySelectorAll<HTMLElement>('[data-cell]'));

describe('the app', () => {
  it('tapping a different legal cell moves the preview instead of placing', () => {
    render(<Game seed={5} />);
    fireEvent.click(Array.from(document.querySelectorAll<HTMLButtonElement>('[data-card][data-playable="true"]')).find((b) => !b.disabled)!);
    const legal = cells().filter((c) => c.classList.contains('legal'));
    expect(legal.length).toBeGreaterThan(1);
    fireEvent.click(legal[0]!);
    fireEvent.click(legal[1]!);
    expect(cells().filter((c) => c.querySelector('.placed'))).toHaveLength(0);
    expect(legal[1]!.classList.contains('pending')).toBe(true);
    expect(legal[0]!.classList.contains('pending')).toBe(false);
  });

  it('renders a 3x5 sheet with home columns owned', () => {
    render(<Game seed={5} />);
    expect(cells()).toHaveLength(15);
    expect(cells().filter((c) => c.classList.contains('mine'))).toHaveLength(3);
    expect(cells().filter((c) => c.classList.contains('theirs'))).toHaveLength(3);
  });

  it('select a card, place it, and the opponent replies', () => {
    vi.useFakeTimers();
    try {
      render(<Game seed={5} />);
      const playable = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-card][data-playable="true"]')).find((b) => !b.disabled);
      expect(playable, 'opening hand has no playable card').toBeTruthy();
      fireEvent.click(playable!);
      const target = cells().find((c) => c.classList.contains('legal'));
      expect(target, 'selected card highlights no legal cell').toBeTruthy();
      // First tap previews the spread without committing — touch has no hover.
      fireEvent.click(target!);
      expect(target!.querySelector('.placed')).toBeNull();
      expect(target!.classList.contains('pending')).toBe(true);
      expect(cells().some((c) => c.classList.contains('reach'))).toBe(true);
      // Second tap on the same cell places the card.
      fireEvent.click(target!);
      expect(target!.querySelector('.placed')).toBeTruthy();
      expect(document.querySelector('[data-status]')!.textContent).toMatch(/typing/);
      act(() => {
        vi.advanceTimersByTime(AI_DELAY_MS + 10);
      });
      const theirCards = cells().filter((c) => c.classList.contains('theirs') && c.querySelector('.placed'));
      const status = document.querySelector('[data-status]')!.textContent;
      // The AI either placed a card or deferred; either way it is our turn again.
      expect(theirCards.length > 0 || /Pick|No moves/.test(status ?? '')).toBe(true);
      expect(status).not.toMatch(/typing/);
    } finally {
      vi.useRealTimers();
    }
  });

  it('closing out Q1 locks you out, Finance finishes alone, then Q2 starts on a fresh sheet', () => {
    vi.useFakeTimers();
    try {
      render(<Game seed={5} />);
      const title = () => document.querySelector('[data-title]')!.textContent;
      const handBefore = document.querySelectorAll('[data-card]').length;
      expect(title()).toMatch(/Q1/);

      fireEvent.click(document.querySelector<HTMLButtonElement>('[data-pass]')!);
      expect(document.querySelector<HTMLButtonElement>('[data-pass]')!.disabled).toBe(true);
      expect(document.querySelector('[data-status]')!.textContent).toMatch(/closed out Q1/);

      // Finance plays on alone until it closes out too; the summary then appears.
      for (let k = 0; k < 30 && !document.querySelector('[data-dialog]'); k++) {
        act(() => {
          vi.advanceTimersByTime(AI_DELAY_MS + 10);
        });
        // While we are locked out, our cards stay unplayable.
        const live = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-card][data-playable="true"]')).filter((b) => !b.disabled);
        if (!document.querySelector('[data-dialog]')) expect(live).toHaveLength(0);
      }
      const dialog = document.querySelector('[data-dialog]');
      expect(dialog, 'no quarter summary after both closed out').toBeTruthy();
      expect(dialog!.textContent).toMatch(/Q1 results/);
      // We played nothing, so Finance won Q1 (or tied at 0-0): we lost a life.
      expect(document.querySelectorAll('[data-lives="You"] i.on')).toHaveLength(1);

      fireEvent.click(document.querySelector<HTMLButtonElement>('[data-dialog-button]')!);
      expect(document.querySelector('[data-dialog]')).toBeNull();
      expect(title()).toMatch(/Q2/);
      expect(cells().some((c) => c.querySelector('.placed'))).toBe(false);
      // Hand kept and topped up (8 opening + 3 between Q1 and Q2).
      expect(document.querySelectorAll('[data-card]').length).toBe(handBefore + 3);
    } finally {
      vi.useRealTimers();
    }
  });

  it('never offers a filled cell as a target, across real turns with Finance replying', () => {
    vi.useFakeTimers();
    try {
      render(<Game seed={11} />);
      for (let turn = 0; turn < 8; turn++) {
        const playable = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-card][data-playable="true"]')).filter((b) => !b.disabled);
        if (playable.length === 0) break;
        for (const b of playable) {
          fireEvent.click(b);
          for (const c of cells().filter((x) => x.classList.contains('legal'))) {
            expect(c.querySelector('.placed'), `card offered onto filled cell ${c.dataset.cell}`).toBeNull();
          }
          fireEvent.click(b);
        }
        fireEvent.click(playable[0]!);
        const target = cells().find((c) => c.classList.contains('legal'))!;
        fireEvent.click(target);
        fireEvent.click(target);
        act(() => {
          vi.advanceTimersByTime(AI_DELAY_MS + 10);
        });
      }
      expect(cells().filter((c) => c.querySelector('.placed')).length).toBeGreaterThan(4);
    } finally {
      vi.useRealTimers();
    }
  });

  it('a boss meeting shows the boss rule, hatches its locked cells, and never offers them', () => {
    render(<Game seed={5} mods={{ jokers: ['mug'], boss: 'micromanager' }} meetingName="Quarterly Review" />);
    expect(document.querySelector('[data-title]')!.textContent).toMatch(/Quarterly Review/);
    expect(document.querySelector('[data-boss="micromanager"]')!.textContent).toMatch(/Micromanager/);
    const locked = cells().filter((c) => c.classList.contains('blocked'));
    expect(locked).toHaveLength(2);
    // Coffee Mug: the opening hand is one card bigger than the plain 8.
    expect(document.querySelectorAll('[data-card]')).toHaveLength(9);
    for (const b of Array.from(document.querySelectorAll<HTMLButtonElement>('[data-card][data-playable="true"]')).filter((x) => !x.disabled)) {
      fireEvent.click(b);
      for (const c of locked) expect(c.classList.contains('legal')).toBe(false);
      fireEvent.click(b);
    }
  });
});
