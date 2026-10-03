import React, { useState, useEffect, useRef, useCallback } from 'react';
import { speakText } from '../../utils/speechHelper';
import './VisualTrackingSuite.css';

// ----------------------------------------------------------------------
// EXTENDED REVERSAL PAIRS POOLS (10+ VARIATIONS PER LEVEL)
// ----------------------------------------------------------------------
const PAIR_POOLS = {
  1: [
    { target: 'b', decoy: 'd', distractorPool: ['d'], totalCells: 18, name: 'Level 1: Easy (b vs d)' },
    { target: 'd', decoy: 'b', distractorPool: ['b'], totalCells: 18, name: 'Level 1: Easy (d vs b)' },
    { target: 'p', decoy: 'q', distractorPool: ['q'], totalCells: 18, name: 'Level 1: Easy (p vs q)' },
    { target: 'q', decoy: 'p', distractorPool: ['p'], totalCells: 18, name: 'Level 1: Easy (q vs p)' },
    { target: 'n', decoy: 'u', distractorPool: ['u'], totalCells: 18, name: 'Level 1: Easy (n vs u)' },
    { target: 'u', decoy: 'n', distractorPool: ['n'], totalCells: 18, name: 'Level 1: Easy (u vs n)' }
  ],
  2: [
    { target: 'p', decoy: 'q', distractorPool: ['q', 'b'], totalCells: 30, name: 'Level 2: Medium (p vs q)' },
    { target: 'q', decoy: 'p', distractorPool: ['p', 'd'], totalCells: 30, name: 'Level 2: Medium (q vs p)' },
    { target: 'b', decoy: 'd', distractorPool: ['d', 'p'], totalCells: 30, name: 'Level 2: Medium (b vs d)' },
    { target: 'd', decoy: 'b', distractorPool: ['b', 'q'], totalCells: 30, name: 'Level 2: Medium (d vs b)' },
    { target: 'm', decoy: 'w', distractorPool: ['w', 'n'], totalCells: 30, name: 'Level 2: Medium (m vs w)' },
    { target: 'w', decoy: 'm', distractorPool: ['m', 'u'], totalCells: 30, name: 'Level 2: Medium (w vs m)' }
  ],
  3: [
    { target: 'm', decoy: 'w', distractorPool: ['w', 'n', 'u'], totalCells: 30, name: 'Level 3: Hard (m vs w / mixed)' },
    { target: 'n', decoy: 'u', distractorPool: ['u', 'm', 'w'], totalCells: 30, name: 'Level 3: Hard (n vs u / mixed)' },
    { target: 'b', decoy: 'd', distractorPool: ['d', 'p', 'q'], totalCells: 30, name: 'Level 3: Hard (b vs d + distractors)' },
    { target: 'p', decoy: 'q', distractorPool: ['q', 'b', 'd'], totalCells: 30, name: 'Level 3: Hard (p vs q + distractors)' },
    { target: 'd', decoy: 'b', distractorPool: ['b', 'p', 'q'], totalCells: 30, name: 'Level 3: Hard (d vs b + distractors)' },
    { target: 'q', decoy: 'p', distractorPool: ['p', 'd', 'b'], totalCells: 30, name: 'Level 3: Hard (q vs p + distractors)' }
  ]
};

// Web Audio Synth for soft pops and chimes
const playAudioEffect = (type) => {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;
    if (type === 'correct') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, now);
      osc.frequency.exponentialRampToValueAtTime(783.99, now + 0.15);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      osc.start(now);
      osc.stop(now + 0.2);
    } else if (type === 'mistake') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.linearRampToValueAtTime(240, now + 0.18);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      osc.start(now);
      osc.stop(now + 0.2);
    } else if (type === 'complete') {
      const notes = [523.25, 659.25, 783.99, 1046.50];
      notes.forEach((freq, i) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = 'sine';
        o.frequency.setValueAtTime(freq, now + i * 0.07);
        g.gain.setValueAtTime(0.15, now + i * 0.07);
        g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.07 + 0.25);
        o.connect(g);
        g.connect(ctx.destination);
        o.start(now + i * 0.07);
        o.stop(now + i * 0.07 + 0.28);
      });
    }
  } catch (e) {}
};

export default function LetterTwinsHunt({ onCompleteRound, initialLevel = 1 }) {
  const [level, setLevel] = useState(initialLevel);
  const [roundNumber, setRoundNumber] = useState(1);
  const [maxRounds] = useState(6);
  
  const [pairObj, setPairObj] = useState(PAIR_POOLS[1][0]);
  const [gridCells, setGridCells] = useState([]);
  const [targetCount, setTargetCount] = useState(0);
  const [foundCount, setFoundCount] = useState(0);

  // Mistake & Latency Telemetry
  const [reversalMistakes, setReversalMistakes] = useState(0);
  const [randomMistakes, setRandomMistakes] = useState(0);
  const [totalTaps, setTotalTaps] = useState(0);
  
  // Timer & State
  const [timeLeft, setTimeLeft] = useState(45);
  const [roundActive, setRoundActive] = useState(false);
  const [roundSummary, setRoundSummary] = useState(null);

  // Non-repeating tracking
  const seenPairsRef = useRef({});
  
  const startTimeRef = useRef(Date.now());
  const itemLatenciesRef = useRef([]);
  const lastTapTimeRef = useRef(Date.now());

  // Setup round with non-repeating pair selection
  const setupRound = useCallback((currentLvl) => {
    const pool = PAIR_POOLS[currentLvl] || PAIR_POOLS[1];
    
    if (!seenPairsRef.current[currentLvl]) {
      seenPairsRef.current[currentLvl] = new Set();
    }
    const seen = seenPairsRef.current[currentLvl];

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

    const chosenPair = pool[nextIdx];
    setPairObj(chosenPair);

    const total = chosenPair.totalCells; // 18 or 30
    const targetRatio = 0.25;
    const numTargets = Math.max(4, Math.floor(total * targetRatio));
    const numDecoys = total - numTargets;

    // Create array of target and decoy letters
    const letters = [];
    for (let i = 0; i < numTargets; i++) {
      letters.push({ char: chosenPair.target, isTarget: true });
    }

    const distractors = chosenPair.distractorPool;
    for (let i = 0; i < numDecoys; i++) {
      const distChar = distractors[Math.floor(Math.random() * distractors.length)];
      letters.push({ char: distChar, isTarget: false, isMirror: distChar === chosenPair.decoy });
    }

    // Shuffle grid
    for (let i = letters.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [letters[i], letters[j]] = [letters[j], letters[i]];
    }

    const formattedCells = letters.map((item, idx) => ({
      id: idx,
      char: item.char,
      isTarget: item.isTarget,
      isMirror: item.isMirror,
      isFound: false,
      animateClass: ''
    }));

    setGridCells(formattedCells);
    setTargetCount(numTargets);
    setFoundCount(0);
    setReversalMistakes(0);
    setRandomMistakes(0);
    setTotalTaps(0);
    setTimeLeft(45);
    setRoundSummary(null);
    setRoundActive(true);

    startTimeRef.current = Date.now();
    lastTapTimeRef.current = Date.now();
    itemLatenciesRef.current = [];

    // Speak Sparky Instruction
    const instrText = `Find and tap every ${chosenPair.target.toUpperCase()}! Watch out for tricky ${chosenPair.decoy.toUpperCase()}s!`;
    speakText(instrText);
  }, []);

  // Initialize round on mount or level change
  useEffect(() => {
    setupRound(level);
  }, [level, setupRound]);

  // Round Timer
  useEffect(() => {
    if (!roundActive || roundSummary) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          finishRound(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [roundActive, roundSummary]);

  // Handle cell tap
  const handleCellTap = (cellIndex) => {
    if (!roundActive || roundSummary) return;
    const cell = gridCells[cellIndex];
    if (cell.isFound) return;

    const now = Date.now();
    const latency = now - lastTapTimeRef.current;
    lastTapTimeRef.current = now;
    itemLatenciesRef.current.push(latency);

    setTotalTaps((prev) => prev + 1);

    if (cell.isTarget) {
      playAudioEffect('correct');
      const newFound = foundCount + 1;
      setFoundCount(newFound);

      setGridCells((prev) =>
        prev.map((c, idx) =>
          idx === cellIndex
            ? { ...c, isFound: true, animateClass: 'animate-correct cell-found' }
            : c
        )
      );

      if (newFound >= targetCount) {
        setTimeout(() => {
          finishRound(false);
        }, 500);
      }
    } else {
      playAudioEffect('mistake');

      if (cell.isMirror) {
        setReversalMistakes((prev) => prev + 1);
      } else {
        setRandomMistakes((prev) => prev + 1);
      }

      setGridCells((prev) =>
        prev.map((c, idx) =>
          idx === cellIndex
            ? { ...c, animateClass: 'animate-mistake' }
            : c
        )
      );

      setTimeout(() => {
        setGridCells((prev) =>
          prev.map((c, idx) =>
            idx === cellIndex ? { ...c, animateClass: '' } : c
          )
        );
      }, 550);
    }
  };

  // Finish Round & Compute Scorecard
  const finishRound = (timeExpired = false) => {
    setRoundActive(false);
    playAudioEffect('complete');

    const totalRoundTime = Math.max(1, Math.round((Date.now() - startTimeRef.current) / 1000));
    const accuracyPct = Math.round((foundCount / targetCount) * 100);

    const avgLatency =
      itemLatenciesRef.current.length > 0
        ? Math.round(
            itemLatenciesRef.current.reduce((a, b) => a + b, 0) /
              itemLatenciesRef.current.length
          )
        : 450;

    const roundData = {
      game: 'Letter Twins Hunt',
      level,
      roundNumber,
      targetLetter: pairObj.target,
      decoyLetter: pairObj.decoy,
      targetsFound: foundCount,
      totalTargets: targetCount,
      accuracyPct,
      reversalMistakes,
      randomMistakes,
      totalRoundTimeSec: totalRoundTime,
      avgLatencyMs: avgLatency,
      timeExpired
    };

    setRoundSummary(roundData);

    if (onCompleteRound) {
      onCompleteRound(roundData);
    }
  };

  const handleNextRound = () => {
    if (roundNumber < maxRounds) {
      const nextRound = roundNumber + 1;
      setRoundNumber(nextRound);
      if (roundSummary && roundSummary.accuracyPct >= 80 && level < 3) {
        setLevel((prev) => Math.min(3, prev + 1));
      } else {
        setupRound(level);
      }
    } else {
      setRoundNumber(1);
      setupRound(level);
    }
  };

  const readInstruction = () => {
    speakText(`Find and tap every ${pairObj.target.toUpperCase()}! Watch out for tricky ${pairObj.decoy.toUpperCase()}s!`);
  };

  return (
    <div className="vt-game-arena">
      {/* Sparky Character Header Banner */}
      <div className="sparky-banner">
        <div className="sparky-avatar">🐶</div>
        <div className="sparky-text-area">
          <div className="sparky-title">Sparky's Letter Quest • Round {roundNumber} of {maxRounds}</div>
          <p className="sparky-instruction">
            Find and tap every <span className="vt-target-highlight">{pairObj.target}</span>! Watch out for tricky <strong>"{pairObj.decoy}"</strong>s!
          </p>
        </div>
        <button className="sparky-speaker-btn" onClick={readInstruction}>
          🔊 Read Aloud
        </button>
      </div>

      {!roundSummary ? (
        <>
          {/* Game Stats & Counter Bar */}
          <div className="vt-status-bar">
            <div className="vt-status-pill">
              <span>🎯 Found:</span>
              <strong style={{ color: '#16a34a', fontSize: '1.2rem' }}>
                {foundCount} / {targetCount}
              </strong>
            </div>

            <div className="vt-status-pill">
              <span>⭐ Level:</span>
              <span style={{ color: '#2563eb' }}>{pairObj.name.split(':')[0]}</span>
            </div>

            <div className="vt-status-pill">
              <span>⏱️ Time Left:</span>
              <strong style={{ color: timeLeft <= 10 ? '#dc2626' : '#d97706', fontSize: '1.2rem' }}>
                {timeLeft}s
              </strong>
            </div>
          </div>

          {/* Letter Grid */}
          <div className={`twins-grid ${level === 1 ? 'twins-grid-3x6' : 'twins-grid-5x6'}`}>
            {gridCells.map((cell, idx) => (
              <div
                key={cell.id}
                className={`twins-cell ${level === 1 ? 'twins-cell-lvl1' : ''} ${cell.animateClass}`}
                onClick={() => handleCellTap(idx)}
              >
                <span className="twins-letter">{cell.char}</span>
                <span className="twin-badge-icon">{cell.isTarget ? '🐰' : '🐶'}</span>
              </div>
            ))}
          </div>
        </>
      ) : (
        /* Round Summary Scorecard */
        <div className="vt-summary-card">
          <div className="vt-summary-trophy">🐰🏆</div>
          <h2 className="vt-summary-title">Round {roundNumber} Complete!</h2>
          <p className="vt-summary-subtitle">
            Letter Twins Hunt • Target "{pairObj.target}" vs Decoy "{pairObj.decoy}"
          </p>

          <div className="vt-metrics-grid">
            <div className="vt-metric-box highlight-green">
              <label>Target Accuracy</label>
              <div className="val">{roundSummary.accuracyPct}%</div>
            </div>

            <div className="vt-metric-box highlight-blue">
              <label>Completion Time</label>
              <div className="val">{roundSummary.totalRoundTimeSec}s</div>
            </div>

            <div className="vt-metric-box highlight-orange">
              <label>Reversal Mistake Taps</label>
              <div className="val">{roundSummary.reversalMistakes}</div>
              <small style={{ color: '#64748b', fontSize: '0.7rem' }}>Mirror Reversals (b/d, p/q)</small>
            </div>

            <div className="vt-metric-box highlight-purple">
              <label>Random Distractor Taps</label>
              <div className="val">{roundSummary.randomMistakes}</div>
              <small style={{ color: '#64748b', fontSize: '0.7rem' }}>Other Letters</small>
            </div>
          </div>

          <div className="vt-btn-row">
            <button className="vt-btn-primary" onClick={handleNextRound}>
              {roundNumber < maxRounds ? 'Next Round ➔' : 'Play Again 🔄'}
            </button>
            <button className="vt-btn-secondary" onClick={() => setLevel(prev => (prev % 3) + 1)}>
              Change Level ({level})
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
