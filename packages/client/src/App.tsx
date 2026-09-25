import { useEffect, useMemo, useState } from 'react';
import {
  STARTER_DECK,
  card,
  legalPlays,
  lookaheadPolicy,
  newGame,
  reducer,
  revenue,
  rowResults,
  spreadEffects,
  type Action,
  type GameState,
  type RngState,
} from '@qbr/shared';
import { SCREEN_COLS, SCREEN_ROWS, fromScreen, spreadToScreen } from './layout.js';

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

export function App({ seed }: { seed?: number } = {}) {
  const [game, setGame] = useState<GameState>(() => newGame(seed ?? freshSeed(), STARTER_DECK));
  const [aiRng, setAiRng] = useState<RngState>(() => (seed ?? 1) * 7919);
  const [selected, setSelected] = useState<string | null>(null);

  const legal = useMemo(() => legalPlays(game), [game]);
  const legalCells = useMemo(
    () => new Set(legal.filter((a) => a.card === selected).map((a) => a.cell)),
    [legal, selected],
  );

  const humanTurn = !game.over && game.toMove === HUMAN;

  // The opponent replies on a timer, never synchronously inside a click.
  useEffect(() => {
    if (game.over || game.toMove === HUMAN) return;
    const t = setTimeout(() => {
      const [next, action] = lookaheadPolicy(game, aiRng);
      setAiRng(next);
      setGame((g) => reducer(g, action));
    }, AI_DELAY_MS);
    return () => clearTimeout(t);
  }, [game, aiRng]);

  // Touch has no hover, so the first tap on a legal cell previews the spread
  // (`pending`) and a second tap on the same cell commits. A mouse also gets
  // the preview on hover, but still commits the same way.
  const [pending, setPending] = useState<number | null>(null);
  const [hover, setHover] = useState<number | null>(null);

  const act = (a: Action) => {
    setGame((g) => reducer(g, a));
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

  let status: string;
  if (game.over) {
    status = mine > theirs ? `Q3 closed. You beat plan by ${mine - theirs}.` : mine < theirs ? `Q3 closed. Missed by ${theirs - mine}.` : 'Q3 closed flat.';
  } else if (!humanTurn) {
    status = 'Finance is typing…';
  } else if (legal.length === 0) {
    status = 'No moves — defer to next quarter.';
  } else {
    status =
      selected === null
        ? 'Pick a card'
        : pending === null
          ? `Place ${card(selected).name} — tap a yellow cell`
          : `Tap again to ${pendingCard ? `paste ${card(selected).name} (${card(selected).value}) over ${card(pendingCard).name} (${card(pendingCard).value})` : `place ${card(selected).name}`}${
              effects.flip.length ? ` — flips ${effects.flip.length}` : ''
            }`;
  }

  return (
    <div className="app">
      <div className="window">
        <div className="titlebar">
          <span>QBR.xls — Q3 Review</span>
          <span className="tb-buttons">
            <b>_</b>
            <b>□</b>
            <b>×</b>
          </span>
        </div>

        <div className={`opponent ${game.toMove === 1 && !game.over ? 'live' : ''}`} data-opponent>
          <span className="avatar" aria-hidden>
            FIN
          </span>
          <span className="who">
            <b>Finance</b>
            <small>{game.toMove === 1 && !game.over ? 'is typing…' : 'on mute'}</small>
          </span>
          <span className="backs" aria-label={`${game.hands[1].length} cards in hand`}>
            {game.hands[1].map((_, k) => (
              <i key={k} />
            ))}
          </span>
          <span className="odeck">Deck {game.decks[1].length}</span>
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
          {game.over ? (
            <button className="btn" onClick={() => setGame(newGame(freshSeed(), STARTER_DECK))}>
              New quarter
            </button>
          ) : (
            <button className="btn" disabled={!humanTurn} onClick={() => act({ type: 'pass' })}>
              Defer to next quarter
            </button>
          )}
          <span className="rev">
            <span>
              <b data-mine>{mine}</b> you · <b>{theirs}</b> Finance
            </span>
            <small>Deck {game.decks[HUMAN].length}</small>
          </span>
        </div>
      </div>
    </div>
  );
}
