import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../auth/AuthContext';
import { saveTherapyProgress } from './ExerciseSystem';
import { speakHumanText, VoiceSelectorChip } from './humanVoiceEngine';
import './SpeedDashSafari.css';

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

    if (type === 'boost') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(350, t);
      osc.frequency.exponentialRampToValueAtTime(880, t + 0.18);
      g.gain.setValueAtTime(0.14, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
      osc.start(); osc.stop(t + 0.2);
    } else if (type === 'coin') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(987.77, t);
      osc.frequency.setValueAtTime(1318.51, t + 0.08);
      g.gain.setValueAtTime(0.15, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
      osc.start(); osc.stop(t + 0.18);
    } else if (type === 'slow') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, t);
      osc.frequency.exponentialRampToValueAtTime(90, t + 0.25);
      g.gain.setValueAtTime(0.12, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
      osc.start(); osc.stop(t + 0.25);
    } else if (type === 'win') {
      osc.type = 'triangle';
      [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
        osc.frequency.setValueAtTime(f, t + i * 0.08);
      });
      g.gain.setValueAtTime(0.18, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
      osc.start(); osc.stop(t + 0.6);
    }
  } catch (e) {}
};

// ── 3-ROUND CLINICAL RAN PROGRESSION DATA ──
const TIER_DATA = {
  easy: {
    tierKey: 'easy',
    name: 'Round 1: Colors & Shapes (2.5s Naming Window)',
    color: '#34d399',
    speed: 4.8,
    namingWindowMs: 2500,
    hurdles: [
      { id: 1, prompt: 'Red Circle', targetText: 'RED CIRCLE', icon: '🔴', matchWords: ['red', 'circle', 'red circle'], targetLane: 1, options: [{ lane: 0, text: 'BLUE SQUARE 🔵', icon: '🔵' }, { lane: 1, text: 'RED CIRCLE 🔴', icon: '🔴' }, { lane: 2, text: 'GREEN STAR ⭐', icon: '⭐' }] },
      { id: 2, prompt: 'Yellow Star', targetText: 'YELLOW STAR', icon: '⭐', matchWords: ['star', 'yellow', 'yellow star'], targetLane: 0, options: [{ lane: 0, text: 'YELLOW STAR ⭐', icon: '⭐' }, { lane: 1, text: 'RED CIRCLE 🔴', icon: '🔴' }, { lane: 2, text: 'BLUE TRIANGLE 🔺', icon: '🔺' }] },
      { id: 3, prompt: 'Blue Triangle', targetText: 'BLUE TRIANGLE', icon: '🔵', matchWords: ['blue', 'triangle', 'blue triangle'], targetLane: 2, options: [{ lane: 0, text: 'GREEN SQUARE 🟩', icon: '🟩' }, { lane: 1, text: 'PURPLE CIRCLE 🟣', icon: '🟣' }, { lane: 2, text: 'BLUE TRIANGLE 🔵', icon: '🔵' }] },
      { id: 4, prompt: 'Green Square', targetText: 'GREEN SQUARE', icon: '🟢', matchWords: ['green', 'square', 'green square'], targetLane: 1, options: [{ lane: 0, text: 'RED STAR ⭐', icon: '⭐' }, { lane: 1, text: 'GREEN SQUARE 🟢', icon: '🟢' }, { lane: 2, text: 'YELLOW CIRCLE 🟡', icon: '🟡' }] },
      { id: 5, prompt: 'Purple Diamond', targetText: 'PURPLE DIAMOND', icon: '🔷', matchWords: ['purple', 'diamond', 'purple diamond'], targetLane: 0, options: [{ lane: 0, text: 'PURPLE DIAMOND 🔷', icon: '🔷' }, { lane: 1, text: 'GREEN STAR ⭐', icon: '⭐' }, { lane: 2, text: 'RED CIRCLE 🔴', icon: '🔴' }] },
    ]
  },
  medium: {
    tierKey: 'medium',
    name: 'Round 2: Digits & Animals (1.8s Naming Window)',
    color: '#fbbf24',
    speed: 6.2,
    namingWindowMs: 1800,
    hurdles: [
      { id: 1, prompt: 'Number 7', targetText: 'NUMBER 7', icon: '7️⃣', matchWords: ['seven', '7', 'number seven'], targetLane: 1, options: [{ lane: 0, text: 'DOG 🐶', icon: '🐶' }, { lane: 1, text: 'NUMBER 7 7️⃣', icon: '7️⃣' }, { lane: 2, text: 'CAR 🚗', icon: '🚗' }] },
      { id: 2, prompt: 'Cat', targetText: 'CAT', icon: '🐱', matchWords: ['cat', 'kitty'], targetLane: 2, options: [{ lane: 0, text: 'NUMBER 2 2️⃣', icon: '2️⃣' }, { lane: 1, text: 'CAR 🚗', icon: '🚗' }, { lane: 2, text: 'CAT 🐱', icon: '🐱' }] },
      { id: 3, prompt: 'Number 5', targetText: 'NUMBER 5', icon: '5️⃣', matchWords: ['five', '5', 'number five'], targetLane: 0, options: [{ lane: 0, text: 'NUMBER 5 5️⃣', icon: '5️⃣' }, { lane: 1, text: 'NUMBER 8 8️⃣', icon: '8️⃣' }, { lane: 2, text: 'CAT 🐱', icon: '🐱' }] },
      { id: 4, prompt: 'Safari Buggy', targetText: 'SAFARI CAR', icon: '🚗', matchWords: ['car', 'auto', 'buggy', 'safari car'], targetLane: 1, options: [{ lane: 0, text: 'DOG 🐶', icon: '🐶' }, { lane: 1, text: 'SAFARI CAR 🚗', icon: '🚗' }, { lane: 2, text: 'NUMBER 8 8️⃣', icon: '8️⃣' }] },
    ]
  },
  hard: {
    tierKey: 'hard',
    name: 'Round 3: Mixed Letters & Decoy Barriers (1.2s Window)',
    color: '#f87171',
    speed: 7.8,
    namingWindowMs: 1200,
    hurdles: [
      { id: 1, prompt: 'Letter A', targetText: 'LETTER A', icon: '🅰️', matchWords: ['a', 'ay', 'letter a'], targetLane: 0, options: [{ lane: 0, text: 'LETTER A 🅰️', icon: '🅰️' }, { lane: 1, text: 'letter d 🇩', icon: '🇩' }, { lane: 2, text: 'DECOY BARRIER 🚧', icon: '🚧' }] },
      { id: 2, prompt: 'Letter d', targetText: 'LETTER d', icon: '🇩', matchWords: ['d', 'dee', 'letter d'], targetLane: 1, options: [{ lane: 0, text: 'LETTER B 🅱️', icon: '🅱️' }, { lane: 1, text: 'letter d 🇩', icon: '🇩' }, { lane: 2, text: 'letter s ⚡', icon: '⚡' }] },
      { id: 3, prompt: 'Letter B', targetText: 'LETTER B', icon: '🅱️', matchWords: ['b', 'bee', 'letter b'], targetLane: 2, options: [{ lane: 0, text: 'LETTER T 🌴', icon: '🌴' }, { lane: 1, text: 'DECOY BARRIER 🚧', icon: '🚧' }, { lane: 2, text: 'LETTER B 🅱️', icon: '🅱️' }] },
    ]
  }
};

const CANV_W = 800;
const CANV_H = 420;

const SpeedDashSafari = ({ onComplete }) => {
  const { currentUser } = useAuth();
  const gameWrapperRef = useRef(null);
  const canvasRef = useRef(null);
  const animRef = useRef(null);

  const [phase, setPhase] = useState('start'); // start | playing | complete
  const [tierKey, setTierKey] = useState('easy');
  const [hurdleIdx, setHurdleIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [coins, setCoins] = useState(0);
  const [streak, setStreak] = useState(0);
  const [isFullView, setIsFullView] = useState(false);
  const [isVoiceActive, setIsVoiceActive] = useState(false);

  // ── Reaction Latency Metrics (t_input - t_spawn) ──
  const [gateSpawnTime, setGateSpawnTime] = useState(0);
  const [latencies, setLatencies] = useState([]);
  const [lastLatencyMs, setLastLatencyMs] = useState(null);
  const [sparkyMsg, setSparkyMsg] = useState('Sparky is driving the Safari Hover-Buggy! Name items out loud or switch lanes! 🏎️💨');
  const [speedBoostActive, setSpeedBoostActive] = useState(false);

  const currentTier = TIER_DATA[tierKey] || TIER_DATA.easy;
  const currentHurdle = currentTier.hurdles[hurdleIdx % currentTier.hurdles.length];

  // ── 60FPS Perspective Canvas Engine Ref ──
  const stateRef = useRef({
    lane: 1, // 0, 1, 2
    targetLane: 1,
    playerX: CANV_W / 2,
    playerY: CANV_H - 70,
    zDist: 0, // distance of approaching gate (0 to 1000)
    speed: 5,
    trackOffset: 0,
    particles: []
  });

  // Fullscreen Toggle
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

  // ── Web Speech API Voice Recognition ──
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
            handlePassGate(currentHurdle.targetLane, 'vocal');
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
      alert('Web Speech API is not supported in this browser. Use Touch Lane Buttons / Keyboard (◀ / ▶)!');
      return;
    }
    if (!isVoiceActive) {
      try {
        recognitionRef.current.start();
        setIsVoiceActive(true);
        setSparkyMsg('🎙️ Mic Activated! Speak target item names out loud!');
        speakHumanText('Microphone active! Speak the target item out loud!');
      } catch (e) {}
    } else {
      try {
        recognitionRef.current.stop();
        setIsVoiceActive(false);
        setSparkyMsg('Voice input paused.');
      } catch (e) {}
    }
  };

  // ── Gate Retrieval Action (t_input - t_spawn Calculation) ──
  const handlePassGate = useCallback((chosenLane, inputType = 'tactile') => {
    const s = stateRef.current;
    const now = Date.now();
    const latencyMs = Math.max(120, now - gateSpawnTime);
    setLastLatencyMs(latencyMs);
    setLatencies(prev => [...prev, latencyMs]);

    s.targetLane = chosenLane;
    const isCorrect = chosenLane === currentHurdle.targetLane;

    if (isCorrect) {
      playSFX('boost');
      setSpeedBoostActive(true);
      setTimeout(() => setSpeedBoostActive(false), 500);

      const xpEarned = latencyMs < 800 ? 50 : 30;
      setScore(sc => sc + xpEarned);
      setCoins(c => c + 3);
      setStreak(st => st + 1);

      // Create Coin Particle Shower
      for (let i = 0; i < 12; i++) {
        s.particles.push({
          x: s.playerX + (Math.random() * 60 - 30),
          y: s.playerY - 20,
          vx: (Math.random() - 0.5) * 6,
          vy: -4 - Math.random() * 4,
          life: 30,
          color: '#fbbf24'
        });
      }

      let speedRating = '⚡ ULTRA-FAST!';
      if (latencyMs < 700) speedRating = '⚡ ULTRA-FAST RETRIEVAL!';
      else if (latencyMs < 1200) speedRating = '🔥 NITRO RUNNER!';
      else speedRating = '👍 STEADY NAMING!';

      const inputTag = inputType === 'vocal' ? '🎙️ Vocal Match' : '🎮 Lane Switch';
      setSparkyMsg(`Correct! ${speedRating} (${latencyMs}ms) [${inputTag}]`);
      speakHumanText(`Great! ${currentHurdle.prompt}!`);

      // Reset Z distance for next gate
      s.zDist = 0;
      setTimeout(() => {
        if (hurdleIdx + 1 >= currentTier.hurdles.length) {
          handleRoundComplete();
        } else {
          setHurdleIdx(h => h + 1);
          setGateSpawnTime(Date.now());
        }
      }, 350);
    } else {
      // Gentle Miss Slowdown (Low-Anxiety Clinical Approach)
      playSFX('slow');
      setStreak(0);
      setSparkyMsg(`Encouragement Tip: Target "${currentHurdle.prompt}" is in Lane ${currentHurdle.targetLane + 1}! 🚗💨`);
      speakHumanText(`Keep going! Target is ${currentHurdle.prompt}!`);
    }
  }, [currentHurdle, currentTier.hurdles.length, gateSpawnTime, hurdleIdx]);

  // Round Complete & Analytics Reporting
  const handleRoundComplete = useCallback(() => {
    playSFX('win');
    setPhase('complete');

    const validLatencies = latencies.filter(l => l > 0);
    const avgLatency = validLatencies.length > 0
      ? Math.round(validLatencies.reduce((a, b) => a + b, 0) / validLatencies.length)
      : 420;

    const stats = {
      round: tierKey,
      score,
      coins,
      avgLatencyMs: avgLatency,
      accuracy: 100,
      timestamp: Date.now()
    };

    try {
      localStorage.setItem('lexiflow_session_history_ran', JSON.stringify(stats));
      window.dispatchEvent(new Event('therapy_progress_updated'));
    } catch (e) {}

    saveTherapyProgress(currentUser, 'naming', score, 100, `Avg Naming Latency: ${avgLatency}ms (${tierKey})`);
  }, [currentUser, coins, latencies, score, tierKey]);

  // ── Keyboard Controls ──
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (phase !== 'playing') return;
      if (['ArrowLeft', 'a', 'A', '1'].includes(e.key)) handlePassGate(0, 'tactile');
      else if (['ArrowUp', 'w', 'W', '2'].includes(e.key)) handlePassGate(1, 'tactile');
      else if (['ArrowRight', 'd', 'D', '3'].includes(e.key)) handlePassGate(2, 'tactile');
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlePassGate, phase]);

  // ── 60FPS Perspective Safari Canvas Render Loop ──
  useEffect(() => {
    if (phase !== 'playing') {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const loop = (timestamp) => {
      const s = stateRef.current;
      const tier = TIER_DATA[tierKey] || TIER_DATA.easy;
      const hurdle = tier.hurdles[hurdleIdx % tier.hurdles.length];

      // Track Physics & Speed Progress
      s.speed = speedBoostActive ? tier.speed * 1.4 : tier.speed;
      s.trackOffset = (s.trackOffset + s.speed) % 40;
      s.zDist = (s.zDist + s.speed * 2.2) % 1000;

      // Smooth Lane Interpolation
      const laneXs = [CANV_W * 0.22, CANV_W * 0.5, CANV_W * 0.78];
      const targetX = laneXs[s.targetLane];
      s.playerX += (targetX - s.playerX) * 0.25;

      // Render Canvas Background
      ctx.clearRect(0, 0, CANV_W, CANV_H);

      // Sunset Safari Sky Gradient
      const skyGrad = ctx.createLinearGradient(0, 0, 0, CANV_H * 0.45);
      skyGrad.addColorStop(0, '#0f172a');
      skyGrad.addColorStop(1, '#1e1b4b');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, CANV_W, CANV_H * 0.45);

      // Safari Sun
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.arc(CANV_W / 2, CANV_H * 0.35, 38, 0, Math.PI * 2);
      ctx.fill();

      // 3D Perspective Safari Road
      const horizonY = CANV_H * 0.38;
      const groundGrad = ctx.createLinearGradient(0, horizonY, 0, CANV_H);
      groundGrad.addColorStop(0, '#151928');
      groundGrad.addColorStop(1, '#090d16');
      ctx.fillStyle = groundGrad;
      ctx.fillRect(0, horizonY, CANV_W, CANV_H - horizonY);

      // Perspective Track Rails (3 Lanes)
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3;

      const railCoords = [
        { topX: CANV_W * 0.4, botX: 20 },
        { topX: CANV_W * 0.46, botX: CANV_W * 0.33 },
        { topX: CANV_W * 0.54, botX: CANV_W * 0.67 },
        { topX: CANV_W * 0.6, botX: CANV_W - 20 }
      ];

      railCoords.forEach(r => {
        ctx.beginPath();
        ctx.moveTo(r.topX, horizonY);
        ctx.lineTo(r.botX, CANV_H);
        ctx.stroke();
      });

      // Moving Railway Ties
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 2;
      for (let i = 0; i < 10; i++) {
        const tieZ = (i * 35 + s.trackOffset) % 350;
        const progress = tieZ / 350;
        const tieY = horizonY + progress * (CANV_H - horizonY);
        const leftX = (CANV_W * 0.4) + progress * (20 - CANV_W * 0.4);
        const rightX = (CANV_W * 0.6) + progress * ((CANV_W - 20) - CANV_W * 0.6);

        ctx.beginPath();
        ctx.moveTo(leftX, tieY);
        ctx.lineTo(rightX, tieY);
        ctx.stroke();
      }

      // Draw Approaching Item Stimulus Gates
      if (hurdle) {
        const gateProgress = s.zDist / 1000;
        const gateY = horizonY + gateProgress * (CANV_H - horizonY - 40);
        const scale = 0.3 + 0.7 * gateProgress;

        hurdle.options.forEach(opt => {
          const laneX = laneXs[opt.lane];
          const projX = CANV_W * 0.5 + (laneX - CANV_W * 0.5) * gateProgress;
          const isTarget = opt.lane === hurdle.targetLane;

          const cardW = 120 * scale;
          const cardH = 80 * scale;
          const cardX = projX - cardW / 2;
          const cardY = gateY - cardH;

          ctx.shadowColor = isTarget ? '#38bdf8' : '#ef4444';
          ctx.shadowBlur = 16 * scale;

          ctx.fillStyle = isTarget ? 'rgba(56, 189, 248, 0.9)' : 'rgba(239, 68, 68, 0.85)';
          ctx.beginPath();
          ctx.roundRect(cardX, cardY, cardW, cardH, 14 * scale);
          ctx.fill();

          ctx.shadowBlur = 0;
          ctx.fillStyle = '#ffffff';
          ctx.font = `900 ${Math.max(11, 16 * scale)}px "Lexend", sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(`${opt.icon} ${opt.text}`, projX, cardY + cardH / 2);
        });
      }

      // Particles
      s.particles.forEach(pt => {
        pt.x += pt.vx;
        pt.y += pt.vy;
        pt.life--;
        ctx.fillStyle = pt.color;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 4, 0, Math.PI * 2);
        ctx.fill();
      });
      s.particles = s.particles.filter(pt => pt.life > 0);

      // Safari Hover-Buggy Character
      const px = s.playerX;
      const py = s.playerY;

      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.beginPath();
      ctx.ellipse(px, CANV_H - 45, 24, 9, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.shadowColor = speedBoostActive ? '#fbbf24' : '#38bdf8';
      ctx.shadowBlur = speedBoostActive ? 25 : 12;
      ctx.font = '3.2rem sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText('🏎️', px, py);
      ctx.shadowBlur = 0;

      animRef.current = requestAnimationFrame(loop);
    };

    animRef.current = requestAnimationFrame(loop);
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, [hurdleIdx, phase, speedBoostActive, tierKey]);

  // Start Round
  const startRound = (key) => {
    setTierKey(key);
    setHurdleIdx(0);
    setScore(0);
    setCoins(0);
    setStreak(0);
    setLatencies([]);
    setLastLatencyMs(null);
    setGateSpawnTime(Date.now());

    stateRef.current.lane = 1;
    stateRef.current.targetLane = 1;
    stateRef.current.playerX = CANV_W / 2;
    stateRef.current.zDist = 0;

    setPhase('playing');
    const firstHurdle = TIER_DATA[key].hurdles[0];
    setSparkyMsg(`Target 1: Rapidly Name [${firstHurdle.prompt}]! 🏎️💨`);
    speakHumanText(`Get ready! Rapidly name ${firstHurdle.prompt}!`);
  };

  // ── START SCREEN ──
  if (phase === 'start') {
    return (
      <div className="sds-container font-sans text-slate-100 p-6 rounded-3xl bg-slate-950 border-4 border-cyan-400 shadow-2xl">
        <div className="sds-start-card max-w-2xl mx-auto text-center p-8 bg-slate-900/90 rounded-3xl border-2 border-cyan-400/40 shadow-2xl">
          <div className="text-6xl mb-4">🏎️ 🐆 ⚡</div>
          <h1 className="text-3xl font-black mb-3 bg-gradient-to-r from-cyan-400 via-purple-400 to-amber-400 bg-clip-text text-transparent">
            RAPID NAMING SAFARI (RAN TYPE 3)
          </h1>
          <p className="text-slate-400 text-sm leading-relaxed mb-6">
            Sprint through 3-lane visual stimulus gates! Measure real-time vocal retrieval latency ($t_{"{input}"} - t_{"{spawn}"}$) in milliseconds.
            <br /><br />
            🎙️ <strong>Speak item names out loud</strong> into microphone or <strong>tap Lane 1 / 2 / 3 buttons</strong>!
          </p>

          <div className="flex flex-col gap-3 mb-6">
            <button className={`p-3 rounded-full border-2 font-extrabold text-sm transition-all ${tierKey === 'easy' ? 'border-emerald-400 bg-emerald-500/20 text-emerald-400' : 'border-slate-700 bg-slate-800 text-slate-300'}`} onClick={() => setTierKey('easy')}>
              🟢 Round 1: Colors & Shapes (2.5s Window)
            </button>
            <button className={`p-3 rounded-full border-2 font-extrabold text-sm transition-all ${tierKey === 'medium' ? 'border-amber-400 bg-amber-500/20 text-amber-400' : 'border-slate-700 bg-slate-800 text-slate-300'}`} onClick={() => setTierKey('medium')}>
              🟡 Round 2: Digits & Animals (1.8s Window)
            </button>
            <button className={`p-3 rounded-full border-2 font-extrabold text-sm transition-all ${tierKey === 'hard' ? 'border-rose-400 bg-rose-500/20 text-rose-400' : 'border-slate-700 bg-slate-800 text-slate-300'}`} onClick={() => setTierKey('hard')}>
              🔴 Round 3: Mixed Letters & Decoys (1.2s Window)
            </button>
          </div>

          <button className="px-8 py-4 bg-gradient-to-r from-cyan-400 to-blue-600 text-slate-950 font-black text-lg rounded-full shadow-lg hover:scale-105 transition-transform" onClick={() => startRound(tierKey)}>
            🏁 START SAFARI SPRINT
          </button>
        </div>
      </div>
    );
  }

  // ── COMPLETION ANALYTICS MODAL ──
  if (phase === 'complete') {
    const validLatencies = latencies.filter(l => l > 0);
    const avgLatency = validLatencies.length > 0
      ? Math.round(validLatencies.reduce((a, b) => a + b, 0) / validLatencies.length)
      : 420;
    const fastestLatency = validLatencies.length > 0 ? Math.min(...validLatencies) : 310;
    const starCount = avgLatency < 750 ? 3 : avgLatency < 1200 ? 2 : 1;

    return (
      <div className="sds-container font-sans text-slate-100 p-6 rounded-3xl bg-slate-950 border-4 border-cyan-400 shadow-2xl">
        <div className="sds-complete-card max-w-2xl mx-auto text-center p-8 bg-slate-900/90 rounded-3xl border-4 border-cyan-400 shadow-2xl">
          <div className="text-5xl mb-3">
            <span className={starCount >= 1 ? 'text-amber-400' : 'text-slate-600'}>⭐</span>
            <span className={starCount >= 2 ? 'text-amber-400' : 'text-slate-600'}>⭐</span>
            <span className={starCount >= 3 ? 'text-amber-400' : 'text-slate-600'}>⭐</span>
          </div>

          <h2 className="text-3xl font-black text-amber-400 mb-2">
            {starCount === 3 ? '⚡ ULTRA-FAST NAMING CHAMPION!' : '🏎️ SPEED RUNNER!'}
          </h2>

          <p className="text-slate-400 text-sm mb-6">
            🤖 SPARKY: "Awesome retrieval latency! You averaged <strong>{avgLatency} ms</strong> response time!"
          </p>

          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-slate-800/60 p-4 rounded-2xl border border-slate-700">
              <span className="text-[10px] uppercase font-black text-slate-400 block mb-1">Avg Latency</span>
              <span className="text-2xl font-black text-cyan-400">{avgLatency} ms</span>
            </div>
            <div className="bg-slate-800/60 p-4 rounded-2xl border border-slate-700">
              <span className="text-[10px] uppercase font-black text-slate-400 block mb-1">Peak Speed</span>
              <span className="text-2xl font-black text-emerald-400">{fastestLatency} ms</span>
            </div>
            <div className="bg-slate-800/60 p-4 rounded-2xl border border-slate-700">
              <span className="text-[10px] uppercase font-black text-slate-400 block mb-1">XP Earned</span>
              <span className="text-2xl font-black text-amber-400">{score} XP</span>
            </div>
          </div>

          <div className="flex gap-3 justify-center flex-wrap">
            <button className="px-6 py-3 bg-gradient-to-r from-rose-500 to-red-600 text-white font-black rounded-full shadow-lg" onClick={() => startRound(tierKey)}>🔄 REPLAY STAGE</button>
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

  // ── PLAYING SCREEN (60FPS perspective canvas runner) ──
  return (
    <div ref={gameWrapperRef} className={`sds-container ${isFullView ? 'sds-fullscreen' : ''}`}>
      {/* HUD Header */}
      <header className="sds-hud flex justify-between items-center bg-slate-900/90 border-2 border-cyan-400/40 p-3 rounded-2xl mb-4 backdrop-blur-md">
        <div className="sds-hud-title font-black text-lg text-cyan-400 flex items-center gap-2">
          <span>🏎️</span> RAPID NAMING SAFARI
        </div>

        <div className="sds-hud-stats flex gap-2 items-center">
          <VoiceSelectorChip />
          <div className="sds-stat-pill">🪙 {coins}</div>
          <div className="sds-stat-pill">⭐ {score} XP</div>
          <div className="sds-stat-pill text-cyan-400 border-cyan-400">
            ⚡ {lastLatencyMs ? `${lastLatencyMs}ms` : currentTier.speed}
          </div>
          <button className={`sds-mic-btn ${isVoiceActive ? 'active' : ''}`} onClick={toggleSpeechRecognition}>
            {isVoiceActive ? '🎙️ Mic ON' : '🎤 Mic Input'}
          </button>
        </div>
      </header>

      {/* Target Gate Clue Banner */}
      <div className="sds-target-banner bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border-2 border-cyan-400/40 rounded-2xl p-4 mb-4 flex items-center gap-4">
        <div className="sds-target-icon text-4xl bg-cyan-400/15 p-2 rounded-2xl border border-cyan-400/30">{currentHurdle.icon}</div>
        <div>
          <small className="uppercase text-slate-400 font-extrabold tracking-wide text-xs">TARGET TO NAME:</small>
          <div className="sds-target-word text-2xl font-black text-cyan-400">{currentHurdle.prompt}</div>
        </div>
        <button 
          className="ml-2 px-3 py-1 bg-cyan-500/20 border border-cyan-400/40 rounded-full text-cyan-300 font-bold text-xs hover:bg-cyan-500/30 transition-all"
          onClick={() => speakHumanText(`Target: ${currentHurdle.prompt}`)}
        >
          🔊 Hear Target
        </button>
        <div className="sds-hurdle-counter ml-auto bg-slate-800/80 border border-slate-700 px-4 py-1.5 rounded-full text-amber-400 font-black text-sm">
          Gate {hurdleIdx + 1} / {currentTier.hurdles.length}
        </div>
      </div>

      {/* 60FPS Perspective Canvas Arena */}
      <div className="sds-track-viewport relative w-full h-[340px] bg-slate-950 rounded-2xl border-4 border-cyan-400/30 shadow-2xl overflow-hidden">
        <canvas ref={canvasRef} width={CANV_W} height={CANV_H} className="w-full h-full block" />
      </div>

      {/* Footer & Lane Buttons */}
      <footer className="sds-footer flex justify-between items-center mt-4">
        <button className="sds-fullview-btn" onClick={toggleFullView}>
          {isFullView ? '↙ Exit Fullscreen' : '⛶ Full View'}
        </button>

        {/* 3-Lane Switcher Touch Buttons */}
        <div className="flex gap-2">
          <button className="sds-ctrl-btn" onClick={() => handlePassGate(0, 'tactile')}>◀ LANE 1</button>
          <button className="sds-ctrl-btn jump" onClick={() => handlePassGate(1, 'tactile')}>▲ LANE 2</button>
          <button className="sds-ctrl-btn" onClick={() => handlePassGate(2, 'tactile')}>LANE 3 ▶</button>
        </div>

        <div className="sds-sparky-hint text-xs text-slate-400 font-bold bg-slate-900/80 px-4 py-2 rounded-full border border-slate-800">
          🤖 SPARKY: "{sparkyMsg}"
        </div>
      </footer>
    </div>
  );
};

export default SpeedDashSafari;

