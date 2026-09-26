// The match seen from the other chair, for "Play your coworker": the guest holds
// seat 1, but every screen (layout, tips, the human's hand) is drawn for seat 0. So
// the guest renders mirrorMatch(real) and sends mirrorAction(tap) back.
//
// Seats swap (hands, decks, passes, lives, results, who moves) and the board flips
// left-right, which also flips each side's "forward". Safe only because mirroring
// COMMUTES with the rules — mirror.test.ts checks mirror(reduce(m, a)) ===
// reduce(mirror(m), mirror(a)) across whole random matches. Mods are seat-bound
// (jokers are seat 0's, the boss seat 1's), so a mirrored match must have none.
import { COLS, colOf, idx, rowOf, type Action, type Cell, type GameState, type Player } from './game.js';
import type { MatchState, QuarterResult } from './match.js';

const other = (p: Player): Player => (p === 0 ? 1 : 0);
const swap = <T>(pair: readonly [T, T]): [T, T] => [pair[1], pair[0]];

export const mirrorCell = (i: number): number => idx(rowOf(i), COLS - 1 - colOf(i));

export function mirrorAction(a: Action): Action {
  return a.type === 'play' ? { ...a, cell: mirrorCell(a.cell) } : a;
}

function mirrorGame(g: GameState): GameState {
  if (g.mods.jokers.length > 0 || g.mods.boss !== null || g.mods.oppEdge || g.mods.oppHomeBoost) {
    throw new Error('cannot mirror a game with mods: jokers and bosses belong to fixed seats');
  }
  const cells: Cell[] = g.cells.map((_, i) => {
    const c = g.cells[mirrorCell(i)]!;
    return { ...c, owner: c.owner === null ? null : other(c.owner) };
  });
  return {
    ...g,
    cells,
    hands: swap(g.hands),
    decks: swap(g.decks),
    toMove: other(g.toMove),
    passed: swap(g.passed),
  };
}

function mirrorResult(r: QuarterResult): QuarterResult {
  return { ...r, revenue: swap(r.revenue), winner: r.winner === null ? null : other(r.winner) };
}

export function mirrorMatch(m: MatchState): MatchState {
  return {
    ...m,
    quarter: mirrorGame(m.quarter),
    lives: swap(m.lives),
    results: m.results.map(mirrorResult),
    starter: other(m.starter),
    winner: m.winner === null ? null : other(m.winner),
  };
}
