import React, { useState, useEffect, useRef, useCallback } from 'react';
import { saveTherapyProgress } from './ExerciseSystem';

// ----------------------------------------------------------------------
// WEB AUDIO API SYNTHESIZER (ZERO EXTERNAL ASSETS)
// ----------------------------------------------------------------------
class ArcadeSoundEngine {
  constructor() {
    this.ctx = null;
  }

  init() {
    if (!this.ctx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        this.ctx = new AudioContextClass();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // Success: Rising Major Third Chime (C5 -> E5 -> G5)
  playSuccessChime() {
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.08);

      gain.gain.setValueAtTime(0, now + idx * 0.08);
      gain.gain.linearRampToValueAtTime(0.18, now + idx * 0.08 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.25);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now + idx * 0.08);
      osc.stop(now + idx * 0.08 + 0.3);
    });
  }

  // Combo 3X Fanfare: Energetic 4-note chord
  playComboChime() {
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.06);

      gain.gain.setValueAtTime(0.2, now + idx * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.35);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now + idx * 0.06);
      osc.stop(now + idx * 0.06 + 0.4);
    });
  }

  // Soft Fail: Educational horizontal flip wobble chime
  playSoftFailWobble() {
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.linearRampToValueAtTime(220, now + 0.15);
    osc.frequency.linearRampToValueAtTime(340, now + 0.3);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.35);
  }

  // Hard Fail / Heart Lost: Low descending buzz
  playHeartLostSound() {
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(90, now + 0.3);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.35);
  }

  // Wave Completed Fanfare
  playWaveCompleteChime() {
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const arpeggio = [440, 554.37, 659.25, 880]; // A4, C#5, E5, A5
    arpeggio.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.08);

      gain.gain.setValueAtTime(0, now + i * 0.08);
      gain.gain.linearRampToValueAtTime(0.2, now + i * 0.08 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.4);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now + i * 0.08);
      osc.stop(now + i * 0.08 + 0.45);
    });
  }
}

const audioSynth = new ArcadeSoundEngine();

// ----------------------------------------------------------------------
// TARGET & REVERSAL PAIRS DEFINITIONS
// ----------------------------------------------------------------------
const PAIR_SETS = [
  { target: 'b', decoy: 'd', hint: 'Find target stem-left letter "b"', spatialType: 'ascender-left' },
  { target: 'p', decoy: 'q', hint: 'Find target descender-left letter "p"', spatialType: 'descender-left' },
  { target: 'm', decoy: 'w', hint: 'Find target arch-up letter "m"', spatialType: 'arch-up' },
  { target: 'n', decoy: 'u', hint: 'Find target arch-top letter "n"', spatialType: 'arch-top' }
];

export default function MirrorMatchHighway({ onComplete }) {
  // Game loop & engine state
  const [currentWave, setCurrentWave] = useState(1);
  const [waveTargetsCleared, setWaveTargetsCleared] = useState(0);
  const [waveResting, setWaveResting] = useState(false);
  const [hearts, setHearts] = useState(3);
  const [comboStreak, setComboStreak] = useState(0);
  const [showComboBanner, setShowComboBanner] = useState(false);
  const [score, setScore] = useState(0);
  const [totalAttempts, setTotalAttempts] = useState(0);
  const [correctHits, setCorrectHits] = useState(0);
  const [gameEnded, setGameEnded] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Active Target Specification
  const [currentPairIndex, setCurrentPairIndex] = useState(0);
  const activePair = PAIR_SETS[currentPairIndex % PAIR_SETS.length];

  // Scanner Reticle Position (0 to 100%)
  const [reticleX, setReticleX] = useState(50);
  const [isTargetInRange, setIsTargetInRange] = useState(false);

  // Letter Nodes on Reading Highway
  // Node: { id, char, isTarget, x, speed, isFlipping: false, isTagged: false }
  const [letters, setLetters] = useState([]);

  // Sparks & Particle Explosions
  const [particles, setParticles] = useState([]);
  
  // Telemetry timing tracking
  const spawnTimesRef = useRef({});
  const latenciesRef = useRef([]);

  // Canvas ref for cosmic starfield backdrop
  const backdropCanvasRef = useRef(null);
  const containerRef = useRef(null);

  // ----------------------------------------------------------------------
  // 1. STARFIELD CANVAS BACKDROP
  // ----------------------------------------------------------------------
  useEffect(() => {
    const canvas = backdropCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    const resizeCanvas = () => {
      if (!canvas.parentElement) return;
      canvas.width = canvas.parentElement.clientWidth;
      canvas.height = canvas.parentElement.clientHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Create persistent starfield
    const numStars = 70;
    const stars = Array.from({ length: numStars }, () => ({
      x: Math.random() * (canvas.width || 800),
      y: Math.random() * (canvas.height || 500),
      radius: Math.random() * 1.8 + 0.5,
      alpha: Math.random() * 0.8 + 0.2,
      speed: Math.random() * 0.4 + 0.1,
      twinkleSpeed: Math.random() * 0.02 + 0.005
    }));

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Cosmic gradient fill
      const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
      grad.addColorStop(0, '#060817');
      grad.addColorStop(0.5, '#0b102b');
      grad.addColorStop(1, '#050714');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Render stars & horizontal drift
      stars.forEach(star => {
        star.alpha += Math.sin(Date.now() * star.twinkleSpeed) * 0.015;
        star.x -= star.speed;
        if (star.x < 0) star.x = canvas.width;

        ctx.beginPath();
        ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(186, 230, 253, ${Math.max(0.1, Math.min(1, star.alpha))})`;
        ctx.shadowColor = '#00f2fe';
        ctx.shadowBlur = star.radius > 1.2 ? 6 : 0;
        ctx.fill();
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  // ----------------------------------------------------------------------
  // 2. LETTER SPAWNER & HIGHWAY DRIFT ENGINE
  // ----------------------------------------------------------------------
  const spawnLetter = useCallback(() => {
    if (waveResting || gameEnded) return;

    const currentPair = PAIR_SETS[currentPairIndex % PAIR_SETS.length];
    // 50% chance for target, 50% chance for mirrored decoy
    const isTarget = Math.random() > 0.45;
    const char = isTarget ? currentPair.target : currentPair.decoy;
    
    // Speed increases slightly with waves
    const baseSpeed = 0.22 + currentWave * 0.04;
    const id = Date.now() + Math.random().toString(36).substr(2, 5);

    spawnTimesRef.current[id] = Date.now();

    setLetters(prev => {
      // Keep maximum 6 letters on highway at once to avoid crowding
      if (prev.length >= 6) return prev;
      return [
        ...prev,
        {
          id,
          char,
          isTarget,
          x: 105, // Starts just off-screen right
          speed: baseSpeed,
          isFlipping: false,
          hasSoftFailed: false,
          isTagged: false
        }
      ];
    });
  }, [currentPairIndex, currentWave, waveResting, gameEnded]);

  // Initial and periodic spawn
  useEffect(() => {
    if (gameEnded || waveResting) return;

    const interval = setInterval(() => {
      spawnLetter();
    }, Math.max(1400, 2600 - currentWave * 200));

    return () => clearInterval(interval);
  }, [spawnLetter, gameEnded, waveResting, currentWave]);

  // Main Drift Loop (60 FPS tick)
  useEffect(() => {
    if (gameEnded || waveResting) return;

    const animFrame = requestAnimationFrame(() => {
      setLetters(prev =>
        prev
          .map(letNode => ({
            ...letNode,
            x: letNode.x - letNode.speed
          }))
          .filter(letNode => letNode.x > -15) // Remove offscreen left
      );
    });

    return () => cancelAnimationFrame(animFrame);
  }, [letters, gameEnded, waveResting]);

  // Check if any active letter is inside the scanner reticle zone
  useEffect(() => {
    const targetNode = letters.find(
      l => !l.isTagged && Math.abs(l.x - reticleX) < 5.5
    );
    setIsTargetInRange(!!targetNode);
  }, [letters, reticleX]);

  // ----------------------------------------------------------------------
  // 3. RETICLE ACTION & LOCK MECHANIC
  // ----------------------------------------------------------------------
  const handleTagAction = useCallback(() => {
    if (gameEnded || waveResting) return;

    audioSynth.init();

    // Find letter closest to reticle
    const candidateIndex = letters.findIndex(
      l => !l.isTagged && Math.abs(l.x - reticleX) < 7.5
    );

    setTotalAttempts(prev => prev + 1);

    if (candidateIndex === -1) {
      // Missed completely (tagged empty space)
      audioSynth.playHeartLostSound();
      setComboStreak(0);
      return;
    }

    const candidate = letters[candidateIndex];
    const spawnTime = spawnTimesRef.current[candidate.id];
    if (spawnTime) {
      const latency = Date.now() - spawnTime;
      latenciesRef.current.push(latency);
    }

    if (candidate.isTarget) {
      // === SUCCESSFUL TARGET LOCK ===
      audioSynth.playSuccessChime();
      
      // Award XP & Hit Count
      setScore(prev => prev + 25);
      setCorrectHits(prev => prev + 1);
      
      const newStreak = comboStreak + 1;
      setComboStreak(newStreak);

      // Trigger 3X Combo Recovery
      if (newStreak > 0 && newStreak % 3 === 0) {
        audioSynth.playComboChime();
        setShowComboBanner(true);
        setHearts(prev => Math.min(3, prev + 1));
        setTimeout(() => setShowComboBanner(false), 2200);
      }

      // Explode particle ring on target position
      createStarburstParticles(candidate.x);

      // Remove / Tag candidate letter
      setLetters(prev => prev.filter(l => l.id !== candidate.id));

      // Advance Wave Progress
      const nextCleared = waveTargetsCleared + 1;
      setWaveTargetsCleared(nextCleared);

      if (nextCleared >= 4) {
        triggerWaveAdvance();
      }
    } else {
      // === DECOY TAGGED (MIRROR REVERSAL FAIL) ===
      if (!candidate.hasSoftFailed) {
        // --- SOFT FAIL MECHANIC ---
        // Demonstrate 180° horizontal flip in place without deducting heart
        audioSynth.playSoftFailWobble();

        setLetters(prev =>
          prev.map((l, idx) =>
            idx === candidateIndex
              ? { ...l, isFlipping: true, hasSoftFailed: true }
              : l
          )
        );

        // Reset flipping flag after animation completes
        setTimeout(() => {
          setLetters(prev =>
            prev.map((l, idx) =>
              idx === candidateIndex ? { ...l, isFlipping: false } : l
            )
          );
        }, 700);
      } else {
        // --- SECOND MISS ON SAME DECOY / HARD FAIL ---
        audioSynth.playHeartLostSound();
        setComboStreak(0);

        setHearts(prev => {
          const nextHearts = prev - 1;
          if (nextHearts <= 0) {
            triggerGameOver();
          }
          return Math.max(0, nextHearts);
        });

        // Remove decoy
        setLetters(prev => prev.filter(l => l.id !== candidate.id));
      }
    }
  }, [
    gameEnded,
    waveResting,
    letters,
    reticleX,
    comboStreak,
    waveTargetsCleared
  ]);

  // Particles generator
  const createStarburstParticles = (xPercent) => {
    const newParticles = Array.from({ length: 14 }, (_, i) => ({
      id: Math.random(),
      x: xPercent,
      y: 50,
      vx: (Math.random() - 0.5) * 8,
      vy: (Math.random() - 0.5) * 8,
      scale: Math.random() * 0.8 + 0.6,
      color: ['#ffd700', '#00f2fe', '#f43f5e', '#a855f7'][i % 4]
    }));

    setParticles(prev => [...prev, ...newParticles]);

    setTimeout(() => {
      setParticles(prev => prev.filter(p => !newParticles.includes(p)));
    }, 800);
  };

  // ----------------------------------------------------------------------
  // 4. WAVE PROGRESSION & REST CHECKPOINTS
  // ----------------------------------------------------------------------
  const triggerWaveAdvance = () => {
    audioSynth.playWaveCompleteChime();
    setWaveResting(true);
    setWaveTargetsCleared(0);

    setTimeout(() => {
      setWaveResting(false);
      setCurrentWave(prev => prev + 1);
      setCurrentPairIndex(prev => prev + 1);
    }, 3200);
  };

  // ----------------------------------------------------------------------
  // 5. GAME OVER & TELEMETRY PERSISTENCE
  // ----------------------------------------------------------------------
  const triggerGameOver = useCallback(() => {
    setGameEnded(true);

    const total = totalAttempts > 0 ? totalAttempts : 1;
    const accuracy = Math.round((correctHits / total) * 100);
    const avgLatency =
      latenciesRef.current.length > 0
        ? Math.round(
            latenciesRef.current.reduce((a, b) => a + b, 0) /
              latenciesRef.current.length
          )
        : 450;

    const sessionData = {
      timestamp: new Date().toISOString(),
      score,
      correctHits,
      totalAttempts,
      accuracy,
      avgLatencyMs: avgLatency,
      waveReached: currentWave,
      module: 'Visual Tracking (MirrorMatch Highway)'
    };

    // Save to localStorage telemetry as requested in specifications
    try {
      localStorage.setItem(
        'lexiflow_session_history_visual',
        JSON.stringify(sessionData)
      );
      window.dispatchEvent(new Event('therapy_progress_updated'));
    } catch (e) {
      console.warn('Telemetry save error:', e);
    }
  }, [totalAttempts, correctHits, score, currentWave]);

  // ----------------------------------------------------------------------
  // 6. KEYBOARD CONTROLS (LAPTOP-FIRST ERGONOMICS)
  // ----------------------------------------------------------------------
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (gameEnded || waveResting) return;

      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        e.preventDefault();
        setReticleX(prev => Math.max(8, prev - 4.5));
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        e.preventDefault();
        setReticleX(prev => Math.min(92, prev + 4.5));
      } else if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        handleTagAction();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleTagAction, gameEnded, waveResting]);

  // Toggle Fullscreen Mode
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(err => {
        console.warn('Fullscreen request failed:', err);
      });
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const restartGame = () => {
    setHearts(3);
    setScore(0);
    setComboStreak(0);
    setCurrentWave(1);
    setWaveTargetsCleared(0);
    setTotalAttempts(0);
    setCorrectHits(0);
    setLetters([]);
    setGameEnded(false);
    setWaveResting(false);
    latenciesRef.current = [];
  };

  return (
    <div
      ref={containerRef}
      className={`relative w-full overflow-hidden select-none font-sans rounded-3xl border-2 border-cyan-500/30 shadow-2xl transition-all duration-300 ${
        isFullscreen ? 'h-screen w-screen rounded-none' : 'h-[620px]'
      }`}
      style={{
        background: 'radial-gradient(ellipse at center, #0f172a 0%, #060814 100%)'
      }}
    >
      {/* Embedded Custom Keyframe Animations */}
      <style>{`
        @keyframes reticlePulse {
          0%, 100% { box-shadow: 0 0 15px #00f2fe, inset 0 0 10px #00f2fe; }
          50% { box-shadow: 0 0 28px #00f2fe, inset 0 0 18px #00f2fe; }
        }
        @keyframes targetSnapGlow {
          0%, 100% { box-shadow: 0 0 25px #ffaa00, inset 0 0 15px #ffaa00; }
          50% { box-shadow: 0 0 45px #ffd700, inset 0 0 25px #ffd700; }
        }
        @keyframes flipWobble {
          0% { transform: scaleX(1) rotate(0deg); }
          50% { transform: scaleX(-1) rotate(180deg); color: #f43f5e; }
          100% { transform: scaleX(1) rotate(360deg); }
        }
        @keyframes stardustDrift {
          0% { transform: translateX(0); }
          100% { transform: translateX(-100%); }
        }
        @keyframes bannerPop {
          0% { transform: scale(0.5) translateY(-20px); opacity: 0; }
          70% { transform: scale(1.1) translateY(0); opacity: 1; }
          100% { transform: scale(1) translateY(0); opacity: 1; }
        }
      `}</style>

      {/* ------------------------------------------------------------------ */}
      {/* PARALLAX STARFIELD CANVAS BACKDROP */}
      {/* ------------------------------------------------------------------ */}
      <canvas
        ref={backdropCanvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
      />

      {/* ------------------------------------------------------------------ */}
      {/* RETRO ARCADE TOP HUD BAR */}
      {/* ------------------------------------------------------------------ */}
      <div className="absolute top-4 left-4 right-4 z-20 flex flex-wrap items-center justify-between gap-3 px-6 py-3 bg-slate-900/80 backdrop-blur-md rounded-2xl border border-cyan-500/30 shadow-lg">
        {/* Pixel Hearts Pool */}
        <div className="flex items-center gap-2">
          <span className="text-xs uppercase tracking-widest text-cyan-400 font-bold mr-1">
            Lives:
          </span>
          {[1, 2, 3].map(h => (
            <span
              key={h}
              className={`text-2xl transition-all duration-300 transform ${
                h <= hearts ? 'scale-110 opacity-100 drop-shadow-[0_0_8px_#f43f5e]' : 'scale-90 opacity-20 blur-[1px]'
              }`}
            >
              ❤️
            </span>
          ))}
        </div>

        {/* Current Target Prompt Banner */}
        <div className="flex items-center gap-3 bg-cyan-950/60 px-4 py-1.5 rounded-xl border border-cyan-400/40">
          <span className="text-xs text-slate-300 font-semibold">TARGET:</span>
          <span className="text-2xl font-extrabold text-cyan-300 font-mono tracking-wider drop-shadow-[0_0_10px_#00f2fe]">
            "{activePair.target}"
          </span>
          <span className="text-xs text-rose-400/80 font-medium">
            (Avoid "{activePair.decoy}")
          </span>
        </div>

        {/* Score & Wave Info */}
        <div className="flex items-center gap-6">
          <div className="text-right">
            <div className="text-[10px] text-cyan-300/70 font-bold uppercase tracking-wider">
              Wave
            </div>
            <div className="text-lg font-black text-amber-400 font-mono">
              WAVE {currentWave}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] text-cyan-300/70 font-bold uppercase tracking-wider">
              Score XP
            </div>
            <div className="text-xl font-black text-emerald-400 font-mono drop-shadow-[0_0_8px_#10b981]">
              +{score} XP
            </div>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* 3X COMBO RECOVERY NEON BANNER */}
      {/* ------------------------------------------------------------------ */}
      {showComboBanner && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-30 pointer-events-none animate-[bannerPop_0.4s_ease-out]">
          <div className="px-8 py-3 bg-gradient-to-r from-amber-500 via-rose-500 to-purple-600 rounded-full border-2 border-yellow-300 shadow-[0_0_35px_rgba(245,158,11,0.8)] text-white font-black text-xl tracking-wider uppercase flex items-center gap-3">
            <span>🔥 3X COMBO!</span>
            <span className="bg-white/20 px-3 py-0.5 rounded-full text-yellow-200 text-sm">
              +1 HEART RESTORED ❤️
            </span>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* WAVE REST CHECKPOINT BANNER */}
      {/* ------------------------------------------------------------------ */}
      {waveResting && (
        <div className="absolute inset-0 z-40 bg-slate-950/80 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-[fadeInUp_0.4s_ease-out]">
          <div className="text-5xl mb-4 animate-bounce">🚀</div>
          <h2 className="text-3xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-teal-300 to-emerald-400 mb-2 drop-shadow-[0_0_20px_rgba(6,182,212,0.5)]">
            WAVE COMPLETED!
          </h2>
          <p className="text-cyan-200 text-lg font-semibold mb-6 max-w-md">
            Rest your eyes for 3 seconds before the next reading line starts.
          </p>
          <div className="w-64 h-3 bg-slate-800 rounded-full overflow-hidden border border-cyan-500/40">
            <div className="h-full bg-gradient-to-r from-cyan-400 to-emerald-400 animate-[stardustDrift_3s_linear_infinite]" />
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* MAIN "COSMIC READING HIGHWAY" TRACK */}
      {/* ------------------------------------------------------------------ */}
      <div className="absolute top-1/2 left-0 right-0 -translate-y-1/2 h-44 z-10">
        {/* Highway Bed & Guide Rails */}
        <div className="relative w-full h-full bg-gradient-to-r from-slate-950/90 via-indigo-950/80 to-slate-950/90 border-y-4 border-cyan-400/60 shadow-[0_0_30px_rgba(6,182,212,0.3)]">
          {/* Cyan Guide Rail Glow Lines */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_10px_#00f2fe]" />
          <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_10px_#00f2fe]" />

          {/* Reading Line Center Saccade Guide Track */}
          <div className="absolute top-1/2 left-0 right-0 h-[1px] border-b border-dashed border-cyan-400/30" />

          {/* -------------------------------------------------------------- */}
          {/* SCANNER LENS RETICLE */}
          {/* -------------------------------------------------------------- */}
          <div
            className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-24 h-32 rounded-2xl transition-all duration-75 pointer-events-none ${
              isTargetInRange
                ? 'border-2 border-amber-400 animate-[targetSnapGlow_1s_infinite]'
                : 'border-2 border-cyan-400 animate-[reticlePulse_2s_infinite]'
            }`}
            style={{ left: `${reticleX}%` }}
          >
            {/* Corner Brackets */}
            <div className="absolute top-1 left-1 w-3 h-3 border-t-2 border-l-2 border-current" />
            <div className="absolute top-1 right-1 w-3 h-3 border-t-2 border-r-2 border-current" />
            <div className="absolute bottom-1 left-1 w-3 h-3 border-b-2 border-l-2 border-current" />
            <div className="absolute bottom-1 right-1 w-3 h-3 border-b-2 border-r-2 border-current" />

            {/* Central Crosshair */}
            <div className="absolute inset-0 flex items-center justify-center opacity-40">
              <div className="w-full h-[1px] bg-current" />
              <div className="h-full w-[1px] bg-current absolute" />
            </div>

            {/* Reticle Lock Status Indicator */}
            <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] font-black tracking-widest uppercase px-2 py-0.5 rounded-full bg-slate-900/90 border border-current text-current shadow-md">
              {isTargetInRange ? 'TARGET LOCK' : 'SCANNING'}
            </div>
          </div>

          {/* -------------------------------------------------------------- */}
          {/* DRIFTING LETTER BADGES ON HEXAGONAL NEON PLATES */}
          {/* -------------------------------------------------------------- */}
          {letters.map(letNode => {
            return (
              <div
                key={letNode.id}
                className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 transition-transform duration-300 ${
                  letNode.isFlipping ? 'animate-[flipWobble_0.7s_ease-in-out]' : ''
                }`}
                style={{ left: `${letNode.x}%` }}
              >
                {/* Neon Translucent Hexagonal Plate */}
                <div className="relative w-16 h-20 bg-slate-900/80 backdrop-blur-md border border-cyan-400/50 rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.2)] group">
                  {/* Spatial Orientation Light Anchors for Ascenders/Descenders */}
                  {letNode.char === 'b' && (
                    <div className="absolute left-2 top-2 w-1.5 h-7 bg-amber-400 rounded-full shadow-[0_0_8px_#fbbf24]" />
                  )}
                  {letNode.char === 'd' && (
                    <div className="absolute right-2 top-2 w-1.5 h-7 bg-amber-400 rounded-full shadow-[0_0_8px_#fbbf24]" />
                  )}
                  {letNode.char === 'p' && (
                    <div className="absolute left-2 bottom-2 w-1.5 h-7 bg-purple-400 rounded-full shadow-[0_0_8px_#c084fc]" />
                  )}
                  {letNode.char === 'q' && (
                    <div className="absolute right-2 bottom-2 w-1.5 h-7 bg-purple-400 rounded-full shadow-[0_0_8px_#c084fc]" />
                  )}

                  {/* Letter Typography */}
                  <span className="text-3xl font-extrabold text-white font-mono drop-shadow-[0_2px_10px_rgba(255,255,255,0.8)]">
                    {letNode.char}
                  </span>
                </div>
              </div>
            );
          })}

          {/* STARBURST PARTICLES */}
          {particles.map(p => (
            <div
              key={p.id}
              className="absolute w-3 h-3 rounded-full pointer-events-none transition-all duration-700 ease-out"
              style={{
                left: `${p.x}%`,
                top: `${p.y}%`,
                backgroundColor: p.color,
                boxShadow: `0 0 10px ${p.color}`,
                transform: `translate(${p.vx * 10}px, ${p.vy * 10}px) scale(${p.scale})`
              }}
            />
          ))}
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* TOUCH / TABLET TACTILE CONTROLS FALLBACK */}
      {/* ------------------------------------------------------------------ */}
      <div className="absolute bottom-4 left-4 right-4 z-20 flex items-center justify-between gap-4">
        {/* Fullscreen Immersion Button */}
        <button
          onClick={toggleFullscreen}
          className="px-4 py-2.5 bg-slate-900/80 hover:bg-slate-800 text-cyan-300 border border-cyan-500/40 rounded-xl font-bold text-xs backdrop-blur-md shadow-lg transition-all active:scale-95 flex items-center gap-2"
        >
          <span>🎮</span>
          <span>{isFullscreen ? 'Exit Full' : 'Full View'}</span>
        </button>

        {/* Chunky 3D Tactile Buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setReticleX(prev => Math.max(8, prev - 6))}
            className="px-5 py-3 bg-gradient-to-b from-cyan-500 to-cyan-700 active:from-cyan-600 active:to-cyan-800 text-white font-black text-sm rounded-xl border-b-4 border-cyan-900 shadow-lg active:scale-95 active:border-b-0 transition-all flex items-center gap-1.5"
          >
            <span>◀</span>
            <span>LEFT</span>
          </button>

          <button
            onClick={handleTagAction}
            className="px-8 py-3 bg-gradient-to-b from-amber-400 to-amber-600 active:from-amber-500 active:to-amber-700 text-slate-950 font-black text-sm rounded-xl border-b-4 border-amber-800 shadow-[0_0_20px_rgba(245,158,11,0.4)] active:scale-95 active:border-b-0 transition-all flex items-center gap-2"
          >
            <span>␣</span>
            <span>SPACE: LOCK</span>
          </button>

          <button
            onClick={() => setReticleX(prev => Math.min(92, prev + 6))}
            className="px-5 py-3 bg-gradient-to-b from-cyan-500 to-cyan-700 active:from-cyan-600 active:to-cyan-800 text-white font-black text-sm rounded-xl border-b-4 border-cyan-900 shadow-lg active:scale-95 active:border-b-0 transition-all flex items-center gap-1.5"
          >
            <span>RIGHT</span>
            <span>▶</span>
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* GAME OVER & ARCADE TELEMETRY SCORECARD */}
      {/* ------------------------------------------------------------------ */}
      {gameEnded && (
        <div className="absolute inset-0 z-50 bg-slate-950/95 backdrop-blur-xl flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-slate-900 border-2 border-cyan-500/50 rounded-3xl p-8 shadow-[0_0_50px_rgba(6,182,212,0.3)] text-center animate-[fadeInUp_0.4s_ease-out]">
            <div className="text-6xl mb-3">🏆</div>
            <h2 className="text-3xl font-black text-white font-mono mb-1">
              SESSION SCORECARD
            </h2>
            <p className="text-cyan-400 text-xs font-semibold uppercase tracking-wider mb-6">
              Visual Tracking & Reversal Discrimination
            </p>

            <div className="grid grid-cols-2 gap-4 mb-6 text-left">
              <div className="bg-slate-800/80 p-4 rounded-2xl border border-cyan-500/20">
                <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider block mb-1">
                  Accuracy Rate
                </span>
                <span className="text-3xl font-extrabold text-emerald-400 font-mono">
                  {totalAttempts > 0
                    ? Math.round((correctHits / totalAttempts) * 100)
                    : 100}
                  %
                </span>
              </div>

              <div className="bg-slate-800/80 p-4 rounded-2xl border border-cyan-500/20">
                <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider block mb-1">
                  Avg Latency
                </span>
                <span className="text-3xl font-extrabold text-amber-400 font-mono">
                  {latenciesRef.current.length > 0
                    ? Math.round(
                        latenciesRef.current.reduce((a, b) => a + b, 0) /
                          latenciesRef.current.length
                      )
                    : 420}
                  <span className="text-xs font-sans text-slate-400">ms</span>
                </span>
              </div>

              <div className="bg-slate-800/80 p-4 rounded-2xl border border-cyan-500/20">
                <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider block mb-1">
                  Total XP Earned
                </span>
                <span className="text-3xl font-extrabold text-cyan-300 font-mono">
                  +{score} XP
                </span>
              </div>

              <div className="bg-slate-800/80 p-4 rounded-2xl border border-cyan-500/20">
                <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider block mb-1">
                  Highest Wave
                </span>
                <span className="text-3xl font-extrabold text-purple-400 font-mono">
                  WAVE {currentWave}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <button
                onClick={restartGame}
                className="w-full py-3.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-black rounded-xl shadow-lg transition-all active:scale-95 text-sm uppercase tracking-wider"
              >
                🔄 PLAY AGAIN
              </button>

              {onComplete && (
                <button
                  onClick={onComplete}
                  className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl border border-slate-700 transition-all text-xs"
                >
                  Complete & Return to Therapy Dashboard →
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
