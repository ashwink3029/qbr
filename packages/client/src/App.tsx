import { useEffect, useMemo, useState } from 'react';
import {
  STARTER_DECK,
  card,
  legalPlays,
  lookaheadPolicy,
  matchReducer,
  newMatch,
  reducer,
  revenue,
  rowResults,
  smartPass,
  spreadEffects,
  type Action,
  type GameState,
  type MatchState,
  type QuarterResult,
  type RngState,
} from '@qbr/shared';
import { SCREEN_COLS, SCREEN_ROWS, fromScreen, spreadToScreen } from './layout.js';

/** The AI "thinks" this long before replying, so its move reads as a move. */
export const AI_DELAY_MS = 450;

const UNITS = ['Sales', 'Ops', 'R&D'] as const;
const LANE_LETTERS = ['A', 'B', 'C'] as const;
const HUMAN = 0;

/** Finance plays the strongest measured policy: 2-ply lookahead with the
 *  Gwent-style pass plan (see match.ts / sim/src/matchbars.ts). */
const opponent = smartPass(lookaheadPolicy);

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

interface Summary {
  readonly quarterNo: number;
  /** The ended quarter's final board (the match has already reset it). */
  readonly board: GameState;
  readonly result: QuarterResult;
}

export function App({ seed }: { seed?: number } = {}) {
  const [match, setMatch] = useState<MatchState>(() => newMatch(seed ?? freshSeed(), STARTER_DECK));
  const [summary, setSummary] = useState<Summary | null>(null);
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
    if (summary || match.over || match.quarter.toMove === HUMAN) return;
    const t = setTimeout(() => {
      const [next, action] = opponent(match, aiRng);
      setAiRng(next);
      apply(match, action);
    }, AI_DELAY_MS);
    return () => clearTimeout(t);
  }, [match, aiRng, summary]);

  // Touch has no hover, so the first tap on a legal cell previews the spread
  // (`pending`) and a second tap on the same cell commits. A mouse also gets
  // the preview on hover, but still commits the same way.
  const [pending, setPending] = useState<number | null>(null);
  const [hover, setHover] = useState<number | null>(null);

  const act = (a: Action) => {
    apply(match, a);
    setSelected(null);
    setPending(null);
  };

  const pickCard = (id: string) => {
    setSelected(selected === id ? null : id);
    setPending(null);
  };

  const tapCell = (i: number) => {
    if (!humanTurn || selected === null || !legalCells.has(i)) return;
    if (pending === i) act({ type: 'play', card: selected, cell: i });
    else setPending(i);
  };

  const startNewMatch = () => {
    setMatch(newMatch(freshSeed(), STARTER_DECK));
    setSummary(null);
    setSelected(null);
    setPending(null);
  };

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
          ? 'Finance won the quarter'
          : 'Flat quarter — both lose a life';
    status = `Q${summary.quarterNo} closed ${a}–${b}. ${verdict}.`;
  } else if (!humanTurn) {
    status = iPassed ? `You closed out Q${qNo} — Finance is still presenting…` : 'Finance is typing…';
  } else if (legal.length === 0) {
    status = `No moves — close out Q${qNo}.`;
  } else {
    const lead = theyPassed ? 'Finance closed out. ' : '';
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

  let dialog: { title: string; body: string; button: string; onClick: () => void } | null = null;
  if (summary) {
    const [a, b] = summary.result.revenue;
    const w = summary.result.winner;
    if (match.over) {
      dialog = {
        title: match.winner === 0 ? 'Promotion!' : match.winner === 1 ? 'Performance review' : 'Flat year',
        body: `Q${summary.quarterNo}: ${a}–${b}. ${
          match.winner === 0 ? 'You won the year.' : match.winner === 1 ? 'Finance won the year.' : 'Nobody won the year.'
        } Quarters: ${match.results.map((r) => (r.winner === 0 ? 'W' : r.winner === 1 ? 'L' : 'T')).join(' ')}`,
        button: 'New year',
        onClick: startNewMatch,
      };
    } else {
      dialog = {
        title: `Q${summary.quarterNo} results`,
        body: `${a}–${b}. ${
          w === 0 ? 'You beat Finance.' : w === 1 ? 'Finance beat you.' : 'Tied — both lose a life.'
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
      <div className="window">
        <div className="titlebar">
          <span data-title>QBR.xls — Q{qNo} Review</span>
          <span className="tb-buttons">
            <b>_</b>
            <b>□</b>
            <b>×</b>
          </span>
        </div>

        <div className={`opponent ${!summary && !match.over && game.toMove === 1 ? 'live' : ''}`} data-opponent>
          <span className="avatar" aria-hidden>
            FIN
          </span>
          <span className="who">
            <b>Finance</b>
            <small>{theyPassed ? 'closed out' : !summary && game.toMove === 1 ? 'is typing…' : 'on mute'}</small>
          </span>
          <Lives n={match.lives[1]} max={maxLives} label="Finance" />
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
                      <span className="pval">{card(cell.card).value}</span>
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
          {game.hands[HUMAN].map((id, k) => (
            <button
              key={`${id}-${k}`}
              className={`card ${selected === id ? 'sel' : ''}`}
              data-card={id}
              disabled={!humanTurn || !legal.some((a) => a.card === id)}
              onClick={() => pickCard(id)}
            >
              <span className="cost">{'$'.repeat(card(id).cost)}</span>
              <span className="cname">{card(id).name}</span>
              <SpreadGlyph id={id} />
              <span className="cval">{card(id).value}</span>
            </button>
          ))}
        </div>

        <div className="actions">
          <button className="btn" data-pass disabled={!humanTurn} onClick={() => act({ type: 'pass' })}>
            Close out Q{qNo}
          </button>
          <span className="rev">
            <span>
              <b data-mine>{mine}</b> you · <b>{theirs}</b> Finance
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
