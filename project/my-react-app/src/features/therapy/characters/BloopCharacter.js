import React from 'react';
import './Characters.css';

/**
 * BloopCharacter Component
 * 
 * Small, round, soft-looking blue/purple alien.
 * Bloop is the funny friend who makes silly mistakes to make learning fun and non-intimidating!
 *
 * Props:
 * - state: 'idle' | 'confused' | 'silly' | 'oops' | 'happy' | 'thinking'
 * - size: number (default 110)
 * - bubbleText: string (optional floating message like "Baaaaat?" or "Oops!")
 * - onClick: function
 */
const BloopCharacter = ({
  state = 'idle',
  size = 110,
  bubbleText = null,
  onClick = null,
  showLabel = false,
}) => {
  const isConfused = state === 'confused' || state === 'oops' || state === 'headShake';
  const isSilly = state === 'silly';
  const isHappy = state === 'happy';

  return (
    <div
      className={`character-wrapper char-bloop ${state}`}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
      onClick={onClick}
    >
      {/* Optional Speech Bubble */}
      {bubbleText && <div className="char-speech-bubble" style={{ borderColor: '#c084fc' }}>{bubbleText}</div>}

      <svg
        width={size}
        height={size}
        viewBox="0 0 150 150"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ filter: 'drop-shadow(0 8px 18px rgba(192, 132, 252, 0.4))' }}
      >
        <defs>
          <linearGradient id="bloopBodyGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#60a5fa" />
            <stop offset="50%" stopColor="#a78bfa" />
            <stop offset="100%" stopColor="#c084fc" />
          </linearGradient>
          <linearGradient id="bloopBellyGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(255,255,255,0.4)" />
            <stop offset="100%" stopColor="rgba(224,231,255,0.15)" />
          </linearGradient>
        </defs>

        {/* ── Tiny Animated Antennae ── */}
        <g className="char-bloop-antenna-svg">
          {/* Left Antenna */}
          <path d="M 58 40 Q 48 20 40 15" stroke="#a78bfa" strokeWidth="3.5" strokeLinecap="round" />
          <circle cx="38" cy="14" r="6" fill="#fbbf24" stroke="#d97706" strokeWidth="1.5" />
          <circle cx="36" cy="12" r="2" fill="#ffffff" />

          {/* Right Antenna */}
          <path d="M 92 40 Q 102 20 110 15" stroke="#a78bfa" strokeWidth="3.5" strokeLinecap="round" />
          <circle cx="112" cy="14" r="6" fill="#fbbf24" stroke="#d97706" strokeWidth="1.5" />
          <circle cx="110" cy="12" r="2" fill="#ffffff" />
        </g>

        {/* ── Soft Round Squishy Body ── */}
        <path
          d="M 75 35 C 115 35 132 60 130 95 C 128 128 108 140 75 140 C 42 140 22 128 20 95 C 18 60 35 35 75 35 Z"
          fill="url(#bloopBodyGrad)"
          stroke="#7c3aed"
          strokeWidth="3"
        />

        {/* Soft Tummy Spot */}
        <ellipse cx="75" cy="102" rx="34" ry="24" fill="url(#bloopBellyGrad)" />

        {/* Tiny Blob Feet */}
        <ellipse cx="48" cy="138" rx="14" ry="7" fill="#6d28d9" />
        <ellipse cx="102" cy="138" rx="14" ry="7" fill="#6d28d9" />

        {/* Tiny Stubby Arms */}
        {isSilly ? (
          /* Raised Silly Arms */
          <g>
            <ellipse cx="20" cy="80" rx="9" ry="6" fill="#a78bfa" stroke="#7c3aed" strokeWidth="2" transform="rotate(-30 20 80)" />
            <ellipse cx="130" cy="80" rx="9" ry="6" fill="#a78bfa" stroke="#7c3aed" strokeWidth="2" transform="rotate(30 130 80)" />
          </g>
        ) : isConfused ? (
          /* One Arm Scratching Head */
          <g>
            <ellipse cx="22" cy="65" rx="8" ry="12" fill="#a78bfa" stroke="#7c3aed" strokeWidth="2" transform="rotate(-40 22 65)" />
            <ellipse cx="130" cy="98" rx="8" ry="6" fill="#a78bfa" stroke="#7c3aed" strokeWidth="2" />
          </g>
        ) : (
          /* Relaxed Arms */
          <g>
            <ellipse cx="20" cy="96" rx="8" ry="6" fill="#a78bfa" stroke="#7c3aed" strokeWidth="2" />
            <ellipse cx="130" cy="96" rx="8" ry="6" fill="#a78bfa" stroke="#7c3aed" strokeWidth="2" />
          </g>
        )}

        {/* ── Huge Expressive Eyes (Single Cyclops or Big Pair) ── */}
        <g className="char-eye-blink">
          {/* Big Left Eye */}
          <circle cx="58" cy="70" r="16" fill="#ffffff" stroke="#4c1d95" strokeWidth="2.5" />
          <circle cx="60" cy="70" r="8" fill="#1e1b4b" />
          <circle cx="57" cy="66" r="3.5" fill="#ffffff" />
          <circle cx="63" cy="73" r="1.5" fill="#ffffff" />

          {/* Big Right Eye */}
          <circle cx="92" cy="70" r="16" fill="#ffffff" stroke="#4c1d95" strokeWidth="2.5" />
          <circle cx="90" cy="70" r="8" fill="#1e1b4b" />
          <circle cx="87" cy="66" r="3.5" fill="#ffffff" />
          <circle cx="93" cy="73" r="1.5" fill="#ffffff" />
        </g>

        {/* Spiral confused pupil effect when confused */}
        {isConfused && (
          <g>
            <path d="M 58 66 Q 62 70 58 74" stroke="#38bdf8" strokeWidth="1.5" fill="none" />
            <path d="M 90 66 Q 94 70 90 74" stroke="#38bdf8" strokeWidth="1.5" fill="none" />
          </g>
        )}

        {/* ── Facial Expressions & Mouth ── */}
        {isConfused ? (
          /* Wobbly Wavy Confused Mouth */
          <path d="M 60 98 Q 67 92 75 98 Q 83 104 90 98" stroke="#312e81" strokeWidth="3" strokeLinecap="round" fill="none" />
        ) : isSilly ? (
          /* Open Wacky Tongue Mouth */
          <g>
            <path d="M 60 95 Q 75 115 90 95 Z" fill="#4c1d95" />
            <path d="M 68 104 Q 75 114 82 104" fill="#f43f5e" />
          </g>
        ) : isHappy ? (
          /* Big Cheerful Blob Smile */
          <path d="M 62 95 Q 75 110 88 95" stroke="#312e81" strokeWidth="3.5" strokeLinecap="round" fill="none" />
        ) : (
          /* Small Cute Blob Mouth */
          <ellipse cx="75" cy="95" rx="5" ry="4" fill="#312e81" />
        )}

        {/* Cute Purple Cheek Spots */}
        <circle cx="38" cy="85" r="4" fill="#c084fc" opacity="0.6" />
        <circle cx="112" cy="85" r="4" fill="#c084fc" opacity="0.6" />
      </svg>

      {showLabel && (
        <span
          style={{
            marginTop: '4px',
            fontSize: '0.78rem',
            fontWeight: 800,
            color: '#c084fc',
            letterSpacing: '0.04em',
          }}
        >
          👽 Bloop
        </span>
      )}
    </div>
  );
};

export default BloopCharacter;
