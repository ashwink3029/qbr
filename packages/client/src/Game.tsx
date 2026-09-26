import { useEffect, useMemo, useState } from 'react';
import {
  BOSSES,
  DEFAULT_MATCH,
  JOKERS,
  MATCH_RULES,
  NO_MODS,
  STARTER_DECK,
  blockedCells,
  card,
  cellValue,
  legalPlays,
  matchReducer,
  newMatch,
  opponentPolicy,
  reducer,
  revenue,
  rowResults,
  spreadEffects,
  type Action,
  type OpponentKind,
  type Mods,
  type GameState,
  type MatchState,
  type Player,
  type QuarterResult,
  type RngState,
} from '@qbr/shared';
import { LANE_LETTERS, UNITS, cardLabel, cellLabel, laneLabel } from './a11y.js';
import { AvatarImage } from './avatars.js';
import { CardFace } from './CardFace.js';
import * as feedback from './feedback.js';
import { SCREEN_COLS, SCREEN_ROWS, fromScreen } from './layout.js';
import { FX_MAX_MS, FX_STEP_MS, moveFx, type MoveFx } from './motion.js';
import { TipBubble } from './Mascot.js';
import { loadSeenTips, markTipSeen, pickTip } from './tips.js';

/** The AI "thinks" this long before replying, so its move reads as a move. */
export const AI_DELAY_MS = 450;

const HUMAN = 0;

function freshSeed(): number {
  return (Date.now() ^ (Math.random() * 0x7fffffff)) >>> 0;
}

/** Life pips: losing a quarter costs one. */
function Lives({ n, max, label }: { n: number; max: number; label: string }) {
  const pips = [];
  for (let k = 0; k < max; k++) pips.push(<i key={k} className={k < n ? 'on' : 'off'} />);
  return (
    <span className="lives" aria-label={`${label}: ${n} of ${max} lives`} data-lives={label}>
      {pips}
    </span>
  );
}

/** A placed card's scoring value; marked when a joker or boss changed it. */
function CellValue({ printed, actual }: { printed: number; actual: number }) {
  const cls = actual > printed ? 'pval up' : actual < printed ? 'pval down' : 'pval';
  return (
    <span className={cls} title={actual !== printed ? `printed ${printed}` : undefined}>
      {actual}
    </span>
  );
}

interface Summary {
  readonly quarterNo: number;
  /** The ended quarter's final board (the match has already reset it). */
  readonly board: GameState;
  readonly result: QuarterResult;
}

export interface GameProps {
  readonly seed?: number;
  /** True while the Home Screen is showing: the match is kept, Finance waits. */
  readonly paused?: boolean;
  /** The window's × button: back to the Home Screen, match kept for Resume. */
  readonly onExit?: () => void;
  /** The year is over and the player dismissed the result: record it, go home. */
  readonly onYearEnd?: (winner: Player | null, results: readonly QuarterResult[]) => void;
  /** Jokers in play and the boss in force (a run's meeting); none in a quick year. */
  readonly mods?: Mods;
  /** How the opponent plays — the same shared mapping the sim measures. */
  readonly opponent?: OpponentKind;
  /** Who sits across the table ("The VP") and their avatar initials. */
  readonly opponentName?: string;
  readonly opponentInitials?: string;
  /** A career meeting's name ("Budget review"); absent in a one-off year. */
  readonly meetingName?: string;
  /** Your deck (starter upgraded by unlocked specials); the opponent always
   *  plays the plain starter deck. */
  readonly deck?: readonly string[];
}

export function Game({
  seed,
  paused = false,
  onExit,
  onYearEnd,
  mods = NO_MODS,
  opponent: opponentKind = 'lookahead',
  opponentName: who = 'Finance',
  opponentInitials: whoInitials = 'FIN',
  meetingName,
  deck = STARTER_DECK,
}: GameProps = {}) {
  const opponent = useMemo(() => opponentPolicy(opponentKind), [opponentKind]);
  const [match, setMatch] = useState<MatchState>(() =>
    newMatch(seed ?? freshSeed(), { player: deck, opponent: STARTER_DECK }, DEFAULT_MATCH, MATCH_RULES, mods),
  );
  const blocked = useMemo(() => blockedCells(mods), [mods]);
  const boss = mods.boss ? BOSSES[mods.boss] : undefined;
  const [summary, setSummary] = useState<Summary | null>(null);
  const [seenTips, setSeenTips] = useState<ReadonlySet<string>>(loadSeenTips);
  const [aiRng, setAiRng] = useState<RngState>(() => (seed ?? 1) * 7919);
  const [selected, setSelected] = useState<string | null>(null);

  // While a quarter summary is up, the ended quarter's board stays on screen.
  const game = summary ? summary.board : match.quarter;
  const legal = useMemo(() => (summary ? [] : legalPlays(match.quarter)), [match, summary]);
  const legalCells = useMemo(
    () => new Set(legal.filter((a) => a.card === selected).map((a) => a.cell)),
    [legal, selected],
  );

  const humanTurn = !summary && !match.over && match.quarter.toMove === HUMAN;

  // The last play's visible effects (drop / claim ripple / flip), for either
  // side — so the player can SEE what the opponent just did. A pass clears it.
  const [fx, setFx] = useState<MoveFx | null>(null);
  // Once a move's effect budget has passed its overlays leave the DOM, so the
  // board's end state never depends on a CSS animation actually running (a
  // backgrounded page freezes them mid-way).
  const [settledFx, setSettledFx] = useState(0);
  useEffect(() => {
    if (!fx) return;
    const t = setTimeout(() => setSettledFx(fx.id), FX_MAX_MS + 100);
    return () => clearTimeout(t);
  }, [fx]);

  const apply = (m: MatchState, a: Action) => {
    const moved = moveFx(m.quarter, a);
    setFx(moved);
    if (moved) feedback.moveResolved(moved, HUMAN);
    const next = matchReducer(m, a);
    if (next.results.length > m.results.length) {
      setSummary({ quarterNo: m.quarterNo, board: reducer(m.quarter, a), result: next.results.at(-1)! });
      // The deciding quarter gets the year's cue instead of its own.
      const outcome = (w: Player | null) => (w === HUMAN ? 'won' : w === null ? 'tie' : 'lost');
      if (next.over) feedback.yearEnded(outcome(next.winner));
      else feedback.quarterEnded(outcome(next.results.at(-1)!.winner));
    }
    setMatch(next);
  };

  // The opponent replies on a timer, never synchronously inside a click.
  useEffect(() => {
    if (paused || summary || match.over || match.quarter.toMove === HUMAN) return;
    const t = setTimeout(() => {
      const [next, action] = opponent(match, aiRng);
      setAiRng(next);
      apply(match, action);
    }, AI_DELAY_MS);
    return () => clearTimeout(t);
  }, [match, aiRng, summary, paused]);

  // Touch has no hover, so the first tap on a legal cell previews the spread
  // (`pending`) and a second tap on the same cell commits. A mouse also gets
  // the preview on hover, but still commits the same way.
  const [pending, setPending] = useState<number | null>(null);
  const [hover, setHover] = useState<number | null>(null);

  const act = (a: Action) => {
    apply(match, a);
    setSelected(null);
    setPending(null);
    setExplain(null);
  };

  // A grey card is still tappable: it explains itself instead of selecting.
  const [explain, setExplain] = useState<string | null>(null);

  const pickCard = (id: string) => {
    setPending(null);
    if (!legal.some((a) => a.card === id)) {
      feedback.cardDenied();
      setSelected(null);
      setExplain(explain === id ? null : id);
      return;
    }
    feedback.cardTapped();
    setExplain(null);
    setSelected(selected === id ? null : id);
  };

  /** Your best open cell's budget: -1 when you have no empty, unlocked cell. */
  const bestOpen = useMemo(() => {
    let best = -1;
    game.cells.forEach((c, i) => {
      if (c.owner === HUMAN && c.card === null && !blocked.has(i)) best = Math.max(best, c.budget);
    });
    return best;
  }, [game, blocked]);

  const tapCell = (i: number) => {
    if (!humanTurn || selected === null || !legalCells.has(i)) return;
    if (pending === i) {
      feedback.cardConfirmed();
      act({ type: 'play', card: selected, cell: i });
    } else {
      feedback.cardPlaced();
      setPending(i);
    }
  };

  const finishYear = () => onYearEnd?.(match.winner, match.results);

  const rows = rowResults(game);
  const [mine, theirs] = revenue(game);

  const preview = pending ?? hover;
  const effects = useMemo(
    () =>
      selected !== null && preview !== null && legalCells.has(preview)
        ? spreadEffects(game, selected, preview, HUMAN)
        : { claim: [], flip: [], boost: [], weaken: [] },
    [game, selected, preview, legalCells],
  );
  const claimCells = useMemo(() => new Set(effects.claim), [effects]);
  const flipCells = useMemo(() => new Set(effects.flip), [effects]);
  // Ability preview: what the selected card's ability would do to each card.
  const abilityDelta = useMemo(() => {
    const amount = selected ? (card(selected).ability?.amount ?? 0) : 0;
    const m = new Map<number, string>();
    for (const t of effects.boost) m.set(t, `+${amount}`);
    for (const w of effects.weaken) m.set(w.cell, w.destroys ? '✕' : `−${amount}`);
    return m;
  }, [effects, selected]);

  const pendingCard = pending === null ? null : game.cells[pending]!.card;

  const claimOrder = useMemo(
    () => new Map((fx && fx.id !== settledFx ? fx.claim : []).map((c) => [c.cell, c.order])),
    [fx, settledFx],
  );
  const fxKind = (i: number): 'drop' | 'flip' | 'boost' | 'weaken' | null =>
    !fx
      ? null
      : fx.placed === i
        ? 'drop'
        : fx.flip.includes(i)
          ? 'flip'
          : fx.boost.includes(i)
            ? 'boost'
            : fx.weaken.includes(i)
              ? 'weaken'
              : null;
  const qNo = summary ? summary.quarterNo : match.quarterNo;
  const theyPassed = !summary && match.quarter.passed[1];
  const iPassed = !summary && match.quarter.passed[0];
  const maxLives = match.config.lives;

  let status: string;
  if (summary) {
    const [a, b] = summary.result.revenue;
    const verdict =
      summary.result.winner === 0
        ? 'You won the quarter'
        : summary.result.winner === 1
          ? `${who} won the quarter`
          : 'Flat quarter — both lose a life';
    status = `Q${summary.quarterNo} closed ${a}–${b}. ${verdict}.`;
  } else if (!humanTurn) {
    status = iPassed ? `You closed out Q${qNo} — ${who} is still presenting…` : `${who} is typing…`;
  } else if (explain !== null && game.hands[HUMAN].includes(explain)) {
    const c = card(explain);
    status =
      bestOpen < 0
        ? `${c.name} has nowhere to go — you have no open cells. Close out, or wait for a spread to claim more.`
        : `${c.name} needs a ${'$'.repeat(c.cost)} cell; your best open cell has ${'$'.repeat(bestOpen)}. Spreads add $ to the cells they reach.`;
  } else if (legal.length === 0) {
    status = `No moves — close out Q${qNo}.`;
  } else {
    const lead = theyPassed ? `${who} closed out. ` : '';
    status =
      lead +
      (selected === null
        ? 'Pick a card'
        : pending === null
          ? `Place ${card(selected).name} — tap a yellow cell`
          : `Tap again to ${
              pendingCard
                ? `paste ${card(selected).name} (${card(selected).value}) over ${card(pendingCard).name} (${card(pendingCard).value})`
                : `place ${card(selected).name}`
            }${effects.flip.length ? ` — flips ${effects.flip.length}` : ''}${
              effects.boost.length ? ` — boosts ${effects.boost.length}` : ''
            }${effects.weaken.length ? ` — weakens ${effects.weaken.length}` : ''}`);
  }

  const tip =
    summary || paused || match.over
      ? null
      : pickTip(
          {
            humanTurn,
            firstTurnOfMatch: match.quarterNo === 1 && match.quarter.turn === 0,
            selected: selected !== null,
            previewFlips: effects.flip.length > 0,
            financeClosedOut: theyPassed,
            who,
            lead: mine - theirs,
            mods,
            hasUnaffordable: humanTurn && game.hands[HUMAN].some((id) => !legal.some((a) => a.card === id)),
            myCardsOnBoard: match.quarter.cells.filter((c) => c.owner === HUMAN && c.card !== null).length,
            quarterNo: match.quarterNo,
          },
          seenTips,
        );

  let dialog: {
    title: string;
    body: string;
    button: string;
    onClick: () => void;
    /** The rubber stamp slammed on the result, from the player's side. */
    stamp: 'approved' | 'rejected' | 'tabled';
  } | null = null;
  const stampFor = (w: Player | null) => (w === HUMAN ? 'approved' : w === null ? 'tabled' : 'rejected');
  if (summary) {
    const [a, b] = summary.result.revenue;
    const w = summary.result.winner;
    if (match.over) {
      const quarters = match.results.map((r) => (r.winner === 0 ? 'W' : r.winner === 1 ? 'L' : 'T')).join(' ');
      dialog = meetingName
        ? {
            title: match.winner === 0 ? `${meetingName}: nailed it` : `${meetingName}: not great`,
            body: `Q${summary.quarterNo}: ${a}–${b}. ${
              match.winner === 0 ? 'You won the meeting.' : 'You did not win the meeting.'
            } Quarters: ${quarters}`,
            button: 'Continue',
            onClick: finishYear,
            stamp: stampFor(match.winner),
          }
        : {
            title: match.winner === 0 ? 'Promotion!' : match.winner === 1 ? 'Performance review' : 'Flat year',
            body: `Q${summary.quarterNo}: ${a}–${b}. ${
              match.winner === 0 ? 'You won the year.' : match.winner === 1 ? `${who} won the year.` : 'Nobody won the year.'
            } Quarters: ${quarters}`,
            button: 'Back to home',
            onClick: finishYear,
            stamp: stampFor(match.winner),
          };
    } else {
      dialog = {
        title: `Q${summary.quarterNo} results`,
        body: `${a}–${b}. ${
          w === 0 ? `You beat ${who}.` : w === 1 ? `${who} beat you.` : 'Tied — both lose a life.'
        } Q${summary.quarterNo + 1} starts on a fresh sheet; you draw ${
          match.config.drawAfter[summary.quarterNo - 1] ?? 0
        } and keep your hand.`,
        button: `Start Q${summary.quarterNo + 1}`,
        stamp: stampFor(w),
        onClick: () => {
          setSummary(null);
          setFx(null); // the next quarter starts on a still, fresh sheet
        },
      };
    }
  }

  return (
    <div className="app">
      {mods.jokers.length > 0 && (
        <div className="tray" data-tray aria-label="Your jokers">
          {mods.jokers.map((j) => (
            <div key={j} className="joker" data-joker={j}>
              <span className="jglyph">{JOKERS[j]!.glyph}</span>
              <span className="jname">{JOKERS[j]!.name}</span>
              <span className="jblurb">{JOKERS[j]!.blurb}</span>
            </div>
          ))}
        </div>
      )}
      <div className="window">
        <div className="titlebar">
          <span data-title>{meetingName ? `${meetingName}.xls — Q${qNo}` : `QBR.xls — Q${qNo} Review`}</span>
          <span className="tb-buttons">
            <b>_</b>
            <b>□</b>
            <button className="tb-close" data-exit aria-label="Back to home" onClick={onExit}>
              ×
            </button>
          </span>
        </div>

        <div className={`opponent ${!summary && !match.over && game.toMove === 1 ? 'live' : ''}`} data-opponent>
          <span className="avatar">
            <AvatarImage id={whoInitials} size={40} />
          </span>
          <span className="who">
            <b>{who}</b>
            <small>{theyPassed ? 'closed out' : !summary && game.toMove === 1 ? 'is typing…' : 'on mute'}</small>
            {boss && (
              <span className="boss" data-boss={boss.id} title={boss.blurb}>
                {boss.name}: {boss.blurb}
              </span>
            )}
          </span>
          <Lives n={match.lives[1]} max={maxLives} label={who} />
          <span className="backs" aria-label={`${game.hands[1].length} cards in hand`}>
            {game.hands[1].map((_, k) => (
              <i key={k} />
            ))}
          </span>
        </div>

        <div className="formula">
          <span className="fx">fx</span>
          <span data-status>{status}</span>
        </div>

        {/* Bindy's one-time tips float over Finance's side of the board,
            away from your hand and home row. */}
        <div className="tip-anchor">
          {tip && (
            <TipBubble text={tip.text} mood={tip.mood} onDismiss={() => setSeenTips((s) => markTipSeen(s, tip.id))} />
          )}
        </div>

        <div className="sheet" role="grid">
          <div className="hd corner" />
          {LANE_LETTERS.map((l, sc) => (
            <div key={l} className="hd lane">
              {l}
              <small>{UNITS[sc]}</small>
            </div>
          ))}
          {Array.from({ length: SCREEN_ROWS }, (_, sr) => [
            <div key={`n${sr}`} className="hd num">
              {sr + 1}
            </div>,
            ...Array.from({ length: SCREEN_COLS }, (_, sc) => {
              const i = fromScreen(sr, sc);
              const cell = game.cells[i]!;
              const cls = [
                'cell',
                cell.owner === 0 ? 'mine' : cell.owner === 1 ? 'theirs' : '',
                legalCells.has(i) ? 'legal' : '',
                pending === i ? 'pending' : '',
                claimCells.has(i) ? 'reach' : '',
                flipCells.has(i) ? 'flip' : '',
                abilityDelta.has(i) ? (abilityDelta.get(i)!.startsWith('+') ? 'boost' : 'weaken') : '',
                blocked.has(i) ? 'blocked' : '',
              ].join(' ');
              return (
                <div
                  key={i}
                  className={cls}
                  data-cell={i}
                  data-owner={cell.owner === 0 ? 'you' : cell.owner === 1 ? 'them' : 'none'}
                  role="gridcell"
                  aria-label={cellLabel(game, i, { sr, sc }, who, blocked.has(i))}
                  data-sr={sr}
                  data-sc={sc}
                  onPointerEnter={(e) => e.pointerType === 'mouse' && setHover(i)}
                  onPointerLeave={(e) => e.pointerType === 'mouse' && setHover(null)}
                  onClick={() => tapCell(i)}
                >
                  {cell.card ? (
                    <span
                      className="placed"
                      // A per-move key re-mounts the span so its animation replays.
                      key={fxKind(i) ? `fx-${fx!.id}` : 'still'}
                      data-fx={fxKind(i) ?? undefined}
                    >
                      <span className="pname">{card(cell.card).name}</span>
                      <CellValue printed={card(cell.card).value} actual={cellValue(game, i)} />
                    </span>
                  ) : (
                    <span className="budget">{'$'.repeat(cell.budget)}</span>
                  )}
                  {abilityDelta.has(i) && (
                    <i className="delta" data-preview-delta={abilityDelta.get(i)} aria-hidden>
                      {abilityDelta.get(i)}
                    </i>
                  )}
                  {fx && fx.id !== settledFx && fx.destroy.includes(i) && (
                    <i key={`destroy-${fx.id}`} className="fx-destroy" data-fx="destroy" aria-hidden>
                      ✕
                    </i>
                  )}
                  {claimOrder.has(i) && (
                    <i
                      key={`claim-${fx!.id}`}
                      className={`fx-claim ${fx!.by === HUMAN ? 'by-you' : 'by-them'}`}
                      data-fx="claim"
                      style={{ animationDelay: `${claimOrder.get(i)! * FX_STEP_MS}ms` }}
                      aria-hidden
                    />
                  )}
                </div>
              );
            }),
          ])}
          <div className="hd num sumlabel">=SUM</div>
          {rows.map((row, sc) => (
            <div
              key={`s${sc}`}
              // While a quarter's result shows, the lanes that were banked pulse.
              className={`sum ${row.winner === 0 ? 'win' : row.winner === 1 ? 'lose' : ''} ${
                summary && row.winner !== null ? 'banked' : ''
              }`}
              style={summary ? { animationDelay: `${sc * 120}ms` } : undefined}
              data-lane-total={sc}
              aria-label={laneLabel(sc, row.totals[0], row.totals[1], who)}
            >
              <span className="you">{row.totals[0]}</span>
              <span className="vs">vs</span>
              <span className="them">{row.totals[1]}</span>
            </div>
          ))}
        </div>

        <div className="hand">
          {game.hands[HUMAN].map((id, k) => {
            const playable = humanTurn && legal.some((a) => a.card === id);
            // On your turn a card you cannot afford stays tappable (it explains
            // itself) and says what it needs; off-turn everything is disabled.
            const short = humanTurn && !playable;
            return (
              <button
                key={`${id}-${k}`}
                className={`card ${selected === id ? 'sel' : ''} ${short ? 'unaffordable' : ''} ${explain === id ? 'explained' : ''}`}
                data-card={id}
                data-playable={playable ? 'true' : 'false'}
                aria-label={
                  cardLabel(id) +
                  (short ? ` — can't play: ${bestOpen < 0 ? 'no open cell' : `needs a ${'$'.repeat(card(id).cost)} cell`}` : '')
                }
                aria-disabled={!playable}
                disabled={!humanTurn}
                onClick={() => pickCard(id)}
              >
                <CardFace id={id} />
                {short && (
                  <span className="needs" data-needs>
                    {bestOpen < 0 ? 'no open cell' : `needs ${'$'.repeat(card(id).cost)}`}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="actions">
          <button className="btn" data-pass disabled={!humanTurn} onClick={() => act({ type: 'pass' })}>
            Close out Q{qNo}
          </button>
          <span className="rev">
            <span>
              <b data-mine>{mine}</b> you · <b>{theirs}</b> {who}
            </span>
            <span className="you-lives">
              <Lives n={match.lives[0]} max={maxLives} label="You" />
              <small>{game.hands[HUMAN].length} cards</small>
            </span>
          </span>
        </div>

        {dialog && (
          <div className="dialog-scrim">
            <div className="dialog" role="dialog" aria-label={dialog.title} data-dialog>
              <div className="titlebar">
                <span>{dialog.title}</span>
              </div>
              <p>{dialog.body}</p>
              <span className={`stamp ${dialog.stamp}`} data-stamp={dialog.stamp} aria-hidden>
                {dialog.stamp.toUpperCase()}
              </span>
              <button className="btn" data-dialog-button onClick={dialog.onClick}>
                {dialog.button}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
