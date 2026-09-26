// Sound + haptics for the three moments of a play — tap a card, place it
// (preview), confirm it (commit) — plus a "can't afford that" variant of the tap,
// and the moments a play or a year resolves to: takeover flips, ability hits,
// quarter and year results, and the end of a career (promotion, unlocks).
//
// Audio is WebAudio synthesis (no asset files), borrowed in shape from cubes /
// rushie: one shared context, primed on the first user gesture (iOS will not
// start audio otherwise), silent when audio is unavailable. Haptics use the
// native @capacitor/haptics plugin — `navigator.vibrate` does nothing in iOS
// WebKit, so the web fallback is simply no haptics. Every call is fire-and-
// forget and must never throw into the game.
import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

import type { MoveFx } from './motion.js';

const IS_NATIVE = Capacitor.isNativePlatform();

/** Sound and haptics switches from Settings. With sound off no audio engine
 *  is ever created; with haptics off no native call is made. */
let prefs = { sound: true, haptics: true };
export function setFeedbackPrefs(p: { readonly sound: boolean; readonly haptics: boolean }): void {
  prefs = { sound: p.sound, haptics: p.haptics };
}

let ctx: AudioContext | null = null;
let master: GainNode | null = null;

function audio(): AudioContext | null {
  if (ctx) return ctx;
  if (typeof window === 'undefined') return null;
  const Ctor =
    window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  try {
    ctx = new Ctor();
  } catch {
    return null;
  }
  master = ctx.createGain();
  master.gain.value = 0.5;
  master.connect(ctx.destination);
  return ctx;
}

/** Call from the first user gesture: iOS keeps audio suspended until then. */
export function primeAudio(): void {
  if (!prefs.sound) return;
  const c = audio();
  if (c && c.state === 'suspended') void c.resume().catch(() => {});
}

function tone(freq: number, at: number, durMs: number, peak: number, type: OscillatorType, glideTo?: number): void {
  if (!prefs.sound) return;
  const c = audio();
  if (!c || c.state !== 'running' || !master) return;
  const t0 = c.currentTime + at;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (glideTo) osc.frequency.exponentialRampToValueAtTime(glideTo, t0 + durMs / 1000);
  gain.gain.setValueAtTime(0, t0);
  gain.gain.linearRampToValueAtTime(peak, t0 + 0.004);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + durMs / 1000);
  osc.connect(gain).connect(master);
  osc.start(t0);
  osc.stop(t0 + durMs / 1000 + 0.02);
}

/** Band-passed noise burst: paper, a stamp's felt, a click. */
function noise(at: number, durMs: number, peak: number, freq: number, q = 1.2): void {
  if (!prefs.sound) return;
  const c = audio();
  if (!c || c.state !== 'running' || !master) return;
  const t0 = c.currentTime + at;
  const frames = Math.max(1, Math.floor((c.sampleRate * durMs) / 1000));
  const buf = c.createBuffer(1, frames, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < frames; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / frames) ** 2;
  const src = c.createBufferSource();
  src.buffer = buf;
  const bp = c.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = freq;
  bp.Q.value = q;
  const gain = c.createGain();
  gain.gain.value = peak;
  src.connect(bp).connect(gain).connect(master);
  src.start(t0);
}

function impact(style: ImpactStyle): void {
  if (!IS_NATIVE || !prefs.haptics) return;
  void Haptics.impact({ style }).catch(() => {});
}

function selectionTick(): void {
  if (!IS_NATIVE || !prefs.haptics) return;
  void Haptics.selectionStart()
    .then(() => Haptics.selectionChanged())
    .then(() => Haptics.selectionEnd())
    .catch(() => {});
}

function warn(): void {
  if (!IS_NATIVE || !prefs.haptics) return;
  void Haptics.notification({ type: NotificationType.Warning }).catch(() => {});
}

/** Tap a card in your hand: a light tap and a short paper flick. */
export function cardTapped(): void {
  impact(ImpactStyle.Light);
  noise(0, 45, 0.35, 3200, 0.9);
  tone(740, 0, 45, 0.035, 'triangle');
}

/** Tap a card you can't afford: a soft warning and a muted low buzz. */
export function cardDenied(): void {
  warn();
  tone(170, 0, 110, 0.05, 'square', 140);
}

/** Place it — first tap on a cell previews the spread: a selection tick and a
 *  soft cell click. */
export function cardPlaced(): void {
  selectionTick();
  noise(0, 30, 0.25, 1800, 2);
  tone(560, 0, 60, 0.04, 'sine');
}

/** Confirm it — the card lands: a medium thump, a rubber-stamp thunk, and a
 *  small two-note "approved" ding. */
export function cardConfirmed(): void {
  impact(ImpactStyle.Medium);
  noise(0, 90, 0.6, 220, 0.8);
  tone(95, 0, 120, 0.12, 'sine', 60);
  tone(880, 0.07, 110, 0.045, 'triangle');
  tone(1320, 0.12, 150, 0.035, 'triangle');
}

function notify(type: NotificationType): void {
  if (!IS_NATIVE || !prefs.haptics) return;
  void Haptics.notification({ type }).catch(() => {});
}

/** A rising (or falling) run of notes. */
function notes(freqs: readonly number[], at: number, stepMs: number, peak: number, type: OscillatorType): void {
  freqs.forEach((f, i) => tone(f, at + (i * stepMs) / 1000, stepMs * 1.6, peak, type));
}

/** What a committed move resolved to, after its own place/confirm cues. Timed to
 *  land with the flip animation (a beat after the drop). */
export function moveResolved(fx: MoveFx, human: 0 | 1): void {
  const mine = fx.by === human;
  if (fx.flip.length > 0) {
    // A card changing hands: a paper swish, gliding up when you take it, down when you lose it.
    if (!mine) impact(ImpactStyle.Light);
    noise(0.12, 120, 0.35, mine ? 2600 : 1400, 0.7);
    tone(mine ? 520 : 700, 0.12, 160, 0.05, 'triangle', mine ? 780 : 420);
  }
  if (fx.boost.length > 0) notes([990, 1320, 1760], 0.16, 45, 0.03, 'sine'); // sparkle
  if (fx.weaken.length > 0) tone(300, 0.16, 140, 0.06, 'sawtooth', 200); // a deflating blat
  if (fx.destroy.length > 0) {
    if (mine) impact(ImpactStyle.Heavy);
    noise(0.18, 200, 0.6, 700, 0.6); // crumpled paper
  }
}

/** A quarter that does not decide the year is booked. */
export function quarterEnded(outcome: 'won' | 'lost' | 'tie'): void {
  if (outcome === 'won') {
    impact(ImpactStyle.Medium);
    notes([660, 880], 0, 90, 0.05, 'triangle');
  } else if (outcome === 'lost') {
    impact(ImpactStyle.Light);
    notes([520, 390], 0, 110, 0.05, 'triangle');
  } else {
    tone(600, 0, 160, 0.04, 'triangle');
  }
}

/** The year (match) is decided: a cash-register fanfare, a flat buzzer, or a shrug. */
export function yearEnded(outcome: 'won' | 'lost' | 'tie'): void {
  if (outcome === 'won') {
    notify(NotificationType.Success);
    noise(0, 60, 0.4, 3000, 1.5); // the drawer's bell-strike
    notes([523, 659, 784, 1047], 0.05, 90, 0.06, 'triangle');
  } else if (outcome === 'lost') {
    notify(NotificationType.Error);
    tone(220, 0, 380, 0.07, 'square', 150);
  } else {
    notify(NotificationType.Warning);
    notes([587, 587], 0, 140, 0.04, 'triangle');
  }
}

/** A career is over: a promotion fanfare, then a chime per special unlocked. */
export function careerEnded(promoted: boolean, unlocked: number): void {
  if (promoted) {
    notify(NotificationType.Success);
    notes([523, 659, 784, 1047, 1319], 0, 110, 0.07, 'triangle');
  }
  for (let i = 0; i < Math.min(unlocked, 3); i++) {
    notes([1568, 2093], (promoted ? 0.7 : 0.1) + i * 0.28, 70, 0.04, 'sine');
  }
}
