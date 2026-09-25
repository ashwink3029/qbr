import { useState } from 'react';
import {
  JOKERS,
  MEETINGS,
  currentMeeting,
  finishMeeting,
  leaveChart,
  meetingMods,
  meetingSeed,
  newRun,
  pickJoker,
  type Player,
  type RunState,
} from '@qbr/shared';
import { Game } from './Game.js';
import { OrgChart, yourTitle } from './OrgChart.js';

export interface RunResult {
  readonly promoted: boolean;
  /** Rungs beaten before the career ended (MEETINGS.length = promoted). */
  readonly meetingsWon: number;
  readonly jokers: readonly string[];
}

export interface RunProps {
  readonly seed: number;
  readonly paused?: boolean;
  readonly onExit: () => void;
  readonly onRunEnd: (r: RunResult) => void;
}

function CloseButton({ onExit }: { onExit: () => void }) {
  return (
    <span className="tb-buttons">
      <button className="tb-close" data-exit aria-label="Back to home" onClick={onExit}>
        ×
      </button>
    </span>
  );
}

/**
 * A career (a "run" in code): org chart -> supply closet -> meeting -> org chart
 * ... up the ladder from the Intern to the CEO. The org chart shows before the
 * first meeting and after every win, and it is the career-end screen too. Each
 * meeting's Game is keyed by rung so it starts clean.
 */
export function Run({ seed, paused = false, onExit, onRunEnd }: RunProps) {
  const [run, setRun] = useState<RunState>(() => newRun(seed));

  const meetingOver = (winner: Player | null) => setRun((r) => finishMeeting(r, winner === 0));

  if (run.status === 'won' || run.status === 'lost') {
    const won = run.status === 'won';
    const beaten = won ? MEETINGS.length : run.meeting;
    return (
      <div className="app home" data-run-end>
        <div className="window start-window chart-window">
          <div className="titlebar">
            <span>{won ? 'Promotion!' : 'Calendar cleared'}</span>
          </div>
          <div className="start-body">
            <p className="pitch">
              {won
                ? 'You beat the CEO in the Board meeting. Corner office secured.'
                : `Your career ended at ${currentMeeting(run).role.replace(/^The /, 'the ')}'s ${currentMeeting(run).name}. Title: ${yourTitle(beaten)}.`}
            </p>
            <OrgChart run={run} beaten={beaten} />
            <button
              className="btn primary"
              data-run-home
              onClick={() => onRunEnd({ promoted: won, meetingsWon: beaten, jokers: run.jokers })}
            >
              Back to home
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (run.status === 'chart') {
    const next = currentMeeting(run);
    const fresh = run.meeting === 0;
    return (
      <div className="app home" data-chart>
        <div className="window start-window chart-window">
          <div className="titlebar">
            <span>Org chart — {yourTitle(run.meeting)}</span>
            <CloseButton onExit={onExit} />
          </div>
          <div className="start-body">
            <p className="pitch">
              {fresh
                ? 'Day one. Climb the org chart one meeting at a time — lose once and the career ends.'
                : `Promoted to ${yourTitle(run.meeting)}. Next up: ${next.role.replace(/^The /, 'the ')}.`}
            </p>
            <OrgChart run={run} beaten={run.meeting} />
            <button className="btn primary" data-chart-go onClick={() => setRun((r) => leaveChart(r))}>
              {run.offer.length > 0 ? 'Stop by the supply closet' : `Walk into the ${next.name}`}
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
            <CloseButton onExit={onExit} />
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
      opponentName={meeting.role}
      opponentInitials={meeting.initials}
      meetingName={meeting.name}
    />
  );
}
