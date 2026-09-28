import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { DEFAULT_MATCH, MATCH_RULES, NO_MODS, STARTER_DECK, newMatch } from '@qbr/shared';
import { CardFace } from './CardFace.js';
import { Game } from './Game.js';
import { cardLabel, spreadWords, takeWords } from './a11y.js';
import { pickTip, type TipContext } from './tips.js';

// Purple takeover cells (item 16): only a card's purple cells take enemy cards over.
// It is not a simple concept (user), so it is taught when met: the first purple card in
// your hand, the first purple preview, and the first time the opponent's purple takes
// one of your cards.

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
const seen = (...ids: string[]) => new Set(['place', 'lanes', ...ids]);

describe('purple on the card', () => {
  afterEach(cleanup);

  it('the glyph draws purple cells apart from green ones', () => {
    render(<CardFace id="stakeholder" />);
    expect(all('.g.take')).toHaveLength(1);
    expect(all('.g.hit')).toHaveLength(2);
    cleanup();
    render(<CardFace id="takeover" />);
    expect(all('.g.take')).toHaveLength(1);
    expect(all('.g.hit')).toHaveLength(2);
    cleanup();
    render(<CardFace id="memo" />);
    expect(all('.g.take')).toHaveLength(0);
  });

  it('words say what spreads and what takes over', () => {
    expect(spreadWords('stakeholder')).toBe('ahead-left, ahead-right');
    expect(takeWords('stakeholder')).toBe('1 ahead');
    expect(takeWords('memo')).toBeNull();
    expect(cardLabel('stakeholder')).toBe('Stakeholder, costs $$, value 3, spreads ahead-left, ahead-right; takes over 1 ahead');
    expect(cardLabel('takeover')).toMatch(/^Hostile Takeover, costs \$\$\$, value \d+, spreads ahead-left, ahead-right; takes over 1 ahead$/);
    expect(cardLabel('memo')).toBe('Memo, costs $, value 1, spreads left, right, 1 ahead');
  });
});

describe('purple is taught when it is met', () => {
  it('the first purple card in your hand: Bindy explains purple vs green, and the card glows', () => {
    const t = pickTip({ ...base, hasPurple: true }, seen())!;
    expect(t.id).toBe('purple');
    expect(t.text).toMatch(/purple/i);
    expect(t.text).toMatch(/green/i);
    expect(t.points).toBe('purple');
    expect(pickTip({ ...base, hasPurple: true }, seen('purple'))).toBeNull();
  });

  it('the first purple preview names the stripes', () => {
    const t = pickTip({ ...base, selected: true, previewFlips: true }, seen('purple'))!;
    expect(t.id).toBe('purple-preview');
    expect(t.text).toMatch(/stripes/i);
  });

  it('the first time their purple takes your card, Bindy says so and points at it', () => {
    const t = pickTip({ ...base, lostToPurple: true }, seen('purple'))!;
    expect(t.id).toBe('purple-lost');
    expect(t.text).toMatch(/Finance/);
    expect(t.points).toBe('lost');
  });
});

describe('in the game', () => {
  beforeEach(() => localStorage.setItem('qbr.tips.v1', JSON.stringify(['place', 'lanes', 'cost'])));
  afterEach(cleanup);

  it('with a Stakeholder in hand, the purple tip shows and only purple cards glow', () => {
    // Find a seed whose opening hand holds a Stakeholder (the starter deck has two).
    let seed = 1;
    while (!newMatch(seed, { player: STARTER_DECK, opponent: STARTER_DECK }, DEFAULT_MATCH, MATCH_RULES).quarter.hands[0].includes('stakeholder')) seed++;
    render(<Game seed={seed} />);
    expect(q('[data-tip]')!.textContent).toMatch(/purple/i);
    const glowing = all('.hand [data-card][data-guide]');
    expect(glowing.length).toBeGreaterThan(0);
    expect(glowing.every((c) => c.querySelector('.g.take'))).toBe(true);
  });
});
