import { card } from '@qbr/shared';
import { abilityBadge } from './a11y.js';
import { spreadToScreen } from './layout.js';

/** A card's spread drawn as a 3-wide x 5-tall mini-grid centred on the card,
 *  oriented like the board: forward is up. */
export function SpreadGlyph({ id }: { id: string }) {
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
