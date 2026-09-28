import { useRef, type MouseEvent } from 'react';
import { card } from '@qbr/shared';
import { abilityWords, spreadWords } from './a11y.js';
import { SpreadGlyph } from './CardFace.js';

/** How long a press must last to open the inspector instead of tapping. */
export const HOLD_MS = 450;

/**
 * Tap-and-hold for any card. `hold(onLong)` returns pointer handlers for one element;
 * one pair of refs serves the whole component, since only one finger holds at a time.
 * A press that becomes a hold swallows the click that follows, so a hold never also
 * selects, places or removes a card.
 */
export function useHold() {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fired = useRef(false);
  const clear = () => {
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = null;
  };
  return (onLong: () => void) => ({
    onPointerDown: () => {
      fired.current = false;
      clear();
      timer.current = setTimeout(() => {
        timer.current = null;
        fired.current = true;
        onLong();
      }, HOLD_MS);
    },
    onPointerUp: clear,
    onPointerCancel: clear,
    onClickCapture: (e: MouseEvent) => {
      if (!fired.current) return;
      fired.current = false;
      e.preventDefault();
      e.stopPropagation();
    },
    // iOS would otherwise offer its own long-press menu.
    onContextMenu: (e: MouseEvent) => e.preventDefault(),
  });
}

const plain = (s: string) => s.replace(/­/g, '');

/**
 * One card, large: name, cost, the spread drawn big, value, and the same facts in words.
 * Its text follows the iOS text-size setting (`-apple-system-body`), scoped to this
 * overlay so the board's fixed layout never moves. Tap anywhere to close.
 */
export function CardInspector({ id, onClose }: { id: string; onClose: () => void }) {
  const c = card(id);
  const ability = abilityWords(id);
  const cost = '$'.repeat(c.cost);
  // Close only on a tap that STARTED here: when a hold ends, the browser sends a click
  // where the finger lifts, which is now on this overlay; that click must not close it.
  const armed = useRef(false);
  return (
    <div
      className="inspector-scrim"
      data-inspector={id}
      role="dialog"
      aria-label={`${plain(c.name)}, up close`}
      onPointerDown={() => (armed.current = true)}
      onClick={() => armed.current && onClose()}
    >
      <div className="inspector">
        <span className="icost">{cost}</span>
        <span className="iname">{plain(c.name)}</span>
        <SpreadGlyph id={id} />
        <span className="ival">{c.value}</span>
        <p className="iwords">
          Needs a {cost} cell. Value {c.value}. Spreads {spreadWords(id)}.
          {ability && ` It ${ability}.`}
        </p>
        <small>tap to close</small>
      </div>
    </div>
  );
}
