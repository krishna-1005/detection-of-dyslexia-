import React from 'react';
import './Characters.css';

/**
 * EchoCharacter Component
 * 
 * Cute floating space creature with large fluffy ears, small wings, glowing cyan markings.
 * Echo's special ability is repeating target sounds and emitting cyan sound waves toward the magic jar!
 *
 * Props:
 * - state: 'idle' | 'floating' | 'listening' | 'repeating' | 'emitting'
 * - size: number (default 110)
 * - bubbleText: string (optional target word sound like "Ball!")
 * - onClick: function
 */
const EchoCharacter = ({
  state = 'idle',
  size = 110,
  bubbleText = null,
  onClick = null,
  showLabel = false,
}) => {
  const isRepeating = state === 'repeating' || state === 'emitting';

  return (
    <div
      className={`character-wrapper char-echo ${state}`}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
      onClick={onClick}
    >
      {/* Sound Wave Emission Rings when repeating */}
      {isRepeating && (
        <>
          <div className="echo-sound-wave-ring" style={{ animationDelay: '0s' }} />
          <div className="echo-sound-wave-ring" style={{ animationDelay: '0.4s' }} />
        </>
      )}

      {/* Optional Speech Bubble */}
      {bubbleText && <div className="char-speech-bubble" style={{ borderColor: '#22d3ee' }}>{bubbleText}</div>}

      <svg
        width={size}
        height={size}
        viewBox="0 0 150 150"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ filter: 'drop-shadow(0 0 15px rgba(34, 211, 238, 0.5))' }}
      >
        <defs>
          <linearGradient id="echoBodyGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#06b6d4" />
            <stop offset="50%" stopColor="#22d3ee" />
            <stop offset="100%" stopColor="#67e8f9" />
          </linearGradient>
          <linearGradient id="echoEarGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#a5f3fc" />
            <stop offset="100%" stopColor="#0891b2" />
          </linearGradient>
          <radialGradient id="echoGlowCenter" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#0891b2" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* ── Fluffy Animated Wings ── */}
        <g>
          {/* Left Wing */}
          <path
            className="char-echo-wing-l"
            d="M 45 65 C 20 40 5 60 25 80 C 35 90 45 78 45 65 Z"
            fill="url(#echoEarGrad)"
            stroke="#0891b2"
            strokeWidth="2"
          />
          {/* Right Wing */}
          <path
            className="char-echo-wing-r"
            d="M 105 65 C 130 40 145 60 125 80 C 115 90 105 78 105 65 Z"
            fill="url(#echoEarGrad)"
            stroke="#0891b2"
            strokeWidth="2"
          />
        </g>

        {/* ── Large Fluffy Ears ── */}
        {/* Left Ear */}
        <path
          d="M 52 45 C 30 15 15 30 38 52 Z"
          fill="url(#echoBodyGrad)"
          stroke="#0891b2"
          strokeWidth="2.5"
        />
        <path d="M 48 42 C 34 24 24 34 38 48 Z" fill="#cffafe" />

        {/* Right Ear */}
        <path
          d="M 98 45 C 120 15 135 30 112 52 Z"
          fill="url(#echoBodyGrad)"
          stroke="#0891b2"
          strokeWidth="2.5"
        />
        <path d="M 102 42 C 116 24 126 34 112 48 Z" fill="#cffafe" />

        {/* ── Soft Rounded Body ── */}
        <circle cx="75" cy="78" r="36" fill="url(#echoBodyGrad)" stroke="#0891b2" strokeWidth="2.5" />

        {/* Glowing Cyan Chest Marking (Sound Wave Emblem) */}
        <circle cx="75" cy="92" r="14" fill="url(#echoGlowCenter)" />
        <path
          d="M 67 92 Q 71 86 75 92 Q 79 98 83 92"
          stroke="#ffffff"
          strokeWidth="2.5"
          strokeLinecap="round"
          fill="none"
        />

        {/* ── Large Expressive Eyes ── */}
        <g className="char-eye-blink">
          {/* Left Eye */}
          <circle cx="62" cy="70" r="11" fill="#ffffff" stroke="#0891b2" strokeWidth="2" />
          <circle cx="62" cy="70" r="5.5" fill="#0e7490" />
          <circle cx="60" cy="67" r="2.5" fill="#ffffff" />

          {/* Right Eye */}
          <circle cx="88" cy="70" r="11" fill="#ffffff" stroke="#0891b2" strokeWidth="2" />
          <circle cx="88" cy="70" r="5.5" fill="#0e7490" />
          <circle cx="86" cy="67" r="2.5" fill="#ffffff" />
        </g>

        {/* Tiny Sweet Mouth */}
        {isRepeating ? (
          /* Singing / Speaking Oval Mouth */
          <ellipse cx="75" cy="80" rx="5" ry="6" fill="#0e7490" stroke="#cffafe" strokeWidth="1.5" />
        ) : (
          /* Happy Curve Mouth */
          <path d="M 70 80 Q 75 85 80 80" stroke="#0e7490" strokeWidth="2.5" strokeLinecap="round" fill="none" />
        )}

        {/* Soft Glowing Markings on Forehead */}
        <ellipse cx="75" cy="52" rx="4" ry="2" fill="#cffafe" opacity="0.9" />
        <ellipse cx="66" cy="56" rx="2.5" ry="1.5" fill="#cffafe" opacity="0.7" />
        <ellipse cx="84" cy="56" rx="2.5" ry="1.5" fill="#cffafe" opacity="0.7" />
      </svg>

      {showLabel && (
        <span
          style={{
            marginTop: '4px',
            fontSize: '0.78rem',
            fontWeight: 800,
            color: '#22d3ee',
            letterSpacing: '0.04em',
          }}
        >
          ✨ Echo
        </span>
      )}
    </div>
  );
};

export default EchoCharacter;
