import React from 'react';
import SparkyCharacter from './SparkyCharacter';
import BloopCharacter from './BloopCharacter';
import EchoCharacter from './EchoCharacter';
import ZipCharacter from './ZipCharacter';
import SoundSprite from './SoundSprite';
import './Characters.css';

const SOUND_CREW_MEMBERS = [
  { id: 'sparky', name: 'Sparky', role: 'Main Guide', color: '#38bdf8', icon: '👦', desc: 'Space explorer boy who guides your missions!' },
  { id: 'bloop', name: 'Bloop', role: 'Funny Friend', color: '#c084fc', icon: '👽', desc: 'Makes silly mistakes so practice is always fun!' },
  { id: 'echo', name: 'Echo', role: 'Sound Creature', color: '#22d3ee', icon: '✨', desc: 'Floats & repeats words with glowing soundwaves!' },
  { id: 'zip', name: 'Zip', role: 'Speed Challenger', color: '#fb923c', icon: '🦊', desc: 'Fox with space goggles for fun speed races!' },
];

const SoundCrewDrawer = ({ isOpen, onClose, collectedSprites = [] }) => {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(12, 14, 26, 0.85)',
        backdropFilter: 'blur(10px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'linear-gradient(170deg, #1e2140 0%, #141627 100%)',
          border: '2px solid rgba(56, 189, 248, 0.4)',
          borderRadius: '24px',
          maxWidth: '750px',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: '2rem',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.8)',
          position: 'relative',
          color: '#ffffff',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div>
            <span style={{ fontSize: '0.8rem', color: '#38bdf8', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              🚀 SPACE ACADEMY
            </span>
            <h2 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 900, color: '#ffffff' }}>
              Your Sound Crew & Jar Collection
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              color: '#ffffff',
              borderRadius: '50%',
              width: '38px',
              height: '38px',
              fontWeight: 900,
              fontSize: '1.1rem',
              cursor: 'pointer',
            }}
          >
            ✕
          </button>
        </div>

        {/* ── Space Crew Grid ── */}
        <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fbbf24', marginBottom: '1rem' }}>
          👨‍🚀 Active Space Crew (4 Unlocked)
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
          {SOUND_CREW_MEMBERS.map((member) => (
            <div
              key={member.id}
              style={{
                background: 'rgba(255, 255, 255, 0.04)',
                border: `1.5px solid ${member.color}44`,
                borderRadius: '18px',
                padding: '1.2rem 1rem',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
              }}
            >
              {member.id === 'sparky' && <SparkyCharacter state="happy" size={85} />}
              {member.id === 'bloop' && <BloopCharacter state="happy" size={80} />}
              {member.id === 'echo' && <EchoCharacter state="idle" size={80} />}
              {member.id === 'zip' && <ZipCharacter state="idle" size={80} />}

              <h4 style={{ margin: '0.6rem 0 0.2rem 0', color: member.color, fontSize: '1.05rem', fontWeight: 900 }}>
                {member.name}
              </h4>
              <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>
                {member.role}
              </span>
              <p style={{ fontSize: '0.78rem', color: '#cbd5e1', marginTop: '0.5rem', margin: '0.5rem 0 0 0', lineHeight: 1.4 }}>
                {member.desc}
              </p>
            </div>
          ))}
        </div>

        {/* ── Sound Sprites Collection ── */}
        <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#22d3ee', marginBottom: '0.8rem' }}>
          🫙 Collected Sound Sprites ({collectedSprites.length} Sounds)
        </h3>
        <p style={{ fontSize: '0.85rem', color: '#94a3b8', margin: '0 0 1.2rem 0' }}>
          Every target word you speak correctly adds a magical Sound Sprite into your Magic Jar!
        </p>

        {collectedSprites.length > 0 ? (
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '1.5rem',
              background: 'rgba(0, 0, 0, 0.4)',
              border: '1px solid rgba(34, 211, 238, 0.2)',
              borderRadius: '18px',
              padding: '1.5rem',
            }}
          >
            {collectedSprites.map((sprite, idx) => (
              <SoundSprite
                key={idx}
                phoneme={sprite.phoneme || sprite.symbol || `/S${idx}/`}
                color={sprite.color || '#22d3ee'}
                size={42}
              />
            ))}
          </div>
        ) : (
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px stroke-dasharray rgba(255, 255, 255, 0.1)',
              borderRadius: '16px',
              padding: '2rem',
              textAlign: 'center',
              color: '#94a3b8',
            }}
          >
            <p style={{ margin: 0, fontWeight: 600 }}>
              No Sound Sprites collected yet! Launch a Sound Quest challenge and speak target words to fill your jar! 🌟
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SoundCrewDrawer;
