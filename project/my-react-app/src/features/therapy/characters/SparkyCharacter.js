import React from 'react';
import './Characters.css';

/**
 * SparkyCharacter Component
 * 
 * Sparky — Friendly cartoon space-explorer boy mascot.
 * Features wavy dark brown hair, blue/white space suit, small backpack, cape, and cyan details.
 *
 * Props:
 * - state: 'idle' | 'happy' | 'listening' | 'thinking' | 'celebrating' | 'tryAgain' | 'speaking'
 * - size: number (default 120)
 * - bubbleText: string (optional floating speech bubble message)
 * - onClick: function
 */
const SparkyCharacter = ({
  state = 'idle',
  size = 125,
  bubbleText = null,
  onClick = null,
  showLabel = false,
}) => {
  const isCelebrating = state === 'celebrating' || state === 'happy';
  const isListening = state === 'listening';
  const isThinking = state === 'thinking';
  const isTryAgain = state === 'tryAgain';

  return (
    <div
      className={`character-wrapper char-sparky ${state}`}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
      onClick={onClick}
    >
      {/* Speech Bubble */}
      {bubbleText && <div className="char-speech-bubble">{bubbleText}</div>}

      <svg
        width={size}
        height={size}
        viewBox="0 0 160 160"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ filter: 'drop-shadow(0 8px 24px rgba(56, 189, 248, 0.4))' }}
      >
        <defs>
          {/* Wavy Dark Brown Hair Gradient */}
          <linearGradient id="sparkyBrownHairGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#451a03" />
            <stop offset="60%" stopColor="#78350f" />
            <stop offset="100%" stopColor="#3B1705" />
          </linearGradient>

          {/* Blue & White Space Suit Gradients */}
          <linearGradient id="sparkyBlueSuitGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="50%" stopColor="#2563eb" />
            <stop offset="100%" stopColor="#1d4ed8" />
          </linearGradient>

          <linearGradient id="sparkyWhiteSuitGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#e2e8f0" />
          </linearGradient>

          {/* Cape Gradient */}
          <linearGradient id="sparkyCapeGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="100%" stopColor="#06b6d4" />
          </linearGradient>

          <linearGradient id="sparkySkinGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#ffedd5" />
            <stop offset="100%" stopColor="#fed7aa" />
          </linearGradient>

          <linearGradient id="helmetGlass" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="rgba(255,255,255,0.45)" />
            <stop offset="50%" stopColor="rgba(56,189,248,0.18)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0.08)" />
          </linearGradient>
        </defs>

        {/* ── Flowing Hero Cape ── */}
        <path
          d="M 45 110 Q 15 130 25 155 Q 80 165 135 155 Q 145 130 115 110 Z"
          fill="url(#sparkyCapeGrad)"
          stroke="#0284c7"
          strokeWidth="2.5"
        />

        {/* ── Jetpack / Space Backpack ── */}
        <rect x="36" y="95" width="16" height="38" rx="8" fill="#64748b" stroke="#334155" strokeWidth="2" />
        <rect x="108" y="95" width="16" height="38" rx="8" fill="#64748b" stroke="#334155" strokeWidth="2" />
        <circle cx="44" cy="122" r="4" fill="#38bdf8" />
        <circle cx="116" cy="122" r="4" fill="#38bdf8" />

        {/* ── Blue & White Space Suit Body ── */}
        <path
          d="M 48 112 Q 80 102 112 112 L 120 152 Q 80 160 40 152 Z"
          fill="url(#sparkyBlueSuitGrad)"
          stroke="#1e3a8a"
          strokeWidth="3"
        />

        {/* White Chest Armor Plate */}
        <path
          d="M 58 112 Q 80 106 102 112 L 96 142 Q 80 148 64 142 Z"
          fill="url(#sparkyWhiteSuitGrad)"
          stroke="#94a3b8"
          strokeWidth="2"
        />

        {/* Cyan Glowing Star Badge */}
        <circle cx="80" cy="126" r="10" fill="#0f172a" stroke="#38bdf8" strokeWidth="2" />
        <path
          d="M 80 119 L 82.5 124.5 L 88.5 125.5 L 84 129 L 85.5 134.5 L 80 131.5 L 74.5 134.5 L 76 129 L 71.5 125.5 L 77.5 124.5 Z"
          fill="#fbbf24"
        />

        {/* Arms / Hands */}
        {isCelebrating ? (
          /* Raised Victory Arms */
          <g>
            <path d="M 45 118 Q 24 90 28 70" stroke="#38bdf8" strokeWidth="9" strokeLinecap="round" />
            <circle cx="28" cy="68" r="7" fill="#ffedd5" stroke="#1d4ed8" strokeWidth="2" />

            <path d="M 115 118 Q 136 90 132 70" stroke="#38bdf8" strokeWidth="9" strokeLinecap="round" />
            <circle cx="132" cy="68" r="7" fill="#ffedd5" stroke="#1d4ed8" strokeWidth="2" />
          </g>
        ) : state === 'thumbsUp' ? (
          /* Thumbs Up Gesture */
          <g>
            <path d="M 45 118 Q 28 126 26 138" stroke="#38bdf8" strokeWidth="9" strokeLinecap="round" />
            <circle cx="26" cy="140" r="7" fill="#ffedd5" stroke="#1d4ed8" strokeWidth="2" />

            <path d="M 115 118 Q 135 95 132 78" stroke="#38bdf8" strokeWidth="9" strokeLinecap="round" />
            {/* Hand & Raised Thumb */}
            <circle cx="132" cy="76" r="7" fill="#ffedd5" stroke="#1d4ed8" strokeWidth="2" />
            <path d="M 132 76 L 132 66" stroke="#ffedd5" strokeWidth="5" strokeLinecap="round" />
            <path d="M 132 76 L 132 66" stroke="#1d4ed8" strokeWidth="2" strokeLinecap="round" />
          </g>
        ) : isListening ? (
          /* Ear-Cupping Listening Gesture */
          <g>
            <path d="M 45 118 Q 28 108 30 84" stroke="#38bdf8" strokeWidth="9" strokeLinecap="round" />
            <circle cx="30" cy="82" r="7" fill="#ffedd5" stroke="#1d4ed8" strokeWidth="2" />

            <path d="M 115 118 Q 126 128 128 140" stroke="#38bdf8" strokeWidth="9" strokeLinecap="round" />
            <circle cx="128" cy="142" r="7" fill="#ffedd5" stroke="#1d4ed8" strokeWidth="2" />
          </g>
        ) : (
          /* Friendly Space Boy Wave */
          <g>
            <path d="M 45 118 Q 28 126 26 138" stroke="#38bdf8" strokeWidth="9" strokeLinecap="round" />
            <circle cx="26" cy="140" r="7" fill="#ffedd5" stroke="#1d4ed8" strokeWidth="2" />

            <path d="M 115 118 Q 134 102 138 88" stroke="#38bdf8" strokeWidth="9" strokeLinecap="round" />
            <circle cx="138" cy="84" r="7" fill="#ffedd5" stroke="#1d4ed8" strokeWidth="2" />
          </g>
        )}

        {/* Neck Collar */}
        <ellipse cx="80" cy="106" rx="26" ry="7" fill="#0f172a" stroke="#38bdf8" strokeWidth="2" />

        {/* ── Head / Skin ── */}
        <circle cx="80" cy="64" r="37" fill="url(#sparkySkinGrad)" stroke="#c2410c" strokeWidth="2.5" />

        {/* Wavy Dark Brown Hair */}
        <path
          d="M 44 56 C 36 28 54 12 76 16 C 88 12 108 14 116 38 C 118 52 114 56 112 44 C 100 28 82 28 66 32 C 54 35 46 44 44 56 Z"
          fill="url(#sparkyBrownHairGrad)"
          stroke="#451a03"
          strokeWidth="2"
        />
        {/* Front Wavy Bangs */}
        <path
          d="M 52 38 Q 66 24 82 34 Q 96 26 108 38 Q 94 32 82 38 Q 68 32 52 38 Z"
          fill="url(#sparkyBrownHairGrad)"
        />

        {/* Ears */}
        <circle cx="43" cy="65" r="6" fill="#fed7aa" stroke="#c2410c" strokeWidth="1.5" />
        <circle cx="117" cy="65" r="6" fill="#fed7aa" stroke="#c2410c" strokeWidth="1.5" />

        {/* ── Eyebrows ── */}
        {isTryAgain ? (
          /* Sad / Upset Worried Eyebrows 🥺 */
          <g>
            <path d="M 54 48 L 72 42" stroke="#451a03" strokeWidth="3.5" strokeLinecap="round" />
            <path d="M 88 42 L 106 48" stroke="#451a03" strokeWidth="3.5" strokeLinecap="round" />
          </g>
        ) : isThinking ? (
          <g>
            <path d="M 56 46 Q 64 50 72 46" stroke="#451a03" strokeWidth="3" strokeLinecap="round" />
            <path d="M 88 44 Q 96 42 104 46" stroke="#451a03" strokeWidth="3" strokeLinecap="round" />
          </g>
        ) : (
          <g>
            <path d="M 56 46 Q 64 40 72 46" stroke="#451a03" strokeWidth="3" strokeLinecap="round" />
            <path d="M 88 46 Q 96 40 104 46" stroke="#451a03" strokeWidth="3" strokeLinecap="round" />
          </g>
        )}

        {/* ── Large Expressive Eyes ── */}
        <g className="char-eye-blink">
          {/* Left Eye */}
          <circle cx="65" cy="58" r="10" fill="#ffffff" stroke="#0f172a" strokeWidth="2" />
          <circle cx="65" cy={isTryAgain ? "60" : "58"} r="5" fill="#0284c7" />
          <circle cx="63" cy={isTryAgain ? "58" : "56"} r="2" fill="#ffffff" />

          {/* Right Eye */}
          <circle cx="95" cy="58" r="10" fill="#ffffff" stroke="#0f172a" strokeWidth="2" />
          <circle cx="95" cy={isTryAgain ? "60" : "58"} r="5" fill="#0284c7" />
          <circle cx="93" cy={isTryAgain ? "58" : "56"} r="2" fill="#ffffff" />
        </g>

        {/* Nose */}
        <path d="M 78 64 Q 80 70 82 64" stroke="#ea580c" strokeWidth="2.5" strokeLinecap="round" />

        {/* ── Mouth Expressions ── */}
        {isCelebrating ? (
          <path d="M 64 76 Q 80 94 96 76 Z" fill="#dc2626" stroke="#991b1b" strokeWidth="2" />
        ) : isListening ? (
          <circle cx="80" cy="78" r="6" fill="#0f172a" stroke="#0284c7" strokeWidth="2" />
        ) : isTryAgain ? (
          /* Clear Upset / Sad Frown Mouth ☹️ */
          <g>
            <path d="M 64 84 Q 80 70 96 84" stroke="#dc2626" strokeWidth="4" strokeLinecap="round" fill="none" />
            <path d="M 66 84 Q 80 74 94 84" stroke="#991b1b" strokeWidth="1.5" strokeLinecap="round" fill="none" />
            {/* Sad Tear Drop */}
            <path d="M 102 66 Q 105 72 102 75 Q 99 72 102 66 Z" fill="#38bdf8" opacity="0.85" />
          </g>
        ) : (
          <path d="M 64 76 Q 80 90 96 76" stroke="#0f172a" strokeWidth="3.5" strokeLinecap="round" fill="none" />
        )}

        {/* Rosy Cheeks */}
        <circle cx="54" cy="70" r="5" fill="#f43f5e" opacity="0.35" />
        <circle cx="106" cy="70" r="5" fill="#f43f5e" opacity="0.35" />

        {/* ── Space Helmet Bubble Dome ── */}
        <circle
          cx="80"
          cy="60"
          r="48"
          fill="url(#helmetGlass)"
          stroke="rgba(56,189,248,0.65)"
          strokeWidth="3"
        />
        {/* Helmet Highlight */}
        <path d="M 45 38 Q 60 22 82 22" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" opacity="0.75" />
      </svg>

      {showLabel && (
        <span
          style={{
            marginTop: '4px',
            fontSize: '0.85rem',
            fontFamily: 'Fredoka, sans-serif',
            fontWeight: 700,
            color: '#38bdf8',
            letterSpacing: '0.04em',
          }}
        >
          🚀 Sparky
        </span>
      )}
    </div>
  );
};

export default SparkyCharacter;
