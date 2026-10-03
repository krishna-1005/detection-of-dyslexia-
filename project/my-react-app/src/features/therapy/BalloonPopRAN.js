import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../auth/AuthContext';
import { saveTherapyProgress } from './ExerciseSystem';
import { speakHumanText, VoiceSelectorChip } from './humanVoiceEngine';
import './BalloonPopRAN.css';

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

    if (type === 'pop') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(480, t);
      osc.frequency.exponentialRampToValueAtTime(960, t + 0.12);
      g.gain.setValueAtTime(0.2, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
      osc.start(); osc.stop(t + 0.15);
    } else if (type === 'wrong_pop') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(280, t);
      osc.frequency.linearRampToValueAtTime(140, t + 0.22);
      g.gain.setValueAtTime(0.25, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
      osc.start(); osc.stop(t + 0.22);
    } else if (type === 'combo_reward') {
      osc.type = 'triangle';
      [523.25, 659.25, 783.99, 1046.5, 1318.51].forEach((f, i) => {
        osc.frequency.setValueAtTime(f, t + i * 0.07);
      });
      g.gain.setValueAtTime(0.25, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
      osc.start(); osc.stop(t + 0.45);
    } else if (type === 'game_over') {
      osc.type = 'sawtooth';
      [330, 293, 261, 220].forEach((f, i) => {
        osc.frequency.setValueAtTime(f, t + i * 0.12);
      });
      g.gain.setValueAtTime(0.25, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
      osc.start(); osc.stop(t + 0.6);
    } else if (type === 'bonus') {
      osc.type = 'triangle';
      [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
        osc.frequency.setValueAtTime(f, t + i * 0.07);
      });
      g.gain.setValueAtTime(0.18, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
      osc.start(); osc.stop(t + 0.4);
    }
  } catch (e) {}
};

// ── ENDLESS DYNAMIC TARGET GENERATOR POOL ──
const TARGET_POOL = [
  { prompt: 'BLUE', text: 'BLUE', matchWords: ['blue'], targetColor: '#38bdf8', items: [{ text: 'BLUE', color: '#38bdf8', isTarget: true }, { text: 'RED', color: '#f87171', isTarget: false }, { text: 'GREEN', color: '#4ade80', isTarget: false }] },
  { prompt: 'RED', text: 'RED', matchWords: ['red', 'read'], targetColor: '#f87171', items: [{ text: 'RED', color: '#f87171', isTarget: true }, { text: 'BLUE', color: '#38bdf8', isTarget: false }, { text: 'YELLOW', color: '#fbbf24', isTarget: false }] },
  { prompt: 'GREEN', text: 'GREEN', matchWords: ['green'], targetColor: '#4ade80', items: [{ text: 'GREEN', color: '#4ade80', isTarget: true }, { text: 'PURPLE', color: '#c084fc', isTarget: false }, { text: 'RED', color: '#f87171', isTarget: false }] },
  { prompt: 'YELLOW', text: 'YELLOW', matchWords: ['yellow'], targetColor: '#fbbf24', items: [{ text: 'YELLOW', color: '#fbbf24', isTarget: true }, { text: 'BLUE', color: '#38bdf8', isTarget: false }, { text: 'GREEN', color: '#4ade80', isTarget: false }] },
  { prompt: 'PURPLE', text: 'PURPLE', matchWords: ['purple'], targetColor: '#c084fc', items: [{ text: 'PURPLE', color: '#c084fc', isTarget: true }, { text: 'RED', color: '#f87171', isTarget: false }, { text: 'YELLOW', color: '#fbbf24', isTarget: false }] },
  { prompt: 'Number 7', text: '7', matchWords: ['seven', '7'], targetColor: '#fbbf24', items: [{ text: '7', color: '#fbbf24', isTarget: true }, { text: '3', color: '#38bdf8', isTarget: false }, { text: '9', color: '#f472b6', isTarget: false }, { text: '⭐', color: '#c084fc', isTarget: false }] },
  { prompt: 'STAR', text: '⭐', matchWords: ['star'], targetColor: '#fbbf24', items: [{ text: '⭐', color: '#fbbf24', isTarget: true }, { text: '🔴', color: '#f87171', isTarget: false }, { text: '5', color: '#38bdf8', isTarget: false }, { text: '2', color: '#4ade80', isTarget: false }] },
  { prompt: 'Number 4', text: '4', matchWords: ['four', '4'], targetColor: '#38bdf8', items: [{ text: '4', color: '#38bdf8', isTarget: true }, { text: '8', color: '#f87171', isTarget: false }, { text: '1', color: '#fbbf24', isTarget: false }, { text: '🔺', color: '#c084fc', isTarget: false }] },
  { prompt: 'TRIANGLE', text: '🔺', matchWords: ['triangle'], targetColor: '#f472b6', items: [{ text: '🔺', color: '#f472b6', isTarget: true }, { text: '6', color: '#4ade80', isTarget: false }, { text: '⭐', color: '#fbbf24', isTarget: false }, { text: '9', color: '#38bdf8', isTarget: false }] },
  { prompt: "Letter 'D' (Avoid 'B')", text: 'D', matchWords: ['d', 'dee', 'letter d'], targetColor: '#f87171', items: [{ text: 'D', color: '#f87171', isTarget: true }, { text: 'B', color: '#38bdf8', isTarget: false }, { text: 'P', color: '#fbbf24', isTarget: false }, { text: 'q', color: '#c084fc', isTarget: false }] },
  { prompt: "Letter 'b' (Avoid 'd')", text: 'b', matchWords: ['b', 'bee', 'letter b'], targetColor: '#fbbf24', items: [{ text: 'b', color: '#fbbf24', isTarget: true }, { text: 'd', color: '#f87171', isTarget: false }, { text: 'p', color: '#4ade80', isTarget: false }, { text: 'A', color: '#38bdf8', isTarget: false }] },
  { prompt: "Letter 'S' (Avoid '5')", text: 'S', matchWords: ['s', 'ess', 'letter s'], targetColor: '#4ade80', items: [{ text: 'S', color: '#4ade80', isTarget: true }, { text: '5', color: '#fbbf24', isTarget: false }, { text: 'Z', color: '#f87171', isTarget: false }, { text: '8', color: '#38bdf8', isTarget: false }] },
];

const CANV_W = 820;
const CANV_H = 450;

const BalloonPopRAN = ({ onComplete }) => {
  const { currentUser } = useAuth();
  const gameWrapperRef = useRef(null);
  const canvasRef = useRef(null);
  const animRef = useRef(null);

  const [phase, setPhase] = useState('start'); // start | playing | gameover
  const [lives, setLives] = useState(3);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [level, setLevel] = useState(1);
  const [targetCount, setTargetCount] = useState(0);
  const [currentHurdle, setCurrentHurdle] = useState(TARGET_POOL[0]);

  const [isFullView, setIsFullView] = useState(false);
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [gateStartTime, setGateStartTime] = useState(0);
  const [latencies, setLatencies] = useState([]);
  const [lastLatencyMs, setLastLatencyMs] = useState(null);
  const [sparkyMsg, setSparkyMsg] = useState('Tap target balloons or speak item names out loud! 🎈');

  const gameRef = useRef({
    balloons: [],
    particles: [],
    burstRings: [],
    cloudsFar: [
      { x: 30, y: 50, speed: 0.15, size: 35 },
      { x: 380, y: 70, speed: 0.2, size: 45 },
      { x: 680, y: 40, speed: 0.18, size: 40 }
    ],
    cloudsNear: [
      { x: 120, y: 110, speed: 0.45, size: 55 },
      { x: 520, y: 130, speed: 0.5, size: 65 }
    ],
    birds: [
      { x: 200, y: 90, speed: 0.6, yOffset: 0 },
      { x: 230, y: 105, speed: 0.6, yOffset: 3 }
    ],
    popTexts: []
  });

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

  // ── ENDLESS TARGET GENERATOR & SPAWN ──
  const spawnNextTarget = useCallback((currentLevel) => {
    const poolSlice = TARGET_POOL.slice(0, Math.min(TARGET_POOL.length, currentLevel * 3 + 2));
    const randomHurdle = poolSlice[Math.floor(Math.random() * poolSlice.length)];
    setCurrentHurdle(randomHurdle);

    // Shuffle items so target spawns in a different random lane every turn!
    const shuffledItems = [...randomHurdle.items].sort(() => Math.random() - 0.5);
    const laneWidth = CANV_W / shuffledItems.length;
    const baseFloatSpeed = 1.1 + (currentLevel - 1) * 0.18;

    const balloons = shuffledItems.map((item, i) => ({
      id: i,
      seed: Math.random() * 100,
      text: item.text,
      color: item.color,
      isTarget: item.isTarget,
      isBonus: item.isBonus || false,
      isWrong: false, // Track wrong popped state so balloon stays showing!
      x: laneWidth * i + laneWidth / 2 + (Math.random() * 16 - 8),
      y: CANV_H + 30 + (i * 35),
      baseX: laneWidth * i + laneWidth / 2,
      vy: baseFloatSpeed + Math.random() * 0.3,
      radius: item.text.length > 3 ? 38 : 32,
      wobble: 0
    }));

    gameRef.current.balloons = balloons;
    setGateStartTime(Date.now());
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
          if (currentHurdle.matchWords.some(w => transcript.includes(w))) {
            handlePopTargetBalloon('vocal');
            break;
          }
        }
      };

      rec.onerror = () => setIsVoiceActive(false);
      rec.onend = () => { if (phase === 'playing' && isVoiceActive) try { rec.start(); } catch (e) {} };
      recognitionRef.current = rec;
    }
  }, [currentHurdle, isVoiceActive, phase]);

  const toggleSpeechRecognition = () => {
    if (!recognitionRef.current) return;
    if (!isVoiceActive) {
      try {
        recognitionRef.current.start();
        setIsVoiceActive(true);
        setSparkyMsg('🎙️ Mic Active! Speak balloon target names clearly!');
        speakHumanText('Microphone active! Speak the balloon target out loud!');
      } catch (e) {}
    } else {
      try {
        recognitionRef.current.stop();
        setIsVoiceActive(false);
        setSparkyMsg('Voice recognition paused.');
      } catch (e) {}
    }
  };

  // ── GAME OVER & ANALYTICS REPORT ──
  const handleGameOver = useCallback((finalScore, finalLatencies) => {
    playSFX('game_over');
    setPhase('gameover');

    const validLatencies = finalLatencies.filter(l => l > 0);
    const avgLatency = validLatencies.length > 0
      ? Math.round(validLatencies.reduce((a, b) => a + b, 0) / validLatencies.length)
      : 360;

    const stats = {
      score: finalScore,
      avgLatencyMs: avgLatency,
      levelReached: level,
      timestamp: Date.now()
    };

    try {
      localStorage.setItem('lexiflow_session_history_ran', JSON.stringify(stats));
      window.dispatchEvent(new Event('therapy_progress_updated'));
    } catch (e) {}

    saveTherapyProgress(currentUser, 'naming', finalScore, 100, `Avg Latency: ${avgLatency}ms (Lvl ${level})`);
  }, [currentUser, level]);

  // ── POP TARGET BALLOON (Combo Reward + Level Progression) ──
  const handlePopTargetBalloon = useCallback((inputType = 'tactile') => {
    const g = gameRef.current;
    const targetB = g.balloons.find(b => b.isTarget);
    if (!targetB) return;

    const latency = Math.max(140, Date.now() - gateStartTime);
    setLastLatencyMs(latency);
    const updatedLatencies = [...latencies, latency];
    setLatencies(updatedLatencies);
    playSFX('pop');

    // Explosive Confetti Shards & Particles
    for (let i = 0; i < 28; i++) {
      const angle = Math.random() * Math.PI * 2;
      const spd = 2.5 + Math.random() * 5.5;
      g.particles.push({
        x: targetB.x,
        y: targetB.y,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd,
        color: targetB.color,
        size: 4 + Math.random() * 4,
        rot: Math.random() * Math.PI * 2,
        vrot: (Math.random() - 0.5) * 0.3,
        alpha: 1
      });
    }

    // Radial Burst Shockwave Ring
    g.burstRings.push({
      x: targetB.x,
      y: targetB.y,
      radius: targetB.radius * 0.4,
      maxRadius: targetB.radius * 2.2,
      alpha: 1,
      color: targetB.color
    });

    const xpEarned = latency < 800 ? 50 : 30;
    const newScore = score + xpEarned;
    const newStreak = streak + 1;
    const newTargetCount = targetCount + 1;
    const newLevel = Math.floor(newTargetCount / 3) + 1;

    setScore(newScore);
    setStreak(newStreak);
    setTargetCount(newTargetCount);
    setLevel(newLevel);

    // ── 3-COMBO LIFE REWARD (Reward +1 Life for every 3 consecutive correct pops!) ──
    let comboMsg = '';
    if (newStreak % 3 === 0) {
      playSFX('combo_reward');
      setLives(prevLives => Math.min(5, prevLives + 1));
      g.popTexts.push({ text: '🔥 3-COMBO! +1 LIFE ❤️', x: targetB.x, y: targetB.y - 20, alpha: 1 });
      comboMsg = ' 🔥 3-COMBO REWARD! +1 LIFE ❤️';
      speakHumanText(`Awesome combo! Plus one life!`);
    } else {
      g.popTexts.push({ text: `+${xpEarned} XP!`, x: targetB.x, y: targetB.y, alpha: 1 });
      speakHumanText(`Great pop! ${currentHurdle.prompt}!`);
    }

    let speedRating = '⚡ TURBO!';
    if (latency < 600) speedRating = '⚡ TURBO SPEED (<600ms)!';
    else if (latency < 1000) speedRating = '🔥 NITRO REFLEX!';
    else speedRating = '👍 GREAT RECOGNITION!';

    const inputTag = inputType === 'vocal' ? '🎙️ Voice' : '🎈 Tap';
    setSparkyMsg(`POP! ${speedRating} (${latency}ms) [${inputTag}]${comboMsg}`);

    // Clear balloons and spawn next continuous target
    g.balloons = [];
    setTimeout(() => {
      spawnNextTarget(newLevel);
    }, 380);
  }, [currentHurdle.prompt, gateStartTime, latencies, score, spawnNextTarget, streak, targetCount]);

  // ── POP WRONG BALLOON (Keep Showing Balloon + Red X + Deduct 1 Life) ──
  const handlePopWrongBalloon = useCallback((wrongBalloon) => {
    if (wrongBalloon.isWrong) return; // Prevent double clicking same wrong balloon

    const g = gameRef.current;
    playSFX('wrong_pop');

    // Red Shard Confetti Particles
    for (let i = 0; i < 24; i++) {
      const angle = Math.random() * Math.PI * 2;
      const spd = 2 + Math.random() * 5;
      g.particles.push({
        x: wrongBalloon.x,
        y: wrongBalloon.y,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd,
        color: '#f87171',
        size: 4 + Math.random() * 3,
        rot: Math.random() * Math.PI * 2,
        vrot: (Math.random() - 0.5) * 0.3,
        alpha: 1
      });
    }

    // KEEP THE WRONG BALLOON VISIBLE! Mark it with isWrong = true and wobble physics
    wrongBalloon.isWrong = true;
    wrongBalloon.wobble = 25;

    g.popTexts.push({ text: 'WRONG! -1 LIFE 💔', x: wrongBalloon.x, y: wrongBalloon.y, alpha: 1 });

    // Reset streak and deduct 1 Life using functional update
    setStreak(0);
    setLives(prevLives => {
      const nextLives = Math.max(0, prevLives - 1);
      if (nextLives <= 0) {
        setTimeout(() => handleGameOver(score, latencies), 350);
      }
      return nextLives;
    });

    setSparkyMsg(`🤖 SPARKY: "Ouch! Popped [${wrongBalloon.text}]! -1 Life 💔 (Target is [${currentHurdle.prompt}])!"`);
    speakHumanText(`Ouch! That's ${wrongBalloon.text}. Minus one life! Target is ${currentHurdle.prompt}`);
  }, [currentHurdle.prompt, handleGameOver, latencies, score]);

  // ── UNIFIED POINTER / TOUCH / CLICK HANDLER FOR MAXIMUM POPPING ACCURACY ──
  const handleCanvasPointerDown = (e) => {
    if (phase !== 'playing' || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const clientX = e.clientX ?? (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
    const clientY = e.clientY ?? (e.touches && e.touches[0] ? e.touches[0].clientY : 0);

    const clickX = (clientX - rect.left) * (CANV_W / rect.width);
    const clickY = (clientY - rect.top) * (CANV_H / rect.height);

    const g = gameRef.current;
    
    // Find closest balloon to click coordinate
    let clickedB = null;
    let minDist = Infinity;

    g.balloons.forEach(b => {
      const dist = Math.hypot(b.x - clickX, b.y - clickY);
      if (dist < minDist) {
        minDist = dist;
        clickedB = b;
      }
    });

    // Generous Hit Target (55px hit radius tolerance for 100% accurate clicks)
    const hitTolerance = clickedB ? Math.max(55, clickedB.radius * 1.65) : 55;

    if (clickedB && minDist <= hitTolerance) {
      if (clickedB.isTarget) {
        handlePopTargetBalloon('tactile');
      } else if (clickedB.isBonus) {
        playSFX('bonus');
        setScore(s => s + 50);
        g.popTexts.push({ text: 'BONUS +50 XP! ✨', x: clickedB.x, y: clickedB.y, alpha: 1 });
        g.balloons = g.balloons.filter(b => b.id !== clickedB.id);
      } else {
        // Pop Wrong Balloon (Keep showing it on screen with Red X + Deduct 1 Life!)
        handlePopWrongBalloon(clickedB);
      }
    }
  };

  // ── 60FPS PARALLAX SKY & DYNAMIC BALLOON PHYSICS LOOP ──
  useEffect(() => {
    if (phase !== 'playing') {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const loop = (timestamp) => {
      const g = gameRef.current;
      const timeSec = timestamp * 0.001;

      // 1. Sky Gradient (#0284c7 -> #38bdf8 -> #7dd3fc -> #e0f2fe)
      const skyGrad = ctx.createLinearGradient(0, 0, 0, CANV_H);
      skyGrad.addColorStop(0, '#0284c7');
      skyGrad.addColorStop(0.35, '#38bdf8');
      skyGrad.addColorStop(0.7, '#7dd3fc');
      skyGrad.addColorStop(1, '#e0f2fe');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, CANV_W, CANV_H);

      // Layer 1: Distant Horizon Hills
      ctx.fillStyle = 'rgba(2, 132, 199, 0.25)';
      ctx.beginPath();
      ctx.moveTo(0, CANV_H);
      ctx.quadraticCurveTo(CANV_W * 0.25, CANV_H - 45, CANV_W * 0.5, CANV_H - 25);
      ctx.quadraticCurveTo(CANV_W * 0.75, CANV_H - 10, CANV_W, CANV_H - 35);
      ctx.lineTo(CANV_W, CANV_H);
      ctx.closePath();
      ctx.fill();

      // Layer 1.5: Birds Silhouette
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.lineWidth = 1.5;
      g.birds.forEach(b => {
        b.x = (b.x + b.speed) % (CANV_W + 40);
        const by = b.y + Math.sin(timeSec * 3 + b.yOffset) * 4;
        ctx.beginPath();
        ctx.arc(b.x, by, 6, Math.PI * 1.1, Math.PI * 1.9);
        ctx.arc(b.x + 10, by, 6, Math.PI * 1.1, Math.PI * 1.9);
        ctx.stroke();
      });

      // Layer 2: Parallax Clouds
      ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
      g.cloudsFar.forEach(c => {
        c.x += c.speed;
        if (c.x > CANV_W + 80) c.x = -80;
        ctx.beginPath();
        ctx.arc(c.x, c.y, c.size, 0, Math.PI * 2);
        ctx.arc(c.x + c.size * 0.5, c.y - c.size * 0.28, c.size * 0.65, 0, Math.PI * 2);
        ctx.arc(c.x + c.size * 0.95, c.y, c.size * 0.55, 0, Math.PI * 2);
        ctx.fill();
      });

      ctx.fillStyle = 'rgba(255, 255, 255, 0.88)';
      g.cloudsNear.forEach(c => {
        c.x += c.speed;
        if (c.x > CANV_W + 100) c.x = -100;
        ctx.beginPath();
        ctx.arc(c.x, c.y, c.size, 0, Math.PI * 2);
        ctx.arc(c.x + c.size * 0.55, c.y - c.size * 0.32, c.size * 0.72, 0, Math.PI * 2);
        ctx.arc(c.x + c.size * 1.05, c.y, c.size * 0.58, 0, Math.PI * 2);
        ctx.fill();
      });

      // 3. Render 3D Glossy Balloons with Flying Upward Physics & Idle Sway
      g.balloons.forEach(b => {
        const floatSpeed = typeof b.vy === 'number' && isFinite(b.vy) ? b.vy : 1.3;
        b.y -= floatSpeed;

        if (b.y < -60) {
          b.y = CANV_H + 50;
          b.baseX = Math.random() * (CANV_W - 140) + 70;
        }

        if (b.wobble > 0) b.wobble = Math.max(0, b.wobble - 0.8);
        const wobbleVal = Math.max(0, b.wobble || 0);

        const safeBaseX = typeof b.baseX === 'number' && isFinite(b.baseX) ? b.baseX : (CANV_W / 2);
        const safeY = typeof b.y === 'number' && isFinite(b.y) ? b.y : 210;
        const safeRadius = typeof b.radius === 'number' && isFinite(b.radius) ? Math.max(5, b.radius) : 32;

        const idleSway = Math.sin(timeSec * 2.5 + (b.seed || 0)) * 14 + Math.sin(wobbleVal) * wobbleVal;

        const bx = safeBaseX + idleSway;
        const by = safeY;
        b.x = bx;

        // Waving String Physics Curve
        const stringWave1 = Math.sin(timeSec * 3.5 + (b.seed || 0)) * 10;
        const stringWave2 = Math.cos(timeSec * 2.8 + (b.seed || 0)) * 14;
        ctx.strokeStyle = b.isWrong ? 'rgba(239, 68, 68, 0.75)' : 'rgba(255, 255, 255, 0.75)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(bx, by + safeRadius);
        ctx.bezierCurveTo(
          bx + stringWave1, by + safeRadius + 15,
          bx + stringWave2, by + safeRadius + 30,
          bx + stringWave1 * 0.5, by + safeRadius + 45
        );
        ctx.stroke();

        // Balloon Tie Knot
        ctx.fillStyle = b.isWrong ? '#ef4444' : (b.color || '#38bdf8');
        ctx.beginPath();
        ctx.arc(bx, by + safeRadius + 2, 4.5, 0, Math.PI * 2);
        ctx.fill();

        // 3D Spherical Radial Gradient Body
        const balloonColor = b.isWrong ? '#ef4444' : (b.color || '#38bdf8');
        const radGrad = ctx.createRadialGradient(
          bx - safeRadius * 0.35, by - safeRadius * 0.35, Math.max(0.1, safeRadius * 0.08),
          bx, by, safeRadius
        );
        radGrad.addColorStop(0, '#ffffff');
        radGrad.addColorStop(0.28, balloonColor);
        radGrad.addColorStop(0.85, balloonColor);
        radGrad.addColorStop(1, '#0f172a');

        ctx.shadowColor = b.isWrong ? '#ef4444' : (b.isTarget ? '#fbbf24' : balloonColor);
        ctx.shadowBlur = b.isWrong ? 28 : (b.isTarget ? 24 : 10);
        ctx.fillStyle = radGrad;
        ctx.beginPath();
        ctx.arc(bx, by, safeRadius, 0, Math.PI * 2);
        ctx.fill();

        // Specular Glare Highlight (Top-Left Offset)
        ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
        ctx.beginPath();
        ctx.ellipse(bx - safeRadius * 0.35, by - safeRadius * 0.35, safeRadius * 0.24, safeRadius * 0.14, -Math.PI / 4, 0, Math.PI * 2);
        ctx.fill();

        // Lexend Label Text
        ctx.fillStyle = '#ffffff';
        ctx.font = `900 ${safeRadius * 0.52}px "Lexend", sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        ctx.strokeStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.lineWidth = 3.5;
        ctx.strokeText(b.text || '', bx, by);
        ctx.fillText(b.text || '', bx, by);

        // ❌ Render Red Cross Mark on Wrong Balloon so it stays showing!
        if (b.isWrong) {
          ctx.strokeStyle = '#dc2626';
          ctx.lineWidth = 5;
          ctx.beginPath();
          ctx.moveTo(bx - safeRadius * 0.5, by - safeRadius * 0.5);
          ctx.lineTo(bx + safeRadius * 0.5, by + safeRadius * 0.5);
          ctx.moveTo(bx + safeRadius * 0.5, by - safeRadius * 0.5);
          ctx.lineTo(bx - safeRadius * 0.5, by + safeRadius * 0.5);
          ctx.stroke();
        }
      });

      // 4. Confetti Particles
      if (g.particles.length > 0) {
        g.particles = g.particles.filter(p => p.alpha > 0.05);
        g.particles.forEach(p => {
          p.x += p.vx;
          p.y += p.vy;
          p.vy += 0.15;
          p.rot += p.vrot;
          p.alpha -= 0.028;

          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          ctx.fillStyle = p.color;
          ctx.globalAlpha = Math.max(0, p.alpha);
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
          ctx.restore();
        });
        ctx.globalAlpha = 1;
      }

      // Expanding Shockwave Burst Rings
      if (g.burstRings.length > 0) {
        g.burstRings = g.burstRings.filter(r => r.alpha > 0.05);
        g.burstRings.forEach(r => {
          r.radius += 2.5;
          r.alpha -= 0.045;
          ctx.strokeStyle = r.color;
          ctx.globalAlpha = Math.max(0, r.alpha);
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
          ctx.stroke();
        });
        ctx.globalAlpha = 1;
      }

      // Ascending XP Stardust & Life Text
      if (g.popTexts.length > 0) {
        g.popTexts = g.popTexts.filter(pt => pt.alpha > 0.05);
        g.popTexts.forEach(pt => {
          pt.y -= 0.95;
          pt.alpha -= 0.025;
          ctx.fillStyle = pt.text.includes('WRONG') ? `rgba(248, 113, 113, ${pt.alpha})` : `rgba(251, 191, 36, ${pt.alpha})`;
          ctx.font = '900 19px "Lexend", sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(pt.text, pt.x, pt.y);
        });
      }

      animRef.current = requestAnimationFrame(loop);
    };

    animRef.current = requestAnimationFrame(loop);
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, [phase]);

  // Start Survival Game
  const startSurvivalGame = () => {
    setLives(3);
    setScore(0);
    setStreak(0);
    setLevel(1);
    setTargetCount(0);
    setLatencies([]);
    setLastLatencyMs(null);
    setPhase('playing');
    setSparkyMsg('Target Balloon: Pop the correct item out loud or tap it! 🎈');
    speakHumanText('Get ready! Tap or speak the target balloon!');
    spawnNextTarget(1);
  };

  // ── START SCREEN ──
  if (phase === 'start') {
    return (
      <div className="bpr-container">
        <div className="bpr-start-card">
          <div className="bpr-start-icon">🎈 🌤️ ❤️</div>
          <h1 className="bpr-start-title">BALLOON POP: VISUAL ATTENTION CHALLENGE</h1>
          <p className="bpr-start-desc">
            Balloons fly upward across the sky! Tap target balloons or speak item names into your mic!
            <br /><br />
            ❤️ <strong>3 Lives System</strong>: Popping wrong balloons costs 1 Life!
            <br />🔥 <strong>3-Combo Reward</strong>: 3 correct pops in a row rewards +1 Life!
            <br />⚡ <strong>Scaling Difficulty</strong>: Floating speed & letter decoys increase as you advance!
          </p>

          <button className="bpr-start-btn" onClick={startSurvivalGame}>
            🎈 START SURVIVAL RUN
          </button>
        </div>
      </div>
    );
  }

  // ── GAME OVER / SURVIVAL RESULT SCREEN ──
  if (phase === 'gameover') {
    const validLatencies = latencies.filter(l => l > 0);
    const avgLatency = validLatencies.length > 0
      ? Math.round(validLatencies.reduce((a, b) => a + b, 0) / validLatencies.length)
      : 360;
    const fastestLatency = validLatencies.length > 0 ? Math.min(...validLatencies) : 290;
    const starCount = score > 300 ? 3 : score > 150 ? 2 : 1;

    return (
      <div className="bpr-container">
        <div className="bpr-complete-card">
          <div className="bpr-star-rating">
            <span className={`star ${starCount >= 1 ? 'gold' : ''}`}>⭐</span>
            <span className={`star ${starCount >= 2 ? 'gold' : ''}`}>⭐</span>
            <span className={`star ${starCount >= 3 ? 'gold' : ''}`}>⭐</span>
          </div>

          <h2 className="bpr-complete-title">
            {starCount === 3 ? '⚡ VISUAL ATTENTION CHAMPION!' : '🎈 CHALLENGE COMPLETE!'}
          </h2>

          <p className="bpr-complete-sub">
            🤖 SPARKY: "Great effort! You reached <strong>Level {level}</strong> and earned <strong>{score} XP</strong>!"
          </p>

          <div className="bpr-stats-grid">
            <div className="bpr-stat-box">
              <small>Level Reached</small>
              <div className="stat-val" style={{ color: '#fbbf24' }}>Lvl {level}</div>
            </div>
            <div className="bpr-stat-box">
              <small>Peak Speed</small>
              <div className="stat-val" style={{ color: '#4ade80' }}>{fastestLatency} ms</div>
            </div>
            <div className="bpr-stat-box">
              <small>Total Score</small>
              <div className="stat-val" style={{ color: '#38bdf8' }}>{score} XP</div>
            </div>
          </div>

          <div className="bpr-complete-btns">
            <button className="bpr-btn-again" onClick={startSurvivalGame}>🔄 PLAY AGAIN</button>
            <button className="bpr-btn-hq" onClick={onComplete}>MISSION HQ 🏠</button>
          </div>
        </div>
      </div>
    );
  }

  // ── PLAYING SCREEN (ARCADE HUD + SUNNY SKY CANVAS) ──
  return (
    <div ref={gameWrapperRef} className={`bpr-container ${isFullView ? 'bpr-fullscreen' : ''}`}>
      {/* Arcade HUD Header with Lives, Streak & Level */}
      <header className="bpr-hud">
        <div className="bpr-hud-title">
          <span>🎈</span> BALLOON POP CHALLENGE
        </div>

        <div className="bpr-hud-stats">
          <VoiceSelectorChip />
          
          {/* 3 Lives Counter */}
          <div className="bpr-lives-pill">
            {Array.from({ length: 5 }).map((_, i) => (
              <span key={i} className={`heart ${i < lives ? 'active' : 'lost'}`}>❤️</span>
            ))}
          </div>

          {/* Streak Combo Pill */}
          <div className="bpr-stat-pill combo">
            🔥 Combo: {streak}
          </div>

          {/* Level Indicator */}
          <div className="bpr-stat-pill level">
            🏆 Lvl {level}
          </div>

          <div className="bpr-stat-pill score">
            ⭐ {score} XP
          </div>

          <button className={`bpr-mic-btn ${isVoiceActive ? 'active' : ''}`} onClick={toggleSpeechRecognition}>
            {isVoiceActive ? '🎙️ Mic ON' : '🎤 Voice Trigger'}
          </button>
        </div>
      </header>

      {/* Mascot Sparky Speech Target Banner */}
      <div className="bpr-target-banner">
        <div className="bpr-target-mascot">🦉</div>
        <div>
          <small className="uppercase text-slate-300 font-extrabold tracking-wide text-xs">🤖 SPARKY: "TARGET BALLOON TO POP:"</small>
          <div className="bpr-target-word" style={{ color: currentHurdle.targetColor }}>{currentHurdle.prompt}</div>
        </div>
        <button 
          className="ml-2 px-3.5 py-1.5 bg-cyan-500/20 border border-cyan-400/40 rounded-full text-cyan-300 font-bold text-xs hover:bg-cyan-500/30 transition-all flex items-center gap-1.5"
          onClick={() => speakHumanText(`Target balloon to pop: ${currentHurdle.prompt}`)}
        >
          🔊 Hear Target
        </button>
        <div className="bpr-hurdle-counter ml-auto">
          Targets Popped: {targetCount}
        </div>
      </div>

      {/* 60FPS Parallax Sky Canvas Viewport */}
      <div className="bpr-canvas-viewport relative w-full flex justify-center">
        <canvas ref={canvasRef} width={CANV_W} height={CANV_H} onPointerDown={handleCanvasPointerDown} className="cursor-pointer rounded-2xl border-4 border-cyan-400/40 shadow-2xl block bg-sky-400 touch-none select-none" />
      </div>

      {/* Arcade Footer Controls & Sparky Hint */}
      <footer className="bpr-footer">
        <button className="bpr-fullview-btn" onClick={toggleFullView}>
          {isFullView ? '↙ Exit Fullscreen' : '🎮 Full View'}
        </button>

        <div className="bpr-quick-fire-btn" onClick={() => handlePopTargetBalloon('tactile')}>
          🎈 POP TARGET BALLOON [{currentHurdle.text}]
        </div>

        <div className="bpr-sparky-hint">
          🤖 SPARKY: "{sparkyMsg}"
        </div>
      </footer>
    </div>
  );
};

export default BalloonPopRAN;


