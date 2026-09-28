import { card } from '@qbr/shared';
import { abilityBadge } from './a11y.js';
import { spreadToScreen } from './layout.js';

/** A card's spread drawn as a 3-wide x 5-tall mini-grid centred on the card,
 *  oriented like the board: forward is up. */
export function SpreadGlyph({ id }: { id: string }) {
  const c = card(id);
  const green = c.spread.map(spreadToScreen);
  const purple = (c.takes ?? []).map(spreadToScreen);
  const offs = [...green, ...purple];
  const hits = new Set(green.map(({ dx, dy }) => `${dx},${dy}`));
  // Purple cells (item 16) take over an enemy card there, not just claim an empty cell.
  const takes = new Set(purple.map(({ dx, dy }) => `${dx},${dy}`));
  // Usually 5 tall; a card that reaches 3 ahead (Email Chain) grows a row.
  const top = Math.min(-2, ...offs.map((o) => o.dy));
  const cells = [];
  for (let dy = top; dy <= 2; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const k = `${dx},${dy}`;
      const cls = dx === 0 && dy === 0 ? 'g self' : takes.has(k) ? 'g take' : hits.has(k) ? 'g hit' : 'g';
      cells.push(<i key={`${dx},${dy}`} className={cls} />);
    }
  }
  return <span className="glyph">{cells}</span>;
}

/** The inside of a card — cost, name, spread, value — shared by the hand, the
 *  deck view and unlock announcements. */
export function CardFace({ id }: { id: string }) {
  const c = card(id);
  const badge = abilityBadge(id);
  return (
    <>
      <span className="cost">{'$'.repeat(c.cost)}</span>
      <span className="cname">{c.name}</span>
      <SpreadGlyph id={id} />
      {badge && (
        <span className="cab" data-ability={c.ability!.kind}>
          {badge}
        </span>
      )}
      <span className="cval">{c.value}</span>
    </>
  );
}
