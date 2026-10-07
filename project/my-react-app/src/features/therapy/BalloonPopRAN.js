import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../auth/AuthContext';
import { saveTherapyProgress } from './ExerciseSystem';
import { speakHumanText } from './humanVoiceEngine';
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

const BalloonPopRAN = ({
  onComplete,
  assessmentMode = false,
  targetCount: assessmentTargetCount = 6,
  onAutoFinish,
  onExit
}) => {
  const { currentUser } = useAuth();
  const gameWrapperRef = useRef(null);
  const canvasRef = useRef(null);
  const animRef = useRef(null);

  const [phase, setPhase] = useState(assessmentMode ? 'playing' : 'start'); // start | playing | gameover
  const [lives, setLives] = useState(3);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [level, setLevel] = useState(1);
  const [targetCount, setTargetCount] = useState(0);
  const [currentHurdle, setCurrentHurdle] = useState(TARGET_POOL[0]);

  const [gateStartTime, setGateStartTime] = useState(0);
  const [latencies, setLatencies] = useState([]);
  const [lastLatencyMs, setLastLatencyMs] = useState(null);

  // Micro-interaction Screen Edge Flashes
  const [successFlash, setSuccessFlash] = useState(false);
  const [errorFlash, setErrorFlash] = useState(false);

  // Assessment mode tracking
  const assessmentCompletedRef = useRef(false);

  const gameRef = useRef({
    balloons: [],
    particles: [],
    burstRings: [],
    cloudsFar: [
      { x: 30, y: 50, speed: 0.15, size: 40 },
      { x: 420, y: 80, speed: 0.2, size: 50 },
      { x: 780, y: 45, speed: 0.18, size: 45 }
    ],
    cloudsNear: [
      { x: 140, y: 120, speed: 0.45, size: 60 },
      { x: 620, y: 150, speed: 0.5, size: 70 }
    ],
    birds: [
      { x: 200, y: 90, speed: 0.6, yOffset: 0 },
      { x: 230, y: 105, speed: 0.6, yOffset: 3 }
    ],
    popTexts: []
  });

  // ── RESPONSIVE DYNAMIC CANVAS RESIZE HOOK ──
  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current && gameWrapperRef.current) {
        const rect = gameWrapperRef.current.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          canvasRef.current.width = rect.width;
          canvasRef.current.height = rect.height;
        }
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    const t1 = setTimeout(handleResize, 100);
    const t2 = setTimeout(handleResize, 300);

    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [phase]);

  // ── ENDLESS TARGET GENERATOR & SPAWN ──
  const spawnNextTarget = useCallback((currentLevel) => {
    const poolSlice = TARGET_POOL.slice(0, Math.min(TARGET_POOL.length, currentLevel * 3 + 2));
    const randomHurdle = poolSlice[Math.floor(Math.random() * poolSlice.length)];
    setCurrentHurdle(randomHurdle);

    const canvW = canvasRef.current ? canvasRef.current.width : 1000;
    const canvH = canvasRef.current ? canvasRef.current.height : 600;

    // Shuffle items so target spawns in a different random lane every turn
    const shuffledItems = [...randomHurdle.items].sort(() => Math.random() - 0.5);
    const laneWidth = canvW / shuffledItems.length;
    const baseFloatSpeed = 1.2 + (currentLevel - 1) * 0.18;

    const balloons = shuffledItems.map((item, i) => ({
      id: i,
      seed: Math.random() * 100,
      text: item.text,
      color: item.color,
      isTarget: item.isTarget,
      isBonus: item.isBonus || false,
      isWrong: false,
      x: laneWidth * i + laneWidth / 2 + (Math.random() * 20 - 10),
      y: canvH + 40 + (i * 40),
      baseX: laneWidth * i + laneWidth / 2,
      vy: baseFloatSpeed + Math.random() * 0.35,
      radius: item.text.length > 3 ? 42 : 36,
      wobble: 0
    }));

    gameRef.current.balloons = balloons;
    setGateStartTime(Date.now());
  }, []);

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

  // ── POP TARGET BALLOON (Confetti + XP Stardust + Screen Glow) ──
  const handlePopTargetBalloon = useCallback(() => {
    const g = gameRef.current;
    const targetB = g.balloons.find(b => b.isTarget);
    if (!targetB) return;

    const latency = Math.max(140, Date.now() - gateStartTime);
    setLastLatencyMs(latency);
    const updatedLatencies = [...latencies, latency];
    setLatencies(updatedLatencies);
    playSFX('pop');

    // Trigger Screen Edge Success Glow
    setSuccessFlash(true);
    setTimeout(() => setSuccessFlash(false), 450);

    // Instant Confetti Burst
    for (let i = 0; i < 28; i++) {
      const angle = Math.random() * Math.PI * 2;
      const spd = 3 + Math.random() * 6;
      g.particles.push({
        x: targetB.x,
        y: targetB.y,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd,
        color: targetB.color,
        size: 5 + Math.random() * 5,
        rot: Math.random() * Math.PI * 2,
        vrot: (Math.random() - 0.5) * 0.35,
        alpha: 1
      });
    }

    // Radial Burst Shockwave Ring
    g.burstRings.push({
      x: targetB.x,
      y: targetB.y,
      radius: targetB.radius * 0.4,
      maxRadius: targetB.radius * 2.4,
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

    // Floating XP Stardust Text Pill
    g.popTexts.push({
      text: `+${xpEarned} XP • ${latency}ms!`,
      x: targetB.x,
      y: targetB.y,
      alpha: 1
    });

    // ── DEFINED SESSION BENCHMARK (WIN CONDITION) ──
    const TARGET_WAVE_CAP = 3;
    const TARGET_CAPTURE_CAP = 10;

    // ── ASSESSMENT MODE: Fire onAutoFinish when target count reached ──
    if (assessmentMode && onAutoFinish && newTargetCount >= assessmentTargetCount && !assessmentCompletedRef.current) {
      assessmentCompletedRef.current = true;
      const validLatencies = [...latencies, latency];
      const avgLat = validLatencies.length > 0
        ? Math.round(validLatencies.reduce((a, b) => a + b, 0) / validLatencies.length)
        : 360;
      setTimeout(() => {
        onAutoFinish({
          accuracy: Math.round((newTargetCount / Math.max(1, newTargetCount)) * 100),
          latencyMs: avgLat,
          errorCount: 0,
          errorTypes: [],
          score: newScore
        });
      }, 300);
      return;
    }

    // ── STANDARD ARCADE PLAY MODE: End session & show success summary modal when benchmark is reached ──
    if (!assessmentMode && (newTargetCount >= TARGET_CAPTURE_CAP || newLevel > TARGET_WAVE_CAP)) {
      setTimeout(() => {
        handleGameOver(newScore, updatedLatencies);
      }, 400);
      return;
    }

    // 3-Combo Life Reward
    if (newStreak % 3 === 0) {
      playSFX('combo_reward');
      setLives(prevLives => Math.min(5, prevLives + 1));
      g.popTexts.push({ text: '🔥 3-COMBO! +1 LIFE ❤️', x: targetB.x, y: targetB.y - 24, alpha: 1 });
      speakHumanText(`Awesome combo! Plus one life!`);
    } else {
      speakHumanText(`Great pop! ${currentHurdle.prompt}!`);
    }

    // Clear balloons and spawn next continuous target
    g.balloons = [];
    setTimeout(() => {
      spawnNextTarget(newLevel);
    }, 380);
  }, [assessmentMode, assessmentTargetCount, currentHurdle.prompt, gateStartTime, handleGameOver, latencies, onAutoFinish, score, spawnNextTarget, streak, targetCount]);

  // ── POP WRONG BALLOON (Amber Screen Wobble + Deduct Life) ──
  const handlePopWrongBalloon = useCallback((wrongBalloon) => {
    if (wrongBalloon.isWrong) return;

    const g = gameRef.current;
    playSFX('wrong_pop');

    // Screen Edge Error Glow
    setErrorFlash(true);
    setTimeout(() => setErrorFlash(false), 450);

    // Red Shard Confetti Particles
    for (let i = 0; i < 24; i++) {
      const angle = Math.random() * Math.PI * 2;
      const spd = 2.5 + Math.random() * 5.5;
      g.particles.push({
        x: wrongBalloon.x,
        y: wrongBalloon.y,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd,
        color: '#f87171',
        size: 5 + Math.random() * 4,
        rot: Math.random() * Math.PI * 2,
        vrot: (Math.random() - 0.5) * 0.3,
        alpha: 1
      });
    }

    wrongBalloon.isWrong = true;
    wrongBalloon.wobble = 25;

    g.popTexts.push({ text: 'WRONG! -1 LIFE 💔', x: wrongBalloon.x, y: wrongBalloon.y, alpha: 1 });

    setStreak(0);
    setLives(prevLives => {
      const nextLives = Math.max(0, prevLives - 1);
      if (nextLives <= 0) {
        setTimeout(() => handleGameOver(score, latencies), 350);
      }
      return nextLives;
    });

    speakHumanText(`Ouch! That's ${wrongBalloon.text}. Target is ${currentHurdle.prompt}`);
  }, [currentHurdle.prompt, handleGameOver, latencies, score]);

  // ── UNIFIED POINTER / TOUCH / CLICK HANDLER ──
  const handleCanvasPointerDown = (e) => {
    if (phase !== 'playing' || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const clientX = e.clientX ?? (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
    const clientY = e.clientY ?? (e.touches && e.touches[0] ? e.touches[0].clientY : 0);

    const canvW = canvasRef.current.width;
    const canvH = canvasRef.current.height;

    const clickX = (clientX - rect.left) * (canvW / rect.width);
    const clickY = (clientY - rect.top) * (canvH / rect.height);

    const g = gameRef.current;
    let clickedB = null;
    let minDist = Infinity;

    g.balloons.forEach(b => {
      const dist = Math.hypot(b.x - clickX, b.y - clickY);
      if (dist < minDist) {
        minDist = dist;
        clickedB = b;
      }
    });

    const hitTolerance = clickedB ? Math.max(65, clickedB.radius * 1.8) : 65;

    if (clickedB && minDist <= hitTolerance) {
      if (clickedB.isTarget) {
        handlePopTargetBalloon();
      } else if (clickedB.isBonus) {
        playSFX('bonus');
        setScore(s => s + 50);
        g.popTexts.push({ text: 'BONUS +50 XP! ✨', x: clickedB.x, y: clickedB.y, alpha: 1 });
        g.balloons = g.balloons.filter(b => b.id !== clickedB.id);
      } else {
        handlePopWrongBalloon(clickedB);
      }
    }
  };

  // ── 60FPS FULL-BLEED SKY CANVAS RENDER LOOP ──
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

      const canvW = canvas.width || 1000;
      const canvH = canvas.height || 600;

      // 1. Dynamic Parallax Sky Canvas Background
      const skyGrad = ctx.createLinearGradient(0, 0, 0, canvH);
      skyGrad.addColorStop(0, '#0284c7');
      skyGrad.addColorStop(0.35, '#38bdf8');
      skyGrad.addColorStop(0.7, '#7dd3fc');
      skyGrad.addColorStop(1, '#e0f2fe');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, canvW, canvH);

      // Layer 1: Distant Horizon Hills
      ctx.fillStyle = 'rgba(2, 132, 199, 0.22)';
      ctx.beginPath();
      ctx.moveTo(0, canvH);
      ctx.quadraticCurveTo(canvW * 0.25, canvH - 60, canvW * 0.5, canvH - 35);
      ctx.quadraticCurveTo(canvW * 0.75, canvH - 15, canvW, canvH - 45);
      ctx.lineTo(canvW, canvH);
      ctx.closePath();
      ctx.fill();

      // Birds Silhouette
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
      ctx.lineWidth = 2;
      g.birds.forEach(b => {
        b.x = (b.x + b.speed) % (canvW + 50);
        const by = b.y + Math.sin(timeSec * 3 + b.yOffset) * 5;
        ctx.beginPath();
        ctx.arc(b.x, by, 7, Math.PI * 1.1, Math.PI * 1.9);
        ctx.arc(b.x + 11, by, 7, Math.PI * 1.1, Math.PI * 1.9);
        ctx.stroke();
      });

      // Layer 2: Parallax Clouds
      ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
      g.cloudsFar.forEach(c => {
        c.x += c.speed;
        if (c.x > canvW + 90) c.x = -90;
        ctx.beginPath();
        ctx.arc(c.x, c.y, c.size, 0, Math.PI * 2);
        ctx.arc(c.x + c.size * 0.5, c.y - c.size * 0.28, c.size * 0.65, 0, Math.PI * 2);
        ctx.arc(c.x + c.size * 0.95, c.y, c.size * 0.55, 0, Math.PI * 2);
        ctx.fill();
      });

      ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
      g.cloudsNear.forEach(c => {
        c.x += c.speed;
        if (c.x > canvW + 110) c.x = -110;
        ctx.beginPath();
        ctx.arc(c.x, c.y, c.size, 0, Math.PI * 2);
        ctx.arc(c.x + c.size * 0.55, c.y - c.size * 0.32, c.size * 0.72, 0, Math.PI * 2);
        ctx.arc(c.x + c.size * 1.05, c.y, c.size * 0.58, 0, Math.PI * 2);
        ctx.fill();
      });

      // 3. Render 3D Glossy Balloons with Physics & Target Harmonic Shimmer
      g.balloons.forEach(b => {
        const floatSpeed = typeof b.vy === 'number' && isFinite(b.vy) ? b.vy : 1.3;
        b.y -= floatSpeed;

        if (b.y < -70) {
          b.y = canvH + 60;
          b.baseX = Math.random() * (canvW - 160) + 80;
        }

        if (b.wobble > 0) b.wobble = Math.max(0, b.wobble - 0.8);
        const wobbleVal = Math.max(0, b.wobble || 0);

        const safeBaseX = typeof b.baseX === 'number' && isFinite(b.baseX) ? b.baseX : (canvW / 2);
        const safeY = typeof b.y === 'number' && isFinite(b.y) ? b.y : 300;
        const safeRadius = typeof b.radius === 'number' && isFinite(b.radius) ? Math.max(5, b.radius) : 36;

        // Soft bobbing/floating physics with string sway
        const idleSway = Math.sin(timeSec * 2.5 + (b.seed || 0)) * 16 + Math.sin(wobbleVal) * wobbleVal;
        const bx = safeBaseX + idleSway;
        const by = safeY;
        b.x = bx;

        // Waving String Physics Curve
        const stringWave1 = Math.sin(timeSec * 3.5 + (b.seed || 0)) * 12;
        const stringWave2 = Math.cos(timeSec * 2.8 + (b.seed || 0)) * 16;
        ctx.strokeStyle = b.isWrong ? 'rgba(239, 68, 68, 0.85)' : 'rgba(255, 255, 255, 0.85)';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(bx, by + safeRadius);
        ctx.bezierCurveTo(
          bx + stringWave1, by + safeRadius + 18,
          bx + stringWave2, by + safeRadius + 36,
          bx + stringWave1 * 0.5, by + safeRadius + 52
        );
        ctx.stroke();

        // Balloon Tie Knot
        ctx.fillStyle = b.isWrong ? '#ef4444' : (b.color || '#38bdf8');
        ctx.beginPath();
        ctx.arc(bx, by + safeRadius + 2, 5, 0, Math.PI * 2);
        ctx.fill();

        // Target Harmonic Shimmer / Radiant Glow Ring
        if (b.isTarget) {
          const shimmer = Math.sin(timeSec * 5) * 6;
          ctx.shadowColor = '#fbbf24';
          ctx.shadowBlur = 24 + shimmer;

          ctx.strokeStyle = `rgba(251, 191, 36, ${0.45 + Math.sin(timeSec * 6) * 0.35})`;
          ctx.lineWidth = 3.5;
          ctx.beginPath();
          ctx.arc(bx, by, safeRadius + 7 + Math.sin(timeSec * 4) * 2, 0, Math.PI * 2);
          ctx.stroke();
        } else {
          ctx.shadowColor = b.isWrong ? '#ef4444' : (b.color || '#38bdf8');
          ctx.shadowBlur = b.isWrong ? 28 : 10;
        }

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

        ctx.fillStyle = radGrad;
        ctx.beginPath();
        ctx.arc(bx, by, safeRadius, 0, Math.PI * 2);
        ctx.fill();

        // Specular Glare Highlight
        ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.beginPath();
        ctx.ellipse(bx - safeRadius * 0.35, by - safeRadius * 0.35, safeRadius * 0.25, safeRadius * 0.15, -Math.PI / 4, 0, Math.PI * 2);
        ctx.fill();

        // High-Contrast Solid White Text Label with Heavy Dark Outlines
        ctx.fillStyle = '#ffffff';
        ctx.font = `900 ${safeRadius * 0.54}px "Lexend", sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        ctx.strokeStyle = 'rgba(15, 23, 42, 0.95)';
        ctx.lineWidth = 4.5;
        ctx.strokeText(b.text || '', bx, by);
        ctx.fillText(b.text || '', bx, by);

        // Red Cross Mark on Wrong Balloon
        if (b.isWrong) {
          ctx.strokeStyle = '#dc2626';
          ctx.lineWidth = 6;
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
          p.vy += 0.16;
          p.rot += p.vrot;
          p.alpha -= 0.026;

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
          r.radius += 2.8;
          r.alpha -= 0.045;
          ctx.strokeStyle = r.color;
          ctx.globalAlpha = Math.max(0, r.alpha);
          ctx.lineWidth = 3.5;
          ctx.beginPath();
          ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
          ctx.stroke();
        });
        ctx.globalAlpha = 1;
      }

      // Ascending XP Stardust Text
      if (g.popTexts.length > 0) {
        g.popTexts = g.popTexts.filter(pt => pt.alpha > 0.05);
        g.popTexts.forEach(pt => {
          pt.y -= 1.1;
          pt.alpha -= 0.024;
          ctx.fillStyle = pt.text.includes('WRONG') ? `rgba(248, 113, 113, ${pt.alpha})` : `rgba(251, 191, 36, ${pt.alpha})`;
          ctx.font = '900 20px "Lexend", sans-serif';
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
    speakHumanText('Get ready! Tap the target balloon!');
    spawnNextTarget(1);
  };

  // Auto-start in assessment mode
  useEffect(() => {
    if (assessmentMode && phase === 'playing' && gameRef.current.balloons.length === 0) {
      spawnNextTarget(1);
    }
  }, [assessmentMode, phase, spawnNextTarget]);

  // ── START SCREEN ──
  if (phase === 'start') {
    return (
      <div className="bpr-game-wrapper flex items-center justify-center p-6">
        <div className="bpr-start-card">
          <div className="bpr-start-icon">🎈 🌤️ ❤️</div>
          <h1 className="bpr-start-title">BALLOON POP: VISUAL ATTENTION CHALLENGE</h1>
          <p className="bpr-start-desc">
            Balloons fly upward across the sky! Tap target balloons out loud or with touch/click!
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

  // ── GAME OVER SCREEN ──
  if (phase === 'gameover') {
    const validLatencies = latencies.filter(l => l > 0);
    const fastestLatency = validLatencies.length > 0 ? Math.min(...validLatencies) : 290;
    const starCount = score > 300 ? 3 : score > 150 ? 2 : 1;

    return (
      <div className="bpr-game-wrapper flex items-center justify-center p-6">
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

  // ── PLAYING SCREEN: FULL-BLEED CANVAS WITH STYLED FLOATING GLASSMORPHIC OVERLAY ──
  return (
    <div ref={gameWrapperRef} className="bpr-game-wrapper">
      {/* ── SCREEN EDGE FLASH OVERLAYS ── */}
      {successFlash && <div className="bpr-flash-overlay success" />}
      {errorFlash && <div className="bpr-flash-overlay error" />}

      {/* ── FLOATING TOP GLASSMORPHIC HUD OVERLAY ── */}
      <div className="bpr-floating-hud-top">
        {/* Left: Streak & Lives */}
        <div className="bpr-glass-card">
          <div className="bpr-heart-pool">
            {Array.from({ length: 3 }).map((_, i) => (i < lives ? '❤️' : '🖤'))}
          </div>
          <div className="bpr-hud-divider" />
          <div className="bpr-streak-badge">
            <span>🔥</span>
            <span>{streak} Streak</span>
          </div>
        </div>

        {/* Center: Target Prompt Badge */}
        <div className="bpr-target-prompt-card">
          <span className="bpr-target-label">Target:</span>
          <span className="bpr-target-word">{currentHurdle.prompt}</span>
          <button
            onClick={() => speakHumanText(`Target balloon to pop: ${currentHurdle.prompt}`)}
            className="bpr-replay-btn"
          >
            <span>🔊</span>
            <span>Replay</span>
          </button>
        </div>

        {/* Right: Targets Popped Counter */}
        <div className="bpr-popped-counter">
          🎯 {targetCount} / {assessmentMode ? assessmentTargetCount : 6} Popped
        </div>
      </div>

      {/* ── 100% FULL-BLEED CANVAS BACKDROP VIEWPORT ── */}
      <div className="bpr-canvas-viewport">
        <canvas
          ref={canvasRef}
          onPointerDown={handleCanvasPointerDown}
        />
      </div>

      {/* ── FLOATING BOTTOM TELEMETRY STRIP ── */}
      <div className="bpr-floating-hud-bottom">
        <div className="bpr-latency-card">
          <span>⚡</span>
          <span>Latency:</span>
          <strong style={{ color: '#ffffff' }}>{lastLatencyMs ? `${lastLatencyMs}ms` : '---'}</strong>
          <span style={{ color: '#94a3b8' }}>
            ({lastLatencyMs ? (lastLatencyMs < 600 ? 'Optimal' : 'Good') : 'Waiting'})
          </span>
        </div>

        <button
          onClick={onExit || onComplete || (() => window.history.back())}
          className="bpr-exit-screening-btn"
        >
          ✕ Exit Screening
        </button>
      </div>
    </div>
  );
};

export default BalloonPopRAN;
