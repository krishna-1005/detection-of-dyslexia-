import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../auth/AuthContext';
import { saveTherapyProgress } from './ExerciseSystem';
import './MorphoSnake.css';

// ── SFX ENGINE ──
const playSFX = (type) => {
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.connect(g); g.connect(ctx.destination);
    if (type === 'eat') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.08);
      g.gain.setValueAtTime(0.12, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
      osc.start(); osc.stop(ctx.currentTime + 0.12);
    } else if (type === 'wrong') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(200, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.25);
      g.gain.setValueAtTime(0.1, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.start(); osc.stop(ctx.currentTime + 0.3);
    } else if (type === 'complete') {
      osc.type = 'sine';
      const t = ctx.currentTime;
      osc.frequency.setValueAtTime(523, t);
      osc.frequency.setValueAtTime(659, t + 0.1);
      osc.frequency.setValueAtTime(784, t + 0.2);
      osc.frequency.setValueAtTime(1047, t + 0.3);
      g.gain.setValueAtTime(0.15, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
      osc.start(); osc.stop(t + 0.5);
    } else if (type === 'die') {
      osc.type = 'square';
      osc.frequency.setValueAtTime(300, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(60, ctx.currentTime + 0.5);
      g.gain.setValueAtTime(0.1, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      osc.start(); osc.stop(ctx.currentTime + 0.5);
    }
  } catch (e) { /* silent */ }
};

const getFriendlyVoice = () => {
  if (!window.speechSynthesis) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices || voices.length === 0) return null;
  const preferred = ['Google US English', 'Microsoft Jenny', 'Microsoft Aria', 'Samantha'];
  for (const p of preferred) {
    const v = voices.find(v => v.name.includes(p));
    if (v) return v;
  }
  return voices.find(v => v.lang.startsWith('en')) || null;
};

const speakText = (text) => {
  try {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    const v = getFriendlyVoice();
    if (v) u.voice = v;
    u.rate = 0.95;
    u.pitch = 1.15;
    window.speechSynthesis.speak(u);
  } catch (e) {}
};

const shuffle = (a) => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };

// ── WORD RECIPES PER LEVEL ──
const RECIPES = {
  easy: [
    { word: 'Unhappy', parts: [{ text: 'Un', type: 'prefix' }, { text: 'happy', type: 'root' }], hint: 'Not happy' },
    { word: 'Player', parts: [{ text: 'Play', type: 'root' }, { text: 'er', type: 'suffix' }], hint: 'One who plays' },
    { word: 'Hopeful', parts: [{ text: 'Hope', type: 'root' }, { text: 'ful', type: 'suffix' }], hint: 'Full of hope' },
    { word: 'Unlock', parts: [{ text: 'Un', type: 'prefix' }, { text: 'lock', type: 'root' }], hint: 'Open a lock' },
    { word: 'Careless', parts: [{ text: 'Care', type: 'root' }, { text: 'less', type: 'suffix' }], hint: 'Without care' },
  ],
  medium: [
    { word: 'Reusable', parts: [{ text: 'Re', type: 'prefix' }, { text: 'use', type: 'root' }, { text: 'able', type: 'suffix' }], hint: 'Can be used again' },
    { word: 'Preview', parts: [{ text: 'Pre', type: 'prefix' }, { text: 'view', type: 'root' }], hint: 'See beforehand' },
    { word: 'Readable', parts: [{ text: 'Read', type: 'root' }, { text: 'able', type: 'suffix' }], hint: 'Can be read' },
    { word: 'Unkindly', parts: [{ text: 'Un', type: 'prefix' }, { text: 'kind', type: 'root' }, { text: 'ly', type: 'suffix' }], hint: 'In a not kind way' },
    { word: 'Movable', parts: [{ text: 'Move', type: 'root' }, { text: 'able', type: 'suffix' }], hint: 'Can be moved' },
  ],
  hard: [
    { word: 'Transform', parts: [{ text: 'Trans', type: 'prefix' }, { text: 'form', type: 'root' }], hint: 'Change shape' },
    { word: 'Incredible', parts: [{ text: 'In', type: 'prefix' }, { text: 'cred', type: 'root' }, { text: 'ible', type: 'suffix' }], hint: 'Not believable' },
    { word: 'Constructed', parts: [{ text: 'Con', type: 'prefix' }, { text: 'struct', type: 'root' }, { text: 'ed', type: 'suffix' }], hint: 'Built together' },
    { word: 'Disconnect', parts: [{ text: 'Dis', type: 'prefix' }, { text: 'connect', type: 'root' }], hint: 'Undo connection' },
    { word: 'Uncomfortable', parts: [{ text: 'Un', type: 'prefix' }, { text: 'comfort', type: 'root' }, { text: 'able', type: 'suffix' }], hint: 'Not comfortable' },
  ]
};

// Distractors per type
const DISTRACTORS = {
  prefix: ['Anti', 'Sub', 'Over', 'Mis', 'Out', 'Non'],
  root: ['jump', 'fish', 'sing', 'walk', 'think', 'sleep', 'dream', 'light'],
  suffix: ['ment', 'ness', 'tion', 'ing', 'ous', 'ity'],
};

// ── CONSTANTS ──
const CELL = 28;
const COLS = 22;
const ROWS = 18;
const W = COLS * CELL;
const H = ROWS * CELL;

const TYPE_COLORS = {
  prefix: { fill: '#3b82f6', border: '#1d4ed8', text: '#ffffff' },
  root:   { fill: '#eab308', border: '#ca8a04', text: '#ffffff' },
  suffix: { fill: '#ec4899', border: '#be185d', text: '#ffffff' },
  wrong:  { fill: '#e11d48', border: '#9f1239', text: '#ffffff' },
};

const randomPos = (exclude = []) => {
  let pos;
  let tries = 0;
  do {
    pos = { x: Math.floor(Math.random() * COLS), y: Math.floor(Math.random() * ROWS) };
    tries++;
  } while (tries < 200 && exclude.some(e => e.x === pos.x && e.y === pos.y));
  return pos;
};

// ── COMPONENT ──
const MorphoSnake = ({ onComplete }) => {
  const { currentUser } = useAuth();
  const gameWrapperRef = useRef(null);
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const gameRef = useRef(null);

  const [phase, setPhase] = useState('start'); // start | playing | complete
  const [isFullView, setIsFullView] = useState(false);
  const [difficulty, setDifficulty] = useState('easy');
  const [score, setScore] = useState(0);
  const [wordsBuilt, setWordsBuilt] = useState(0);
  const [lives, setLives] = useState(3);
  const [currentRecipe, setCurrentRecipe] = useState(null);
  const [eatenParts, setEatenParts] = useState([]);
  const [recipeQueue, setRecipeQueue] = useState([]);
  const [autoCountdown, setAutoCountdown] = useState(10);

  const userName = currentUser?.displayName?.split(' ')[0] || 'Player';

  // Fullscreen sync
  useEffect(() => {
    const handleFs = () => setIsFullView(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', handleFs);
    return () => document.removeEventListener('fullscreenchange', handleFs);
  }, []);

  const toggleFullView = () => {
    if (!isFullView) {
      if (gameWrapperRef.current?.requestFullscreen) gameWrapperRef.current.requestFullscreen().catch(() => {});
      setIsFullView(true);
    } else {
      if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(() => {});
      setIsFullView(false);
    }
  };

  // ── Initialize Game State ──
  const initGame = useCallback((level) => {
    const recipes = shuffle(RECIPES[level] || RECIPES.easy);
    const firstRecipe = recipes[0];

    const snake = [
      { x: Math.floor(COLS / 2), y: Math.floor(ROWS / 2) },
      { x: Math.floor(COLS / 2) - 1, y: Math.floor(ROWS / 2) },
      { x: Math.floor(COLS / 2) - 2, y: Math.floor(ROWS / 2) },
    ];

    const foods = spawnFoods(firstRecipe, snake);

    // Pre-spawn ambient energy dust
    const ambientDust = Array.from({ length: 24 }).map(() => ({
      x: Math.random() * W,
      y: Math.random() * H,
      vy: -0.2 - Math.random() * 0.4,
      size: 1 + Math.random() * 2,
      alpha: 0.2 + Math.random() * 0.5
    }));

    gameRef.current = {
      snake,
      dir: { x: 1, y: 0 },
      nextDir: { x: 1, y: 0 },
      foods,
      particles: [],
      ambientDust,
      speed: level === 'easy' ? 250 : level === 'medium' ? 195 : 150,
      lastMove: 0,
      paused: false,
      flashMsg: null,
      flashTimer: 0,
    };

    setScore(0);
    setWordsBuilt(0);
    setLives(3);
    setEatenParts([]);
    setCurrentRecipe(firstRecipe);
    setRecipeQueue(recipes.slice(1));
    setPhase('playing');

    speakText(`Morpheme Snake! Eat the parts to build: ${firstRecipe.word}. ${firstRecipe.hint}`);
  }, []);

  // ── Spawn food pellets ──
  const spawnFoods = (recipe, snakeBody) => {
    const exclude = [...snakeBody];
    const foods = [];

    // Correct parts
    recipe.parts.forEach((part, i) => {
      const pos = randomPos(exclude);
      exclude.push(pos);
      foods.push({ ...pos, text: part.text, type: part.type, correct: true, order: i });
    });

    // Distractor parts (3-5 distractors)
    const numDistractors = Math.min(5, 3 + Math.floor(Math.random() * 3));
    for (let i = 0; i < numDistractors; i++) {
      const dType = ['prefix', 'root', 'suffix'][Math.floor(Math.random() * 3)];
      const dList = DISTRACTORS[dType];
      const dText = dList[Math.floor(Math.random() * dList.length)];
      // Make sure it's not a correct answer
      if (recipe.parts.some(p => p.text.toLowerCase() === dText.toLowerCase())) continue;
      const pos = randomPos(exclude);
      exclude.push(pos);
      foods.push({ ...pos, text: dText, type: dType, correct: false, order: -1 });
    }

    return foods;
  };

  // ── Keyboard Controls ──
  useEffect(() => {
    const handleKey = (e) => {
      if (phase !== 'playing' || !gameRef.current) return;
      const g = gameRef.current;
      switch (e.key) {
        case 'ArrowUp': case 'w': case 'W':
          if (g.dir.y !== 1) g.nextDir = { x: 0, y: -1 };
          e.preventDefault(); break;
        case 'ArrowDown': case 's': case 'S':
          if (g.dir.y !== -1) g.nextDir = { x: 0, y: 1 };
          e.preventDefault(); break;
        case 'ArrowLeft': case 'a': case 'A':
          if (g.dir.x !== 1) g.nextDir = { x: -1, y: 0 };
          e.preventDefault(); break;
        case 'ArrowRight': case 'd': case 'D':
          if (g.dir.x !== -1) g.nextDir = { x: 1, y: 0 };
          e.preventDefault(); break;
        default: break;
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [phase]);

  // ── Mobile D-Pad ──
  const handleDPad = (dx, dy) => {
    if (!gameRef.current) return;
    const g = gameRef.current;
    if (dx !== 0 && g.dir.x === 0) g.nextDir = { x: dx, y: 0 };
    if (dy !== 0 && g.dir.y === 0) g.nextDir = { x: 0, y: dy };
  };

  // ── Handle eating a food ──
  const handleEatFood = useCallback((foodIdx) => {
    if (!gameRef.current || !currentRecipe) return;
    const g = gameRef.current;
    const food = g.foods[foodIdx];

    // Next correct part to eat
    const nextPartIdx = eatenParts.length;
    const nextCorrectPart = currentRecipe.parts[nextPartIdx];

    if (food.correct && food.text === nextCorrectPart?.text) {
      // CORRECT
      playSFX('eat');
      const newEaten = [...eatenParts, food.text];
      setEatenParts(newEaten);
      setScore(prev => prev + 50);

      // Spawn 16 particle sparks at food location
      if (!g.particles) g.particles = [];
      const fx = food.x * CELL + CELL / 2;
      const fy = food.y * CELL + CELL / 2;
      for (let i = 0; i < 16; i++) {
        const angle = (Math.PI * 2 * i) / 16 + (Math.random() * 0.3);
        const spd = 2 + Math.random() * 4;
        g.particles.push({
          x: fx, y: fy,
          vx: Math.cos(angle) * spd,
          vy: Math.sin(angle) * spd,
          color: '#4ade80',
          size: 3 + Math.random() * 3,
          alpha: 1
        });
      }

      g.foods.splice(foodIdx, 1);

      // Check if word is complete
      if (newEaten.length === currentRecipe.parts.length) {
        playSFX('complete');
        setWordsBuilt(prev => prev + 1);
        setScore(prev => prev + 200);
        g.flashMsg = `✅ ${currentRecipe.word}!`;
        g.flashTimer = 60;
        speakText(`Great! You built ${currentRecipe.word}!`);

        // Advance to next recipe after a short pause
        setTimeout(() => {
          if (recipeQueue.length > 0) {
            const next = recipeQueue[0];
            setCurrentRecipe(next);
            setRecipeQueue(prev => prev.slice(1));
            setEatenParts([]);
            if (gameRef.current) {
              gameRef.current.foods = spawnFoods(next, gameRef.current.snake);
            }
            speakText(`Next word: ${next.word}. ${next.hint}`);
          } else {
            // Round complete
            setPhase('complete');
          }
        }, 1200);
      }
    } else {
      // WRONG PIECE
      playSFX('wrong');
      g.flashMsg = `❌ Wrong! Need: ${nextCorrectPart?.text || '?'}`;
      g.flashTimer = 50;

      // Lose life, shrink snake
      setLives(prev => {
        const newLives = prev - 1;
        if (newLives <= 0) {
          playSFX('die');
          setTimeout(() => setPhase('complete'), 600);
        }
        return newLives;
      });

      // Shrink snake by 1
      if (g.snake.length > 2) g.snake.pop();

      // Move the food elsewhere
      const pos = randomPos(g.snake);
      g.foods[foodIdx] = { ...g.foods[foodIdx], ...pos };
    }
  }, [currentRecipe, eatenParts, recipeQueue]);

  // Store handleEatFood in ref for the game loop
  const eatRef = useRef(handleEatFood);
  useEffect(() => { eatRef.current = handleEatFood; }, [handleEatFood]);

  // ── Game Loop (Canvas Rendering + Logic) ──
  useEffect(() => {
    if (phase !== 'playing') {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx2d = canvas.getContext('2d');

    const loop = (timestamp) => {
      const g = gameRef.current;
      if (!g || phase !== 'playing') return;

      // ── Movement tick ──
      if (timestamp - g.lastMove >= g.speed) {
        g.lastMove = timestamp;
        g.dir = { ...g.nextDir };

        const head = g.snake[0];
        const nx = (head.x + g.dir.x + COLS) % COLS;
        const ny = (head.y + g.dir.y + ROWS) % ROWS;

        // Self collision
        const selfHit = g.snake.some(s => s.x === nx && s.y === ny);
        if (selfHit) {
          playSFX('die');
          setLives(prev => {
            const nl = prev - 1;
            if (nl <= 0) setTimeout(() => setPhase('complete'), 300);
            return nl;
          });
          // Reset snake position
          g.snake = [
            { x: Math.floor(COLS / 2), y: Math.floor(ROWS / 2) },
            { x: Math.floor(COLS / 2) - 1, y: Math.floor(ROWS / 2) },
          ];
          g.dir = { x: 1, y: 0 };
          g.nextDir = { x: 1, y: 0 };
        } else {
          g.snake.unshift({ x: nx, y: ny });

          // Check food collision
          let ateFood = false;
          for (let i = 0; i < g.foods.length; i++) {
            if (g.foods[i].x === nx && g.foods[i].y === ny) {
              eatRef.current(i);
              ateFood = true;
              break;
            }
          }

          if (!ateFood) g.snake.pop(); // normal move
        }

        // Decay flash
        if (g.flashTimer > 0) g.flashTimer--;
      }

      // ── Google Snake Two-Tone Grass Grid ──
      for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
          ctx2d.fillStyle = (x + y) % 2 === 0 ? '#a2d149' : '#aad751';
          ctx2d.fillRect(x * CELL, y * CELL, CELL, CELL);
        }
      }

      // Food Pellets (Google Apple Red & Colorful Morpheme Orbs)
      g.foods.forEach((f) => {
        const colors = f.correct ? TYPE_COLORS[f.type] : TYPE_COLORS.wrong;
        const cx = f.x * CELL + CELL / 2;
        const cy = f.y * CELL + CELL / 2;
        const r = 18; // 36px diameter circle

        // Drop Shadow
        ctx2d.shadowColor = 'rgba(0, 0, 0, 0.2)';
        ctx2d.shadowBlur = 8;
        ctx2d.shadowOffsetY = 3;

        // Solid Circle Body
        ctx2d.fillStyle = colors.fill;
        ctx2d.beginPath();
        ctx2d.arc(cx, cy, r, 0, Math.PI * 2);
        ctx2d.fill();

        ctx2d.shadowBlur = 0;
        ctx2d.shadowOffsetY = 0;

        // Border Ring
        ctx2d.strokeStyle = colors.border;
        ctx2d.lineWidth = 2;
        ctx2d.stroke();

        // Big Bold White Text
        ctx2d.fillStyle = '#ffffff';
        ctx2d.font = 'bold 15px "Lexend", "Fredoka", sans-serif';
        ctx2d.textAlign = 'center';
        ctx2d.textBaseline = 'middle';
        ctx2d.fillText(f.text, cx, cy);
      });

      // Google Blue Cartoon Snake with Cute Googly Eyes
      g.snake.forEach((seg, idx) => {
        const sx = seg.x * CELL;
        const sy = seg.y * CELL;
        const isHead = idx === 0;

        // Solid Royal Blue Body
        ctx2d.fillStyle = '#4674e9';
        const r = isHead ? 10 : 8;
        ctx2d.beginPath();
        ctx2d.roundRect(sx + 1, sy + 1, CELL - 2, CELL - 2, r);
        ctx2d.fill();

        // Large Googly Eyes (Google Snake Style)
        if (isHead) {
          const eyeR = 5.5;
          const pupilR = 2.5;
          let e1x = sx + CELL / 2, e1y = sy + CELL / 2;
          let e2x = sx + CELL / 2, e2y = sy + CELL / 2;
          let px1 = e1x, py1 = e1y, px2 = e2x, py2 = e2y;

          if (g.dir.x === 1) { // right
            e1x = sx + CELL - 8; e1y = sy + 9;
            e2x = sx + CELL - 8; e2y = sy + CELL - 9;
            px1 = e1x + 1.5; py1 = e1y; px2 = e2x + 1.5; py2 = e2y;
          } else if (g.dir.x === -1) { // left
            e1x = sx + 8; e1y = sy + 9;
            e2x = sx + 8; e2y = sy + CELL - 9;
            px1 = e1x - 1.5; py1 = e1y; px2 = e2x - 1.5; py2 = e2y;
          } else if (g.dir.y === -1) { // up
            e1x = sx + 9; e1y = sy + 8;
            e2x = sx + CELL - 9; e2y = sy + 8;
            px1 = e1x; py1 = e1y - 1.5; px2 = e2x; py2 = e2y - 1.5;
          } else { // down
            e1x = sx + 9; e1y = sy + CELL - 8;
            e2x = sx + CELL - 9; e2y = sy + CELL - 8;
            px1 = e1x; py1 = e1y + 1.5; px2 = e2x; py2 = e2y + 1.5;
          }

          // White Eye Balls
          ctx2d.fillStyle = '#ffffff';
          ctx2d.beginPath(); ctx2d.arc(e1x, e1y, eyeR, 0, Math.PI * 2); ctx2d.fill();
          ctx2d.beginPath(); ctx2d.arc(e2x, e2y, eyeR, 0, Math.PI * 2); ctx2d.fill();

          // Dark Pupils
          ctx2d.fillStyle = '#1f2937';
          ctx2d.beginPath(); ctx2d.arc(px1, py1, pupilR, 0, Math.PI * 2); ctx2d.fill();
          ctx2d.beginPath(); ctx2d.arc(px2, py2, pupilR, 0, Math.PI * 2); ctx2d.fill();
        }
      });

      // Center flash message removed as requested

      animRef.current = requestAnimationFrame(loop);
    };

    animRef.current = requestAnimationFrame(loop);
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, [phase]);

  // ── Auto-advance countdown for completion ──
  useEffect(() => {
    let timer;
    if (phase === 'complete' && difficulty !== 'hard') {
      setAutoCountdown(10);
      timer = setInterval(() => {
        setAutoCountdown(prev => {
          if (prev <= 1) { clearInterval(timer); handleNextLevel(); return 0; }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [phase, difficulty]);

  const handleNextLevel = () => {
    if (difficulty === 'easy') { setDifficulty('medium'); initGame('medium'); }
    else if (difficulty === 'medium') { setDifficulty('hard'); initGame('hard'); }
    else { setDifficulty('easy'); initGame('easy'); }
  };

  const handlePlayAgain = () => {
    setDifficulty('easy');
    initGame('easy');
  };

  const handleSelectLevel = (lvl) => {
    setDifficulty(lvl);
    initGame(lvl);
  };

  // ── RENDER ──
  // START SCREEN
  if (phase === 'start') {
    return (
      <div className="morpho-snake-container">
        <div className="snake-start-screen">
          <div className="snake-start-card">
            <div className="snake-start-icon">🐍</div>
            <h2 className="snake-start-title">MORPHEME SNAKE</h2>
            <p className="snake-start-desc">
              Guide the neon snake to eat morpheme pieces <strong>in the correct order</strong> to build words!
              Eat the <span style={{ color: '#38bdf8' }}>prefix</span>, then the <span style={{ color: '#fbbf24' }}>root</span>, then the <span style={{ color: '#4ade80' }}>suffix</span>.
              <br /><br />
              ⚠️ Avoid eating <span style={{ color: '#f87171' }}>wrong pieces</span> or hitting yourself — you'll lose a life!
              <br />🎮 Use <strong>Arrow Keys</strong> or <strong>WASD</strong> to steer the snake.
            </p>

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginBottom: '1.25rem' }}>
              <button className={`snake-level-btn ${difficulty === 'easy' ? 'active' : ''}`} onClick={() => setDifficulty('easy')}>🟢 Easy</button>
              <button className={`snake-level-btn ${difficulty === 'medium' ? 'active' : ''}`} onClick={() => setDifficulty('medium')}>🟡 Medium</button>
              <button className={`snake-level-btn ${difficulty === 'hard' ? 'active' : ''}`} onClick={() => setDifficulty('hard')}>🔴 Hard</button>
            </div>

            <button className="snake-btn-start" onClick={() => initGame(difficulty)}>
              🐍 START GAME
            </button>
          </div>
        </div>
      </div>
    );
  }

  // COMPLETION SCREEN WITH DYNAMIC STAR RATING & MASTERY BADGES
  if (phase === 'complete') {
    const totalPossible = RECIPES[difficulty]?.length || 5;
    const accuracy = wordsBuilt > 0 ? Math.round((wordsBuilt / totalPossible) * 100) : 0;
    const starCount = lives >= 3 ? 3 : lives === 2 ? 2 : 1;
    const rankTitle = starCount === 3 ? '🏅 MORPHEME MASTER' : starCount === 2 ? '🥈 WORD WIZARD' : '🥉 SLITHERER IN TRAINING';

    return (
      <div className="morpho-snake-container">
        <div className="snake-complete-modal">
          <div className="snake-complete-card">
            {/* Dynamic Star Rating */}
            <div className="snake-star-rating">
              <span className={`star ${starCount >= 1 ? 'gold' : ''}`}>⭐</span>
              <span className={`star ${starCount >= 2 ? 'gold' : ''}`}>⭐</span>
              <span className={`star ${starCount >= 3 ? 'gold' : ''}`}>⭐</span>
            </div>

            <h2 className="snake-complete-title">{rankTitle}</h2>
            <p className="snake-complete-sub">
              {lives > 0
                ? `🤖 SPARKY: "Awesome slithering! You built ${wordsBuilt} out of ${totalPossible} words with ${accuracy}% accuracy!"`
                : `🤖 SPARKY: "Great try! You built ${wordsBuilt} words before running out of lives!"`}
            </p>

            <div className="snake-complete-stats">
              <div className="snake-stat-box">
                <small>Words Built</small>
                <div className="stat-val" style={{ color: '#22d3ee' }}>{wordsBuilt}/{totalPossible}</div>
              </div>
              <div className="snake-stat-box">
                <small>Total Score</small>
                <div className="stat-val" style={{ color: '#fbbf24' }}>{score} XP</div>
              </div>
              <div className="snake-stat-box">
                <small>Accuracy Rate</small>
                <div className="stat-val" style={{ color: '#4ade80' }}>{accuracy}%</div>
              </div>
            </div>

            <div className="snake-complete-btns">
              <button className="snake-btn-play-again" onClick={handlePlayAgain}>🔄 PLAY AGAIN</button>
              {lives > 0 && difficulty !== 'hard' && (
                <button className="snake-btn-next" onClick={handleNextLevel}>
                  NEXT TIER ➔ ({difficulty === 'easy' ? 'Medium' : 'Hard'})
                </button>
              )}
              <button className="snake-btn-hq" onClick={async () => {
                await saveTherapyProgress(currentUser, 'morphology', score, accuracy, `${wordsBuilt} words`);
                onComplete();
              }}>
                MISSION HQ 🏠
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // PLAYING SCREEN
  return (
    <div ref={gameWrapperRef} className={`morpho-snake-container ${isFullView ? 'snake-fullscreen' : ''}`}>
      {/* HUD */}
      <header className="snake-hud">
        <div className="snake-hud-title">
          <span>🐍</span> MORPHEME SNAKE
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button className={`snake-level-btn ${difficulty === 'easy' ? 'active' : ''}`} onClick={() => handleSelectLevel('easy')}>🟢</button>
          <button className={`snake-level-btn ${difficulty === 'medium' ? 'active' : ''}`} onClick={() => handleSelectLevel('medium')}>🟡</button>
          <button className={`snake-level-btn ${difficulty === 'hard' ? 'active' : ''}`} onClick={() => handleSelectLevel('hard')}>🔴</button>
        </div>
        <div className="snake-hud-stats">
          <div className="snake-stat-pill">🏆 {score}</div>
          <div className="snake-stat-pill">📝 {wordsBuilt} Words</div>
          <div className="snake-stat-pill">{'❤️'.repeat(Math.max(0, lives))}</div>
        </div>
      </header>

      {/* Target Word Banner */}
      {currentRecipe && (
        <div className="snake-target-banner">
          <div className="snake-target-icon">📜</div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span className="snake-target-word">{currentRecipe.word}</span>
              <button onClick={() => speakText(`Build the word ${currentRecipe.word}. It means ${currentRecipe.hint}`)} style={{ background: 'rgba(34,211,238,0.15)', border: '1.5px solid #22d3ee', color: '#22d3ee', padding: '4px 12px', borderRadius: '50px', fontWeight: 800, fontSize: '0.8rem', cursor: 'pointer', fontFamily: 'inherit' }}>🔊</button>
            </div>
            <div className="snake-target-hint">💡 {currentRecipe.hint}</div>
            <div className="snake-order-pills">
              {currentRecipe.parts.map((part, i) => (
                <span key={i} className={`snake-order-pill ${part.type} ${eatenParts.includes(part.text) ? 'eaten' : ''}`}>
                  {eatenParts.includes(part.text) ? `✅ ${part.text}` : `${i + 1}. ${part.type}`}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Canvas */}
      <div className="snake-canvas-viewport">
        <canvas ref={canvasRef} width={W} height={H} />
      </div>

      {/* Mobile Controls & Fullscreen Button */}
      <div className="snake-mobile-controls" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginTop: '0.75rem' }}>
        <button className="snake-fullview-btn" onClick={toggleFullView} style={{ background: 'rgba(255,255,255,0.08)', border: '1.5px solid rgba(255,255,255,0.25)', color: '#22d3ee', padding: '5px 14px', borderRadius: '50px', fontWeight: 800, fontSize: '0.82rem', cursor: 'pointer', fontFamily: 'inherit' }}>
          {isFullView ? '↙ Exit Fullscreen' : '⛶ Fullscreen'}
        </button>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button className="snake-dpad-btn" onClick={() => handleDPad(-1, 0)}>◀</button>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button className="snake-dpad-btn" onClick={() => handleDPad(0, -1)}>▲</button>
            <button className="snake-dpad-btn" onClick={() => handleDPad(0, 1)}>▼</button>
          </div>
          <button className="snake-dpad-btn" onClick={() => handleDPad(1, 0)}>▶</button>
        </div>
      </div>
    </div>
  );
};

export default MorphoSnake;
