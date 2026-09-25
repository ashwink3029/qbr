// "Bindy", QBR's office assistant: an original BINDER CLIP, drawn here as
// inline SVG. Deliberately not a paperclip and not Microsoft's Clippit — see the
// IP guardrails in CLAUDE.md. (Briefly named "Clipper"; renamed because it was
// one letter-swap from "Clippy", the exact resemblance the guardrails forbid.) The jaw is the face: open when talking, shut when
// idle, tilted when worried. Placeholder art until the commissioned pixel set.

export type Mood = 'idle' | 'talk' | 'worried';

export function BinderClip({ mood = 'idle', size = 56 }: { mood?: Mood; size?: number }) {
  // Jaw opening (the gap between the two body plates), by mood.
  const gap = mood === 'talk' ? 7 : mood === 'worried' ? 3 : 0;
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
      {/* Wire handles (arms), folded up and out. */}
      <path d="M22 26 L12 6 L20 4 L27 24" fill="none" stroke="#c9ccd1" strokeWidth="3" strokeLinejoin="round" />
      <path d="M42 26 L52 6 L44 4 L37 24" fill="none" stroke="#c9ccd1" strokeWidth="3" strokeLinejoin="round" />
      {/* Upper plate. */}
      <path d="M14 26 L50 26 L54 40 L10 40 Z" fill="#1d1d1d" />
      {/* Lower plate / jaw, dropped by `gap`. */}
      <path d={`M10 ${42 + gap} L54 ${42 + gap} L50 ${56 + gap} L14 ${56 + gap} Z`} fill="#2b2b2b" />
      {gap > 0 && <rect x="14" y="40" width="36" height={gap + 2} fill="#9b1c0c" />}
      {/* Eyes on the upper plate; worried eyes tilt inward. */}
      <g fill="#fff">
        <ellipse cx="25" cy="33" rx="4" ry={mood === 'worried' ? 3 : 4} />
        <ellipse cx="39" cy="33" rx="4" ry={mood === 'worried' ? 3 : 4} />
      </g>
      <g fill="#111">
        <circle cx={mood === 'worried' ? 26 : 25} cy="34" r="2" />
        <circle cx={mood === 'worried' ? 38 : 39} cy="34" r="2" />
      </g>
      {mood === 'worried' && (
        <path d="M20 27 L29 29 M44 27 L35 29" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" />
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
