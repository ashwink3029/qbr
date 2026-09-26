import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { STARTER_DECK, coworkerReducer, coworkerStart, type CoworkerMessage, type CoworkerState } from '@qbr/shared';
import { App } from './App.js';
import type { NetLink } from './net/multipeerLink.js';
import { loopbackPair, type Transport } from './net/transport.js';

// The whole coworker flow on ONE phone, with the other phone scripted: Home ->
// "Play your coworker" -> a coworker turns up -> they ask -> "Let's go" -> the match,
// with them across the table.

afterEach(cleanup);
beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('qbr.tips.v1', JSON.stringify(['place', 'cost', 'lanes', 'lives', 'takeover', 'closeout-ahead', 'closeout-behind']));
});
const q = (sel: string) => document.querySelector<HTMLElement>(sel);
const flush = async () => {
  for (let i = 0; i < 6; i++) await act(async () => await Promise.resolve());
};

/** A fake NetLink: `pair()` connects us to `them` over a loopback. */
function fakeLink() {
  const [mine, theirs] = loopbackPair();
  const listeners: { onConnected?: (t: Transport) => void }[] = [];
  const log = { paired: 0, cancelled: 0 };
  const link: NetLink = {
    pair() {
      log.paired++;
      queueMicrotask(() => listeners.forEach((l) => l.onConnected?.(mine)));
    },
    cancel() {
      log.cancelled++;
    },
    listen(l) {
      listeners.push(l);
      return () => undefined;
    },
  };
  const got: CoworkerMessage[] = [];
  theirs.onMessage((m) => got.push(m));
  return { link, theirs, got, log };
}

describe('Home -> Play your coworker', () => {
  it('is only offered where nearby play exists', () => {
    render(<App seed={5} />);
    expect(q('[data-coworker]')).toBeNull(); // no native transport in this environment
  });

  it('a coworker asks, you accept, and the match starts with them across the table', async () => {
    const { link, theirs, got, log } = fakeLink();
    render(<App seed={5} nearby={() => link} />);
    fireEvent.click(q('[data-coworker]')!);
    expect(q('[data-coworker-screen]')!.textContent).toMatch(/phone nearby/);
    expect(log.paired).toBe(0); // discovery (and iOS's permission prompt) waits for your tap
    fireEvent.change(q('[data-coworker-name]')!, { target: { value: 'Ada' } });
    fireEvent.click(q('[data-coworker-look]')!);
    await flush();
    expect(log.paired).toBe(1);
    expect(q('[data-coworker-screen]')!.textContent).toMatch(/A coworker is nearby/);
    expect(q('[data-coworker-play]')).toBeTruthy();
    // They tap first.
    theirs.send({ t: 'join-req', name: 'Bo' });
    await flush();
    expect(q('[data-coworker-screen]')!.textContent).toMatch(/Bo wants to play/);
    fireEvent.click(q('[data-coworker-accept]')!);
    await flush();
    expect(got).toContainEqual({ t: 'join-ok' });
    // The scripted coworker now runs the real protocol (token 1: I host).
    let peer: CoworkerState;
    const start = coworkerStart(1, 'Bo', STARTER_DECK);
    peer = start.state;
    start.send.forEach((m) => theirs.send(m));
    theirs.onMessage((msg) => {
      const r = coworkerReducer(peer, { t: 'recv', msg });
      peer = r.state;
      r.send.forEach((m) => theirs.send(m));
    });
    for (const m of got) if (m.t === 'hello' || m.t === 'start') peer = coworkerReducer(peer, { t: 'recv', msg: m }).state;
    await flush();
    expect(q('[data-coworker-game]')).toBeTruthy();
    expect(q('[data-opponent]')!.textContent).toMatch(/Bo/);
    expect(got.find((m) => m.t === 'hello')).toMatchObject({ name: 'Ada' });
  });

  it('Settings keeps your coworker name', async () => {
    const { link } = fakeLink();
    render(<App seed={5} nearby={() => link} />);
    fireEvent.click(q('[data-coworker]')!);
    fireEvent.change(q('[data-coworker-name]')!, { target: { value: 'Ada' } });
    fireEvent.click(q('[data-coworker-look]')!);
    await flush();
    fireEvent.click(q('[data-coworker-screen] [data-exit]')!);
    expect(q('[data-home]')).toBeTruthy();
    fireEvent.click(q('[data-coworker]')!);
    expect((q('[data-coworker-name]') as HTMLInputElement).value).toBe('Ada');
  });
});
