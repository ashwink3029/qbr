import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { DEFAULT_MATCH, MATCH_RULES, NO_MODS, STARTER_DECK, newMatch } from '@qbr/shared';
import { Game } from './Game.js';
import { pickTip, type TipContext } from './tips.js';

// User (2026-09-28): "I'm not clear what the green and red squares mean next to the
// opponent's name." Lives are now HEARTS (filled = left, outline = lost), both rows carry a
// small "Lives" / "Cards" label, and Bindy explains each in the first quarter.

const q = (s: string) => document.querySelector<HTMLElement>(s);
const all = (s: string) => Array.from(document.querySelectorAll<HTMLElement>(s));

const base: TipContext = {
  humanTurn: true,
  firstTurnOfMatch: false,
  selected: false,
  previewFlips: false,
  financeClosedOut: false,
  lead: 0,
  mods: NO_MODS,
  who: 'Finance',
  myCardsOnBoard: 1,
  quarterNo: 1,
  hasUnaffordable: false,
};

describe('hearts and hand are taught in the first quarter', () => {
  it('after lanes: hearts (both rows glow), then their hand (the card backs glow)', () => {
    const hearts = pickTip(base, new Set(['place', 'lanes']))!;
    expect(hearts.id).toBe('hearts');
    expect(hearts.text).toMatch(/heart/i);
    expect(hearts.points).toBe('hearts');
    const backs = pickTip(base, new Set(['place', 'lanes', 'hearts']))!;
    expect(backs.id).toBe('backs');
    expect(backs.text).toMatch(/Finance/);
    expect(backs.text).toMatch(/hand/i);
    expect(backs.points).toBe('backs');
  });
});

describe('on the board', () => {
  beforeEach(() => localStorage.setItem('qbr.tips.v1', JSON.stringify(['place', 'lanes'])));
  afterEach(cleanup);

  const withMyCard = () => {
    let seed = 1;
    for (;;) {
      const m = newMatch(seed, { player: STARTER_DECK, opponent: STARTER_DECK }, DEFAULT_MATCH, MATCH_RULES);
      if (m.quarter.toMove === 0) {
        const home = m.quarter.cells.findIndex((c) => c.owner === 0);
        const cells = m.quarter.cells.map((c, i) => (i === home ? { ...c, card: 'memo' } : c));
        return { ...m, quarter: { ...m.quarter, cells } };
      }
      seed++;
    }
  };

  it('lives are hearts with a Lives label; the opponent hand has a Cards label', () => {
    render(<Game initialMatch={withMyCard()} />);
    for (const who of ['You', 'Finance']) {
      const row = q(`[data-lives="${who}"]`)!;
      expect(row.querySelectorAll('i.on svg')).toHaveLength(2);
    }
    expect(q('.opponent')!.textContent).toMatch(/Lives/);
    expect(q('.opponent')!.textContent).toMatch(/Cards/);
    expect(q('.you-lives')!.textContent).toMatch(/Lives/);
  });

  it('the hearts tip lights both rows of hearts; dismissing it lights their hand', () => {
    render(<Game initialMatch={withMyCard()} />);
    expect(q('[data-tip]')!.textContent).toMatch(/heart/i);
    expect(all('[data-guide] [data-lives]').length).toBe(2);
    fireEvent.click(q('[data-tip]')!);
    expect(q('[data-tip]')!.textContent).toMatch(/hand/i);
    expect(q('.backs')!.closest('[data-guide]')).not.toBeNull();
  });
});
