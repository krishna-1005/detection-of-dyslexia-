import React from 'react';
import './Characters.css';

/**
 * SoundSprite Component
 * 
 * Tiny magical sound creature residing inside the Magic Sound Jar.
 * Represents a successfully pronounced or collected phoneme sound!
 *
 * Props:
 * - phoneme: string (e.g. '/B/', '/M/', '/S/', '/T/')
 * - color: string (hex or CSS color)
 * - size: number (default 36)
 * - isAnimated: boolean
 */
const SoundSprite = ({
  phoneme = '/B/',
  color = '#22d3ee',
  size = 38,
  isAnimated = true,
}) => {
  return (
    <div
      className="sound-sprite-item"
      style={{
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyConstraint: 'center',
        position: 'relative',
        animation: isAnimated ? 'sprite-float 2.5s ease-in-out infinite, sprite-glow-pulse 2s ease-in-out infinite' : 'none',
        color: color,
        userSelect: 'none',
      }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 50 50"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ filter: `drop-shadow(0 0 10px ${color})` }}
      >
        {/* Outer Glow Orb Body */}
        <circle cx="25" cy="25" r="18" fill={color} fillOpacity="0.3" stroke={color} strokeWidth="2" />
        <circle cx="25" cy="25" r="13" fill={color} />

        {/* Highlight sparkle */}
        <circle cx="20" cy="20" r="4" fill="#ffffff" opacity="0.8" />
        <circle cx="17" cy="17" r="1.5" fill="#ffffff" opacity="0.9" />

        {/* Cute Expressive Eyes */}
        <circle cx="21" cy="24" r="2.2" fill="#0f172a" />
        <circle cx="29" cy="24" r="2.2" fill="#0f172a" />
        <circle cx="20.5" cy="23" r="0.8" fill="#ffffff" />
        <circle cx="28.5" cy="23" r="0.8" fill="#ffffff" />

        {/* Cute Smile */}
        <path d="M 22 28 Q 25 31 28 28" stroke="#0f172a" strokeWidth="1.5" strokeLinecap="round" fill="none" />
      </svg>

      {/* Symbol Badge Below */}
      <span
        style={{
          position: 'absolute',
          bottom: '-12px',
          background: 'rgba(15, 23, 42, 0.95)',
          border: `1.5px solid ${color}`,
          borderRadius: '10px',
          padding: '1px 6px',
          fontSize: '0.68rem',
          fontWeight: 900,
          color: '#ffffff',
          boxShadow: `0 0 8px ${color}`,
          whiteSpace: 'nowrap',
        }}
      >
        {phoneme}
      </span>
    </div>
  );
};

export default SoundSprite;
