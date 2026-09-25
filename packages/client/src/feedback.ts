// Sound + haptics for the three moments of a play — tap a card, place it
// (preview), confirm it (commit) — plus a "can't afford that" variant of the tap.
//
// Audio is WebAudio synthesis (no asset files), borrowed in shape from cubes /
// rushie: one shared context, primed on the first user gesture (iOS will not
// start audio otherwise), silent when audio is unavailable. Haptics use the
// native @capacitor/haptics plugin — `navigator.vibrate` does nothing in iOS
// WebKit, so the web fallback is simply no haptics. Every call is fire-and-
// forget and must never throw into the game.
import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

const IS_NATIVE = Capacitor.isNativePlatform();

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
  const c = audio();
  if (c && c.state === 'suspended') void c.resume().catch(() => {});
}

function tone(freq: number, at: number, durMs: number, peak: number, type: OscillatorType, glideTo?: number): void {
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
  if (!IS_NATIVE) return;
  void Haptics.impact({ style }).catch(() => {});
}

function selectionTick(): void {
  if (!IS_NATIVE) return;
  void Haptics.selectionStart()
    .then(() => Haptics.selectionChanged())
    .then(() => Haptics.selectionEnd())
    .catch(() => {});
}

function warn(): void {
  if (!IS_NATIVE) return;
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
