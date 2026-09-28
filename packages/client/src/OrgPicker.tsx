import { ORGS, orgUnlocked, type Progress } from '@qbr/shared';

/**
 * ◀ Org ▶ on a career's opening org chart (item 15; moved off Home at the user's request
 * so browsing an org shows its whole tree). Locked orgs are browsable, greyed, and say
 * how to open them.
 */
export function OrgPicker({ org, progress, onOrg }: { org: string; progress: Progress; onOrg: (id: string) => void }) {
  const i = Math.max(0, ORGS.findIndex((o) => o.id === org));
  const o = ORGS[i]!;
  const open = orgUnlocked(o.id, progress);
  const prev = i > 0 ? ORGS[i - 1]! : null;
  return (
    <div className={`stake-picker org-picker ${open ? '' : 'locked'}`} data-org-picker>
      <button className="btn stake-arrow" data-org-prev aria-label="Previous org" disabled={i <= 0} onClick={() => onOrg(ORGS[i - 1]!.id)}>
        ◀
      </button>
      <span className="stake-text">
        <b>
          {open ? '' : '🔒 '}
          {o.name} · {i + 1}/{ORGS.length}
        </b>
        {open ? <small>{o.blurb}</small> : <small data-org-locked>Get promoted in {prev!.name} to open.</small>}
      </span>
      <button
        className="btn stake-arrow"
        data-org-next
        aria-label="Next org"
        disabled={i >= ORGS.length - 1}
        onClick={() => onOrg(ORGS[i + 1]!.id)}
      >
        ▶
      </button>
    </div>
  );
}
