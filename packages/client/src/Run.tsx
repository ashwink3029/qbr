import { useEffect, useState } from 'react';
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
import * as feedback from './feedback.js';
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
  /** Today's daily career (a shared seed): named in the org chart title. */
  readonly daily?: boolean;
  /** Your deck (live from the bench until the career's first meeting, then fixed). */
  readonly deck?: readonly string[];
  /** Open Your deck from the opening org chart, where the VP's boss is known. */
  readonly onEditDeck?: () => void;
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

/** The unlock progress after a finished career: best rung, careers, and — on a
 *  promotion — the stake cleared (so stake-unlock specials are announced). */
export function careerEndProgress(progress: Progress, run: RunState): Progress {
  const won = run.status === 'won';
  return {
    bestRung: Math.max(progress.bestRung, won ? MEETINGS.length : run.meeting),
    careers: progress.careers + 1,
    stakeCleared: won ? Math.max(progress.stakeCleared ?? 0, run.stake) : (progress.stakeCleared ?? 0),
  };
}

/**
 * A career (a "run" in code): org chart -> supply closet -> meeting -> org chart
 * ... up the ladder from the Intern to the CEO. The org chart shows before the
 * first meeting and after every win, and it is the career-end screen too. Each
 * meeting's Game is keyed by rung so it starts clean.
 */
export function Run({ seed, stake = 1, daily = false, deck, onEditDeck, progress = { bestRung: 0, careers: 0 }, paused = false, onExit, onRunEnd }: RunProps) {
  // A brand-new player's first career skips the closet and starts with a Coffee Mug.
  const [run, setRun] = useState<RunState>(() => newRun(seed, stake, { firstCareer: progress.careers === 0 }));
  // The deck follows the bench on the opening chart (you can see the VP's boss
  // there) and is fixed from the moment you walk out of it.
  const [fixedDeck, setFixedDeck] = useState<readonly string[] | undefined>(undefined);
  const careerDeck = fixedDeck ?? deck;

  // One cue when the career ends: a promotion fanfare, and a chime per unlock.
  const ended = run.status === 'won' || run.status === 'lost';
  useEffect(() => {
    if (!ended) return;
    feedback.careerEnded(run.status === 'won', newlyUnlocked(progress, careerEndProgress(progress, run)).length);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fire once, when the career ends
  }, [ended]);

  const meetingOver = (winner: Player | null) => setRun((r) => finishMeeting(r, winner === 0));

  if (run.status === 'won' || run.status === 'lost') {
    const won = run.status === 'won';
    const beaten = won ? MEETINGS.length : run.meeting;
    const earned = newlyUnlocked(progress, careerEndProgress(progress, run));
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
            <OrgChart run={run} beaten={beaten} promoted={won} />
            {earned.length > 0 && (
              <div className="unlocked" data-unlocked>
                <b>New card{earned.length > 1 ? 's' : ''} unlocked</b>
                <div className="unlocked-cards">
                  {earned.map((id, k) => {
                    const s = SPECIALS.find((x) => x.id === id)!;
                    return (
                      // Each new card turns over in turn, after the chart settles.
                      <div
                        key={id}
                        className="unlocked-item"
                        data-unlocked-card={id}
                        data-fx="reveal"
                        style={{ animationDelay: `${300 + k * 220}ms` }}
                      >
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
              {daily ? ' · Daily' : ''}
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
            <OrgChart run={run} beaten={run.meeting} {...(fresh ? {} : { justBeat: run.meeting - 1 })} />
            {fresh && run.offer.length === 0 && run.jokers.length > 0 && (
              <p className="starter-joker" data-starter-joker>
                Your desk came with a <b>{JOKERS[run.jokers[0]!]!.name}</b>: {JOKERS[run.jokers[0]!]!.blurb.toLowerCase()}.
                The supply closet opens after your first win.
              </p>
            )}
            {fresh && onEditDeck && (
              <button className="btn" data-chart-deck onClick={onEditDeck}>
                Your deck — tailor it to the VP’s boss
              </button>
            )}
            <button
              className="btn primary"
              data-chart-go
              onClick={() => {
                if (fixedDeck === undefined) setFixedDeck(deck);
                setRun((r) => leaveChart(r));
              }}
            >
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
      {...(careerDeck ? { deck: careerDeck } : {})}
    />
  );
}
