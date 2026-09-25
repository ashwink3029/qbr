import type { Record } from './record.js';

export interface HomeProps {
  readonly record: Record;
  /** A year was left mid-way through the window's × button. */
  readonly inProgress: boolean;
  readonly onStart: () => void;
  readonly onResume: () => void;
}

/**
 * The Home Screen: the teal desktop with one small start window on it — the
 * same 90s-office frame as the game, so leaving a year feels like closing a
 * spreadsheet, not changing apps. Desktop space above is where the joker tray
 * and run map will live once the Balatro layer lands.
 */
export function Home({ record, inProgress, onStart, onResume }: HomeProps) {
  const played = record.wins + record.losses + record.draws;
  const last =
    record.lastOutcome === 'win'
      ? 'Last year: promoted'
      : record.lastOutcome === 'loss'
        ? 'Last year: performance review'
        : record.lastOutcome === 'draw'
          ? 'Last year: flat'
          : null;

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
            Beat <b>Finance</b> in 2 of 3 quarters.
            <br />
            Claim cells, win lanes, close out at the right moment.
          </p>

          {inProgress ? (
            <>
              <button className="btn primary" data-resume onClick={onResume}>
                Resume year
              </button>
              <button className="btn" data-start onClick={onStart}>
                Start a new year
              </button>
            </>
          ) : (
            <button className="btn primary" data-start onClick={onStart}>
              Start fiscal year
            </button>
          )}

          <div className="record" data-record>
            {played === 0 ? (
              <span>No years on record yet.</span>
            ) : (
              <>
                <span>
                  Record <b>{record.wins}</b>W · <b>{record.losses}</b>L{record.draws ? ` · ${record.draws}D` : ''}
                </span>
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
