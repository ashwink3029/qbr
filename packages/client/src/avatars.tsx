// Opponent avatars: 16x16 pixel portraits authored as character maps and drawn
// as crisp SVG rects — the same "placeholder art in code" approach as Bindy and
// the app icon, sized so a commissioned pixel set can replace them 1:1 (see the
// IP guardrails in CLAUDE.md). All five are fictional office types; none is
// meant to resemble a real person.
//
// Map legend: '.' = the avatar's webcam background; any other character is
// looked up in the avatar's palette.

export interface Avatar {
  readonly name: string;
  /** Webcam-tile background colour. */
  readonly bg: string;
  readonly palette: Readonly<Record<string, string>>;
  /** 16 rows of 16 characters. */
  readonly map: readonly string[];
}

const EYES = { w: '#ffffff', e: '#1a1a1a', m: '#a8413a' };

export const AVATARS: Readonly<Record<string, Avatar>> = {
  INT: {
    name: 'The Intern — hoodie, lanyard, nervous grin',
    bg: '#a8d8ea',
    palette: { ...EYES, s: '#f1c7a3', S: '#d9a57f', H: '#6b4226', c: '#5b7fb5', C: '#3f5f8f', y: '#f2c14e' },
    map: [
      '......H..H......',
      '.....HHHHHH.....',
      '....HHHHHHHH....',
      '...HHHHHHHHHH...',
      '...HHssssssHH...',
      '...ssssssssss...',
      '...sswesswess...',
      '...sssssSssss...',
      '...ssmmmmmmss...',
      '....ssssssss....',
      '......ssss......',
      '...ccyccccycc...',
      '..cccyccccyccc..',
      '.cccccyccyccccc.',
      '.cccccCyyCccccc.',
      '.ccccccyycccccc.',
    ],
  },
  MGR: {
    name: 'The Manager — side part, headset, blue tie',
    bg: '#cde5c3',
    palette: { ...EYES, s: '#c68642', S: '#a86b32', H: '#1f1a17', c: '#f4f4f4', t: '#2f5fb3', g: '#333333' },
    map: [
      '................',
      '.....HHHHHH.....',
      '....HHHHHHHH....',
      '...HHHHHHHHHH...',
      '...HHHHssssss...',
      '...ssssssssssg..',
      '...sswesswessg..',
      '...sssssSssssg..',
      '...sssmmmsggg...',
      '....ssssssss....',
      '......ssss......',
      '...ccccttcccc...',
      '..cccccttccccc..',
      '.ccccccttcccccc.',
      '.ccccccttcccccc.',
      '.ccccccttcccccc.',
    ],
  },
  FIN: {
    name: 'Finance — green visor, glasses, sweater vest',
    bg: '#e9dcc0',
    palette: { ...EYES, s: '#e8b894', S: '#c9926a', H: '#9a9a9a', g: '#2e8b57', k: '#1a1a1a', c: '#7a2a3a', t: '#333333' },
    map: [
      '................',
      '................',
      '....HHHHHHHH....',
      '..gggggggggggg..',
      '...gggggggggg...',
      '...ssssssssss...',
      '...skwekkweks...',
      '...sssssSssss...',
      '...ssssmmssss...',
      '....ssssssss....',
      '......ssss......',
      '...cccwwwwccc...',
      '..ccccwwwwcccc..',
      '.cccccwttwccccc.',
      '.ccccccttcccccc.',
      '.ccccccttcccccc.',
    ],
  },
  VP: {
    name: 'The VP — slicked hair, sunglasses, power tie',
    bg: '#d6c7e8',
    palette: { ...EYES, s: '#f0c8a0', S: '#d4a57c', H: '#b8b8b8', k: '#111111', c: '#2a2f45', C: '#1b1f30', t: '#c0392b' },
    map: [
      '................',
      '....HHHHHHH.....',
      '...HHHHHHHHHH...',
      '...HHHHHHHHHHH..',
      '...HssssssssHH..',
      '...ssssssssss...',
      '...skkksskkks...',
      '...sssssSssss...',
      '...ssssmmmsss...',
      '....ssssssss....',
      '......ssss......',
      '...CcwwttwwcC...',
      '..CccwwttwwccC..',
      '.CcccwwttwwcccC.',
      '.CccccwttwccccC.',
      '.CcccccttcccccC.',
    ],
  },
  CEO: {
    name: 'The CEO — silver beard, pinstripes, gold tie',
    bg: '#3b3b58',
    palette: { ...EYES, s: '#8d5524', S: '#6f4119', H: '#d9d9d9', c: '#1f2233', C: '#3a3f5c', y: '#d4af37' },
    map: [
      '................',
      '................',
      '.....ssssss.....',
      '....HssssssH....',
      '...HHssssssHH...',
      '...HssssssssH...',
      '...sswesswess...',
      '...sssssSssss...',
      '...sssmmmmsss...',
      '....sHHHHHHs....',
      '......HHHH......',
      '...cccwyywccc...',
      '..ccccwyywcccc..',
      '.cCcccwyywcccCc.',
      '.cCcCccyyccCcCc.',
      '.cCcCccyyccCcCc.',
    ],
  },
};

/** Horizontal runs of one colour, so a 16x16 portrait is ~100 rects, not 256. */
function runs(a: Avatar): { x: number; y: number; w: number; fill: string }[] {
  const out: { x: number; y: number; w: number; fill: string }[] = [];
  a.map.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const ch = row[x]!;
      let w = 1;
      while (x + w < row.length && row[x + w] === ch) w++;
      if (ch !== '.') out.push({ x, y, w, fill: a.palette[ch]! });
      x += w;
    }
  });
  return out;
}

/** An opponent's portrait, or the initials tile when there is no avatar. */
export function AvatarImage({ id, size = 40 }: { id: string; size?: number }) {
  const a = AVATARS[id];
  if (!a) return <span className="avatar-fallback">{id}</span>;
  return (
    <svg
      className="pixel-avatar"
      width={size}
      height={size}
      viewBox="0 0 16 16"
      shapeRendering="crispEdges"
      role="img"
      aria-label={a.name}
      data-avatar={id}
    >
      <rect width="16" height="16" fill={a.bg} />
      {runs(a).map((r) => (
        <rect key={`${r.x},${r.y}`} x={r.x} y={r.y} width={r.w} height={1} fill={r.fill} />
      ))}
    </svg>
  );
}
