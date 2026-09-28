import { useLayoutEffect, useRef } from 'react';
import { BOSSES, CARDS, ORGS, SPECIALS, bossFor, isUnlocked, ladder, orgUnlocked, type Progress, type RunState } from '@qbr/shared';
import { AvatarImage } from './avatars.js';

/** Your title after beating N rungs (N = run.meeting on the chart). */
export const TITLES = ['New hire', 'Associate', 'Senior associate', 'Team lead', 'Director', 'Promoted'] as const;

export function yourTitle(beaten: number): string {
  return TITLES[Math.min(beaten, TITLES.length - 1)]!;
}

/** What makes a rung hard, in one line: boss rule and seniority. */
function threat(run: RunState, i: number): string {
  const m = ladder(run)[i]!;
  const parts: string[] = [];
  const b = bossFor(run, i);
  if (b) parts.push(`${BOSSES[b]!.name}: ${BOSSES[b]!.blurb}`);
  if (m.edge > 0) parts.push(`+${m.edge} card${m.edge > 1 ? 's' : ''} each quarter`);
  if (m.homeBoost > 0) parts.push(`${m.homeBoost} home cell${m.homeBoost > 1 ? 's start' : ' starts'} at $$`);
  if (parts.length === 0) parts.push(m.opponent === 'rookie' ? 'plays anything' : 'plays it straight');
  return parts.join(' · ');
}

/** What beating rung `i` would newly unlock, in words — or null. Rung specials unlock by
 *  the best rung reached in any org; promotion (the top rung) also opens the next org. */
function unlockText(run: RunState, i: number, progress: Progress | undefined): string | null {
  if (!progress) return null;
  const cards = SPECIALS.filter(
    (s) => s.unlock.kind === 'rung' && s.unlock.rungsBeaten === i + 1 && !isUnlocked(s, progress),
  ).map((s) => CARDS[s.id]!.name.replace(/\u00AD/g, ''));
  const parts = cards.length ? [`unlocks ${cards.join(', ')}`] : [];
  if (i === ladder(run).length - 1) {
    const k = ORGS.findIndex((o) => o.id === run.org);
    const nextOrg = ORGS[k + 1];
    if (nextOrg && !orgUnlocked(nextOrg.id, progress)) parts.push(`opens ${nextOrg.name}`);
  }
  return parts.length ? `Beat → ${parts.join(' · ')}` : null;
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
  progress,
}: {
  run: RunState;
  beaten: number;
  /** The rung won in the meeting just played: its tick is stamped on. */
  justBeat?: number;
  /** A promotion: your tile rises to the top of the chart. */
  promoted?: boolean;
  /** When given, each rung says what beating it unlocks. */
  progress?: Progress;
}) {
  const rows = ladder(run).map((m, i) => ({ m, i })).reverse();
  // On a short phone the tree scrolls: open it at the bottom — you and the rung you face —
  // and again whenever the org changes; the rest of the climb is a scroll up.
  const list = useRef<HTMLOListElement>(null);
  useLayoutEffect(() => {
    if (list.current) list.current.scrollTop = list.current.scrollHeight;
  }, [run.org]);
  return (
    <ol className="orgchart" data-orgchart aria-label="Org chart" ref={list}>
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
              {state !== 'beaten' && unlockText(run, i, progress) && (
                <small className="unlock" data-unlock>
                  {unlockText(run, i, progress)}
                </small>
              )}
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
