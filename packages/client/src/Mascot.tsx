// "Bindy", QBR's office assistant: an original BINDER CLIP, drawn here as
// inline SVG. Deliberately not a paperclip and not Microsoft's Clippit — see the
// IP guardrails in CLAUDE.md. (Briefly named "Clipper"; renamed because it was
// one letter-swap from "Clippy", the exact resemblance the guardrails forbid.)
// v2 (2026-09-27): the first drawing (two split plates) didn't read as a clip. Now
// the silhouette carries it — black body with a rolled top edge, silver wire
// handles up like ears, a sheet of paper in its bite — and the face sits on the
// body, the mouth carrying the mood. Placeholder art until the commissioned set.

export type Mood = 'idle' | 'talk' | 'worried';

export function BinderClip({ mood = 'idle', size = 56 }: { mood?: Mood; size?: number }) {
  const worried = mood === 'worried';
  return (
    <svg
      className={`clipper ${mood}`}
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role="img"
      aria-label="Bindy the binder clip"
      data-mascot={mood}
    >
      {/* The sheet it's holding, peeking out below. */}
      <g transform="rotate(-5 32 54)">
        <rect x="13" y="42" width="38" height="20" rx="1.5" fill="#fff" stroke="#8b949e" strokeWidth="1.2" />
        <path d="M17 54 H47 M17 58.5 H47" stroke="#8fb8e0" strokeWidth="1.3" />
      </g>
      {/* Wire handles, folded up like ears; their ends tuck into the rolled edge. */}
      {/* Dark outline under the silver so they hold up on the grey tip bubble. */}
      {[
        ['#3b3e44', 5.4],
        ['#c3c9d0', 3],
      ].map(([stroke, width]) => (
        <g key={stroke} fill="none" stroke={stroke as string} strokeWidth={width} strokeLinejoin="round" strokeLinecap="round">
          <path d="M21 24 L14 8 Q13 4.5 16.5 4.5 L22 4.5 Q25.5 4.5 25.5 8 L27 24" />
          <path d="M43 24 L50 8 Q51 4.5 47.5 4.5 L42 4.5 Q38.5 4.5 38.5 8 L37 24" />
        </g>
      ))}
      {/* Body: a rounded trapezoid, wider at the bite. */}
      <path
        d="M17 26 Q17 20 23 20 L41 20 Q47 20 47 26 L52 47 Q52.5 51 48.5 51 L15.5 51 Q11.5 51 12 47 Z"
        fill="#232326"
      />
      {/* The rolled top edge the wires run through. */}
      <path d="M20 23.5 H44" stroke="#5a5d63" strokeWidth="3" strokeLinecap="round" />
      {/* Eyes; worried ones squint and look up at their brows. */}
      <g fill="#fff">
        <ellipse cx="25" cy="34" rx="5" ry={worried ? 4.5 : 5.5} />
        <ellipse cx="39" cy="34" rx="5" ry={worried ? 4.5 : 5.5} />
      </g>
      <g fill="#111">
        <circle cx={worried ? 26 : 25.5} cy={worried ? 33.5 : 35} r="3" />
        <circle cx={worried ? 38 : 38.5} cy={worried ? 33.5 : 35} r="3" />
      </g>
      <g fill="#fff">
        <circle cx={worried ? 27 : 26.8} cy={worried ? 32.3 : 33.6} r="1.1" />
        <circle cx={worried ? 39 : 39.8} cy={worried ? 32.3 : 33.6} r="1.1" />
      </g>
      {worried && (
        // Inner ends raised: worried, not cross.
        <path d="M20 29.5 L29 27 M44 29.5 L35 27" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" />
      )}
      <g fill="#ff8fa3" opacity="0.85">
        <ellipse cx="18.5" cy="42" rx="3" ry="2" />
        <ellipse cx="45.5" cy="42" rx="3" ry="2" />
      </g>
      {mood === 'talk' ? (
        <ellipse cx="32" cy="43.5" rx="3.2" ry="3" fill="#ff6b81" stroke="#fff" strokeWidth="1.2" />
      ) : worried ? (
        <path d="M28 44.5 Q30 42.5 32 44.5 Q34 46.5 36 44.5" fill="none" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" />
      ) : (
        <path d="M28.5 42.5 Q32 46.5 35.5 42.5" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
      )}
    </svg>
  );
}

/** A one-time tip in a 90s speech bubble; tap anywhere on it to dismiss. */
export function TipBubble({ text, mood = 'talk', onDismiss }: { text: string; mood?: Mood; onDismiss: () => void }) {
  return (
    <button className="tip" data-tip onClick={onDismiss} aria-label={`Tip: ${text}. Tap to dismiss.`}>
      <BinderClip mood={mood} size={48} />
      <span className="tip-text">
        {text}
        <small>tap to dismiss</small>
      </span>
    </button>
  );
}
