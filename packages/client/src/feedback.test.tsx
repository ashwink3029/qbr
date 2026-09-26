import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render } from '@testing-library/react';

// Spy on the feedback cues the Game fires; the real module is exercised below.
vi.mock('./feedback.js', () => ({
  primeAudio: vi.fn(),
  setFeedbackPrefs: vi.fn(),
  cardTapped: vi.fn(),
  cardDenied: vi.fn(),
  cardPlaced: vi.fn(),
  cardConfirmed: vi.fn(),
  moveResolved: vi.fn(),
  quarterEnded: vi.fn(),
  yearEnded: vi.fn(),
  careerEnded: vi.fn(),
}));

import * as feedback from './feedback.js';
import { AI_DELAY_MS, Game } from './Game.js';
import { App } from './App.js';

const q = <T extends HTMLElement = HTMLElement>(sel: string) => document.querySelector<T>(sel);
const cells = () => Array.from(document.querySelectorAll<HTMLElement>('[data-cell]'));

describe('sound + haptics cues', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem('qbr.tips.v1', JSON.stringify(['place', 'cost']));
  });
  afterEach(cleanup);

  it('tap a card -> tapped; tap a cell -> placed; tap it again -> confirmed', () => {
    render(<Game seed={5} />);
    fireEvent.click(q('[data-card][data-playable="true"]')!);
    expect(feedback.cardTapped).toHaveBeenCalledTimes(1);

    const target = cells().find((c) => c.classList.contains('legal'))!;
    fireEvent.click(target);
    expect(feedback.cardPlaced).toHaveBeenCalledTimes(1);
    expect(feedback.cardConfirmed).not.toHaveBeenCalled();

    fireEvent.click(target);
    expect(feedback.cardConfirmed).toHaveBeenCalledTimes(1);
    expect(target.querySelector('.placed')).toBeTruthy();
  });

  it('a card you cannot afford gets the denied cue, not the tap', () => {
    render(<Game seed={5} />);
    fireEvent.click(q('[data-card][data-playable="false"]')!);
    expect(feedback.cardDenied).toHaveBeenCalledTimes(1);
    expect(feedback.cardTapped).not.toHaveBeenCalled();
  });

  it('taps that do nothing make no sound: an illegal cell, or no card selected', () => {
    render(<Game seed={5} />);
    fireEvent.click(cells().find((c) => !c.classList.contains('legal'))!);
    expect(feedback.cardPlaced).not.toHaveBeenCalled();
    expect(feedback.cardConfirmed).not.toHaveBeenCalled();
  });
});

describe('cues for what a move and a year resolve to', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    localStorage.setItem('qbr.tips.v1', JSON.stringify(['place', 'cost', 'lanes', 'lives', 'closed-ahead', 'closed-behind']));
  });
  afterEach(cleanup);

  /** Close out every quarter until the year (or career meeting) is decided. */
  function closeOutAll() {
    const decided = () => !!q('[data-run-end]') || vi.mocked(feedback.yearEnded).mock.calls.length > 0;
    for (let guard = 0; guard < 12 && !decided(); guard++) {
      const pass = q<HTMLButtonElement>('[data-pass]');
      if (pass && !pass.disabled) fireEvent.click(pass);
      for (let k = 0; k < 40 && !q('[data-dialog]') && !q('[data-run-end]'); k++) {
        act(() => {
          vi.advanceTimersByTime(AI_DELAY_MS + 10);
        });
        const p = q<HTMLButtonElement>('[data-pass]');
        if (p && !p.disabled) fireEvent.click(p);
      }
      const btn = q<HTMLButtonElement>('[data-dialog-button]');
      if (btn && (!decided() || q('[data-run-end]') === null)) fireEvent.click(btn);
    }
  }

  it('every committed move reports its effects (placed cell, flips, abilities), for either side', () => {
    vi.useFakeTimers();
    try {
      render(<Game seed={5} />);
      fireEvent.click(q('[data-card][data-playable="true"]')!);
      const target = cells().find((c) => c.classList.contains('legal'))!;
      fireEvent.click(target);
      fireEvent.click(target);
      expect(feedback.moveResolved).toHaveBeenCalledTimes(1);
      const [fx, human] = vi.mocked(feedback.moveResolved).mock.calls[0]!;
      expect(fx.placed).toBe(Number(target.dataset.cell));
      expect(fx.by).toBe(0);
      expect(human).toBe(0);
      act(() => {
        vi.advanceTimersByTime(AI_DELAY_MS + 10);
      });
      expect(vi.mocked(feedback.moveResolved).mock.calls.at(-1)![0].by).toBe(1); // Finance's reply
    } finally {
      vi.useRealTimers();
    }
  });

  it('closing out every quarter: a quarter cue each, then one year cue with the outcome', () => {
    vi.useFakeTimers();
    try {
      render(<Game seed={5} />);
      closeOutAll();
      const quarters = vi.mocked(feedback.quarterEnded).mock.calls.map((c) => c[0]);
      expect(quarters.length).toBeGreaterThanOrEqual(1);
      expect(feedback.yearEnded).toHaveBeenCalledTimes(1);
      expect(vi.mocked(feedback.yearEnded).mock.calls[0]![0]).toBe('lost'); // never played a card
      // The deciding quarter gets the year cue instead of its own quarter cue.
      expect(quarters).not.toContain('won');
    } finally {
      vi.useRealTimers();
    }
  });

  it('a lost career ends with the career cue: not promoted, one chime for the special it unlocks', () => {
    localStorage.setItem('qbr.record.v1', JSON.stringify({ runs: 2, bestMeetings: 5 }));
    vi.useFakeTimers();
    try {
      render(<App seed={5} />);
      fireEvent.click(q('[data-start-run]')!);
      fireEvent.click(q('[data-chart-go]')!);
      fireEvent.click(q('[data-offer]')!);
      closeOutAll();
      expect(q('[data-run-end]')).toBeTruthy();
      expect(feedback.careerEnded).toHaveBeenCalledTimes(1);
      expect(feedback.careerEnded).toHaveBeenCalledWith(false, 1); // a 3rd career unlocks Water Cooler Gossip
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('the real feedback module', () => {
  it('is silent and safe with no WebAudio and no native layer (jsdom / desktop web)', async () => {
    const real = await vi.importActual<typeof import('./feedback.js')>('./feedback.js');
    expect(() => {
      real.primeAudio();
      real.cardTapped();
      real.cardDenied();
      real.cardPlaced();
      real.cardConfirmed();
      const fx = { id: 1, by: 0 as const, placed: 0, claim: [], flip: [1], boost: [2], weaken: [3], destroy: [4] };
      real.moveResolved(fx, 0);
      real.moveResolved({ ...fx, by: 1 }, 0);
      real.quarterEnded('won');
      real.quarterEnded('lost');
      real.quarterEnded('tie');
      real.yearEnded('won');
      real.careerEnded(true, 2);
    }).not.toThrow();
  });
});
