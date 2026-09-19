import React, { useState, useEffect, useCallback } from 'react';
import './DysTherapyKids.css';
import { useAuth } from '../auth/AuthContext';
import { saveTherapyProgress } from './ExerciseSystem';
import { speakText } from '../../utils/speechHelper';

// Audio feedback helper using natural voice helper
const speak = (text) => {
  speakText(text, { rate: 0.92, pitch: 1.08 });
};

// Fun emoji arrays for random decorations & rewards
const CHEER_EMOJIS = ['🎉', '🥳', '🌟', '🎊', '💥', '⚡', '🦄', '🌈', '🎪', '🏆', '💎'];
const WRONG_EMOJIS = ['🤔', '💭', '🧐', '🫣', '🙈', '💡'];
const randomEmoji = (arr) => arr[Math.floor(Math.random() * arr.length)];

// Mascot Skins
const MASCOT_SKINS = [
  { id: 'default', name: 'Lexi Classic', emoji: '🦉', cost: 0 },
  { id: 'ninja', name: 'Ninja Owl', emoji: '🥷', cost: 100 },
  { id: 'superhero', name: 'Super Owl', emoji: '🦸', cost: 200 },
  { id: 'dj', name: 'DJ Beats', emoji: '🎧', cost: 300 },
  { id: 'robot', name: 'Robo-Lexi', emoji: '🤖', cost: 400 },
];

// Level Definitions
const LEVELS = [
  { id: 1, name: 'Level 1: Baby Explorer 🐣', speed: 1, timer: 35, color: '#38bdf8', emoji: '🐣' },
  { id: 2, name: 'Level 2: Speed Ninja 🥷', speed: 1.6, timer: 28, color: '#fbbf24', emoji: '🥷' },
  { id: 3, name: 'Level 3: Master Hero 🦸', speed: 2.2, timer: 22, color: '#a78bfa', emoji: '🦸' }
];

// ─────────────────────────────────────────────────────────────────
// ZONE GAME DATA
// ─────────────────────────────────────────────────────────────────

// Zone 1: Phoneme Monster Arena (Phonological Dyslexia)
const PHONEME_MONSTER_ROUNDS = [
  { target: 'SH', word: 'Ship 🚢', monsters: ['SH', 'CH', 'TH', 'PH'], prompt: 'Zap the "SH" sound as in Ship!' },
  { target: 'CH', word: 'Chair 🪑', monsters: ['CH', 'SH', 'WH', 'CK'], prompt: 'Zap the "CH" sound as in Chair!' },
  { target: 'TH', word: 'Thumb 👍', monsters: ['TH', 'PH', 'SH', 'TR'], prompt: 'Zap the "TH" sound as in Thumb!' },
  { target: 'WH', word: 'Whale 🐳', monsters: ['WH', 'FL', 'TH', 'CH'], prompt: 'Zap the "WH" sound as in Whale!' },
  { target: 'CK', word: 'Clock ⏰', monsters: ['CK', 'NG', 'ST', 'CH'], prompt: 'Zap the "CK" sound as in Clock!' },
  { target: 'FL', word: 'Flower 🌸', monsters: ['FL', 'SL', 'BL', 'CL'], prompt: 'Zap the "FL" sound as in Flower!' }
];

// Zone 2: Mirror Letter Buster (Visual / Spatial Reversal Dyslexia)
const MIRROR_ROUNDS = [
  { target: 'b', distractors: ['d', 'p', 'q'], label: 'Pop all the "b" balloons! 🎈' },
  { target: 'd', distractors: ['b', 'p', 'q'], label: 'Pop all the "d" balloons! 🎈' },
  { target: 'p', distractors: ['q', 'b', 'd'], label: 'Pop all the "p" balloons! 🎈' },
  { target: 'q', distractors: ['p', 'd', 'b'], label: 'Pop all the "q" balloons! 🎈' },
  { target: 'm', distractors: ['w', 'n', 'u'], label: 'Pop all the "m" balloons! 🎈' },
  { target: 'w', distractors: ['m', 'v', 'u'], label: 'Pop all the "w" balloons! 🎈' }
];

// Zone 3: Sight Word Ninja Slicer (Surface Dyslexia / Sight Word Recognition)
const NINJA_SIGHT_ROUNDS = [
  { targetWord: 'because', prompt: 'Slice the sight word: "because" ⚔️', choices: ['because', 'become', 'beside', 'beacon'] },
  { targetWord: 'friend', prompt: 'Slice the sight word: "friend" ⚔️', choices: ['friend', 'fiend', 'fried', 'frame'] },
  { targetWord: 'people', prompt: 'Slice the sight word: "people" ⚔️', choices: ['people', 'purple', 'pupil', 'pebble'] },
  { targetWord: 'would', prompt: 'Slice the sight word: "would" ⚔️', choices: ['would', 'wound', 'world', 'wood'] },
  { targetWord: 'there', prompt: 'Slice the sight word: "there" ⚔️', choices: ['there', 'their', 'three', 'these'] },
  { targetWord: 'always', prompt: 'Slice the sight word: "always" ⚔️', choices: ['always', 'away', 'allway', 'almost'] }
];

// Zone 4: Morph-Bot Transformer Workshop (Morphological / Deep Dyslexia)
const MORPH_BOT_ROUNDS = [
  { prefix: 'un', root: 'happy', suffix: '', target: 'unhappy', prompt: 'Build a robot meaning "not happy" 🤖' },
  { prefix: 're', root: 'play', suffix: '', target: 'replay', prompt: 'Build a robot meaning "play again" 🤖' },
  { prefix: '', root: 'play', suffix: 'ful', target: 'playful', prompt: 'Build a robot meaning "full of play" 🤖' },
  { prefix: '', root: 'care', suffix: 'less', target: 'careless', prompt: 'Build a robot meaning "without care" 🤖' },
  { prefix: 'pre', root: 'view', suffix: '', target: 'preview', prompt: 'Build a robot meaning "view beforehand" 🤖' },
  { prefix: '', root: 'read', suffix: 'able', target: 'readable', prompt: 'Build a robot meaning "easy to read" 🤖' }
];

// Zone 5: Speed Dash Safari Kart (Rapid Automated Naming - RAN Deficit)
const SAFARI_ITEMS = [
  { id: '1', emoji: '🦁', name: 'Lion' },
  { id: '2', emoji: '🐘', name: 'Elephant' },
  { id: '3', emoji: '🦒', name: 'Giraffe' },
  { id: '4', emoji: '🐵', name: 'Monkey' },
  { id: '5', emoji: '🔴', name: 'Red Circle' },
  { id: '6', emoji: '⭐', name: 'Star' },
  { id: '7', emoji: '🚀', name: 'Rocket' },
  { id: '8', emoji: '🍕', name: 'Pizza' }
];

// Zone 6: Acoustic Shield DJ Station (Auditory Processing Dyslexia)
const DJ_SOUND_ROUNDS = [
  { targetSound: 'B', targetWord: 'Ball ⚽', prompt: 'Listen through the static: Find word starting with B! 🎧', choices: ['Ball ⚽', 'Dog 🐶', 'Cat 🐱', 'Fish 🐟'] },
  { targetSound: 'S', targetWord: 'Sun ☀️', prompt: 'Listen through the static: Find word starting with S! 🎧', choices: ['Sun ☀️', 'Moon 🌙', 'Star ⭐', 'Cloud ☁️'] },
  { targetSound: 'M', targetWord: 'Milk 🥛', prompt: 'Listen through the static: Find word starting with M! 🎧', choices: ['Milk 🥛', 'Bread 🍞', 'Apple 🍎', 'Egg 🥚'] },
  { targetSound: 'P', targetWord: 'Pencil ✏️', prompt: 'Listen through the static: Find word starting with P! 🎧', choices: ['Pencil ✏️', 'Table 🪵', 'Book 📖', 'Chair 🪑'] }
];

const BALLOON_COLORS = ['#f43f5e', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

const DysTherapyKids = ({ onComplete, initialZone = 'zone1' }) => {
  const { currentUser } = useAuth();
  const uid = currentUser?.uid || 'guest';

  // Navigation State
  const [activeLevel, setActiveLevel] = useState(1);
  const [activeZone, setActiveZone] = useState(initialZone); // zone1 to zone6
  const [gameState, setGameState] = useState('menu'); // 'menu' | 'playing' | 'completed'

  // XP Coins & Mascot Customization
  const [xpCoins, setXpCoins] = useState(() => {
    try {
      const saved = localStorage.getItem(`dys_kids_xp_${uid}`);
      return saved ? parseInt(saved, 10) : 150;
    } catch (e) { return 150; }
  });

  const [activeSkin, setActiveSkin] = useState(() => {
    try {
      return localStorage.getItem(`dys_kids_skin_${uid}`) || 'default';
    } catch (e) { return 'default'; }
  });

  const [unlockedSkins, setUnlockedSkins] = useState(() => {
    try {
      const saved = localStorage.getItem(`dys_kids_unlocked_skins_${uid}`);
      return saved ? JSON.parse(saved) : ['default'];
    } catch (e) { return ['default']; }
  });

  // Persistent Visited Levels & High Scores
  const [visitedLevels, setVisitedLevels] = useState(() => {
    try {
      const saved = localStorage.getItem(`dys_kids_visited_${uid}`);
      return saved ? JSON.parse(saved) : { 1: false, 2: false, 3: false };
    } catch (e) { return { 1: false, 2: false, 3: false }; }
  });

  const [highScores, setHighScores] = useState(() => {
    try {
      const saved = localStorage.getItem(`dys_kids_scores_${uid}`);
      return saved ? JSON.parse(saved) : { 1: 0, 2: 0, 3: 0 };
    } catch (e) { return { 1: 0, 2: 0, 3: 0 }; }
  });

  const [stars, setStars] = useState(() => {
    try {
      const saved = localStorage.getItem(`dys_kids_stars_${uid}`);
      return saved ? JSON.parse(saved) : { 1: 0, 2: 0, 3: 0 };
    } catch (e) { return { 1: 0, 2: 0, 3: 0 }; }
  });

  // Gameplay State
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [roundIdx, setRoundIdx] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [mascotMood, setMascotMood] = useState('happy');
  const [mascotMessage, setMascotMessage] = useState('Welcome Kids! Select any of the 6 game zones & let\'s play! 🎮');
  const [floatingEmojis, setFloatingEmojis] = useState([]);

  // Zone Specific Interactive States
  const [balloons, setBalloons] = useState([]);
  const [botBuild, setBotBuild] = useState({ prefix: '', root: '', suffix: '' });
  const [safariTargetIdx, setSafariTargetIdx] = useState(0);
  const [ninjaSliced, setNinjaSliced] = useState({});

  // Spawn celebration particle emojis
  const spawnCelebration = useCallback(() => {
    const items = Array.from({ length: 10 }, (_, i) => ({
      id: Date.now() + i,
      emoji: randomEmoji(CHEER_EMOJIS),
      left: 5 + Math.random() * 90,
      delay: Math.random() * 0.4,
      size: 1.2 + Math.random() * 1.3,
    }));
    setFloatingEmojis(items);
    setTimeout(() => setFloatingEmojis([]), 1800);
  }, []);

  // Timer Effect
  useEffect(() => {
    let timer;
    if (gameState === 'playing' && timeLeft > 0) {
      timer = setInterval(() => setTimeLeft(t => t - 1), 1000);
    } else if (gameState === 'playing' && timeLeft === 0) {
      handleGameOver();
    }
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState, timeLeft]);

  // Spawn Zone 2 Balloons
  const spawnBalloons = useCallback((round) => {
    const levelConfig = LEVELS.find(l => l.id === activeLevel);
    const balloonCount = activeLevel === 1 ? 6 : activeLevel === 2 ? 8 : 10;

    const items = [];
    for (let i = 0; i < balloonCount; i++) {
      const isTarget = Math.random() > 0.4;
      const letter = isTarget
        ? round.target
        : round.distractors[Math.floor(Math.random() * round.distractors.length)];

      items.push({
        id: i + '_' + Date.now(),
        letter,
        isTarget: letter === round.target,
        color: BALLOON_COLORS[i % BALLOON_COLORS.length],
        left: 8 + (i * (84 / balloonCount)) + (Math.random() * 4),
        delay: Math.random() * 1.5,
        duration: (4.5 / levelConfig.speed) + (Math.random() * 1.5),
        popped: false
      });
    }
    setBalloons(items);
  }, [activeLevel]);

  // Start Playing Level
  const startLevel = (levelId, zoneId = activeZone) => {
    setActiveLevel(levelId);
    setActiveZone(zoneId);
    setScore(0);
    setStreak(0);
    setRoundIdx(0);
    setNinjaSliced({});
    setBotBuild({ prefix: '', root: '', suffix: '' });
    setSafariTargetIdx(0);

    const levelConfig = LEVELS.find(l => l.id === levelId);
    setTimeLeft(levelConfig.timer);
    setGameState('playing');
    setMascotMood('excited');

    let msg = '';
    if (zoneId === 'zone1') {
      msg = PHONEME_MONSTER_ROUNDS[0].prompt;
    } else if (zoneId === 'zone2') {
      msg = MIRROR_ROUNDS[0].label;
      spawnBalloons(MIRROR_ROUNDS[0]);
    } else if (zoneId === 'zone3') {
      msg = NINJA_SIGHT_ROUNDS[0].prompt;
    } else if (zoneId === 'zone4') {
      msg = MORPH_BOT_ROUNDS[0].prompt;
    } else if (zoneId === 'zone5') {
      msg = 'Tap the items in sequence to boost your Safari Kart! 🏎️💨';
    } else if (zoneId === 'zone6') {
      msg = DJ_SOUND_ROUNDS[0].prompt;
    }
    setMascotMessage(msg);
    speak(msg);
  };

  // ── ZONE 1: Phoneme Monster Zap ──
  const zapPhonemeMonster = (choice) => {
    const current = PHONEME_MONSTER_ROUNDS[roundIdx % PHONEME_MONSTER_ROUNDS.length];
    if (choice === current.target) {
      const pts = 150 + (streak * 30);
      setScore(s => s + pts);
      setStreak(st => st + 1);
      setMascotMood('excited');
      setMascotMessage(`ZAP! ${randomEmoji(CHEER_EMOJIS)} ${current.target} as in ${current.word}! +${pts} pts!`);
      speak(`Awesome! ${current.target}`);
      spawnCelebration();
      setTimeout(() => advanceNextRound(), 700);
    } else {
      setStreak(0);
      setMascotMood('thinking');
      setMascotMessage(`${randomEmoji(WRONG_EMOJIS)} Missed! Listen for "${current.target}" sound!`);
      speak(`Try again! Listen for ${current.target}`);
    }
  };

  // ── ZONE 2: Pop Balloon ──
  const popBalloon = (balloon) => {
    if (balloon.popped) return;
    setBalloons(prev => prev.map(b => b.id === balloon.id ? { ...b, popped: true } : b));

    if (balloon.isTarget) {
      const pts = 100 + (streak * 20);
      setScore(s => s + pts);
      setStreak(st => st + 1);
      setMascotMood('excited');
      setMascotMessage(`POP! ${randomEmoji(CHEER_EMOJIS)} Great target "${balloon.letter}"! +${pts} pts!`);
      speak(`Great! ${balloon.letter}`);
      spawnCelebration();

      const remainingTargets = balloons.filter(b => b.isTarget && !b.popped && b.id !== balloon.id).length;
      if (remainingTargets === 0) {
        setTimeout(() => advanceNextRound(), 600);
      }
    } else {
      setStreak(0);
      setMascotMood('thinking');
      setMascotMessage(`${randomEmoji(WRONG_EMOJIS)} Careful! That's "${balloon.letter}". Look for "${MIRROR_ROUNDS[roundIdx % MIRROR_ROUNDS.length].target}"!`);
      speak(`Watch out! That's ${balloon.letter}`);
    }
  };

  // ── ZONE 3: Sight Word Ninja Slice ──
  const sliceSightWord = (word) => {
    const current = NINJA_SIGHT_ROUNDS[roundIdx % NINJA_SIGHT_ROUNDS.length];
    setNinjaSliced(prev => ({ ...prev, [word]: true }));

    if (word === current.targetWord) {
      const pts = 180 + (streak * 35);
      setScore(s => s + pts);
      setStreak(st => st + 1);
      setMascotMood('excited');
      setMascotMessage(`SWOOSH! ⚔️ ${randomEmoji(CHEER_EMOJIS)} Sliced "${word}"! +${pts} pts!`);
      speak(`Sliced ${word}!`);
      spawnCelebration();
      setTimeout(() => advanceNextRound(), 750);
    } else {
      setStreak(0);
      setMascotMood('thinking');
      setMascotMessage(`${randomEmoji(WRONG_EMOJIS)} Slice carefully! Find "${current.targetWord}"!`);
      speak(`Try again! Slice ${current.targetWord}`);
    }
  };

  // ── ZONE 4: Morph-Bot Builder ──
  const addBotPart = (type, val) => {
    setBotBuild(prev => {
      const updated = { ...prev, [type]: val };
      const current = MORPH_BOT_ROUNDS[roundIdx % MORPH_BOT_ROUNDS.length];
      const built = `${updated.prefix}${updated.root}${updated.suffix}`;

      if (built.toLowerCase() === current.target.toLowerCase()) {
        const pts = 220 + (streak * 40);
        setScore(s => s + pts);
        setStreak(st => st + 1);
        setMascotMood('excited');
        setMascotMessage(`ROBOT POWERED UP! 🤖 ${randomEmoji(CHEER_EMOJIS)} Built "${current.target}"! +${pts} pts!`);
        speak(`Robot built ${current.target}!`);
        spawnCelebration();
        setTimeout(() => advanceNextRound(), 800);
      }
      return updated;
    });
  };

  // ── ZONE 5: Safari Kart Tap ──
  const tapSafariItem = (item, idx) => {
    if (idx === safariTargetIdx) {
      const pts = 120 + (streak * 25);
      setScore(s => s + pts);
      setStreak(st => st + 1);
      setSafariTargetIdx(i => i + 1);
      setMascotMood('excited');
      setMascotMessage(`TURBO BOOST! 🏎️💨 ${item.name}! +${pts} pts!`);
      speak(item.name);
      spawnCelebration();

      if (safariTargetIdx === SAFARI_ITEMS.length - 1) {
        setTimeout(() => advanceNextRound(), 600);
      }
    } else {
      setStreak(0);
      setMascotMood('thinking');
      setMascotMessage(`Next target is: ${SAFARI_ITEMS[safariTargetIdx]?.name}! 🏎️`);
    }
  };

  // ── ZONE 6: DJ Sound Station ──
  const handleDJChoice = (choice) => {
    const current = DJ_SOUND_ROUNDS[roundIdx % DJ_SOUND_ROUNDS.length];
    if (choice === current.targetWord) {
      const pts = 160 + (streak * 30);
      setScore(s => s + pts);
      setStreak(st => st + 1);
      setMascotMood('excited');
      setMascotMessage(`DJ BEATS MATCHED! 🎧 ${randomEmoji(CHEER_EMOJIS)} ${current.targetWord}! +${pts} pts!`);
      speak(`Awesome! ${current.targetWord}`);
      spawnCelebration();
      setTimeout(() => advanceNextRound(), 750);
    } else {
      setStreak(0);
      setMascotMood('thinking');
      setMascotMessage(`${randomEmoji(WRONG_EMOJIS)} Turn the DJ dial! Listen for ${current.targetSound}...`);
      speak(`Try again! Listen for initial sound ${current.targetSound}`);
    }
  };

  // Advance Next Round
  const advanceNextRound = () => {
    const nextIdx = roundIdx + 1;
    setRoundIdx(nextIdx);
    setNinjaSliced({});
    setBotBuild({ prefix: '', root: '', suffix: '' });
    setSafariTargetIdx(0);

    let msg = '';
    if (activeZone === 'zone1') {
      const r = PHONEME_MONSTER_ROUNDS[nextIdx % PHONEME_MONSTER_ROUNDS.length];
      msg = r.prompt;
    } else if (activeZone === 'zone2') {
      const r = MIRROR_ROUNDS[nextIdx % MIRROR_ROUNDS.length];
      msg = r.label;
      spawnBalloons(r);
    } else if (activeZone === 'zone3') {
      const r = NINJA_SIGHT_ROUNDS[nextIdx % NINJA_SIGHT_ROUNDS.length];
      msg = r.prompt;
    } else if (activeZone === 'zone4') {
      const r = MORPH_BOT_ROUNDS[nextIdx % MORPH_BOT_ROUNDS.length];
      msg = r.prompt;
    } else if (activeZone === 'zone5') {
      msg = 'Next Safari Lap! Name and tap the items rapidly! 🏎️';
    } else if (activeZone === 'zone6') {
      const r = DJ_SOUND_ROUNDS[nextIdx % DJ_SOUND_ROUNDS.length];
      msg = r.prompt;
    }
    setMascotMessage(msg);
    speak(msg);
  };

  // Game Over & Save Progress
  const handleGameOver = async () => {
    setGameState('completed');
    setMascotMood('celebrate');
    spawnCelebration();

    const starRating = score > 600 ? 3 : score > 300 ? 2 : 1;
    const accuracy = Math.min(100, Math.round((score / 800) * 100));

    // Award XP Coins
    const earnedXp = Math.round(score / 5);
    const newTotalXp = xpCoins + earnedXp;
    setXpCoins(newTotalXp);

    const newVisited = { ...visitedLevels, [activeLevel]: true };
    setVisitedLevels(newVisited);

    const newHighScores = { ...highScores, [activeLevel]: Math.max(highScores[activeLevel] || 0, score) };
    setHighScores(newHighScores);

    const newStars = { ...stars, [activeLevel]: Math.max(stars[activeLevel] || 0, starRating) };
    setStars(newStars);

    try {
      localStorage.setItem(`dys_kids_xp_${uid}`, newTotalXp.toString());
      localStorage.setItem(`dys_kids_visited_${uid}`, JSON.stringify(newVisited));
      localStorage.setItem(`dys_kids_scores_${uid}`, JSON.stringify(newHighScores));
      localStorage.setItem(`dys_kids_stars_${uid}`, JSON.stringify(newStars));
    } catch (e) { console.warn("Storage save error", e); }

    const levelObj = LEVELS.find(l => l.id === activeLevel);
    await saveTherapyProgress(currentUser, 'kids', score, accuracy, `${levelObj.name}`);
    speak(`Woohoo! You scored ${score} points and earned ${earnedXp} XP Coins!`);
  };

  // Buy or Equip Mascot Outfit
  const handleSkinClick = (skin) => {
    if (unlockedSkins.includes(skin.id)) {
      setActiveSkin(skin.id);
      localStorage.setItem(`dys_kids_skin_${uid}`, skin.id);
    } else if (xpCoins >= skin.cost) {
      const newCoins = xpCoins - skin.cost;
      const newUnlocked = [...unlockedSkins, skin.id];
      setXpCoins(newCoins);
      setUnlockedSkins(newUnlocked);
      setActiveSkin(skin.id);
      try {
        localStorage.setItem(`dys_kids_xp_${uid}`, newCoins.toString());
        localStorage.setItem(`dys_kids_unlocked_skins_${uid}`, JSON.stringify(newUnlocked));
        localStorage.setItem(`dys_kids_skin_${uid}`, skin.id);
      } catch (e) { /* ignore */ }
      speak(`Awesome! Unlocked ${skin.name}!`);
    } else {
      speak(`You need ${skin.cost - xpCoins} more XP Coins to unlock ${skin.name}!`);
    }
  };

  const getMascotEmoji = () => {
    const currentObj = MASCOT_SKINS.find(s => s.id === activeSkin);
    return currentObj ? currentObj.emoji : '🦉';
  };

  const timerBarColor = timeLeft > 15 ? '#22c55e' : timeLeft > 7 ? '#fbbf24' : '#f43f5e';
  const timerPercent = (timeLeft / (LEVELS.find(l => l.id === activeLevel)?.timer || 30)) * 100;

  return (
    <div className="dys-kids-container">
      {/* Floating Celebration Emojis */}
      {floatingEmojis.map(fe => (
        <div
          key={fe.id}
          style={{
            position: 'fixed', left: `${fe.left}%`, bottom: '-40px',
            fontSize: `${fe.size}rem`, animation: `emojiRise 1.8s ease-out ${fe.delay}s forwards`,
            pointerEvents: 'none', zIndex: 9999, opacity: 0,
          }}
        >
          {fe.emoji}
        </div>
      ))}

      {/* ═══ Mascot Header Card ═══ */}
      <div className="mascot-header-card">
        <div className={`mascot-avatar ${mascotMood}`}>
          {getMascotEmoji()}
        </div>
        <div className="mascot-speech-bubble">
          <div className="mascot-name">🦉 Lexi Arcade Leader • XP: <span className="xp-coin-badge">💰 {xpCoins} Coins</span></div>
          <div className="mascot-text">{mascotMessage}</div>
        </div>
        <button className="btn-audio-speak" onClick={() => speak(mascotMessage)}>
          🔊 Hear Again
        </button>
      </div>

      {/* ═══ MENU STATE ═══ */}
      {gameState === 'menu' && (
        <div className="kids-menu-layout">
          {/* Mascot Skin Selector Shop */}
          <div className="skin-shop-bar">
            <span style={{ fontWeight: 800, color: '#f59e0b', fontSize: '0.85rem' }}>👗 Mascot Outfits:</span>
            {MASCOT_SKINS.map(skin => {
              const isUnlocked = unlockedSkins.includes(skin.id);
              const isActiveSkin = activeSkin === skin.id;

              return (
                <button
                  key={skin.id}
                  onClick={() => handleSkinClick(skin)}
                  className={`skin-btn ${isActiveSkin ? 'active' : ''} ${isUnlocked ? 'unlocked' : 'locked'}`}
                >
                  <span>{skin.emoji}</span>
                  <small>{isActiveSkin ? 'Equipped' : isUnlocked ? skin.name : `💰 ${skin.cost}`}</small>
                </button>
              );
            })}
          </div>

          {/* 6 Dyslexia Game Zones Selector */}
          <div className="zone-tab-group">
            <button className={`zone-tab-btn ${activeZone === 'zone1' ? 'active' : ''}`} onClick={() => setActiveZone('zone1')}>
              👾 Z1: Phoneme Monster
            </button>
            <button className={`zone-tab-btn ${activeZone === 'zone2' ? 'active' : ''}`} onClick={() => setActiveZone('zone2')}>
              🎈 Z2: Mirror Buster
            </button>
            <button className={`zone-tab-btn ${activeZone === 'zone3' ? 'active' : ''}`} onClick={() => setActiveZone('zone3')}>
              ⚔️ Z3: Ninja Sight Slicer
            </button>
            <button className={`zone-tab-btn ${activeZone === 'zone4' ? 'active' : ''}`} onClick={() => setActiveZone('zone4')}>
              🤖 Z4: Morph-Bot Workshop
            </button>
            <button className={`zone-tab-btn ${activeZone === 'zone5' ? 'active' : ''}`} onClick={() => setActiveZone('zone5')}>
              🏎️ Z5: Safari Kart
            </button>
            <button className={`zone-tab-btn ${activeZone === 'zone6' ? 'active' : ''}`} onClick={() => setActiveZone('zone6')}>
              🎧 Z6: DJ Acoustic Shield
            </button>
          </div>

          <h3 className="kids-section-title">🎮 Pick a Level & Launch Game!</h3>

          {/* Level Selection Grid */}
          <div className="levels-card-grid">
            {LEVELS.map(level => {
              const isVisited = visitedLevels[level.id];
              const bestScore = highScores[level.id] || 0;
              const starCount = stars[level.id] || 0;

              return (
                <div key={level.id} className={`level-card ${isVisited ? 'visited' : ''}`} style={{ borderTop: `6px solid ${level.color}` }}>
                  <div className="level-badge-row">
                    <span className="level-number-badge" style={{ background: level.color }}>
                      {level.emoji} L{level.id}
                    </span>
                    {isVisited && <span className="visited-tick-badge">✅ Completed</span>}
                  </div>
                  <h4>{level.name}</h4>
                  <p>Play 3D interactive physics, combos, sound audio & earn XP coins!</p>
                  <div className="level-stats-row">
                    <div className="star-rating">{starCount > 0 ? '⭐'.repeat(starCount) : '☆☆☆'}</div>
                    <div className="high-score-tag">Best: <strong>{bestScore} pts</strong></div>
                  </div>
                  <button className="btn-play-level" style={{ background: `linear-gradient(135deg, ${level.color}, ${level.color}dd)` }} onClick={() => startLevel(level.id, activeZone)}>
                    🚀 Play Level {level.id}!
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══ PLAYING STATE ═══ */}
      {gameState === 'playing' && (
        <div className="kids-play-arena">
          {/* Game Stats Bar */}
          <div className="arena-stats-bar">
            <div className="stat-pill"><span>⏱️</span> <strong>{timeLeft}s</strong></div>
            <div className="stat-pill"><span>🎯</span> <strong>{score} pts</strong></div>
            <div className="stat-pill"><span>🔥 Combo:</span> <strong>{streak}x</strong></div>
            <div className="stat-pill"><span>💰 XP:</span> <strong>{xpCoins}</strong></div>
            <button className="btn-quit-game" onClick={() => setGameState('menu')}>✕ Quit</button>
          </div>

          {/* Timer Progress Bar */}
          <div style={{ width: '100%', height: '10px', borderRadius: '50px', background: 'rgba(255,255,255,0.3)', overflow: 'hidden' }}>
            <div style={{ width: `${timerPercent}%`, height: '100%', background: timerBarColor, transition: 'width 1s linear' }} />
          </div>

          {/* ── ZONE 1: Phoneme Monster Arena ── */}
          {activeZone === 'zone1' && (
            <div className="phoneme-arena">
              <div className="target-banner">
                👾 Zap the monster with sound: <strong className="highlight-letter">{PHONEME_MONSTER_ROUNDS[roundIdx % PHONEME_MONSTER_ROUNDS.length].target}</strong>
                <div style={{ fontSize: '0.85rem', color: '#6d28d9', marginTop: '2px' }}>As in {PHONEME_MONSTER_ROUNDS[roundIdx % PHONEME_MONSTER_ROUNDS.length].word}</div>
              </div>
              <div className="phoneme-bubbles-grid">
                {PHONEME_MONSTER_ROUNDS[roundIdx % PHONEME_MONSTER_ROUNDS.length].monsters.map((monster, i) => (
                  <button key={i} className="phoneme-bubble-btn" onClick={() => zapPhonemeMonster(monster)}>
                    👾 <span>{monster}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── ZONE 2: Mirror Letter Buster ── */}
          {activeZone === 'zone2' && (
            <div className="balloon-field">
              <div className="target-banner">
                🎈 Pop target letter <strong className="highlight-letter">{MIRROR_ROUNDS[roundIdx % MIRROR_ROUNDS.length].target}</strong> balloons!
              </div>
              <div className="balloon-canvas">
                {balloons.map(balloon => (
                  <div
                    key={balloon.id}
                    className={`balloon-item ${balloon.popped ? 'popped' : ''}`}
                    style={{
                      left: `${balloon.left}%`,
                      background: `radial-gradient(circle at 30% 30%, ${balloon.color}cc, ${balloon.color})`,
                      animationDuration: `${balloon.duration}s`, animationDelay: `${balloon.delay}s`
                    }}
                    onClick={() => popBalloon(balloon)}
                  >
                    {!balloon.popped ? <span className="balloon-text">{balloon.letter}</span> : <span className="pop-effect">💥 +100</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── ZONE 3: Sight Word Ninja Slicer ── */}
          {activeZone === 'zone3' && (
            <div className="ninja-arena">
              <div className="target-banner">
                ⚔️ Slice the target sight word: <strong className="highlight-letter">{NINJA_SIGHT_ROUNDS[roundIdx % NINJA_SIGHT_ROUNDS.length].targetWord}</strong>
              </div>
              <div className="ninja-word-grid">
                {NINJA_SIGHT_ROUNDS[roundIdx % NINJA_SIGHT_ROUNDS.length].choices.map((w, i) => (
                  <button key={i} className={`ninja-slice-btn ${ninjaSliced[w] ? 'sliced' : ''}`} onClick={() => sliceSightWord(w)}>
                    <span>{w}</span> {ninjaSliced[w] && <span className="slash-mark">⚔️</span>}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── ZONE 4: Morph-Bot Workshop ── */}
          {activeZone === 'zone4' && (
            <div className="robot-arena">
              <div className="target-banner">
                🤖 Target Robot: Build <strong>"{MORPH_BOT_ROUNDS[roundIdx % MORPH_BOT_ROUNDS.length].target}"</strong>
              </div>
              <div className="robot-chassis">
                <span className="bot-slot">{botBuild.prefix || '[PREFIX]'}</span>
                <span className="bot-plus">+</span>
                <span className="bot-slot main">{botBuild.root || '[ROOT]'}</span>
                <span className="bot-plus">+</span>
                <span className="bot-slot">{botBuild.suffix || '[SUFFIX]'}</span>
              </div>
              <div className="robot-parts-tray">
                {['un', 're', 'pre'].map(p => (
                  <button key={p} className="bot-part-btn prefix" onClick={() => addBotPart('prefix', p)}>+{p}</button>
                ))}
                {['happy', 'play', 'care', 'view', 'read'].map(r => (
                  <button key={r} className="bot-part-btn root" onClick={() => addBotPart('root', r)}>{r}</button>
                ))}
                {['ful', 'less', 'able'].map(s => (
                  <button key={s} className="bot-part-btn suffix" onClick={() => addBotPart('suffix', s)}>+{s}</button>
                ))}
              </div>
            </div>
          )}

          {/* ── ZONE 5: Speed Dash Safari Kart ── */}
          {activeZone === 'zone5' && (
            <div className="safari-arena">
              <div className="target-banner">
                🏎️ Next Target: <strong className="highlight-letter">{SAFARI_ITEMS[safariTargetIdx]?.name || 'FINISH!'}</strong>
              </div>
              <div className="safari-track-grid">
                {SAFARI_ITEMS.map((item, idx) => (
                  <button key={item.id} className={`safari-item-btn ${idx < safariTargetIdx ? 'passed' : idx === safariTargetIdx ? 'active-target' : ''}`} onClick={() => tapSafariItem(item, idx)}>
                    <span className="safari-emoji">{item.emoji}</span>
                    <small>{item.name}</small>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── ZONE 6: DJ Sound Station ── */}
          {activeZone === 'zone6' && (
            <div className="phoneme-arena">
              <div className="target-banner">
                🎧 Listen through static: Find word starting with <strong className="highlight-letter">{DJ_SOUND_ROUNDS[roundIdx % DJ_SOUND_ROUNDS.length].targetSound}</strong>
              </div>
              <div className="phoneme-hero-box">
                <div className="audio-wave-circle">🎧</div>
                <button className="btn-replay-audio" onClick={() => speak(DJ_SOUND_ROUNDS[roundIdx % DJ_SOUND_ROUNDS.length].prompt)}>
                  🔊 Replay Target Sound
                </button>
              </div>
              <div className="phoneme-bubbles-grid">
                {DJ_SOUND_ROUNDS[roundIdx % DJ_SOUND_ROUNDS.length].choices.map((choice, i) => (
                  <button key={i} className="phoneme-bubble-btn" onClick={() => handleDJChoice(choice)}>
                    <span>{choice}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══ COMPLETED STATE ═══ */}
      {gameState === 'completed' && (
        <div className="victory-card">
          <div className="victory-crown">🏆</div>
          <h2>🎉 Level {activeLevel} Cleared! 🎉</h2>
          <div className="star-celebration">{'⭐'.repeat(stars[activeLevel] || 1)}</div>

          <div className="score-summary-grid">
            <div className="score-box"><small>🎯 Score</small><strong>{score} pts</strong></div>
            <div className="score-box"><small>💰 XP Earned</small><strong>+{Math.round(score / 5)} Coins</strong></div>
            <div className="score-box"><small>🏅 High Score</small><strong>{highScores[activeLevel]} pts</strong></div>
          </div>

          <div className="victory-actions">
            <button className="btn-play-again" onClick={() => startLevel(activeLevel)}>🔄 Play Again!</button>
            <button className="btn-menu" onClick={() => setGameState('menu')}>📜 Level Menu</button>
            <button className="btn-finish" onClick={onComplete}>🏠 Dashboard →</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DysTherapyKids;
