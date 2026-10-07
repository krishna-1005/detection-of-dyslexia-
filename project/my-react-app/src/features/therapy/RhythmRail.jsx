import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../auth/AuthContext';
import { saveTherapyProgress } from './ExerciseSystem';
import './RhythmRail.css';

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

    if (type === 'beat_hit') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, t);
      osc.frequency.exponentialRampToValueAtTime(1046.5, t + 0.12);
      g.gain.setValueAtTime(0.2, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
      osc.start(); osc.stop(t + 0.15);
    } else if (type === 'soft_miss') {
      // Soft minor tone for continuous rhythm without jarring buzzers
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(260, t);
      osc.frequency.linearRampToValueAtTime(220, t + 0.25);
      g.gain.setValueAtTime(0.12, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
      osc.start(); osc.stop(t + 0.28);
    } else if (type === 'combo') {
      osc.type = 'triangle';
      [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
        osc.frequency.setValueAtTime(f, t + i * 0.08);
      });
      g.gain.setValueAtTime(0.22, t);
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
      g.gain.setValueAtTime(0.2, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
      osc.start(); osc.stop(t + 0.6);
    }
  } catch (e) {}
};

const speakSoundPrompt = (text) => {
  try {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 0.9;
    u.pitch = 1.1;
    window.speechSynthesis.speak(u);
  } catch (e) {}
};

// ── ACOUSTIC MINIMAL-PAIR SOUND SETS ──
const MINIMAL_PAIR_SETS = [
  { sound1: 'BA', sound2: 'PA', pairName: '/b/ vs /p/ (Voicing Contrast)', targetSound: 'BA' },
  { sound1: 'DA', sound2: 'TA', pairName: '/d/ vs /t/ (Alveolar Stop Contrast)', targetSound: 'DA' },
  { sound1: 'MA', sound2: 'NA', pairName: '/m/ vs /n/ (Nasal Resonance)', targetSound: 'MA' },
  { sound1: 'FA', sound2: 'VA', pairName: '/f/ vs /v/ (Fricative Voicing)', targetSound: 'FA' },
  { sound1: 'SA', sound2: 'ZA', pairName: '/s/ vs /z/ (Sibilant Acoustic)', targetSound: 'SA' }
];

const CANV_W = 860;
const CANV_H = 340;
const STRIKE_Y = 270; // Glowing neon strike zone horizontal line

export default function RhythmRail({
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
  const [phase, setPhase] = useState('playing'); // playing | wave_clear | summary
  const [showGoalsDrawer, setShowGoalsDrawer] = useState(false);

  const [lives, setLives] = useState(3);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [peakStreak, setPeakStreak] = useState(0);
  const [wave, setWave] = useState(1);
  const [bpm, setBpm] = useState(90);
  const [capturesInWave, setCapturesInWave] = useState(0);

  // Telemetry Metrics
  const [startTime] = useState(Date.now());
  const [latencies, setLatencies] = useState([]);
  const [totalNotes, setTotalNotes] = useState(0);
  const [hitCount, setHitCount] = useState(0);
  const [showComboBanner, setShowComboBanner] = useState(false);
  const [hintMessage, setHintMessage] = useState('Tap F for Left Sound / J for Right Sound on the beat!');

  // Active Key Highlights for Visual Feedback
  const [leftKeyActive, setLeftKeyActive] = useState(false);
  const [rightKeyActive, setRightKeyActive] = useState(false);

  // Current Minimal Pair
  const currentPair = MINIMAL_PAIR_SETS[(wave - 1) % MINIMAL_PAIR_SETS.length];

  // Ref Game Object for 60fps Loop
  const gameRef = useRef({
    pods: [],
    particles: [],
    spawnTimer: 0,
    speedMultiplier: 1.0,
    lastSpawnTime: Date.now(),
    missesInWave: 0
  });

  // Announce target sound prompt on wave change
  useEffect(() => {
    speakSoundPrompt(`Listen for ${currentPair.targetSound}!`);
  }, [wave, currentPair.targetSound]);

  // ── SPAWN RHYTHM SOUND POD ──
  const spawnRhythmPod = useCallback(() => {
    const g = gameRef.current;
    const isLeftTrack = Math.random() < 0.5;
    const trackX = isLeftTrack ? CANV_W * 0.35 : CANV_W * 0.65;
    const soundText = isLeftTrack ? currentPair.sound1 : currentPair.sound2;
    const isTarget = soundText === currentPair.targetSound;
    const speed = (2.2 + (bpm - 90) * 0.03) * g.speedMultiplier;

    g.pods.push({
      id: Date.now() + Math.random(),
      x: trackX,
      y: -30,
      radius: 28,
      track: isLeftTrack ? 'left' : 'right',
      soundText,
      isTarget,
      vy: speed,
      isDissolving: false,
      alpha: 1,
      spawnTime: Date.now()
    });
  }, [bpm, currentPair, wave]);

  // ── PROCESS TRACK KEY TAP (`F` = Left Track 1, `J` = Right Track 2) ──
  const handleTrackTap = useCallback((targetTrack) => {
    if (phase !== 'playing') return;

    if (targetTrack === 'left') {
      setLeftKeyActive(true);
      setTimeout(() => setLeftKeyActive(false), 150);
    } else {
      setRightKeyActive(true);
      setTimeout(() => setRightKeyActive(false), 150);
    }

    const g = gameRef.current;
    
    // Find closest sound pod on target track near strike zone
    const targetPodIdx = g.pods.findIndex(
      p => p.track === targetTrack && !p.isDissolving && Math.abs(p.y - STRIKE_Y) <= 55
    );

    if (targetPodIdx === -1) {
      // Tapped empty track
      return;
    }

    const pod = g.pods[targetPodIdx];
    const latency = Math.abs(Math.round(pod.y - STRIKE_Y) * 6); // Saccadic Auditory Latency ms
    setLatencies(l => [...l, latency]);
    setTotalNotes(t => t + 1);

    if (pod.isTarget) {
      // ── ON-BEAT HIT ──
      playSFX('beat_hit');
      g.pods.splice(targetPodIdx, 1);
      setHitCount(h => h + 1);

      // Particle Burst
      for (let i = 0; i < 16; i++) {
        const angle = Math.random() * Math.PI * 2;
        const spd = 2 + Math.random() * 4;
        g.particles.push({
          x: pod.x, y: pod.y,
          vx: Math.cos(angle) * spd,
          vy: Math.sin(angle) * spd,
          color: pod.track === 'left' ? '#38bdf8' : '#c084fc',
          alpha: 1,
          size: 4 + Math.random() * 3
        });
      }

      const nextStreak = streak + 1;
      const nextCaptures = capturesInWave + 1;
      const nextScore = score + 50;

      setScore(nextScore);
      setStreak(nextStreak);
      setPeakStreak(p => Math.max(p, nextStreak));
      setCapturesInWave(nextCaptures);
      setHintMessage(`⚡ PERFECT ON-BEAT! Tapped ${pod.soundText} (+50 XP)`);

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

      // ── WAVE PROGRESSION (Target Count Hits = Wave Clear + Auto Finish in Assessment) ──
      if (nextCaptures >= requiredCaptures) {
        if (assessmentMode && (onAutoFinish || onComplete) && !assessmentCompletedRef.current) {
          assessmentCompletedRef.current = true;
          playSFX('wave_clear');
          const accuracy = (totalNotes + 1) > 0 ? Math.round(((hitCount + 1) / (totalNotes + 1)) * 100) : 100;
          const avgLatency = latencies.length > 0
            ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length)
            : 280;
          saveTherapyProgress(currentUser, 'auditory', nextScore, accuracy, `${avgLatency}ms Latency`);

          setTimeout(() => {
            if (onAutoFinish) {
              onAutoFinish({
                accuracy,
                latencyMs: avgLatency,
                errorCount: Math.max(0, (totalNotes + 1) - (hitCount + 1)),
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
          setPhase('summary');
        } else {
          playSFX('wave_clear');
          setPhase('wave_clear');
          setBpm(b => b + 8);
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
      // ── NON-PUNITIVE SOFT MISS DISSOLVE ──
      playSFX('soft_miss');
      pod.isDissolving = true;
      setStreak(0);
      g.missesInWave += 1;

      setHintMessage(`💡 Listen closely! Target was /${currentPair.targetSound}/`);

      if (g.missesInWave > 1) {
        setLives(l => {
          const nextL = l - 1;
          if (nextL <= 0) {
            playSFX('game_over');
            if (assessmentMode && (onAutoFinish || onComplete) && !assessmentCompletedRef.current) {
              assessmentCompletedRef.current = true;
              setTimeout(() => {
                if (onAutoFinish) onAutoFinish({ accuracy: 50, latencyMs: 400, errorCount: 2, errorTypes: [], score });
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
  }, [assessmentMode, capturesInWave, currentPair, hitCount, latencies, onAutoFinish, onComplete, phase, score, streak, targetCount, totalNotes]);

  // Keyboard Ergonomic Handlers (`F` = Left Track, `J` = Right Track)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['f','F'].includes(e.key)) {
        e.preventDefault();
        handleTrackTap('left');
      } else if (['j','J'].includes(e.key)) {
        e.preventDefault();
        handleTrackTap('right');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleTrackTap]);

  // ── 60FPS CANVAS GAME LOOP ──
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const loop = () => {
      const g = gameRef.current;

      // 1. Spawn Pods on Rhythm
      g.spawnTimer++;
      const spawnInterval = Math.max(45, Math.round(11000 / bpm));
      if (g.spawnTimer > spawnInterval) {
        g.spawnTimer = 0;
        if (phase === 'playing' && g.pods.length < 4) spawnRhythmPod();
      }

      // Render Retro Cosmic Backdrop
      ctx.clearRect(0, 0, CANV_W, CANV_H);

      const bgGrad = ctx.createLinearGradient(0, 0, 0, CANV_H);
      bgGrad.addColorStop(0, '#090d16');
      bgGrad.addColorStop(1, '#030712');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, CANV_W, CANV_H);

      // Render 2 Parallel Glowing Neon Rails
      const leftTrackX = CANV_W * 0.35;
      const rightTrackX = CANV_W * 0.65;

      // Left Track (#38bdf8)
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 15;
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.5)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(leftTrackX - 35, 0);
      ctx.lineTo(leftTrackX - 35, CANV_H);
      ctx.moveTo(leftTrackX + 35, 0);
      ctx.lineTo(leftTrackX + 35, CANV_H);
      ctx.stroke();

      // Right Track (#c084fc)
      ctx.shadowColor = '#c084fc';
      ctx.shadowBlur = 15;
      ctx.strokeStyle = 'rgba(192, 132, 252, 0.5)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(rightTrackX - 35, 0);
      ctx.lineTo(rightTrackX - 35, CANV_H);
      ctx.moveTo(rightTrackX + 35, 0);
      ctx.lineTo(rightTrackX + 35, CANV_H);
      ctx.stroke();

      // Horizontal Glowing Strike Zone Target Line
      ctx.shadowColor = '#34d399';
      ctx.shadowBlur = 20;
      ctx.strokeStyle = '#34d399';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(CANV_W * 0.2, STRIKE_Y);
      ctx.lineTo(CANV_W * 0.8, STRIKE_Y);
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Strike Zone Hit Boxes
      ctx.strokeStyle = '#34d399';
      ctx.lineWidth = 2;
      ctx.strokeRect(leftTrackX - 35, STRIKE_Y - 25, 70, 50);
      ctx.strokeRect(rightTrackX - 35, STRIKE_Y - 25, 70, 50);

      // Track Labels at Top
      ctx.fillStyle = '#38bdf8';
      ctx.font = '900 16px "Lexend", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`[F] LEFT TRACK: /${currentPair.sound1}/`, leftTrackX, 30);

      ctx.fillStyle = '#c084fc';
      ctx.font = '900 16px "Lexend", sans-serif';
      ctx.fillText(`[J] RIGHT TRACK: /${currentPair.sound2}/`, rightTrackX, 30);

      // Update & Render Pods
      g.pods.forEach((p, idx) => {
        p.y += p.vy;

        // Auto Miss if pod falls below strike zone without hit
        if (p.y > CANV_H + 20) {
          if (p.isTarget && !p.isDissolving) {
            playSFX('soft_miss');
            setStreak(0);
          }
          g.pods.splice(idx, 1);
          return;
        }

        if (p.isDissolving) {
          p.alpha -= 0.08;
          if (p.alpha <= 0) {
            g.pods.splice(idx, 1);
            return;
          }
        }

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.globalAlpha = p.alpha;

        const podColor = p.track === 'left' ? '#38bdf8' : '#c084fc';
        const podGrad = ctx.createRadialGradient(-6, -6, 2, 0, 0, p.radius);
        podGrad.addColorStop(0, '#ffffff');
        podGrad.addColorStop(0.3, podColor);
        podGrad.addColorStop(1, '#0f172a');

        ctx.shadowColor = podColor;
        ctx.shadowBlur = 18;
        ctx.fillStyle = podGrad;
        ctx.beginPath();
        ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();

        // High-Contrast Sound Text
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#ffffff';
        ctx.font = '900 18px "Lexend", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(p.soundText, 0, 0);

        ctx.restore();
      });

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
  }, [bpm, currentPair, phase, spawnRhythmPod]);

  // Reset Game
  const resetGame = () => {
    setLives(3);
    setScore(0);
    setStreak(0);
    setPeakStreak(0);
    setWave(1);
    setBpm(90);
    setCapturesInWave(0);
    setLatencies([]);
    setTotalNotes(0);
    setHitCount(0);
    setPhase('playing');
    gameRef.current.speedMultiplier = 1.0;
    gameRef.current.missesInWave = 0;
    gameRef.current.pods = [];
  };

  // Complete & Save Telemetry
  const handleDone = async () => {
    const accuracy = totalNotes > 0 ? Math.round((hitCount / totalNotes) * 100) : 100;
    const avgLatency = latencies.length > 0
      ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length)
      : 280;

    const telemetryPayload = {
      timestamp: new Date().toISOString(),
      module: 'Auditory Processing Suite',
      score,
      accuracy,
      latencyMs: avgLatency,
      peakStreak,
      bpm,
      pairName: currentPair.pairName
    };

    try {
      localStorage.setItem('lexiflow_session_history_auditory', JSON.stringify(telemetryPayload));
      window.dispatchEvent(new Event('therapy_progress_updated'));
    } catch (e) {}

    await saveTherapyProgress(currentUser, 'auditory', score, accuracy, `${avgLatency}ms Latency`);
    if (onAutoFinish) {
      onAutoFinish({ accuracy, latencyMs: avgLatency, errorCount: Math.max(0, totalNotes - hitCount), errorTypes: [], score });
    } else if (onComplete) {
      onComplete();
    }
  };

  const accuracy = totalNotes > 0 ? Math.round((hitCount / totalNotes) * 100) : 100;
  const avgLatency = latencies.length > 0
    ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length)
    : 280;

  return (
    <div className="rr-game-container">
      {/* Header HUD */}
      <header className="rr-hud-header">
        <div className="rr-title-group">
          <h2 className="rr-game-logo">
            <span>🎧</span> RHYTHM RAIL
          </h2>
        </div>

        <div className="rr-hud-stats">
          <div className="rr-stat-pill" style={{ color: '#ef4444' }}>
            {'❤️'.repeat(lives)}
          </div>
          <div className="rr-stat-pill" style={{ color: '#fbbf24' }}>
            🏆 {score} XP
          </div>
          <div className="rr-stat-pill" style={{ color: '#c084fc' }}>
            ⚡ {bpm} BPM
          </div>
          <div className="rr-stat-pill" style={{ color: '#38bdf8' }}>
            🌊 Wave {wave}
          </div>
          <button className="rr-goals-btn" onClick={() => setShowGoalsDrawer(true)}>
            ℹ️ Clinical Goals
          </button>
        </div>
      </header>

      {/* Target Phoneme Banner */}
      <div className="rr-target-banner">
        <div className="rr-target-info">
          <div className="rr-target-sound-badge">{currentPair.targetSound}</div>
          <div>
            <span style={{ fontSize: '0.72rem', color: '#c084fc', fontWeight: 800, textTransform: 'uppercase' }}>
              MINIMAL PAIR CONSTRAST: {currentPair.pairName}
            </span>
            <p className="rr-target-prompt-text">
              Target Sound: <strong style={{ color: '#c084fc' }}>"/{currentPair.targetSound}/"</strong> — Tap key as notes cross the green strike bar!
            </p>
          </div>
        </div>
        <button className="rr-audio-btn" onClick={() => speakSoundPrompt(`Target sound: ${currentPair.targetSound}`)}>
          🔊 Hear Target
        </button>
      </div>

      {/* 60FPS Interactive Canvas */}
      <div className="rr-canvas-area">
        <canvas ref={canvasRef} width={CANV_W} height={CANV_H} className="rr-canvas" />

        {/* 3X Combo Recovery Banner */}
        {showComboBanner && (
          <div className="rr-combo-banner">
            ⚡ 3X GROOVE! +1 HEART RECOVERED! ❤️
          </div>
        )}

        {/* Celebratory Wave Clear Banner */}
        {phase === 'wave_clear' && (
          <div className="rr-wave-rest-banner">
            <div style={{ fontSize: '2.5rem', marginBottom: '0.3rem' }}>🎧✨</div>
            <h3 className="rr-wave-rest-title">RHYTHM WAVE CLEAR!</h3>
            <p className="rr-wave-rest-sub">BPM Increased (+8 BPM)! Preparing Wave {wave + 1}...</p>
          </div>
        )}
      </div>

      {/* Laptop Home-Row & Touch Controls Footer */}
      <footer className="rr-controls-footer">
        <button
          className={`rr-touch-btn left-key ${leftKeyActive ? 'active' : ''}`}
          onClick={() => handleTrackTap('left')}
        >
          <span className="rr-key-bump">F</span> LEFT TRACK [{currentPair.sound1}]
        </button>

        <button
          className={`rr-touch-btn right-key ${rightKeyActive ? 'active' : ''}`}
          onClick={() => handleTrackTap('right')}
        >
          <span className="rr-key-bump">J</span> RIGHT TRACK [{currentPair.sound2}]
        </button>
      </footer>

      {/* Slide-Over Clinical Goals Drawer */}
      {showGoalsDrawer && (
        <div className="rr-goals-modal-overlay" onClick={() => setShowGoalsDrawer(false)}>
          <div className="rr-goals-drawer" onClick={e => e.stopPropagation()}>
            <div className="rr-goals-drawer-header">
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900, color: '#ffffff' }}>ℹ️ Clinical Goals</h3>
              <button className="rr-goals-drawer-close" onClick={() => setShowGoalsDrawer(false)}>✕</button>
            </div>

            <div className="rr-goals-card-section">
              <div style={{ color: '#c084fc', fontWeight: 800, fontSize: '0.8rem', textTransform: 'uppercase', marginBottom: '0.5rem' }}>🔬 The Science</div>
              <p style={{ color: '#94a3b8', fontSize: '0.88rem', lineHeight: '1.6', margin: 0 }}>
                Auditory processing in dyslexia often involves difficulty distinguishing fast acoustic transitions and minimal-pair phonetic contrasts (/b/ vs /p/, /d/ vs /t/, /m/ vs /n/). Rhythm Rail pairs acoustic timing pressure with home-row motor responses to sharpen auditory cortex tuning.
              </p>
            </div>

            <div className="rr-goals-card-section">
              <div style={{ color: '#34d399', fontWeight: 800, fontSize: '0.8rem', textTransform: 'uppercase', marginBottom: '0.5rem' }}>✅ Key Benefits</div>
              <ul style={{ color: '#cbd5e1', fontSize: '0.85rem', lineHeight: '1.7', margin: 0, paddingLeft: '1.2rem' }}>
                <li>Sharpens minimal-pair auditory discrimination (/b/ vs /p/)</li>
                <li>Strengthens initial sound acoustic decoding speed</li>
                <li>Home-row ergonomics allow playing by ear without looking down</li>
              </ul>
            </div>

            <div className="rr-goals-card-section">
              <div style={{ color: '#fbbf24', fontWeight: 800, fontSize: '0.8rem', textTransform: 'uppercase', marginBottom: '0.5rem' }}>💡 Instructions</div>
              <p style={{ color: '#94a3b8', fontSize: '0.88rem', lineHeight: '1.6', margin: 0 }}>
                Rest index fingers on home-row bumps <strong>F & J</strong>. Tap <strong>F</strong> when notes fall on the Left Track, or <strong>J</strong> for the Right Track as notes cross the green target bar!
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Therapy Session Summary Modal */}
      {phase === 'summary' && (
        <div className="rr-summary-overlay">
          <div className="rr-summary-card">
            <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🎧</div>
            <h2 style={{ margin: '0 0 0.5rem 0', fontSize: '1.8rem', fontWeight: 900 }}>Therapy Session Summary</h2>
            <p style={{ color: '#94a3b8', fontSize: '0.9rem', margin: 0 }}>
              Great rhythm practice! Your auditory discrimination metrics have been saved.
            </p>

            <div className="rr-summary-metrics">
              <div className="rr-summary-metric-box">
                <small style={{ color: '#94a3b8', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase' }}>Auditory Latency</small>
                <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#fbbf24', marginTop: '4px' }}>{avgLatency} ms</div>
              </div>

              <div className="rr-summary-metric-box">
                <small style={{ color: '#94a3b8', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase' }}>Target Hit Accuracy</small>
                <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#34d399', marginTop: '4px' }}>{accuracy}%</div>
              </div>

              <div className="rr-summary-metric-box">
                <small style={{ color: '#94a3b8', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase' }}>Peak Streak</small>
                <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#c084fc', marginTop: '4px' }}>🔥 {peakStreak}</div>
              </div>
            </div>

            <div className="rr-summary-actions">
              <button className="rr-btn-again" onClick={resetGame}>🔄 Practice Again</button>
              <button className="rr-btn-done" onClick={handleDone}>📊 Done</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
