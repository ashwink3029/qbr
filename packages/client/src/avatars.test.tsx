import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { MEETINGS } from '@qbr/shared';
import { AVATARS, AvatarImage } from './avatars.js';

afterEach(cleanup);

describe('opponent avatars', () => {
  it('every opponent on the org chart has one', () => {
    for (const m of MEETINGS) expect(AVATARS[m.initials], m.role).toBeTruthy();
  });

  it('every map is exactly 16x16 and uses only its own palette', () => {
    for (const [id, a] of Object.entries(AVATARS)) {
      expect(a.map, id).toHaveLength(16);
      a.map.forEach((row, y) => {
        expect(row.length, `${id} row ${y}`).toBe(16);
        for (const ch of row) if (ch !== '.') expect(a.palette[ch], `${id} row ${y} '${ch}'`).toBeTruthy();
      });
    }
  });

  it('draws a labelled portrait, and falls back to initials for an unknown id', () => {
    render(<AvatarImage id="FIN" />);
    const svg = document.querySelector('[data-avatar="FIN"]')!;
    expect(svg.getAttribute('aria-label')).toMatch(/Finance/);
    expect(svg.querySelectorAll('rect').length).toBeGreaterThan(20);
    cleanup();
    render(<AvatarImage id="XYZ" />);
    expect(document.querySelector('.avatar-fallback')!.textContent).toBe('XYZ');
  });
});
