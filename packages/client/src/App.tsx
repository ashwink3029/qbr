import { useEffect, useMemo, useState } from 'react';
import {
  COLS,
  ROWS,
  STARTER_DECK,
  card,
  idx,
  legalPlays,
  lookaheadPolicy,
  newGame,
  reducer,
  revenue,
  rowResults,
  spreadTargets,
  type Action,
  type GameState,
  type RngState,
} from '@qbr/shared';

/** The AI "thinks" this long before replying, so its move reads as a move. */
export const AI_DELAY_MS = 450;

const UNITS = ['Sales', 'Ops', 'R&D'] as const;
const COL_LETTERS = ['A', 'B', 'C', 'D', 'E'] as const;
const HUMAN = 0;

function freshSeed(): number {
  return (Date.now() ^ (Math.random() * 0x7fffffff)) >>> 0;
}

/** A card's spread drawn as a 3x5 mini-grid centred on the card. */
function SpreadGlyph({ id }: { id: string }) {
  const hits = new Set(card(id).spread.map(([r, c]) => `${r},${c}`));
  const cells = [];
  for (let r = -1; r <= 1; r++) {
    for (let c = -2; c <= 2; c++) {
      const cls = r === 0 && c === 0 ? 'g self' : hits.has(`${r},${c}`) ? 'g hit' : 'g';
      cells.push(<i key={`${r},${c}`} className={cls} />);
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
  const previewTargets = useMemo(
    () =>
      selected !== null && preview !== null && legalCells.has(preview)
        ? new Set(spreadTargets(selected, preview, HUMAN))
        : new Set<number>(),
    [selected, preview, legalCells],
  );

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
          : `Tap again to place ${card(selected).name}`;
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

        <div className="formula">
          <span className="fx">fx</span>
          <span data-status>{status}</span>
        </div>

        <div className="sheet" role="grid">
          <div className="hd corner" />
          {COL_LETTERS.map((l) => (
            <div key={l} className="hd">
              {l}
            </div>
          ))}
          <div className="hd">=SUM</div>
          {Array.from({ length: ROWS }, (_, r) => {
            const row = rows[r]!;
            return [
              <div key={`u${r}`} className="hd unit">
                {r + 1}
                <small>{UNITS[r]}</small>
              </div>,
              ...Array.from({ length: COLS }, (_, c) => {
                const i = idx(r, c);
                const cell = game.cells[i]!;
                const cls = [
                  'cell',
                  cell.owner === 0 ? 'mine' : cell.owner === 1 ? 'theirs' : '',
                  legalCells.has(i) ? 'legal' : '',
                  pending === i ? 'pending' : '',
                  previewTargets.has(i) ? 'reach' : '',
                ].join(' ');
                return (
                  <div
                    key={i}
                    className={cls}
                    data-cell={i}
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
              <div key={`s${r}`} className={`sum ${row.winner === 0 ? 'win' : row.winner === 1 ? 'lose' : ''}`}>
                {row.totals[0]}–{row.totals[1]}
              </div>,
            ];
          })}
          <div className="rev">
            Revenue <b data-mine>{mine}</b> you · <b>{theirs}</b> them
          </div>
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
          <span className="deck">Deck {game.decks[HUMAN].length}</span>
        </div>
      </div>
    </div>
  );
}
