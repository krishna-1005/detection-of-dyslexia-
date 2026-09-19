import React from 'react';
import './Characters.css';

/**
 * ZipCharacter Component
 * 
 * Small energetic orange/coral fox space creature wearing tiny space goggles.
 * Zip is used for fun, playful timed challenges ("Can you find the sound before Zip reaches the destination?").
 *
 * Props:
 * - state: 'idle' | 'running' | 'speeding' | 'celebrating' | 'cheering'
 * - size: number (default 110)
 * - bubbleText: string (optional floating text)
 * - onClick: function
 */
const ZipCharacter = ({
  state = 'idle',
  size = 110,
  bubbleText = null,
  onClick = null,
  showLabel = false,
}) => {
  const isRunning = state === 'running' || state === 'speeding';
  const isCelebrating = state === 'celebrating' || state === 'cheering';

  return (
    <div
      className={`character-wrapper char-zip ${state}`}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
      onClick={onClick}
    >
      {/* Optional Speech Bubble */}
      {bubbleText && <div className="char-speech-bubble" style={{ borderColor: '#fb923c' }}>{bubbleText}</div>}

      <svg
        width={size}
        height={size}
        viewBox="0 0 150 150"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ filter: 'drop-shadow(0 8px 18px rgba(251, 146, 60, 0.4))' }}
      >
        <defs>
          <linearGradient id="zipBodyGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#fb923c" />
            <stop offset="50%" stopColor="#f97316" />
            <stop offset="100%" stopColor="#f43f5e" />
          </linearGradient>
          <linearGradient id="zipTailGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#f97316" />
            <stop offset="70%" stopColor="#fed7aa" />
            <stop offset="100%" stopColor="#ffffff" />
          </linearGradient>
          <linearGradient id="gogglesLens" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="100%" stopColor="#0284c7" />
          </linearGradient>
        </defs>

        {/* ── Fluffy Speed Tail ── */}
        <path
          d="M 35 90 C 10 70 -5 100 20 115 C 35 125 45 105 35 90 Z"
          fill="url(#zipTailGrad)"
          stroke="#c2410c"
          strokeWidth="2.5"
        />

        {/* ── Pointy Fox Ears ── */}
        {/* Left Ear */}
        <path d="M 46 45 L 30 10 L 60 30 Z" fill="url(#zipBodyGrad)" stroke="#c2410c" strokeWidth="2.5" />
        <path d="M 44 42 L 35 18 L 54 32 Z" fill="#fed7aa" />

        {/* Right Ear */}
        <path d="M 104 45 L 120 10 L 90 30 Z" fill="url(#zipBodyGrad)" stroke="#c2410c" strokeWidth="2.5" />
        <path d="M 106 42 L 115 18 L 96 32 Z" fill="#fed7aa" />

        {/* ── Body ── */}
        <path
          d="M 75 40 C 108 40 120 65 118 98 C 116 128 100 138 75 138 C 50 138 34 128 32 98 C 30 65 42 40 75 40 Z"
          fill="url(#zipBodyGrad)"
          stroke="#c2410c"
          strokeWidth="2.5"
        />

        {/* White Chest Patch */}
        <path d="M 60 90 Q 75 80 90 90 Q 85 125 75 130 Q 65 125 60 90 Z" fill="#fff7ed" />

        {/* Dynamic Running Paws */}
        {isRunning ? (
          <g>
            <ellipse cx="40" cy="136" rx="10" ry="5" fill="#ea580c" transform="rotate(-20 40 136)" />
            <ellipse cx="110" cy="136" rx="10" ry="5" fill="#ea580c" transform="rotate(20 110 136)" />
          </g>
        ) : isCelebrating ? (
          <g>
            <ellipse cx="38" cy="138" rx="8" ry="6" fill="#ea580c" />
            <ellipse cx="112" cy="138" rx="8" ry="6" fill="#ea580c" />
          </g>
        ) : (
          <g>
            <ellipse cx="50" cy="136" rx="8" ry="5" fill="#ea580c" />
            <ellipse cx="100" cy="136" rx="8" ry="5" fill="#ea580c" />
          </g>
        )}

        {/* ── Tiny Space Goggles ── */}
        <g>
          {/* Strap */}
          <path d="M 32 60 L 118 60" stroke="#1e293b" strokeWidth="5" strokeLinecap="round" />

          {/* Left Lens */}
          <circle cx="58" cy="60" r="15" fill="url(#gogglesLens)" stroke="#1e293b" strokeWidth="3" />
          <circle cx="54" cy="56" r="3.5" fill="#ffffff" opacity="0.8" />

          {/* Right Lens */}
          <circle cx="92" cy="60" r="15" fill="url(#gogglesLens)" stroke="#1e293b" strokeWidth="3" />
          <circle cx="88" cy="56" r="3.5" fill="#ffffff" opacity="0.8" />

          {/* Bridge */}
          <rect x="71" y="58" width="8" height="4" rx="2" fill="#1e293b" />
        </g>

        {/* Expressive Eyes inside Goggles */}
        <g className="char-eye-blink">
          <circle cx="58" cy="60" r="5" fill="#0f172a" />
          <circle cx="57" cy="58" r="1.5" fill="#ffffff" />
          <circle cx="92" cy="60" r="5" fill="#0f172a" />
          <circle cx="91" cy="58" r="1.5" fill="#ffffff" />
        </g>

        {/* Cute Black Nose */}
        <polygon points="75,76 71,71 79,71" fill="#1e293b" />

        {/* Cheerful Fox Mouth */}
        {isCelebrating ? (
          <path d="M 64 82 Q 75 94 86 82 Z" fill="#dc2626" stroke="#991b1b" strokeWidth="1.5" />
        ) : (
          <path d="M 66 82 Q 75 88 84 82" stroke="#1e293b" strokeWidth="2.5" strokeLinecap="round" fill="none" />
        )}
      </svg>

      {showLabel && (
        <span
          style={{
            marginTop: '4px',
            fontSize: '0.78rem',
            fontWeight: 800,
            color: '#fb923c',
            letterSpacing: '0.04em',
          }}
        >
          🦊 Zip
        </span>
      )}
    </div>
  );
};

export default ZipCharacter;
