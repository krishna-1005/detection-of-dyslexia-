import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../auth/AuthContext';
import { saveTherapyProgress } from './ExerciseSystem';
import './MirrorMatchHighway.css';

// ── Web Audio Synthesizer SFX Engine ──
const playSFX = (type) => {
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.connect(g); g.connect(ctx.destination);
    const t = ctx.currentTime;

    if (type === 'hit') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(523.25, t);
      osc.frequency.exponentialRampToValueAtTime(1046.5, t + 0.15);
      g.gain.setValueAtTime(0.18, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
      osc.start(); osc.stop(t + 0.18);
    } else if (type === 'wobble') {
      // 180° Mirror Flip Educational Wobble Chime
      osc.type = 'sine';
      osc.frequency.setValueAtTime(320, t);
      osc.frequency.linearRampToValueAtTime(160, t + 0.3);
      g.gain.setValueAtTime(0.15, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
      osc.start(); osc.stop(t + 0.35);
    } else if (type === 'combo') {
      osc.type = 'triangle';
      [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
        osc.frequency.setValueAtTime(f, t + i * 0.08);
      });
      g.gain.setValueAtTime(0.2, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
      osc.start(); osc.stop(t + 0.45);
    } else if (type === 'wave_clear') {
      osc.type = 'sine';
      [440, 554.37, 659.25, 880].forEach((f, i) => {
        osc.frequency.setValueAtTime(f, t + i * 0.1);
      });
      g.gain.setValueAtTime(0.2, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
      osc.start(); osc.stop(t + 0.6);
    } else if (type === 'game_over') {
      osc.type = 'sawtooth';
      [300, 240, 180, 120].forEach((f, i) => {
        osc.frequency.setValueAtTime(f, t + i * 0.12);
      });
      g.gain.setValueAtTime(0.22, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
      osc.start(); osc.stop(t + 0.6);
    }
  } catch (e) {}
};

// ── REVERSAL PAIRS BANK FOR SMOOTH-PURSUIT SACCADIC TRACKING ──
const WAVE_REVERSAL_SETS = [
  { target: 'u', decoy: 'n', name: 'u vs n (Vertical Reversal)' },
  { target: 'b', decoy: 'd', name: 'b vs d (Horizontal Reversal)' },
  { target: 'p', decoy: 'q', name: 'p vs q (Dual Reversal)' },
  { target: 'm', decoy: 'w', name: 'm vs w (Inversion)' },
  { target: 's', decoy: 'z', name: 's vs z (Rotational Symmetry)' },
];

const CANV_W = 860;
const CANV_H = 340;
const HIGHWAY_Y = 190;

export default function MirrorMatchHighway({
  onComplete,
  assessmentMode = false,
  targetCount = 4,
  onAutoFinish
}) {
  const { currentUser } = useAuth();
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const assessmentCompletedRef = useRef(false);

  // Game Engine States
  const [phase, setPhase] = useState('playing'); // playing | eye_rest | summary
  const [showGoalsDrawer, setShowGoalsDrawer] = useState(false);

  const [lives, setLives] = useState(3);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [wave, setWave] = useState(1);
  const [capturesInWave, setCapturesInWave] = useState(0);

  // Telemetry Metrics
  const [startTime] = useState(Date.now());
  const [latencies, setLatencies] = useState([]);
  const [totalAttempts, setTotalAttempts] = useState(0);
  const [correctHits, setCorrectHits] = useState(0);
  const [showComboBanner, setShowComboBanner] = useState(false);
  const [hintMessage, setHintMessage] = useState('Track the highway & lock on target letter!');

  // Current Target Set
  const currentSet = WAVE_REVERSAL_SETS[(wave - 1) % WAVE_REVERSAL_SETS.length];

  // Ref Game Object for 60fps Loop
  const gameRef = useRef({
    scannerX: CANV_W / 2,
    scannerWidth: 70,
    pods: [],
    particles: [],
    flashingPods: [],
    spawnTimer: 0,
    speedMultiplier: 1.0,
    lastLockTime: Date.now(),
    missesInWave: 0
  });

  const keysRef = useRef({ left: false, right: false, lock: false });

  // ── SPAWN LETTER POD (55% Target / 45% Decoy Mix) ──
  const spawnPod = useCallback(() => {
    const g = gameRef.current;
    
    // Ensure active mix of 55% target / 45% decoy, capping target streaks to 2
    let isTarget = Math.random() < 0.55;
    if (g.consecutiveTargets >= 2) {
      isTarget = false;
      g.consecutiveTargets = 0;
    } else if (isTarget) {
      g.consecutiveTargets = (g.consecutiveTargets || 0) + 1;
    } else {
      g.consecutiveTargets = 0;
    }

    const letter = isTarget ? currentSet.target : currentSet.decoy;
    const speed = (1.6 + Math.random() * 0.6) * g.speedMultiplier;

    g.pods.push({
      id: Date.now() + Math.random(),
      x: CANV_W + 40,
      y: HIGHWAY_Y,
      radius: 30,
      letter,
      isTarget,
      vx: -speed,
      rotationY: 0,
      isFlipping: false,
      flipTimer: 0,
      alpha: 1
    });
  }, [currentSet]);

  // ── LOCK ON / TAG RETICLE TARGET ──
  const handleLockOn = useCallback(() => {
    const g = gameRef.current;
    if (phase !== 'playing') return;

    const lockLatency = Math.max(150, Date.now() - g.lastLockTime);
    g.lastLockTime = Date.now();

    // Find pod inside scanner reticle
    const reticleLeft = g.scannerX - g.scannerWidth / 2;
    const reticleRight = g.scannerX + g.scannerWidth / 2;

    const targetPodIdx = g.pods.findIndex(
      p => p.x >= reticleLeft - 15 && p.x <= reticleRight + 15 && !p.isFlipping
    );

    if (targetPodIdx === -1) return; // Empty click

    const pod = g.pods[targetPodIdx];
    setTotalAttempts(t => t + 1);
    setLatencies(l => [...l, lockLatency]);

    if (pod.isTarget) {
      // ── CORRECT HIT ──
      playSFX('hit');
      g.pods.splice(targetPodIdx, 1);
      setCorrectHits(c => c + 1);

      // Particle Explosion
      for (let i = 0; i < 18; i++) {
        const angle = Math.random() * Math.PI * 2;
        const spd = 2 + Math.random() * 4;
        g.particles.push({
          x: pod.x, y: pod.y,
          vx: Math.cos(angle) * spd,
          vy: Math.sin(angle) * spd,
          color: '#34d399',
          alpha: 1,
          size: 4 + Math.random() * 3
        });
      }

      const nextStreak = streak + 1;
      const nextCaptures = capturesInWave + 1;
      const nextScore = score + 50;

      setScore(nextScore);
      setStreak(nextStreak);
      setCapturesInWave(nextCaptures);
      setHintMessage(`🎯 LOCK ON! Target '${pod.letter}' Captured (+50 XP)`);

      // ── 3-COMBO HEART RECOVERY ──
      if (nextStreak % 3 === 0 && nextStreak > 0) {
        playSFX('combo');
        setShowComboBanner(true);
        setTimeout(() => setShowComboBanner(false), 1200);
        setLives(l => Math.min(3, l + 1));
      }

      // ── DEFINED SESSION BENCHMARK (WIN CONDITION: 3 Waves Completed or Target Count Reached) ──
      const TARGET_WAVE_CAP = 3;
      const requiredCaptures = assessmentMode ? targetCount : 4;

      if (nextCaptures >= requiredCaptures) {
        if (assessmentMode && (onAutoFinish || onComplete) && !assessmentCompletedRef.current) {
          assessmentCompletedRef.current = true;
          playSFX('wave_clear');
          const accuracy = totalAttempts > 0 ? Math.round(((correctHits + 1) / (totalAttempts + 1)) * 100) : 100;
          const avgLatency = latencies.length > 0
            ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length)
            : 340;
          saveTherapyProgress(currentUser, 'visual', nextScore, accuracy, `${avgLatency}ms Latency`);

          setTimeout(() => {
            if (onAutoFinish) {
              onAutoFinish({
                accuracy,
                latencyMs: avgLatency,
                errorCount: Math.max(0, (totalAttempts + 1) - (correctHits + 1)),
                errorTypes: [],
                score: nextScore
              });
            } else if (onComplete) {
              onComplete();
            }
          }, 400);
          return;
        }

        if (wave >= TARGET_WAVE_CAP) {
          playSFX('wave_clear');
          const accuracy = totalAttempts > 0 ? Math.round(((correctHits + 1) / (totalAttempts + 1)) * 100) : 100;
          const avgLatency = latencies.length > 0
            ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length)
            : 340;
          saveTherapyProgress(currentUser, 'visual', nextScore, accuracy, `${avgLatency}ms Latency (Completed 3 Waves)`);
          setPhase('summary');
        } else {
          playSFX('wave_clear');
          setPhase('eye_rest');
          g.speedMultiplier += 0.12;

          setTimeout(() => {
            setWave(w => w + 1);
            setCapturesInWave(0);
            g.missesInWave = 0;
            setPhase('playing');
          }, 2500);
        }
      }

    } else {
      // ── EDUCATIONAL ERROR MECHANIC (3D 180° Flip Animation + Soft Chime) ──
      playSFX('wobble');
      pod.isFlipping = true;
      pod.flipTimer = 30; // 30 frames animation flip

      setStreak(0);
      g.missesInWave += 1;

      setHintMessage(`💡 Educational Mirror Tip: '${pod.letter}' flips 180° into '${currentSet.target}'!`);

      // Deduct heart only on repeated misses in the wave (First miss is soft-fail grace!)
      if (g.missesInWave > 1) {
        setLives(l => {
          const nextL = l - 1;
          if (nextL <= 0) {
            playSFX('game_over');
            if (assessmentMode && (onAutoFinish || onComplete) && !assessmentCompletedRef.current) {
              assessmentCompletedRef.current = true;
              setTimeout(() => {
                if (onAutoFinish) onAutoFinish({ accuracy: 50, latencyMs: 500, errorCount: 2, errorTypes: [], score });
                else if (onComplete) onComplete();
              }, 400);
            } else {
              setPhase('summary');
            }
          }
          return Math.max(0, nextL);
        });
      }
    }
  }, [assessmentMode, capturesInWave, correctHits, currentSet, latencies, onAutoFinish, onComplete, phase, score, streak, targetCount, totalAttempts]);

  // Keyboard Handlers
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['ArrowLeft','a','A'].includes(e.key)) keysRef.current.left = true;
      if (['ArrowRight','d','D'].includes(e.key)) keysRef.current.right = true;
      if ([' ','Spacebar'].includes(e.key)) {
        e.preventDefault();
        if (!keysRef.current.lock) {
          keysRef.current.lock = true;
          handleLockOn();
        }
      }
    };

    const handleKeyUp = (e) => {
      if (['ArrowLeft','a','A'].includes(e.key)) keysRef.current.left = false;
      if (['ArrowRight','d','D'].includes(e.key)) keysRef.current.right = false;
      if ([' ','Spacebar'].includes(e.key)) keysRef.current.lock = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleLockOn]);

  // ── 60FPS CANVAS GAME LOOP ──
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const loop = (timestamp) => {
      const g = gameRef.current;

      // 1. Move Reticle
      if (keysRef.current.left) g.scannerX = Math.max(50, g.scannerX - 6);
      if (keysRef.current.right) g.scannerX = Math.min(CANV_W - 50, g.scannerX + 6);

      // 2. Spawn Pods
      g.spawnTimer++;
      if (g.spawnTimer > 110 / g.speedMultiplier) {
        g.spawnTimer = 0;
        if (phase === 'playing' && g.pods.length < 5) spawnPod();
      }

      // Render Cosmic Synth Backdrop
      ctx.clearRect(0, 0, CANV_W, CANV_H);

      const bgGrad = ctx.createLinearGradient(0, 0, 0, CANV_H);
      bgGrad.addColorStop(0, '#090d16');
      bgGrad.addColorStop(1, '#030712');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, CANV_W, CANV_H);

      // Render Glowing Retro Highway Lines (Smooth Pursuit Track)
      ctx.shadowColor = '#6366f1';
      ctx.shadowBlur = 15;
      ctx.strokeStyle = 'rgba(99, 102, 241, 0.4)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, HIGHWAY_Y - 32);
      ctx.lineTo(CANV_W, HIGHWAY_Y - 32);
      ctx.moveTo(0, HIGHWAY_Y + 32);
      ctx.lineTo(CANV_W, HIGHWAY_Y + 32);
      ctx.stroke();

      ctx.strokeStyle = '#818cf8';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(0, HIGHWAY_Y);
      ctx.lineTo(CANV_W, HIGHWAY_Y);
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Update & Render Pods
      g.pods.forEach((p, idx) => {
        if (!p.isFlipping) {
          p.x += p.vx;
        } else {
          p.flipTimer--;
          p.rotationY += Math.PI / 15; // 180° 3D Flip
          if (p.flipTimer <= 0) {
            p.alpha -= 0.08;
          }
        }

        if (p.x < -50 || p.alpha <= 0) {
          g.pods.splice(idx, 1);
          return;
        }

        ctx.save();
        ctx.translate(p.x, p.y);

        if (p.isFlipping) {
          ctx.scale(Math.cos(p.rotationY), 1);
        }

        // Translucent Neon Pod Orb
        const podGrad = ctx.createRadialGradient(-6, -6, 2, 0, 0, p.radius);
        if (p.isFlipping) {
          podGrad.addColorStop(0, '#fef08a');
          podGrad.addColorStop(1, '#e11d48');
        } else {
          podGrad.addColorStop(0, '#ffffff');
          podGrad.addColorStop(0.3, 'rgba(56, 189, 248, 0.8)');
          podGrad.addColorStop(1, 'rgba(30, 58, 138, 0.9)');
        }

        ctx.shadowColor = p.isFlipping ? '#e11d48' : '#38bdf8';
        ctx.shadowBlur = 16;
        ctx.fillStyle = podGrad;
        ctx.beginPath();
        ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();

        // High-Contrast Pure White Lexend Typography with Drop-Shadow
        ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
        ctx.shadowBlur = 6;
        ctx.shadowOffsetY = 2;
        ctx.fillStyle = '#ffffff';
        ctx.font = '900 26px "Lexend", "Outfit", system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(p.letter, 0, 0);
        ctx.shadowBlur = 0;
        ctx.shadowOffsetY = 0;

        ctx.restore();
      });

      // Render Scanner Reticle (Vertically Centered over HIGHWAY_Y)
      const rx = g.scannerX;
      const reticleH = 76;
      const reticleTop = HIGHWAY_Y - reticleH / 2;

      ctx.shadowColor = '#34d399';
      ctx.shadowBlur = 22;
      ctx.strokeStyle = '#34d399';
      ctx.lineWidth = 3.5;

      ctx.strokeRect(rx - g.scannerWidth / 2, reticleTop, g.scannerWidth, reticleH);

      // Target Corner Flairs
      ctx.fillStyle = '#34d399';
      ctx.fillRect(rx - g.scannerWidth / 2 - 4, reticleTop - 4, 10, 4);
      ctx.fillRect(rx + g.scannerWidth / 2 - 6, reticleTop - 4, 10, 4);
      ctx.fillRect(rx - g.scannerWidth / 2 - 4, reticleTop + reticleH, 10, 4);
      ctx.fillRect(rx + g.scannerWidth / 2 - 6, reticleTop + reticleH, 10, 4);
      ctx.shadowBlur = 0;

      // Render Particles
      g.particles.forEach((pt, i) => {
        pt.x += pt.vx;
        pt.y += pt.vy;
        pt.alpha -= 0.03;
        if (pt.alpha <= 0) g.particles.splice(i, 1);
        else {
          ctx.fillStyle = pt.color;
          ctx.globalAlpha = pt.alpha;
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
          ctx.fill();
        }
      });
      ctx.globalAlpha = 1;

      animRef.current = requestAnimationFrame(loop);
    };

    animRef.current = requestAnimationFrame(loop);
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, [phase, spawnPod]);

  // Reset Game
  const resetGame = () => {
    setLives(3);
    setScore(0);
    setStreak(0);
    setWave(1);
    setCapturesInWave(0);
    setLatencies([]);
    setTotalAttempts(0);
    setCorrectHits(0);
    setPhase('playing');
    gameRef.current.speedMultiplier = 1.0;
    gameRef.current.missesInWave = 0;
    gameRef.current.pods = [];
  };

  // Complete & Persist Stats
  const handleDone = async () => {
    const accuracy = totalAttempts > 0 ? Math.round((correctHits / totalAttempts) * 100) : 100;
    const avgLatency = latencies.length > 0
      ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length)
      : 340;
    const durationSec = Math.round((Date.now() - startTime) / 1000);

    const telemetryPayload = {
      timestamp: new Date().toISOString(),
      module: 'Visual Tracking Practice',
      score,
      accuracy,
      latencyMs: avgLatency,
      durationSec,
      reversalPair: currentSet.name
    };

    try {
      localStorage.setItem('lexiflow_session_history_visual', JSON.stringify(telemetryPayload));
      window.dispatchEvent(new Event('therapy_progress_updated'));
    } catch (e) {}

    await saveTherapyProgress(currentUser, 'visual', score, accuracy, `${avgLatency}ms Latency`);
    if (onAutoFinish) {
      onAutoFinish({ accuracy, latencyMs: avgLatency, errorCount: Math.max(0, totalAttempts - correctHits), errorTypes: [], score });
    } else if (onComplete) {
      onComplete();
    }
  };

  const accuracy = totalAttempts > 0 ? Math.round((correctHits / totalAttempts) * 100) : 100;
  const avgLatency = latencies.length > 0
    ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length)
    : 340;
  const focusDurationStr = `${Math.floor((Date.now() - startTime) / 60000)}m ${Math.round(((Date.now() - startTime) % 60000) / 1000)}s`;

  return (
    <div className="mmh-game-container">
      {/* Header HUD */}
      <header className="mmh-hud-header">
        <div className="mmh-title-group">
          <h2 className="mmh-game-logo">
            <span>🌌</span> MIRROR MATCH HIGHWAY
          </h2>
        </div>

        <div className="mmh-hud-stats">
          <div className="mmh-stat-pill" style={{ color: '#ef4444' }}>
            {'❤️'.repeat(lives)}
          </div>
          <div className="mmh-stat-pill" style={{ color: '#fbbf24' }}>
            🏆 {score} XP
          </div>
          <div className="mmh-stat-pill" style={{ color: '#38bdf8' }}>
            🌊 Wave {wave}
          </div>
          <button className="mmh-goals-btn" onClick={() => setShowGoalsDrawer(true)}>
            ℹ️ Clinical Goals
          </button>
        </div>
      </header>

      {/* Target Letter Prompt Banner */}
      <div className="mmh-target-banner">
        <div className="mmh-target-info">
          <div className="mmh-target-letter-badge">{currentSet.target}</div>
          <div>
            <span style={{ fontSize: '0.72rem', color: '#fbbf24', fontWeight: 800, textTransform: 'uppercase' }}>
              TARGET REVERSAL PAIR: {currentSet.name}
            </span>
            <p className="mmh-target-prompt-text">
              Lock on target letter <strong style={{ color: '#fbbf24' }}>"{currentSet.target}"</strong> — avoid mirrored decoy <strong style={{ color: '#f472b6' }}>"{currentSet.decoy}"</strong>!
            </p>
          </div>
        </div>
        <div style={{ color: '#94a3b8', fontSize: '0.82rem', fontWeight: 700 }}>
          Wave Target: {capturesInWave}/4 Captures
        </div>
      </div>

      {/* 60FPS Interactive Highway Canvas */}
      <div className="mmh-canvas-area">
        <canvas ref={canvasRef} width={CANV_W} height={CANV_H} className="mmh-canvas" />

        {/* 3X Combo Heart Recovery Banner */}
        {showComboBanner && (
          <div className="mmh-combo-banner">
            ⚡ 3X COMBO! +1 HEART RECOVERED! ❤️
          </div>
        )}

        {/* Celebratory 2.5s Eye Rest Wave Banner */}
        {phase === 'eye_rest' && (
          <div className="mmh-wave-rest-banner">
            <div style={{ fontSize: '2.5rem', marginBottom: '0.3rem' }}>👁️✨</div>
            <h3 className="mmh-wave-rest-title">EYE REST WAVE CLEAR!</h3>
            <p className="mmh-wave-rest-sub">Take a deep breath & stretch your eyes! Preparing Wave {wave + 1}...</p>
          </div>
        )}
      </div>

      {/* Laptop & Touch Controls Footer */}
      <footer className="mmh-controls-footer">
        <button
          className="mmh-touch-btn"
          onMouseDown={() => keysRef.current.left = true}
          onMouseUp={() => keysRef.current.left = false}
          onTouchStart={() => keysRef.current.left = true}
          onTouchEnd={() => keysRef.current.left = false}
        >
          ◀ Move Left (A / Left)
        </button>

        <button
          className="mmh-touch-btn mmh-lock-btn"
          onClick={handleLockOn}
        >
          ␣ SPACE: LOCK ON TARGET [{currentSet.target}]
        </button>

        <button
          className="mmh-touch-btn"
          onMouseDown={() => keysRef.current.right = true}
          onMouseUp={() => keysRef.current.right = false}
          onTouchStart={() => keysRef.current.right = true}
          onTouchEnd={() => keysRef.current.right = false}
        >
          Move Right (D / Right) ▶
        </button>
      </footer>

      {/* Slide-Over Clinical Goals Panel */}
      {showGoalsDrawer && (
        <div className="mmh-goals-modal-overlay" onClick={() => setShowGoalsDrawer(false)}>
          <div className="mmh-goals-drawer" onClick={e => e.stopPropagation()}>
            <div className="mmh-goals-drawer-header">
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900, color: '#ffffff' }}>ℹ️ Clinical Goals</h3>
              <button className="mmh-goals-drawer-close" onClick={() => setShowGoalsDrawer(false)}>✕</button>
            </div>

            <div className="mmh-goals-card-section">
              <div style={{ color: '#818cf8', fontWeight: 800, fontSize: '0.8rem', textTransform: 'uppercase', marginBottom: '0.5rem' }}>🔬 The Science</div>
              <p style={{ color: '#94a3b8', fontSize: '0.88rem', lineHeight: '1.6', margin: 0 }}>
                Visual and attentional dyslexia indicators include letter reversal confusion (b vs d, u vs n, p vs q) and visual letter migration across reading lines. Smooth-pursuit horizontal saccadic tracking exercises strengthen ocular motor coordination and spatial letter stability without requiring reading fluency.
              </p>
            </div>

            <div className="mmh-goals-card-section">
              <div style={{ color: '#34d399', fontWeight: 800, fontSize: '0.8rem', textTransform: 'uppercase', marginBottom: '0.5rem' }}>✅ Key Benefits</div>
              <ul style={{ color: '#cbd5e1', fontSize: '0.85rem', lineHeight: '1.7', margin: 0, paddingLeft: '1.2rem' }}>
                <li>Fixes mirror letter reversal confusion (u/n, b/d, p/q)</li>
                <li>Reduces letter migration and line-skipping errors</li>
                <li>Builds smooth-pursuit horizontal saccadic eye tracking</li>
              </ul>
            </div>

            <div className="mmh-goals-card-section">
              <div style={{ color: '#fbbf24', fontWeight: 800, fontSize: '0.8rem', textTransform: 'uppercase', marginBottom: '0.5rem' }}>💡 Instructions</div>
              <p style={{ color: '#94a3b8', fontSize: '0.88rem', lineHeight: '1.6', margin: 0 }}>
                Use <strong>Arrow Keys / A & D</strong> to move the green reticle along the cosmic highway. Press <strong>Spacebar</strong> to lock on the target letter. Mirrored decoys will flip 180° to demonstrate their reversal relationship!
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Therapy Session Summary Modal */}
      {phase === 'summary' && (
        <div className="mmh-summary-overlay">
          <div className="mmh-summary-card">
            <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🏆</div>
            <h2 style={{ margin: '0 0 0.5rem 0', fontSize: '1.8rem', fontWeight: 900 }}>Therapy Session Summary</h2>
            <p style={{ color: '#94a3b8', fontSize: '0.9rem', margin: 0 }}>
              Excellent tracking practice! Your saccadic eye movement and mirror reversal metrics have been recorded.
            </p>

            <div className="mmh-summary-metrics">
              <div className="mmh-summary-metric-box">
                <small style={{ color: '#94a3b8', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase' }}>Saccadic Latency</small>
                <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#fbbf24', marginTop: '4px' }}>{avgLatency} ms</div>
              </div>

              <div className="mmh-summary-metric-box">
                <small style={{ color: '#94a3b8', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase' }}>Reversal Accuracy</small>
                <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#34d399', marginTop: '4px' }}>{accuracy}%</div>
              </div>

              <div className="mmh-summary-metric-box">
                <small style={{ color: '#94a3b8', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase' }}>Focus Duration</small>
                <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#38bdf8', marginTop: '4px' }}>{focusDurationStr}</div>
              </div>
            </div>

            <div className="mmh-summary-actions">
              <button className="mmh-btn-again" onClick={resetGame}>🔄 Practice Again</button>
              <button className="mmh-btn-done" onClick={handleDone}>📊 Done</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
