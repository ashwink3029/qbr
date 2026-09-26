import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { DEFAULT_MATCH, MATCH_RULES, STARTER_DECK, legalPlays, newMatch, type Action } from '@qbr/shared';
import { AI_DELAY_MS, Game } from './Game.js';

// A coworker match drives Game from outside: my taps are reported (not answered by
// an AI), and the coworker's moves arrive as `incoming`, through the same apply path
// as everything else — so animation, sounds, results and stamps all come for free.

afterEach(cleanup);
beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('qbr.tips.v1', JSON.stringify(['place', 'cost', 'lanes', 'lives', 'takeover', 'closeout-ahead', 'closeout-behind']));
});
const q = (sel: string) => document.querySelector<HTMLElement>(sel);

/** A match where seat 0 moves first. */
function startMatch() {
  for (let seed = 1; ; seed++) {
    const m = newMatch(seed, { player: STARTER_DECK, opponent: STARTER_DECK }, DEFAULT_MATCH, MATCH_RULES);
    if (m.quarter.toMove === 0) return m;
  }
}

describe('Game driven by a coworker', () => {
  it('reports my move, and nobody answers for the coworker — no AI', () => {
    vi.useFakeTimers();
    try {
      const sent: Action[] = [];
      const m = startMatch();
      render(<Game initialMatch={m} remote={{ onLocalAction: (a) => sent.push(a), incoming: null }} opponentName="Ada" />);
      fireEvent.click(q('[data-card][data-playable="true"]')!);
      const cell = q('.cell.legal')!;
      fireEvent.click(cell);
      fireEvent.click(cell);
      expect(sent).toHaveLength(1);
      expect(sent[0]).toMatchObject({ type: 'play', cell: Number(cell.dataset.cell) });
      act(() => {
        vi.advanceTimersByTime(AI_DELAY_MS * 5);
      });
      expect(sent).toHaveLength(1);
      expect(q('[data-pass]')!.hasAttribute('disabled')).toBe(true); // still the coworker's turn
      expect(q('[data-opponent]')!.textContent).toMatch(/Ada/);
    } finally {
      vi.useRealTimers();
    }
  });

  it("the coworker's move arrives and is played, with its animation", () => {
    const m0 = startMatch();
    const mine = legalPlays(m0.quarter)[0]!;
    const sent: Action[] = [];
    const { rerender } = render(
      <Game initialMatch={m0} remote={{ onLocalAction: (a) => sent.push(a), incoming: null }} />,
    );
    fireEvent.click(q(`[data-card="${mine.card}"]`)!);
    fireEvent.click(q(`[data-cell="${mine.cell}"]`)!);
    fireEvent.click(q(`[data-cell="${mine.cell}"]`)!);
    // Now it is seat 1's turn; the coworker passes, then it is mine again.
    rerender(<Game initialMatch={m0} remote={{ onLocalAction: (a) => sent.push(a), incoming: { id: 1, action: { type: 'pass' } } }} />);
    expect(q('[data-pass]')!.hasAttribute('disabled')).toBe(false);
    // The same incoming id is applied once, however often we re-render.
    rerender(<Game initialMatch={m0} remote={{ onLocalAction: (a) => sent.push(a), incoming: { id: 1, action: { type: 'pass' } } }} />);
    expect(q('[data-pass]')!.hasAttribute('disabled')).toBe(false);
  });
});
