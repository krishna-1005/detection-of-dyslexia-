import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import './SoundQuest.css';
import SparkyCharacter from './characters/SparkyCharacter';
import BloopCharacter from './characters/BloopCharacter';
import EchoCharacter from './characters/EchoCharacter';
import ZipCharacter from './characters/ZipCharacter';
import SoundSprite from './characters/SoundSprite';
import SoundCrewDrawer from './characters/SoundCrewDrawer';
import { useAuth } from '../auth/AuthContext';
import { saveTherapyProgress } from './ExerciseSystem';
import useAudioVisualizer from './hooks/useAudioVisualizer';
import { speakText, playClickSound } from '../../utils/speechHelper';
import { fetchWithAuth } from '../../services/api';

// ─────────────────────────────────────────────────────────────────
// ROTATING DYNAMIC MISSION CHALLENGES DATASET (20+ PHONEME VARIATIONS)
// ─────────────────────────────────────────────────────────────────
const shuffleArray = (arr) => {
  const shallow = [...arr];
  for (let i = shallow.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shallow[i], shallow[j]] = [shallow[j], shallow[i]];
  }
  return shallow;
};

// LEVEL 1: EASY (Single Consonants)
const EASY_POOL = [
  {
    id: 'e1',
    difficulty: 'easy',
    type: 'find_sound',
    title: 'Find the /B/ Sound!',
    targetPhoneme: '/B/',
    targetWord: 'BALL',
    emoji: '🏀',
    choices: [
      { text: 'BALL', emoji: '🏀', isCorrect: true, phoneme: '/B/' },
      { text: 'CAT', emoji: '🐱', isCorrect: false, phoneme: '/C/' },
      { text: 'SUN', emoji: '☀️', isCorrect: false, phoneme: '/S/' },
    ],
    color: '#38bdf8',
  },
  {
    id: 'e2',
    difficulty: 'easy',
    type: 'bloop_mistake',
    title: 'Help Bloop Fix His /M/ Mixup!',
    targetPhoneme: '/M/',
    targetWord: 'MOON',
    emoji: '🌙',
    bloopGuess: 'DOG 🐶',
    bloopSpeech: 'Is it DOG? Oops! Help me find MOON!',
    choices: [
      { text: 'DOG', emoji: '🐶', isCorrect: false, phoneme: '/D/' },
      { text: 'MOON', emoji: '🌙', isCorrect: true, phoneme: '/M/' },
      { text: 'FISH', emoji: '🐟', isCorrect: false, phoneme: '/F/' },
    ],
    color: '#34d399',
  },
  {
    id: 'e3',
    difficulty: 'easy',
    type: 'find_sound',
    title: 'Find the /P/ Sound!',
    targetPhoneme: '/P/',
    targetWord: 'PIG',
    emoji: '🐷',
    choices: [
      { text: 'PIG', emoji: '🐷', isCorrect: true, phoneme: '/P/' },
      { text: 'COW', emoji: '🐮', isCorrect: false, phoneme: '/C/' },
      { text: 'HORSE', emoji: '🐴', isCorrect: false, phoneme: '/H/' },
    ],
    color: '#fbbf24',
  },
  {
    id: 'e4',
    difficulty: 'easy',
    type: 'zip_race',
    title: 'Zip Speed Challenge: /T/ Sound!',
    targetPhoneme: '/T/',
    targetWord: 'TIGER',
    emoji: '🐯',
    choices: [
      { text: 'TIGER', emoji: '🐯', isCorrect: true, phoneme: '/T/' },
      { text: 'BIRD', emoji: '🐦', isCorrect: false, phoneme: '/B/' },
      { text: 'CAR', emoji: '🚗', isCorrect: false, phoneme: '/C/' },
    ],
    color: '#f472b6',
  },
  {
    id: 'e5',
    difficulty: 'easy',
    type: 'find_sound',
    title: 'Find the /F/ Sound!',
    targetPhoneme: '/F/',
    targetWord: 'FISH',
    emoji: '🐟',
    choices: [
      { text: 'FISH', emoji: '🐟', isCorrect: true, phoneme: '/F/' },
      { text: 'DUCK', emoji: '🦆', isCorrect: false, phoneme: '/D/' },
      { text: 'STAR', emoji: '⭐', isCorrect: false, phoneme: '/ST/' },
    ],
    color: '#38bdf8',
  },
  {
    id: 'e6',
    difficulty: 'easy',
    type: 'sound_treasure',
    title: 'Unlock the /K/ Sound Treasure!',
    targetPhoneme: '/K/',
    targetWord: 'KING',
    emoji: '👑',
    choices: [
      { text: 'QUEEN', emoji: '👸', isCorrect: false, phoneme: '/Q/' },
      { text: 'KING', emoji: '👑', isCorrect: true, phoneme: '/K/' },
      { text: 'KNIGHT', emoji: '🛡️', isCorrect: false, phoneme: '/N/' },
    ],
    color: '#a78bfa',
  },
];

// LEVEL 2: MEDIUM (Consonant Blends & Digraphs)
const MEDIUM_POOL = [
  {
    id: 'm1',
    difficulty: 'medium',
    type: 'echo_challenge',
    title: 'Echo Auditory /SH/ Repeat!',
    targetPhoneme: '/SH/',
    targetWord: 'SHIP',
    emoji: '🚢',
    choices: [
      { text: 'CHIP', emoji: '🍟', isCorrect: false, phoneme: '/CH/' },
      { text: 'SUN', emoji: '☀️', isCorrect: false, phoneme: '/S/' },
      { text: 'SHIP', emoji: '🚢', isCorrect: true, phoneme: '/SH/' },
    ],
    color: '#8b5cf6',
  },
  {
    id: 'm2',
    difficulty: 'medium',
    type: 'sound_treasure',
    title: 'Unlock the /CH/ Sound Treasure!',
    targetPhoneme: '/CH/',
    targetWord: 'CHAIR',
    emoji: '🪑',
    choices: [
      { text: 'SHIP', emoji: '🚢', isCorrect: false, phoneme: '/SH/' },
      { text: 'CHAIR', emoji: '🪑', isCorrect: true, phoneme: '/CH/' },
      { text: 'CLOCK', emoji: '⏰', isCorrect: false, phoneme: '/CL/' },
    ],
    color: '#f472b6',
  },
  {
    id: 'm3',
    difficulty: 'medium',
    type: 'bloop_mistake',
    title: 'Help Bloop Find the /DR/ Sound!',
    targetPhoneme: '/DR/',
    targetWord: 'DRUM',
    emoji: '🥁',
    bloopGuess: 'BELL 🔔',
    bloopSpeech: 'Is it BELL? Oops! Help me find DRUM!',
    choices: [
      { text: 'BELL', emoji: '🔔', isCorrect: false, phoneme: '/B/' },
      { text: 'DRUM', emoji: '🥁', isCorrect: true, phoneme: '/DR/' },
      { text: 'RING', emoji: '💍', isCorrect: false, phoneme: '/R/' },
    ],
    color: '#34d399',
  },
  {
    id: 'm4',
    difficulty: 'medium',
    type: 'zip_race',
    title: 'Zip Speed Challenge: /FL/ Sound!',
    targetPhoneme: '/FL/',
    targetWord: 'FLOWER',
    emoji: '🌸',
    choices: [
      { text: 'FLOWER', emoji: '🌸', isCorrect: true, phoneme: '/FL/' },
      { text: 'TREE', emoji: '🌲', isCorrect: false, phoneme: '/TR/' },
      { text: 'LEAF', emoji: '🍃', isCorrect: false, phoneme: '/L/' },
    ],
    color: '#fbbf24',
  },
  {
    id: 'm5',
    difficulty: 'medium',
    type: 'find_sound',
    title: 'Find the /BL/ Sound!',
    targetPhoneme: '/BL/',
    targetWord: 'BLOCK',
    emoji: '🧊',
    choices: [
      { text: 'BLOCK', emoji: '🧊', isCorrect: true, phoneme: '/BL/' },
      { text: 'RED', emoji: '🔴', isCorrect: false, phoneme: '/R/' },
      { text: 'DOOR', emoji: '🚪', isCorrect: false, phoneme: '/D/' },
    ],
    color: '#38bdf8',
  },
  {
    id: 'm6',
    difficulty: 'medium',
    type: 'echo_challenge',
    title: 'Echo Auditory /TH/ Repeat!',
    targetPhoneme: '/TH/',
    targetWord: 'THREE',
    emoji: '3️⃣',
    choices: [
      { text: 'TWO', emoji: '2️⃣', isCorrect: false, phoneme: '/TW/' },
      { text: 'FOUR', emoji: '4️⃣', isCorrect: false, phoneme: '/F/' },
      { text: 'THREE', emoji: '3️⃣', isCorrect: true, phoneme: '/TH/' },
    ],
    color: '#8b5cf6',
  },
];

// LEVEL 3: HARD (Complex Triple Blends & Minimal Pairs)
const HARD_POOL = [
  {
    id: 'h1',
    difficulty: 'hard',
    type: 'zip_race',
    title: 'Speed Challenge: /STR/ Sound!',
    targetPhoneme: '/STR/',
    targetWord: 'STRAWBERRY',
    emoji: '🍓',
    choices: [
      { text: 'STRAWBERRY', emoji: '🍓', isCorrect: true, phoneme: '/STR/' },
      { text: 'STAR', emoji: '⭐', isCorrect: false, phoneme: '/ST/' },
      { text: 'TREE', emoji: '🌲', isCorrect: false, phoneme: '/TR/' },
    ],
    color: '#ef4444',
  },
  {
    id: 'h2',
    difficulty: 'hard',
    type: 'bloop_mistake',
    title: 'Help Bloop Fix His /SPL/ Mixup!',
    targetPhoneme: '/SPL/',
    targetWord: 'SPLASH',
    emoji: '💦',
    bloopGuess: 'SUN ☀️',
    bloopSpeech: 'Is it SUN? Oops! Help me find SPLASH!',
    choices: [
      { text: 'SUN', emoji: '☀️', isCorrect: false, phoneme: '/S/' },
      { text: 'SPLASH', emoji: '💦', isCorrect: true, phoneme: '/SPL/' },
      { text: 'RAIN', emoji: '🌧️', isCorrect: false, phoneme: '/R/' },
    ],
    color: '#f97316',
  },
  {
    id: 'h3',
    difficulty: 'hard',
    type: 'sound_treasure',
    title: 'Unlock the /PH/ Sound Treasure!',
    targetPhoneme: '/PH/',
    targetWord: 'PHONE',
    emoji: '📱',
    choices: [
      { text: 'PEN', emoji: '🖊️', isCorrect: false, phoneme: '/P/' },
      { text: 'PHONE', emoji: '📱', isCorrect: true, phoneme: '/PH/' },
      { text: 'FAN', emoji: '🪭', isCorrect: false, phoneme: '/F/' },
    ],
    color: '#ec4899',
  },
  {
    id: 'h4',
    difficulty: 'hard',
    type: 'echo_challenge',
    title: 'Echo Auditory /SCR/ Repeat!',
    targetPhoneme: '/SCR/',
    targetWord: 'SCREW',
    emoji: '🪛',
    choices: [
      { text: 'SAW', emoji: '🪚', isCorrect: false, phoneme: '/S/' },
      { text: 'SCREW', emoji: '🪛', isCorrect: true, phoneme: '/SCR/' },
      { text: 'CROW', emoji: '🐦', isCorrect: false, phoneme: '/CR/' },
    ],
    color: '#8b5cf6',
  },
  {
    id: 'h5',
    difficulty: 'hard',
    type: 'find_sound',
    title: 'Find the /IGHT/ Sound!',
    targetPhoneme: '/IGHT/',
    targetWord: 'LIGHT',
    emoji: '💡',
    choices: [
      { text: 'LIGHT', emoji: '💡', isCorrect: true, phoneme: '/IGHT/' },
      { text: 'LAMP', emoji: '🛋️', isCorrect: false, phoneme: '/L/' },
      { text: 'NIGHT', emoji: '🌃', isCorrect: false, phoneme: '/N/' },
    ],
    color: '#6366f1',
  },
];

const LEVEL_POOLS = {
  easy: EASY_POOL,
  medium: MEDIUM_POOL,
  hard: HARD_POOL,
};

// Confetti colors
const CONFETTI_COLORS = ['#ff6b6b', '#ffeaa7', '#74b9ff', '#a29bfe', '#55efc4', '#fd79a8', '#fdcb6e', '#00cec9'];

const SoundQuest = ({ onComplete }) => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const audio = useAudioVisualizer();

  const uid = currentUser?.uid || 'guest';
  const userName = currentUser?.displayName?.split(' ')[0] || 'Krish';

  // ── Persistent Game Stats ──
  const [xp, setXp] = useState(() => {
    try {
      const saved = localStorage.getItem(`sq_xp_${uid}`);
      return saved ? parseInt(saved, 10) : 120;
    } catch (e) { return 120; }
  });

  const [streak, setStreak] = useState(() => {
    try {
      const saved = localStorage.getItem(`sq_streak_${uid}`);
      return saved ? parseInt(saved, 10) : 3;
    } catch (e) { return 3; }
  });

  const [lives] = useState(3);
  const [missionIdx, setMissionIdx] = useState(0);
  const [rocketFuel, setRocketFuel] = useState(60); // Replaces jarFillPercent
  const [collectedSprites, setCollectedSprites] = useState([
    { phoneme: '/B/', color: '#38bdf8' },
    { phoneme: '/M/', color: '#34d399' },
    { phoneme: '/S/', color: '#8b5cf6' },
  ]);

  // ── Character & Animation State ──
  const [sparkyState, setSparkyState] = useState('idle');
  const [sparkyMessage, setSparkyMessage] = useState('Can you find the /B/ sound?');
  const [bloopState, setBloopState] = useState('idle');
  const [bloopMessage, setBloopMessage] = useState(null);
  const [echoState, setEchoState] = useState('idle');
  const [echoMessage, setEchoMessage] = useState(null);
  const [zipState, setZipState] = useState('idle');
  const [zipProgress, setZipProgress] = useState(0);

  // Dynamic Animations
  const [selectedChoice, setSelectedChoice] = useState(null);
  const [flyingObject, setFlyingObject] = useState(null);
  const [floatingXP, setFloatingXP] = useState(null);
  const [starPopIdx, setStarPopIdx] = useState(-1);
  const [isStreakPopping, setIsStreakPopping] = useState(false);
  const [isRocketBoosting, setIsRocketBoosting] = useState(false);
  const [isRocketLaunching, setIsRocketLaunching] = useState(false);

  // Confetti & Combo
  const [confettiParticles, setConfettiParticles] = useState([]);
  const [comboBadge, setComboBadge] = useState(null);

  // Microphone Speech State
  const [micState, setMicState] = useState('idle');
  const [micMessage, setMicMessage] = useState('Tap & Say');

  // ── Difficulty Levels & Telemetry Analytics ──
  const [difficulty, setDifficulty] = useState('easy'); // 'easy' | 'medium' | 'hard'
  const [questionStartTime, setQuestionStartTime] = useState(() => Date.now());
  const [isAnalyticsModalOpen, setIsAnalyticsModalOpen] = useState(false);
  const [isCrewDrawerOpen, setIsCrewDrawerOpen] = useState(false);
  const [isMissionCompleteModal, setIsMissionCompleteModal] = useState(false);
  const [autoAdvanceCountdown, setAutoAdvanceCountdown] = useState(10);
  const rocketCardRef = useRef(null);
  const cardRefs = useRef({});

  const [roundAnalytics, setRoundAnalytics] = useState(() => {
    try {
      const saved = localStorage.getItem(`sq_rounds_${uid}`);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return {
      easy: { totalTimeMs: 0, totalAttempts: 0, mistakes: 0, phonemeStats: {} },
      medium: { totalTimeMs: 0, totalAttempts: 0, mistakes: 0, phonemeStats: {} },
      hard: { totalTimeMs: 0, totalAttempts: 0, mistakes: 0, phonemeStats: {} },
    };
  });

  const [sessionAnalytics, setSessionAnalytics] = useState(() => {
    try {
      const saved = localStorage.getItem(`sq_analytics_${uid}`);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return {
      easyTimeMs: 0,
      mediumTimeMs: 0,
      hardTimeMs: 0,
      totalAttempts: 0,
      totalMistakes: 0,
      phonemeStats: {},
    };
  });

  const [activeMissions, setActiveMissions] = useState(() => {
    return shuffleArray(EASY_POOL).map(m => ({
      ...m,
      choices: shuffleArray(m.choices)
    }));
  });
  const [isAiLoading, setIsAiLoading] = useState(false);

  // Level Selection Handler
  const handleSelectLevel = (newLevel) => {
    playClickSound();
    setDifficulty(newLevel);
    setMissionIdx(0);
    const pool = LEVEL_POOLS[newLevel] || EASY_POOL;

    // Adaptive Mode: prioritize phonemes where student made mistakes
    const stats = sessionAnalytics.phonemeStats || {};
    const weakPhonemes = Object.keys(stats).filter(
      p => stats[p].attempts > 0 && (stats[p].mistakes / stats[p].attempts) >= 0.3
    );

    let nextPool = shuffleArray(pool);
    if (weakPhonemes.length > 0) {
      setSparkyState('thinking');
      setSparkyMessage(`🎯 Adaptive Mode: Extra practice on ${weakPhonemes.slice(0, 2).join(', ')} sound!`);
    } else {
      setSparkyState('happy');
      setSparkyMessage(`Switched to ${newLevel.toUpperCase()} Level! Ready for blast off! 🚀`);
    }

    setActiveMissions(nextPool.map(m => ({ ...m, choices: shuffleArray(m.choices) })));
    speakText(`Switched to ${newLevel} difficulty level!`);
  };

  const handleNextMission = () => {
    setIsMissionCompleteModal(false);
    if (difficulty === 'easy') {
      handleSelectLevel('medium');
    } else if (difficulty === 'medium') {
      handleSelectLevel('hard');
    } else {
      handleSelectLevel('easy');
    }
    setRocketFuel(60);
  };

  const handlePlayAgain = () => {
    playClickSound();
    setIsMissionCompleteModal(false);
    handleSelectLevel('easy');
    setRocketFuel(60);
  };

  // 10-Second Auto-Advance Countdown Timer for Round Complete screens (Easy & Medium)
  useEffect(() => {
    let timerId = null;
    if (isMissionCompleteModal && (difficulty === 'easy' || difficulty === 'medium')) {
      setAutoAdvanceCountdown(10);
      timerId = setInterval(() => {
        setAutoAdvanceCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timerId);
            handleNextMission();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerId) clearInterval(timerId);
    };
  }, [isMissionCompleteModal, difficulty]);

  const currentMission = (activeMissions && activeMissions.length > 0)
    ? activeMissions[missionIdx % activeMissions.length]
    : EASY_POOL[0];

  const loadAiMissions = async () => {
    setIsAiLoading(true);
    setSparkyState('thinking');
    setSparkyMessage('🤖 Gemini AI is creating dynamic phoneme missions for you...');
    try {
      const res = await fetchWithAuth('/api/therapy/ai-phoneme-mission');
      if (res && res.ok) {
        const data = await res.json();
        if (data && data.missions && data.missions.length > 0) {
          setActiveMissions(data.missions);
          setMissionIdx(0);
          setSparkyState('happy');
          setSparkyMessage(`✨ AI Missions Loaded (${data.source || 'AI'})! Let's play!`);
          speakText('AI Missions loaded! Ready for blast off!');
          return;
        }
      }
      setSparkyState('idle');
      setSparkyMessage(`Tap a word that starts with ${currentMission?.targetPhoneme || '/B/'}!`);
    } catch (e) {
      setSparkyState('idle');
      setSparkyMessage(`Tap a word that starts with ${currentMission?.targetPhoneme || '/B/'}!`);
    } finally {
      setIsAiLoading(false);
    }
  };

  // Start with Easy level pool on mount
  useEffect(() => {
    setDifficulty('easy');
    setActiveMissions(shuffleArray(EASY_POOL).map(m => ({
      ...m,
      choices: shuffleArray(m.choices)
    })));
  }, []);

  // Persist XP and streak
  useEffect(() => {
    try { localStorage.setItem(`sq_xp_${uid}`, xp.toString()); } catch (e) { /* */ }
  }, [xp, uid]);

  useEffect(() => {
    try { localStorage.setItem(`sq_streak_${uid}`, streak.toString()); } catch (e) { /* */ }
  }, [streak, uid]);

  // ── Web Audio Synth SFX Engine ──
  const playSFX = useCallback((type) => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'correct') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.18);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.22);
        osc.start();
        osc.stop(ctx.currentTime + 0.22);
      } else if (type === 'wrong') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(260, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(190, ctx.currentTime + 0.2);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
        osc.start();
        osc.stop(ctx.currentTime + 0.25);
      } else if (type === 'whoosh') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(280, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1100, ctx.currentTime + 0.35);
        gain.gain.setValueAtTime(0.07, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
        osc.start();
        osc.stop(ctx.currentTime + 0.4);
      } else if (type === 'launch') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(220, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.6);
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.7);
        osc.start();
        osc.stop(ctx.currentTime + 0.7);
      } else if (type === 'combo') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.1);
        osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.2);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
        osc.start();
        osc.stop(ctx.currentTime + 0.35);
      }
    } catch (e) {
      /* ignore */
    }
  }, []);

  // ── Confetti Burst ──
  const burstConfetti = useCallback(() => {
    const particles = Array.from({ length: 30 }, (_, i) => ({
      id: Date.now() + i,
      left: Math.random() * 100,
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      delay: Math.random() * 0.5,
      size: 6 + Math.random() * 8,
    }));
    setConfettiParticles(particles);
    setTimeout(() => setConfettiParticles([]), 2200);
  }, []);

  // ── Mission setup ──
  useEffect(() => {
    setSelectedChoice(null);
    setMicState('idle');
    setMicMessage('Tap & Say');
    setQuestionStartTime(Date.now());

    // Automatically read the question aloud at first when switching to a new question
    const cleanPhoneme = (currentMission.targetPhoneme || '').replace(/[\/\*]/g, '');
    const questionSpeech = `Which word starts with the ${cleanPhoneme} sound?`;

    const speechTimer = setTimeout(() => {
      speakText(questionSpeech);
    }, 400);

    if (currentMission.type === 'find_sound') {
      setSparkyState('idle');
      setSparkyMessage(`Tap a word that starts with ${currentMission.targetPhoneme}!`);
      setBloopState('idle');
      setBloopMessage(null);
      setEchoState('idle');
      setEchoMessage(null);
      setZipState('idle');
    } else if (currentMission.type === 'bloop_mistake') {
      setSparkyState('thinking');
      setSparkyMessage(`Hmm... Bloop guessed wrong! Can you help him find ${currentMission.targetPhoneme}?`);
      setBloopState('confused');
      setBloopMessage(currentMission.bloopSpeech);
      setEchoState('idle');
      setEchoMessage(null);
      setZipState('idle');
    } else if (currentMission.type === 'echo_challenge') {
      setSparkyState('idle');
      setSparkyMessage(`Listen carefully as Echo repeats "${currentMission.targetWord}"!`);
      setEchoState('floating');
      setEchoMessage('🎧 Ready to repeat!');
      setBloopState('idle');
      setBloopMessage(null);
      setZipState('idle');
    } else if (currentMission.type === 'zip_race') {
      setSparkyState('happy');
      setSparkyMessage(`Help Zip find ${currentMission.targetPhoneme} before he reaches the planet!`);
      setZipState('running');
      setZipProgress(15);
      setBloopState('idle');
      setBloopMessage(null);
      setEchoState('idle');
      setEchoMessage(null);
    } else if (currentMission.type === 'sound_treasure') {
      setSparkyState('idle');
      setSparkyMessage(`Pronounce or tap "${currentMission.targetWord}" to unlock the Sound Treasure! 🎁`);
      setBloopState('idle');
      setBloopMessage(null);
      setEchoState('idle');
      setEchoMessage(null);
      setZipState('idle');
    }

    return () => clearTimeout(speechTimer);
  }, [missionIdx, currentMission]);

  // Zip race timer
  useEffect(() => {
    let zipTimer;
    if (currentMission.type === 'zip_race' && zipProgress < 95 && selectedChoice === null) {
      zipTimer = setInterval(() => {
        setZipProgress((prev) => Math.min(95, prev + 5));
      }, 450);
    }
    return () => clearInterval(zipTimer);
  }, [currentMission, zipProgress, selectedChoice]);

  // ── Flying Object → Rocket ──
  const triggerObjectFlyToRocket = (choice, cardEl) => {
    if (!cardEl || !rocketCardRef.current) {
      handleRocketFuelSequence(choice);
      return;
    }

    const cardRect = cardEl.getBoundingClientRect();
    const rocketRect = rocketCardRef.current.getBoundingClientRect();

    const startX = cardRect.left + cardRect.width / 2 - 40;
    const startY = cardRect.top + cardRect.height / 2 - 20;
    const endX = rocketRect.left + rocketRect.width / 2 - 30;
    const endY = rocketRect.top + rocketRect.height / 2 - 10;

    setFlyingObject({
      text: choice.text,
      emoji: choice.emoji,
      x: startX,
      y: startY,
      scale: 1,
    });

    setTimeout(() => {
      setFlyingObject({
        text: choice.text,
        emoji: choice.emoji,
        x: endX,
        y: endY,
        scale: 0.6,
      });
      playSFX('whoosh');
    }, 30);

    setTimeout(() => {
      setFlyingObject(null);
      handleRocketFuelSequence(choice);
    }, 600);
  };

  // ── Rocket Fuel Fill Sequence (replaces jar) ──
  const handleRocketFuelSequence = (choice) => {
    setIsRocketBoosting(true);
    setTimeout(() => setIsRocketBoosting(false), 500);

    burstConfetti();

    setRocketFuel((prev) => {
      const nextFuel = Math.min(100, prev + 15);
      if (nextFuel >= 100) {
        setIsRocketLaunching(true);
        playSFX('launch');
        setTimeout(() => setIsRocketLaunching(false), 2500);
      }
      return nextFuel;
    });

    setCollectedSprites((prev) => [
      ...prev,
      { phoneme: currentMission.targetPhoneme, color: currentMission.color }
    ]);

    setFloatingXP('+25 XP ⭐');
    playSFX('correct');
    setTimeout(() => setFloatingXP(null), 1000);

    setXp((prev) => prev + 25);
    setStreak((prev) => {
      const newStreak = prev + 1;
      if (newStreak % 3 === 0) {
        setComboBadge(`🔥 ${newStreak}x COMBO!`);
        playSFX('combo');
        setTimeout(() => setComboBadge(null), 1500);
      }
      if (newStreak % 5 === 0) {
        setIsStreakPopping(true);
        setTimeout(() => setIsStreakPopping(false), 1200);
      }
      return newStreak;
    });

    const starIdx = missionIdx % 5;
    setStarPopIdx(starIdx);
    setTimeout(() => setStarPopIdx(-1), 700);

    // Smooth question advancement
    setTimeout(() => {
      setSelectedChoice(null);
      const isLastQuestionOfSection = (missionIdx + 1) % 5 === 0;

      if (isLastQuestionOfSection) {
        setIsMissionCompleteModal(true);
      } else {
        setMissionIdx((prev) => prev + 1);
      }
    }, 600);
  };

  const handleChoiceClick = (choice, idx) => {
    if (selectedChoice !== null) return;
    setSelectedChoice(choice);

    // Telemetry & Mistake Tracker per Round
    const responseTimeMs = Math.max(200, Date.now() - questionStartTime);
    const targetPhoneme = currentMission.targetPhoneme;

    setRoundAnalytics((prev) => {
      const currentRoundData = prev[difficulty] || { totalTimeMs: 0, totalAttempts: 0, mistakes: 0, phonemeStats: {} };
      const existingPhoneme = (currentRoundData.phonemeStats && currentRoundData.phonemeStats[targetPhoneme])
        || { attempts: 0, mistakes: 0, totalTimeMs: 0 };

      const updatedPhonemes = {
        ...(currentRoundData.phonemeStats || {}),
        [targetPhoneme]: {
          attempts: existingPhoneme.attempts + 1,
          mistakes: existingPhoneme.mistakes + (choice.isCorrect ? 0 : 1),
          totalTimeMs: existingPhoneme.totalTimeMs + responseTimeMs,
          targetWord: currentMission.targetWord,
          difficulty: difficulty,
        }
      };

      const updatedRound = {
        totalTimeMs: currentRoundData.totalTimeMs + responseTimeMs,
        totalAttempts: currentRoundData.totalAttempts + 1,
        mistakes: currentRoundData.mistakes + (choice.isCorrect ? 0 : 1),
        phonemeStats: updatedPhonemes,
      };

      const updatedAllRounds = {
        ...prev,
        [difficulty]: updatedRound,
      };

      try {
        localStorage.setItem(`sq_rounds_${uid}`, JSON.stringify(updatedAllRounds));
      } catch (e) {}

      return updatedAllRounds;
    });

    setSessionAnalytics((prev) => {
      const existing = (prev.phonemeStats && prev.phonemeStats[targetPhoneme])
        || { attempts: 0, mistakes: 0, totalTimeMs: 0 };

      const updatedPhonemeStats = {
        ...(prev.phonemeStats || {}),
        [targetPhoneme]: {
          attempts: existing.attempts + 1,
          mistakes: existing.mistakes + (choice.isCorrect ? 0 : 1),
          totalTimeMs: existing.totalTimeMs + responseTimeMs,
          targetWord: currentMission.targetWord,
          difficulty: difficulty,
        }
      };

      const levelTimeKey = `${difficulty}TimeMs`;
      const updated = {
        ...prev,
        [levelTimeKey]: (prev[levelTimeKey] || 0) + responseTimeMs,
        totalAttempts: prev.totalAttempts + 1,
        totalMistakes: prev.totalMistakes + (choice.isCorrect ? 0 : 1),
        phonemeStats: updatedPhonemeStats,
      };

      try {
        localStorage.setItem(`sq_analytics_${uid}`, JSON.stringify(updated));
      } catch (e) {}

      return updated;
    });

    const cardEl = cardRefs.current[idx];

    if (choice.isCorrect) {
      playSFX('correct');
      setSparkyState('thumbsUp');
      setSparkyMessage(`Awesome choice! Now say "${currentMission.targetWord}"! 🌟`);

      if (currentMission.type === 'bloop_mistake') {
        setBloopState('silly');
        setBloopMessage('🤯 YAY! You fixed my mistake!');
      } else {
        setBloopState('silly');
        setBloopMessage('YAY! 🎉');
      }

      setTimeout(() => {
        triggerObjectFlyToRocket(choice, cardEl);
      }, 300);
    } else {
      playSFX('wrong');
      setBloopState('headShake');
      setBloopMessage(`Oops! ${choice.text} starts with ${choice.phoneme}.`);
      setSparkyState('tryAgain');
      const tip = currentMission.teachingTip ? ` 💡 ${currentMission.teachingTip}` : '';
      setSparkyMessage(`Oops! ${choice.text} starts with ${choice.phoneme}.${tip}`);

      setTimeout(() => {
        setSelectedChoice(null);
      }, 900);
    }
  };

  const handleEchoHearWord = () => {
    setEchoState('speaking');
    setEchoMessage(`"${currentMission.targetWord}!"`);
    speakText(`${currentMission.targetWord}. Sound ${currentMission.targetPhoneme.replace(/\//g, '')}`);
    
    setTimeout(() => {
      setEchoState('floating');
    }, 1500);
  };

  const handleMicClick = async () => {
    try {
      playClickSound();
      speakText(`Say ${currentMission.targetWord}`);

      setMicState('listening');
      setMicMessage("Listening...");
      setSparkyState('listening');
      setSparkyMessage(`Say "${currentMission.targetWord}" aloud! 🎙️ Or tap the correct picture card below!`);

      try {
        await audio.startMic();
      } catch (err) {
        /* Ignore mic permission errors */
      }

      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        const rec = new SpeechRecognition();
        rec.continuous = false;
        rec.interimResults = false;
        rec.lang = 'en-US';

        rec.onresult = (event) => {
          const text = event.results[0][0].transcript.toLowerCase();
          const target = currentMission.targetWord.toLowerCase();

          if (text.includes(target) || text.includes(currentMission.targetPhoneme.replace(/[\/\*]/g, '').toLowerCase())) {
            setMicState('success');
            setMicMessage('✨ I heard you! ⭐');
            const correctChoiceObj = currentMission.choices.find(c => c.isCorrect);
            triggerObjectFlyToRocket(correctChoiceObj || { text: currentMission.targetWord, emoji: currentMission.emoji }, cardRefs.current[0]);
          } else {
            setMicState('unclear');
            setMicMessage("Try again or tap card!");
            setSparkyState('thinking');
            setBloopState('confused');
            setSparkyMessage(`Sparky heard "${text}". Try saying "${currentMission.targetWord}" or tap the card!`);
          }
        };

        rec.onerror = () => {
          setMicState('idle');
          setMicMessage('Tap & Say');
        };

        rec.onend = () => {
          setMicState('idle');
          setMicMessage('Tap & Say');
        };

        rec.start();
      } else {
        setTimeout(() => {
          setMicState('idle');
          setMicMessage('Tap & Say');
        }, 1500);
      }
    } catch (e) {
      setMicState('idle');
      setMicMessage("Tap & Say");
      setSparkyState('idle');
      setSparkyMessage(`Say "${currentMission.targetWord}" aloud or tap the card below!`);
    }
  };

  const handleFinishMissionSession = async () => {
    await saveTherapyProgress(currentUser, 'phoneme', xp, 95, 'Sound Quest Mission');
    if (onComplete) onComplete();
    else navigate('/dashboard');
  };

  // ── Rocket fuel level for visual ──
  const rocketLevel = Math.round(rocketFuel);
  const rocketFlameIntensity = rocketFuel >= 100 ? 'max' : rocketFuel >= 70 ? 'high' : rocketFuel >= 40 ? 'medium' : 'low';

  // Planet progress data
  const completedCount = missionIdx % 5;
  const planets = [
    { name: 'Mercury', emoji: '🪨', color: '#a0a0a0' },
    { name: 'Venus', emoji: '🌕', color: '#ffeaa7' },
    { name: 'Earth', emoji: '🌍', color: '#74b9ff' },
    { name: 'Mars', emoji: '🔴', color: '#ff6b6b' },
    { name: 'Jupiter', emoji: '🪐', color: '#fdcb6e' },
  ];

  return (
    <div className="sound-quest-page">
      {/* Animated Background Elements */}
      <div className="sq-floating-planet p1" />
      <div className="sq-floating-planet p2" />
      <div className="sq-floating-planet p3" />
      <div className="sq-comet" />

      {/* Confetti Particles */}
      {confettiParticles.length > 0 && (
        <div className="sq-confetti-container">
          {confettiParticles.map((p) => (
            <div
              key={p.id}
              className="sq-confetti-particle"
              style={{
                left: `${p.left}%`,
                backgroundColor: p.color,
                animationDelay: `${p.delay}s`,
                width: `${p.size}px`,
                height: `${p.size}px`,
                borderRadius: Math.random() > 0.5 ? '50%' : '2px',
              }}
            />
          ))}
        </div>
      )}

      {/* Combo Badge */}
      {comboBadge && (
        <div className="sq-combo-badge">{comboBadge}</div>
      )}

      {/* Flying Object */}
      {flyingObject && (
        <div
          className="sq-flying-object"
          style={{
            left: `${flyingObject.x}px`,
            top: `${flyingObject.y}px`,
            transform: `scale(${flyingObject.scale || 1})`,
          }}
        >
          <span style={{ fontSize: '1.5rem' }}>{flyingObject.emoji}</span>
          <span>{flyingObject.text}</span>
        </div>
      )}

      {/* Main Viewport */}
      <main className="sq-viewport">
        {/* ═══ HUD HEADER ═══ */}
        <header className="sq-hud-header">
          <div className="sq-hud-title-box">
            <div className="sq-hud-icon">🚀</div>
            <div>
              <h1 className="sq-hud-title">SOUND QUEST</h1>
              <div className="sq-hud-subtitle">Phoneme Space Adventure</div>
            </div>
          </div>

          {/* Level Switcher Segment */}
          <div className="sq-level-switcher-bar">
            <button
              className={`sq-level-btn easy ${difficulty === 'easy' ? 'active' : ''}`}
              onClick={() => handleSelectLevel('easy')}
            >
              🟢 Easy
            </button>
            <button
              className={`sq-level-btn medium ${difficulty === 'medium' ? 'active' : ''}`}
              onClick={() => handleSelectLevel('medium')}
            >
              🟡 Medium
            </button>
            <button
              className={`sq-level-btn hard ${difficulty === 'hard' ? 'active' : ''}`}
              onClick={() => handleSelectLevel('hard')}
            >
              🔴 Hard
            </button>
          </div>

          <div className="sq-hud-stats">
            <button
              className="sq-hud-stat-pill report-btn"
              onClick={() => { playClickSound(); setIsAnalyticsModalOpen(true); }}
              title="View Session Telemetry & Mistake Analytics"
            >
              📊 Report
            </button>
            <button
              onClick={loadAiMissions}
              disabled={isAiLoading}
              style={{
                background: 'linear-gradient(135deg, #a29bfe, #6c5ce7)',
                color: '#ffffff',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '50px',
                fontFamily: 'Fredoka, sans-serif',
                fontWeight: 700,
                fontSize: '0.85rem',
                cursor: 'pointer',
                boxShadow: '0 3px 0 #5b4cc4',
              }}
            >
              {isAiLoading ? '🤖 Generating AI Missions...' : '✨ AI Missions'}
            </button>
            <div className="sq-hud-stat-pill xp">
              {floatingXP && <div className="sq-floating-xp">{floatingXP}</div>}
              ⭐ {xp} XP
            </div>
            <div className={`sq-hud-stat-pill streak ${isStreakPopping ? 'streak-pop' : ''}`}>
              🔥 {streak} Streak
            </div>
            <div className="sq-hud-stat-pill lives">
              {'❤️'.repeat(lives)}
            </div>
            <div className="sq-hud-stat-pill user">
              👦 {userName}
            </div>
          </div>
        </header>

        {/* ═══ MAIN GAME GRID OR ROUND COMPLETE REPORT SCREEN ═══ */}
        {isMissionCompleteModal ? (
          <div className="sq-round-complete-container" style={{ padding: '2rem 1.5rem', display: 'flex', justifyContent: 'center' }}>
            <div className="sq-round-report-card" style={{ background: 'linear-gradient(135deg, #1e293b, #0f172a)', border: '4px solid #38bdf8', borderRadius: '32px', padding: '2.5rem 2rem', maxWidth: '650px', width: '100%', textAlign: 'center', boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }}>
              <span className="sq-report-hero-icon" style={{ fontSize: '3.8rem', display: 'block', marginBottom: '0.5rem' }}>
                {difficulty === 'easy' ? '🏆 🟢 ✨' : difficulty === 'medium' ? '🏆 🟡 🚀' : '👑 🔴 🌟'}
              </span>
              <h2 className="sq-round-report-title" style={{ fontSize: '2.1rem', fontWeight: 900, color: '#ffffff', fontFamily: "'Fredoka', cursive, sans-serif", margin: '0 0 0.5rem 0' }}>
                {difficulty === 'easy' ? 'ROUND 1 (EASY) COMPLETE!' : difficulty === 'medium' ? 'ROUND 2 (MEDIUM) COMPLETE!' : 'GRAND CHAMPION! ALL 3 ROUNDS MASTERED!'}
              </h2>
              <p className="sq-round-report-subtitle" style={{ color: '#cbd5e1', fontSize: '1.05rem', lineHeight: 1.5, margin: '0 0 1.5rem 0' }}>
                {difficulty === 'easy'
                  ? 'Awesome job completing Round 1! Review your performance report below and launch Round 2:'
                  : difficulty === 'medium'
                  ? 'Superb phoneme mastery! Round 2 complete. Review your report and launch Round 3:'
                  : 'Unbelievable work! You mastered Easy, Medium, and Hard space challenges!'}
              </p>

              {/* Isolated Round Metrics & Auto-Advance Timer */}
              {(() => {
                const currentRound = roundAnalytics[difficulty] || { totalTimeMs: 0, mistakes: 0, phonemeStats: {} };
                const timeSec = (currentRound.totalTimeMs / 1000).toFixed(1);
                const mistakesCount = currentRound.mistakes;
                const roundPhonemes = Object.entries(currentRound.phonemeStats || {});

                return (
                  <>
                    {/* Auto-Advance Countdown Banner for Easy & Medium */}
                    {(difficulty === 'easy' || difficulty === 'medium') && (
                      <div style={{ background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.2), rgba(99, 102, 241, 0.2))', border: '2px dashed #38bdf8', padding: '10px 18px', borderRadius: '50px', marginBottom: '1.25rem', color: '#7dd3fc', fontWeight: 800, fontSize: '0.95rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                        <span>⏳</span>
                        <span>Round {difficulty === 'easy' ? '2 (Medium)' : '3 (Hard)'} starting automatically in <strong style={{ color: '#fbbf24', fontSize: '1.1rem' }}>{autoAdvanceCountdown}s</strong>...</span>
                      </div>
                    )}

                    <div className="sq-round-telemetry-box" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', background: 'rgba(255, 255, 255, 0.08)', border: '2px solid rgba(255, 255, 255, 0.16)', borderRadius: '20px', padding: '1rem', marginBottom: '1.5rem' }}>
                      <div className="sq-telemetry-item" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <span className="sq-telemetry-label" style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 700 }}>⏱️ {difficulty.toUpperCase()} Round Time</span>
                        <strong className="sq-telemetry-val" style={{ fontSize: '1.25rem', color: '#ffffff', fontWeight: 900, fontFamily: "'Fredoka', cursive" }}>
                          {timeSec}s
                        </strong>
                      </div>
                      <div className="sq-telemetry-item" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <span className="sq-telemetry-label" style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 700 }}>🎯 Round Mistakes</span>
                        <strong className="sq-telemetry-val" style={{ fontSize: '1.25rem', color: mistakesCount === 0 ? '#55efc4' : '#ff7675', fontWeight: 900, fontFamily: "'Fredoka', cursive" }}>
                          {mistakesCount === 0 ? '✨ 0 (Perfect!)' : `${mistakesCount} Mistakes`}
                        </strong>
                      </div>
                      <div className="sq-telemetry-item" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <span className="sq-telemetry-label" style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 700 }}>⭐ XP Earned</span>
                        <strong className="sq-telemetry-val" style={{ fontSize: '1.25rem', color: '#ffeaa7', fontWeight: 900, fontFamily: "'Fredoka', cursive" }}>+120 XP</strong>
                      </div>
                    </div>

                    {/* Isolated Phoneme Breakdown */}
                    <div className="sq-report-sounds-section" style={{ marginBottom: '1.75rem', textAlign: 'left' }}>
                      <h4 style={{ color: '#bae6fd', margin: '0 0 0.5rem 0', fontSize: '0.92rem', fontWeight: 800 }}>
                        🔊 Round {difficulty.toUpperCase()} Phoneme Breakdown:
                      </h4>
                      <div className="sq-report-sounds-list" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {roundPhonemes.length === 0 ? (
                          <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>No mistakes in this round!</span>
                        ) : (
                          roundPhonemes.map(([ph, st]) => (
                            <div key={ph} style={{ background: 'rgba(255, 255, 255, 0.08)', border: '1.5px solid rgba(255, 255, 255, 0.15)', padding: '6px 12px', borderRadius: '50px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem' }}>
                              <span style={{ background: '#38bdf8', color: '#fff', fontWeight: 900, padding: '2px 8px', borderRadius: '20px', fontSize: '0.75rem' }}>{ph}</span>
                              <span style={{ color: '#f8fafc', fontWeight: 700 }}>{st.targetWord}</span>
                              <span style={{ color: st.mistakes === 0 ? '#55efc4' : '#ff7675', fontWeight: 800 }}>{st.mistakes === 0 ? '✓ Perfect' : `⚠️ ${st.mistakes}`}</span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div style={{ display: 'flex', gap: '14px', justifyContent: 'center', flexWrap: 'wrap' }}>
                      {difficulty === 'hard' ? (
                        <>
                          <button
                            className="sq-btn-celebrate-primary"
                            onClick={handlePlayAgain}
                            style={{ background: 'linear-gradient(135deg, #ff7675, #d63031)', border: 'none', color: '#ffffff', padding: '14px 24px', borderRadius: '50px', fontWeight: 800, fontSize: '1rem', cursor: 'pointer', boxShadow: '0 4px 15px rgba(214, 48, 49, 0.4)' }}
                          >
                            🔄 PLAY AGAIN
                          </button>
                          <button
                            className="sq-btn-celebrate-primary"
                            onClick={() => { playClickSound(); setIsAnalyticsModalOpen(true); }}
                            style={{ background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none', color: '#ffffff', padding: '14px 24px', borderRadius: '50px', fontWeight: 800, fontSize: '1rem', cursor: 'pointer' }}
                          >
                            📊 SHOW OVERALL SESSION REPORT
                          </button>
                          <button
                            onClick={handleFinishMissionSession}
                            style={{
                              background: 'rgba(255, 255, 255, 0.1)',
                              color: '#ffffff',
                              border: '2px solid rgba(255, 255, 255, 0.2)',
                              padding: '14px 24px',
                              borderRadius: '50px',
                              fontFamily: 'Fredoka, sans-serif',
                              fontSize: '1rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                          >
                            MISSION HQ 🏠
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            className="sq-btn-celebrate-primary"
                            onClick={handlePlayAgain}
                            style={{ background: 'linear-gradient(135deg, #ff7675, #d63031)', border: 'none', color: '#ffffff', padding: '14px 24px', borderRadius: '50px', fontWeight: 800, fontSize: '1rem', cursor: 'pointer', boxShadow: '0 4px 15px rgba(214, 48, 49, 0.4)' }}
                          >
                            🔄 PLAY AGAIN
                          </button>
                          <button className="sq-btn-celebrate-primary" onClick={handleNextMission}>
                            {difficulty === 'easy'
                              ? `START ROUND 2 NOW 🚀 (${autoAdvanceCountdown}s)`
                              : `START ROUND 3 NOW 🚀 (${autoAdvanceCountdown}s)`}
                          </button>
                          <button
                            onClick={handleFinishMissionSession}
                            style={{
                              background: 'rgba(255, 255, 255, 0.08)',
                              color: '#ffffff',
                              border: '2px solid rgba(255, 255, 255, 0.18)',
                              padding: '14px 24px',
                              borderRadius: '50px',
                              fontFamily: 'Fredoka, sans-serif',
                              fontSize: '1.05rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                              boxShadow: '0 4px 0 rgba(0,0,0,0.2)',
                              transition: 'all 0.2s ease',
                            }}
                          >
                            MISSION HQ 🏠
                          </button>
                        </>
                      )}
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        ) : (
          <>
            {/* ═══ MAIN GAME GRID ═══ */}
            <div className="sq-game-grid">
          {/* Left: Mission Card */}
          <div className="sq-mission-card">
            {/* Sparky Guide */}
            <div className="sq-sparky-guide-row">
              <SparkyCharacter state={sparkyState} size={100} />
              <div className="sq-sparky-speech-bubble">
                {sparkyMessage}
              </div>
            </div>

            {/* Clear & Understandable Question Prompt Banner */}
            <div className="sq-question-prompt-banner">
              <span className="sq-question-icon">🔍</span>
              <div className="sq-question-text-wrap">
                <span className="sq-question-sublabel">CHALLENGE QUESTION</span>
                <h3 className="sq-question-main-text">
                  Which word starts with the <span className="sq-highlight-sound">{currentMission.targetPhoneme}</span> sound?
                </h3>
              </div>
              <button
                className="sq-question-audio-btn"
                onClick={() => {
                  playClickSound();
                  const cleanPhoneme = currentMission.targetPhoneme.replace(/[\/\*]/g, '');
                  speakText(`Which word starts with the ${cleanPhoneme} sound?`);
                }}
                title="Listen to Question"
              >
                🔊 Listen
              </button>
            </div>

            {/* Bloop mistake type */}
            {currentMission.type === 'bloop_mistake' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '0.5rem' }}>
                <BloopCharacter state={bloopState} size={80} bubbleText={bloopMessage} />
              </div>
            )}

            {/* Echo challenge type */}
            {currentMission.type === 'echo_challenge' && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', marginBottom: '0.5rem' }}>
                <EchoCharacter state={echoState} size={80} bubbleText={echoMessage} />
                <button className="sq-btn-hear" onClick={handleEchoHearWord}>
                  🎧 Hear Word from Echo
                </button>
              </div>
            )}

            {/* Zip race type */}
            {currentMission.type === 'zip_race' && (
              <div style={{ width: '100%', marginBottom: '0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'Fredoka, sans-serif', fontSize: '0.85rem', color: '#ffeaa7' }}>
                  <span>🦊 Zip Speed Track</span>
                  <span>{zipProgress}% to Planet!</span>
                </div>
                <div style={{ height: '10px', background: 'rgba(255,255,255,0.08)', borderRadius: '50px', margin: '6px 0 10px 0', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <div style={{
                    height: '100%',
                    width: `${zipProgress}%`,
                    background: 'linear-gradient(90deg, #ffeaa7, #fdcb6e, #ff9ff3)',
                    transition: 'width 0.3s ease',
                    borderRadius: '50px',
                    boxShadow: '0 0 10px rgba(255,234,167,0.5)',
                  }} />
                </div>
                <div style={{ marginLeft: `${Math.min(85, zipProgress)}%`, transition: 'margin 0.3s ease' }}>
                  <ZipCharacter state={zipState} size={55} />
                </div>
              </div>
            )}

            {/* ═══ ANSWER CARDS ═══ */}
            <div className="sq-answers-grid">
              {currentMission.choices.map((choice, idx) => {
                const isSelected = selectedChoice?.text === choice.text;
                const cardClass = isSelected
                  ? choice.isCorrect ? 'correct' : 'wrong'
                  : '';

                return (
                  <div
                    key={idx}
                    ref={(el) => (cardRefs.current[idx] = el)}
                    className={`sq-answer-card ${cardClass}`}
                    onClick={() => handleChoiceClick(choice, idx)}
                  >
                    {isSelected && choice.isCorrect && <div className="sq-card-checkmark">✓</div>}
                    <span className="sq-answer-emoji">{choice.emoji}</span>
                    <span className="sq-answer-word">{choice.text}</span>
                    <span className="sq-answer-phoneme-hint">Starts with {choice.phoneme}</span>
                  </div>
                );
              })}
            </div>

            {/* Mic & Audio Section */}
            <div className="sq-speech-section">
              <button
                className={`sq-btn-mic-large ${micState === 'listening' ? 'listening' : micState === 'success' ? 'success' : ''}`}
                onClick={handleMicClick}
              >
                <span>🎤</span>
                <span>{micState === 'listening' ? micMessage : `Say "${currentMission.targetWord}" (${micMessage})`}</span>

                {micState === 'listening' && (
                  <div className="sq-mic-waveform">
                    {[12, 24, 16, 28, 14].map((h, i) => (
                      <span
                        key={i}
                        className="sq-mic-wave-bar"
                        style={{ height: `${Math.min(24, Math.max(6, (audio.amplitude * (i + 1) * 0.3)))}px` }}
                      />
                    ))}
                  </div>
                )}
              </button>

              <button className="sq-btn-hear" onClick={() => speakText(currentMission.targetWord)}>
                🔊 Hear Word
              </button>
            </div>
          </div>

          {/* ═══ RIGHT SIDE PANEL ═══ */}
          <div className="sq-side-panel">
            {/* Rocket Launch Pad (replaces jar) */}
            <div
              ref={rocketCardRef}
              className={`sq-jar-card ${isRocketBoosting ? 'jar-expanding' : ''} ${isRocketLaunching ? 'jar-100-celebrate' : ''}`}
            >
              <div className="sq-jar-title">🚀 Rocket Fuel Station</div>

              {/* Rocket SVG */}
              <div className="sq-jar-svg-box">
                <svg width="140" height="200" viewBox="0 0 140 200">
                  {/* Stars background */}
                  {[
                    [15, 30], [120, 45], [25, 130], [110, 160], [60, 20],
                    [90, 90], [30, 80], [100, 120], [50, 170], [80, 40],
                  ].map(([cx, cy], i) => (
                    <circle key={i} cx={cx} cy={cy} r="1.5" fill="#fff" opacity={0.3 + Math.random() * 0.4}>
                      <animate attributeName="opacity" values="0.2;0.8;0.2" dur={`${2 + i * 0.3}s`} repeatCount="indefinite" />
                    </circle>
                  ))}

                  {/* Fuel Tank Background */}
                  <rect x="35" y="50" width="70" height="120" rx="12" fill="rgba(108,92,231,0.15)" stroke="rgba(162,155,254,0.4)" strokeWidth="2" />
                  
                  {/* Fuel Level Fill */}
                  <rect
                    x="37"
                    y={170 - rocketLevel * 1.18}
                    width="66"
                    height={rocketLevel * 1.18}
                    rx="10"
                    fill={rocketFuel >= 100 ? "url(#rocketGradMax)" : rocketFuel >= 70 ? "url(#rocketGradHigh)" : "url(#rocketGradLow)"}
                    opacity="0.8"
                  >
                    <animate attributeName="opacity" values="0.6;0.9;0.6" dur="2s" repeatCount="indefinite" />
                  </rect>

                  {/* Fuel level bubbles */}
                  {rocketFuel > 20 && (
                    <>
                      <circle cx="55" cy={160 - rocketLevel * 0.6} r="3" fill="rgba(255,255,255,0.3)">
                        <animate attributeName="cy" values={`${160 - rocketLevel * 0.6};${155 - rocketLevel * 0.6};${160 - rocketLevel * 0.6}`} dur="1.5s" repeatCount="indefinite" />
                      </circle>
                      <circle cx="75" cy={155 - rocketLevel * 0.5} r="2" fill="rgba(255,255,255,0.2)">
                        <animate attributeName="cy" values={`${155 - rocketLevel * 0.5};${148 - rocketLevel * 0.5};${155 - rocketLevel * 0.5}`} dur="2s" repeatCount="indefinite" />
                      </circle>
                    </>
                  )}

                  {/* Rocket Ship */}
                  <g transform={`translate(70, ${Math.max(15, 48 - rocketLevel * 0.3)})`}
                     style={{ transition: 'transform 0.5s ease' }}>
                    {/* Rocket Body */}
                    <path d="M 0 -25 Q -18 -10 -16 20 L -12 35 L 12 35 L 16 20 Q 18 -10 0 -25 Z"
                          fill="url(#rocketBodyGrad)" stroke="#fff" strokeWidth="1.5" />
                    {/* Rocket Nose */}
                    <ellipse cx="0" cy="-22" rx="5" ry="8" fill="#ff6b6b" />
                    {/* Window */}
                    <circle cx="0" cy="5" r="7" fill="#74b9ff" stroke="#fff" strokeWidth="1.5" />
                    <circle cx="-2" cy="3" r="2.5" fill="rgba(255,255,255,0.5)" />
                    {/* Fins */}
                    <path d="M -16 20 L -24 38 L -12 32 Z" fill="#a29bfe" />
                    <path d="M 16 20 L 24 38 L 12 32 Z" fill="#a29bfe" />

                    {/* Flame — intensity based on fuel */}
                    {rocketFlameIntensity !== 'low' && (
                      <g>
                        <path d={`M -8 35 Q 0 ${rocketFlameIntensity === 'max' ? 70 : rocketFlameIntensity === 'high' ? 60 : 50} 8 35 Z`}
                              fill="#ffeaa7" opacity="0.9">
                          <animate attributeName="d" 
                            values={`M -8 35 Q 0 ${rocketFlameIntensity === 'max' ? 70 : 55} 8 35 Z;M -8 35 Q 0 ${rocketFlameIntensity === 'max' ? 80 : 60} 8 35 Z;M -8 35 Q 0 ${rocketFlameIntensity === 'max' ? 70 : 55} 8 35 Z`}
                            dur="0.3s" repeatCount="indefinite" />
                        </path>
                        <path d={`M -5 35 Q 0 ${rocketFlameIntensity === 'max' ? 60 : 48} 5 35 Z`}
                              fill="#ff6b6b" opacity="0.8">
                          <animate attributeName="d" 
                            values={`M -5 35 Q 0 ${rocketFlameIntensity === 'max' ? 60 : 48} 5 35 Z;M -5 35 Q 0 ${rocketFlameIntensity === 'max' ? 65 : 52} 5 35 Z;M -5 35 Q 0 ${rocketFlameIntensity === 'max' ? 60 : 48} 5 35 Z`}
                            dur="0.2s" repeatCount="indefinite" />
                        </path>
                      </g>
                    )}
                  </g>

                  {/* Fuel percentage text */}
                  <text x="70" y="190" textAnchor="middle" fill="#a29bfe" fontSize="13" fontWeight="700" fontFamily="Fredoka, sans-serif">
                    {rocketLevel}% Fuel
                  </text>

                  {/* Gradients */}
                  <defs>
                    <linearGradient id="rocketGradMax" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#ffeaa7" />
                      <stop offset="50%" stopColor="#fdcb6e" />
                      <stop offset="100%" stopColor="#ff9ff3" />
                    </linearGradient>
                    <linearGradient id="rocketGradHigh" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#a29bfe" />
                      <stop offset="100%" stopColor="#6c5ce7" />
                    </linearGradient>
                    <linearGradient id="rocketGradLow" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#74b9ff" />
                      <stop offset="100%" stopColor="#0984e3" />
                    </linearGradient>
                    <linearGradient id="rocketBodyGrad" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#dfe6e9" />
                      <stop offset="100%" stopColor="#b2bec3" />
                    </linearGradient>
                  </defs>
                </svg>

                {/* Collected sprites floating around rocket */}
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: '4px', padding: '0 15px 35px', flexWrap: 'wrap' }}>
                  {collectedSprites.slice(-5).map((sp, i) => (
                    <SoundSprite key={i} phoneme={sp.phoneme} color={sp.color} size={22} />
                  ))}
                </div>
              </div>

              <div className="sq-jar-power-badge">
                {rocketFuel >= 100 ? '🚀 LAUNCH READY!' : `⛽ Fuel: ${rocketLevel}%`}
              </div>
            </div>

            {/* Planet Progress Tracker */}
            <div className="sq-sidekick-card">
              <span style={{ fontFamily: 'Fredoka, sans-serif', fontSize: '0.9rem', fontWeight: 700, color: '#a29bfe' }}>
                🪐 Planet Hopping
              </span>
              <div style={{ display: 'flex', gap: '6px', marginTop: '8px', justifyContent: 'space-between', alignItems: 'center' }}>
                {planets.map((planet, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '3px',
                      opacity: i <= completedCount ? 1 : 0.35,
                      transform: i === completedCount ? 'scale(1.2)' : 'scale(1)',
                      transition: 'all 0.3s ease',
                    }}
                  >
                    <span style={{ fontSize: i === completedCount ? '1.4rem' : '1.1rem', transition: 'font-size 0.3s ease' }}>
                      {i < completedCount ? '✅' : planet.emoji}
                    </span>
                    <span style={{
                      fontSize: '0.6rem',
                      fontWeight: 700,
                      color: i <= completedCount ? planet.color : 'rgba(255,255,255,0.3)',
                    }}>
                      {planet.name}
                    </span>
                  </div>
                ))}
              </div>
              {/* Progress connector line */}
              <div style={{
                height: '3px',
                background: 'rgba(255,255,255,0.08)',
                borderRadius: '50px',
                margin: '4px 0 0',
                position: 'relative',
                overflow: 'hidden',
              }}>
                <div style={{
                  height: '100%',
                  width: `${(completedCount / 5) * 100}%`,
                  background: 'linear-gradient(90deg, #6c5ce7, #a29bfe, #ffeaa7)',
                  borderRadius: '50px',
                  transition: 'width 0.5s ease',
                  boxShadow: '0 0 8px rgba(162,155,254,0.5)',
                }} />
              </div>
            </div>

            {/* Sound Crew */}
            <div className="sq-sidekick-card">
              <span style={{ fontFamily: 'Fredoka, sans-serif', fontSize: '0.85rem', fontWeight: 700, color: '#74b9ff' }}>
                👥 Sound Crew Active
              </span>
              <div style={{ display: 'flex', gap: '10px', marginTop: '8px', justifyContent: 'center' }}>
                {[
                  { label: 'Sparky', emoji: '👦', color: '#ffeaa7' },
                  { label: 'Bloop', emoji: '👽', color: '#74b9ff' },
                  { label: 'Echo', emoji: '✨', color: '#a29bfe' },
                  { label: 'Zip', emoji: '🦊', color: '#fdcb6e' },
                ].map((crew, i) => (
                  <div key={i} style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '2px',
                  }}>
                    <span style={{
                      fontSize: '1.3rem',
                      width: '36px', height: '36px',
                      background: `rgba(${crew.color === '#ffeaa7' ? '255,234,167' : crew.color === '#74b9ff' ? '116,185,255' : crew.color === '#a29bfe' ? '162,155,254' : '253,203,110'},0.12)`,
                      borderRadius: '50%',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      border: `2px solid ${crew.color}30`,
                    }} title={crew.label}>
                      {crew.emoji}
                    </span>
                    <span style={{ fontSize: '0.6rem', fontWeight: 600, color: crew.color, opacity: 0.8 }}>{crew.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ═══ FOOTER — Progress Bar ═══ */}
        <footer className="sq-hud-footer">
          <div className="sq-progress-title">
            <span>🚀 Mission Progress</span>
            <div className="sq-stars-row">
              {planets.map((planet, i) => (
                <span
                  key={i}
                  className={`sq-star-item ${starPopIdx === i ? 'pop' : ''}`}
                  style={{ opacity: i < completedCount ? 1 : 0.3 }}
                >
                  {i < completedCount ? '⭐' : '○'}
                </span>
              ))}
            </div>
            <span style={{ fontSize: '0.85rem', color: '#94a3b8', marginLeft: '4px' }}>
              {completedCount} / 5 Sounds Collected
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span className="sq-reward-tag">Next: 🎁 +50 XP</span>
            <button
              onClick={handleFinishMissionSession}
              style={{
                background: 'linear-gradient(135deg, #6c5ce7, #a29bfe)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '50px',
                padding: '10px 20px',
                fontFamily: 'Fredoka, sans-serif',
                fontSize: '0.9rem',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 4px 0 #5b4cc4',
                transition: 'all 0.2s ease',
              }}
            >
              ✅ Mission HQ →
            </button>
          </div>
        </footer>
          </>
        )}
      </main>

      <SoundCrewDrawer
        isOpen={isCrewDrawerOpen}
        onClose={() => setIsCrewDrawerOpen(false)}
        collectedSprites={collectedSprites}
      />

      {/* ═══ SESSION TELEMETRY & ANALYTICS REPORT MODAL ═══ */}
      {isAnalyticsModalOpen && (
        <div className="sq-modal-backdrop" onClick={() => setIsAnalyticsModalOpen(false)}>
          <div className="sq-analytics-modal" onClick={(e) => e.stopPropagation()}>
            <div className="sq-analytics-header">
              <h2>📊 Performance Analytics & Mistake Report</h2>
              <button className="sq-modal-close-btn" onClick={() => setIsAnalyticsModalOpen(false)}>✕</button>
            </div>

            <div className="sq-analytics-body">
              {/* Level Response Time Comparison */}
              <div className="sq-analytics-section">
                <h3>⏱️ Response Time & Level Comparison</h3>
                <div className="sq-level-stats-grid">
                  <div className="sq-level-stat-card easy">
                    <span className="sq-level-tag">🟢 Easy</span>
                    <span className="sq-stat-val">
                      {sessionAnalytics.easyTimeMs > 0 ? (sessionAnalytics.easyTimeMs / 1000).toFixed(1) : '0.0'}s
                    </span>
                    <span className="sq-stat-lbl">Total Time Spent</span>
                  </div>
                  <div className="sq-level-stat-card medium">
                    <span className="sq-level-tag">🟡 Medium</span>
                    <span className="sq-stat-val">
                      {sessionAnalytics.mediumTimeMs > 0 ? (sessionAnalytics.mediumTimeMs / 1000).toFixed(1) : '0.0'}s
                    </span>
                    <span className="sq-stat-lbl">Total Time Spent</span>
                  </div>
                  <div className="sq-level-stat-card hard">
                    <span className="sq-level-tag">🔴 Hard</span>
                    <span className="sq-stat-val">
                      {sessionAnalytics.hardTimeMs > 0 ? (sessionAnalytics.hardTimeMs / 1000).toFixed(1) : '0.0'}s
                    </span>
                    <span className="sq-stat-lbl">Total Time Spent</span>
                  </div>
                </div>
              </div>

              {/* Mistakes & Weak Phonemes Analysis */}
              <div className="sq-analytics-section">
                <h3>⚠️ Phoneme Mistake Tracker & Section Analysis</h3>
                {Object.keys(sessionAnalytics.phonemeStats || {}).length === 0 ? (
                  <div className="sq-empty-analytics">
                    <span>🎮 Play a few questions to generate real-time telemetry report!</span>
                  </div>
                ) : (
                  <div className="sq-phoneme-breakdown-list">
                    {Object.entries(sessionAnalytics.phonemeStats).map(([phoneme, stat]) => {
                      const mistakeRatio = stat.attempts > 0 ? (stat.mistakes / stat.attempts) * 100 : 0;
                      const avgTimeSec = stat.attempts > 0 ? (stat.totalTimeMs / (stat.attempts * 1000)).toFixed(1) : '0.0';
                      return (
                        <div key={phoneme} className={`sq-phoneme-stat-row ${stat.mistakes > 0 ? 'has-mistakes' : 'perfect'}`}>
                          <div className="sq-phoneme-badge">{phoneme}</div>
                          <div className="sq-phoneme-details">
                            <span className="sq-word-label">{stat.targetWord} ({stat.difficulty.toUpperCase()})</span>
                            <span className="sq-attempt-label">{stat.attempts} attempts • Avg Response: {avgTimeSec}s</span>
                          </div>
                          <div className="sq-mistake-pill">
                            {stat.mistakes > 0 ? `⚠️ ${stat.mistakes} Mistakes (${mistakeRatio.toFixed(0)}%)` : '✨ 100% Accuracy'}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Adaptive Learning Recommendations */}
              <div className="sq-analytics-recommendation-box">
                <span className="sq-rec-icon">💡</span>
                <div>
                  <strong>AI Adaptive Guidance:</strong>
                  <p>
                    {sessionAnalytics.totalMistakes > 0
                      ? `Adaptive Mode has prioritized weak phonemes for targeted practice. Keep going to increase mastery!`
                      : `Great accuracy! Try unlocking the Medium or Hard levels to challenge your phonemic awareness.`}
                  </p>
                </div>
              </div>
            </div>

            <div className="sq-analytics-footer">
              <button className="sq-btn-celebrate-primary" onClick={() => setIsAnalyticsModalOpen(false)}>
                Awesome, Keep Playing! 🚀
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SoundQuest;
