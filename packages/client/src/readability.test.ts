import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CARDS } from '@qbr/shared';

// Apple's Human Interface Guidelines put the minimum legible text size at 11pt, and
// Balatro's iPhone reviews single out text "less so on tiny devices". A font audit at
// 375x667 (/explore 2026-09-27) found card names, "needs $$" tags, lane labels and
// lock text at 9-10.5px. No rule may go below 11px again.
const CSS = process.env.QBR_CSS ?? resolve(process.cwd(), 'src/styles.css');

describe('readable on the smallest iPhone', () => {
  it('no font-size below 11px anywhere in the stylesheet', () => {
    const css = readFileSync(CSS, 'utf8');
    const tooSmall = [...css.matchAll(/font-size:\s*(?:clamp\(\s*)?([\d.]+)px/g)]
      .map((m) => Number(m[1]))
      .filter((px) => px < 11);
    expect(tooSmall).toEqual([]);
  });
});

describe('card names fit a card face', () => {
  it('every word of 9+ letters in a card name can break (soft hyphen)', () => {
    const unbreakable = Object.values(CARDS)
      .flatMap((c) => c.name.split(' '))
      .filter((w) => w.replace(/­/g, '').length >= 9 && !w.includes('­'));
    expect(unbreakable).toEqual([]);
  });
});
