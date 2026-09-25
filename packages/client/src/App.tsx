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

  const act = (a: Action) => {
    setGame((g) => reducer(g, a));
    setSelected(null);
  };

  const humanTurn = !game.over && game.toMove === HUMAN;
  const rows = rowResults(game);
  const [mine, theirs] = revenue(game);

  const [preview, setPreview] = useState<number | null>(null);
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
    status = selected ? `Place ${card(selected).name}` : 'Pick a card';
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

        <table className="sheet">
          <thead>
            <tr>
              <th />
              {COL_LETTERS.map((l) => (
                <th key={l}>{l}</th>
              ))}
              <th className="sum">=SUM</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: ROWS }, (_, r) => (
              <tr key={r}>
                <th className="unit">
                  {r + 1}
                  <small>{UNITS[r]}</small>
                </th>
                {Array.from({ length: COLS }, (_, c) => {
                  const i = idx(r, c);
                  const cell = game.cells[i]!;
                  const cls = [
                    'cell',
                    cell.owner === 0 ? 'mine' : cell.owner === 1 ? 'theirs' : '',
                    legalCells.has(i) ? 'legal' : '',
                    previewTargets.has(i) ? 'reach' : '',
                  ].join(' ');
                  return (
                    <td
                      key={c}
                      className={cls}
                      data-cell={i}
                      onPointerEnter={() => setPreview(i)}
                      onClick={() => {
                        if (humanTurn && selected && legalCells.has(i)) act({ type: 'play', card: selected, cell: i });
                      }}
                    >
                      {cell.card ? (
                        <span className="placed">
                          <span className="pname">{card(cell.card).name}</span>
                          <span className="pval">{card(cell.card).value}</span>
                        </span>
                      ) : (
                        <span className="budget">{'$'.repeat(cell.budget)}</span>
                      )}
                    </td>
                  );
                })}
                <td className={`sum ${rows[r]!.winner === 0 ? 'win' : rows[r]!.winner === 1 ? 'lose' : ''}`}>
                  {rows[r]!.totals[0]}–{rows[r]!.totals[1]}
                </td>
              </tr>
            ))}
            <tr className="totals">
              <th />
              <td colSpan={COLS} className="rev">
                Revenue: <b data-mine>{mine}</b> you · <b>{theirs}</b> them
              </td>
              <td />
            </tr>
          </tbody>
        </table>

        <div className="hand">
          {game.hands[HUMAN].map((id, k) => (
            <button
              key={`${id}-${k}`}
              className={`card ${selected === id ? 'sel' : ''}`}
              data-card={id}
              disabled={!humanTurn || !legal.some((a) => a.card === id)}
              onClick={() => setSelected(selected === id ? null : id)}
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
