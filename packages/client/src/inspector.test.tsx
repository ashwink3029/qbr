import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { STARTER_DECK } from '@qbr/shared';
import { DeckView } from './DeckView.js';
import { Game } from './Game.js';
import { abilityWords, spreadWords } from './a11y.js';

// The card inspector (/explore 2026-09-27; accessibility + UI clarity): tap and HOLD any
// card to see it large — name, cost, the spread drawn big, value, and the spread and
// ability in words. It is the honest route toward Larger Text (Next up), and it lets
// every player read a 66px hand card properly. A short tap keeps its old meaning.

const q = (s: string) => document.querySelector<HTMLElement>(s);
const all = (s: string) => Array.from(document.querySelectorAll<HTMLElement>(s));

function hold(el: HTMLElement) {
  fireEvent.pointerDown(el, { pointerType: 'touch' });
  act(() => {
    vi.advanceTimersByTime(600);
  });
  fireEvent.pointerUp(el, { pointerType: 'touch' });
  fireEvent.click(el);
}

describe('the card inspector', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.setItem('qbr.tips.v1', JSON.stringify(['place', 'cost', 'lanes']));
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('holding a hand card opens it large, in words, without selecting it', () => {
    render(<Game seed={5} />);
    const cardEl = q('.hand [data-card]')!;
    const id = cardEl.dataset.card!;
    hold(cardEl);
    const insp = q('[data-inspector]')!;
    expect(insp).toBeTruthy();
    expect(insp.dataset.inspector).toBe(id);
    expect(insp.textContent).toContain(spreadWords(id));
    expect(insp.querySelector('.glyph')).toBeTruthy();
    expect(cardEl.classList.contains('sel')).toBe(false);
  });

  it('a short tap still selects; a tap on the inspector closes it', () => {
    render(<Game seed={5} />);
    const cardEl = q('.hand [data-card][data-playable="true"]')!;
    fireEvent.pointerDown(cardEl, { pointerType: 'touch' });
    act(() => {
      vi.advanceTimersByTime(100);
    });
    fireEvent.pointerUp(cardEl, { pointerType: 'touch' });
    fireEvent.click(cardEl);
    expect(q('[data-inspector]')).toBeNull();
    expect(cardEl.classList.contains('sel')).toBe(true);
    hold(q('.hand [data-card]')!);
    fireEvent.pointerDown(q('[data-inspector]')!, { pointerType: 'touch' });
    fireEvent.click(q('[data-inspector]')!);
    expect(q('[data-inspector]')).toBeNull();
  });

  it('the click that ends a hold (landing on the overlay under the finger) does not close it', () => {
    // Real browsers send a click where the finger lifts — by then, on the overlay.
    render(<Game seed={5} />);
    hold(q('.hand [data-card]')!);
    fireEvent.click(q('[data-inspector]')!);
    expect(q('[data-inspector]')).toBeTruthy();
  });

  it('holding a card on the board inspects it too', () => {
    render(<Game seed={5} />);
    fireEvent.click(q('.hand [data-card][data-playable="true"]')!);
    const target = all('[data-cell]').find((c) => c.classList.contains('legal'))!;
    fireEvent.click(target);
    fireEvent.click(target);
    const placed = all('[data-cell]').find((c) => c.querySelector('.placed') && c.dataset.owner === 'you')!;
    hold(placed);
    expect(q('[data-inspector]')).toBeTruthy();
  });

  it('holding a card in the deck builder inspects it and does not take it out', () => {
    const saves: unknown[] = [];
    render(<DeckView progress={{ bestRung: 3, careers: 3, stakeCleared: 3 }} saved={null} onSave={(d) => saves.push(d)} onClose={() => {}} />);
    const before = q('[data-deck-view] .titlebar')!.textContent;
    hold(q('[data-deck-card="teambuilding"]')!);
    expect(q('[data-inspector]')!.textContent).toContain(abilityWords('teambuilding')!);
    expect(q('[data-deck-view] .titlebar')!.textContent).toBe(before);
    expect(saves).toEqual([]);
    expect(STARTER_DECK.length).toBe(15);
  });
});
