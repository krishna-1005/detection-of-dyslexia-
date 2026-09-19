import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../auth/AuthContext';
import { saveTherapyProgress } from './ExerciseSystem';
import './SuperLexiMario.css';

// ── Web Audio Synthesizer Engine for Mario SFX ──
const playMarioSFX = (type) => {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'jump') {
      osc.type = 'square';
      osc.frequency.setValueAtTime(150, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.18);
      osc.start();
      osc.stop(ctx.currentTime + 0.18);
    } else if (type === 'coin') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(987.77, ctx.currentTime);
      osc.frequency.setValueAtTime(1318.51, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } else if (type === 'block') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(300, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.2);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } else if (type === 'win') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, ctx.currentTime);
      osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1);
      osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.2);
      osc.frequency.setValueAtTime(1046.50, ctx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    } else if (type === 'damage') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(400, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.35);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    }
  } catch (e) {}
};

const speakText = (text) => {
  try {
    window.speechSynthesis.cancel();
    const ut = new SpeechSynthesisUtterance(text);
    window.speechSynthesis.speak(ut);
  } catch (e) {}
};

const QUESTIONS = [
  {
    targetPhoneme: '/SH/',
    question: 'Which word starts with the /SH/ sound?',
    choices: [
      { text: 'SHIP', emoji: '🚢', isCorrect: true },
      { text: 'CHIP', emoji: '🍟', isCorrect: false },
      { text: 'SUN', emoji: '☀️', isCorrect: false }
    ]
  },
  {
    targetPhoneme: 'un-',
    question: 'Which word uses the prefix "un-" to mean "not happy"?',
    choices: [
      { text: 'Unhappy', emoji: '🙁', isCorrect: true },
      { text: 'Happily', emoji: '😄', isCorrect: false },
      { text: 'Happiness', emoji: '✨', isCorrect: false }
    ]
  },
  {
    targetPhoneme: '/TR/',
    question: 'Which word starts with the /TR/ sound?',
    choices: [
      { text: 'TREE', emoji: '🌲', isCorrect: true },
      { text: 'CAR', emoji: '🚗', isCorrect: false },
      { text: 'FISH', emoji: '🐟', isCorrect: false }
    ]
  },
  {
    targetPhoneme: '-ful',
    question: 'Which word uses the suffix "-ful" to mean "full of care"?',
    choices: [
      { text: 'Careful', emoji: '🛡️', isCorrect: true },
      { text: 'Careless', emoji: '⚠️', isCorrect: false },
      { text: 'Caring', emoji: '❤️', isCorrect: false }
    ]
  }
];

const SuperLexiMario = ({ onComplete }) => {
  const { currentUser } = useAuth();
  const canvasRef = useRef(null);

  // Game state
  const [score, setScore] = useState(0);
  const [coins, setCoins] = useState(0);
  const [lives, setLives] = useState(3);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isGameWon, setIsGameWon] = useState(false);
  const [damageFlash, setDamageFlash] = useState(false);
  const [screenShake, setScreenShake] = useState(false);
  const [wrongAnswer, setWrongAnswer] = useState(null); // track wrong choice index
  const [correctReveal, setCorrectReveal] = useState(false); // reveal correct answer
  const [currentQuestion, setCurrentQuestion] = useState(null);

  // Key tracking
  const keysRef = useRef({ left: false, right: false, jump: false });

  // Physics constants
  const GRAVITY = 0.55;
  const JUMP_FORCE = -12.5;
  const SPEED = 4.5;

  // Level World state
  const gameStateRef = useRef({
    player: { x: 50, y: 200, width: 36, height: 46, vx: 0, vy: 0, grounded: false, direction: 'right' },
    cameraX: 0,
    coins: [
      { x: 220, y: 240, collected: false },
      { x: 260, y: 240, collected: false },
      { x: 300, y: 240, collected: false },
      { x: 550, y: 200, collected: false },
      { x: 600, y: 200, collected: false },
      { x: 820, y: 230, collected: false },
      { x: 1050, y: 220, collected: false },
      { x: 1100, y: 220, collected: false },
    ],
    blocks: [
      { x: 180, y: 220, width: 40, height: 40, type: 'brick' },
      { x: 220, y: 220, width: 40, height: 40, type: 'question', hit: false, qIdx: 0 },
      { x: 260, y: 220, width: 40, height: 40, type: 'brick' },
      { x: 500, y: 180, width: 40, height: 40, type: 'question', hit: false, qIdx: 1 },
      { x: 540, y: 180, width: 40, height: 40, type: 'brick' },
      { x: 780, y: 210, width: 40, height: 40, type: 'question', hit: false, qIdx: 2 },
      { x: 1000, y: 200, width: 40, height: 40, type: 'question', hit: false, qIdx: 3 },
    ],
    platforms: [
      { x: 0, y: 340, width: 450, height: 80 },
      { x: 500, y: 340, width: 400, height: 80 },
      { x: 960, y: 340, width: 600, height: 80 },
    ],
    flagPole: { x: 1450, y: 120, width: 10, height: 220 }
  });

  const resetGame = useCallback(() => {
    setScore(0);
    setCoins(0);
    setLives(3);
    setIsGameOver(false);
    setIsGameWon(false);
    setCurrentQuestion(null);

    gameStateRef.current = {
      player: { x: 50, y: 200, width: 36, height: 46, vx: 0, vy: 0, grounded: false, direction: 'right' },
      cameraX: 0,
      coins: [
        { x: 220, y: 240, collected: false },
        { x: 260, y: 240, collected: false },
        { x: 300, y: 240, collected: false },
        { x: 550, y: 200, collected: false },
        { x: 600, y: 200, collected: false },
        { x: 820, y: 230, collected: false },
        { x: 1050, y: 220, collected: false },
        { x: 1100, y: 220, collected: false },
      ],
      blocks: [
        { x: 180, y: 220, width: 40, height: 40, type: 'brick' },
        { x: 220, y: 220, width: 40, height: 40, type: 'question', hit: false, qIdx: 0 },
        { x: 260, y: 220, width: 40, height: 40, type: 'brick' },
        { x: 500, y: 180, width: 40, height: 40, type: 'question', hit: false, qIdx: 1 },
        { x: 540, y: 180, width: 40, height: 40, type: 'brick' },
        { x: 780, y: 210, width: 40, height: 40, type: 'question', hit: false, qIdx: 2 },
        { x: 1000, y: 200, width: 40, height: 40, type: 'question', hit: false, qIdx: 3 },
      ],
      platforms: [
        { x: 0, y: 340, width: 450, height: 80 },
        { x: 500, y: 340, width: 400, height: 80 },
        { x: 960, y: 340, width: 600, height: 80 },
      ],
      flagPole: { x: 1450, y: 120, width: 10, height: 220 }
    };
  }, []);

  // Controls Listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (currentQuestion || isGameOver || isGameWon) return;
      if (e.key === 'ArrowLeft' || e.key === 'a') keysRef.current.left = true;
      if (e.key === 'ArrowRight' || e.key === 'd') keysRef.current.right = true;
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === ' ') {
        e.preventDefault();
        keysRef.current.jump = true;
      }
    };

    const handleKeyUp = (e) => {
      if (e.key === 'ArrowLeft' || e.key === 'a') keysRef.current.left = false;
      if (e.key === 'ArrowRight' || e.key === 'd') keysRef.current.right = false;
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === ' ') keysRef.current.jump = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [currentQuestion, isGameOver, isGameWon]);

  // Game Loop Engine
  useEffect(() => {
    let animId;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const update = () => {
      if (currentQuestion || isGameOver || isGameWon) return;

      const state = gameStateRef.current;
      const { player, platforms, blocks, coins: coinList, flagPole } = state;

      // Horizontal movement
      if (keysRef.current.left) {
        player.vx = -SPEED;
        player.direction = 'left';
      } else if (keysRef.current.right) {
        player.vx = SPEED;
        player.direction = 'right';
      } else {
        player.vx *= 0.8;
      }

      // Jump action
      if (keysRef.current.jump && player.grounded) {
        player.vy = JUMP_FORCE;
        player.grounded = false;
        playMarioSFX('jump');
      }

      // Gravity
      player.vy += GRAVITY;

      // Apply movement
      player.x += player.vx;
      player.y += player.vy;

      // Collision with platforms
      player.grounded = false;
      platforms.forEach((plat) => {
        if (
          player.x + player.width > plat.x &&
          player.x < plat.x + plat.width &&
          player.y + player.height >= plat.y &&
          player.y + player.height <= plat.y + plat.height &&
          player.vy >= 0
        ) {
          player.y = plat.y - player.height;
          player.vy = 0;
          player.grounded = true;
        }
      });

      // Collision with blocks
      blocks.forEach((blk) => {
        if (
          player.x + player.width > blk.x &&
          player.x < blk.x + blk.width &&
          player.y < blk.y + blk.height &&
          player.y + player.height > blk.y
        ) {
          // Hit block from bottom
          if (player.vy < 0 && player.y > blk.y) {
            player.vy = 0;
            player.y = blk.y + blk.height;
            if (blk.type === 'question' && !blk.hit) {
              blk.hit = true;
              playMarioSFX('block');
              const qObj = QUESTIONS[blk.qIdx || 0];
              setCurrentQuestion(qObj);
              speakText(`Question: ${qObj.question}`);
            }
          }
        }
      });

      // Coin pickup
      coinList.forEach((c) => {
        if (!c.collected && Math.hypot(player.x + player.width / 2 - c.x, player.y + player.height / 2 - c.y) < 25) {
          c.collected = true;
          setCoins((prev) => prev + 1);
          setScore((prev) => prev + 100);
          playMarioSFX('coin');
        }
      });

      // Flagpole win check
      if (player.x + player.width >= flagPole.x) {
        setIsGameWon(true);
        playMarioSFX('win');
        saveTherapyProgress(currentUser, 'phoneme', score + 500, 100, 'Super Lexi Mario');
      }

      // Pitfall check
      if (player.y > 450) {
        setLives((prev) => {
          const nextLives = prev - 1;
          if (nextLives <= 0) {
            setIsGameOver(true);
          } else {
            // Respawn
            player.x = Math.max(50, player.x - 250);
            player.y = 100;
            player.vx = 0;
            player.vy = 0;
          }
          return nextLives;
        });
      }

      // Camera follow
      state.cameraX = Math.max(0, player.x - 200);
    };

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const state = gameStateRef.current;
      const { player, platforms, blocks, coins: coinList, flagPole, cameraX } = state;

      ctx.save();
      ctx.translate(-cameraX, 0);

      // ☁️ Clouds background
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      [100, 400, 800, 1200].forEach((cx) => {
        ctx.beginPath();
        ctx.arc(cx, 60, 25, 0, Math.PI * 2);
        ctx.arc(cx + 20, 50, 30, 0, Math.PI * 2);
        ctx.arc(cx + 45, 60, 22, 0, Math.PI * 2);
        ctx.fill();
      });

      // 🌿 Ground platforms
      platforms.forEach((plat) => {
        ctx.fillStyle = '#48bb78';
        ctx.fillRect(plat.x, plat.y, plat.width, 14);
        ctx.fillStyle = '#8c6d46';
        ctx.fillRect(plat.x, plat.y + 14, plat.width, plat.height - 14);
      });

      // 🧱 Blocks
      blocks.forEach((blk) => {
        if (blk.type === 'question') {
          ctx.fillStyle = blk.hit ? '#a0aec0' : '#ecc94b';
          ctx.fillRect(blk.x, blk.y, blk.width, blk.height);
          ctx.strokeStyle = '#d69e2e';
          ctx.lineWidth = 3;
          ctx.strokeRect(blk.x, blk.y, blk.width, blk.height);

          ctx.fillStyle = '#744210';
          ctx.font = 'bold 22px Fredoka, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(blk.hit ? '✓' : '❓', blk.x + 20, blk.y + 28);
        } else {
          ctx.fillStyle = '#c05621';
          ctx.fillRect(blk.x, blk.y, blk.width, blk.height);
          ctx.strokeStyle = '#7b341e';
          ctx.strokeRect(blk.x, blk.y, blk.width, blk.height);
        }
      });

      // 🪙 Coins
      coinList.forEach((c) => {
        if (!c.collected) {
          ctx.fillStyle = '#f6e05e';
          ctx.beginPath();
          ctx.arc(c.x, c.y, 10, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#d69e2e';
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      });

      // 🚩 Flagpole
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(flagPole.x, flagPole.y, flagPole.width, flagPole.height);
      ctx.fillStyle = '#e53e3e';
      ctx.beginPath();
      ctx.moveTo(flagPole.x, flagPole.y);
      ctx.lineTo(flagPole.x - 35, flagPole.y + 20);
      ctx.lineTo(flagPole.x, flagPole.y + 40);
      ctx.fill();

      // 🔴 Mario Character (Lexi)
      ctx.fillStyle = '#e53e3e';
      ctx.fillRect(player.x, player.y, player.width, player.height);

      // Mario Cap & Eyes
      ctx.fillStyle = '#2b6cb0';
      ctx.fillRect(player.x + 4, player.y + player.height - 18, player.width - 8, 18);
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(player.x + (player.direction === 'right' ? 24 : 12), player.y + 14, 5, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    };

    const loop = () => {
      update();
      render();
      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [currentQuestion, isGameOver, isGameWon, currentUser, score]);

  const handleAnswerClick = (choice, idx) => {
    if (choice.isCorrect) {
      setScore((prev) => prev + 300);
      setCoins((prev) => prev + 5);
      playMarioSFX('win');
      speakText('Correct! You got 5 extra coins!');
      setWrongAnswer(null);
      setCorrectReveal(false);
      setCurrentQuestion(null);
    } else {
      // ── PUNISHMENT FOR WRONG ANSWER ──
      playMarioSFX('damage');
      setWrongAnswer(idx);
      setCorrectReveal(true);

      // 1. Lose a life
      setLives((prev) => {
        const nextLives = prev - 1;
        if (nextLives <= 0) {
          setTimeout(() => { setCurrentQuestion(null); setIsGameOver(true); }, 1200);
        }
        return nextLives;
      });

      // 2. Lose 3 coins
      setCoins((prev) => Math.max(0, prev - 3));

      // 3. Lose score
      setScore((prev) => Math.max(0, prev - 150));

      // 4. Screen shake + damage flash
      setScreenShake(true);
      setDamageFlash(true);
      setTimeout(() => setScreenShake(false), 400);
      setTimeout(() => setDamageFlash(false), 600);

      // 5. Knock player backward
      const player = gameStateRef.current.player;
      player.x = Math.max(10, player.x - 120);
      player.vy = -6;

      // Find correct answer text
      const correctChoice = currentQuestion.choices.find(c => c.isCorrect);
      speakText(`Wrong! You lost a life and 3 coins! The correct answer was ${correctChoice?.text || ''}`);

      // Close question after showing correct answer for 1.5s
      setTimeout(() => {
        setWrongAnswer(null);
        setCorrectReveal(false);
        setCurrentQuestion(null);
      }, 1800);
    }
  };

  const handleTouch = (action, state) => {
    if (action === 'left') keysRef.current.left = state;
    if (action === 'right') keysRef.current.right = state;
    if (action === 'jump') keysRef.current.jump = state;
  };

  return (
    <div className="mario-game-container">
      {/* HUD Bar */}
      <div className="mario-hud">
        <div className="mario-hud-title">
          <span>🍄</span> SUPER LEXI MARIO RUNNER
        </div>
        <div className="mario-hud-stats">
          <div className="mario-stat-badge">🪙 {coins} Coins</div>
          <div className="mario-stat-badge">⭐ {score} XP</div>
          <div className="mario-stat-badge">{lives > 0 ? '❤️'.repeat(lives) : '💀'}</div>
        </div>
      </div>

      {/* Canvas Viewport */}
      <div className={`mario-canvas-wrap ${screenShake ? 'mario-shake' : ''} ${damageFlash ? 'mario-damage-flash' : ''}`}>
        <canvas ref={canvasRef} width={800} height={450} className="mario-canvas" />

        {currentQuestion && (
          <div className="mario-question-overlay">
            <div className="mario-question-card">
              <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: '8px' }}>❓</span>
              <span style={{ color: '#fbbf24', fontWeight: 900, fontSize: '0.85rem' }}>
                PHONEME BLOCK UNLOCKED!
              </span>
              <h3 style={{ margin: '8px 0 16px 0', fontSize: '1.25rem' }}>{currentQuestion.question}</h3>

              <div className="mario-question-choices">
                {currentQuestion.choices.map((c, i) => {
                  let btnClass = 'mario-choice-btn';
                  let extraStyle = {};
                  if (wrongAnswer !== null) {
                    if (i === wrongAnswer) {
                      btnClass += ' mario-choice-wrong';
                      extraStyle = { background: 'rgba(239, 68, 68, 0.3)', border: '3px solid #ef4444', pointerEvents: 'none' };
                    } else if (correctReveal && c.isCorrect) {
                      btnClass += ' mario-choice-correct';
                      extraStyle = { background: 'rgba(74, 222, 128, 0.3)', border: '3px solid #4ade80', pointerEvents: 'none' };
                    } else {
                      extraStyle = { opacity: 0.4, pointerEvents: 'none' };
                    }
                  }
                  return (
                    <button key={i} className={btnClass} style={extraStyle} onClick={() => handleAnswerClick(c, i)}>
                      <span style={{ fontSize: '1.6rem' }}>{c.emoji}</span>
                      <span>{c.text}</span>
                      {wrongAnswer !== null && i === wrongAnswer && <span style={{ fontSize: '1.1rem', marginLeft: '6px' }}>❌</span>}
                      {correctReveal && c.isCorrect && <span style={{ fontSize: '1.1rem', marginLeft: '6px' }}>✅</span>}
                    </button>
                  );
                })}
              </div>

              {wrongAnswer !== null && (
                <div style={{ marginTop: '14px', padding: '10px 16px', background: 'rgba(239,68,68,0.15)', border: '1.5px solid rgba(239,68,68,0.4)', borderRadius: '12px', color: '#fca5a5', fontWeight: 800, fontSize: '0.9rem' }}>
                  💀 -1 Life • -3 Coins • -150 XP • Knocked Back!
                </div>
              )}
            </div>
          </div>
        )}

        {/* Victory Screen */}
        {isGameWon && (
          <div className="mario-question-overlay">
            <div className="mario-question-card">
              <span style={{ fontSize: '3.5rem', display: 'block' }}>🏆 🍄 🚩</span>
              <h2 style={{ fontSize: '1.8rem', fontWeight: 900, color: '#48bb78', margin: '8px 0' }}>LEVEL CLEAR!</h2>
              <p style={{ color: '#cbd5e1', marginBottom: '1.5rem' }}>
                Awesome job! You reached the flagpole with {coins} Coins and {score} XP!
              </p>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                <button
                  onClick={resetGame}
                  style={{
                    background: 'linear-gradient(135deg, #ff7675, #d63031)',
                    border: 'none',
                    color: '#fff',
                    padding: '12px 24px',
                    borderRadius: '50px',
                    fontWeight: 800,
                    fontSize: '1rem',
                    cursor: 'pointer',
                    boxShadow: '0 4px 15px rgba(214,48,49,0.4)',
                  }}
                >
                  🔄 PLAY AGAIN
                </button>
                <button
                  onClick={onComplete}
                  style={{
                    background: 'linear-gradient(135deg, #38bdf8, #0284c7)',
                    border: 'none',
                    color: '#fff',
                    padding: '12px 24px',
                    borderRadius: '50px',
                    fontWeight: 800,
                    fontSize: '1rem',
                    cursor: 'pointer',
                  }}
                >
                  COMPLETE & DASHBOARD →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Game Over Screen */}
        {isGameOver && (
          <div className="mario-question-overlay">
            <div className="mario-question-card">
              <span style={{ fontSize: '3.5rem', display: 'block' }}>💥 🍄</span>
              <h2 style={{ fontSize: '1.8rem', fontWeight: 900, color: '#e53e3e', margin: '8px 0' }}>GAME OVER</h2>
              <p style={{ color: '#cbd5e1', marginBottom: '1.5rem' }}>Don't give up! Try jumping over the pits!</p>
              <button
                onClick={resetGame}
                style={{
                  background: 'linear-gradient(135deg, #ff7675, #d63031)',
                  border: 'none',
                  color: '#fff',
                  padding: '14px 28px',
                  borderRadius: '50px',
                  fontWeight: 800,
                  fontSize: '1.05rem',
                  cursor: 'pointer',
                  boxShadow: '0 4px 15px rgba(214,48,49,0.4)',
                }}
              >
                🔄 PLAY AGAIN
              </button>
            </div>
          </div>
        )}
      </div>

      {/* On-Screen Touch Controls */}
      <div className="mario-touch-controls">
        <div className="mario-dpad">
          <button
            className="mario-ctrl-btn"
            onTouchStart={() => handleTouch('left', true)}
            onTouchEnd={() => handleTouch('left', false)}
            onMouseDown={() => handleTouch('left', true)}
            onMouseUp={() => handleTouch('left', false)}
          >
            ◀
          </button>
          <button
            className="mario-ctrl-btn"
            onTouchStart={() => handleTouch('right', true)}
            onTouchEnd={() => handleTouch('right', false)}
            onMouseDown={() => handleTouch('right', true)}
            onMouseUp={() => handleTouch('right', false)}
          >
            ▶
          </button>
        </div>
        <button
          className="mario-ctrl-btn mario-jump-btn"
          onTouchStart={() => handleTouch('jump', true)}
          onTouchEnd={() => handleTouch('jump', false)}
          onMouseDown={() => handleTouch('jump', true)}
          onMouseUp={() => handleTouch('jump', false)}
        >
          🚀 JUMP
        </button>
      </div>
    </div>
  );
};

export default SuperLexiMario;
