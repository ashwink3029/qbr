// Portrait view of the sheet. The rules model is 3 lanes (ROWS) x 5 columns,
// with the human's home at column 0 and the opponent's at column COLS-1, and
// "forward" = +column. On a phone the lanes run UP the screen instead: the
// human's home is the bottom screen row, the opponent's the top, and forward is
// up. This is a pure view transpose — the reducer never knows about it.
import { COLS, ROWS, idx } from '@qbr/shared';

export const SCREEN_ROWS = COLS; // 5, top = opponent home
export const SCREEN_COLS = ROWS; // 3 lanes, left to right

export interface ScreenPos {
  readonly sr: number;
  readonly sc: number;
}

export function toScreen(cell: number): ScreenPos {
  const row = Math.floor(cell / COLS);
  const col = cell % COLS;
  return { sr: COLS - 1 - col, sc: row };
}

export function fromScreen(sr: number, sc: number): number {
  return idx(sc, COLS - 1 - sr);
}

/**
 * A card's spread offset [dRow, dCol] (dCol = forward) as a screen offset for the
 * human player: forward is up (-y), lane change is sideways (+x).
 */
export function spreadToScreen([dRow, dCol]: readonly [number, number]): { dx: number; dy: number } {
  return { dx: dRow, dy: 0 - dCol }; // 0 - x, not -x: avoids -0
}
