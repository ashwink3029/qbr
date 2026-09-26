import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { App } from './App.js';
import * as feedback from './feedback.js';
import { DEFAULT_SETTINGS, loadSettings } from './settings.js';

afterEach(cleanup);
beforeEach(() => localStorage.clear());

const q = (sel: string) => document.querySelector<HTMLElement>(sel);

describe('feedback respects the settings', () => {
  it('with sound off, no audio engine is even created; with sound on, it is', () => {
    const made = vi.fn();
    class FakeCtx {
      state = 'running';
      currentTime = 0;
      sampleRate = 8000;
      destination = {};
      constructor() {
        made();
      }
      createGain() {
        return { gain: { value: 0, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect: () => ({ connect() {} }) };
      }
      createOscillator() {
        return { type: '', frequency: { value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect: () => ({ connect() {} }), start() {}, stop() {} };
      }
      createBuffer() {
        return { getChannelData: () => new Float32Array(8) };
      }
      createBufferSource() {
        return { buffer: null, connect: () => ({ connect: () => ({ connect() {} }) }), start() {} };
      }
      createBiquadFilter() {
        return { type: '', frequency: { value: 0 }, Q: { value: 0 }, connect: () => ({ connect: () => ({ connect() {} }) }) };
      }
      resume() {
        return Promise.resolve();
      }
    }
    (window as unknown as { AudioContext: unknown }).AudioContext = FakeCtx;
    try {
      feedback.setFeedbackPrefs({ sound: false, haptics: true });
      feedback.cardTapped();
      feedback.cardConfirmed();
      expect(made).not.toHaveBeenCalled();
      feedback.setFeedbackPrefs({ sound: true, haptics: true });
      feedback.cardTapped();
      expect(made).toHaveBeenCalled();
    } finally {
      delete (window as unknown as { AudioContext?: unknown }).AudioContext;
      feedback.setFeedbackPrefs(DEFAULT_SETTINGS);
    }
  });
});

describe('Settings from Home', () => {
  it('toggles sound and haptics and remembers them', () => {
    render(<App seed={5} />);
    fireEvent.click(q('[data-settings]')!);
    expect(q('[data-settings-view]')).toBeTruthy();
    const sound = q('[data-toggle="sound"]') as HTMLInputElement;
    const haptics = q('[data-toggle="haptics"]') as HTMLInputElement;
    expect(sound.checked).toBe(true);
    expect(haptics.checked).toBe(true);
    fireEvent.click(sound);
    fireEvent.click(haptics);
    expect(loadSettings()).toEqual({ sound: false, haptics: false });
    cleanup();
    render(<App seed={5} />);
    fireEvent.click(q('[data-settings]')!);
    expect((q('[data-toggle="sound"]') as HTMLInputElement).checked).toBe(false);
  });

  it('shows tips again', () => {
    localStorage.setItem('qbr.tips.v1', JSON.stringify(['place', 'cost']));
    render(<App seed={5} />);
    fireEvent.click(q('[data-settings]')!);
    fireEvent.click(q('[data-reset-tips]')!);
    expect(localStorage.getItem('qbr.tips.v1')).toBeNull();
  });

  it('reset progress needs a second, explicit tap, then clears the record', () => {
    localStorage.setItem('qbr.record.v1', JSON.stringify({ runs: 3, promotions: 1, bestMeetings: 5, wins: 2 }));
    render(<App seed={5} />);
    expect(q('[data-record]')!.textContent).toMatch(/Careers 3/);
    fireEvent.click(q('[data-settings]')!);
    fireEvent.click(q('[data-reset-progress]')!);
    expect(localStorage.getItem('qbr.record.v1')).not.toBeNull(); // not yet
    fireEvent.click(q('[data-reset-confirm]')!);
    fireEvent.click(q('[data-settings-view] [data-exit]')!);
    expect(q('[data-record]')!.textContent).toMatch(/No years on record/);
  });
});
