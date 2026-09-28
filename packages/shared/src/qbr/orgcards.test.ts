import { describe, expect, it } from 'vitest';
import { CARDS, isUnlocked } from './cards.js';
import { COLLECTIBLES, collectionOf, unlockProgress } from './collection.js';
import { ORGS } from './run.js';

// Org-locked signature cards (item 25, iteration 4): "the deck that starts locked". Each org's
// promotion unlocks that org's own card, on show (greyed) in the builder from day one.

const signature = (org: string) => COLLECTIBLES.filter((u) => u.unlock.kind === 'org' && u.unlock.org === org);

describe('org signature cards', () => {
  it('every org has exactly one, unlocked by a promotion in that org', () => {
    for (const o of ORGS) {
      const s = signature(o.id);
      expect(s, o.id).toHaveLength(1);
      expect(s[0]!.how).toBe(`Get promoted in ${o.name}`);
      expect(CARDS[s[0]!.id], s[0]!.id).toBeDefined();
    }
  });

  it('locked until you are promoted in that org (an old promotion counts as Finance)', () => {
    const fresh = { bestRung: 0, careers: 0 };
    const tech = signature('tech')[0]!;
    expect(isUnlocked(tech, fresh)).toBe(false);
    expect(isUnlocked(tech, { ...fresh, orgsPromoted: ['finance'] })).toBe(false);
    expect(isUnlocked(tech, { ...fresh, orgsPromoted: ['finance', 'tech'] })).toBe(true);
    const fin = signature('finance')[0]!;
    expect(isUnlocked(fin, { ...fresh, promotions: 1 })).toBe(true);
    expect(unlockProgress(tech, fresh)).toEqual({ have: 0, need: 1 });
    expect(unlockProgress(tech, { ...fresh, orgsPromoted: ['tech'] })).toEqual({ have: 1, need: 1 });
    expect(collectionOf({ ...fresh, orgsPromoted: ['tech'] }).get(tech.id)).toBe(1);
  });

  it('each is priced as an upgrade of the card it replaces (same cost, at least the value)', () => {
    for (const o of ORGS) {
      const u = signature(o.id)[0]!;
      const c = CARDS[u.id]!;
      const r = CARDS[u.replaces]!;
      expect(c.cost, u.id).toBe(r.cost);
      expect(c.value, u.id).toBeGreaterThanOrEqual(r.value);
    }
  });
});
