import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { NO_MODS } from '@qbr/shared';
import { Game } from './Game.js';
import { pickTip, type TipContext } from './tips.js';

// Onboarding by doing (playbook lever 3, /explore 2026-09-27, follow-on to the guided
// first turn): each of Bindy's rules tips POINTS at the thing it talks about — the
// =SUM row, the grey cards, your lives, the Close out button glow while it shows —
// and the two long ones are one line now.

const q = (s: string) => document.querySelector<HTMLElement>(s);
const all = (s: string) => Array.from(document.querySelectorAll<HTMLElement>(s));
const words = (t: string) => t.split(/\s+/).filter(Boolean).length;

const base: TipContext = {
  humanTurn: true,
  firstTurnOfMatch: false,
  selected: false,
  previewFlips: false,
  financeClosedOut: false,
  lead: 0,
  mods: NO_MODS,
  who: 'Finance',
  myCardsOnBoard: 0,
  quarterNo: 1,
  hasUnaffordable: false,
};
const seen = (...ids: string[]) => new Set(['place', ...ids]);

describe('tips point at what they are about', () => {
  it('each rules tip names what should glow, and the long ones are one short line', () => {
    const lanes = pickTip({ ...base, myCardsOnBoard: 1 }, seen())!;
    expect(lanes.points).toBe('sums');
    expect(words(lanes.text)).toBeLessThanOrEqual(16);
    const cost = pickTip({ ...base, hasUnaffordable: true }, seen('lanes'))!;
    expect(cost.points).toBe('unaffordable');
    expect(words(cost.text)).toBeLessThanOrEqual(16);
    expect(pickTip({ ...base, quarterNo: 2 }, seen('lanes'))!.points).toBe('lives');
    expect(pickTip({ ...base, financeClosedOut: true, lead: 2 }, seen())!.points).toBe('pass');
  });
});

describe('the card inspector is discoverable in play', () => {
  it('once a couple of your cards are down, Bindy mentions holding a card — lowest priority, once', () => {
    const quiet = seen('lanes', 'cost', 'hearts', 'backs');
    expect(pickTip({ ...base, myCardsOnBoard: 1 }, quiet)).toBeNull();
    const t = pickTip({ ...base, myCardsOnBoard: 2 }, quiet)!;
    expect(t.id).toBe('inspect');
    expect(t.text).toMatch(/hold any card/i);
    expect(pickTip({ ...base, myCardsOnBoard: 2 }, seen('lanes', 'cost', 'hearts', 'backs', 'inspect'))).toBeNull();
    // Anything more urgent wins.
    expect(pickTip({ ...base, myCardsOnBoard: 2, hasUnaffordable: true }, seen('lanes', 'hearts', 'backs'))!.id).toBe('cost');
  });
});

describe('in the game', () => {
  beforeEach(() => localStorage.clear());
  afterEach(cleanup);

  it('the grey-cards tip makes exactly the grey cards glow', () => {
    localStorage.setItem('qbr.tips.v1', JSON.stringify(['place']));
    render(<Game seed={5} />);
    expect(q('[data-tip]')!.textContent).toMatch(/Grey cards/);
    const glowing = all('.hand [data-card][data-guide]');
    expect(glowing.length).toBeGreaterThan(0);
    expect(glowing.every((c) => c.dataset.playable === 'false')).toBe(true);
    expect(all('.hand [data-card][data-playable="false"]')).toHaveLength(glowing.length);
  });

  it('after your first card, the lanes tip makes the =SUM row glow, until dismissed', () => {
    localStorage.setItem('qbr.tips.v1', JSON.stringify(['place', 'cost']));
    render(<Game seed={5} />);
    fireEvent.click(q('.hand [data-card][data-playable="true"]')!);
    const target = all('[data-cell]').find((c) => c.classList.contains('legal'))!;
    fireEvent.click(target);
    fireEvent.click(target);
    expect(q('[data-tip]')!.textContent).toMatch(/=SUM/);
    expect(all('[data-lane-total][data-guide]')).toHaveLength(3);
    fireEvent.click(q('[data-tip]')!);
    expect(all('[data-guide]')).toHaveLength(0);
  });
});
