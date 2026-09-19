import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../auth/AuthContext';
import { saveTherapyProgress } from './ExerciseSystem';
import { speakHumanText, VoiceSelectorChip } from './humanVoiceEngine';
import './SpaceAsteroidsRAN.css';

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

    if (type === 'laser') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(880, t);
      osc.frequency.exponentialRampToValueAtTime(110, t + 0.15);
      g.gain.setValueAtTime(0.15, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
      osc.start(); osc.stop(t + 0.16);
    } else if (type === 'explode') {
      osc.type = 'square';
      osc.frequency.setValueAtTime(160, t);
      osc.frequency.exponentialRampToValueAtTime(35, t + 0.26);
      g.gain.setValueAtTime(0.2, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
      osc.start(); osc.stop(t + 0.28);
    } else if (type === 'shield') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(320, t);
      osc.frequency.linearRampToValueAtTime(180, t + 0.22);
      g.gain.setValueAtTime(0.12, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
      osc.start(); osc.stop(t + 0.22);
    } else if (type === 'win') {
      osc.type = 'triangle';
      [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
        osc.frequency.setValueAtTime(f, t + i * 0.09);
      });
      g.gain.setValueAtTime(0.18, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
      osc.start(); osc.stop(t + 0.6);
    }
  } catch (e) {}
};

// ── 3-ROUND CLINICAL PROGRESSION DATA ──
const TIER_DATA = {
  easy: {
    tierKey: 'easy',
    name: 'Round 1: Color Asteroids (3.0s Window)',
    color: '#38bdf8',
    targetGoal: 5,
    namingWindowMs: 3000,
    hurdles: [
      { prompt: 'the BLUE Asteroid', text: 'BLUE', matchWords: ['blue'], targetColor: '#38bdf8', items: [{ text: 'BLUE', color: '#38bdf8', isTarget: true }, { text: 'RED', color: '#ef4444', isTarget: false }, { text: 'GREEN', color: '#22c55e', isTarget: false }] },
      { prompt: 'the RED Asteroid', text: 'RED', matchWords: ['red', 'read'], targetColor: '#ef4444', items: [{ text: 'RED', color: '#ef4444', isTarget: true }, { text: 'BLUE', color: '#38bdf8', isTarget: false }, { text: 'YELLOW', color: '#eab308', isTarget: false }] },
      { prompt: 'the GREEN Asteroid', text: 'GREEN', matchWords: ['green'], targetColor: '#22c55e', items: [{ text: 'GREEN', color: '#22c55e', isTarget: true }, { text: 'PURPLE', color: '#a855f7', isTarget: false }, { text: 'RED', color: '#ef4444', isTarget: false }] },
      { prompt: 'the YELLOW Asteroid', text: 'YELLOW', matchWords: ['yellow'], targetColor: '#eab308', items: [{ text: 'YELLOW', color: '#eab308', isTarget: true }, { text: 'BLUE', color: '#38bdf8', isTarget: false }, { text: 'GREEN', color: '#22c55e', isTarget: false }] },
      { prompt: 'the PURPLE Asteroid', text: 'PURPLE', matchWords: ['purple'], targetColor: '#a855f7', items: [{ text: 'PURPLE', color: '#a855f7', isTarget: true }, { text: 'RED', color: '#ef4444', isTarget: false }, { text: 'YELLOW', color: '#eab308', isTarget: false }] },
    ]
  },
  medium: {
    tierKey: 'medium',
    name: 'Round 2: Digits & Shape Asteroids (2.0s Window)',
    color: '#fbbf24',
    targetGoal: 4,
    namingWindowMs: 2000,
    hurdles: [
      { prompt: 'Number 7', text: '7', matchWords: ['seven', '7'], targetColor: '#fbbf24', items: [{ text: '7', color: '#fbbf24', isTarget: true }, { text: '3', color: '#38bdf8', isTarget: false }, { text: '9', color: '#ec4899', isTarget: false }, { text: '⭐', color: '#a855f7', isTarget: false }] },
      { prompt: 'STAR Shape', text: '⭐', matchWords: ['star'], targetColor: '#eab308', items: [{ text: '⭐', color: '#eab308', isTarget: true }, { text: '🔴', color: '#ef4444', isTarget: false }, { text: '5', color: '#38bdf8', isTarget: false }, { text: '2', color: '#22c55e', isTarget: false }] },
      { prompt: 'Number 4', text: '4', matchWords: ['four', '4'], targetColor: '#38bdf8', items: [{ text: '4', color: '#38bdf8', isTarget: true }, { text: '8', color: '#ef4444', isTarget: false }, { text: '1', color: '#eab308', isTarget: false }, { text: '🔺', color: '#a855f7', isTarget: false }] },
      { prompt: 'TRIANGLE Shape', text: '🔺', matchWords: ['triangle'], targetColor: '#ec4899', items: [{ text: '🔺', color: '#ec4899', isTarget: true }, { text: '6', color: '#22c55e', isTarget: false }, { text: '⭐', color: '#eab308', isTarget: false }, { text: '9', color: '#38bdf8', isTarget: false }] },
    ]
  },
  hard: {
    tierKey: 'hard',
    name: 'Round 3: Letter Discrimination & Gold Comets (1.2s Window)',
    color: '#f87171',
    targetGoal: 3,
    namingWindowMs: 1200,
    hurdles: [
      { prompt: "Letter 'D' (Avoid 'B')", text: 'D', matchWords: ['d', 'dee', 'letter d'], targetColor: '#f87171', items: [{ text: 'D', color: '#f87171', isTarget: true }, { text: 'B', color: '#38bdf8', isTarget: false }, { text: 'P', color: '#eab308', isTarget: false }, { text: 'q', color: '#a855f7', isTarget: false }, { text: 'COMET ✨', color: '#fbbf24', isTarget: false, isComet: true }] },
      { prompt: "Letter 'b' (Avoid 'd')", text: 'b', matchWords: ['b', 'bee', 'letter b'], targetColor: '#fbbf24', items: [{ text: 'b', color: '#fbbf24', isTarget: true }, { text: 'd', color: '#ef4444', isTarget: false }, { text: 'p', color: '#22c55e', isTarget: false }, { text: 'A', color: '#38bdf8', isTarget: false }, { text: 'COMET ✨', color: '#ec4899', isTarget: false, isComet: true }] },
      { prompt: "Letter 'S' (Avoid '5')", text: 'S', matchWords: ['s', 'ess', 'letter s'], targetColor: '#22c55e', items: [{ text: 'S', color: '#22c55e', isTarget: true }, { text: '5', color: '#eab308', isTarget: false }, { text: 'Z', color: '#f87171', isTarget: false }, { text: '8', color: '#38bdf8', isTarget: false }, { text: 'COMET ✨', color: '#a855f7', isTarget: false, isComet: true }] },
    ]
  }
};

const W = 820;
const H = 450;
const CENTER_X = W / 2;
const CENTER_Y = H / 2;

const SpaceAsteroidsRAN = ({ onComplete }) => {
  const { currentUser } = useAuth();
  const gameWrapperRef = useRef(null);
  const canvasRef = useRef(null);
  const animRef = useRef(null);

  const [phase, setPhase] = useState('start'); // start | playing | complete
  const [tierKey, setTierKey] = useState('easy');
  const [hurdleIdx, setHurdleIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [isFullView, setIsFullView] = useState(false);
  const [isVoiceActive, setIsVoiceActive] = useState(false);

  // Latency Metrics
  const [gateStartTime, setGateStartTime] = useState(0);
  const [latencies, setLatencies] = useState([]);
  const [lastLatencyMs, setLastLatencyMs] = useState(null);
  const [sparkyMsg, setSparkyMsg] = useState('Aim starship (◀ / ▶ or A/D) & press Spacebar to blast photon lasers! 🚀');

  const currentTier = TIER_DATA[tierKey] || TIER_DATA.easy;
  const currentHurdle = currentTier.hurdles[hurdleIdx % currentTier.hurdles.length];

  // ── 60FPS Space Arcade Game Engine Ref ──
  const gameRef = useRef({
    shipAngle: -Math.PI / 2, // radians (facing UP initially)
    lasers: [], // [{ x, y, vx, vy, life }]
    asteroids: [], // [{ id, text, color, x, y, vx, vy, radius, isTarget, isComet }]
    particles: [], // [{ x, y, vx, vy, color, alpha, life }]
    thrusters: [], // [{ x, y, vx, vy, alpha, size }]
    stardustText: null, // { text, x, y, alpha }
    shieldFlash: 0
  });

  // Fullscreen Viewport Toggle
  const toggleFullView = () => {
    if (!isFullView) {
      if (gameWrapperRef.current?.requestFullscreen) gameWrapperRef.current.requestFullscreen().catch(() => {});
      setIsFullView(true);
    } else {
      if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(() => {});
      setIsFullView(false);
    }
  };

  useEffect(() => {
    const handleFs = () => setIsFullView(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', handleFs);
    return () => document.removeEventListener('fullscreenchange', handleFs);
  }, []);

  // ── SPAWN ASTEROIDS AROUND RADAR BLASTER ──
  const spawnAsteroids = useCallback((hurdle) => {
    const asts = [];
    const count = hurdle.items.length;

    hurdle.items.forEach((item, i) => {
      const angle = (Math.PI * 2 * i) / count + (Math.random() * 0.2);
      const dist = 140 + Math.random() * 50;
      const x = CENTER_X + Math.cos(angle) * dist;
      const y = CENTER_Y + Math.sin(angle) * dist;
      const speed = item.isComet ? 1.6 : 0.4 + Math.random() * 0.4;
      const moveAngle = Math.random() * Math.PI * 2;

      asts.push({
        id: i,
        text: item.text,
        color: item.color,
        isTarget: item.isTarget,
        isComet: item.isComet || false,
        x,
        y,
        vx: Math.cos(moveAngle) * speed,
        vy: Math.sin(moveAngle) * speed,
        radius: item.text.length > 3 ? 34 : 28
      });
    });

    gameRef.current.asteroids = asts;
    gameRef.current.lasers = [];
    gameRef.current.particles = [];
  }, []);

  // ── Web Speech API Recognition ──
  const recognitionRef = useRef(null);
  useEffect(() => {
    const SpeechClass = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechClass) {
      const rec = new SpeechClass();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = 'en-US';

      rec.onresult = (event) => {
        if (phase !== 'playing' || !currentHurdle) return;
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const transcript = event.results[i][0].transcript.trim().toLowerCase();
          const isMatched = currentHurdle.matchWords.some(w => transcript.includes(w));

          if (isMatched) {
            handleBlastTargetAsteroid('vocal');
            break;
          }
        }
      };

      rec.onerror = () => setIsVoiceActive(false);
      rec.onend = () => {
        if (phase === 'playing' && isVoiceActive) {
          try { rec.start(); } catch (e) {}
        }
      };

      recognitionRef.current = rec;
    }
  }, [currentHurdle, isVoiceActive, phase]);

  const toggleSpeechRecognition = () => {
    if (!recognitionRef.current) {
      alert('Speech recognition is not supported in this browser. Use Keyboard (Arrow Keys / A-D + Spacebar) or Touch!');
      return;
    }
    if (!isVoiceActive) {
      try {
        recognitionRef.current.start();
        setIsVoiceActive(true);
        setSparkyMsg('🎙️ Voice Auto-Targeting Active! Speak radar target names out loud!');
        speakHumanText('Voice auto targeting active! Speak the radar target out loud!');
      } catch (e) {}
    } else {
      try {
        recognitionRef.current.stop();
        setIsVoiceActive(false);
        setSparkyMsg('Voice trigger paused.');
      } catch (e) {}
    }
  };

  // ── BLAST TARGET ASTEROID (Correct Target Hit) ──
  const handleBlastTargetAsteroid = useCallback((inputType = 'tactile') => {
    const g = gameRef.current;
    const targetAst = g.asteroids.find(a => a.isTarget);
    if (!targetAst) return;

    const latency = Math.max(140, Date.now() - gateStartTime);
    setLastLatencyMs(latency);
    setLatencies(prev => [...prev, latency]);
    playSFX('explode');

    // Turn ship angle toward target for auto-aim effect
    g.shipAngle = Math.atan2(targetAst.y - CENTER_Y, targetAst.x - CENTER_X);

    // Fire photon laser beam burst
    g.lasers.push({
      x: CENTER_X,
      y: CENTER_Y,
      vx: Math.cos(g.shipAngle) * 16,
      vy: Math.sin(g.shipAngle) * 16,
      life: 25
    });

    // Spawn Stardust Particles
    for (let i = 0; i < 22; i++) {
      const angle = Math.random() * Math.PI * 2;
      const spd = 2 + Math.random() * 4;
      g.particles.push({
        x: targetAst.x,
        y: targetAst.y,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd,
        color: targetAst.color,
        size: 3 + Math.random() * 3,
        alpha: 1
      });
    }

    const xpEarned = latency < 800 ? 50 : 25;
    g.stardustText = { text: `+${xpEarned} XP`, x: targetAst.x, y: targetAst.y, alpha: 1 };
    setScore(s => s + xpEarned);

    let speedRating = '⚡ TURBO FAST!';
    if (latency < 600) speedRating = '⚡ TURBO FAST (<600ms)!';
    else if (latency < 1000) speedRating = '🔥 NITRO REFLEX!';
    else speedRating = '👍 STEADY RECOGNITION!';

    const inputTag = inputType === 'vocal' ? '🎙️ Voice Trigger' : '🎮 Laser Blast';
    setSparkyMsg(`Target Destroyed! ${speedRating} (${latency}ms) [${inputTag}]`);
    speakHumanText(`Great blast! ${currentHurdle.prompt}!`);

    // Remove destroyed target asteroid
    g.asteroids = g.asteroids.filter(a => !a.isTarget);

    setTimeout(() => {
      if (hurdleIdx + 1 >= currentTier.hurdles.length) {
        handleRoundComplete();
      } else {
        const nextHurdle = currentTier.hurdles[hurdleIdx + 1];
        setHurdleIdx(h => h + 1);
        setGateStartTime(Date.now());
        spawnAsteroids(nextHurdle);
        speakHumanText(`Radar Target: Blast ${nextHurdle.prompt}`);
      }
    }, 450);
  }, [currentHurdle.prompt, currentTier.hurdles, gateStartTime, hurdleIdx, spawnAsteroids]);

  // Round Completion & Storage Sync
  const handleRoundComplete = useCallback(() => {
    playSFX('win');
    setPhase('complete');

    const validLatencies = latencies.filter(l => l > 0);
    const avgLatency = validLatencies.length > 0
      ? Math.round(validLatencies.reduce((a, b) => a + b, 0) / validLatencies.length)
      : 340;

    const stats = {
      round: tierKey,
      score,
      avgLatencyMs: avgLatency,
      accuracy: 100,
      timestamp: Date.now()
    };

    try {
      localStorage.setItem('lexiflow_session_history_ran', JSON.stringify(stats));
      window.dispatchEvent(new Event('therapy_progress_updated'));
    } catch (e) {}

    saveTherapyProgress(currentUser, 'naming', score, 100, `Avg Latency: ${avgLatency}ms (${tierKey})`);
  }, [currentUser, latencies, score, tierKey]);

  // ── MOUSE & TOUCH AIM / SHOOT ──
  const handleCanvasClick = (e) => {
    if (phase !== 'playing' || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const clickX = (e.clientX - rect.left) * (W / rect.width);
    const clickY = (e.clientY - rect.top) * (H / rect.height);

    const g = gameRef.current;
    g.shipAngle = Math.atan2(clickY - CENTER_Y, clickX - CENTER_X);

    playSFX('laser');
    g.lasers.push({
      x: CENTER_X,
      y: CENTER_Y,
      vx: Math.cos(g.shipAngle) * 15,
      vy: Math.sin(g.shipAngle) * 15,
      life: 25
    });

    const hitAst = g.asteroids.find(a => {
      const dist = Math.hypot(a.x - clickX, a.y - clickY);
      return dist <= a.radius + 14;
    });

    if (hitAst) {
      if (hitAst.isTarget) {
        handleBlastTargetAsteroid('tactile');
      } else {
        // Non-Punitive Shield Deflection
        playSFX('shield');
        g.shieldFlash = 25;
        setSparkyMsg(`Shield bounced laser! Target is [${currentHurdle.prompt}]! 🛡️`);
        speakHumanText(`Shield holding! Aim for ${currentHurdle.prompt}`);
      }
    }
  };

  // Keyboard controls (ArrowLeft/Right, A/D, Spacebar/Enter)
  const rotateShip = (dir) => {
    const g = gameRef.current;
    g.shipAngle += dir * 0.25;
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (phase !== 'playing') return;
      if (['ArrowLeft', 'a', 'A'].includes(e.key)) rotateShip(-1);
      else if (['ArrowRight', 'd', 'D'].includes(e.key)) rotateShip(1);
      else if ([' ', 'Enter', 'ArrowUp', 'w', 'W'].includes(e.key)) handleBlastTargetAsteroid('tactile');
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleBlastTargetAsteroid, phase]);

  // ── 60FPS CANVAS RENDER LOOP ──
  useEffect(() => {
    if (phase !== 'playing') {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const loop = () => {
      const g = gameRef.current;

      // 1. Clear & Deep Space Grid Background
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = '#030712';
      ctx.fillRect(0, 0, W, H);

      // Starfield background dots
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      for (let i = 0; i < 40; i++) {
        const sx = (i * 97) % W;
        const sy = (i * 53) % H;
        ctx.beginPath(); ctx.arc(sx, sy, 1, 0, Math.PI * 2); ctx.fill();
      }

      // 2. Shield Flash Ring
      if (g.shieldFlash > 0) {
        g.shieldFlash--;
        ctx.strokeStyle = `rgba(56, 189, 248, ${g.shieldFlash / 25})`;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(CENTER_X, CENTER_Y, 52, 0, Math.PI * 2);
        ctx.stroke();
      }

      // 3. Render Starship at Center
      ctx.save();
      ctx.translate(CENTER_X, CENTER_Y);
      ctx.rotate(g.shipAngle);

      // Thruster Trail Particles
      g.thrusters.push({
        x: -12 + (Math.random() * 4 - 2),
        y: (Math.random() * 6 - 3),
        size: 3 + Math.random() * 3,
        alpha: 1
      });
      g.thrusters = g.thrusters.filter(t => t.alpha > 0.05);
      g.thrusters.forEach(t => {
        t.x -= 1.5;
        t.alpha -= 0.08;
        ctx.fillStyle = `rgba(56, 189, 248, ${t.alpha})`;
        ctx.beginPath();
        ctx.arc(t.x, t.y, t.size, 0, Math.PI * 2);
        ctx.fill();
      });

      // Starship Triangle Body
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 16;
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.moveTo(22, 0);
      ctx.lineTo(-14, -12);
      ctx.lineTo(-8, 0);
      ctx.lineTo(-14, 12);
      ctx.closePath();
      ctx.fill();

      // Cockpit Glow
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(4, 0, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      ctx.shadowBlur = 0;

      // 4. Update & Draw Lasers
      g.lasers = g.lasers.filter(l => l.life > 0);
      g.lasers.forEach(l => {
        l.x += l.vx;
        l.y += l.vy;
        l.life--;

        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 14;
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.arc(l.x, l.y, 4, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.shadowBlur = 0;

      // 5. Update & Draw Drifting Asteroids
      g.asteroids.forEach(ast => {
        ast.x += ast.vx;
        ast.y += ast.vy;

        if (ast.x - ast.radius < 10 || ast.x + ast.radius > W - 10) ast.vx *= -1;
        if (ast.y - ast.radius < 10 || ast.y + ast.radius > H - 10) ast.vy *= -1;

        ctx.shadowColor = ast.color;
        ctx.shadowBlur = ast.isTarget ? 22 : 8;

        ctx.fillStyle = ast.color;
        ctx.beginPath();
        ctx.arc(ast.x, ast.y, ast.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = ast.isTarget ? 3 : 1.5;
        ctx.stroke();

        ctx.shadowBlur = 0;
        ctx.fillStyle = '#ffffff';
        ctx.font = `900 ${ast.radius * 0.55}px "Lexend", sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        ctx.strokeStyle = 'rgba(0,0,0,0.85)';
        ctx.lineWidth = 3.5;
        ctx.strokeText(ast.text, ast.x, ast.y);
        ctx.fillText(ast.text, ast.x, ast.y);
      });

      // 6. Update & Draw Explosion Particles
      if (g.particles.length > 0) {
        g.particles = g.particles.filter(p => p.alpha > 0.05);
        g.particles.forEach(p => {
          p.x += p.vx;
          p.y += p.vy;
          p.alpha -= 0.035;

          ctx.fillStyle = p.color;
          ctx.globalAlpha = Math.max(0, p.alpha);
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        });
        ctx.globalAlpha = 1;
      }

      // Floating XP Stardust Text
      if (g.stardustText && g.stardustText.alpha > 0.05) {
        g.stardustText.y -= 0.8;
        g.stardustText.alpha -= 0.025;
        ctx.fillStyle = `rgba(251, 191, 36, ${g.stardustText.alpha})`;
        ctx.font = '900 18px "Lexend", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(g.stardustText.text, g.stardustText.x, g.stardustText.y);
      }

      animRef.current = requestAnimationFrame(loop);
    };

    animRef.current = requestAnimationFrame(loop);
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, [phase]);

  // Init Round
  const startRound = (key) => {
    setTierKey(key);
    setHurdleIdx(0);
    setScore(0);
    setLatencies([]);
    setLastLatencyMs(null);
    setGateStartTime(Date.now());
    setPhase('playing');

    const firstHurdle = TIER_DATA[key].hurdles[0];
    setSparkyMsg(`Radar Target: Blast [${firstHurdle.prompt}] Asteroid! 🎯`);
    speakHumanText(`Radar alert! Blast ${firstHurdle.prompt}`);
    spawnAsteroids(firstHurdle);
  };

  // ── START SCREEN ──
  if (phase === 'start') {
    return (
      <div className="spa-container font-sans text-slate-100 p-6 rounded-3xl bg-slate-950 border-4 border-cyan-400 shadow-2xl">
        <div className="spa-start-card max-w-2xl mx-auto text-center p-8 bg-slate-900/90 rounded-3xl border-2 border-cyan-400/40 shadow-2xl">
          <div className="text-6xl mb-4">🚀 🛰️ ☄️</div>
          <h1 className="text-3xl font-black mb-3 bg-gradient-to-r from-cyan-400 via-purple-400 to-amber-400 bg-clip-text text-transparent">
            SPACE ASTEROIDS: RADAR BLASTER (RAN TYPE 3)
          </h1>
          <p className="text-slate-400 text-sm leading-relaxed mb-6">
            Rotate starship (◀ / ▶ or A/D) and press <strong>Spacebar</strong> to blast target asteroids!
            <br /><br />
            🎮 <strong>Keyboard / Touch</strong> aiming controls!
            <br />🎙️ <strong>Speak target names out loud</strong> for instant auto-target laser strikes!
          </p>

          <div className="flex flex-col gap-3 mb-6">
            <button className={`p-3 rounded-full border-2 font-extrabold text-sm transition-all ${tierKey === 'easy' ? 'border-cyan-400 bg-cyan-500/20 text-cyan-400' : 'border-slate-700 bg-slate-800 text-slate-300'}`} onClick={() => setTierKey('easy')}>
              🟢 Round 1: Color Asteroids (3.0s Window)
            </button>
            <button className={`p-3 rounded-full border-2 font-extrabold text-sm transition-all ${tierKey === 'medium' ? 'border-amber-400 bg-amber-500/20 text-amber-400' : 'border-slate-700 bg-slate-800 text-slate-300'}`} onClick={() => setTierKey('medium')}>
              🟡 Round 2: Digits & Shapes (2.0s Window)
            </button>
            <button className={`p-3 rounded-full border-2 font-extrabold text-sm transition-all ${tierKey === 'hard' ? 'border-rose-400 bg-rose-500/20 text-rose-400' : 'border-slate-700 bg-slate-800 text-slate-300'}`} onClick={() => setTierKey('hard')}>
              🔴 Round 3: Mixed Letters & Gold Comets (1.2s Window)
            </button>
          </div>

          <button className="px-8 py-4 bg-gradient-to-r from-cyan-400 to-blue-600 text-slate-950 font-black text-lg rounded-full shadow-lg hover:scale-105 transition-transform" onClick={() => startRound(tierKey)}>
            🚀 LAUNCH RADAR BLASTER
          </button>
        </div>
      </div>
    );
  }

  // ── COMPLETION SCREEN ──
  if (phase === 'complete') {
    const validLatencies = latencies.filter(l => l > 0);
    const avgLatency = validLatencies.length > 0
      ? Math.round(validLatencies.reduce((a, b) => a + b, 0) / validLatencies.length)
      : 340;
    const fastestLatency = validLatencies.length > 0 ? Math.min(...validLatencies) : 280;
    const starCount = avgLatency < 750 ? 3 : avgLatency < 1200 ? 2 : 1;

    return (
      <div className="spa-container font-sans text-slate-100 p-6 rounded-3xl bg-slate-950 border-4 border-cyan-400 shadow-2xl">
        <div className="spa-complete-card max-w-2xl mx-auto text-center p-8 bg-slate-900/90 rounded-3xl border-4 border-cyan-400 shadow-2xl">
          <div className="text-5xl mb-3">
            <span className={starCount >= 1 ? 'text-amber-400' : 'text-slate-600'}>⭐</span>
            <span className={starCount >= 2 ? 'text-amber-400' : 'text-slate-600'}>⭐</span>
            <span className={starCount >= 3 ? 'text-amber-400' : 'text-slate-600'}>⭐</span>
          </div>

          <h2 className="text-3xl font-black text-amber-400 mb-2">
            {starCount === 3 ? '⚡ RADAR MASTER COMMANDER!' : '🚀 SPACE ASTEROID BLASTER!'}
          </h2>

          <p className="text-slate-400 text-sm mb-6">
            🤖 SPARKY: "Sensational rapid naming! You averaged <strong>{avgLatency} ms</strong> reaction latency!"
          </p>

          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-slate-800/60 p-4 rounded-2xl border border-slate-700">
              <span className="text-[10px] uppercase font-black text-slate-400 block mb-1">Avg Reaction</span>
              <span className="text-2xl font-black text-cyan-400">{avgLatency} ms</span>
            </div>
            <div className="bg-slate-800/60 p-4 rounded-2xl border border-slate-700">
              <span className="text-[10px] uppercase font-black text-slate-400 block mb-1">Peak Reflex</span>
              <span className="text-2xl font-black text-emerald-400">{fastestLatency} ms</span>
            </div>
            <div className="bg-slate-800/60 p-4 rounded-2xl border border-slate-700">
              <span className="text-[10px] uppercase font-black text-slate-400 block mb-1">XP Earned</span>
              <span className="text-2xl font-black text-amber-400">{score} XP</span>
            </div>
          </div>

          <div className="flex gap-3 justify-center flex-wrap">
            <button className="px-6 py-3 bg-gradient-to-r from-rose-500 to-red-600 text-white font-black rounded-full shadow-lg" onClick={() => startRound(tierKey)}>🔄 REPLAY MISSION</button>
            {tierKey !== 'hard' && (
              <button className="px-6 py-3 bg-gradient-to-r from-cyan-400 to-blue-600 text-slate-950 font-black rounded-full shadow-lg" onClick={() => startRound(tierKey === 'easy' ? 'medium' : 'hard')}>
                NEXT ROUND ➔ ({tierKey === 'easy' ? 'Medium' : 'Hard'})
              </button>
            )}
            <button className="px-6 py-3 bg-slate-800 border border-slate-600 text-slate-200 font-bold rounded-full" onClick={onComplete}>MISSION HQ 🏠</button>
          </div>
        </div>
      </div>
    );
  }

  // ── PLAYING SCREEN (360 RADAR CANVAS BLASTER) ──
  return (
    <div ref={gameWrapperRef} className={`spa-container ${isFullView ? 'spa-fullscreen' : ''}`}>
      {/* HUD Header */}
      <header className="spa-hud flex justify-between items-center bg-slate-900/90 border-2 border-cyan-400/40 p-3 rounded-2xl mb-4 backdrop-blur-md">
        <div className="spa-hud-title font-black text-lg text-cyan-400 flex items-center gap-2">
          <span>🚀</span> SPACE ASTEROIDS: RADAR BLASTER
        </div>

        <div className="spa-hud-stats flex gap-2 items-center">
          <VoiceSelectorChip />
          <div className="spa-stat-pill">⭐ {score} XP</div>
          <div className="spa-stat-pill text-cyan-400 border-cyan-400">
            ⚡ {lastLatencyMs ? `${lastLatencyMs}ms` : '340ms (Turbo!)'}
          </div>
          <button className={`spa-mic-btn ${isVoiceActive ? 'active' : ''}`} onClick={toggleSpeechRecognition}>
            {isVoiceActive ? '🎙️ Mic ON' : '🎤 Voice Trigger'}
          </button>
        </div>
      </header>

      {/* Target Radar Banner */}
      <div className="spa-target-banner bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border-2 border-cyan-400/40 rounded-2xl p-4 mb-4 flex items-center gap-4">
        <div className="spa-target-icon text-3xl bg-cyan-400/15 p-2 rounded-2xl border border-cyan-400/30">🎯</div>
        <div>
          <small className="uppercase text-slate-400 font-extrabold tracking-wide text-xs">RADAR TARGET:</small>
          <div className="spa-target-word text-2xl font-black" style={{ color: currentHurdle.targetColor }}>{currentHurdle.prompt}</div>
        </div>
        <button 
          className="ml-2 px-3 py-1 bg-cyan-500/20 border border-cyan-400/40 rounded-full text-cyan-300 font-bold text-xs hover:bg-cyan-500/30 transition-all"
          onClick={() => speakHumanText(`Radar Target: Blast ${currentHurdle.prompt}`)}
        >
          🔊 Hear Target
        </button>
        <div className="spa-hurdle-counter ml-auto bg-slate-800/80 border border-slate-700 px-4 py-1.5 rounded-full text-amber-400 font-black text-sm">
          Target {hurdleIdx + 1} / {currentTier.hurdles.length}
        </div>
      </div>

      {/* 60FPS Space Canvas Viewport */}
      <div className="spa-canvas-viewport relative w-full flex justify-center">
        <canvas ref={canvasRef} width={W} height={H} onClick={handleCanvasClick} className="cursor-crosshair rounded-2xl border-4 border-cyan-400/40 shadow-2xl block bg-slate-950" />
      </div>

      {/* Footer & On-Screen Controls */}
      <footer className="spa-footer flex justify-between items-center mt-4">
        <button className="spa-fullview-btn" onClick={toggleFullView}>
          {isFullView ? '↙ Exit Fullscreen' : '🎮 Full View'}
        </button>

        {/* Laptop/Touch On-Screen Controls */}
        <div className="flex gap-2 items-center">
          <button className="px-4 py-2 bg-slate-800 border border-slate-700 text-slate-200 font-extrabold rounded-xl hover:bg-slate-700 transition-all" onClick={() => rotateShip(-1)}>↺ TURN LEFT</button>
          <button className="spa-quick-fire-btn px-6 py-2 bg-gradient-to-r from-cyan-400 to-blue-600 text-slate-950 font-black rounded-full shadow-lg hover:scale-105 transition-all" onClick={() => handleBlastTargetAsteroid('tactile')}>
            🎯 FIRE LASER / AUTO-TARGET [{currentHurdle.text}]
          </button>
          <button className="px-4 py-2 bg-slate-800 border border-slate-700 text-slate-200 font-extrabold rounded-xl hover:bg-slate-700 transition-all" onClick={() => rotateShip(1)}>TURN RIGHT ↻</button>
        </div>

        <div className="spa-sparky-hint text-xs text-slate-400 font-bold bg-slate-900/80 px-4 py-2 rounded-full border border-slate-800">
          🤖 SPARKY: "{sparkyMsg}"
        </div>
      </footer>
    </div>
  );
};

export default SpaceAsteroidsRAN;

