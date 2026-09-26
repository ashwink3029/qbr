// What a play visibly changes, for animation: the cell the card lands on, the
// cells its spread claims (ordered nearest-first so the fill ripples outward),
// and the enemy cards it takes over. Derived from the shared `spreadEffects`,
// so the animation can never disagree with the rules (same principle as the
// green/orange preview).
import { colOf, rowOf, spreadEffects, type Action, type GameState, type Player } from '@qbr/shared';

/** Stagger between ripple rings, and the longest any move effect runs. Kept
 *  inside the opponent's 450ms "thinking" delay so animation never slows a turn. */
export const FX_STEP_MS = 70;
export const FX_MAX_MS = 420;

export interface MoveFx {
  /** Increments per move, so the renderer can re-trigger CSS animations. */
  readonly id: number;
  readonly by: Player;
  readonly placed: number;
  readonly claim: readonly { cell: number; order: number }[];
  readonly flip: readonly number[];
}

let nextId = 1;

/** The effects of `action` on `before` (the quarter as it was), or null for a pass. */
export function moveFx(before: GameState, action: Action): MoveFx | null {
  if (action.type !== 'play') return null;
  const by = before.toMove;
  const { claim, flip } = spreadEffects(before, action.card, action.cell, by);
  const r0 = rowOf(action.cell);
  const c0 = colOf(action.cell);
  // Grid-step (Manhattan) rings: orthogonal neighbours first, then diagonals and
  // two-cell leaps one beat later — the fill reads as spreading outward.
  const ring = (i: number) => Math.abs(rowOf(i) - r0) + Math.abs(colOf(i) - c0);
  const rings = [...new Set(claim.map(ring))].sort((a, b) => a - b);
  return {
    id: nextId++,
    by,
    placed: action.cell,
    claim: claim.map((cell) => ({ cell, order: rings.indexOf(ring(cell)) })),
    flip: [...flip],
  };
}
