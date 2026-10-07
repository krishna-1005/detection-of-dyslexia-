import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../auth/AuthContext';
import { saveTherapyProgress } from './ExerciseSystem';
import './MorphologySnakeGame.css';

// ── SFX SYNTHESIZER ──
const playSFX = (type) => {
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.connect(g); g.connect(ctx.destination);
    const t = ctx.currentTime;

    if (type === 'eat') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(520, t);
      osc.frequency.exponentialRampToValueAtTime(1040, t + 0.1);
      g.gain.setValueAtTime(0.12, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
      osc.start(); osc.stop(t + 0.12);
    } else if (type === 'wrong') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(180, t);
      osc.frequency.exponentialRampToValueAtTime(80, t + 0.2);
      g.gain.setValueAtTime(0.1, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
      osc.start(); osc.stop(t + 0.22);
    } else if (type === 'win') {
      osc.type = 'triangle';
      [440, 554, 659, 880, 1047].forEach((f, i) => {
        osc.frequency.setValueAtTime(f, t + i * 0.08);
      });
      g.gain.setValueAtTime(0.15, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.55);
      osc.start(); osc.stop(t + 0.55);
    }
  } catch (e) {}
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

const speak = (text) => {
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

// ── 3-ROUND SNAKE MORPHEME DATA ──
const ROUND_DATA = {
  easy: {
    tierKey: 'easy',
    tierName: 'Easy Snake (2-Part Snap)',
    badgeColor: '#4ade80',
    speed: 190, // ms per tick
    targetGoal: 4,
    challenges: [
      {
        meaningClue: 'Build a word meaning: "Play again"',
        speakPrompt: 'Eat Re then play to build Replay!',
        sequence: ['Re', 'play'],
        assembledWord: 'Replay',
        pellets: [
          { text: 'Re', type: 'prefix', order: 0 },
          { text: 'play', type: 'root', order: 1 },
          { text: 'sing', type: 'root', order: -1 }
        ]
      },
      {
        meaningClue: 'Build a word meaning: "Full of help"',
        speakPrompt: 'Eat help then ful to build Helpful!',
        sequence: ['help', 'ful'],
        assembledWord: 'Helpful',
        pellets: [
          { text: 'help', type: 'root', order: 0 },
          { text: 'ful', type: 'suffix', order: 1 },
          { text: 'less', type: 'suffix', order: -1 }
        ]
      },
      {
        meaningClue: 'Build a word meaning: "Not happy"',
        speakPrompt: 'Eat Un then happy to build Unhappy!',
        sequence: ['Un', 'happy'],
        assembledWord: 'Unhappy',
        pellets: [
          { text: 'Un', type: 'prefix', order: 0 },
          { text: 'happy', type: 'root', order: 1 },
          { text: 'Dis', type: 'prefix', order: -1 }
        ]
      },
      {
        meaningClue: 'Build a word meaning: "Write again"',
        speakPrompt: 'Eat Re then write to build Rewrite!',
        sequence: ['Re', 'write'],
        assembledWord: 'Rewrite',
        pellets: [
          { text: 'Re', type: 'prefix', order: 0 },
          { text: 'write', type: 'root', order: 1 },
          { text: 'read', type: 'root', order: -1 }
        ]
      }
    ]
  },
  medium: {
    tierKey: 'medium',
    tierName: 'Medium Snake (3-Part Snap)',
    badgeColor: '#fbbf24',
    speed: 155,
    targetGoal: 3,
    challenges: [
      {
        meaningClue: 'Build a word meaning: "Cannot be broken"',
        speakPrompt: 'Eat Un, break, and able in order!',
        sequence: ['Un', 'break', 'able'],
        assembledWord: 'Unbreakable',
        pellets: [
          { text: 'Un', type: 'prefix', order: 0 },
          { text: 'break', type: 'root', order: 1 },
          { text: 'able', type: 'suffix', order: 2 },
          { text: 'Dis', type: 'prefix', order: -1 },
          { text: 'ible', type: 'suffix', order: -1 }
        ]
      },
      {
        meaningClue: 'Build a word meaning: "Read the wrong way"',
        speakPrompt: 'Eat Mis, read, and ing in order!',
        sequence: ['Mis', 'read', 'ing'],
        assembledWord: 'Misreading',
        pellets: [
          { text: 'Mis', type: 'prefix', order: 0 },
          { text: 'read', type: 'root', order: 1 },
          { text: 'ing', type: 'suffix', order: 2 },
          { text: 'Re', type: 'prefix', order: -1 },
          { text: 'ed', type: 'suffix', order: -1 }
        ]
      },
      {
        meaningClue: 'Build a word meaning: "Not capable of doing"',
        speakPrompt: 'Eat Un, do, and able in order!',
        sequence: ['Un', 'do', 'able'],
        assembledWord: 'Undoable',
        pellets: [
          { text: 'Un', type: 'prefix', order: 0 },
          { text: 'do', type: 'root', order: 1 },
          { text: 'able', type: 'suffix', order: 2 },
          { text: 'make', type: 'root', order: -1 },
          { text: 'ful', type: 'suffix', order: -1 }
        ]
      }
    ]
  },
  hard: {
    tierKey: 'hard',
    tierName: 'Hard Snake (Rule Shifts & Decoys)',
    badgeColor: '#f87171',
    speed: 125,
    targetGoal: 3,
    challenges: [
      {
        meaningClue: 'Build "Happiest" (Watch the y change to i!)',
        speakPrompt: 'Eat Happi with an i, then est! Avoid Happy decoy!',
        sequence: ['Happi', 'est'],
        assembledWord: 'Happiest',
        pellets: [
          { text: 'Happi', type: 'root', order: 0 },
          { text: 'est', type: 'suffix', order: 1 },
          { text: 'Happy', type: 'root', order: -1 },
          { text: 'es', type: 'suffix', order: -1 }
        ]
      },
      {
        meaningClue: 'Build a word meaning: "Able to reverse"',
        speakPrompt: 'Eat Revers and ible! Avoid -able decoy!',
        sequence: ['Revers', 'ible'],
        assembledWord: 'Reversible',
        pellets: [
          { text: 'Revers', type: 'root', order: 0 },
          { text: 'ible', type: 'suffix', order: 1 },
          { text: 'Reverse', type: 'root', order: -1 },
          { text: 'able', type: 'suffix', order: -1 }
        ]
      },
      {
        meaningClue: 'Build "Running" (Watch the doubled n!)',
        speakPrompt: 'Eat Run then ning with double n!',
        sequence: ['Run', 'ning'],
        assembledWord: 'Running',
        pellets: [
          { text: 'Run', type: 'root', order: 0 },
          { text: 'ning', type: 'suffix', order: 1 },
          { text: 'ing', type: 'suffix', order: -1 },
          { text: 'Rung', type: 'root', order: -1 }
        ]
      }
    ]
  }
};

const GRID_SIZE = 16; // 16x16 grid

const MorphologySnakeGame = ({ onComplete }) => {
  const { currentUser } = useAuth();
  const wrapperRef = useRef(null);

  const [phase, setPhase] = useState('start'); // start | playing | round_modal | complete
  const [difficultyTier, setDifficultyTier] = useState('easy');
  const [challengeIdx, setChallengeIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [sparkyMsg, setSparkyMsg] = useState('Navigate snake to eat morpheme energy pellets in order! 🐍');
  const [isFullView, setIsFullView] = useState(false);

  // Snake State
  const [snake, setSnake] = useState([{ x: 8, y: 8, label: '🐍', text: 'HEAD' }]);
  const [dir, setDir] = useState('RIGHT');
  const [targetStepIndex, setTargetStepIndex] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [pelletPositions, setPelletPositions] = useState([]);
  const [isRainbow, setIsRainbow] = useState(false);

  const dirRef = useRef(dir);
  dirRef.current = dir;

  const currentData = ROUND_DATA[difficultyTier] || ROUND_DATA.easy;
  const currentChallenge = currentData.challenges[challengeIdx % currentData.challenges.length];

  // Fullscreen Listener
  useEffect(() => {
    const handleFs = () => setIsFullView(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', handleFs);
    return () => document.removeEventListener('fullscreenchange', handleFs);
  }, []);

  const toggleFullView = () => {
    if (!isFullView) {
      if (wrapperRef.current?.requestFullscreen) wrapperRef.current.requestFullscreen().catch(() => {});
      setIsFullView(true);
    } else {
      if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(() => {});
      setIsFullView(false);
    }
  };

  // ── GENERATE PELLET POSITIONS ON GRID ──
  const generatePellets = useCallback((challenge) => {
    const positions = [];
    const usedCoords = new Set(['8,8']);

    challenge.pellets.forEach(pellet => {
      let rx, ry;
      do {
        rx = Math.floor(Math.random() * (GRID_SIZE - 2)) + 1;
        ry = Math.floor(Math.random() * (GRID_SIZE - 2)) + 1;
      } while (usedCoords.has(`${rx},${ry}`));

      usedCoords.add(`${rx},${ry}`);
      positions.push({
        ...pellet,
        x: rx,
        y: ry
      });
    });

    setPelletPositions(positions);
  }, []);

  // ── INIT GAME ──
  const initGame = useCallback((tierKey = 'easy') => {
    const data = ROUND_DATA[tierKey] || ROUND_DATA.easy;
    const challenge = data.challenges[0];

    setDifficultyTier(tierKey);
    setChallengeIdx(0);
    setScore(0);
    setAttempts(0);
    setCorrectCount(0);
    setSnake([{ x: 8, y: 8, label: '🐍', text: 'HEAD' }]);
    setDir('RIGHT');
    setTargetStepIndex(0);
    setIsRainbow(false);
    setSparkyMsg(`Step 1/${challenge.sequence.length}: Find [${challenge.sequence[0]}]! 🟢`);
    setPhase('playing');

    generatePellets(challenge);
    speak(challenge.speakPrompt);
  }, [generatePellets]);

  // Load next challenge in round
  const loadChallenge = useCallback((cIdx, tierKey) => {
    const data = ROUND_DATA[tierKey] || ROUND_DATA.easy;

    if (cIdx >= data.challenges.length) {
      // Round Cleared!
      const acc = attempts > 0 ? Math.round((correctCount / attempts) * 100) : 100;
      const stats = { round: tierKey, score, accuracy: acc, timestamp: Date.now() };
      try {
        localStorage.setItem('lexiflow_session_history_dyseidetic', JSON.stringify(stats));
        localStorage.setItem('lexiflow_mario_progress', JSON.stringify(stats));
        window.dispatchEvent(new Event('therapy_progress_updated'));
      } catch (e) {}

      // ── DEFINED SESSION BENCHMARK (WIN CONDITION: 3 Waves / Tiers Completed) ──
      const TARGET_WAVE_CAP = 3;
      const currentTierNum = tierKey === 'easy' ? 1 : tierKey === 'medium' ? 2 : 3;

      if (currentTierNum >= TARGET_WAVE_CAP) {
        setPhase('complete');
      } else {
        setPhase('round_modal');
      }
      return;
    }

    setChallengeIdx(cIdx);
    const challenge = data.challenges[cIdx];
    setSnake([{ x: 8, y: 8, label: '🐍', text: 'HEAD' }]);
    setDir('RIGHT');
    setTargetStepIndex(0);
    setIsRainbow(false);
    setSparkyMsg(`Step 1/${challenge.sequence.length}: Find [${challenge.sequence[0]}]! 🟢`);

    generatePellets(challenge);
    speak(challenge.speakPrompt);
  }, [currentUser, generatePellets, score]);

  // ── KEYBOARD CONTROL LISTENERS ──
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (phase !== 'playing') return;
      const key = e.key;
      const currentDir = dirRef.current;

      if ((key === 'ArrowUp' || key === 'w' || key === 'W') && currentDir !== 'DOWN') setDir('UP');
      else if ((key === 'ArrowDown' || key === 's' || key === 'S') && currentDir !== 'UP') setDir('DOWN');
      else if ((key === 'ArrowLeft' || key === 'a' || key === 'A') && currentDir !== 'RIGHT') setDir('LEFT');
      else if ((key === 'ArrowRight' || key === 'd' || key === 'D') && currentDir !== 'LEFT') setDir('RIGHT');
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [phase]);

  // ── GAME LOOP TICK ──
  useEffect(() => {
    if (phase !== 'playing') return;

    const tickInterval = setInterval(() => {
      setSnake(prevSnake => {
        const head = { ...prevSnake[0] };
        const currentDir = dirRef.current;

        if (currentDir === 'UP') head.y -= 1;
        else if (currentDir === 'DOWN') head.y += 1;
        else if (currentDir === 'LEFT') head.x -= 1;
        else if (currentDir === 'RIGHT') head.x += 1;

        // Pac-Man Tunnel Boundary Wrap (Stress-Free)
        if (head.x < 0) head.x = GRID_SIZE - 1;
        if (head.x >= GRID_SIZE) head.x = 0;
        if (head.y < 0) head.y = GRID_SIZE - 1;
        if (head.y >= GRID_SIZE) head.y = 0;

        // Check Pellet Collision
        const eatenPelletIndex = pelletPositions.findIndex(p => p.x === head.x && p.y === head.y);

        if (eatenPelletIndex !== -1) {
          const pellet = pelletPositions[eatenPelletIndex];
          const expectedTarget = currentChallenge.sequence[targetStepIndex];
          setAttempts(a => a + 1);

          if (pellet.text === expectedTarget) {
            // Correct Target Pellet Eaten!
            playSFX('eat');
            setScore(s => s + 30);
            setCorrectCount(c => c + 1);
            const nextStep = targetStepIndex + 1;
            setTargetStepIndex(nextStep);

            // Remove eaten pellet from grid
            setPelletPositions(prev => prev.filter((_, idx) => idx !== eatenPelletIndex));

            if (nextStep >= currentChallenge.sequence.length) {
              // Complete Word Assembled!
              setIsRainbow(true);
              playSFX('win');
              setSparkyMsg(`🎉 WORD COMPLETE: ${currentChallenge.assembledWord}! +30 XP!`);
              speak(`Awesome! ${currentChallenge.assembledWord} assembled!`);

              setTimeout(() => {
                loadChallenge(challengeIdx + 1, difficultyTier);
              }, 1400);
            } else {
              setSparkyMsg(`Step ${nextStep + 1}/${currentChallenge.sequence.length}: Find [${currentChallenge.sequence[nextStep]}]! 🟢`);
            }

            // Grow Snake Body with labeled morpheme segment
            const newHead = head;
            newHead.text = 'HEAD';
            const newSegment = { ...head, text: pellet.text };
            const newSnake = [newHead, newSegment, ...prevSnake.slice(1)];
            return newSnake;

          } else {
            // Wrong / Decoy Pellet Eaten
            playSFX('wrong');
            setSparkyMsg(`Soft bump! Next piece to find is [${expectedTarget}]! ⚠️`);
            speak(`Oops! Find ${expectedTarget} next!`);
          }
        }

        // Normal movement (shift body segments)
        const newSnake = [head, ...prevSnake.slice(0, prevSnake.length - 1)];
        newSnake[0].label = '🐍';
        return newSnake;
      });
    }, currentData.speed);

    return () => clearInterval(tickInterval);
  }, [challengeIdx, currentChallenge, currentData.speed, difficultyTier, loadChallenge, pelletPositions, phase, targetStepIndex]);

  // ── START SCREEN ──
  if (phase === 'start') {
    return (
      <div className="msg-container">
        <div className="msg-start-card">
          <div className="msg-start-icon">🐍 ⚡ 🧩</div>
          <h2 className="msg-start-title">CYBER SNAKE: WORD GLOW</h2>
          <p className="msg-start-desc">
            Guide the glowing cybernetic snake to eat morpheme energy pellets (<strong style={{ color: '#38bdf8' }}>PREFIX</strong>, <strong style={{ color: '#4ade80' }}>ROOT</strong>, <strong style={{ color: '#fbbf24' }}>SUFFIX</strong>) in sequential order!
            <br /><br />
            🐍 <strong>3 Snake Tiers</strong> (Easy 2-Part, Medium 3-Part, Hard Rule Shifts).
            <br />🎮 Use <strong>Arrow Keys / WASD</strong> or touch D-Pad to steer!
          </p>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginBottom: '1.25rem' }}>
            <button className={`msg-tier-btn easy ${difficultyTier === 'easy' ? 'active' : ''}`} onClick={() => setDifficultyTier('easy')}>🟢 Easy</button>
            <button className={`msg-tier-btn medium ${difficultyTier === 'medium' ? 'active' : ''}`} onClick={() => setDifficultyTier('medium')}>🟡 Medium</button>
            <button className={`msg-tier-btn hard ${difficultyTier === 'hard' ? 'active' : ''}`} onClick={() => setDifficultyTier('hard')}>🔴 Hard</button>
          </div>
          <button className="msg-start-btn" onClick={() => initGame(difficultyTier)}>
            🐍 START SNAKE GAME
          </button>
        </div>
      </div>
    );
  }

  // ── ROUND CLEARED MODAL ──
  if (phase === 'round_modal') {
    return (
      <div className="msg-container">
        <div className="msg-complete-card">
          <div className="msg-complete-emojis">🐍 🏆 ✨</div>
          <h2 className="msg-complete-title">SNAKE TIER CLEARED!</h2>
          <p className="msg-complete-sub">🐍 <strong>SPARKY:</strong> "Masterful morpheme navigation! All targets assembled!"</p>
          <div className="msg-complete-stats">
            <div className="msg-stat-box"><small>Score</small><div className="val" style={{ color: '#fbbf24' }}>{score} XP</div></div>
            <div className="msg-stat-box"><small>Tier</small><div className="val" style={{ color: currentData.badgeColor }}>{currentData.tierName.split(' ')[0]}</div></div>
          </div>
          <div className="msg-complete-btns">
            {difficultyTier !== 'hard' ? (
              <button className="msg-btn-next" onClick={() => initGame(difficultyTier === 'easy' ? 'medium' : 'hard')}>
                ➔ NEXT TIER ({difficultyTier === 'easy' ? 'Medium' : 'Hard'})
              </button>
            ) : (
              <button className="msg-btn-next" onClick={() => setPhase('complete')}>🏆 GRAND RESULTS</button>
            )}
            <button className="msg-btn-hq" onClick={() => initGame('easy')}>🔄 RESTART EASY</button>
          </div>
        </div>
      </div>
    );
  }

  // ── GRAND COMPLETION SCREEN ──
  if (phase === 'complete') {
    return (
      <div className="msg-container">
        <div className="msg-complete-card">
          <div className="msg-complete-emojis">👑 🐍 🌟</div>
          <h2 className="msg-complete-title">GRAND SNAKE MORPHOLOGIST!</h2>
          <p className="msg-complete-sub">You guided the cyber snake through all 3 tiers perfectly!</p>
          <div className="msg-complete-stats">
            <div className="msg-stat-box"><small>Total Score</small><div className="val" style={{ color: '#fbbf24' }}>{score} XP</div></div>
          </div>
          <div className="msg-complete-btns">
            <button className="msg-btn-next" onClick={() => initGame('easy')}>🔄 PLAY AGAIN</button>
            <button className="msg-btn-hq" onClick={onComplete}>MISSION HQ 🏠</button>
          </div>
        </div>
      </div>
    );
  }

  // ── PLAYING SCREEN ──
  return (
    <div ref={wrapperRef} className={`msg-container ${isFullView ? 'msg-fullscreen' : ''}`}>
      {/* HUD Header */}
      <header className="msg-hud">
        <div className="msg-hud-title"><span>🐍</span> CYBER SNAKE: WORD GLOW</div>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button className={`msg-tier-btn easy ${difficultyTier === 'easy' ? 'active' : ''}`} onClick={() => initGame('easy')}>🟢 Easy</button>
          <button className={`msg-tier-btn medium ${difficultyTier === 'medium' ? 'active' : ''}`} onClick={() => initGame('medium')}>🟡 Medium</button>
          <button className={`msg-tier-btn hard ${difficultyTier === 'hard' ? 'active' : ''}`} onClick={() => initGame('hard')}>🔴 Hard</button>
        </div>
        <div className="msg-hud-stats">
          <div className="msg-stat-pill">⭐ {score} XP</div>
          <div className="msg-stat-pill" style={{ color: currentData.badgeColor }}>📜 Round {difficultyTier === 'easy' ? '1/3' : difficultyTier === 'medium' ? '2/3' : '3/3'}</div>
        </div>
      </header>

      {/* Clue Banner & Target Highlighting */}
      <div className="msg-clue-row">
        <div className="msg-clue-banner">
          <div className="msg-clue-badge">🎯 MEANING CLUE</div>
          <div className="msg-clue-prompt">{currentChallenge.meaningClue}</div>
          <button className="msg-listen-btn" onClick={() => speak(currentChallenge.speakPrompt)}>🔊 Listen</button>
        </div>

        <div className="msg-target-card">
          <small>NEXT TARGET:</small>
          <div className="msg-target-word">
            {currentChallenge.sequence[targetStepIndex] ? `[ ${currentChallenge.sequence[targetStepIndex]} ]` : 'DONE! 🎉'}
          </div>
        </div>
      </div>

      {/* 2D Cyber Grid Arena */}
      <div className="msg-grid-arena">
        {Array.from({ length: GRID_SIZE * GRID_SIZE }).map((_, index) => {
          const gx = index % GRID_SIZE;
          const gy = Math.floor(index / GRID_SIZE);

          const isSnakeHead = snake[0].x === gx && snake[0].y === gy;
          const bodySegment = snake.slice(1).find(seg => seg.x === gx && seg.y === gy);

          const pellet = pelletPositions.find(p => p.x === gx && p.y === gy);

          return (
            <div
              key={index}
              className={`msg-grid-cell ${isSnakeHead ? 'snake-head' : ''} ${bodySegment ? 'snake-body' : ''} ${isRainbow ? 'rainbow' : ''}`}
            >
              {isSnakeHead && <span className="snake-eyes">👀</span>}
              {bodySegment && <span className="snake-segment-text">{bodySegment.text}</span>}
              {pellet && (
                <div className={`msg-pellet ${pellet.type} ${pellet.text === currentChallenge.sequence[targetStepIndex] ? 'target-glow' : ''}`}>
                  <span className="pellet-text">{pellet.text}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer & D-Pad Controls */}
      <footer className="msg-footer">
        <button className="msg-fullview-btn" onClick={toggleFullView}>
          {isFullView ? '↙ Exit Fullscreen' : '⛶ Fullscreen'}
        </button>

        <div className="msg-dpad-controls">
          <button className="msg-dpad-btn up" onClick={() => dirRef.current !== 'DOWN' && setDir('UP')}>▲</button>
          <div className="msg-dpad-row">
            <button className="msg-dpad-btn left" onClick={() => dirRef.current !== 'RIGHT' && setDir('LEFT')}>◀</button>
            <button className="msg-dpad-btn down" onClick={() => dirRef.current !== 'UP' && setDir('DOWN')}>▼</button>
            <button className="msg-dpad-btn right" onClick={() => dirRef.current !== 'LEFT' && setDir('RIGHT')}>▶</button>
          </div>
        </div>

        <div className="msg-sparky-hint">🤖 SPARKY: "{sparkyMsg}"</div>
      </footer>
    </div>
  );
};

export default MorphologySnakeGame;
