import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { NO_MODS } from '@qbr/shared';
import { Game } from './Game.js';
import { loadSeenTips, pickTip, type TipContext } from './tips.js';

const base: TipContext = {
  humanTurn: true,
  firstTurnOfMatch: false,
  selected: false,
  previewFlips: false,
  financeClosedOut: false,
  lead: 0,
  mods: NO_MODS,
};
const none: ReadonlySet<string> = new Set();

describe('pickTip', () => {
  it('teaches placement on the first turn, and only until a card is selected', () => {
    expect(pickTip({ ...base, firstTurnOfMatch: true }, none)?.id).toBe('place');
    expect(pickTip({ ...base, firstTurnOfMatch: true, selected: true }, none)).toBeNull();
    expect(pickTip(base, none)).toBeNull();
  });

  it('coaches the close-out decision after Finance passes, ahead vs behind', () => {
    expect(pickTip({ ...base, financeClosedOut: true, lead: 3 }, none)?.id).toBe('closeout-ahead');
    expect(pickTip({ ...base, financeClosedOut: true, lead: -2 }, none)?.id).toBe('closeout-behind');
  });

  it('names the boss first, and explains flips when a preview would take a card', () => {
    const t = pickTip({ ...base, firstTurnOfMatch: true, mods: { jokers: [], boss: 'auditor' } }, none)!;
    expect(t.id).toBe('boss:auditor');
    expect(t.text).toMatch(/The Auditor/);
    expect(pickTip({ ...base, previewFlips: true }, none)?.id).toBe('takeover');
  });

  it('never repeats a tip that was already seen', () => {
    expect(pickTip({ ...base, firstTurnOfMatch: true }, new Set(['place']))).toBeNull();
  });
});

describe('Bindy in the game', () => {
  beforeEach(() => localStorage.clear());
  afterEach(cleanup);

  it('shows the placement tip once; dismissing it sticks across a remount', () => {
    render(<Game seed={5} />);
    const tip = document.querySelector<HTMLButtonElement>('[data-tip]');
    expect(tip?.textContent).toMatch(/Tap a card/);
    expect(document.querySelector('[data-mascot]')).toBeTruthy();
    fireEvent.click(tip!);
    expect(document.querySelector('[data-tip]')).toBeNull();
    expect(loadSeenTips().has('place')).toBe(true);

    cleanup();
    render(<Game seed={6} />);
    expect(document.querySelector('[data-tip]')).toBeNull();
  });
});
