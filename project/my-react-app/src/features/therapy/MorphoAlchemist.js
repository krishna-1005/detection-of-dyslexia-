import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../auth/AuthContext';
import { saveTherapyProgress } from './ExerciseSystem';
import { speakHumanText, VoiceSelectorChip } from './humanVoiceEngine';
import './MorphoAlchemist.css';

// ── "SATURDAY MORNING CARTRIDGE" COLOR TOKENS & VOLUMETRIC SHADING PALETTE ──
const PALETTE = {
  skyTop: '#5EC8F2',
  skyBottom: '#B8E8FF',
  dirt: '#8B4A2B',
  dirtShadow: '#6B3419',
  gold: '#FFC93C',
  inkOutline: '#2B1B12',
  snakeBody: '#3B82F6',
  snakeBelly: '#60A5FA',
  snakeHighlight: '#93C5FD',
  snakeShadow: '#1E3A8A',
  prefixBase: '#3B82F6',
  rootBase: '#10B981',
  suffixBase: '#F59E0B'
};

// ── Web Audio Synthesizer SFX Engine ──
const playMagicSFX = (type) => {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    const t = ctx.currentTime;

    if (type === 'drop') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(300, t);
      osc.frequency.exponentialRampToValueAtTime(700, t + 0.15);
      gain.gain.setValueAtTime(0.1, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.18);
      osc.start(); osc.stop(t + 0.18);
    } else if (type === 'brew_success') {
      osc.type = 'sine';
      [523.25, 659.25, 783.99, 1046.50].forEach((f, i) => {
        osc.frequency.setValueAtTime(f, t + i * 0.08);
      });
      gain.gain.setValueAtTime(0.15, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.5);
      osc.start(); osc.stop(t + 0.5);
    } else if (type === 'brew_fail') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(280, t);
      osc.frequency.exponentialRampToValueAtTime(140, t + 0.25);
      gain.gain.setValueAtTime(0.12, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);
      osc.start(); osc.stop(t + 0.3);
    }
  } catch (e) {}
};

const speakText = (text) => {
  speakHumanText(text);
};

const shuffleArray = (arr) => {
  const newArr = [...arr];
  for (let i = newArr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
  }
  return newArr;
};

// ── SPELLBOOK RECIPES DATA ──
const EASY_RECIPES = [
  { targetWord: 'Unhappy', recipeName: 'Potion of Sadness Undo', instruction: 'Brew a potion meaning "NOT HAPPY"', prefix: 'Un-', root: 'happy', suffix: '', hint: 'Prefix Un- (not) + Root happy' },
  { targetWord: 'Player', recipeName: 'Elixir of the Champion', instruction: 'Brew a potion for "SOMEONE WHO PLAYS"', prefix: '', root: 'Play', suffix: '-er', hint: 'Root Play + Suffix -er (person)' },
  { targetWord: 'Careless', recipeName: 'Draught of Recklessness', instruction: 'Brew a potion meaning "WITHOUT CARE"', prefix: '', root: 'Care', suffix: '-less', hint: 'Root Care + Suffix -less (without)' },
  { targetWord: 'Hopeful', recipeName: 'Light of Optimism', instruction: 'Brew a potion meaning "FULL OF HOPE"', prefix: '', root: 'Hope', suffix: '-ful', hint: 'Root Hope + Suffix -ful (full of)' },
  { targetWord: 'Unlock', recipeName: 'Keymaster Solution', instruction: 'Brew a potion meaning "OPEN A LOCK"', prefix: 'Un-', root: 'lock', suffix: '', hint: 'Prefix Un- (reverse) + Root lock' }
];

const MEDIUM_RECIPES = [
  { targetWord: 'Actor', recipeName: 'Stage Performer Essence', instruction: 'Brew a potion for "A PERSON WHO ACTS"', prefix: '', root: 'Act', suffix: '-or', hint: 'Root Act + Suffix -or (person)' },
  { targetWord: 'Readable', recipeName: 'Tome of Legibility', instruction: 'Brew a potion meaning "EASY TO READ"', prefix: '', root: 'Read', suffix: '-able', hint: 'Root Read + Suffix -able (capable of)' },
  { targetWord: 'Movable', recipeName: 'Kinetic Elixir', instruction: 'Brew a potion meaning "ABLE TO BE MOVED"', prefix: '', root: 'Move', suffix: '-able', hint: 'Root Move + Suffix -able (capable of)' },
  { targetWord: 'Reusable', recipeName: 'Eternal Recycling Brew', instruction: 'Brew a potion meaning "ABLE TO BE USED AGAIN"', prefix: 'Re-', root: 'use', suffix: '-able', hint: 'Prefix Re- (again) + Root use + Suffix -able' },
  { targetWord: 'Preview', recipeName: 'Vision of the Future', instruction: 'Brew a potion meaning "TO LOOK AT BEFOREHAND"', prefix: 'Pre-', root: 'view', suffix: '', hint: 'Prefix Pre- (before) + Root view' }
];

const HARD_RECIPES = [
  { targetWord: 'Flexible', recipeName: 'Bending Willow Tonic', instruction: 'Brew a potion meaning "CAPABLE OF BENDING"', prefix: '', root: 'Flex', suffix: '-ible', hint: 'Root Flex + Suffix -ible (capable of)' },
  { targetWord: 'Transform', recipeName: 'Metamorphosis Potion', instruction: 'Brew a potion meaning "TO CHANGE SHAPE"', prefix: 'Trans-', root: 'form', suffix: '', hint: 'Prefix Trans- (change) + Root form' },
  { targetWord: 'Creative', recipeName: 'Inspiration Nectar', instruction: 'Brew a potion meaning "HAVING THE QUALITY TO CREATE"', prefix: '', root: 'Create', suffix: '-ive', hint: 'Root Create + Suffix -ive (quality)' },
  { targetWord: 'Indirect', recipeName: 'Winding Path Serum', instruction: 'Brew a potion meaning "NOT DIRECT"', prefix: 'In-', root: 'direct', suffix: '', hint: 'Prefix In- (not) + Root direct' },
  { targetWord: 'Construct', recipeName: 'Builder\'s Guild Brew', instruction: 'Brew a potion meaning "TO BUILD TOGETHER"', prefix: 'Con-', root: 'struct', suffix: '', hint: 'Prefix Con- (together) + Root struct' }
];

const LEVEL_RECIPES = {
  easy: EASY_RECIPES,
  medium: MEDIUM_RECIPES,
  hard: HARD_RECIPES,
};

const W = 800;
const H = 400;

const MorphoAlchemist = ({ onComplete }) => {
  const { currentUser } = useAuth();
  const canvasRef = useRef(null);
  const animRef = useRef(null);

  const userName = currentUser?.displayName?.split(' ')[0] || 'Krish';

  // Game & Cauldron state
  const [phase, setPhase] = useState('playing');
  const [difficulty, setDifficulty] = useState('easy');
  const [recipeIdx, setRecipeIdx] = useState(0);
  const [manaXP, setManaXP] = useState(200);
  const [streak, setStreak] = useState(5);
  const [cauldron, setCauldron] = useState({ prefix: null, root: null, suffix: null });
  const [brewFeedback, setBrewFeedback] = useState(null);
  const [sparkyMsg, setSparkyMsg] = useState('Steer Morpho Snake to eat morpheme tokens! 🐍🧪');

  // Modals & Timers
  const [isCompleteModal, setIsCompleteModal] = useState(false);
  const [autoCountdown, setAutoCountdown] = useState(10);
  const [activeRecipes, setActiveRecipes] = useState(() => shuffleArray(EASY_RECIPES));

  const currentRecipe = activeRecipes[recipeIdx % activeRecipes.length] || EASY_RECIPES[0];

  // ── SNAKE MASCOT & ARENA STATE REF ──
  const snakeRef = useRef({
    x: 400, y: 200, vx: 3.2, vy: 0,
    dir: 'right',
    targetAngle: 0,
    currentAngle: 0,
    history: [], // [{x, y}] for smooth follow-the-leader slither
    segmentsCount: 7,
    growthPulse: 0,
    tokens: []
  });

  const keysRef = useRef({ up: false, down: false, left: false, right: false });

  // Generate Floating Morpheme Tokens in Canvas Arena
  const spawnArenaTokens = useCallback((recipe) => {
    const tokens = [];
    const poolPrefixes = shuffleArray(['Un-', 'Re-', 'Pre-', 'In-', 'Trans-', 'Con-']).slice(0, 3);
    const poolRoots = shuffleArray(['happy', 'Play', 'Care', 'Hope', 'lock', 'Act', 'Read', 'Move', 'use', 'view', 'Flex', 'form', 'Create', 'direct', 'struct']).slice(0, 4);
    const poolSuffixes = shuffleArray(['-er', '-less', '-ful', '-able', '-ible', '-or', '-ive']).slice(0, 3);

    if (recipe.prefix && !poolPrefixes.includes(recipe.prefix)) poolPrefixes[0] = recipe.prefix;
    if (recipe.root && !poolRoots.includes(recipe.root)) poolRoots[0] = recipe.root;
    if (recipe.suffix && !poolSuffixes.includes(recipe.suffix)) poolSuffixes[0] = recipe.suffix;

    let idx = 0;
    poolPrefixes.forEach(p => {
      tokens.push({ id: `p-${idx++}`, type: 'prefix', text: p, x: 100 + Math.random() * 600, y: 80 + Math.random() * 240, phase: Math.random() * 5 });
    });
    poolRoots.forEach(r => {
      tokens.push({ id: `r-${idx++}`, type: 'root', text: r, x: 100 + Math.random() * 600, y: 80 + Math.random() * 240, phase: Math.random() * 5 });
    });
    poolSuffixes.forEach(s => {
      tokens.push({ id: `s-${idx++}`, type: 'suffix', text: s, x: 100 + Math.random() * 600, y: 80 + Math.random() * 240, phase: Math.random() * 5 });
    });

    return tokens;
  }, []);

  // Level Switcher
  const handleSelectLevel = (newLevel) => {
    playMagicSFX('brew_success');
    setDifficulty(newLevel);
    setRecipeIdx(0);
    setCauldron({ prefix: null, root: null, suffix: null });
    setBrewFeedback(null);
    const recipes = LEVEL_RECIPES[newLevel] || EASY_RECIPES;
    setActiveRecipes(shuffleArray(recipes));

    snakeRef.current.tokens = spawnArenaTokens(recipes[0]);
    speakText(`Welcome to ${newLevel} Alchemist Lab! Steer Morpho Snake to eat tokens!`);
  };

  const handleNextRecipeSet = () => {
    setIsCompleteModal(false);
    if (difficulty === 'easy') handleSelectLevel('medium');
    else if (difficulty === 'medium') handleSelectLevel('hard');
    else handleSelectLevel('easy');
  };

  const handlePlayAgain = () => {
    playMagicSFX('brew_success');
    setIsCompleteModal(false);
    handleSelectLevel('easy');
  };

  useEffect(() => {
    setCauldron({ prefix: null, root: null, suffix: null });
    setBrewFeedback(null);
    setSparkyMsg(`Goal: ${currentRecipe.instruction}`);
    snakeRef.current.tokens = spawnArenaTokens(currentRecipe);
    speakText(`Recipe Goal: ${currentRecipe.instruction}`);
  }, [recipeIdx, currentRecipe, spawnArenaTokens]);

  // Handle Token Eaten by Snake
  const handleTokenEaten = useCallback((token) => {
    playMagicSFX('drop');
    setCauldron(prev => {
      const next = { ...prev, [token.type]: token.text };
      return next;
    });

    snakeRef.current.segmentsCount += 1;
    snakeRef.current.growthPulse = 15;

    setSparkyMsg(`🐍 Ate ${token.type.toUpperCase()} "${token.text}"! Keep building!`);
  }, []);

  // Clear Slot
  const handleClearSlot = (type) => {
    playMagicSFX('drop');
    setCauldron(prev => ({ ...prev, [type]: null }));
  };

  // Brew Potion Action
  const handleBrewSpell = () => {
    const p = cauldron.prefix || '';
    const r = cauldron.root || '';
    const s = (cauldron.suffix || '').replace('-', '');

    const builtWord = (p + r + s).toLowerCase();
    const targetWordClean = currentRecipe.targetWord.toLowerCase();

    const isCorrect = builtWord === targetWordClean;

    if (isCorrect) {
      playMagicSFX('brew_success');
      setBrewFeedback('success');
      setManaXP(prev => prev + 30);
      setStreak(prev => prev + 1);
      setSparkyMsg(`✨ SUCCESS! You brewed "${currentRecipe.targetWord}"! 🎉`);
      speakText(`Success! You brewed ${currentRecipe.targetWord}!`);
    } else {
      playMagicSFX('brew_fail');
      setBrewFeedback('fail');
      setSparkyMsg(`💥 Not quite! ${currentRecipe.hint}`);
      speakText(`Oops! That brewed ${builtWord || 'nothing'}. Try again! ${currentRecipe.hint}`);
    }

    setTimeout(() => {
      setBrewFeedback(null);
      if (isCorrect) {
        setCauldron({ prefix: null, root: null, suffix: null });
        const isLastOfRound = (recipeIdx + 1) % 5 === 0;
        if (isLastOfRound) {
          setIsCompleteModal(true);
        } else {
          setRecipeIdx(prev => prev + 1);
        }
      }
    }, 1100);
  };

  // Keyboard Navigation
  useEffect(() => {
    const down = (e) => {
      if (['ArrowLeft','ArrowRight','ArrowUp','ArrowDown',' '].includes(e.key)) {
        e.preventDefault();
      }
      if (['ArrowUp','w','W'].includes(e.key)) keysRef.current.up = true;
      if (['ArrowDown','s','S'].includes(e.key)) keysRef.current.down = true;
      if (['ArrowLeft','a','A'].includes(e.key)) keysRef.current.left = true;
      if (['ArrowRight','d','D'].includes(e.key)) keysRef.current.right = true;
    };
    const up = (e) => {
      if (['ArrowLeft','ArrowRight','ArrowUp','ArrowDown',' '].includes(e.key)) {
        e.preventDefault();
      }
      if (['ArrowUp','w','W'].includes(e.key)) keysRef.current.up = false;
      if (['ArrowDown','s','S'].includes(e.key)) keysRef.current.down = false;
      if (['ArrowLeft','a','A'].includes(e.key)) keysRef.current.left = false;
      if (['ArrowRight','d','D'].includes(e.key)) keysRef.current.right = false;
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, []);

  // ── 60FPS CANVAS SNAKE GAME LOOP WITH 2.5D VOLUMETRIC TOY SHADING ──
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const loop = (timestamp) => {
      const snk = snakeRef.current;
      if (!snk) return;

      const speed = 3.5;
      if (keysRef.current.up && snk.dir !== 'down') { snk.vx = 0; snk.vy = -speed; snk.dir = 'up'; }
      else if (keysRef.current.down && snk.dir !== 'up') { snk.vx = 0; snk.vy = speed; snk.dir = 'down'; }
      else if (keysRef.current.left && snk.dir !== 'right') { snk.vx = -speed; snk.vy = 0; snk.dir = 'left'; }
      else if (keysRef.current.right && snk.dir !== 'left') { snk.vx = speed; snk.vy = 0; snk.dir = 'right'; }

      snk.x += snk.vx;
      snk.y += snk.vy;

      if (snk.x < 20 || snk.x > W - 20) snk.vx *= -1;
      if (snk.y < 20 || snk.y > H - 20) snk.vy *= -1;

      snk.history.unshift({ x: snk.x, y: snk.y });
      if (snk.history.length > 200) snk.history.pop();

      snk.tokens.forEach(t => {
        if (!t.eaten) {
          const dist = Math.hypot(snk.x - t.x, snk.y - t.y);
          if (dist < 26) {
            t.eaten = true;
            handleTokenEaten(t);
          }
        }
      });

      // ── RENDER CANVAS LAB ARENA ──
      ctx.clearRect(0, 0, W, H);

      // Arena Floor Vignetted Background
      const bgGrad = ctx.createRadialGradient(W / 2, H / 2, 50, W / 2, H / 2, 400);
      bgGrad.addColorStop(0, '#1e1b4b');
      bgGrad.addColorStop(1, '#0f172a');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, W, H);

      // Soft Grid Pattern
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.lineWidth = 1;
      for (let gx = 0; gx < W; gx += 40) {
        ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, H); ctx.stroke();
      }
      for (let gy = 0; gy < H; gy += 40) {
        ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(W, gy); ctx.stroke();
      }

      // Ink-Brown Border Framing
      ctx.strokeStyle = PALETTE.inkOutline;
      ctx.lineWidth = 6;
      ctx.strokeRect(3, 3, W - 6, H - 6);

      // ── CAST SHADOWS UNDER FLOATING PUZZLE TOKENS ──
      snk.tokens.forEach(t => {
        if (t.eaten) return;
        const bobY = t.y + Math.sin(timestamp * 0.004 + t.phase) * 6;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
        ctx.beginPath();
        ctx.ellipse(t.x + 4, bobY + 24, 38, 7, 0, 0, Math.PI * 2);
        ctx.fill();
      });

      // ── DRAW FLOATING MORPHEME PUZZLE TOKENS ──
      snk.tokens.forEach(t => {
        if (t.eaten) return;
        const bobY = t.y + Math.sin(timestamp * 0.004 + t.phase) * 6;

        ctx.shadowColor = t.type === 'prefix' ? '#3b82f6' : (t.type === 'root' ? '#10b981' : '#f59e0b');
        ctx.shadowBlur = 14;

        ctx.fillStyle = t.type === 'prefix' ? PALETTE.prefixBase : (t.type === 'root' ? PALETTE.rootBase : PALETTE.suffixBase);
        ctx.beginPath();
        ctx.roundRect(t.x - 40, bobY - 20, 80, 40, 12);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Bevel Specular Top Highlight
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.beginPath();
        ctx.roundRect(t.x - 38, bobY - 18, 76, 5, [6, 6, 0, 0]);
        ctx.fill();

        ctx.strokeStyle = PALETTE.inkOutline;
        ctx.lineWidth = 2.5;
        ctx.strokeRect(t.x - 40, bobY - 20, 80, 40);

        ctx.fillStyle = '#ffffff';
        ctx.font = '900 14px "Fredoka", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const label = t.type === 'prefix' ? `${t.text} ▶` : (t.type === 'root' ? `◀ ${t.text} ▶` : `◀ ${t.text}`);
        ctx.fillText(label, t.x, bobY);
      });

      // ── CAST SHADOWS UNDER SNAKE BODY SEGMENTS (GROUND PLANE) ──
      const segmentSpacing = 10;
      for (let i = snk.segmentsCount - 1; i >= 1; i--) {
        const histIdx = Math.min(i * segmentSpacing, snk.history.length - 1);
        const pos = snk.history[histIdx] || { x: snk.x, y: snk.y };
        const taperRatio = 1 - (i / snk.segmentsCount);
        const radius = 6 + taperRatio * 9;
        const wiggle = Math.sin(i * 0.5 + timestamp * 0.012) * 3.5;
        const sx = pos.x + (snk.dir === 'up' || snk.dir === 'down' ? wiggle : 0);
        const sy = pos.y + (snk.dir === 'left' || snk.dir === 'right' ? wiggle : 0);

        ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
        ctx.beginPath();
        ctx.ellipse(sx + 3, sy + radius * 0.7, radius * 0.9, radius * 0.35, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      // ── DRAW VOLUMETRIC 2.5D GLOSSY TOY SNAKE SEGMENTS ──
      for (let i = snk.segmentsCount - 1; i >= 1; i--) {
        const histIdx = Math.min(i * segmentSpacing, snk.history.length - 1);
        const pos = snk.history[histIdx] || { x: snk.x, y: snk.y };

        const taperRatio = 1 - (i / snk.segmentsCount);
        const radius = 6 + taperRatio * 9;
        const wiggle = Math.sin(i * 0.5 + timestamp * 0.012) * 3.5;
        const sx = pos.x + (snk.dir === 'up' || snk.dir === 'down' ? wiggle : 0);
        const sy = pos.y + (snk.dir === 'left' || snk.dir === 'right' ? wiggle : 0);

        // Volumetric Radial Gradient Shader (-45 deg upper-left light source)
        const segGrad = ctx.createRadialGradient(
          sx - radius * 0.35, sy - radius * 0.35, radius * 0.1,
          sx, sy, radius
        );
        segGrad.addColorStop(0, PALETTE.snakeHighlight);
        segGrad.addColorStop(0.55, i % 2 === 0 ? PALETTE.snakeBody : PALETTE.snakeBelly);
        segGrad.addColorStop(1, PALETTE.snakeShadow);

        ctx.fillStyle = segGrad;
        ctx.beginPath();
        ctx.arc(sx, sy, radius, 0, Math.PI * 2);
        ctx.fill();

        // Glossy Specular Arc Highlight (Light sliding across toy body)
        ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
        ctx.beginPath();
        ctx.arc(sx - radius * 0.35, sy - radius * 0.35, radius * 0.3, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = PALETTE.inkOutline;
        ctx.lineWidth = 2.2;
        ctx.stroke();
      }

      // ── DRAW VOLUMETRIC GLOSSY SNAKE HEAD ──
      const hx = snk.x;
      const hy = snk.y;
      const headRadius = 16;

      // Ground Cast Shadow under Head
      ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
      ctx.beginPath();
      ctx.ellipse(hx + 4, hy + headRadius * 0.8, headRadius * 0.95, headRadius * 0.4, 0, 0, Math.PI * 2);
      ctx.fill();

      // Head Volumetric Radial Gradient
      const headGrad = ctx.createRadialGradient(
        hx - headRadius * 0.35, hy - headRadius * 0.35, headRadius * 0.1,
        hx, hy, headRadius
      );
      headGrad.addColorStop(0, PALETTE.snakeHighlight);
      headGrad.addColorStop(0.55, PALETTE.snakeBody);
      headGrad.addColorStop(1, PALETTE.snakeShadow);

      ctx.fillStyle = headGrad;
      ctx.beginPath();
      ctx.arc(hx, hy, headRadius, 0, Math.PI * 2);
      ctx.fill();

      // Glossy Top Specular Highlight
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.beginPath();
      ctx.arc(hx - headRadius * 0.35, hy - headRadius * 0.35, headRadius * 0.32, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = PALETTE.inkOutline;
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Expressive Eyes (o_o)
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(hx - 5, hy - 5, 4.5, 0, Math.PI * 2);
      ctx.arc(hx + 5, hy - 5, 4.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = PALETTE.inkOutline;
      ctx.beginPath();
      ctx.arc(hx - 5, hy - 5, 2, 0, Math.PI * 2);
      ctx.arc(hx + 5, hy - 5, 2, 0, Math.PI * 2);
      ctx.fill();

      // Ruby Pink Forked Tongue 👅
      const tongueFlick = Math.sin(timestamp * 0.018) > 0.4;
      if (tongueFlick) {
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        const tx = snk.dir === 'right' ? hx + 18 : (snk.dir === 'left' ? hx - 18 : hx);
        const ty = snk.dir === 'down' ? hy + 18 : (snk.dir === 'up' ? hy - 18 : hy);
        ctx.arc(tx, ty, 3, 0, Math.PI * 2);
        ctx.fill();
      }

      animRef.current = requestAnimationFrame(loop);
    };

    animRef.current = requestAnimationFrame(loop);
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, [handleTokenEaten]);

  // Shelf Available Items
  const availablePrefixes = ['Un-', 'Re-', 'Pre-', 'In-', 'Trans-', 'Con-'];
  const availableRoots = ['happy', 'Play', 'Care', 'Hope', 'lock', 'Act', 'Read', 'Move', 'use', 'view', 'Flex', 'form', 'Create', 'direct', 'struct'];
  const availableSuffixes = ['-er', '-less', '-ful', '-able', '-ible', '-or', '-ive'];

  return (
    <div className="alchemist-lab-container">
      <div className="magic-particle p1" />
      <div className="magic-particle p2" />

      {/* HUD Header */}
      <header className="alchemist-hud">
        <div className="alchemist-hud-title">
          <span>🐍</span> MORPHO SNAKE ARCADE
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button className={`mq-level-btn easy ${difficulty === 'easy' ? 'active' : ''}`} onClick={() => handleSelectLevel('easy')}>
            🟢 Easy
          </button>
          <button className={`mq-level-btn medium ${difficulty === 'medium' ? 'active' : ''}`} onClick={() => handleSelectLevel('medium')}>
            🟡 Medium
          </button>
          <button className={`mq-level-btn hard ${difficulty === 'hard' ? 'active' : ''}`} onClick={() => handleSelectLevel('hard')}>
            🔴 Hard
          </button>
        </div>

        <div className="alchemist-hud-stats">
          <VoiceSelectorChip />
          <div className="alchemist-stat-pill">✨ {manaXP} Mana XP</div>
          <div className="alchemist-stat-pill">🔥 {streak} Streak</div>
          <div className="alchemist-stat-pill">🧙 {userName}</div>
        </div>
      </header>

      {/* Promoted Speech-Bubble Clue Banner Attached to Sparky */}
      <div className="alchemist-speech-banner">
        <div className="alchemist-sparky-avatar">🤖</div>
        <div className="alchemist-bubble-text">
          <small>RECIPE GOAL:</small>
          <div className="alchemist-target-prompt">
            "{currentRecipe.instruction}"
            <button className="alchemist-sound-btn" onClick={() => speakText(currentRecipe.instruction)}>
              🔊 Hear Goal
            </button>
          </div>
        </div>
        <div className="alchemist-hurdle-counter">
          Recipe {recipeIdx + 1} / 5
        </div>
      </div>

      {/* 🧩 INTERLOCKING "WORD SO FAR" PUZZLE TRAY */}
      <div className="word-puzzle-tray-card">
        <div className="puzzle-tray-label">🧩 WORD SO FAR (INTERLOCKING PUZZLE TRAY):</div>
        <div className="puzzle-tokens-assembled">
          {cauldron.prefix ? (
            <div className="puzzle-token prefix-token" onClick={() => handleClearSlot('prefix')}>
              <small>PREFIX</small>
              <span>{cauldron.prefix}</span>
              <div className="puzzle-tab-right">▶</div>
            </div>
          ) : (
            <div className="puzzle-token-placeholder prefix-ph">
              <span>[PREFIX] ▶</span>
            </div>
          )}

          {cauldron.root ? (
            <div className="puzzle-token root-token" onClick={() => handleClearSlot('root')}>
              <div className="puzzle-notch-left">◀</div>
              <small>ROOT</small>
              <span>{cauldron.root}</span>
              <div className="puzzle-tab-right">▶</div>
            </div>
          ) : (
            <div className="puzzle-token-placeholder root-ph">
              <span>◀ [ROOT] ▶</span>
            </div>
          )}

          {cauldron.suffix ? (
            <div className="puzzle-token suffix-token" onClick={() => handleClearSlot('suffix')}>
              <div className="puzzle-notch-left">◀</div>
              <small>SUFFIX</small>
              <span>{cauldron.suffix}</span>
            </div>
          ) : (
            <div className="puzzle-token-placeholder suffix-ph">
              <span>◀ [SUFFIX]</span>
            </div>
          )}
        </div>
      </div>

      {/* 60FPS VOLUMETRIC SNAKE CANVAS ARENA */}
      <div className="snake-canvas-viewport">
        <canvas ref={canvasRef} width={W} height={H} style={{ display: 'block', borderRadius: '18px', margin: '0 auto' }} />
      </div>

      {/* Control D-Pad & Brew Button */}
      <div className="snake-controls-bar">
        <div className="snake-dpad">
          <button className="snake-ctrl-btn" onClick={() => { keysRef.current.up = true; setTimeout(() => keysRef.current.up = false, 150); }}>▲ UP</button>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="snake-ctrl-btn" onClick={() => { keysRef.current.left = true; setTimeout(() => keysRef.current.left = false, 150); }}>◀ LEFT</button>
            <button className="snake-ctrl-btn" onClick={() => { keysRef.current.down = true; setTimeout(() => keysRef.current.down = false, 150); }}>▼ DOWN</button>
            <button className="snake-ctrl-btn" onClick={() => { keysRef.current.right = true; setTimeout(() => keysRef.current.right = false, 150); }}>RIGHT ▶</button>
          </div>
        </div>

        <button className="btn-brew-spell" onClick={handleBrewSpell} disabled={!cauldron.root}>
          ✨ BREW SPELL POTION!
        </button>
      </div>

      <footer className="alchemist-footer">
        🤖 SPARKY: "{sparkyMsg}"
      </footer>
    </div>
  );
};

export default MorphoAlchemist;
