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
import { SCREEN_COLS, SCREEN_ROWS, fromScreen, spreadToScreen } from './layout.js';
import { TipBubble } from './Mascot.js';
import { loadSeenTips, markTipSeen, pickTip } from './tips.js';

/** The AI "thinks" this long before replying, so its move reads as a move. */
export const AI_DELAY_MS = 450;

const UNITS = ['Sales', 'Ops', 'R&D'] as const;
const LANE_LETTERS = ['A', 'B', 'C'] as const;
const HUMAN = 0;

function freshSeed(): number {
  return (Date.now() ^ (Math.random() * 0x7fffffff)) >>> 0;
}

/** A card's spread drawn as a 3-wide x 5-tall mini-grid centred on the card,
 *  oriented like the board: forward is up. */
function SpreadGlyph({ id }: { id: string }) {
  const hits = new Set(
    card(id).spread.map((o) => {
      const { dx, dy } = spreadToScreen(o);
      return `${dx},${dy}`;
    }),
  );
  const cells = [];
  for (let dy = -2; dy <= 2; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const cls = dx === 0 && dy === 0 ? 'g self' : hits.has(`${dx},${dy}`) ? 'g hit' : 'g';
      cells.push(<i key={`${dx},${dy}`} className={cls} />);
    }
  }
  return <span className="glyph">{cells}</span>;
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
}: GameProps = {}) {
  const opponent = useMemo(() => opponentPolicy(opponentKind), [opponentKind]);
  const [match, setMatch] = useState<MatchState>(() =>
    newMatch(seed ?? freshSeed(), STARTER_DECK, DEFAULT_MATCH, MATCH_RULES, mods),
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

  const apply = (m: MatchState, a: Action) => {
    const next = matchReducer(m, a);
    if (next.results.length > m.results.length) {
      setSummary({ quarterNo: m.quarterNo, board: reducer(m.quarter, a), result: next.results.at(-1)! });
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
      setSelected(null);
      setExplain(explain === id ? null : id);
      return;
    }
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
    if (pending === i) act({ type: 'play', card: selected, cell: i });
    else setPending(i);
  };

  const finishYear = () => onYearEnd?.(match.winner, match.results);

  const rows = rowResults(game);
  const [mine, theirs] = revenue(game);

  const preview = pending ?? hover;
  const effects = useMemo(
    () =>
      selected !== null && preview !== null && legalCells.has(preview)
        ? spreadEffects(game, selected, preview, HUMAN)
        : { claim: [], flip: [] },
    [game, selected, preview, legalCells],
  );
  const claimCells = useMemo(() => new Set(effects.claim), [effects]);
  const flipCells = useMemo(() => new Set(effects.flip), [effects]);

  const pendingCard = pending === null ? null : game.cells[pending]!.card;
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
            }${effects.flip.length ? ` — flips ${effects.flip.length}` : ''}`);
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
          },
          seenTips,
        );

  let dialog: { title: string; body: string; button: string; onClick: () => void } | null = null;
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
          }
        : {
            title: match.winner === 0 ? 'Promotion!' : match.winner === 1 ? 'Performance review' : 'Flat year',
            body: `Q${summary.quarterNo}: ${a}–${b}. ${
              match.winner === 0 ? 'You won the year.' : match.winner === 1 ? `${who} won the year.` : 'Nobody won the year.'
            } Quarters: ${quarters}`,
            button: 'Back to home',
            onClick: finishYear,
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
        onClick: () => setSummary(null),
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
          <span className="avatar" aria-hidden>
            {whoInitials}
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
                blocked.has(i) ? 'blocked' : '',
              ].join(' ');
              return (
                <div
                  key={i}
                  className={cls}
                  data-cell={i}
                  data-sr={sr}
                  data-sc={sc}
                  onPointerEnter={(e) => e.pointerType === 'mouse' && setHover(i)}
                  onPointerLeave={(e) => e.pointerType === 'mouse' && setHover(null)}
                  onClick={() => tapCell(i)}
                >
                  {cell.card ? (
                    <span className="placed">
                      <span className="pname">{card(cell.card).name}</span>
                      <CellValue printed={card(cell.card).value} actual={cellValue(game, i)} />
                    </span>
                  ) : (
                    <span className="budget">{'$'.repeat(cell.budget)}</span>
                  )}
                </div>
              );
            }),
          ])}
          <div className="hd num sumlabel">=SUM</div>
          {rows.map((row, sc) => (
            <div
              key={`s${sc}`}
              className={`sum ${row.winner === 0 ? 'win' : row.winner === 1 ? 'lose' : ''}`}
              data-lane-total={sc}
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
                aria-disabled={!playable}
                disabled={!humanTurn}
                onClick={() => pickCard(id)}
              >
                <span className="cost">{'$'.repeat(card(id).cost)}</span>
                <span className="cname">{card(id).name}</span>
                <SpreadGlyph id={id} />
                <span className="cval">{card(id).value}</span>
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
