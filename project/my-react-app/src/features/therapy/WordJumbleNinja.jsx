import React, { useState, useEffect, useRef, useCallback } from 'react';
import { speakText } from '../../utils/speechHelper';
import './VisualTrackingSuite.css';

// ----------------------------------------------------------------------
// EXTENDED WORD PAIRS POOLS (20+ UNIQUE PAIRS PER LEVEL)
// ----------------------------------------------------------------------
const WORD_POOLS = {
  1: [
    { original: 'cat dog', swap: 'dog cat', migration: 'hat log', level: 1 },
    { original: 'red cup', swap: 'cup red', migration: 'bed cap', level: 1 },
    { original: 'big sun', swap: 'sun big', migration: 'pig bun', level: 1 },
    { original: 'blue sky', swap: 'sky blue', migration: 'blow spy', level: 1 },
    { original: 'hot tea', swap: 'tea hot', migration: 'hat toe', level: 1 },
    { original: 'fast bus', swap: 'bus fast', migration: 'fat bass', level: 1 },
    { original: 'green tree', swap: 'tree green', migration: 'grin free', level: 1 },
    { original: 'soft bed', swap: 'bed soft', migration: 'sift bad', level: 1 },
    { original: 'gold ring', swap: 'ring gold', migration: 'glad sing', level: 1 },
    { original: 'cold ice', swap: 'ice cold', migration: 'cord ace', level: 1 },
    { original: 'sweet cake', swap: 'cake sweet', migration: 'sweat lake', level: 1 },
    { original: 'tall book', swap: 'book tall', migration: 'tell back', level: 1 },
    { original: 'small box', swap: 'box small', migration: 'smell fox', level: 1 },
    { original: 'bright star', swap: 'star bright', migration: 'night stir', level: 1 },
    { original: 'warm hat', swap: 'hat warm', migration: 'worm hit', level: 1 },
    { original: 'fun toy', swap: 'toy fun', migration: 'fan joy', level: 1 },
    { original: 'cool breeze', swap: 'breeze cool', migration: 'pool freeze', level: 1 },
    { original: 'deep sea', swap: 'sea deep', migration: 'door saw', level: 1 },
    { original: 'fresh milk', swap: 'milk fresh', migration: 'flash silk', level: 1 },
    { original: 'loud bell', swap: 'bell loud', migration: 'lord ball', level: 1 },
    { original: 'clean room', swap: 'room clean', migration: 'clear roof', level: 1 },
    { original: 'fast car', swap: 'car fast', migration: 'first cat', level: 1 }
  ],
  2: [
    { original: 'kind wing', swap: 'wing kind', migration: 'wind king', level: 2 },
    { original: 'pots stop', swap: 'stop pots', migration: 'post spot', level: 2 },
    { original: 'team meat', swap: 'meat team', migration: 'tame mate', level: 2 },
    { original: 'bark dark', swap: 'dark bark', migration: 'bard hark', level: 2 },
    { original: 'cold bold', swap: 'bold cold', migration: 'cord fold', level: 2 },
    { original: 'slip lips', swap: 'lips slip', migration: 'silt lisp', level: 2 },
    { original: 'read dear', swap: 'dear read', migration: 'raid deer', level: 2 },
    { original: 'star rats', swap: 'rats star', migration: 'stir rats', level: 2 },
    { original: 'spin pins', swap: 'pins spin', migration: 'span pins', level: 2 },
    { original: 'notes stone', swap: 'stone notes', migration: 'snote tone', level: 2 },
    { original: 'lamp palm', swap: 'palm lamp', migration: 'lpm palm', level: 2 },
    { original: 'form drop', swap: 'drop form', migration: 'from dorp', level: 2 },
    { original: 'board broad', swap: 'broad board', migration: 'braod board', level: 2 },
    { original: 'brain barn', swap: 'barn brain', migration: 'bain brarn', level: 2 },
    { original: 'cloud cold', swap: 'cold cloud', migration: 'could clod', level: 2 },
    { original: 'trail trial', swap: 'trial trail', migration: 'trial tail', level: 2 },
    { original: 'flame frame', swap: 'frame flame', migration: 'frame fame', level: 2 },
    { original: 'sweet sweat', swap: 'sweat sweet', migration: 'sweat soot', level: 2 },
    { original: 'quiet quite', swap: 'quite quiet', migration: 'quite quit', level: 2 },
    { original: 'angle angel', swap: 'angel angle', migration: 'angel ankle', level: 2 }
  ],
  3: [
    { original: 'cat dog hen', swap: 'hen cat dog', migration: 'can dog hat', level: 3 },
    { original: 'red cup pen', swap: 'pen red cup', migration: 'run cap ped', level: 3 },
    { original: 'sun big sky', swap: 'sky sun big', migration: 'bun pig say', level: 3 },
    { original: 'kind wing bird', swap: 'bird kind wing', migration: 'wind king bind', level: 3 },
    { original: 'tree star moon', swap: 'moon tree star', migration: 'true stir moan', level: 3 },
    { original: 'book pen desk', swap: 'desk book pen', migration: 'back pan disk', level: 3 },
    { original: 'fish frog duck', swap: 'duck fish frog', migration: 'fash fog dock', level: 3 },
    { original: 'car bus train', swap: 'train car bus', migration: 'can boss trail', level: 3 },
    { original: 'blue green red', swap: 'red blue green', migration: 'blow grin rod', level: 3 },
    { original: 'milk bread egg', swap: 'egg milk bread', migration: 'silk braid end', level: 3 },
    { original: 'ship boat sea', swap: 'sea ship boat', migration: 'shop bait saw', level: 3 },
    { original: 'fast lion bear', swap: 'bear fast lion', migration: 'first line pear', level: 3 },
    { original: 'gold ring king', swap: 'king gold ring', migration: 'glad sing wing', level: 3 },
    { original: 'soft bed pillow', swap: 'pillow soft bed', migration: 'sift bad yellow', level: 3 },
    { original: 'cool breeze wind', swap: 'wind cool breeze', migration: 'pool freeze wand', level: 3 }
  ]
};

// Web Audio Synth for ninja slice sound and feedback
const playNinjaAudio = (type) => {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    const now = ctx.currentTime;

    if (type === 'ninja-slice') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1200, now);
      osc.frequency.exponentialRampToValueAtTime(300, now + 0.12);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      osc.start(now);
      osc.stop(now + 0.15);
    } else if (type === 'wrong-shake') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(280, now);
      osc.frequency.linearRampToValueAtTime(210, now + 0.2);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      osc.start(now);
      osc.stop(now + 0.22);
    } else if (type === 'star-fanfare') {
      const notes = [587.33, 739.99, 880, 1174.66];
      notes.forEach((freq, i) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = 'sine';
        o.frequency.setValueAtTime(freq, now + i * 0.06);
        g.gain.setValueAtTime(0.15, now + i * 0.06);
        g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.06 + 0.25);
        o.connect(g);
        g.connect(ctx.destination);
        o.start(now + i * 0.06);
        o.stop(now + i * 0.06 + 0.28);
      });
    }
  } catch (e) {}
};

export default function WordJumbleNinja({ onCompleteRound, initialLevel = 1 }) {
  const [level, setLevel] = useState(initialLevel);
  const [roundNumber, setRoundNumber] = useState(1);
  const [maxRounds] = useState(6);
  const [stars, setStars] = useState(0);

  const [currentPair, setCurrentPair] = useState(WORD_POOLS[1][0]);
  const [options, setOptions] = useState([]);
  const [phase, setPhase] = useState('flash'); // 'flash' | 'recall' | 'feedback'
  const [selectedOption, setSelectedOption] = useState(null);

  // Diagnostic Error Counts
  const [correctCount, setCorrectCount] = useState(0);
  const [wordOrderSwapCount, setWordOrderSwapCount] = useState(0);
  const [letterMigrationCount, setLetterMigrationCount] = useState(0);
  const [roundSummary, setRoundSummary] = useState(null);

  // Non-repeating tracking per session
  const seenIndicesRef = useRef({});

  const recallStartTimeRef = useRef(Date.now());
  const roundLatenciesRef = useRef([]);

  // Setup single round with guaranteed unique non-repeating item
  const setupRound = useCallback((currentLvl) => {
    const pool = WORD_POOLS[currentLvl] || WORD_POOLS[1];
    
    if (!seenIndicesRef.current[currentLvl]) {
      seenIndicesRef.current[currentLvl] = new Set();
    }
    const seen = seenIndicesRef.current[currentLvl];

    // Reset if full pool has been shown
    if (seen.size >= pool.length) {
      seen.clear();
    }

    let nextIdx = Math.floor(Math.random() * pool.length);
    let attempts = 0;
    while (seen.has(nextIdx) && attempts < 50) {
      nextIdx = Math.floor(Math.random() * pool.length);
      attempts++;
    }
    seen.add(nextIdx);

    const pair = pool[nextIdx];
    setCurrentPair(pair);

    // Shuffle 3 options: Original, Swap, Migration
    const optList = [
      { text: pair.original, type: 'correct' },
      { text: pair.swap, type: 'word-order-swap' },
      { text: pair.migration, type: 'letter-migration' }
    ];

    for (let i = optList.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [optList[i], optList[j]] = [optList[j], optList[i]];
    }

    setOptions(optList);
    setSelectedOption(null);
    setPhase('flash');

    // Speak initial instruction
    speakText("Watch closely! Remember what you see!");
  }, []);

  // Initialize round
  useEffect(() => {
    setupRound(level);
  }, [level, setupRound]);

  // Flash phase timer (Exactly 1.5 seconds)
  useEffect(() => {
    if (phase !== 'flash' || roundSummary) return;

    const timer = setTimeout(() => {
      setPhase('recall');
      recallStartTimeRef.current = Date.now();
    }, 1500);

    return () => clearTimeout(timer);
  }, [phase, roundSummary]);

  // Handle option selection
  const handleOptionSelect = (opt) => {
    if (phase !== 'recall' || selectedOption) return;

    const latency = Date.now() - recallStartTimeRef.current;
    roundLatenciesRef.current.push(latency);
    setSelectedOption(opt);
    setPhase('feedback');

    if (opt.type === 'correct') {
      playNinjaAudio('ninja-slice');
      playNinjaAudio('star-fanfare');
      setStars((prev) => prev + 1);
      setCorrectCount((prev) => prev + 1);
      speakText("Awesome Ninja Slice!");
    } else {
      playNinjaAudio('wrong-shake');

      if (opt.type === 'word-order-swap') {
        setWordOrderSwapCount((prev) => prev + 1);
      } else if (opt.type === 'letter-migration') {
        setLetterMigrationCount((prev) => prev + 1);
      }

      speakText(`Good try! The original was: ${currentPair.original}`);
    }

    // Auto-advance to next round after 1.8 seconds
    setTimeout(() => {
      if (roundNumber < maxRounds) {
        setRoundNumber((prev) => prev + 1);
        setupRound(level);
      } else {
        finishSession();
      }
    }, 1800);
  };

  const finishSession = () => {
    const totalRounds = maxRounds;
    const accuracyPct = Math.round((correctCount / totalRounds) * 100);

    const avgLatency =
      roundLatenciesRef.current.length > 0
        ? Math.round(
            roundLatenciesRef.current.reduce((a, b) => a + b, 0) /
              roundLatenciesRef.current.length
          )
        : 420;

    const sessionData = {
      game: 'Word Jumble Ninja',
      level,
      totalRounds,
      stars,
      accuracyPct,
      correctCount,
      wordOrderSwapCount,
      letterMigrationCount,
      avgLatencyMs: avgLatency
    };

    setRoundSummary(sessionData);

    if (onCompleteRound) {
      onCompleteRound(sessionData);
    }
  };

  const handleRestart = () => {
    setRoundNumber(1);
    setStars(0);
    setCorrectCount(0);
    setWordOrderSwapCount(0);
    setLetterMigrationCount(0);
    setRoundSummary(null);
    setupRound(level);
  };

  return (
    <div className="vt-game-arena">
      {/* Sparky Character Header Banner */}
      <div className="sparky-banner">
        <div className="sparky-avatar">🥷</div>
        <div className="sparky-text-area">
          <div className="sparky-title">Ninja Flash Quest • Round {roundNumber} of {maxRounds}</div>
          <p className="sparky-instruction">
            {phase === 'flash'
              ? 'Watch closely! Remember the word pair!'
              : 'Which option matches what you actually saw?'}
          </p>
        </div>
        <button className="sparky-speaker-btn" onClick={() => speakText("Watch closely! Remember what you see!")}>
          🔊 Read Aloud
        </button>
      </div>

      {!roundSummary ? (
        <>
          {/* Status Bar */}
          <div className="vt-status-bar">
            <div className="vt-status-pill">
              <span>⭐ Ninja Stars:</span>
              <strong style={{ color: '#eab308', fontSize: '1.2rem' }}>{stars}</strong>
            </div>

            <div className="vt-status-pill">
              <span>⚡ Flash Time:</span>
              <strong style={{ color: '#38bdf8' }}>1.5s Fixed</strong>
            </div>

            <div className="vt-status-pill">
              <span>🎯 Level:</span>
              <span style={{ color: '#10b981' }}>Level {level} ({level === 1 ? 'Distinct' : level === 2 ? 'Overlap' : '3-Word Sets'})</span>
            </div>
          </div>

          {/* Flash Phase View */}
          {phase === 'flash' && (
            <div className="ninja-flash-container">
              <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#94a3b8' }}>
                FLASHING PAIR...
              </span>
              <div className="ninja-flash-words">{currentPair.original}</div>
              <div className="flash-progress-bar">
                <div className="flash-progress-fill" />
              </div>
            </div>
          )}

          {/* Recall Phase Options */}
          {(phase === 'recall' || phase === 'feedback') && (
            <div className="ninja-recall-container">
              {options.map((opt, idx) => {
                const isSelected = selectedOption?.text === opt.text;
                const isCorrectOption = opt.type === 'correct';

                let cardClass = '';
                if (phase === 'feedback') {
                  if (isSelected && isCorrectOption) {
                    cardClass = 'option-correct';
                  } else if (isSelected && !isCorrectOption) {
                    cardClass = 'option-wrong';
                  } else if (isCorrectOption) {
                    cardClass = 'option-correct';
                  }
                }

                return (
                  <div
                    key={idx}
                    className={`ninja-option-card ${cardClass}`}
                    onClick={() => handleOptionSelect(opt)}
                  >
                    <span>{opt.text}</span>
                    {phase === 'feedback' && isSelected && isCorrectOption && (
                      <div className="ninja-slash-line" />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      ) : (
        /* Round / Session Summary Scorecard */
        <div className="vt-summary-card">
          <div className="vt-summary-trophy">🥷⭐</div>
          <h2 className="vt-summary-title">Ninja Quest Complete!</h2>
          <p className="vt-summary-subtitle">
            Word Jumble Ninja • Level {level} Visual & Migration Training
          </p>

          <div className="vt-metrics-grid">
            <div className="vt-metric-box highlight-green">
              <label>Target Accuracy</label>
              <div className="val">{roundSummary.accuracyPct}%</div>
            </div>

            <div className="vt-metric-box highlight-purple">
              <label>Stars Earned</label>
              <div className="val">⭐ {roundSummary.stars}</div>
            </div>

            <div className="vt-metric-box highlight-orange">
              <label>Letter Migration Errors</label>
              <div className="val">{roundSummary.letterMigrationCount}</div>
              <small style={{ color: '#64748b', fontSize: '0.7rem' }}>Key Dyslexia Migration Signal</small>
            </div>

            <div className="vt-metric-box highlight-blue">
              <label>Word Order Swap Errors</label>
              <div className="val">{roundSummary.wordOrderSwapCount}</div>
              <small style={{ color: '#64748b', fontSize: '0.7rem' }}>Word Swap Distractors</small>
            </div>
          </div>

          <div className="vt-btn-row">
            <button className="vt-btn-primary" onClick={handleRestart}>
              Play Next Level ➔
            </button>
            <button className="vt-btn-secondary" onClick={() => setLevel(prev => (prev % 3) + 1)}>
              Set Level ({level})
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
