import { afterEach, describe, expect, it, vi } from 'vitest';
import { applyTextScale, textScaleFrom } from './textscale.js';

// Larger Text route (Next up), step 2 after the card inspector: tips and result dialogs
// follow the iOS text-size setting. WebKit exposes it as the size of `-apple-system-body`
// (17px at the default setting); we turn that into a --text-scale ratio.

describe('text scale from the iOS body size', () => {
  it('is 1 at the default setting and grows with larger text, within limits', () => {
    expect(textScaleFrom(17)).toBe(1);
    expect(textScaleFrom(23)).toBeCloseTo(23 / 17, 5);
    expect(textScaleFrom(53)).toBe(2.4); // the largest accessibility sizes are capped
    expect(textScaleFrom(14)).toBe(1); // never smaller than designed (11px minimum)
    expect(textScaleFrom(NaN)).toBe(1);
  });
});

describe('applying it', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    document.documentElement.style.removeProperty('--text-scale');
  });

  it('does nothing where -apple-system-body is unsupported (Chrome, jsdom)', () => {
    vi.stubGlobal('CSS', { supports: () => false });
    applyTextScale();
    expect(document.documentElement.style.getPropertyValue('--text-scale')).toBe('');
  });

  it('sets --text-scale from the measured body size where it is supported (WebKit)', () => {
    vi.stubGlobal('CSS', { supports: () => true });
    vi.spyOn(window, 'getComputedStyle').mockReturnValue({ fontSize: '28px' } as CSSStyleDeclaration);
    applyTextScale();
    expect(Number(document.documentElement.style.getPropertyValue('--text-scale'))).toBeCloseTo(28 / 17, 3);
  });
});
