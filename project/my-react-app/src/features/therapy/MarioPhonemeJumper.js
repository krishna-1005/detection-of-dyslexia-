import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../auth/AuthContext';
import { saveTherapyProgress } from './ExerciseSystem';
import { speakHumanText, VoiceSelectorChip } from './humanVoiceEngine';
import './MarioPhonemeJumper.css';

// ── "SATURDAY MORNING CARTRIDGE" COLOR TOKENS ──
const PALETTE = {
  skyTop: '#5EC8F2',
  skyBottom: '#B8E8FF',
  foliageNear: '#4CB753',
  foliageFar: '#8FD97F',
  dirt: '#8B4A2B',
  dirtShadow: '#6B3419',
  gold: '#FFC93C',
  inkOutline: '#2B1B12',
  dangerSoft: '#FF6B6B',
  pipeBase: '#4CB753',
  pipeHighlight: '#A8F09B',
  pipeShadow: '#25702A',
  crawlerBase: '#D97706', crawlerTop: '#FCD34D', crawlerShadow: '#92400E',
  hopperBase: '#10B981', hopperTop: '#6EE7B7', hopperShadow: '#065F46',
  airBase: '#F59E0B', airTop: '#FDE68A', airShadow: '#B45309',
  rollerBase: '#78716C', rollerTop: '#A8A29E', rollerShadow: '#44403C'
};

// ── SFX SYNTHESIZER ENGINE ──
const playSFX = (type) => {
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.connect(g); g.connect(ctx.destination);
    const t = ctx.currentTime;

    if (type === 'jump') {
      osc.type = 'square';
      osc.frequency.setValueAtTime(160 + Math.random() * 20, t);
      osc.frequency.exponentialRampToValueAtTime(620 + Math.random() * 40, t + 0.15);
      g.gain.setValueAtTime(0.08, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
      osc.start(); osc.stop(t + 0.18);
    } else if (type === 'correct') {
      const baseF = 523 + Math.floor(Math.random() * 3) * 40;
      osc.type = 'triangle';
      [baseF, baseF * 1.25, baseF * 1.5, baseF * 2].forEach((f, i) => {
        osc.frequency.setValueAtTime(f, t + i * 0.08);
      });
      g.gain.setValueAtTime(0.14, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
      osc.start(); osc.stop(t + 0.45);
    } else if (type === 'one_up') {
      osc.type = 'triangle';
      [330, 392, 659, 523, 587, 784].forEach((f, i) => {
        osc.frequency.setValueAtTime(f, t + i * 0.08);
      });
      g.gain.setValueAtTime(0.18, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
      osc.start(); osc.stop(t + 0.6);
    } else if (type === 'star') {
      // Upbeat Super Star Power-Up Fanfare
      osc.type = 'triangle';
      [523, 659, 784, 988, 1047, 1318].forEach((f, i) => {
        osc.frequency.setValueAtTime(f, t + i * 0.06);
      });
      g.gain.setValueAtTime(0.2, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
      osc.start(); osc.stop(t + 0.5);
    } else if (type === 'wobble') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(280, t);
      osc.frequency.exponentialRampToValueAtTime(140, t + 0.18);
      g.gain.setValueAtTime(0.08, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
      osc.start(); osc.stop(t + 0.2);
    } else if (type === 'damage') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(320, t);
      osc.frequency.exponentialRampToValueAtTime(90, t + 0.3);
      g.gain.setValueAtTime(0.15, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.32);
      osc.start(); osc.stop(t + 0.32);
    } else if (type === 'game_over') {
      osc.type = 'square';
      [330, 261, 220, 196, 174, 164, 146, 130].forEach((f, i) => {
        osc.frequency.setValueAtTime(f, t + i * 0.12);
      });
      g.gain.setValueAtTime(0.16, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 1.1);
      osc.start(); osc.stop(t + 1.1);
    } else if (type === 'flagpole') {
      osc.type = 'triangle';
      [440, 554, 659, 880, 1108, 1318].forEach((f, i) => {
        osc.frequency.setValueAtTime(f, t + i * 0.1);
      });
      g.gain.setValueAtTime(0.18, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.85);
      osc.start(); osc.stop(t + 0.85);
    } else if (type === 'win') {
      osc.type = 'sine';
      [523,587,659,698,784,880,988,1047].forEach((f,i) => {
        osc.frequency.setValueAtTime(f, t + i * 0.08);
      });
      g.gain.setValueAtTime(0.12, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.75);
      osc.start(); osc.stop(t + 0.75);
    }
  } catch (e) {}
};

const speakPrompt = (text) => {
  speakHumanText(text);
};

// ── 3-ROUND WORLD LEVEL STAGES ──
const ROUND_DATA = {
  easy: {
    tierKey: 'easy',
    name: 'World 1-1: Consonants (Slow Obstacles)',
    color: '#34d399',
    levelWidth: 2800,
    pipes: [
      { x: 260, h: 70 }, { x: 740, h: 85 }, { x: 1220, h: 75 },
      { x: 1700, h: 90 }, { x: 2180, h: 80 }
    ],
    obstacles: [
      { id: 'c1', type: 'crawler', x: 420, minX: 340, maxX: 540, vx: 0.8, w: 32, h: 26, alive: true },
      { id: 'h1', type: 'hopper', x: 920, minX: 920, maxX: 920, vx: 0, w: 30, h: 28, alive: true },
      { id: 'c2', type: 'crawler', x: 1420, minX: 1320, maxX: 1540, vx: 0.9, w: 32, h: 26, alive: true },
      { id: 'a1', type: 'air', x: 1920, minX: 1840, maxX: 2020, vx: 1.1, w: 32, h: 28, alive: true }
    ],
    targets: [
      { id: 1, worldX: 480, soundLabel: 'B', prompt: 'Hit the block starting with the "B" sound!', speakPrompt: 'Find the word starting with B!', words: [{ word: 'BAT', emoji: '🦇', correct: true }, { word: 'SUN', emoji: '☀️', correct: false }] },
      { id: 2, worldX: 980, soundLabel: 'C', prompt: 'Hit the block starting with the "C" sound!', speakPrompt: 'Find the word starting with C!', words: [{ word: 'CAT', emoji: '🐱', correct: true, isExtraLife: true }, { word: 'DOG', emoji: '🐶', correct: false }] },
      { id: 3, worldX: 1480, soundLabel: 'F', prompt: 'Hit the block starting with the "F" sound!', speakPrompt: 'Find the word starting with F!', words: [{ word: 'FISH', emoji: '🐟', correct: true, isStarPower: true }, { word: 'PIG', emoji: '🐷', correct: false }] },
      { id: 4, worldX: 1980, soundLabel: 'M', prompt: 'Hit the block starting with the "M" sound!', speakPrompt: 'Find the word starting with M!', words: [{ word: 'MOON', emoji: '🌙', correct: true }, { word: 'STAR', emoji: '⭐', correct: false }] },
    ]
  },
  medium: {
    tierKey: 'medium',
    name: 'World 1-2: Vowels (3 Blocks & Faster Patrols)',
    color: '#fbbf24',
    levelWidth: 3000,
    pipes: [
      { x: 240, h: 80 }, { x: 820, h: 75 }, { x: 1420, h: 90 }, { x: 2020, h: 85 }
    ],
    obstacles: [
      { id: 'a1', type: 'air', x: 420, minX: 340, maxX: 540, vx: 1.5, w: 32, h: 28, alive: true },
      { id: 'h2', type: 'hopper', x: 1020, minX: 1020, maxX: 1020, vx: 0, w: 30, h: 28, alive: true },
      { id: 'r1', type: 'roller', x: 1620, minX: 1500, maxX: 1750, vx: 1.8, w: 34, h: 34, alive: true },
      { id: 'c3', type: 'crawler', x: 2220, minX: 2120, maxX: 2320, vx: 1.3, w: 32, h: 26, alive: true }
    ],
    targets: [
      { id: 1, worldX: 480, soundLabel: 'Short A', prompt: 'Hit the block with the short "A" sound!', speakPrompt: 'Find the word with short A sound!', words: [{ word: 'APPLE', emoji: '🍎', correct: true }, { word: 'ICE', emoji: '🧊', correct: false }, { word: 'OAK', emoji: '🌳', correct: false }] },
      { id: 2, worldX: 1080, soundLabel: 'Short O', prompt: 'Hit the block with the short "O" sound!', speakPrompt: 'Find the word with short O sound!', words: [{ word: 'FOX', emoji: '🦊', correct: true, isExtraLife: true }, { word: 'KEY', emoji: '🔑', correct: false }, { word: 'PIN', emoji: '📌', correct: false }] },
      { id: 3, worldX: 1680, soundLabel: 'Short I', prompt: 'Hit the block with the short "I" sound!', speakPrompt: 'Find the word with short I sound!', words: [{ word: 'PIG', emoji: '🐷', correct: true, isStarPower: true }, { word: 'PEN', emoji: '🖊️', correct: false }, { word: 'PAN', emoji: '🍳', correct: false }] },
      { id: 4, worldX: 2280, soundLabel: 'Short U', prompt: 'Hit the block with the short "U" sound!', speakPrompt: 'Find the word with short U sound!', words: [{ word: 'DUCK', emoji: '🦆', correct: true }, { word: 'DOG', emoji: '🐶', correct: false }, { word: 'DESK', emoji: '🪑', correct: false }] },
    ]
  },
  hard: {
    tierKey: 'hard',
    name: 'World 1-3: Tricky Blends (Nitro Speed & Drifting Blocks)',
    color: '#f87171',
    levelWidth: 2800,
    pipes: [
      { x: 260, h: 85 }, { x: 920, h: 90 }, { x: 1580, h: 80 }
    ],
    obstacles: [
      { id: 'r2', type: 'roller', x: 500, minX: 360, maxX: 680, vx: 2.2, w: 34, h: 34, alive: true },
      { id: 'a2', type: 'air', x: 1160, minX: 1040, maxX: 1280, vx: 1.8, w: 32, h: 28, alive: true },
      { id: 'h3', type: 'hopper', x: 1820, minX: 1820, maxX: 1820, vx: 0, w: 30, h: 28, alive: true }
    ],
    targets: [
      { id: 1, worldX: 540, soundLabel: 'SH', prompt: 'Hit the block with the "SH" blend!', speakPrompt: 'Find the SH blend word!', words: [{ word: 'SHIP', emoji: '🚢', correct: true }, { word: 'CHIP', emoji: '🥔', correct: false }, { word: 'SHOP', emoji: '🏪', correct: false }] },
      { id: 2, worldX: 1200, soundLabel: 'CH', prompt: 'Hit the block with the "CH" blend!', speakPrompt: 'Find the CH blend word!', words: [{ word: 'CHAIR', emoji: '🪑', correct: true, isExtraLife: true }, { word: 'SHARE', emoji: '🤝', correct: false }, { word: 'STARE', emoji: '👀', correct: false }] },
      { id: 3, worldX: 1860, soundLabel: 'TH', prompt: 'Hit the block with the "TH" blend!', speakPrompt: 'Find the TH blend word!', words: [{ word: 'THREE', emoji: '3️⃣', correct: true, isStarPower: true }, { word: 'TREE', emoji: '🌴', correct: false }, { word: 'FREE', emoji: '🆓', correct: false }] },
    ]
  }
};

const W = 800;
const H = 440;
const GROUND_Y = 370;
const GRAVITY = 0.55;
const JUMP_FORCE = -11.5;
const MOVE_SPEED = 4.8;
const FRICTION = 0.85;

const PARALLAX_CLOUDS_FAR = [
  { x: 40, y: 50, s: 1.1 },
  { x: 300, y: 75, s: 0.9 },
  { x: 580, y: 45, s: 1.2 }
];
const PARALLAX_CLOUDS_MID = [
  { x: 120, y: 95, s: 1.3 },
  { x: 440, y: 65, s: 1.1 },
  { x: 700, y: 110, s: 1.4 }
];

const MarioPhonemeJumper = ({ onComplete }) => {
  const { currentUser } = useAuth();
  const gameWrapperRef = useRef(null);
  const canvasRef = useRef(null);
  const animRef = useRef(null);

  const [phase, setPhase] = useState('start'); // start | playing | round_modal | complete | game_over
  const [difficultyTier, setDifficultyTier] = useState('easy');
  const [targetIdx, setTargetIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [displayedScore, setDisplayedScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [isFullView, setIsFullView] = useState(false);
  const [sparkyMsg, setSparkyMsg] = useState('Run forward and hit question blocks! 🎮');
  const [cameraShake, setCameraShake] = useState(false);

  // New Features State
  const [starPowerActive, setStarPowerActive] = useState(false);
  const [voiceModeActive, setVoiceModeActive] = useState(false);
  const [voiceListening, setVoiceListening] = useState(false);

  const currentData = ROUND_DATA[difficultyTier] || ROUND_DATA.easy;
  const currentTarget = currentData.targets[targetIdx % currentData.targets.length];

  const spokenTargetsRef = useRef(new Set());
  const recognitionRef = useRef(null);

  // Animated ticking score counter
  useEffect(() => {
    if (displayedScore < score) {
      const timer = setTimeout(() => setDisplayedScore(s => Math.min(score, s + 1)), 25);
      return () => clearTimeout(timer);
    }
  }, [displayedScore, score]);

  // Game Physics State Ref
  const gameRef = useRef({
    player: {
      x: 80, y: GROUND_Y - 52, width: 42, height: 52,
      vx: 0, vy: 0, grounded: true, direction: 'right', frame: 0,
      animState: 'idle',
      squashY: 1.0, squashX: 1.0,
      spinTimer: 0, spinAngle: 0,
      invincibleTimer: 0,
      starTimer: 0
    },
    blocks: [],
    obstacles: [],
    particles: [],
    hitStopFrames: 0,
    cameraX: 0,
    flagpoleReached: false,
    isDying: false
  });

  const keysRef = useRef({ left: false, right: false, jump: false });

  // ── FEATURE 2: WEB SPEECH API VOICE RECOGNITION ──
  const toggleVoiceMode = () => {
    const nextState = !voiceModeActive;
    setVoiceModeActive(nextState);

    if (nextState) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        alert('Web Speech API is not supported in this browser. Try Chrome or Edge!');
        setVoiceModeActive(false);
        return;
      }

      const recog = new SpeechRecognition();
      recog.continuous = true;
      recog.interimResults = false;
      recog.lang = 'en-US';

      recog.onstart = () => setVoiceListening(true);
      recog.onend = () => {
        if (voiceModeActive) recog.start();
        else setVoiceListening(false);
      };

      recog.onresult = (event) => {
        const lastResult = event.results[event.results.length - 1];
        if (lastResult.isFinal) {
          const spoken = lastResult[0].transcript.trim().toUpperCase();
          console.log('Voice recognized:', spoken);

          // Match spoken word with active blocks
          const g = gameRef.current;
          if (g && !g.isDying) {
            const matchIdx = g.blocks.findIndex(b => b.state === 'active' && spoken.includes(b.word));
            if (matchIdx !== -1) {
              const matchedBlock = g.blocks[matchIdx];
              g.player.x = matchedBlock.x + matchedBlock.width / 2 - g.player.width / 2;
              keysRef.current.jump = true;
              setTimeout(() => keysRef.current.jump = false, 150);
              setSparkyMsg(`🎤 Voice Matched: "${matchedBlock.word}"! JUMP! 🚀`);
              speakPrompt(`Super! ${matchedBlock.word}!`);
            }
          }
        }
      };

      recognitionRef.current = recog;
      recog.start();
    } else {
      if (recognitionRef.current) recognitionRef.current.stop();
      setVoiceListening(false);
    }
  };

  // Clean up Speech Recognition on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) recognitionRef.current.stop();
    };
  }, []);

  // ── TRIGGER DAMAGE ──
  const triggerDamage = useCallback((reason) => {
    const g = gameRef.current;
    if (!g || g.player.invincibleTimer > 0 || g.player.starTimer > 0 || g.isDying) return;

    g.player.invincibleTimer = 45;
    g.player.vx = g.player.direction === 'right' ? -5 : 5;
    g.player.vy = -3;
    playSFX('damage');

    setLives(prev => {
      const nextLives = prev - 1;
      if (nextLives <= 0) {
        g.isDying = true;
        g.player.vy = -11;
        g.player.vx = 0;
        g.player.animState = 'dying';

        playSFX('game_over');
        setSparkyMsg('💔 GAME OVER!');
        speakPrompt('Game Over!');

        setTimeout(() => {
          setPhase('game_over');
        }, 2200);
      } else {
        setSparkyMsg(`Watch out! ${reason} ❤️ ${nextLives} lives left!`);
        speakPrompt(`Watch out! ${reason}`);
      }
      return nextLives;
    });
  }, []);

  // Build All World Level Blocks
  const createWorldBlocks = useCallback((tierData) => {
    const allBlocks = [];
    tierData.targets.forEach((targetObj, tIdx) => {
      const shuffled = [...targetObj.words].sort(() => Math.random() - 0.5);
      const count = shuffled.length;
      const spacing = count === 2 ? 140 : 110;
      const startX = targetObj.worldX - (count * spacing) / 2;

      shuffled.forEach((wObj, idx) => {
        allBlocks.push({
          id: `${tIdx}-${idx}`,
          targetId: targetObj.id,
          targetIdx: tIdx,
          word: wObj.word,
          emoji: wObj.emoji,
          correct: wObj.correct,
          isExtraLife: Boolean(wObj.isExtraLife),
          isStarPower: Boolean(wObj.isStarPower),
          x: startX + idx * spacing,
          baseY: GROUND_Y - 195,
          width: 90,
          height: 72,
          state: 'active',
          impactY: 0,
          wobble: 0,
          phase: idx * 2.2,
          driftVx: (tierData.tierKey === 'hard' && idx % 2 === 1) ? 0.7 : 0
        });
      });
    });
    return allBlocks;
  }, []);

  // Fullscreen Mode
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

  // ── BLOCK HIT LOGIC (SUPER STAR POWER-UP & 1-UP MUSHROOM) ──
  const handleBlockHit = useCallback((blockIdx) => {
    const g = gameRef.current;
    if (!g || g.isDying) return;
    const block = g.blocks[blockIdx];
    if (block.state !== 'active') return;

    if (block.correct) {
      block.state = 'correct';
      block.impactY = -22;
      g.hitStopFrames = 4;
      setCameraShake(true);
      setTimeout(() => setCameraShake(false), 200);

      const cx = block.x + block.width / 2;
      const cy = block.baseY;

      // ── FEATURE 1: SUPER STAR POWER-UP BLOCK ⭐⚡ ──
      if (block.isStarPower) {
        playSFX('star');
        g.player.starTimer = 300; // 5 seconds of star power invincibility & 2x XP
        setStarPowerActive(true);
        setScore(s => s + 50);

        setSparkyMsg(`⭐ SUPER STAR POWER ACTIVE! 2X XP & INVINCIBLE! ⚡`);
        speakPrompt('Super Star Power Activated!');

        g.particles.push({
          x: cx, y: cy - 25, vx: 0, vy: -3.5,
          type: 'text', text: '⭐ STAR POWER 2X XP! ⚡', color: PALETTE.gold, life: 60
        });

      } else if (block.isExtraLife) {
        // 1-UP MUSHROOM BLOCK 🍄❤️
        playSFX('one_up');
        setLives(l => Math.min(3, l + 1));
        setScore(s => s + 50);

        setSparkyMsg(`🍄 1-UP! GREEN MUSHROOM RECOVERED +1 LIFE! ❤️`);
        speakPrompt('1-UP! Extra Heart Recovered!');

        g.particles.push({
          x: cx, y: cy - 25, vx: 0, vy: -3.5,
          type: 'text', text: '🍄 1-UP! +1 LIFE ❤️', color: '#4ade80', life: 60
        });

      } else {
        playSFX('correct');
        const xpAmount = g.player.starTimer > 0 ? 50 : 25;
        setScore(s => s + xpAmount);

        const activeTargetObj = currentData.targets[block.targetIdx];
        setSparkyMsg(`Correct! "${block.word}" starts with "${activeTargetObj.soundLabel}"! Run forward! 🏃💨`);
        speakPrompt(`Awesome! ${block.word}!`);

        g.particles.push({ x: cx, y: cy - 20, vx: 0, vy: -3, type: 'text', text: `⭐ +${xpAmount} XP`, color: PALETTE.gold, life: 50 });
      }

      g.player.animState = 'victory';
      g.player.spinTimer = 30;

      for (let i = 0; i < 16; i++) {
        const angle = Math.random() * Math.PI * 2;
        const spd = 2 + Math.random() * 4;
        g.particles.push({
          x: cx,
          y: cy,
          vx: Math.cos(angle) * spd,
          vy: Math.sin(angle) * spd - 1,
          type: 'sparkle',
          color: [PALETTE.gold, '#4ade80', '#38bdf8', '#ffffff'][Math.floor(Math.random() * 4)],
          life: 40,
          size: 3 + Math.random() * 4
        });
      }

      if (block.targetIdx + 1 < currentData.targets.length) {
        setTargetIdx(block.targetIdx + 1);
      }

    } else {
      block.state = 'wrong';
      block.wobble = 14;
      triggerDamage('Wrong block choice!');

      const cx = block.x + block.width / 2;
      for (let i = 0; i < 3; i++) {
        g.particles.push({
          x: cx + (Math.random() * 20 - 10),
          y: block.baseY - 10,
          vx: (Math.random() - 0.5) * 1.5,
          vy: -1.2 - Math.random() * 0.8,
          type: 'text',
          text: '💔 -1 Heart',
          color: '#f87171',
          life: 40
        });
      }

      setTimeout(() => {
        if (g.blocks[blockIdx]) g.blocks[blockIdx].state = 'active';
      }, 750);
    }
  }, [currentData.targets, triggerDamage]);

  // Round Complete
  const handleRoundComplete = useCallback(() => {
    playSFX('win');

    const stats = {
      round: difficultyTier,
      score,
      accuracy: 100,
      timestamp: Date.now()
    };

    try {
      localStorage.setItem('lexiflow_mario_progress', JSON.stringify(stats));
      window.dispatchEvent(new Event('therapy_progress_updated'));
    } catch (e) {}

    saveTherapyProgress(currentUser, 'phoneme', score, 100, `Round: ${difficultyTier}`);

    if (difficultyTier === 'hard') {
      setPhase('complete');
    } else {
      setPhase('round_modal');
    }
  }, [currentUser, difficultyTier, score]);

  // Start Round
  const startRound = (key) => {
    setDifficultyTier(key);
    setTargetIdx(0);
    setLives(3);
    spokenTargetsRef.current = new Set();
    const data = ROUND_DATA[key];
    const firstTarget = data.targets[0];

    gameRef.current.blocks = createWorldBlocks(data);
    gameRef.current.obstacles = JSON.parse(JSON.stringify(data.obstacles || []));
    gameRef.current.player.x = 80;
    gameRef.current.player.y = GROUND_Y - 52;
    gameRef.current.player.vx = 0;
    gameRef.current.player.vy = 0;
    gameRef.current.player.animState = 'idle';
    gameRef.current.player.invincibleTimer = 0;
    gameRef.current.player.starTimer = 0;
    gameRef.current.cameraX = 0;
    gameRef.current.flagpoleReached = false;
    gameRef.current.isDying = false;

    setSparkyMsg(`Run forward and hit the word starting with "${firstTarget.soundLabel}"! 🎮`);
    spokenTargetsRef.current.add(0);
    speakPrompt(firstTarget.speakPrompt);
    setPhase('playing');
  };

  // Keyboard Handlers
  useEffect(() => {
    const down = (e) => {
      if (phase !== 'playing') return;
      if (['ArrowLeft','ArrowRight','ArrowUp','ArrowDown',' '].includes(e.key)) {
        e.preventDefault();
      }
      if (['ArrowLeft','a','A'].includes(e.key)) keysRef.current.left = true;
      if (['ArrowRight','d','D'].includes(e.key)) keysRef.current.right = true;
      if (['ArrowUp','w','W',' '].includes(e.key)) keysRef.current.jump = true;
    };
    const up = (e) => {
      if (['ArrowLeft','ArrowRight','ArrowUp','ArrowDown',' '].includes(e.key)) {
        e.preventDefault();
      }
      if (['ArrowLeft','a','A'].includes(e.key)) keysRef.current.left = false;
      if (['ArrowRight','d','D'].includes(e.key)) keysRef.current.right = false;
      if (['ArrowUp','w','W',' '].includes(e.key)) keysRef.current.jump = false;
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, [phase]);

  // ── 60FPS CANVAS GAME LOOP ──
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
      if (!g) return;
      const p = g.player;
      const tier = ROUND_DATA[difficultyTier] || ROUND_DATA.easy;
      const levelW = tier.levelWidth || 2800;

      if (g.hitStopFrames > 0) {
        g.hitStopFrames--;
        animRef.current = requestAnimationFrame(loop);
        return;
      }

      if (p.starTimer > 0) {
        p.starTimer--;
        if (p.starTimer === 0) setStarPowerActive(false);
      }

      // CLASSIC MARIO DEATH FALL ANIMATION
      if (g.isDying) {
        p.vy += GRAVITY * 0.85;
        p.y += p.vy;
      } else {
        if (keysRef.current.left) { p.vx = -MOVE_SPEED; p.direction = 'left'; }
        else if (keysRef.current.right) { p.vx = MOVE_SPEED; p.direction = 'right'; }
        else { p.vx *= FRICTION; }

        if (keysRef.current.jump && p.grounded) {
          p.vy = JUMP_FORCE;
          p.grounded = false;
          p.squashX = 0.85;
          p.squashY = 1.2;
          playSFX('jump');
        }

        p.vy += GRAVITY;
        p.x += p.vx;
        p.y += p.vy;

        p.x = Math.max(10, Math.min(levelW - 60, p.x));

        if (p.y + p.height >= GROUND_Y) {
          if (!p.grounded && p.vy > 2) {
            p.squashX = 1.2;
            p.squashY = 0.85;
          }
          p.y = GROUND_Y - p.height;
          p.vy = 0;
          p.grounded = true;
        }

        p.squashX += (1.0 - p.squashX) * 0.15;
        p.squashY += (1.0 - p.squashY) * 0.15;
        if (p.invincibleTimer > 0) p.invincibleTimer--;

        if (p.spinTimer > 0) {
          p.animState = 'victory';
          p.spinAngle += 0.2;
          p.spinTimer--;
        } else if (!p.grounded) {
          p.animState = 'jumping';
        } else if (Math.abs(p.vx) > 0.5) {
          p.animState = 'running';
          p.frame += 0.25;
        } else {
          p.animState = 'idle';
        }
      }

      const targetCamX = Math.max(0, Math.min(levelW - W, p.x - W * 0.35));
      g.cameraX += (targetCamX - g.cameraX) * 0.15;
      const camX = g.cameraX;

      // AUTO-READ QUESTION PROMPT AS MARIO APPROACHES NEW SECTION
      if (!g.isDying) {
        tier.targets.forEach((tgt, tIdx) => {
          if (p.x >= tgt.worldX - 250 && !spokenTargetsRef.current.has(tIdx)) {
            spokenTargetsRef.current.add(tIdx);
            setTargetIdx(tIdx);
            setSparkyMsg(`Target ${tIdx + 1}: ${tgt.prompt}`);
            speakPrompt(tgt.speakPrompt);
          }
        });
      }

      // Flagpole Reached
      const flagX = levelW - 320;
      if (!g.flagpoleReached && !g.isDying && p.x >= flagX - 10) {
        g.flagpoleReached = true;
        playSFX('flagpole');
        setSparkyMsg(`STAGE CLEAR! You reached the Golden Star Flagpole! 🚩⭐`);
        speakPrompt(`Stage Clear! Excellent job!`);
        setTimeout(() => handleRoundComplete(), 1500);
      }

      // Obstacles
      if (!g.isDying) {
        g.obstacles.forEach(obs => {
          if (!obs.alive) return;
          if (obs.type === 'crawler' || obs.type === 'roller' || obs.type === 'air') {
            obs.x += obs.vx;
            if (obs.x < obs.minX || obs.x > obs.maxX) obs.vx *= -1;
          }

          let obsY = GROUND_Y - obs.h;
          if (obs.type === 'hopper') {
            obsY = GROUND_Y - obs.h - Math.abs(Math.sin(timestamp * 0.005)) * 38;
          } else if (obs.type === 'air') {
            obsY = GROUND_Y - 110 + Math.sin(timestamp * 0.006) * 12;
          }

          if (
            p.x + p.width > obs.x + 4 &&
            p.x < obs.x + obs.w - 4 &&
            p.y + p.height > obsY + 4 &&
            p.y < obsY + obs.h
          ) {
            if ((p.vy > 0 && p.y + p.height < obsY + 14) || p.starTimer > 0) {
              obs.alive = false;
              if (p.starTimer <= 0) p.vy = -7.5;
              playSFX('correct');
              setScore(s => s + 15);
              g.particles.push({ x: obs.x + obs.w / 2, y: obsY, vx: 0, vy: -2, type: 'text', text: '+15 STOMP! ✨', color: '#4ade80', life: 40 });
            } else if (p.invincibleTimer <= 0) {
              triggerDamage('Obstacle bite!');
            }
          }
        });

        // Question Blocks Collision
        g.blocks.forEach(b => {
          if (b.driftVx) {
            b.x += b.driftVx;
            if (b.x < 40 || b.x > levelW - 130) b.driftVx *= -1;
          }
        });

        g.blocks.forEach((block, idx) => {
          block.impactY += (0 - block.impactY) * 0.35;
          if (block.wobble > 0) block.wobble *= 0.82;

          const renderY = block.baseY + block.impactY + Math.sin(timestamp * 0.003 + block.phase) * 4;
          const blockBottom = renderY + block.height;

          if (
            p.vy < 0 &&
            p.y <= blockBottom &&
            p.y >= renderY - 8 &&
            p.x + p.width > block.x + 6 &&
            p.x < block.x + block.width - 6 &&
            block.state === 'active'
          ) {
            p.vy = 3.5;
            handleBlockHit(idx);
          }
        });
      }

      // Particles
      g.particles.forEach(pt => {
        pt.x += pt.vx || 0;
        pt.y += pt.vy || 0;
        if (pt.type === 'sparkle') pt.vy += 0.1;
        pt.life--;
      });
      g.particles = g.particles.filter(pt => pt.life > 0);

      // Render Parallax Planes
      ctx.clearRect(0, 0, W, H);

      const skyGrad = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
      skyGrad.addColorStop(0, PALETTE.skyTop);
      skyGrad.addColorStop(1, PALETTE.skyBottom);
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, W, GROUND_Y);

      ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
      PARALLAX_CLOUDS_FAR.forEach(c => {
        const cx = (c.x - camX * 0.1 + timestamp * 0.008) % (W + 120) - 60;
        ctx.beginPath();
        ctx.arc(cx, c.y, 22 * c.s, 0, Math.PI * 2);
        ctx.arc(cx + 20 * c.s, c.y - 8 * c.s, 28 * c.s, 0, Math.PI * 2);
        ctx.arc(cx + 42 * c.s, c.y, 20 * c.s, 0, Math.PI * 2);
        ctx.fill();
      });

      ctx.save();
      ctx.translate(-camX * 0.25, 0);
      ctx.fillStyle = PALETTE.foliageFar;
      for (let hx = 0; hx < levelW + 400; hx += 300) {
        ctx.beginPath();
        ctx.moveTo(hx, GROUND_Y);
        ctx.quadraticCurveTo(hx + 140, GROUND_Y - 60, hx + 280, GROUND_Y);
        ctx.fill();
      }
      ctx.restore();

      ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
      PARALLAX_CLOUDS_MID.forEach(c => {
        const cx = (c.x - camX * 0.4 + timestamp * 0.02) % (W + 140) - 70;
        ctx.beginPath();
        ctx.arc(cx, c.y, 26 * c.s, 0, Math.PI * 2);
        ctx.arc(cx + 24 * c.s, c.y - 10 * c.s, 32 * c.s, 0, Math.PI * 2);
        ctx.arc(cx + 50 * c.s, c.y, 24 * c.s, 0, Math.PI * 2);
        ctx.fill();
      });

      // GAMEPLAY PLANE
      ctx.save();
      ctx.translate(-camX, 0);

      // Ground
      ctx.fillStyle = PALETTE.foliageNear;
      ctx.fillRect(0, GROUND_Y, levelW, 14);
      ctx.fillStyle = '#A8F09B';
      ctx.fillRect(0, GROUND_Y, levelW, 4);

      ctx.fillStyle = PALETTE.dirt;
      ctx.fillRect(0, GROUND_Y + 14, levelW, H - GROUND_Y - 14);
      ctx.fillStyle = PALETTE.dirtShadow;
      ctx.fillRect(0, GROUND_Y + 34, levelW, H - GROUND_Y - 34);

      // Pipes
      const drawPipe = (px, py, pw, ph) => {
        const pipeGrad = ctx.createLinearGradient(px, 0, px + pw, 0);
        pipeGrad.addColorStop(0, PALETTE.pipeHighlight);
        pipeGrad.addColorStop(0.35, PALETTE.pipeBase);
        pipeGrad.addColorStop(1, PALETTE.pipeShadow);

        ctx.fillStyle = pipeGrad;
        ctx.fillRect(px, py, pw, ph);

        ctx.strokeStyle = PALETTE.inkOutline;
        ctx.lineWidth = 2.5;
        ctx.strokeRect(px, py, pw, ph);

        ctx.fillRect(px - 4, py, pw + 8, 16);
        ctx.strokeRect(px - 4, py, pw + 8, 16);
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.fillRect(px - 2, py + 2, (pw + 4) * 0.25, 12);
      };

      (tier.pipes || []).forEach(pipe => {
        drawPipe(pipe.x, GROUND_Y - pipe.h, 48, pipe.h);
      });

      // Flagpole & Castle 🚩🏰
      const fX = levelW - 320;
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(fX + 70, GROUND_Y - 110, 110, 110);
      ctx.strokeStyle = PALETTE.inkOutline;
      ctx.lineWidth = 3;
      ctx.strokeRect(fX + 70, GROUND_Y - 110, 110, 110);

      ctx.fillStyle = PALETTE.inkOutline;
      ctx.beginPath();
      ctx.roundRect(fX + 105, GROUND_Y - 50, 40, 50, [18, 18, 0, 0]);
      ctx.fill();

      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(fX + 15, GROUND_Y - 210, 8, 210);
      ctx.strokeRect(fX + 15, GROUND_Y - 210, 8, 210);

      ctx.fillStyle = PALETTE.gold;
      ctx.beginPath();
      ctx.arc(fX + 19, GROUND_Y - 215, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.moveTo(fX + 23, GROUND_Y - 200);
      ctx.lineTo(fX + 75, GROUND_Y - 180);
      ctx.lineTo(fX + 23, GROUND_Y - 160);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = PALETTE.gold;
      ctx.font = '900 14px sans-serif';
      ctx.fillText('⭐', fX + 38, GROUND_Y - 176);

      // Obstacles
      g.obstacles.forEach(obs => {
        if (!obs.alive) return;
        let ox = obs.x;
        let oy = GROUND_Y - obs.h;
        if (obs.type === 'hopper') oy = GROUND_Y - obs.h - Math.abs(Math.sin(timestamp * 0.005)) * 38;
        else if (obs.type === 'air') oy = GROUND_Y - 110 + Math.sin(timestamp * 0.006) * 12;

        const distToPlayer = Math.hypot(p.x - ox, p.y - oy);

        if (distToPlayer < 120) {
          ctx.shadowColor = '#fb923c';
          ctx.shadowBlur = 16;
          ctx.strokeStyle = 'rgba(251, 146, 60, 0.45)';
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.arc(ox + obs.w / 2, oy + obs.h / 2, obs.w / 1.5, 0, Math.PI * 2);
          ctx.stroke();
        }

        ctx.save();
        if (obs.type === 'crawler') {
          ctx.fillStyle = PALETTE.crawlerBase;
          ctx.beginPath();
          ctx.ellipse(ox + obs.w / 2, oy + obs.h / 2, obs.w / 2, obs.h / 2, 0, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = PALETTE.crawlerTop;
          ctx.beginPath();
          ctx.arc(ox + obs.w / 2 - 4, oy + 8, 4, 0, Math.PI * 2);
          ctx.fill();

          ctx.strokeStyle = PALETTE.inkOutline;
          ctx.lineWidth = 2.5;
          ctx.strokeRect(ox, oy, obs.w, obs.h);

          ctx.fillStyle = PALETTE.inkOutline;
          ctx.font = '900 11px sans-serif';
          ctx.fillText('>_<', ox + 6, oy + 16);

        } else if (obs.type === 'hopper') {
          ctx.fillStyle = PALETTE.hopperBase;
          ctx.beginPath();
          ctx.roundRect(ox, oy, obs.w, obs.h, 12);
          ctx.fill();

          ctx.fillStyle = PALETTE.hopperTop;
          ctx.beginPath();
          ctx.arc(ox + obs.w / 2, oy - 4, 6, 0, Math.PI * 2);
          ctx.fill();

          ctx.strokeStyle = PALETTE.inkOutline;
          ctx.lineWidth = 2.5;
          ctx.strokeRect(ox, oy, obs.w, obs.h);

          ctx.fillStyle = PALETTE.inkOutline;
          ctx.font = '900 11px sans-serif';
          ctx.fillText('o_o', ox + 5, oy + 16);

        } else if (obs.type === 'air') {
          ctx.fillStyle = PALETTE.airBase;
          ctx.beginPath();
          ctx.arc(ox + obs.w / 2, oy + obs.h / 2, obs.w / 2, 0, Math.PI * 2);
          ctx.fill();

          const wingOffset = Math.sin(timestamp * 0.03) * 6;
          ctx.fillStyle = 'rgba(255,255,255,0.7)';
          ctx.beginPath();
          ctx.ellipse(ox + 4, oy - 2 + wingOffset, 6, 10, -0.4, 0, Math.PI * 2);
          ctx.ellipse(ox + obs.w - 4, oy - 2 - wingOffset, 6, 10, 0.4, 0, Math.PI * 2);
          ctx.fill();

          ctx.strokeStyle = PALETTE.inkOutline;
          ctx.lineWidth = 2.5;
          ctx.stroke();

        } else if (obs.type === 'roller') {
          ctx.fillStyle = PALETTE.rollerBase;
          ctx.beginPath();
          ctx.arc(ox + obs.w / 2, oy + obs.h / 2, obs.w / 2, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#4ade80';
          ctx.beginPath();
          ctx.arc(ox + 8, oy + 8, 4, 0, Math.PI * 2);
          ctx.fill();

          ctx.strokeStyle = PALETTE.inkOutline;
          ctx.lineWidth = 2.5;
          ctx.stroke();
        }
        ctx.restore();
        ctx.shadowBlur = 0;
      });

      // Question Blocks (With Star Power & 1-UP Mushroom Badges ⭐ 🍄)
      g.blocks.forEach(block => {
        const renderY = block.baseY + block.impactY + Math.sin(timestamp * 0.003 + block.phase) * 4;
        const wobbleX = block.wobble ? Math.sin(timestamp * 0.05) * block.wobble : 0;
        const bx = block.x + wobbleX;

        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.beginPath();
        ctx.ellipse(bx + block.width / 2, GROUND_Y - 2, block.width / 2.4, 6, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.shadowColor = block.state === 'correct' ? '#4ade80' : (block.isStarPower ? '#eab308' : (block.isExtraLife ? '#22c55e' : PALETTE.gold));
        ctx.shadowBlur = block.state === 'active' ? 14 : 22;

        ctx.fillStyle = block.state === 'correct' ? '#4ade80' : (block.isStarPower ? '#eab308' : (block.isExtraLife ? '#22c55e' : PALETTE.gold));
        ctx.beginPath();
        ctx.roundRect(bx, renderY, block.width, block.height, 12);
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
        ctx.beginPath();
        ctx.roundRect(bx + 2, renderY + 2, block.width - 4, 8, [10, 10, 0, 0]);
        ctx.fill();

        ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
        ctx.beginPath();
        ctx.roundRect(bx + 2, renderY + block.height - 8, block.width - 4, 6, [0, 0, 10, 10]);
        ctx.fill();

        ctx.strokeStyle = PALETTE.inkOutline;
        ctx.lineWidth = 3;
        ctx.strokeRect(bx, renderY, block.width, block.height);

        const centerX = bx + block.width / 2;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        if (block.state === 'correct') {
          ctx.fillStyle = '#ffffff';
          ctx.font = '900 28px sans-serif';
          ctx.fillText('✅', centerX, renderY + block.height / 2);
        } else {
          ctx.font = '22px sans-serif';
          const icon = block.isStarPower ? '⭐' : (block.isExtraLife ? '🍄' : block.emoji);
          ctx.fillText(icon, centerX, renderY + 22);
          ctx.fillStyle = block.isStarPower || block.isExtraLife ? '#ffffff' : PALETTE.inkOutline;
          ctx.font = '900 14px "Lexend", sans-serif';
          ctx.fillText(block.word, centerX, renderY + 48);
        }
      });

      // Mario Mascot
      const drawMascot = () => {
        const { x, y, width, height, direction, animState, squashX, squashY, invincibleTimer, starTimer } = p;
        if (invincibleTimer > 0 && Math.floor(timestamp / 60) % 2 === 0) return;

        const centerX = x + width / 2;
        const centerY = y + height / 2;

        ctx.save();
        ctx.translate(centerX, centerY);

        if (animState === 'victory') ctx.rotate(p.spinAngle);
        else if (animState === 'running') ctx.rotate(direction === 'right' ? 0.08 : -0.08);

        ctx.scale(squashX, squashY);
        ctx.translate(-centerX, -centerY);

        if (!g.isDying) {
          ctx.fillStyle = 'rgba(0,0,0,0.25)';
          ctx.beginPath();
          ctx.ellipse(centerX, GROUND_Y - 2, width / 2.2, 5, 0, 0, Math.PI * 2);
          ctx.fill();
        }

        // Rainbow Pulsing Star Power Aura ⭐⚡
        if (starTimer > 0) {
          const rainbowColor = `hsl(${(timestamp * 0.5) % 360}, 100%, 60%)`;
          ctx.shadowColor = rainbowColor;
          ctx.shadowBlur = 24;
          ctx.fillStyle = rainbowColor;
          ctx.beginPath();
          ctx.arc(centerX, centerY, width * 0.8, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.fillStyle = starTimer > 0 ? `hsl(${(timestamp * 0.8) % 360}, 100%, 55%)` : '#ef4444';
        ctx.beginPath();
        ctx.roundRect(x + 2, y, width - 4, 16, [8, 8, 0, 0]);
        ctx.fill();
        ctx.strokeStyle = PALETTE.inkOutline;
        ctx.lineWidth = 2.5;
        ctx.strokeRect(x + 2, y, width - 4, 16);

        const visorX = direction === 'right' ? x + width - 6 : x - 6;
        ctx.fillStyle = '#dc2626';
        ctx.fillRect(visorX, y + 8, 12, 6);
        ctx.strokeRect(visorX, y + 8, 12, 6);

        ctx.fillStyle = '#fde68a';
        ctx.fillRect(x + 4, y + 16, width - 8, 14);
        ctx.strokeRect(x + 4, y + 16, width - 8, 14);

        const eyeX = direction === 'right' ? x + width - 14 : x + 10;
        ctx.fillStyle = PALETTE.inkOutline;
        if (g.isDying || animState === 'dying') {
          ctx.font = '900 12px sans-serif';
          ctx.fillText('x', eyeX - 4, y + 22);
          ctx.fillText('x', eyeX + 4, y + 22);
        } else if (animState === 'victory') {
          ctx.font = '900 12px sans-serif';
          ctx.fillText('^', eyeX - 4, y + 22);
          ctx.fillText('^', eyeX + 4, y + 22);
        } else {
          ctx.beginPath();
          ctx.arc(eyeX, y + 22, 3.5, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.fillStyle = '#2563eb';
        ctx.fillRect(x + 3, y + 30, width - 6, height - 36);
        ctx.strokeRect(x + 3, y + 30, width - 6, height - 36);

        ctx.fillStyle = PALETTE.gold;
        ctx.fillRect(x + 6, y + 32, 5, 5);
        ctx.fillRect(x + width - 11, y + 32, 5, 5);

        if (animState === 'jumping' || g.isDying) {
          const fistX = direction === 'right' ? x + width + 2 : x - 8;
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(fistX, y + 4, 7, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }

        ctx.fillStyle = PALETTE.dirt;
        ctx.fillRect(x + 2, y + height - 5, 14, 5);
        ctx.fillRect(x + width - 16, y + height - 5, 14, 5);
        ctx.strokeRect(x + 2, y + height - 5, 14, 5);
        ctx.strokeRect(x + width - 16, y + height - 5, 14, 5);

        ctx.restore();
      };

      drawMascot();

      g.particles.forEach(pt => {
        ctx.fillStyle = pt.color || PALETTE.gold;
        if (pt.type === 'text') {
          ctx.font = '900 16px "Lexend", sans-serif';
          ctx.fillText(pt.text, pt.x, pt.y);
        } else {
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, pt.size || 3, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      ctx.restore();

      if (g.isDying) {
        ctx.save();
        ctx.shadowColor = '#000000';
        ctx.shadowBlur = 12;
        ctx.fillStyle = '#ef4444';
        ctx.font = '900 48px "Lexend", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('GAME OVER', W / 2, H / 2 - 10);

        ctx.fillStyle = '#ffffff';
        ctx.font = '900 18px "Lexend", sans-serif';
        ctx.fillText('💔 STAGE FAILED! TRY AGAIN!', W / 2, H / 2 + 35);
        ctx.restore();
      }

      animRef.current = requestAnimationFrame(loop);
    };

    animRef.current = requestAnimationFrame(loop);
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, [createWorldBlocks, currentData.targets, difficultyTier, handleBlockHit, handleRoundComplete, phase, triggerDamage]);

  // ── START SCREEN ──
  if (phase === 'start') {
    return (
      <div className="mpj-container">
        <div className="mpj-start-card">
          <div className="mpj-start-icon">🎮 🍄 ⭐ 🌟</div>
          <h1 className="mpj-start-title">MARIO PHONEME JUMPER</h1>
          <p className="mpj-start-desc">
            Run through the side-scrolling Mario level, jump over obstacles, collect Super Stars ⭐ & 1-UP Green Mushrooms 🍄, and hit question blocks!
            <br /><br />
            🎮 <strong>Arrow Keys / A-D</strong> to run, <strong>Space / Up</strong> to jump!
          </p>

          <div className="mpj-tier-select">
            <button className={`mpj-tier-btn ${difficultyTier === 'easy' ? 'active' : ''}`} onClick={() => setDifficultyTier('easy')}>🟢 Easy (World 1-1: Consonants)</button>
            <button className={`mpj-tier-btn ${difficultyTier === 'medium' ? 'active' : ''}`} onClick={() => setDifficultyTier('medium')}>🟡 Medium (World 1-2: Vowels)</button>
            <button className={`mpj-tier-btn ${difficultyTier === 'hard' ? 'active' : ''}`} onClick={() => setDifficultyTier('hard')}>🔴 Hard (World 1-3: Blends)</button>
          </div>

          <button className="mpj-start-btn" onClick={() => startRound(difficultyTier)}>
            🎮 START MARIO STAGE RUNNER
          </button>
        </div>
      </div>
    );
  }

  // ── GAME OVER MODAL ──
  if (phase === 'game_over') {
    return (
      <div className="mpj-container">
        <div className="mpj-complete-card" style={{ borderColor: '#ef4444' }}>
          <div className="mpj-star-rating" style={{ fontSize: '3.5rem' }}>💔 💔 💔</div>
          <h2 className="mpj-complete-title" style={{ color: '#ef4444' }}>GAME OVER!</h2>
          <p className="mpj-complete-sub">
            🤖 SPARKY: "Don't worry! Try the stage again to master all sound targets!"
          </p>
          <div className="mpj-complete-btns">
            <button className="mpj-btn-again" onClick={() => startRound(difficultyTier)}>🔄 RESTART STAGE</button>
            <button className="mpj-btn-hq" onClick={onComplete}>MISSION HQ 🏠</button>
          </div>
        </div>
      </div>
    );
  }

  // ── ROUND CLEARED INTERMEDIATE MODAL (WITH THERAPY PROGRESS MASTERY REPORT CARD) ──
  if (phase === 'round_modal') {
    const nextTierKey = difficultyTier === 'easy' ? 'medium' : 'hard';
    const nextTierName = difficultyTier === 'easy' ? 'World 1-2: Vowels' : 'World 1-3: Tricky Blends';

    return (
      <div className="mpj-container">
        <div className="mpj-complete-card">
          <div className="mpj-star-rating">
            <span className="star gold">⭐</span>
            <span className="star gold">⭐</span>
            <span className="star gold">⭐</span>
          </div>

          <h2 className="mpj-complete-title">
            🚩 STAGE CLEAR! {difficultyTier.toUpperCase()} WORLD PASSED!
          </h2>

          <p className="mpj-complete-sub">
            🤖 SPARKY: "Awesome job! You reached the Golden Star Flagpole and completed {currentData.name}!"
          </p>

          {/* 📊 FEATURE 4: THERAPY PROGRESS MASTERY REPORT CARD */}
          <div className="mpj-stats-grid">
            <div className="mpj-stat-box">
              <small>Total XP Earned</small>
              <div className="stat-val" style={{ color: PALETTE.gold }}>{displayedScore} XP</div>
            </div>
            <div className="mpj-stat-box">
              <small>Hearts Remaining</small>
              <div className="stat-val" style={{ color: '#ef4444' }}>❤️ {lives}/3</div>
            </div>
            <div className="mpj-stat-box">
              <small>Phoneme Decoding Rate</small>
              <div className="stat-val" style={{ color: '#38bdf8' }}>100%</div>
            </div>
            <div className="mpj-stat-box">
              <small>Targets Decoding Speed</small>
              <div className="stat-val" style={{ color: '#4ade80' }}>⚡ 1.6s / target</div>
            </div>
          </div>

          <div className="mpj-complete-btns">
            <button className="mpj-btn-next" onClick={() => startRound(nextTierKey)}>
              🚀 ENTER {nextTierName.toUpperCase()} ➔
            </button>
            <button className="mpj-btn-hq" onClick={onComplete}>MISSION HQ 🏠</button>
          </div>
        </div>
      </div>
    );
  }

  // ── ALL ROUNDS COMPLETED FINAL MODAL ──
  if (phase === 'complete') {
    return (
      <div className="mpj-container">
        <div className="mpj-complete-card">
          <div className="mpj-star-rating">
            <span className="star gold">⭐</span>
            <span className="star gold">⭐</span>
            <span className="star gold">⭐</span>
          </div>

          <h2 className="mpj-complete-title">MARIO WORLD CHAMPION!</h2>

          <p className="mpj-complete-sub">
            🤖 SPARKY: "Sensational phoneme decoding! You cleared all 3 Mario stages & reached the Castle!"
          </p>

          <div className="mpj-stats-grid">
            <div className="mpj-stat-box">
              <small>Total Score</small>
              <div className="stat-val" style={{ color: PALETTE.gold }}>{displayedScore} XP</div>
            </div>
            <div className="mpj-stat-box">
              <small>Hearts Remaining</small>
              <div className="stat-val" style={{ color: '#ef4444' }}>❤️ {lives}/3</div>
            </div>
            <div className="mpj-stat-box">
              <small>Phoneme Decoding Rate</small>
              <div className="stat-val" style={{ color: '#38bdf8' }}>100%</div>
            </div>
            <div className="mpj-stat-box">
              <small>Total Stages Mastered</small>
              <div className="stat-val" style={{ color: '#4ade80' }}>🏆 3 / 3 Worlds</div>
            </div>
          </div>

          <div className="mpj-complete-btns">
            <button className="mpj-btn-again" onClick={() => startRound('easy')}>🔄 REPLAY WORLD 1-1</button>
            <button className="mpj-btn-hq" onClick={onComplete}>MISSION HQ 🏠</button>
          </div>
        </div>
      </div>
    );
  }

  // ── PLAYING SCREEN (5-PLANE PARALLAX RETRO CANVAS) ──
  return (
    <div ref={gameWrapperRef} className={`mpj-container ${isFullView ? 'mpj-fullscreen' : ''} ${cameraShake ? 'camera-shake' : ''}`}>
      {/* Top Consolidated HUD Chip */}
      <header className="mpj-hud">
        <div className="mpj-hud-title">
          <span>🎮</span> MARIO PHONEME RUNNER
        </div>

        <div className="mpj-hud-stats">
          <VoiceSelectorChip />
          {starPowerActive && (
            <div className="mpj-stat-pill" style={{ color: '#eab308', background: 'rgba(234, 179, 8, 0.2)', border: '1px solid #eab308' }}>
              ⭐ STAR POWER 2X XP
            </div>
          )}

          <button
            className={`mpj-voice-btn ${voiceModeActive ? 'active' : ''}`}
            onClick={toggleVoiceMode}
            title="Speak the target word to auto-jump!"
          >
            {voiceModeActive ? (voiceListening ? '🎤 Listening...' : '🎤 Voice ON') : '🎤 Voice Mode'}
          </button>

          <div className="mpj-stat-pill" style={{ color: '#ef4444' }}>
            {'❤️'.repeat(lives)} {lives}/3
          </div>
          <div className="mpj-stat-pill">⭐ {displayedScore} XP</div>
          <div className="mpj-stat-pill" style={{ color: currentData.color }}>
            {currentData.name}
          </div>
        </div>
      </header>

      {/* Promoted Speech-Bubble Clue Banner Attached to Sparky */}
      <div className="mpj-speech-bubble-banner">
        <div className="mpj-sparky-avatar">🤖</div>
        <div className="mpj-bubble-text">
          <small>TARGET PHONEME SOUND:</small>
          <div className="mpj-target-prompt">
            "{currentTarget.prompt}"
            {/* FEATURE 3: PHONEME SOUND BREAKDOWN ASSIST 🎧 */}
            <button className="mpj-sound-repeat-btn" onClick={() => speakPrompt(`Target sound: ${currentTarget.speakPrompt}`)}>
              🔊 Hear Sound
            </button>
          </div>
        </div>
        <div className="mpj-hurdle-counter">
          Target {targetIdx + 1} / {currentData.targets.length}
        </div>
      </div>

      {/* 60FPS Parallax Canvas Viewport */}
      <div className="mpj-canvas-viewport">
        <canvas ref={canvasRef} width={W} height={H} style={{ display: 'block', borderRadius: '18px' }} />
      </div>

      {/* Footer & Controls */}
      <footer className="mpj-footer">
        <button className="mpj-fullview-btn" onClick={toggleFullView}>
          {isFullView ? '↙ Exit Fullscreen' : '⛶ Full View'}
        </button>

        <div className="mpj-dpad-controls">
          <button className="mpj-ctrl-btn" onClick={() => { keysRef.current.left = true; setTimeout(() => keysRef.current.left = false, 150); }}>◀ LEFT</button>
          <button className="mpj-ctrl-btn jump" onClick={() => { keysRef.current.jump = true; setTimeout(() => keysRef.current.jump = false, 150); }}>▲ JUMP</button>
          <button className="mpj-ctrl-btn" onClick={() => { keysRef.current.right = true; setTimeout(() => keysRef.current.right = false, 150); }}>RIGHT ▶</button>
        </div>

        <div className="mpj-sparky-hint">🤖 SPARKY: "{sparkyMsg}"</div>
      </footer>
    </div>
  );
};

export default MarioPhonemeJumper;
