import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { App, AI_DELAY_MS } from './App.js';

// Verified headlessly, like chain: mount the real component, make a real play
// through the DOM, let the real AI reply on its timer, and assert the sheet
// changed. Catches a board that renders but does nothing when touched.

afterEach(cleanup);

const cells = (): HTMLElement[] => Array.from(document.querySelectorAll<HTMLElement>('[data-cell]'));

describe('the app', () => {
  it('renders a 3x5 sheet with home columns owned', () => {
    render(<App seed={5} />);
    expect(cells()).toHaveLength(15);
    expect(cells().filter((c) => c.classList.contains('mine'))).toHaveLength(3);
    expect(cells().filter((c) => c.classList.contains('theirs'))).toHaveLength(3);
  });

  it('select a card, place it, and the opponent replies', () => {
    vi.useFakeTimers();
    try {
      render(<App seed={5} />);
      const playable = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-card]')).find((b) => !b.disabled);
      expect(playable, 'opening hand has no playable card').toBeTruthy();
      fireEvent.click(playable!);
      const target = cells().find((c) => c.classList.contains('legal'));
      expect(target, 'selected card highlights no legal cell').toBeTruthy();
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
});
