import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../auth/AuthContext';
import { saveTherapyProgress } from './ExerciseSystem';
import './WordNinjaSlicer.css';

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

    if (type === 'slice') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(800, t);
      osc.frequency.exponentialRampToValueAtTime(150, t + 0.08);
      g.gain.setValueAtTime(0.12, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
      osc.start(); osc.stop(t + 0.09);
    } else if (type === 'bomb') {
      osc.type = 'square';
      osc.frequency.setValueAtTime(120, t);
      osc.frequency.exponentialRampToValueAtTime(30, t + 0.3);
      g.gain.setValueAtTime(0.2, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
      osc.start(); osc.stop(t + 0.35);
    } else if (type === 'complete') {
      osc.type = 'triangle';
      [440, 554, 659, 880].forEach((f, i) => {
        osc.frequency.setValueAtTime(f, t + i * 0.08);
      });
      g.gain.setValueAtTime(0.15, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
      osc.start(); osc.stop(t + 0.5);
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

// ── 3-ROUND WORD NINJA MORPHEME DATA ──
const ROUND_DATA = {
  easy: {
    tierKey: 'easy',
    tierName: 'Easy Ninja (2-Part Words)',
    badgeColor: '#4ade80',
    targetGoal: 4,
    challenges: [
      {
        clue: 'Slice: "To play again"',
        speakPrompt: 'Slice the morphemes to build Replay!',
        sequence: ['Re', 'play'],
        assembledWord: 'Replay',
        floatingItems: [
          { id: 'm1', text: 'Re', type: 'prefix', isTarget: true, order: 0 },
          { id: 'm2', text: 'play', type: 'root', isTarget: true, order: 1 },
          { id: 'm3', text: 'sing', type: 'root', isTarget: false, order: -1 }
        ]
      },
      {
        clue: 'Slice: "Full of help"',
        speakPrompt: 'Slice the morphemes to build Helpful!',
        sequence: ['help', 'ful'],
        assembledWord: 'Helpful',
        floatingItems: [
          { id: 'm1', text: 'help', type: 'root', isTarget: true, order: 0 },
          { id: 'm2', text: 'ful', type: 'suffix', isTarget: true, order: 1 },
          { id: 'm3', text: 'less', type: 'suffix', isTarget: false, order: -1 }
        ]
      },
      {
        clue: 'Slice: "Not happy"',
        speakPrompt: 'Slice the morphemes to build Unhappy!',
        sequence: ['Un', 'happy'],
        assembledWord: 'Unhappy',
        floatingItems: [
          { id: 'm1', text: 'Un', type: 'prefix', isTarget: true, order: 0 },
          { id: 'm2', text: 'happy', type: 'root', isTarget: true, order: 1 },
          { id: 'm3', text: 'Dis', type: 'prefix', isTarget: false, order: -1 }
        ]
      },
      {
        clue: 'Slice: "To write again"',
        speakPrompt: 'Slice the morphemes to build Rewrite!',
        sequence: ['Re', 'write'],
        assembledWord: 'Rewrite',
        floatingItems: [
          { id: 'm1', text: 'Re', type: 'prefix', isTarget: true, order: 0 },
          { id: 'm2', text: 'write', type: 'root', isTarget: true, order: 1 },
          { id: 'm3', text: 'read', type: 'root', isTarget: false, order: -1 }
        ]
      }
    ]
  },
  medium: {
    tierKey: 'medium',
    tierName: 'Medium Ninja (3-Part Words)',
    badgeColor: '#fbbf24',
    targetGoal: 3,
    challenges: [
      {
        clue: 'Slice: "Cannot be broken"',
        speakPrompt: 'Slice Un, break, and able in order!',
        sequence: ['Un', 'break', 'able'],
        assembledWord: 'Unbreakable',
        floatingItems: [
          { id: 'm1', text: 'Un', type: 'prefix', isTarget: true, order: 0 },
          { id: 'm2', text: 'break', type: 'root', isTarget: true, order: 1 },
          { id: 'm3', text: 'able', type: 'suffix', isTarget: true, order: 2 },
          { id: 'm4', text: 'Dis', type: 'prefix', isTarget: false, order: -1 },
          { id: 'm5', text: 'ible', type: 'suffix', isTarget: false, order: -1 }
        ]
      },
      {
        clue: 'Slice: "Read the wrong way"',
        speakPrompt: 'Slice Mis, read, and ing in order!',
        sequence: ['Mis', 'read', 'ing'],
        assembledWord: 'Misreading',
        floatingItems: [
          { id: 'm1', text: 'Mis', type: 'prefix', isTarget: true, order: 0 },
          { id: 'm2', text: 'read', type: 'root', isTarget: true, order: 1 },
          { id: 'm3', text: 'ing', type: 'suffix', isTarget: true, order: 2 },
          { id: 'm4', text: 'Re', type: 'prefix', isTarget: false, order: -1 },
          { id: 'm5', text: 'ed', type: 'suffix', isTarget: false, order: -1 }
        ]
      },
      {
        clue: 'Slice: "Not capable of doing"',
        speakPrompt: 'Slice Un, do, and able in order!',
        sequence: ['Un', 'do', 'able'],
        assembledWord: 'Undoable',
        floatingItems: [
          { id: 'm1', text: 'Un', type: 'prefix', isTarget: true, order: 0 },
          { id: 'm2', text: 'do', type: 'root', isTarget: true, order: 1 },
          { id: 'm3', text: 'able', type: 'suffix', isTarget: true, order: 2 },
          { id: 'm4', text: 'make', type: 'root', isTarget: false, order: -1 },
          { id: 'm5', text: 'ful', type: 'suffix', isTarget: false, order: -1 }
        ]
      }
    ]
  },
  hard: {
    tierKey: 'hard',
    tierName: 'Master Ninja (Decoy Bombs)',
    badgeColor: '#f87171',
    targetGoal: 3,
    challenges: [
      {
        clue: 'Slice: "Flexible" (Watch out for -able vs -ible!)',
        speakPrompt: 'Slice Flex and ible! Avoid the bomb and -able decoy!',
        sequence: ['Flex', 'ible'],
        assembledWord: 'Flexible',
        floatingItems: [
          { id: 'm1', text: 'Flex', type: 'root', isTarget: true, order: 0 },
          { id: 'm2', text: 'ible', type: 'suffix', isTarget: true, order: 1 },
          { id: 'm3', text: 'able', type: 'suffix', isTarget: false, order: -1 },
          { id: 'm4', text: '💣 BOMB', type: 'bomb', isBomb: true, isTarget: false, order: -1 }
        ]
      },
      {
        clue: 'Slice: "Happiest" (Watch the y change to i!)',
        speakPrompt: 'Slice Happi with an i, then est!',
        sequence: ['Happi', 'est'],
        assembledWord: 'Happiest',
        floatingItems: [
          { id: 'm1', text: 'Happi', type: 'root', isTarget: true, order: 0 },
          { id: 'm2', text: 'est', type: 'suffix', isTarget: true, order: 1 },
          { id: 'm3', text: 'Happy', type: 'root', isTarget: false, order: -1 },
          { id: 'm4', text: '💣 BOMB', type: 'bomb', isBomb: true, isTarget: false, order: -1 }
        ]
      },
      {
        clue: 'Slice: "Reversible" (Dropped e rule!)',
        speakPrompt: 'Slice Revers and ible! Avoid the bomb!',
        sequence: ['Revers', 'ible'],
        assembledWord: 'Reversible',
        floatingItems: [
          { id: 'm1', text: 'Revers', type: 'root', isTarget: true, order: 0 },
          { id: 'm2', text: 'ible', type: 'suffix', isTarget: true, order: 1 },
          { id: 'm3', text: 'Reverse', type: 'root', isTarget: false, order: -1 },
          { id: 'm4', text: '💣 BOMB', type: 'bomb', isBomb: true, isTarget: false, order: -1 }
        ]
      }
    ]
  }
};

const WordNinjaSlicer = ({ onComplete }) => {
  const { currentUser } = useAuth();
  const wrapperRef = useRef(null);
  const canvasRef = useRef(null);

  const [phase, setPhase] = useState('start'); // start | playing | round_modal | complete
  const [difficultyTier, setDifficultyTier] = useState('easy');
  const [challengeIdx, setChallengeIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(1);
  const [slicedSequence, setSlicedSequence] = useState([]);
  const [sparkyMsg, setSparkyMsg] = useState('Slice the morphemes in order to build target words! ⚔️');
  const [isFullView, setIsFullView] = useState(false);

  // Floating targets active physics state
  const [activeItems, setActiveItems] = useState([]);

  const currentData = ROUND_DATA[difficultyTier] || ROUND_DATA.easy;
  const currentChallenge = currentData.challenges[challengeIdx % currentData.challenges.length];

  // Fullscreen listener
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

  // ── INIT BUBBLE PHYSICS ──
  const spawnChallengeBubbles = useCallback((challenge) => {
    const items = challenge.floatingItems.map((item, idx) => {
      const spreadX = 12 + (idx * 24);
      return {
        ...item,
        x: spreadX + (Math.random() * 8),
        y: 85 + (Math.random() * 10),
        vx: (Math.random() - 0.5) * 0.4,
        vy: -0.8 - (Math.random() * 0.4),
        sliced: false,
        slicedTime: 0
      };
    });
    setActiveItems(items);
  }, []);

  // Float animation loop
  useEffect(() => {
    if (phase !== 'playing') return;
    const interval = setInterval(() => {
      setActiveItems(prev => prev.map(item => {
        if (item.sliced) return item;
        let newY = item.y + item.vy;
        let newX = item.x + item.vx;
        // Bounce bounds
        if (newX < 5 || newX > 85) item.vx *= -1;
        if (newY < 15) {
          newY = 85; // Respawn floating upward
        }
        return { ...item, x: newX, y: newY };
      }));
    }, 40);

    return () => clearInterval(interval);
  }, [phase]);

  // ── START GAME ──
  const initGame = useCallback((tierKey = 'easy') => {
    const data = ROUND_DATA[tierKey] || ROUND_DATA.easy;
    const challenge = data.challenges[0];

    setDifficultyTier(tierKey);
    setChallengeIdx(0);
    setScore(0);
    setCombo(1);
    setSlicedSequence([]);
    setSparkyMsg(`⚔️ NINJA READY: ${challenge.clue}`);
    setPhase('playing');

    spawnChallengeBubbles(challenge);
    speak(challenge.speakPrompt);
  }, [spawnChallengeBubbles]);

  const loadChallenge = useCallback((cIdx, tierKey) => {
    const data = ROUND_DATA[tierKey] || ROUND_DATA.easy;

    if (cIdx >= data.challenges.length) {
      // Round Cleared!
      const stats = { round: tierKey, score, accuracy: 100, timestamp: Date.now() };
      try {
        localStorage.setItem('lexiflow_session_history_dyseidetic', JSON.stringify(stats));
        window.dispatchEvent(new Event('therapy_progress_updated'));
      } catch (e) {}

      saveTherapyProgress(currentUser, 'morphology', score, 100, `Ninja Tier: ${tierKey}`);
      playSFX('complete');
      setPhase('round_modal');
      return;
    }

    setChallengeIdx(cIdx);
    const challenge = data.challenges[cIdx];
    setSlicedSequence([]);
    setSparkyMsg(`Target #${cIdx + 1}: ${challenge.clue} ⚔️`);
    spawnChallengeBubbles(challenge);
    speak(challenge.speakPrompt);
  }, [currentUser, score, spawnChallengeBubbles]);

  // ── SLICE HANDLER ──
  const handleSliceItem = (item) => {
    if (item.sliced) return;

    if (item.isBomb) {
      playSFX('bomb');
      setCombo(1);
      setScore(prev => Math.max(0, prev - 15));
      setSparkyMsg('💥 BOMB SLICED! -15 XP & Combo Reset!');
      setActiveItems(prev => prev.map(i => i.id === item.id ? { ...i, sliced: true } : i));
      return;
    }

    playSFX('slice');

    // Mark sliced
    setActiveItems(prev => prev.map(i => i.id === item.id ? { ...i, sliced: true } : i));

    const nextSeq = [...slicedSequence, item.text];
    setSlicedSequence(nextSeq);

    // Check if expected target sequence step matches
    const expectedStep = currentChallenge.sequence[slicedSequence.length];

    if (item.text === expectedStep) {
      setCombo(c => c + 1);
      setScore(s => s + (15 * combo));

      if (nextSeq.length === currentChallenge.sequence.length) {
        // Complete word constructed!
        playSFX('complete');
        setSparkyMsg(`✨ WORD SLICED & FUSED: ${currentChallenge.assembledWord}! +30 XP!`);
        speak(`Awesome Ninja Slice! ${currentChallenge.assembledWord}!`);

        setTimeout(() => {
          loadChallenge(challengeIdx + 1, difficultyTier);
        }, 1400);
      }
    } else {
      // Wrong slice order or wrong distractor
      setCombo(1);
      setSparkyMsg(`Slice order error! Look for: ${expectedStep || currentChallenge.sequence[0]}`);
      setTimeout(() => {
        setSlicedSequence([]);
        spawnChallengeBubbles(currentChallenge);
      }, 1000);
    }
  };

  // ── START SCREEN ──
  if (phase === 'start') {
    return (
      <div className="wns-container">
        <div className="wns-start-card">
          <div className="wns-start-icon">⚔️ 🍉 🥷</div>
          <h2 className="wns-start-title">WORD NINJA: MORPHEME SLICER</h2>
          <p className="wns-start-desc">
            Slice floating morpheme fruit (<strong style={{ color: '#38bdf8' }}>PREFIX</strong>, <strong style={{ color: '#4ade80' }}>ROOT</strong>, <strong style={{ color: '#fbbf24' }}>SUFFIX</strong>) in order to assemble target words!
            <br /><br />
            ⚔️ <strong>3 Ninja Tiers</strong> (Easy 2-Part, Medium 3-Part, Hard Decoy Bombs).
            <br />⚡ Tap or swipe across floating bubbles to slice them with your laser blade!
          </p>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginBottom: '1.25rem' }}>
            <button className={`wns-tier-btn easy ${difficultyTier === 'easy' ? 'active' : ''}`} onClick={() => setDifficultyTier('easy')}>🟢 Easy</button>
            <button className={`wns-tier-btn medium ${difficultyTier === 'medium' ? 'active' : ''}`} onClick={() => setDifficultyTier('medium')}>🟡 Medium</button>
            <button className={`wns-tier-btn hard ${difficultyTier === 'hard' ? 'active' : ''}`} onClick={() => setDifficultyTier('hard')}>🔴 Hard</button>
          </div>
          <button className="wns-start-btn" onClick={() => initGame(difficultyTier)}>
            ⚔️ ENTER NINJA DOJO
          </button>
        </div>
      </div>
    );
  }

  // ── ROUND CLEARED MODAL ──
  if (phase === 'round_modal') {
    return (
      <div className="wns-container">
        <div className="wns-complete-card">
          <div className="wns-complete-emojis">⚔️ 🏆 ✨</div>
          <h2 className="wns-complete-title">NINJA TIER CLEARED!</h2>
          <p className="wns-complete-sub">🥷 <strong>SPARKY:</strong> "Precision morpheme slicing! Target words assembled!"</p>
          <div className="wns-complete-stats">
            <div className="wns-stat-box"><small>Score</small><div className="val" style={{ color: '#fbbf24' }}>{score} XP</div></div>
            <div className="wns-stat-box"><small>Max Combo</small><div className="val" style={{ color: '#4ade80' }}>{combo}x</div></div>
            <div className="wns-stat-box"><small>Tier</small><div className="val" style={{ color: currentData.badgeColor }}>{currentData.tierName.split(' ')[0]}</div></div>
          </div>
          <div className="wns-complete-btns">
            {difficultyTier !== 'hard' ? (
              <button className="wns-btn-next" onClick={() => initGame(difficultyTier === 'easy' ? 'medium' : 'hard')}>
                ➔ NEXT NINJA TIER ({difficultyTier === 'easy' ? 'Medium' : 'Hard'})
              </button>
            ) : (
              <button className="wns-btn-next" onClick={() => setPhase('complete')}>🏆 GRAND RESULTS</button>
            )}
            <button className="wns-btn-hq" onClick={() => initGame('easy')}>🔄 RESTART EASY</button>
          </div>
        </div>
      </div>
    );
  }

  // ── GRAND COMPLETION SCREEN ──
  if (phase === 'complete') {
    return (
      <div className="wns-container">
        <div className="wns-complete-card">
          <div className="wns-complete-emojis">🥷 👑 🌟</div>
          <h2 className="wns-complete-title">GRAND MORPHEME NINJA!</h2>
          <p className="wns-complete-sub">You sliced and fused all 3 Ninja tiers flawlessly!</p>
          <div className="wns-complete-stats">
            <div className="wns-stat-box"><small>Total Score</small><div className="val" style={{ color: '#fbbf24' }}>{score} XP</div></div>
            <div className="wns-stat-box"><small>Final Combo</small><div className="val" style={{ color: '#4ade80' }}>{combo}x</div></div>
          </div>
          <div className="wns-complete-btns">
            <button className="wns-btn-next" onClick={() => initGame('easy')}>🔄 PLAY AGAIN</button>
            <button className="wns-btn-hq" onClick={onComplete}>MISSION HQ 🏠</button>
          </div>
        </div>
      </div>
    );
  }

  // ── PLAYING DOJO SCREEN ──
  return (
    <div ref={wrapperRef} className={`wns-container ${isFullView ? 'wns-fullscreen' : ''}`}>
      {/* HUD Header */}
      <header className="wns-hud">
        <div className="wns-hud-title"><span>⚔️</span> WORD NINJA SLICER</div>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button className={`wns-tier-btn easy ${difficultyTier === 'easy' ? 'active' : ''}`} onClick={() => initGame('easy')}>🟢 Easy</button>
          <button className={`wns-tier-btn medium ${difficultyTier === 'medium' ? 'active' : ''}`} onClick={() => initGame('medium')}>🟡 Medium</button>
          <button className={`wns-tier-btn hard ${difficultyTier === 'hard' ? 'active' : ''}`} onClick={() => initGame('hard')}>🔴 Hard</button>
        </div>
        <div className="wns-hud-stats">
          <div className="wns-stat-pill">🔥 {combo}x COMBO</div>
          <div className="wns-stat-pill">⭐ {score} XP</div>
        </div>
      </header>

      {/* Clue Banner & Fused Word Display */}
      <div className="wns-clue-row">
        <div className="wns-clue-banner">
          <div className="wns-clue-badge">🎯 NINJA TARGET</div>
          <div className="wns-clue-prompt">{currentChallenge.clue}</div>
          <button className="wns-listen-btn" onClick={() => speak(currentChallenge.speakPrompt)}>🔊 Listen</button>
        </div>

        {/* Fused Word Display */}
        <div className="wns-fused-card">
          <small>FUSED WORD:</small>
          <div className="wns-fused-word">
            {slicedSequence.length > 0 ? slicedSequence.join('') : '...'}
          </div>
        </div>
      </div>

      {/* Ninja Dojo Canvas / Floating Stage */}
      <div className="wns-dojo-stage">
        {activeItems.map(item => (
          <div
            key={item.id}
            className={`wns-floating-bubble ${item.type} ${item.sliced ? 'sliced' : ''}`}
            style={{ left: `${item.x}%`, top: `${item.y}%` }}
            onClick={() => handleSliceItem(item)}
            onMouseEnter={(e) => {
              if (e.buttons === 1) handleSliceItem(item);
            }}
          >
            {item.sliced ? (
              <div className="wns-slice-halves">
                <span className="half left">{item.text}</span>
                <span className="half right">{item.text}</span>
              </div>
            ) : (
              <span className="wns-bubble-text">{item.text}</span>
            )}
          </div>
        ))}
      </div>

      {/* Footer Controls */}
      <footer className="wns-footer">
        <button className="wns-fullview-btn" onClick={toggleFullView}>
          {isFullView ? '↙ Exit Fullscreen' : '⛶ Fullscreen'}
        </button>
        <div className="wns-sparky-hint">🤖 SPARKY: "{sparkyMsg}"</div>
      </footer>
    </div>
  );
};

export default WordNinjaSlicer;
