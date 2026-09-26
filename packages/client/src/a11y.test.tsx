import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { abilityBadge, abilityWords, cardLabel, spreadWords } from './a11y.js';
import { CardFace } from './CardFace.js';
import { Game } from './Game.js';

// Apple's App Store accessibility labels list "Differentiate without colour alone"
// and VoiceOver. Ownership on the board used to be red vs blue only, and cells
// had no accessible names.

describe('describing a card in words', () => {
  it('spreads read in screen terms: ahead is up, lanes are left/right', () => {
    expect(spreadWords('coldcall')).toBe('1 ahead');
    expect(spreadWords('reorg')).toBe('1 ahead, 2 ahead');
    expect(spreadWords('standup')).toBe('left, right');
    expect(spreadWords('headcount')).toBe('nowhere');
  });

  it('a card label says name, cost, value and spread', () => {
    expect(cardLabel('memo')).toBe('Memo, costs $, value 1, spreads left, right, 1 ahead');
    expect(cardLabel('stakeholder')).toBe('Stakeholder, costs $$, value 3, spreads ahead-left, 1 ahead, ahead-right');
  });
  it('ability cards say what their ability does, on the face and in the label', () => {
    expect(abilityWords('memo')).toBeNull();
    expect(abilityWords('teambuilding')).toBe('gives +2 to your cards it reaches');
    expect(abilityWords('pip')).toBe('gives −2 to every rival card in its lane; a card at 0 is removed');
    expect(abilityBadge('teambuilding')).toBe('+2');
    expect(abilityBadge('pip')).toBe('−2 lane');
    expect(cardLabel('pip')).toMatch(/spreads ahead-left, 1 ahead, ahead-right; gives −2 to every rival card in its lane/);
    const { container } = render(<CardFace id="pip" />);
    expect(container.querySelector('[data-ability="weaken"]')!.textContent).toBe('−2 lane');
    cleanup();
  });
});

describe('the board without colour', () => {
  beforeEach(() => localStorage.setItem('qbr.tips.v1', JSON.stringify(['place', 'cost'])));
  afterEach(cleanup);

  it('every cell names its spreadsheet address and owner, and carries a non-colour owner hook', () => {
    render(<Game seed={5} />);
    const cells = Array.from(document.querySelectorAll<HTMLElement>('[data-cell]'));
    expect(cells).toHaveLength(15);
    for (const c of cells) {
      expect(c.getAttribute('aria-label')).toMatch(/^[ABC][1-5], /);
      expect(['you', 'them', 'none']).toContain(c.dataset.owner);
    }
    // Your home row is row 5, Finance's row 1 (vertical board).
    expect(document.querySelector('[data-sr="4"][data-sc="0"]')!.getAttribute('aria-label')).toBe('A5, your cell, budget $');
    expect(document.querySelector('[data-sr="0"][data-sc="2"]')!.getAttribute('aria-label')).toBe("C1, Finance's cell, budget $");
    expect(document.querySelector<HTMLElement>('[data-sr="2"][data-sc="1"]')!.dataset.owner).toBe('none');
  });

  it('hand cards and lane totals are labelled', () => {
    render(<Game seed={5} />);
    for (const b of Array.from(document.querySelectorAll<HTMLElement>('[data-card]'))) {
      expect(b.getAttribute('aria-label')).toMatch(/, costs \$+, value \d+, spreads /);
    }
    const grey = document.querySelector('[data-card][data-playable="false"]')!;
    expect(grey.getAttribute('aria-label')).toMatch(/ — can't play: needs a \$\$+ cell$/);
    const sums = Array.from(document.querySelectorAll<HTMLElement>('[data-lane-total]'));
    expect(sums.map((s) => s.getAttribute('aria-label'))).toEqual([
      'Sales: you 0, Finance 0, tied',
      'Ops: you 0, Finance 0, tied',
      'R&D: you 0, Finance 0, tied',
    ]);
  });
});
