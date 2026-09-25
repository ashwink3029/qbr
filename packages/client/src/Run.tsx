import { useState } from 'react';
import {
  BOSSES,
  JOKERS,
  MEETINGS,
  currentMeeting,
  finishMeeting,
  meetingMods,
  meetingSeed,
  newRun,
  pickJoker,
  type Player,
  type RunState,
} from '@qbr/shared';
import { Game } from './Game.js';

export interface RunResult {
  readonly promoted: boolean;
  /** Meetings won before the run ended (3 = promoted). */
  readonly meetingsWon: number;
  readonly jokers: readonly string[];
}

export interface RunProps {
  readonly seed: number;
  readonly paused?: boolean;
  readonly onExit: () => void;
  readonly onRunEnd: (r: RunResult) => void;
}

/** The meeting calendar: done / next / the boss waiting at the review. */
function Calendar({ run }: { run: RunState }) {
  return (
    <ol className="calendar" data-calendar>
      {MEETINGS.map((m, i) => {
        const state = i < run.meeting ? 'done' : i === run.meeting ? 'next' : 'later';
        return (
          <li key={m.name} className={state}>
            <span className="mname">{m.name}</span>
            <small>
              {state === 'done'
                ? 'won'
                : m.boss
                  ? `boss: ${BOSSES[run.boss]!.name} — ${BOSSES[run.boss]!.blurb}`
                  : m.opponent === 'greedy'
                    ? 'Finance, winging it'
                    : 'Finance, prepared'}
            </small>
          </li>
        );
      })}
    </ol>
  );
}

/**
 * One run: draft a joker in the supply closet, play the meeting (a best-of-3
 * match with the run's jokers and, at the review, the boss), repeat. The
 * meeting's Game is keyed by meeting index so each meeting starts clean.
 */
export function Run({ seed, paused = false, onExit, onRunEnd }: RunProps) {
  const [run, setRun] = useState<RunState>(() => newRun(seed));

  const meetingOver = (winner: Player | null) => setRun((r) => finishMeeting(r, winner === 0));

  if (run.status === 'won' || run.status === 'lost') {
    const won = run.status === 'won';
    const reached = currentMeeting(run).name;
    return (
      <div className="app home" data-run-end>
        <div className="window start-window">
          <div className="titlebar">
            <span>{won ? 'Promotion!' : 'Calendar cleared'}</span>
          </div>
          <div className="start-body">
            <p className="pitch">
              {won
                ? 'You survived the Quarterly Review. Corner office secured.'
                : `Your career ended at the ${reached}.`}
            </p>
            <Calendar run={run} />
            <button
              className="btn primary"
              data-run-home
              onClick={() => onRunEnd({ promoted: won, meetingsWon: won ? MEETINGS.length : run.meeting, jokers: run.jokers })}
            >
              Back to home
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (run.status === 'draft') {
    return (
      <div className="app home" data-draft>
        <div className="window start-window closet">
          <div className="titlebar">
            <span>Supply closet — before the {currentMeeting(run).name}</span>
            <span className="tb-buttons">
              <button className="tb-close" data-exit aria-label="Back to home" onClick={onExit}>
                ×
              </button>
            </span>
          </div>
          <div className="start-body">
            <p className="pitch">Take one thing for your desk.</p>
            <div className="offer">
              {run.offer.map((j) => (
                <button key={j} className="joker offer-card" data-offer={j} onClick={() => setRun((r) => pickJoker(r, j))}>
                  <span className="jglyph">{JOKERS[j]!.glyph}</span>
                  <span className="jname">{JOKERS[j]!.name}</span>
                  <span className="jblurb">{JOKERS[j]!.blurb}</span>
                </button>
              ))}
            </div>
            {run.jokers.length > 0 && (
              <small className="owned">On your desk: {run.jokers.map((j) => JOKERS[j]!.name).join(', ')}</small>
            )}
            <Calendar run={run} />
          </div>
        </div>
      </div>
    );
  }

  const meeting = currentMeeting(run);
  return (
    <Game
      key={run.meeting}
      seed={meetingSeed(run)}
      paused={paused}
      onExit={onExit}
      onYearEnd={meetingOver}
      mods={meetingMods(run)}
      opponent={meeting.opponent}
      meetingName={meeting.name}
    />
  );
}
