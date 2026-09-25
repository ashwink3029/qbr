import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';

// Spy on the feedback cues the Game fires; the real module is exercised below.
vi.mock('./feedback.js', () => ({
  primeAudio: vi.fn(),
  cardTapped: vi.fn(),
  cardDenied: vi.fn(),
  cardPlaced: vi.fn(),
  cardConfirmed: vi.fn(),
}));

import * as feedback from './feedback.js';
import { Game } from './Game.js';

const q = (sel: string) => document.querySelector<HTMLElement>(sel);
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

describe('the real feedback module', () => {
  it('is silent and safe with no WebAudio and no native layer (jsdom / desktop web)', async () => {
    const real = await vi.importActual<typeof import('./feedback.js')>('./feedback.js');
    expect(() => {
      real.primeAudio();
      real.cardTapped();
      real.cardDenied();
      real.cardPlaced();
      real.cardConfirmed();
    }).not.toThrow();
  });
});
