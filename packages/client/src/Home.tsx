import { MEETINGS } from '@qbr/shared';
import type { Record } from './record.js';

export interface HomeProps {
  readonly record: Record;
  /** What was left mid-way through the window's × button, if anything. */
  readonly inProgress: 'run' | 'quick' | null;
  readonly onStartRun: () => void;
  readonly onStartQuick: () => void;
  readonly onResume: () => void;
}

/**
 * The Home Screen: the teal desktop with one small start window on it — the
 * same 90s-office frame as the game, so leaving a run feels like closing a
 * spreadsheet, not changing apps.
 */
export function Home({ record, inProgress, onStartRun, onStartQuick, onResume }: HomeProps) {
  const years = record.wins + record.losses + record.draws;
  const last =
    record.lastOutcome === 'win'
      ? 'Last quick year: promoted'
      : record.lastOutcome === 'loss'
        ? 'Last quick year: performance review'
        : record.lastOutcome === 'draw'
          ? 'Last quick year: flat'
          : null;
  const furthest = record.bestMeetings >= MEETINGS.length ? 'promoted' : MEETINGS[record.bestMeetings]?.name;

  return (
    <div className="app home" data-home>
      <div className="desktop-icons" aria-hidden>
        <span className="icon">
          <i className="doc" />
          QBR.xls
        </span>
        <span className="icon">
          <i className="folder" />
          Q1–Q3
        </span>
      </div>

      <div className="window start-window">
        <div className="titlebar">
          <span>QBR — Quarterly Business Reports</span>
        </div>
        <div className="start-body">
          <div className="logo" aria-hidden>
            <span>QBR</span>
          </div>
          <p className="pitch">
            Survive three meetings with <b>Finance</b>.
            <br />
            Claim cells, win lanes, close out at the right moment.
          </p>

          {inProgress && (
            <button className="btn primary" data-resume onClick={onResume}>
              {inProgress === 'run' ? 'Resume run' : 'Resume quick year'}
            </button>
          )}
          <button className={`btn ${inProgress ? '' : 'primary'}`} data-start-run onClick={onStartRun}>
            {inProgress === 'run' ? 'Start a new run' : 'Start run'}
          </button>
          <button className="btn" data-start onClick={onStartQuick}>
            Quick year vs Finance
          </button>

          <div className="record" data-record>
            {record.runs === 0 && years === 0 ? (
              <span>No years on record yet.</span>
            ) : (
              <>
                {record.runs > 0 && (
                  <span data-run-record>
                    Runs <b>{record.runs}</b> · promoted <b>{record.promotions}</b>
                    {furthest ? ` · best: ${furthest}` : ''}
                  </span>
                )}
                {years > 0 && (
                  <span>
                    Quick years <b>{record.wins}</b>W · <b>{record.losses}</b>L{record.draws ? ` · ${record.draws}D` : ''}
                  </span>
                )}
                {last && (
                  <small>
                    {last}
                    {record.last ? ` (${record.last})` : ''}
                  </small>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
