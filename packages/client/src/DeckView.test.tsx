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
    expect(q('[data-deck-view]')!.textContent).toMatch(new RegExp(`2/${SPECIALS.length} unlocked`));
  });
});

describe('deck building: bench a special', () => {
  it('each unlocked special can be benched; its starter card comes back into the deck', () => {
    let benched: string[] = [];
    const { rerender } = render(
      <DeckView progress={{ bestRung: 2, careers: 1 }} benched={benched} onBench={(b) => (benched = b)} onClose={() => {}} />,
    );
    expect(all('[data-bench]')).toHaveLength(2); // Coffee Run, Performance Review
    expect(q('[data-bench="coffeerun"]')!.getAttribute('aria-pressed')).toBe('false');
    fireEvent.click(q('[data-bench="coffeerun"]')!);
    expect(benched).toEqual(['coffeerun']);
    rerender(<DeckView progress={{ bestRung: 2, careers: 1 }} benched={benched} onBench={(b) => (benched = b)} onClose={() => {}} />);
    expect(q('[data-owned-card="coffeerun"]')).toBeNull();
    expect(q('[data-owned-card="memo"] .copies')!.textContent).toBe('×2');
    expect(q('[data-bench="coffeerun"]')!.getAttribute('aria-pressed')).toBe('true');
    expect(q('[data-bench="coffeerun"]')!.textContent).toMatch(/Benched/);
    expect(q('[data-deck-view] .titlebar')!.textContent).toMatch(/15 cards/);
    fireEvent.click(q('[data-bench="coffeerun"]')!);
    expect(benched).toEqual([]);
  });
});

describe('Home -> Your deck', () => {
  it('a benched special stays benched across launches', () => {
    localStorage.setItem('qbr.record.v1', JSON.stringify({ runs: 1, bestMeetings: 1 }));
    render(<App seed={5} />);
    fireEvent.click(q('[data-deck]')!);
    fireEvent.click(q('[data-bench="coffeerun"]')!);
    expect(q('[data-owned-card="coffeerun"]')).toBeNull();
    cleanup();
    render(<App seed={5} />);
    fireEvent.click(q('[data-deck]')!);
    expect(q('[data-owned-card="coffeerun"]')).toBeNull();
    expect(q('[data-bench="coffeerun"]')!.getAttribute('aria-pressed')).toBe('true');
  });

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
  it('a promotion on a harder stake unlocks that stake\'s ability special', () => {
    localStorage.setItem('qbr.record.v1', JSON.stringify({ runs: 1, bestMeetings: 5, stakeCleared: 2 }));
    render(<App seed={5} />);
    fireEvent.click(q('[data-deck]')!);
    expect(q('[data-owned-card="teambuilding"]')).toBeTruthy(); // promoted on Budget freeze
    expect(q('[data-owned-card="pip"]')).toBeNull(); // needs Restructuring
    expect(q('[data-locked-card="pip"]')!.textContent).toMatch(/Restructuring/);
  });
});
