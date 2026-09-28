import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { ORGS } from '@qbr/shared';
import { AVATARS, AvatarImage } from './avatars.js';

afterEach(cleanup);

describe('opponent avatars', () => {
  it("every opponent on every org's chart has one, and no two share a face", () => {
    const seen = new Set<string>();
    for (const o of ORGS)
      for (const m of o.meetings) {
        expect(AVATARS[m.initials], m.role).toBeTruthy();
        expect(seen.has(m.initials), m.initials).toBe(false);
        seen.add(m.initials);
      }
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
    render(<AvatarImage id="CTL" />);
    const svg = document.querySelector('[data-avatar="CTL"]')!;
    expect(svg.getAttribute('aria-label')).toMatch(/Finance/);
    expect(svg.querySelectorAll('rect').length).toBeGreaterThan(20);
    cleanup();
    render(<AvatarImage id="XYZ" />);
    expect(document.querySelector('.avatar-fallback')!.textContent).toBe('XYZ');
  });
});
