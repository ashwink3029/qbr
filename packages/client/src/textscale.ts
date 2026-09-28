// The iOS text-size setting (Dynamic Type), for the text that floats OVER the board — tips
// and result dialogs — so it can grow without moving the fixed board layout. WebKit sizes
// `font: -apple-system-body` from the setting (17px at the default); elsewhere (Chrome,
// jsdom) it is unsupported and the scale stays 1. Styles read it as var(--text-scale).

/** Default size of -apple-system-body, and the largest scale we apply. */
const BODY_PX = 17;
const MAX_SCALE = 2.4;

export function textScaleFrom(bodyPx: number): number {
  if (!Number.isFinite(bodyPx)) return 1;
  return Math.min(MAX_SCALE, Math.max(1, bodyPx / BODY_PX));
}

export function applyTextScale(): void {
  if (typeof CSS === 'undefined' || !CSS.supports('font', '-apple-system-body')) return;
  const probe = document.createElement('span');
  probe.style.font = '-apple-system-body';
  probe.style.position = 'absolute';
  probe.style.visibility = 'hidden';
  document.body.appendChild(probe);
  const px = parseFloat(getComputedStyle(probe).fontSize);
  probe.remove();
  document.documentElement.style.setProperty('--text-scale', String(textScaleFrom(px)));
}

/** Measure now and whenever the app comes back to the foreground (the setting may have changed). */
export function watchTextScale(): void {
  applyTextScale();
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') applyTextScale();
  });
}
