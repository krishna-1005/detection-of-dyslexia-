import React, { useRef, useEffect, useMemo, useState, useCallback } from 'react';
import useAudioVisualizer from './hooks/useAudioVisualizer';
import useGameState, { TARGET_PHONEMES } from './hooks/useGameState';
import './SoundBlastCannon.css';

// ─────────────────────────────────────────────────────────────────
// PARTICLE BURST GENERATOR (CSS-only victory effect)
// ─────────────────────────────────────────────────────────────────
const PARTICLE_COLORS = ['#22d3ee', '#fbbf24', '#84cc16', '#f472b6', '#a78bfa', '#60a5fa'];
const CONFETTI_COLORS = ['#22d3ee', '#fbbf24', '#84cc16', '#f472b6', '#a78bfa', '#fb923c', '#60a5fa', '#f43f5e'];

const ParticleBurst = () => {
  const particles = useMemo(() => {
    return Array.from({ length: 14 }, (_, i) => {
      const angle = (i / 14) * 360;
      const distance = 60 + Math.random() * 60;
      const radians = (angle * Math.PI) / 180;
      const tx = Math.cos(radians) * distance;
      const ty = Math.sin(radians) * distance;
      return {
        id: i,
        color: PARTICLE_COLORS[i % PARTICLE_COLORS.length],
        size: 6 + Math.random() * 6,
        delay: Math.random() * 0.15,
        endTransform: `translate(${tx}px, ${ty}px)`,
      };
    });
  }, []);

  return (
    <div className="sc-particle-container">
      {particles.map((p) => (
        <div
          key={p.id}
          className="sc-particle"
          style={{
            width: p.size,
            height: p.size,
            background: p.color,
            boxShadow: `0 0 8px ${p.color}`,
            animationDelay: `${p.delay}s`,
            '--sc-particle-end': p.endTransform,
          }}
        />
      ))}
    </div>
  );
};

const ConfettiShower = () => {
  const pieces = useMemo(() => {
    return Array.from({ length: 30 }, (_, i) => ({
      id: i,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      left: `${5 + Math.random() * 90}%`,
      delay: Math.random() * 0.6,
      rotation: Math.random() * 360,
      width: 4 + Math.random() * 4,
      height: 10 + Math.random() * 8,
    }));
  }, []);

  return (
    <div className="sc-confetti-overlay">
      {pieces.map((p) => (
        <div
          key={p.id}
          className="sc-confetti-piece"
          style={{
            background: p.color,
            left: p.left,
            top: '-20px',
            width: p.width,
            height: p.height,
            animationDelay: `${p.delay}s`,
            transform: `rotate(${p.rotation}deg)`,
          }}
        />
      ))}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────
// SPARKY ROBOT AVATAR (Inline SVG)
// ─────────────────────────────────────────────────────────────────
const SparkyAvatar = () => (
  <svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Head */}
    <rect x="6" y="6" width="24" height="20" rx="6" fill="#1e293b" stroke="#22d3ee" strokeWidth="1.5"/>
    {/* Antenna */}
    <line x1="18" y1="6" x2="18" y2="2" stroke="#60a5fa" strokeWidth="1.5" strokeLinecap="round"/>
    <circle cx="18" cy="1.5" r="1.5" fill="#fbbf24"/>
    {/* Eyes */}
    <circle cx="12.5" cy="15" r="3" fill="#22d3ee">
      <animate attributeName="r" values="3;2.5;3" dur="2s" repeatCount="indefinite"/>
    </circle>
    <circle cx="23.5" cy="15" r="3" fill="#22d3ee">
      <animate attributeName="r" values="3;2.5;3" dur="2s" repeatCount="indefinite"/>
    </circle>
    {/* Eye highlights */}
    <circle cx="13.5" cy="14" r="1" fill="#fff" opacity="0.8"/>
    <circle cx="24.5" cy="14" r="1" fill="#fff" opacity="0.8"/>
    {/* Mouth */}
    <path d="M13 21 Q18 24 23 21" stroke="#84cc16" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
    {/* Ear bolts */}
    <rect x="3" y="12" width="3" height="6" rx="1.5" fill="#a78bfa"/>
    <rect x="30" y="12" width="3" height="6" rx="1.5" fill="#a78bfa"/>
    {/* Body hint */}
    <rect x="12" y="26" width="12" height="6" rx="3" fill="#1e293b" stroke="#60a5fa" strokeWidth="1"/>
    <circle cx="15" cy="29" r="1" fill="#fbbf24"/>
    <circle cx="18" cy="29" r="1" fill="#22d3ee"/>
    <circle cx="21" cy="29" r="1" fill="#f472b6"/>
  </svg>
);

// ─────────────────────────────────────────────────────────────────
// MAIN COMPONENT: SoundBlastCannon
// ─────────────────────────────────────────────────────────────────
const SoundBlastCannon = ({ onComplete }) => {
  const canvasRef = useRef(null);
  const animLoopRef = useRef(null);
  const [showParticles, setShowParticles] = useState(false);
  const [isSystemReady, setIsSystemReady] = useState(false);

  // Hooks
  const audio = useAudioVisualizer();
  const game = useGameState({ onComplete });

  // VAD Refs
  const vadStartTimeRef = useRef(null);
  const isVadTriggeredRef = useRef(false);
  const VAD_THRESHOLD = 45;
  const VAD_DURATION = 300;

  const phaseRef = useRef(game.gamePhase);
  useEffect(() => {
    phaseRef.current = game.gamePhase;
  }, [game.gamePhase]);

  // ── Dedicated Canvas Render Loop ──
  useEffect(() => {
    if (!isSystemReady) return;
    
    let animFrame;
    const loop = () => {
      animFrame = requestAnimationFrame(loop);
      audio.drawVisualizer(canvasRef.current, {
        isCharging: phaseRef.current === 'CHARGING',
      });
    };
    
    loop();
    
    return () => cancelAnimationFrame(animFrame);
  }, [isSystemReady, audio]);

  // Handle Ready System
  const handleReadySystem = async () => {
    await audio.startMic();
    setIsSystemReady(true);
  };

  // ── VAD Double-Gate Logic ──
  useEffect(() => {
    if (!isSystemReady || game.gamePhase === 'PROCESSING' || game.gamePhase === 'BLAST_SUCCESS' || game.gamePhase === 'BLAST_RETRY') {
      return;
    }

    const currentAmp = audio.amplitude;

    // Amplitude Gate
    if (currentAmp >= VAD_THRESHOLD) {
      if (!vadStartTimeRef.current) {
        vadStartTimeRef.current = performance.now();
        // Transition to charging state visually if not already
        if (game.gamePhase === 'LISTENING') {
          game.startCharging();
        }
      } else {
        // Duration Gate
        const elapsed = performance.now() - vadStartTimeRef.current;
        if (elapsed >= VAD_DURATION && !isVadTriggeredRef.current) {
          isVadTriggeredRef.current = true;
          // Trigger the blast
          const peak = audio.getPeakAmplitude();
          game.stopCharging(peak);
          
          // Reset VAD state
          vadStartTimeRef.current = null;
        }
      }
    } else {
      // Reset if amplitude drops below threshold before duration is met
      if (vadStartTimeRef.current && !isVadTriggeredRef.current) {
        vadStartTimeRef.current = null;
        if (game.gamePhase === 'CHARGING') {
          // If we were charging but failed the duration gate, revert to LISTENING
          game.cancelBlast(); // DO NOT use resetGame as it drops the index!
        }
      }
    }
  }, [audio.amplitude, isSystemReady, game, audio]);

  // Round transition cleanup (Isolate Target Change Logic)
  useEffect(() => {
    if (isSystemReady) {
      // 1. ONLY Guarantee Double-Gate VAD Reset
      isVadTriggeredRef.current = false;
      vadStartTimeRef.current = null;

      // 2. DO NOT close the AudioContext or stop the loop!
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.currentTargetIndex]); // ONLY run on round transition

  // Reset VAD trigger ref when returning to LISTENING
  useEffect(() => {
    if (game.gamePhase === 'LISTENING') {
      isVadTriggeredRef.current = false;
      vadStartTimeRef.current = null;
      // ensure mic is running
      if (!audio.isActive && isSystemReady) {
        audio.startMic();
      }
    }
  }, [game.gamePhase, isSystemReady, audio]);

  // Trigger particles on success
  useEffect(() => {
    if (game.gamePhase === 'BLAST_SUCCESS') {
      setShowParticles(true);
      const timer = setTimeout(() => setShowParticles(false), 1200);
      return () => clearTimeout(timer);
    }
  }, [game.gamePhase]);

  // ── Play target sound via speech synthesis ──
  const playTargetAudio = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const ut = new SpeechSynthesisUtterance(
        `${game.currentTarget.word}. Sound ${game.currentTarget.symbol.replace(/\//g, '')}`
      );
      ut.rate = 0.85;
      ut.pitch = 1.0;
      window.speechSynthesis.speak(ut);
    }
  };

  // ── Derive CSS states ──
  const isCharging = game.gamePhase === 'CHARGING';
  const isProcessing = game.gamePhase === 'PROCESSING';
  const isSuccess = game.gamePhase === 'BLAST_SUCCESS';
  const isRetry = game.gamePhase === 'BLAST_RETRY';
  const hasResult = isSuccess || isRetry;

  const xpPercent = Math.min(100, (game.xp / game.xpThreshold) * 100);

  const phaseClass =
    isCharging ? 'charging' :
    isSuccess ? 'blast-success' :
    isRetry ? 'blast-retry' :
    isProcessing ? 'processing' : 'idle';

  return (
    <div className="sound-cannon-game" id="sound-blast-cannon">
      {showParticles && <ConfettiShower />}

      {/* ═══ HEADER: Level Badge + XP Bar ═══ */}
      <div className="sc-header">
        <div className="sc-level-row">
          <div className="sc-level-badge">
            <span className="sc-level-icon">⭐</span>
            Level {game.level}: {game.level === 1 ? 'Sound Explorer' : game.level === 2 ? 'Wave Rider' : game.level === 3 ? 'Sonic Commander' : 'Sound Master'}
          </div>
          <div className="sc-xp-label">{game.xp} / {game.xpThreshold} XP to Level {game.level + 1}</div>
        </div>
        <div className="sc-xp-bar-track">
          <div className="sc-xp-bar-fill" style={{ width: `${xpPercent}%` }} />
        </div>
      </div>

      {/* ═══ TARGET SOUND SUBTITLE ═══ */}
      <div className="sc-target-subtitle">
        {game.currentTarget.example.split(game.currentTarget.symbol).map((part, i, arr) => (
          <React.Fragment key={i}>
            {part}
            {i < arr.length - 1 && (
              <span className="sc-phoneme-highlight">{game.currentTarget.symbol}</span>
            )}
          </React.Fragment>
        ))}
        <span style={{ marginLeft: '10px' }}>
          <button className="sc-btn-hear" onClick={playTargetAudio}>🔊 Hear It</button>
        </span>
      </div>

      {/* ═══ SPARKY — Robot Companion ═══ */}
      <div className="sc-sparky-section">
        <div className="sc-sparky-avatar">
          <SparkyAvatar />
        </div>
        <div className="sc-sparky-bubble">
          <span className="sc-sparky-name">🤖 Sparky</span>
          {game.sparkyMessage}
        </div>
      </div>

      {/* ═══ THE CANNON ═══ */}
      <div className="sc-cannon-stage">
        <div className="sc-cannon-body">
          <div className={`sc-cannon-frame ${phaseClass}`}>
            <div className="sc-cannon-label">
              <div className="sc-cannon-label-text">
                <span className={`sc-dot ${isCharging ? 'charging' : ''}`} />
                AI Soundwave Cannon
              </div>
              <div className="sc-energy-readout">
                {isSystemReady ? (isCharging ? `⚡ Energy: ${audio.amplitude}%` : '● Listening') : '🔌 Offline'}
              </div>
            </div>

            <div className={`sc-barrel-portal ${isCharging ? 'charging' : ''}`}>
              <canvas
                ref={canvasRef}
                width={480}
                height={160}
                className="sc-visualizer-canvas"
              />
              {showParticles && <ParticleBurst />}
            </div>

            <div className="sc-cannon-base">
              {[0, 1, 2, 3, 4].map((i) => (
                <span
                  key={i}
                  className={`sc-cannon-base-dot ${isCharging || isSuccess ? 'active' : ''}`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* ═══ VAD STATUS / READY BUTTON ═══ */}
        {!isSystemReady ? (
          <button className="sc-charge-btn" onClick={handleReadySystem}>
            <span className="sc-charge-btn-icon">🎙️</span>
            READY SYSTEM (ENABLE MIC)
          </button>
        ) : (
          <div className={`sc-status-pill ${phaseClass}`} style={{ marginTop: '1rem', padding: '10px 20px', fontSize: '0.9rem' }}>
            {isCharging 
              ? '🔥 CHARGING BLAST...' 
              : isProcessing 
                ? '⚙️ ANALYZING SOUNDWAVE...' 
                : hasResult
                  ? 'Waiting...'
                  : '🎙️ Speak into the microphone to fire!'}
          </div>
        )}

        <div className={`sc-status-pill ${phaseClass}`}>
          [ Status: {game.statusText} ]
        </div>
      </div>

      {/* ═══ SCORE DISPLAY (after blast) ═══ */}
      {hasResult && (
        <div className="sc-score-display">
          <div className={`sc-score-circle ${isSuccess ? 'success' : 'retry'}`}>
            {game.accuracyScore}%
          </div>
          <div className="sc-score-info">
            <span className="sc-score-label">Phonetic Match Accuracy</span>
            <span className={`sc-score-verdict ${isSuccess ? 'success' : 'retry'}`}>
              {isSuccess ? '🎯 Direct Hit!' : '💫 Close Attempt'}
            </span>
          </div>
        </div>
      )}

      {/* ═══ ACTION BUTTONS ═══ */}
      {hasResult && (
        <div className="sc-actions-row">
          {isSuccess ? (
            <button className="sc-btn-next" onClick={game.nextTarget}>
              Next Target ({game.currentTargetIndex + 1}/{TARGET_PHONEMES.length}) ➔
            </button>
          ) : (
            <button className="sc-btn-next" onClick={game.retryTarget} style={{ background: '#f59e0b', borderColor: '#d97706' }}>
              🔄 Retry Sound
            </button>
          )}
          {game.sessionResults.length > 0 && (
            <button className="sc-btn-finish" onClick={game.finishSession}>
              ✅ Complete Session
            </button>
          )}
        </div>
      )}

      {/* ═══ PHONEME SELECTOR CHIPS ═══ */}
      <div className="sc-phoneme-chips">
        {TARGET_PHONEMES.map((item, idx) => (
          <button
            key={item.id}
            className={`sc-chip ${idx === game.currentTargetIndex ? 'active' : ''}`}
            onClick={() => game.selectTarget(idx)}
          >
            <strong>{item.symbol}</strong>
            <small>{item.word}</small>
          </button>
        ))}
      </div>

      {/* ═══ SESSION RESULTS ═══ */}
      {game.sessionResults.length > 0 && (
        <div className="sc-session-results">
          <span className="sc-session-label">
            Blast Log — {game.sessionResults.length} Targets Fired
          </span>
          <div className="sc-results-grid">
            {game.sessionResults.map((res, i) => (
              <div
                key={i}
                className={`sc-result-chip ${res.status === 'Passed' ? 'pass' : 'retry'}`}
              >
                <strong>{res.target}</strong>
                <span className="sc-result-score">{res.score}%</span>
                <span className="sc-result-status">
                  {res.status === 'Passed' ? '✅' : '🔄'} {res.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SoundBlastCannon;
