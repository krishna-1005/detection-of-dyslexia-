import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../auth/AuthContext';
import { saveTherapyProgress } from './ExerciseSystem';
import './MorphBotAssembly.css';

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
    if (type === 'snap') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, t);
      osc.frequency.exponentialRampToValueAtTime(880, t + 0.1);
      g.gain.setValueAtTime(0.08, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
      osc.start(); osc.stop(t + 0.12);
    } else if (type === 'powerup') {
      osc.type = 'triangle';
      [300, 400, 523, 659, 784, 1047].forEach((f, i) => {
        osc.frequency.setValueAtTime(f, t + i * 0.07);
      });
      g.gain.setValueAtTime(0.12, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.55);
      osc.start(); osc.stop(t + 0.55);
    } else if (type === 'steam') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(180, t);
      osc.frequency.exponentialRampToValueAtTime(60, t + 0.25);
      g.gain.setValueAtTime(0.09, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
      osc.start(); osc.stop(t + 0.28);
    } else if (type === 'win') {
      osc.type = 'sine';
      [523,659,784,1047].forEach((f,i) => {
        osc.frequency.setValueAtTime(f, t + i * 0.08);
      });
      g.gain.setValueAtTime(0.12, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
      osc.start(); osc.stop(t + 0.6);
    }
  } catch (e) {}
};

const getFriendlyVoice = () => {
  if (!window.speechSynthesis) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices || voices.length === 0) return null;

  const preferredNames = [
    'Google US English',
    'Microsoft Jenny Online (Natural) - English (United States)',
    'Microsoft Aria Online (Natural) - English (United States)',
    'Microsoft Zira - English (United States)',
    'Samantha',
    'Karen'
  ];

  for (const pref of preferredNames) {
    const v = voices.find(voice => voice.name.includes(pref) || voice.name === pref);
    if (v) return v;
  }

  return voices.find(v => v.lang.startsWith('en-US')) || voices.find(v => v.lang.startsWith('en')) || null;
};

const speak = (text) => {
  try {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    const voice = getFriendlyVoice();
    if (voice) u.voice = voice;
    u.rate = 0.92;
    u.pitch = 1.15;
    window.speechSynthesis.speak(u);
  } catch (e) {}
};

// ── 3-TIER PROGRESSION WITH KID-FRIENDLY MORPHEME DATA ──
const ROUND_DATA = {
  easy: {
    tierKey: 'easy',
    tierName: 'Easy (2-Part Snap)',
    badgeColor: '#4ade80',
    targetGoal: 4,
    challenges: [
      {
        meaningClue: 'Build a word that means: "Play again"',
        speakClue: 'Build a word that means: Play again!',
        hint: 'Prefix "Re" means again! Match Re plus play!',
        slots: ['PREFIX', 'ROOT'],
        correctSolution: ['Re', 'play'],
        assembledWord: 'Replay',
        trayBlocks: [
          { id: 'b1', text: 'Re', type: 'prefix', label: 'Prefix (Again)' },
          { id: 'b2', text: 'play', type: 'root', label: 'Root Word' },
          { id: 'b3', text: 'Un', type: 'prefix', label: 'Prefix (Not)' },
          { id: 'b4', text: 'sing', type: 'root', label: 'Root Word' }
        ]
      },
      {
        meaningClue: 'Build a word that means: "Full of help"',
        speakClue: 'Build a word that means: Full of help!',
        hint: 'Root "help" plus suffix "ful" means full of help!',
        slots: ['ROOT', 'SUFFIX'],
        correctSolution: ['help', 'ful'],
        assembledWord: 'Helpful',
        trayBlocks: [
          { id: 'b1', text: 'help', type: 'root', label: 'Root Word' },
          { id: 'b2', text: 'ful', type: 'suffix', label: 'Suffix (Full of)' },
          { id: 'b3', text: 'less', type: 'suffix', label: 'Suffix (Without)' },
          { id: 'b4', text: 'jump', type: 'root', label: 'Root Word' }
        ]
      },
      {
        meaningClue: 'Build a word that means: "Not happy"',
        speakClue: 'Build a word that means: Not happy!',
        hint: 'Prefix "Un" means not! Match Un plus happy!',
        slots: ['PREFIX', 'ROOT'],
        correctSolution: ['Un', 'happy'],
        assembledWord: 'Unhappy',
        trayBlocks: [
          { id: 'b1', text: 'Un', type: 'prefix', label: 'Prefix (Not)' },
          { id: 'b2', text: 'happy', type: 'root', label: 'Root Word' },
          { id: 'b3', text: 'Dis', type: 'prefix', label: 'Prefix (Not)' },
          { id: 'b4', text: 'sad', type: 'root', label: 'Root Word' }
        ]
      },
      {
        meaningClue: 'Build a word that means: "Write again"',
        speakClue: 'Build a word that means: Write again!',
        hint: 'Prefix "Re" means again! Match Re plus write!',
        slots: ['PREFIX', 'ROOT'],
        correctSolution: ['Re', 'write'],
        assembledWord: 'Rewrite',
        trayBlocks: [
          { id: 'b1', text: 'Re', type: 'prefix', label: 'Prefix (Again)' },
          { id: 'b2', text: 'write', type: 'root', label: 'Root Word' },
          { id: 'b3', text: 'Pre', type: 'prefix', label: 'Prefix (Before)' },
          { id: 'b4', text: 'read', type: 'root', label: 'Root Word' }
        ]
      }
    ]
  },
  medium: {
    tierKey: 'medium',
    tierName: 'Medium (3-Part Snap)',
    badgeColor: '#fbbf24',
    targetGoal: 3,
    challenges: [
      {
        meaningClue: 'Build a word that means: "Cannot be broken"',
        speakClue: 'Build a word that means: Cannot be broken!',
        hint: 'Un plus break plus able equals Unbreakable!',
        slots: ['PREFIX', 'ROOT', 'SUFFIX'],
        correctSolution: ['Un', 'break', 'able'],
        assembledWord: 'Unbreakable',
        trayBlocks: [
          { id: 'b1', text: 'Un', type: 'prefix', label: 'Prefix (Not)' },
          { id: 'b2', text: 'break', type: 'root', label: 'Root Word' },
          { id: 'b3', text: 'able', type: 'suffix', label: 'Suffix (Can be)' },
          { id: 'b4', text: 'Dis', type: 'prefix', label: 'Decoy' },
          { id: 'b5', text: 'ible', type: 'suffix', label: 'Decoy' }
        ]
      },
      {
        meaningClue: 'Build a word that means: "Read the wrong way"',
        speakClue: 'Build a word that means: Read the wrong way!',
        hint: 'Mis means wrong! Mis plus read plus ing!',
        slots: ['PREFIX', 'ROOT', 'SUFFIX'],
        correctSolution: ['Mis', 'read', 'ing'],
        assembledWord: 'Misreading',
        trayBlocks: [
          { id: 'b1', text: 'Mis', type: 'prefix', label: 'Prefix (Wrong)' },
          { id: 'b2', text: 'read', type: 'root', label: 'Root Word' },
          { id: 'b3', text: 'ing', type: 'suffix', label: 'Suffix (-ing)' },
          { id: 'b4', text: 'Re', type: 'prefix', label: 'Decoy' },
          { id: 'b5', text: 'ed', type: 'suffix', label: 'Decoy' }
        ]
      },
      {
        meaningClue: 'Build a word that means: "Not capable of doing"',
        speakClue: 'Build a word that means: Not capable of doing!',
        hint: 'Un plus do plus able equals Undoable!',
        slots: ['PREFIX', 'ROOT', 'SUFFIX'],
        correctSolution: ['Un', 'do', 'able'],
        assembledWord: 'Undoable',
        trayBlocks: [
          { id: 'b1', text: 'Un', type: 'prefix', label: 'Prefix (Not)' },
          { id: 'b2', text: 'do', type: 'root', label: 'Root Word' },
          { id: 'b3', text: 'able', type: 'suffix', label: 'Suffix (Can be)' },
          { id: 'b4', text: 'make', type: 'root', label: 'Decoy' },
          { id: 'b5', text: 'ful', type: 'suffix', label: 'Decoy' }
        ]
      }
    ]
  },
  hard: {
    tierKey: 'hard',
    tierName: 'Hard (Rule Shifts & Visual Decoys)',
    badgeColor: '#f87171',
    targetGoal: 3,
    challenges: [
      {
        meaningClue: 'Build "Happiest" (Watch the y change to i!)',
        speakClue: 'Build Happiest! Notice the y changed to i!',
        hint: 'Look for Happi with an i, plus suffix est!',
        slots: ['ROOT', 'SUFFIX'],
        correctSolution: ['Happi', 'est'],
        assembledWord: 'Happiest',
        trayBlocks: [
          { id: 'b1', text: 'Happi', type: 'root', label: 'Root (y -> i)' },
          { id: 'b2', text: 'est', type: 'suffix', label: 'Suffix (Most)' },
          { id: 'b3', text: 'Happy', type: 'root', label: 'Decoy (y unchanged)' },
          { id: 'b4', text: 'es', type: 'suffix', label: 'Decoy' },
          { id: 'b5', text: 'ist', type: 'suffix', label: 'Decoy' }
        ]
      },
      {
        meaningClue: 'Build a word that means: "Able to reverse"',
        speakClue: 'Build a word that means: Able to reverse!',
        hint: 'Revers (dropped e) plus suffix ible!',
        slots: ['ROOT', 'SUFFIX'],
        correctSolution: ['Revers', 'ible'],
        assembledWord: 'Reversible',
        trayBlocks: [
          { id: 'b1', text: 'Revers', type: 'root', label: 'Root (dropped e)' },
          { id: 'b2', text: 'ible', type: 'suffix', label: 'Suffix (-ible)' },
          { id: 'b3', text: 'Reverse', type: 'root', label: 'Decoy (with e)' },
          { id: 'b4', text: 'able', type: 'suffix', label: 'Decoy (-able)' },
          { id: 'b5', text: 'Dis', type: 'prefix', label: 'Decoy' }
        ]
      },
      {
        meaningClue: 'Build "Running" (Watch the doubled n!)',
        speakClue: 'Build Running! Notice the double n!',
        hint: 'Run plus suffix ning with double n!',
        slots: ['ROOT', 'SUFFIX'],
        correctSolution: ['Run', 'ning'],
        assembledWord: 'Running',
        trayBlocks: [
          { id: 'b1', text: 'Run', type: 'root', label: 'Root Word' },
          { id: 'b2', text: 'ning', type: 'suffix', label: 'Suffix (Double n)' },
          { id: 'b3', text: 'ing', type: 'suffix', label: 'Decoy (Single n)' },
          { id: 'b4', text: 'Rung', type: 'root', label: 'Decoy' },
          { id: 'b5', text: 'ed', type: 'suffix', label: 'Decoy' }
        ]
      }
    ]
  }
};

const MorphBotAssembly = ({ onComplete }) => {
  const { currentUser } = useAuth();
  const wrapperRef = useRef(null);

  const [phase, setPhase] = useState('start'); // start | playing | round_modal | complete
  const [difficultyTier, setDifficultyTier] = useState('easy');
  const [challengeIdx, setChallengeIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [sparkyMsg, setSparkyMsg] = useState('Snap morpheme power-cores into the robot slots! 🤖');
  const [isFullView, setIsFullView] = useState(false);

  // Robot animation states
  const [robotStatus, setRobotStatus] = useState('idle'); // idle | charging | fly | steam
  const [placedSlots, setPlacedSlots] = useState([]); // Array of block objects snapped in slots
  const [availableBlocks, setAvailableBlocks] = useState([]);

  const currentData = ROUND_DATA[difficultyTier] || ROUND_DATA.easy;
  const currentChallenge = currentData.challenges[challengeIdx % currentData.challenges.length];

  // Fullscreen sync
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

  // ── INIT GAME ──
  const initGame = useCallback((tierKey = 'easy') => {
    const data = ROUND_DATA[tierKey] || ROUND_DATA.easy;
    const challenge = data.challenges[0];

    setDifficultyTier(tierKey);
    setChallengeIdx(0);
    setScore(0);
    setCorrectCount(0);
    setAttempts(0);
    setPlacedSlots(new Array(challenge.slots.length).fill(null));
    setAvailableBlocks([...challenge.trayBlocks]);
    setRobotStatus('idle');
    setSparkyMsg(`New Robot Crew Member! ${challenge.meaningClue} 🤖`);
    setPhase('playing');

    speak(challenge.speakClue);
  }, []);

  // Load challenge state
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

      saveTherapyProgress(currentUser, 'morphology', score, acc, `Tier: ${tierKey}`);
      playSFX('win');
      setPhase('round_modal');
      return;
    }

    setChallengeIdx(cIdx);
    const challenge = data.challenges[cIdx];
    setPlacedSlots(new Array(challenge.slots.length).fill(null));
    setAvailableBlocks([...challenge.trayBlocks]);
    setRobotStatus('idle');
    setSparkyMsg(`Robot #${cIdx + 1}: ${challenge.meaningClue} 🤖`);
    speak(challenge.speakClue);
  }, [attempts, correctCount, currentUser, score]);

  // ── TAP TO PLACE BLOCK ──
  const handleBlockTap = (block) => {
    playSFX('snap');

    // Find first empty slot
    const emptyIndex = placedSlots.findIndex(s => s === null);
    if (emptyIndex === -1) return; // All slots full

    const newSlots = [...placedSlots];
    newSlots[emptyIndex] = block;
    setPlacedSlots(newSlots);

    // Remove block from conveyor tray
    setAvailableBlocks(prev => prev.filter(b => b.id !== block.id));
  };

  // ── TAP SLOT TO RETURN BLOCK TO TRAY ──
  const handleSlotTap = (index) => {
    const block = placedSlots[index];
    if (!block) return;

    playSFX('snap');
    const newSlots = [...placedSlots];
    newSlots[index] = null;
    setPlacedSlots(newSlots);

    // Return block to conveyor tray
    setAvailableBlocks(prev => [...prev, block]);
  };

  // ── CHECK ROBOT POWER ASSEMBLY ──
  const handlePowerUpCheck = () => {
    setAttempts(prev => prev + 1);

    const currentSolution = placedSlots.map(s => s ? s.text : '');
    const isCorrect = currentSolution.length === currentChallenge.correctSolution.length &&
      currentSolution.every((val, i) => val === currentChallenge.correctSolution[i]);

    if (isCorrect) {
      setRobotStatus('fly');
      playSFX('powerup');
      setScore(prev => prev + 30);
      setCorrectCount(prev => prev + 1);

      setSparkyMsg(`⚡ POWER CORE CHARGED! ${currentChallenge.assembledWord} assembled! 🎉`);
      speak(`Awesome! ${currentChallenge.assembledWord} assembled! Power up!`);

      setTimeout(() => {
        loadChallenge(challengeIdx + 1, difficultyTier);
      }, 1600);

    } else {
      // Incorrect Assembly
      setRobotStatus('steam');
      playSFX('steam');
      setSparkyMsg(`Puff! ${currentChallenge.hint}`);
      speak(`Almost! ${currentChallenge.hint}`);

      // Reset placed slots back to conveyor tray after steam
      setTimeout(() => {
        setRobotStatus('idle');
        const returned = placedSlots.filter(Boolean);
        setAvailableBlocks(prev => [...prev, ...returned]);
        setPlacedSlots(new Array(currentChallenge.slots.length).fill(null));
      }, 1200);
    }
  };

  // ── START SCREEN ──
  if (phase === 'start') {
    return (
      <div className="mba-container">
        <div className="mba-start-card">
          <div className="mba-start-icon">🤖 ⚡ 🧩</div>
          <h2 className="mba-start-title">MORPH-BOT POWER FACTORY</h2>
          <p className="mba-start-desc">
            Assemble glowing morpheme power-cores (<strong style={{ color: '#38bdf8' }}>PREFIX</strong>, <strong style={{ color: '#4ade80' }}>ROOT</strong>, <strong style={{ color: '#fbbf24' }}>SUFFIX</strong>) to repair Sparky's robot crew!
            <br /><br />
            🎮 <strong>3 Difficulty Tiers</strong> (Easy 2-Part, Medium 3-Part, Hard Rule Shifts).
            <br />⚡ Tap morpheme chips on the conveyor belt to snap them into the robot's power slots!
          </p>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginBottom: '1.25rem' }}>
            <button className={`mba-tier-btn easy ${difficultyTier === 'easy' ? 'active' : ''}`} onClick={() => setDifficultyTier('easy')}>🟢 Easy</button>
            <button className={`mba-tier-btn medium ${difficultyTier === 'medium' ? 'active' : ''}`} onClick={() => setDifficultyTier('medium')}>🟡 Medium</button>
            <button className={`mba-tier-btn hard ${difficultyTier === 'hard' ? 'active' : ''}`} onClick={() => setDifficultyTier('hard')}>🔴 Hard</button>
          </div>
          <button className="mba-start-btn" onClick={() => initGame(difficultyTier)}>
            ⚡ START REPAIRING
          </button>
        </div>
      </div>
    );
  }

  // ── ROUND CLEARED MODAL ──
  if (phase === 'round_modal') {
    const acc = attempts > 0 ? Math.round((correctCount / attempts) * 100) : 100;
    return (
      <div className="mba-container">
        <div className="mba-complete-card">
          <div className="mba-complete-emojis">🤖 🚀 ✨</div>
          <h2 className="mba-complete-title">ROBOT CREW REPAIRED!</h2>
          <p className="mba-complete-sub">
            🤖 <strong>SPARKY:</strong> "All robot power cores assembled with {acc}% accuracy!"
          </p>
          <div className="mba-complete-stats">
            <div className="mba-stat-box"><small>Score</small><div className="val" style={{ color: '#fbbf24' }}>{score} XP</div></div>
            <div className="mba-stat-box"><small>Accuracy</small><div className="val" style={{ color: '#4ade80' }}>{acc}%</div></div>
            <div className="mba-stat-box"><small>Tier</small><div className="val" style={{ color: currentData.badgeColor }}>{currentData.tierName.split(' ')[0]}</div></div>
          </div>
          <div className="mba-complete-btns">
            {difficultyTier !== 'hard' ? (
              <button className="mba-btn-next" onClick={() => initGame(difficultyTier === 'easy' ? 'medium' : 'hard')}>
                ➔ NEXT TIER ({difficultyTier === 'easy' ? 'Medium' : 'Hard'})
              </button>
            ) : (
              <button className="mba-btn-next" onClick={() => setPhase('complete')}>🏆 GRAND RESULTS</button>
            )}
            <button className="mba-btn-hq" onClick={() => initGame('easy')}>🔄 RESTART EASY</button>
          </div>
        </div>
      </div>
    );
  }

  // ── GRAND COMPLETION SCREEN ──
  if (phase === 'complete') {
    const acc = attempts > 0 ? Math.round((correctCount / attempts) * 100) : 100;
    return (
      <div className="mba-container">
        <div className="mba-complete-card">
          <div className="mba-complete-emojis">🤖 🏆 🌟</div>
          <h2 className="mba-complete-title">MASTER MORPHOLOGIST!</h2>
          <p className="mba-complete-sub">You powered up all 3 robot tiers with {acc}% overall accuracy!</p>
          <div className="mba-complete-stats">
            <div className="mba-stat-box"><small>Total Score</small><div className="val" style={{ color: '#fbbf24' }}>{score} XP</div></div>
            <div className="mba-stat-box"><small>Accuracy</small><div className="val" style={{ color: '#4ade80' }}>{acc}%</div></div>
            <div className="mba-stat-box"><small>Robots Fixed</small><div className="val" style={{ color: '#38bdf8' }}>{correctCount}</div></div>
          </div>
          <div className="mba-complete-btns">
            <button className="mba-btn-next" onClick={() => initGame('easy')}>🔄 PLAY AGAIN</button>
            <button className="mba-btn-hq" onClick={onComplete}>MISSION HQ 🏠</button>
          </div>
        </div>
      </div>
    );
  }

  // ── PLAYING SCREEN ──
  const isSlotsFull = placedSlots.every(Boolean);

  return (
    <div ref={wrapperRef} className={`mba-container ${isFullView ? 'mba-fullscreen' : ''}`}>
      {/* HUD Header */}
      <header className="mba-hud">
        <div className="mba-hud-title"><span>🤖</span> MORPH-BOT FACTORY</div>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button className={`mba-tier-btn easy ${difficultyTier === 'easy' ? 'active' : ''}`} onClick={() => initGame('easy')}>🟢 Easy</button>
          <button className={`mba-tier-btn medium ${difficultyTier === 'medium' ? 'active' : ''}`} onClick={() => initGame('medium')}>🟡 Medium</button>
          <button className={`mba-tier-btn hard ${difficultyTier === 'hard' ? 'active' : ''}`} onClick={() => initGame('hard')}>🔴 Hard</button>
        </div>
        <div className="mba-hud-stats">
          <div className="mba-stat-pill">⭐ {score} XP</div>
          <div className="mba-stat-pill" style={{ color: currentData.badgeColor }}>📜 Round {difficultyTier === 'easy' ? '1/3' : difficultyTier === 'medium' ? '2/3' : '3/3'}</div>
        </div>
      </header>

      {/* Clue Banner & Sparky */}
      <div className="mba-clue-row">
        <div className="mba-clue-banner">
          <div className="mba-clue-badge">🎯 MEANING CLUE</div>
          <div className="mba-clue-prompt">{currentChallenge.meaningClue}</div>
          <button className="mba-listen-btn" onClick={() => speak(currentChallenge.speakClue)}>🔊 Listen</button>
        </div>
        <div className="mba-sparky-card">
          <div className="mba-sparky-icon">🦉</div>
          <div className="mba-sparky-bubble" key={sparkyMsg}>{sparkyMsg}</div>
        </div>
      </div>

      {/* Robot Repair Garage Stage */}
      <div className="mba-garage-stage">
        {/* Robot Entity */}
        <div className={`mba-robot ${robotStatus === 'fly' ? 'mba-robot-fly' : ''} ${robotStatus === 'steam' ? 'mba-robot-steam' : ''}`}>
          <div className="mba-robot-head">
            <div className={`mba-robot-eye ${robotStatus === 'fly' ? 'glow' : ''}`}></div>
            <div className={`mba-robot-eye ${robotStatus === 'fly' ? 'glow' : ''}`}></div>
          </div>
          <div className="mba-robot-chest">
            <div className="mba-chest-label">⚡ MORPHEME POWER SLOTS</div>
            {/* Power Core Slots */}
            <div className="mba-slots-row">
              {currentChallenge.slots.map((slotType, idx) => {
                const placed = placedSlots[idx];
                return (
                  <div
                    key={idx}
                    className={`mba-power-slot ${placed ? 'filled' : 'empty'} ${placed ? placed.type : ''}`}
                    onClick={() => handleSlotTap(idx)}
                  >
                    {placed ? (
                      <div className="mba-chip-content">
                        <span className="mba-chip-text">{placed.text}</span>
                        <small className="mba-chip-sub">{placed.label}</small>
                      </div>
                    ) : (
                      <span className="mba-slot-placeholder">[{slotType}]</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          <div className="mba-robot-thrusters">
            {robotStatus === 'fly' && <div className="mba-flame">🔥</div>}
          </div>
        </div>

        {/* Conveyor Belt Tray of Morpheme Chips */}
        <div className="mba-conveyor-section">
          <div className="mba-conveyor-header">⚙️ MORPHEME CHIP CONVEYOR (TAP TO SNAP)</div>
          <div className="mba-conveyor-belt">
            {availableBlocks.map(block => (
              <button
                key={block.id}
                className={`mba-morpheme-chip ${block.type}`}
                onClick={() => handleBlockTap(block)}
              >
                <span className="mba-chip-main">{block.text}</span>
                <small className="mba-chip-tag">{block.label}</small>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Footer Controls */}
      <footer className="mba-footer">
        <button className="mba-fullview-btn" onClick={toggleFullView}>
          {isFullView ? '↙ Exit Fullscreen' : '⛶ Fullscreen'}
        </button>

        <button
          className={`mba-powerup-btn ${isSlotsFull ? 'ready' : ''}`}
          disabled={!isSlotsFull}
          onClick={handlePowerUpCheck}
        >
          ⚡ POWER UP ROBOT
        </button>
      </footer>
    </div>
  );
};

export default MorphBotAssembly;
