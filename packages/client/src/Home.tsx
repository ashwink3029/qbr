import { STAKES } from '@qbr/shared';
import { yourTitle } from './OrgChart.js';
import { BinderClip } from './Mascot.js';
import type { Record } from './record.js';
import { homeLine } from './tips.js';

export interface HomeProps {
  readonly record: Record;
  /** What was left mid-way through the window's × button, if anything. */
  readonly inProgress: 'run' | 'quick' | null;
  readonly onStartRun: () => void;
  readonly onStartQuick: () => void;
  readonly onResume: () => void;
  readonly onDeck: () => void;
  readonly onSettings: () => void;
  /** Career difficulty (see STAKES): the chosen stake, the highest open one. */
  readonly stake?: number;
  readonly maxStake?: number;
  readonly onStake?: (s: number) => void;
}

/**
 * The Home Screen: the teal desktop with one small start window on it — the
 * same 90s-office frame as the game, so leaving a career feels like closing a
 * spreadsheet, not changing apps.
 */
export function Home({
  record,
  inProgress,
  onStartRun,
  onStartQuick,
  onResume,
  onDeck,
  onSettings,
  stake = 1,
  maxStake = 1,
  onStake,
}: HomeProps) {
  const years = record.wins + record.losses + record.draws;
  const last =
    record.lastOutcome === 'win'
      ? 'Last year: promoted'
      : record.lastOutcome === 'loss'
        ? 'Last year: performance review'
        : record.lastOutcome === 'draw'
          ? 'Last year: flat'
          : null;
  const furthest = record.runs > 0 ? yourTitle(record.bestMeetings) : null;

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
            Climb the org chart from <b>Intern</b> to <b>CEO</b>.
            <br />
            Claim cells, win lanes, close out at the right moment.
          </p>

          {inProgress && (
            <button className="btn primary" data-resume onClick={onResume}>
              {inProgress === 'run' ? 'Resume career' : 'Resume year'}
            </button>
          )}
          {maxStake > 1 && (
            <div className="stake-picker" data-stake-picker>
              <button
                className="btn stake-arrow"
                data-stake-prev
                aria-label="Easier stake"
                disabled={stake <= 1}
                onClick={() => onStake?.(stake - 1)}
              >
                ◀
              </button>
              <span className="stake-text">
                <b>
                  Stake {stake}: {STAKES[stake - 1]!.name}
                </b>
                <small>{STAKES[stake - 1]!.blurb}</small>
              </span>
              <button
                className="btn stake-arrow"
                data-stake-next
                aria-label="Harder stake"
                disabled={stake >= maxStake}
                onClick={() => onStake?.(stake + 1)}
              >
                ▶
              </button>
            </div>
          )}
          <button className={`btn ${inProgress ? '' : 'primary'}`} data-start-run onClick={onStartRun}>
            {inProgress === 'run' ? 'Start a new career' : 'Start career'}
          </button>
          <button className="btn" data-start onClick={onStartQuick}>
            Play one year
          </button>
          <button className="btn" data-deck onClick={onDeck}>
            Your deck
          </button>

          <div className="home-clip" data-home-clip>
            <BinderClip mood="talk" size={44} />
            <span>{homeLine(record.runs, record.promotions)}</span>
          </div>

          <div className="record" data-record>
            {record.runs === 0 && years === 0 ? (
              <span>No years on record yet.</span>
            ) : (
              <>
                {record.runs > 0 && (
                  <span data-run-record>
                    Careers <b>{record.runs}</b> · promoted <b>{record.promotions}</b>
                    {furthest ? ` · best: ${furthest}` : ''}
                  </span>
                )}
                {years > 0 && (
                  <span>
                    Years <b>{record.wins}</b>W · <b>{record.losses}</b>L{record.draws ? ` · ${record.draws}D` : ''}
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
          <button className="link-btn" data-settings onClick={onSettings}>
            Settings
          </button>
        </div>
      </div>
    </div>
  );
}
