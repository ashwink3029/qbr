import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { Game } from './Game.js';
import { loadSeenTips } from './tips.js';

// Onboarding by doing (playbook lever 3, /explore 2026-09-27). A brand-new player's
// first turn used to open on a three-sentence rules bubble covering the board. Now the
// screen points at the next thing to tap — a glowing card, then glowing cells, then
// "tap again" on the previewed cell — and Bindy says one short line per step. The
// guide ends for good with the player's first placed card.

const q = (s: string) => document.querySelector<HTMLElement>(s);
const all = (s: string) => Array.from(document.querySelectorAll<HTMLElement>(s));
const tipText = () => q('[data-tip]')?.textContent ?? '';

describe('the guided first turn', () => {
  beforeEach(() => localStorage.clear());
  afterEach(cleanup);

  it('points at every playable card, and only those, with a one-line Bindy prompt', () => {
    render(<Game seed={5} />);
    const guided = all('.hand [data-card][data-guide]');
    expect(guided.length).toBeGreaterThan(0);
    expect(guided.every((c) => c.dataset.playable === 'true')).toBe(true);
    expect(all('.hand [data-card][data-playable="true"]')).toHaveLength(guided.length);
    expect(all('[data-cell][data-guide]')).toHaveLength(0);
    expect(tipText()).toMatch(/tap a glowing card/i);
    expect(tipText().replace(/tap to dismiss/, '').split(/\s+/).filter(Boolean).length).toBeLessThanOrEqual(8);
  });

  it('after picking a card the glow moves to the cells it can go on', () => {
    render(<Game seed={5} />);
    fireEvent.click(q('.hand [data-card][data-guide]')!);
    expect(all('.hand [data-card][data-guide]')).toHaveLength(0);
    const cells = all('[data-cell][data-guide]');
    expect(cells.length).toBeGreaterThan(0);
    expect(cells.every((c) => c.classList.contains('legal'))).toBe(true);
    expect(tipText()).toMatch(/glowing cell/i);
  });

  it('after a preview only that cell glows, with a "tap again" badge', () => {
    render(<Game seed={5} />);
    fireEvent.click(q('.hand [data-card][data-guide]')!);
    const target = q('[data-cell][data-guide]')!;
    fireEvent.click(target);
    const cells = all('[data-cell][data-guide]');
    expect(cells).toHaveLength(1);
    expect(cells[0]!.classList.contains('pending')).toBe(true);
    expect(cells[0]!.querySelector('[data-guide-badge]')!.textContent).toMatch(/tap again/i);
    expect(tipText()).toMatch(/same cell again/i);
  });

  it('the first placed card ends the guide for good', () => {
    render(<Game seed={5} />);
    fireEvent.click(q('.hand [data-card][data-guide]')!);
    const target = q('[data-cell][data-guide]')!;
    fireEvent.click(target);
    fireEvent.click(target);
    expect(all('[data-guide]')).toHaveLength(0);
    expect(tipText()).not.toMatch(/glowing|tap again/i);
    expect(loadSeenTips().has('place')).toBe(true);
    cleanup();
    render(<Game seed={6} />);
    expect(all('[data-guide]')).toHaveLength(0);
  });

  it('a returning player (placement already learned) sees no guide', () => {
    localStorage.setItem('qbr.tips.v1', JSON.stringify(['place']));
    render(<Game seed={5} />);
    expect(all('[data-guide]')).toHaveLength(0);
  });
});
