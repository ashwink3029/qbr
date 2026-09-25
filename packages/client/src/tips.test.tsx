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
  hasUnaffordable: false,
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
    const tipText = () => document.querySelector('[data-tip]')?.textContent ?? '';
    expect(tipText()).not.toMatch(/Tap a card/);
    expect(loadSeenTips().has('place')).toBe(true);

    cleanup();
    render(<Game seed={6} />);
    expect(tipText()).not.toMatch(/Tap a card/);
  });

  it('after placement, explains grey cards once: they cost more $ than your open cells', () => {
    localStorage.setItem('qbr.tips.v1', JSON.stringify(['place']));
    render(<Game seed={5} />);
    expect(document.querySelector('[data-tip]')!.textContent).toMatch(/Grey cards cost more \$/);
    fireEvent.click(document.querySelector('[data-tip]')!);
    expect(document.querySelector('[data-tip]')).toBeNull();
  });
});

describe('grey cards explain themselves', () => {
  beforeEach(() => localStorage.setItem('qbr.tips.v1', JSON.stringify(['place', 'cost'])));
  afterEach(cleanup);

  it('an unaffordable card is tagged with what it needs; tapping it explains instead of selecting', () => {
    render(<Game seed={5} />);
    const grey = document.querySelector<HTMLButtonElement>('[data-card][data-playable="false"]');
    expect(grey, 'seed 5 opens with no unaffordable card').toBeTruthy();
    expect(grey!.disabled).toBe(false); // still tappable on your turn
    expect(grey!.querySelector('[data-needs]')!.textContent).toMatch(/needs \$\$/);

    fireEvent.click(grey!);
    const status = document.querySelector('[data-status]')!.textContent!;
    expect(status).toMatch(/needs a \$\$+ cell; your best open cell has \$\./);
    expect(document.querySelectorAll('.cell.legal')).toHaveLength(0); // nothing selected

    // Picking a playable card clears the explanation and selects as normal.
    fireEvent.click(document.querySelector<HTMLButtonElement>('[data-card][data-playable="true"]')!);
    expect(document.querySelector('[data-status]')!.textContent).toMatch(/Place /);
    expect(document.querySelectorAll('.cell.legal').length).toBeGreaterThan(0);
  });
});
