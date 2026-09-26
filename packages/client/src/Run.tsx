import { useState } from 'react';
import {
  CARDS,
  SPECIALS,
  STAKES,
  newlyUnlocked,
  type Progress,
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
import { CardFace } from './CardFace.js';
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
  /** Career stake (1 = Standard); see STAKES. */
  readonly stake?: number;
  /** Your deck for this whole career (fixed at the start). */
  readonly deck?: readonly string[];
  /** Your progress before this career — to announce what it unlocks. */
  readonly progress?: Progress;
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
export function Run({ seed, stake = 1, deck, progress = { bestRung: 0, careers: 0 }, paused = false, onExit, onRunEnd }: RunProps) {
  const [run, setRun] = useState<RunState>(() => newRun(seed, stake));

  const meetingOver = (winner: Player | null) => setRun((r) => finishMeeting(r, winner === 0));

  if (run.status === 'won' || run.status === 'lost') {
    const won = run.status === 'won';
    const beaten = won ? MEETINGS.length : run.meeting;
    const earned = newlyUnlocked(progress, {
      bestRung: Math.max(progress.bestRung, beaten),
      careers: progress.careers + 1,
    });
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
            {earned.length > 0 && (
              <div className="unlocked" data-unlocked>
                <b>New card{earned.length > 1 ? 's' : ''} unlocked</b>
                <div className="unlocked-cards">
                  {earned.map((id) => {
                    const s = SPECIALS.find((x) => x.id === id)!;
                    return (
                      <div key={id} className="unlocked-item" data-unlocked-card={id}>
                        <div className="card deck-card special">
                          <CardFace id={id} />
                        </div>
                        <small>replaces a {CARDS[s.replaces]!.name.replace(/­/g, '')}</small>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
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
            <span>
              Org chart — {yourTitle(run.meeting)}
              {run.stake > 1 ? ` · ${STAKES[run.stake - 1]!.name}` : ''}
            </span>
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
      {...(deck ? { deck } : {})}
    />
  );
}
