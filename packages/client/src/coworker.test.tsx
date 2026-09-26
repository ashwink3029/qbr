import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { COLS, STARTER_DECK, colOf, deckWith, rowOf, idx } from '@qbr/shared';
import { NetGame } from './NetGame.js';
import { loopbackPair } from './net/transport.js';

// Two phones in one page: a host and a guest NetGame joined by an in-memory link.
// Each sees the match from its own chair; a card played on one screen lands,
// mirrored, on the other.

afterEach(cleanup);
beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('qbr.tips.v1', JSON.stringify(['place', 'cost', 'lanes', 'lives', 'takeover', 'closeout-ahead', 'closeout-behind']));
});

const flush = async () => {
  for (let i = 0; i < 5; i++) await act(async () => await Promise.resolve());
};

function twoPhones() {
  const [a, b] = loopbackPair();
  const left: string[] = [];
  const host = document.createElement('div');
  const guest = document.createElement('div');
  document.body.append(host, guest);
  render(
    <NetGame transport={a} name="Ada Host" deck={deckWith(['coffeerun'])} token={900} seed={11} onEnd={() => {}} onLeave={(r) => left.push(`host: ${r}`)} />,
    { container: host },
  );
  render(
    <NetGame transport={b} name="Bo Guest" deck={STARTER_DECK} token={100} onEnd={() => {}} onLeave={(r) => left.push(`guest: ${r}`)} />,
    { container: guest },
  );
  const inH = (sel: string) => host.querySelector<HTMLElement>(sel);
  const inG = (sel: string) => guest.querySelector<HTMLElement>(sel);
  return { host, guest, inH, inG, left, a, b };
}

describe('Play your coworker: two phones, one match', () => {
  it('each phone shows the OTHER person across the table, and plays its own deck', async () => {
    const { inH, inG, host, guest } = twoPhones();
    await flush();
    expect(inH('[data-coworker-game]')!.dataset.seat).toBe('0');
    expect(inG('[data-coworker-game]')!.dataset.seat).toBe('1');
    expect(inH('[data-opponent]')!.textContent).toMatch(/Bo Guest/);
    expect(inG('[data-opponent]')!.textContent).toMatch(/Ada Host/);
    // Each hand comes from its own deck: only the host brought Coffee Run.
    const handIds = (root: HTMLElement) => Array.from(root.querySelectorAll<HTMLElement>('.hand [data-card]')).map((e) => e.dataset.card!);
    for (const id of handIds(guest)) expect(STARTER_DECK).toContain(id);
    expect(handIds(host).length).toBeGreaterThan(0);
  });

  it('a card placed on one phone lands, mirrored, on the other — then it is their turn', async () => {
    const { inH, inG, left } = twoPhones();
    await flush();
    // Whoever moves first plays their first legal card.
    const hostFirst = !inH('[data-pass]')!.hasAttribute('disabled');
    const [me, them] = hostFirst ? [inH, inG] : [inG, inH];
    expect(them('[data-pass]')!.hasAttribute('disabled')).toBe(true);
    fireEvent.click(me('[data-card][data-playable="true"]')!);
    const cell = me('.cell.legal')!;
    const i = Number(cell.dataset.cell);
    const cardName = me('.hand .sel .cname')!.textContent!;
    fireEvent.click(cell);
    fireEvent.click(cell);
    await flush();
    expect(me(`[data-cell="${i}"] .pname`)!.textContent).toBe(cardName);
    // On the other phone the same card sits on the mirrored cell, as the OPPONENT's.
    const mirrored = idx(rowOf(i), COLS - 1 - colOf(i));
    expect(them(`[data-cell="${mirrored}"] .pname`)!.textContent).toBe(cardName);
    expect(them(`[data-cell="${mirrored}"]`)!.dataset.owner).toBe('them');
    expect(me(`[data-cell="${i}"]`)!.dataset.owner).toBe('you');
    // Now it's their move; they pass and it comes back.
    expect(them('[data-pass]')!.hasAttribute('disabled')).toBe(false);
    fireEvent.click(them('[data-pass]')!);
    await flush();
    expect(me('[data-pass]')!.hasAttribute('disabled')).toBe(false);
    expect(left).toEqual([]);
  });

  it('after a year, both tap Rematch and a fresh year starts on both phones; each year is recorded once', async () => {
    const [a, b] = loopbackPair();
    const ends: string[] = [];
    const host = document.createElement('div');
    const guest = document.createElement('div');
    document.body.append(host, guest);
    render(<NetGame transport={a} name="Ada" deck={STARTER_DECK} token={900} seed={11} onEnd={(w) => ends.push(`host ${w}`)} onLeave={() => {}} />, { container: host });
    render(<NetGame transport={b} name="Bo" deck={STARTER_DECK} token={100} onEnd={(w) => ends.push(`guest ${w}`)} onLeave={() => {}} />, { container: guest });
    await flush();
    // Everyone passes: each quarter ties (both lose a life), so the year ends flat.
    for (let k = 0; k < 40 && !host.querySelector('[data-coworker-result]'); k++) {
      for (const root of [host, guest]) {
        const pass = root.querySelector<HTMLButtonElement>('[data-pass]');
        if (pass && !pass.disabled) fireEvent.click(pass);
        const btn = root.querySelector<HTMLButtonElement>('[data-dialog-button]');
        if (btn) fireEvent.click(btn);
      }
      await flush();
    }
    for (const root of [host, guest]) {
      const btn = root.querySelector<HTMLButtonElement>('[data-dialog-button]');
      if (btn) fireEvent.click(btn);
    }
    await flush();
    expect(host.querySelector('[data-coworker-result]')!.textContent).toMatch(/flat year with Bo/);
    expect(guest.querySelector('[data-coworker-result]')!.textContent).toMatch(/flat year with Ada/);
    expect(ends.sort()).toEqual(['guest null', 'host null']);
    fireEvent.click(guest.querySelector('[data-rematch]')!);
    await flush();
    expect(guest.querySelector('[data-rematch]')!.textContent).toMatch(/Waiting for Ada/);
    expect(host.querySelector('[data-coworker-result]')!.textContent).toMatch(/Bo wants a rematch/);
    fireEvent.click(host.querySelector('[data-rematch]')!);
    await flush();
    // A fresh year on both: no result panel, full lives, a clean board.
    expect(host.querySelector('[data-coworker-game]')).toBeTruthy();
    expect(guest.querySelector('[data-coworker-game]')).toBeTruthy();
    expect(host.querySelectorAll('.placed')).toHaveLength(0);
    expect(host.querySelector('[data-title]')!.textContent).toMatch(/Q1/);
    expect(ends).toHaveLength(2); // the new year hasn't recorded anything
  });

  it('if the coworker leaves, the other phone is told', async () => {
    const { left, a } = twoPhones();
    await flush();
    a.close();
    await flush();
    expect(left.some((l) => /guest: Your coworker left/.test(l))).toBe(true);
  });
});
