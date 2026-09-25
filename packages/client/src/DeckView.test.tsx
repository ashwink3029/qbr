import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { SPECIALS } from '@qbr/shared';
import { App } from './App.js';
import { DeckView } from './DeckView.js';

afterEach(cleanup);

const q = (sel: string) => document.querySelector<HTMLElement>(sel);
const all = (sel: string) => Array.from(document.querySelectorAll<HTMLElement>(sel));

describe('deck view', () => {
  it('a new player owns the 15-card starter deck and sees every special locked, with how to earn it', () => {
    render(<DeckView progress={{ bestRung: 0, careers: 0 }} onClose={() => {}} />);
    expect(q('[data-deck-view] .titlebar')!.textContent).toMatch(/15 cards/);
    expect(all('[data-owned-card]')).toHaveLength(11); // 11 distinct starter cards
    expect(q('[data-owned-card="memo"] .copies')!.textContent).toBe('×2');
    expect(all('[data-locked-card]')).toHaveLength(SPECIALS.length);
    expect(q('[data-locked-card="takeover"]')!.textContent).toMatch(/Beat the VP[\s\S]*replaces a Vision Statement/);
  });

  it('unlocked specials join the deck in place of the cards they replace', () => {
    render(<DeckView progress={{ bestRung: 2, careers: 1 }} onClose={() => {}} />);
    expect(q('[data-owned-card="coffeerun"]')).toBeTruthy();
    expect(q('[data-owned-card="perfreview"]')).toBeTruthy();
    expect(q('[data-owned-card="slidedeck"]')).toBeNull(); // replaced by Performance Review
    expect(q('[data-owned-card="memo"] .copies')).toBeNull(); // one Memo left
    expect(q('[data-deck-view] .titlebar')!.textContent).toMatch(/15 cards/);
    expect(q('[data-deck-view]')!.textContent).toMatch(/2\/6 unlocked/);
  });
});

describe('Home -> Your deck', () => {
  beforeEach(() => localStorage.clear());

  it('opens from Home, reflects the saved record, and closes back to Home', () => {
    localStorage.setItem('qbr.record.v1', JSON.stringify({ runs: 3, bestMeetings: 1 }));
    render(<App seed={5} />);
    fireEvent.click(q('[data-deck]')!);
    expect(q('[data-home]')).toBeNull();
    expect(q('[data-owned-card="coffeerun"]')).toBeTruthy(); // beat the Intern
    expect(q('[data-owned-card="gossip"]')).toBeTruthy(); // 3 careers
    fireEvent.click(q('[data-deck-view] [data-exit]')!);
    expect(q('[data-home]')).toBeTruthy();
  });
});
