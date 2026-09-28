// Opponent avatars: 16x16 pixel portraits authored as character maps and drawn
// as crisp SVG rects — the same "placeholder art in code" approach as Bindy and
// the app icon, sized so a commissioned pixel set can replace them 1:1 (see the
// IP guardrails in CLAUDE.md). All fifteen are fictional office types; none is
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
  CTL: {
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
  // ── Orgs (item 15): Tech and HR casts ──
  NG: {
    name: 'The New Grad — beanie, big glasses, orange hoodie',
    bg: '#ffe3b3',
    palette: { ...EYES, s: '#e0ac69', S: '#c68c53', h: '#3b6ea5', H: '#2a2a2a', g: '#222222', o: '#e8742a', O: '#b8561a' },
    map: [
      '................',
      '.....hhhhhh.....',
      '....hhhhhhhh....',
      '...hhhhhhhhhh...',
      '...HHHHHHHHHH...',
      '...ssssssssss...',
      '..gggggsgggggg..',
      '...gwegsgweg....',
      '...sssssSssss...',
      '....sssmmsss....',
      '......ssss......',
      '...oooooooooo...',
      '..ooOooooooOoo..',
      '.oooOooooooOooo.',
      '.ooooooOOoooooo.',
      '.oooooooooooooo.',
    ],
  },
  SM: {
    name: 'The Scrum Master — ponytail, cardigan, sticky note on the sleeve',
    bg: '#d7ecd9',
    palette: { ...EYES, s: '#f3d2b3', S: '#dcb08e', H: '#8c3b2a', c: '#6aa37a', C: '#4d8060', y: '#f7e36b' },
    map: [
      '................',
      '.....HHHHHH.....',
      '....HHHHHHHH....',
      '...HHHHHHHHHH...',
      '...HHssssssHHH..',
      '...ssssssssssHH.',
      '...sswesswessHH.',
      '...sssssSssss.HH',
      '...ssmmmmmmss..H',
      '....ssssssss....',
      '......ssss......',
      '...cccccccccc...',
      '..ccCccccccCcc..',
      '.ycyCccccccCccc.',
      '.yycccccccccccc.',
      '.cccccccccccccc.',
    ],
  },
  TL: {
    name: 'The Tech Lead — beard, headphones, dark tee',
    bg: '#c9d6f0',
    palette: { ...EYES, s: '#8d5524', S: '#6f421b', H: '#1b1b1b', b: '#2b1d14', p: '#d0d0d0', P: '#7a7a7a', t: '#2e3440', T: '#4c566a' },
    map: [
      '................',
      '....PPPPPPPP....',
      '...P.HHHHHH.P...',
      '...PHHHHHHHHP...',
      '..ppHHssssHHpp..',
      '..ppssssssssspp.',
      '..ppswesswessp..',
      '....sssssSsss...',
      '....bbbmmmbbb...',
      '....bbbbbbbbb...',
      '......bbbb......',
      '...tttttttttt...',
      '..tttttTTttttt..',
      '.tttttTttTttttt.',
      '.ttttttTTtttttt.',
      '.tttttttttttttt.',
    ],
  },
  CTO: {
    name: 'The CTO — shaved head, black turtleneck, thin glasses',
    bg: '#e6e6e6',
    palette: { ...EYES, s: '#f1c27d', S: '#d9a55e', g: '#555555', k: '#111111', K: '#2a2a2a' },
    map: [
      '................',
      '................',
      '.....SSSSSS.....',
      '....ssssssss....',
      '...ssssssssss...',
      '...ssssssssss...',
      '...gwegsgweg....',
      '...sssssSssss...',
      '...sssmmmmsss...',
      '....ssssssss....',
      '.....kkkkkk.....',
      '...kkkkkkkkkk...',
      '..kkkKkkkkKkkk..',
      '.kkkkKkkkkKkkkk.',
      '.kkkkkkkkkkkkkk.',
      '.kkkkkkkkkkkkkk.',
    ],
  },
  FDR: {
    name: 'The Founder — curly hair, fleece vest over a tee',
    bg: '#f6d6e0',
    palette: { ...EYES, s: '#c68642', S: '#a86b32', H: '#3d2314', v: '#5a6f8f', V: '#415270', t: '#f4f4f4' },
    map: [
      '....H.H..H.H....',
      '...HHHHHHHHHH...',
      '..HHHHHHHHHHHH..',
      '..HHHHHHHHHHHH..',
      '..HHHssssssHHH..',
      '...ssssssssss...',
      '...sswesswess...',
      '...sssssSssss...',
      '...ssmmmmmmss...',
      '....ssssssss....',
      '......ssss......',
      '...vvvttttvvv...',
      '..vvvvttttvvvv..',
      '.vvvvVttttVvvvv.',
      '.vvvvVttttVvvvv.',
      '.vvvvvttttvvvvv.',
    ],
  },
  REC: {
    name: 'The Recruiter — top bun, pink blazer, big smile',
    bg: '#fbe7c6',
    palette: { ...EYES, s: '#ffdbac', S: '#e8b98a', H: '#b5651d', p: '#e05a8a', P: '#b83d6b', c: '#ffffff' },
    map: [
      '......HHHH......',
      '.....HHHHHH.....',
      '......HHHH......',
      '....HHHHHHHH....',
      '...HHssssssHH...',
      '...ssssssssss...',
      '...sswesswess...',
      '...sssssSssss...',
      '...smmmmmmmms...',
      '....ssmmmmss....',
      '......ssss......',
      '...pppcccppp....',
      '..ppppcccpppp...',
      '.pppPpcccpPppp..',
      '.pppPpcccpPpppp.',
      '.ppppppcpppppp..',
    ],
  },
  HRP: {
    name: 'The HR Partner — bob, cardigan, lanyard',
    bg: '#e0d4f5',
    palette: { ...EYES, s: '#8d5524', S: '#6f421b', H: '#111111', c: '#a883c9', C: '#7d5aa0', l: '#2f5fb3', y: '#f2c14e' },
    map: [
      '................',
      '....HHHHHHHH....',
      '...HHHHHHHHHH...',
      '..HHHHHHHHHHHH..',
      '..HHHssssssHHH..',
      '..HHssssssssHH..',
      '..HHswesswesHH..',
      '..HHsssSssssHH..',
      '..HHssmmmmssHH..',
      '....ssssssss....',
      '......ssss......',
      '...cccllllccc...',
      '..ccCcclccCccc..',
      '.cccCccylcCcccc.',
      '.ccccccyyccccc..',
      '.cccccccccccccc.',
    ],
  },
  CMP: {
    name: 'The Comp Lead — round glasses, striped shirt, pencil',
    bg: '#fff2b3',
    palette: { ...EYES, s: '#e0ac69', S: '#c68c53', H: '#6b4226', g: '#333333', c: '#dbe8f5', C: '#7fa3c8', y: '#f2c14e' },
    map: [
      '................',
      '.....HHHHHH.....',
      '....HHHHHHHH...y',
      '...HHHHHHHHHH.y.',
      '...HHssssssHHy..',
      '...ssssssssss...',
      '...gwegggweg....',
      '...ggsssSsggs...',
      '...sssmmmmsss...',
      '....ssssssss....',
      '......ssss......',
      '...cCcCcCcCcc...',
      '..cCcCcCcCcCcc..',
      '.cCcCcCcCcCcCcc.',
      '.cCcCcCcCcCcCcc.',
      '.cCcCcCcCcCcCcc.',
    ],
  },
  CHR: {
    name: 'The CHRO — silver bob, navy blazer, pearls',
    bg: '#d6eef5',
    palette: { ...EYES, s: '#f3d2b3', S: '#dcb08e', H: '#c9c9c9', n: '#233a66', N: '#16284a', q: '#f7f3e8' },
    map: [
      '................',
      '....HHHHHHHH....',
      '...HHHHHHHHHH...',
      '..HHHHHHHHHHHH..',
      '..HHHssssssHHH..',
      '..HHssssssssHH..',
      '..HHswesswesHH..',
      '..HHsssSssssHH..',
      '..HHssmmmmssHH..',
      '....ssssssss....',
      '.....qsqqsq.....',
      '...nnnqqqqnnn...',
      '..nnNnnnnnnNnn..',
      '.nnnNnnnnnnNnnn.',
      '.nnnnnnnnnnnnnn.',
      '.nnnnnnnnnnnnnn.',
    ],
  },
  BC: {
    name: 'The Board Chair — bald, grey sides, dark suit, red tie',
    bg: '#ecdcc8',
    palette: { ...EYES, s: '#c68642', S: '#a86b32', H: '#9a9a9a', k: '#1f2430', c: '#ffffff', r: '#b3261e' },
    map: [
      '................',
      '................',
      '.....ssssss.....',
      '....ssssssss....',
      '...HssssssssH...',
      '...HssssssssH...',
      '...sswesswess...',
      '...sssssSssss...',
      '...sssmmmmsss...',
      '....ssssssss....',
      '......ssss......',
      '...kkkcrrckkk...',
      '..kkkkcrrckkkk..',
      '.kkkkkkrrkkkkkk.',
      '.kkkkkkrrkkkkkk.',
      '.kkkkkkrrkkkkkk.',
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
