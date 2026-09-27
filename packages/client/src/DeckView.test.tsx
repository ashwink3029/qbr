import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { STARTER_DECK, STAR_CAP, UNLOCKABLES, deckStars, defaultDeck, playerDeck, stars } from '@qbr/shared';
import { App } from './App.js';
import { DeckView } from './DeckView.js';

afterEach(cleanup);
beforeEach(() => localStorage.clear());

const q = (sel: string) => document.querySelector<HTMLElement>(sel);
const all = (sel: string) => Array.from(document.querySelectorAll<HTMLElement>(sel));

describe('deck builder: the collection', () => {
  it('a new player sees their 15 starter cards and EVERY winnable card greyed out, with how to earn it', () => {
    render(<DeckView progress={{ bestRung: 0, careers: 0 }} saved={null} onSave={() => {}} onClose={() => {}} />);
    expect(q('[data-deck-view] .titlebar')!.textContent).toMatch(/15\/15/);
    expect(all('[data-deck-card]')).toHaveLength(11); // 11 distinct starter cards
    expect(q('[data-deck-card="memo"] .copies')!.textContent).toBe('×2');
    expect(all('[data-locked-card]')).toHaveLength(UNLOCKABLES.length);
    expect(q('[data-deck-view]')!.textContent).toMatch(new RegExp(`0/${UNLOCKABLES.length} unlocked`));
    expect(q('[data-locked-card="takeover"]')!.textContent).toMatch(/Beat the VP/);
    // Locked cards show their face (greyed) and progress toward the unlock.
    expect(q('[data-locked-card="redpen"] .card-name, [data-locked-card="redpen"]')!.textContent).toMatch(/Red Pen/);
    expect(q('[data-locked-card="redpen"]')!.textContent).toMatch(/0\/10/);
  });

  it('progress shows on locked cards; unlocked specials join the default deck in place', () => {
    render(<DeckView progress={{ bestRung: 2, careers: 1, meetings: 7 }} saved={null} onSave={() => {}} onClose={() => {}} />);
    expect(q('[data-deck-card="coffeerun"]')).toBeTruthy();
    expect(q('[data-deck-card="perfreview"]')).toBeTruthy();
    expect(q('[data-deck-card="slidedeck"]')).toBeNull(); // replaced by Performance Review
    expect(q('[data-locked-card="redpen"]')!.textContent).toMatch(/7\/10/);
    // Sticky Note (3 meetings) and High Five (6) are owned, not in the default deck.
    expect(q('[data-coll-card="stickynote"]')!.textContent).toMatch(/2 left/);
    expect(q('[data-locked-card="stickynote"]')).toBeNull();
  });
});

describe('deck builder: building', () => {
  it('take a card out, put a collected one in; a full, legal deck is saved', () => {
    const saves: (string[] | null)[] = [];
    render(
      <DeckView progress={{ bestRung: 0, careers: 0, meetings: 3 }} saved={null} onSave={(d) => saves.push(d)} onClose={() => {}} />,
    );
    fireEvent.click(q('[data-deck-card="coldcall"]')!);
    expect(q('[data-deck-view] .titlebar')!.textContent).toMatch(/14\/15/);
    expect(q('[data-deck-status]')!.textContent).toMatch(/Add 1 more/);
    expect(saves).toEqual([]); // an incomplete deck is never saved
    fireEvent.click(q('[data-coll-card="stickynote"]')!);
    expect(q('[data-deck-view] .titlebar')!.textContent).toMatch(/15\/15/);
    expect(saves).toHaveLength(1);
    expect(saves[0]!.filter((c) => c === 'coldcall')).toHaveLength(1);
    expect(saves[0]).toContain('stickynote');
    // A full deck can't take more: the tap says how to make room instead.
    expect(q('[data-coll-card="stickynote"]')!.getAttribute('aria-disabled')).toBe('true');
    fireEvent.click(q('[data-coll-card="stickynote"]')!);
    expect(saves).toHaveLength(1);
    expect(q('[data-deck-status]')!.textContent).toMatch(/full/);
  });

  it('you cannot add more copies than you own', () => {
    render(<DeckView progress={{ bestRung: 0, careers: 0 }} saved={null} onSave={() => {}} onClose={() => {}} />);
    fireEvent.click(q('[data-deck-card="vision"]')!);
    // Both Memos are already in the deck: none left to add.
    expect(q('[data-coll-card="memo"]')!.textContent).toMatch(/0 left/);
    expect((q('[data-coll-card="memo"]') as HTMLButtonElement).hasAttribute('disabled')).toBe(true);
  });

  it('"Default deck" goes back to the starter deck with your specials', () => {
    const saves: (string[] | null)[] = [];
    const custom = [...STARTER_DECK.slice(0, -1), 'stickynote'];
    render(<DeckView progress={{ bestRung: 1, careers: 1, meetings: 3 }} saved={custom} onSave={(d) => saves.push(d)} onClose={() => {}} />);
    expect(q('[data-deck-card="stickynote"]')).toBeTruthy();
    fireEvent.click(q('[data-deck-default]')!);
    expect(saves).toEqual([null]);
    expect(q('[data-deck-card="stickynote"]')).toBeNull();
    expect(q('[data-deck-card="coffeerun"]')).toBeTruthy();
  });
});

describe('deck builder: the star limit', () => {
  const veteran = { bestRung: 5, careers: 40, stakeCleared: 4, promotions: 10, meetings: 100 };

  it('shows every card’s stars and the deck’s total against the limit', () => {
    render(<DeckView progress={{ bestRung: 0, careers: 0 }} saved={null} onSave={() => {}} onClose={() => {}} />);
    expect(q('[data-star-meter]')!.textContent).toMatch(new RegExp(`${deckStars(STARTER_DECK)}\\s*/\\s*${STAR_CAP}`));
    expect(q('[data-deck-card="memo"] [data-stars]')!.getAttribute('data-stars')).toBe(String(stars('memo')));
    expect(q('[data-locked-card="takeover"] [data-stars]')).toBeTruthy(); // locked cards show theirs too
  });

  it('a card that would break the limit is refused, with the reason', () => {
    const saves: (string[] | null)[] = [];
    render(<DeckView progress={veteran} saved={null} onSave={(d) => saves.push(d)} onClose={() => {}} />);
    // Take out the cheapest-rated card, then try to add the strongest until over the cap.
    const low = [...new Set(defaultDeck(veteran))].sort((a, b) => stars(a) - stars(b))[0]!;
    fireEvent.click(q(`[data-deck-card="${low}"]`)!);
    const room = STAR_CAP - deckStars(defaultDeck(veteran)) + stars(low);
    const tooBig = UNLOCKABLES.map((u) => u.id).find((id) => stars(id) > room && !defaultDeck(veteran).includes(id));
    if (!tooBig) return; // every card fits: nothing to refuse
    fireEvent.click(q(`[data-coll-card="${tooBig}"]`)!);
    expect(q('[data-deck-view] .titlebar')!.textContent).toMatch(/14\/15/);
    expect(q('[data-deck-status]')!.textContent).toMatch(/★/);
    expect(saves).toEqual([]);
  });

  it('Bindy explains stars the first time, once', () => {
    render(<DeckView progress={{ bestRung: 0, careers: 0 }} saved={null} onSave={() => {}} onClose={() => {}} />);
    expect(q('[data-tip]')!.textContent).toMatch(/★/);
    fireEvent.click(q('[data-tip]')!);
    expect(q('[data-tip]')).toBeNull();
    cleanup();
    render(<DeckView progress={{ bestRung: 0, careers: 0 }} saved={null} onSave={() => {}} onClose={() => {}} />);
    expect(q('[data-tip]')).toBeNull();
  });
});

describe('Home -> Your deck', () => {
  it('a built deck stays built across launches', () => {
    localStorage.setItem('qbr.record.v1', JSON.stringify({ runs: 1, bestMeetings: 3, meetings: 3 }));
    render(<App seed={5} />);
    fireEvent.click(q('[data-deck]')!);
    fireEvent.click(q('[data-deck-card="coldcall"]')!);
    fireEvent.click(q('[data-coll-card="stickynote"]')!);
    cleanup();
    render(<App seed={5} />);
    fireEvent.click(q('[data-deck]')!);
    expect(q('[data-deck-card="stickynote"]')).toBeTruthy();
  });

  it('an older benched special carries over as a built deck', () => {
    localStorage.setItem('qbr.record.v1', JSON.stringify({ runs: 1, bestMeetings: 2 }));
    localStorage.setItem('qbr.bench.v1', JSON.stringify(['coffeerun']));
    render(<App seed={5} />);
    fireEvent.click(q('[data-deck]')!);
    expect(q('[data-deck-card="coffeerun"]')).toBeNull();
    expect(q('[data-deck-card="perfreview"]')).toBeTruthy();
    expect(JSON.parse(localStorage.getItem('qbr.deck.v1')!)).toEqual(playerDeck({ bestRung: 2, careers: 1 }, ['coffeerun']));
  });

  it('opens from Home, reflects the saved record, and closes back to Home', () => {
    localStorage.setItem('qbr.record.v1', JSON.stringify({ runs: 3, bestMeetings: 1 }));
    render(<App seed={5} />);
    fireEvent.click(q('[data-deck]')!);
    expect(q('[data-home]')).toBeNull();
    expect(q('[data-deck-card="coffeerun"]')).toBeTruthy(); // beat the Intern
    expect(q('[data-deck-card="gossip"]')).toBeTruthy(); // 3 careers
    fireEvent.click(q('[data-deck-view] [data-exit]')!);
    expect(q('[data-home]')).toBeTruthy();
  });

  it("a promotion on a harder stake unlocks that stake's ability special", () => {
    localStorage.setItem('qbr.record.v1', JSON.stringify({ runs: 1, bestMeetings: 5, stakeCleared: 2 }));
    render(<App seed={5} />);
    fireEvent.click(q('[data-deck]')!);
    expect(q('[data-deck-card="teambuilding"]')).toBeTruthy(); // promoted on Budget freeze
    expect(q('[data-deck-card="pip"]')).toBeNull(); // needs Restructuring
    expect(q('[data-locked-card="pip"]')!.textContent).toMatch(/Restructuring/);
  });
});
