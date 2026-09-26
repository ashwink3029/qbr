import { BOSSES, MEETINGS, bossFor, type RunState } from '@qbr/shared';
import { AvatarImage } from './avatars.js';

/** Your title after beating N rungs (N = run.meeting on the chart). */
export const TITLES = ['New hire', 'Associate', 'Senior associate', 'Team lead', 'Director', 'Promoted'] as const;

export function yourTitle(beaten: number): string {
  return TITLES[Math.min(beaten, TITLES.length - 1)]!;
}

/** What makes a rung hard, in one line: boss rule and seniority. */
function threat(run: RunState, i: number): string {
  const m = MEETINGS[i]!;
  const parts: string[] = [];
  const b = bossFor(run, i);
  if (b) parts.push(`${BOSSES[b]!.name}: ${BOSSES[b]!.blurb}`);
  if (m.edge > 0) parts.push(`+${m.edge} card${m.edge > 1 ? 's' : ''} each quarter`);
  if (m.homeBoost > 0) parts.push(`${m.homeBoost} home cell${m.homeBoost > 1 ? 's start' : ' starts'} at $$`);
  if (parts.length === 0) parts.push(m.opponent === 'rookie' ? 'plays anything' : 'plays it straight');
  return parts.join(' · ');
}

/**
 * The org chart: the ladder from the CEO (top) down to you (bottom). Rungs you
 * have beaten are ticked; the next one is highlighted with its meeting and what
 * makes it hard; "You" sits just below whoever you face next.
 * `beaten` = how many rungs are behind you.
 */
export function OrgChart({
  run,
  beaten,
  justBeat,
  promoted = false,
}: {
  run: RunState;
  beaten: number;
  /** The rung won in the meeting just played: its tick is stamped on. */
  justBeat?: number;
  /** A promotion: your tile rises to the top of the chart. */
  promoted?: boolean;
}) {
  const rows = MEETINGS.map((m, i) => ({ m, i })).reverse();
  return (
    <ol className="orgchart" data-orgchart aria-label="Org chart">
      {rows.map(({ m, i }) => {
        const state = i < beaten ? 'beaten' : i === beaten ? 'next' : 'above';
        return (
          <li
            key={m.role}
            className={`rung ${state}`}
            data-rung={i}
            data-state={state}
            data-fx={i === justBeat ? 'beaten' : undefined}
          >
            <span className="rung-avatar">
              <AvatarImage id={m.initials} size={34} />
            </span>
            <span className="rung-text">
              <b>{m.role}</b>
              <small>
                {state === 'beaten' ? `beaten in the ${m.name}` : state === 'next' ? `next: ${m.name}` : m.name}
              </small>
              {state !== 'beaten' && <small className="threat">{threat(run, i)}</small>}
            </span>
            {state === 'beaten' && (
              <span className="tick" aria-label="beaten">
                ✓
              </span>
            )}
          </li>
        );
      })}
      <li className="rung you" data-rung="you" data-fx={promoted ? 'promoted' : undefined}>
        <span className="rung-avatar" aria-hidden>
          YOU
        </span>
        <span className="rung-text">
          <b>You</b>
          <small data-title-now>{yourTitle(beaten)}</small>
        </span>
      </li>
    </ol>
  );
}
