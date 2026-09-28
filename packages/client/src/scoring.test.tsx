import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { laneLabel } from './a11y.js';
import { Game } from './Game.js';

// Backlog item 12 (user request 2026-09-27): a quarter's score is the points from the
// lanes you lead and nothing from the lanes you trail, and it should be obvious at every
// moment who owns each lane. The rule was already true (revenue()); this is presentation.

const lanes = () => Array.from(document.querySelectorAll<HTMLElement>('[data-lane-total]'));
const cells = () => Array.from(document.querySelectorAll<HTMLElement>('[data-cell]'));

function playOneCard() {
  fireEvent.click(document.querySelector<HTMLButtonElement>('[data-card][data-playable="true"]')!);
  const target = cells().find((c) => c.classList.contains('legal'))!;
  fireEvent.click(target);
  fireEvent.click(target);
}

describe('lane scores you can read at a glance', () => {
  beforeEach(() => localStorage.setItem('qbr.tips.v1', JSON.stringify(['place', 'cost', 'lanes'])));
  afterEach(cleanup);

  it('an empty lane is a plain tie: nobody leads, nothing banks', () => {
    render(<Game seed={5} />);
    for (const l of lanes()) {
      expect(l.dataset.lead).toBe('none');
      expect(l.querySelector('[data-bank]')).toBeNull();
    }
  });

  it('a lane you lead shows the value you bank, big and yours; the loser’s total is marked as scoring nothing', () => {
    render(<Game seed={5} />);
    playOneCard();
    const mine = lanes().filter((l) => l.dataset.lead === 'you');
    expect(mine.length).toBeGreaterThan(0);
    for (const l of mine) {
      expect(l.classList.contains('win')).toBe(true);
      expect(Number(l.querySelector('[data-bank]')!.textContent)).toBeGreaterThan(0);
      // The trailing side's total is shown struck through: it banks nothing.
      expect(l.querySelector('s[data-lost]')).not.toBeNull();
    }
  });

  it('the quarter score is exactly the sum of the banked lanes, for each side', () => {
    render(<Game seed={5} />);
    playOneCard();
    const banked = (who: string) =>
      lanes()
        .filter((l) => l.dataset.lead === who)
        .reduce((s, l) => s + Number(l.querySelector('[data-bank]')!.textContent), 0);
    expect(Number(document.querySelector('[data-mine]')!.textContent)).toBe(banked('you'));
    expect(Number(document.querySelector('[data-theirs]')!.textContent)).toBe(banked('them'));
  });

  it('lane labels say who banks and that the trailing side banks nothing', () => {
    expect(laneLabel(0, 5, 3, 'Finance')).toBe('Sales: you lead, banking 5; Finance 3, banks nothing');
    expect(laneLabel(1, 1, 4, 'Finance')).toBe('Ops: Finance leads, banking 4; you 1, bank nothing');
    expect(laneLabel(2, 2, 2, 'Finance')).toBe('R&D: tied 2 to 2, nobody banks');
  });
});
