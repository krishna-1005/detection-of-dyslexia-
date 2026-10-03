import React, { useState, useEffect, useRef, useCallback } from 'react';
import { speakHumanText } from './humanVoiceEngine';
import './AuditoryProcessingSuite.css';

// ── FULL-WORD MINIMAL PAIR CONTRASTS ──
// Words that differ by just one sound — speech synthesis says the whole word

const MINIMAL_PAIRS_VOICING = [
  ['bat', 'pat'], ['big', 'pig'], ['bear', 'pear'],
  ['dip', 'tip'], ['den', 'ten'], ['dot', 'tot'],
  ['goat', 'coat'], ['gap', 'cap'], ['gate', 'Kate']
];

const MINIMAL_PAIRS_PLACE = [
  ['bat', 'mat'], ['pin', 'tin'], ['fan', 'van'],
  ['map', 'nap'], ['pet', 'net'], ['cap', 'tap']
];

const EASY_DISTINCT_PAIRS = [
  ['ball', 'fish'], ['sun', 'dog'], ['cat', 'moon'],
  ['tree', 'milk'], ['hat', 'ring'], ['frog', 'cake'],
  ['bird', 'lamp'], ['star', 'cup'], ['shoe', 'leaf']
];

const SAME_PAIRS = [
  ['cat', 'cat'], ['dog', 'dog'], ['sun', 'sun'], ['hat', 'hat'],
  ['ball', 'ball'], ['fish', 'fish'], ['tree', 'tree'], ['moon', 'moon'],
  ['star', 'star'], ['cup', 'cup'], ['ring', 'ring'], ['cake', 'cake'],
  ['frog', 'frog'], ['bird', 'bird'], ['lamp', 'lamp'], ['shoe', 'shoe']
];

// Fixed instruction — never dynamically concatenated
const ROUND_INSTRUCTION = 'Tap both words. Do they sound the same?';

export default function CopyCatEcho({ onCompleteRound, initialLevel = 1 }) {
  const [level, setLevel] = useState(initialLevel);
  const [rounds, setRounds] = useState([]);
  const [currentRoundIdx, setCurrentRoundIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [totalStars, setTotalStars] = useState(0);
  const [roundTelemetry, setRoundTelemetry] = useState([]);
  const [isFinished, setIsFinished] = useState(false);

  // Per-round state
  const [sound1Playing, setSound1Playing] = useState(false);
  const [sound2Playing, setSound2Playing] = useState(false);
  const [sound1Heard, setSound1Heard] = useState(false);
  const [sound2Heard, setSound2Heard] = useState(false);
  const [sound1Replays, setSound1Replays] = useState(0);
  const [sound2Replays, setSound2Replays] = useState(0);
  const [answerState, setAnswerState] = useState(null);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [instructionSpoken, setInstructionSpoken] = useState(false);

  // Latency tracking: starts when BOTH sounds have been heard at least once
  const bothHeardTimeRef = useRef(null);

  const bothHeard = sound1Heard && sound2Heard;
  const answersUnlocked = bothHeard && answerState === null;

  // Level config: controls pronunciation pace (not gap timing)
  const getLevelConfig = useCallback((lvl) => {
    switch (lvl) {
      case 1: return { speechRate: 0.75, name: 'Level 1: Slow & Clear' };
      case 2: return { speechRate: 0.9, name: 'Level 2: Natural Pace' };
      case 3: default: return { speechRate: 1.1, name: 'Level 3: Quick Sounds' };
    }
  }, []);

  const currentConfig = getLevelConfig(level);

  // Generate 8 randomised rounds
  const generateRounds = useCallback((currentLvl) => {
    const roundList = [];
    const samePool = [...SAME_PAIRS].sort(() => 0.5 - Math.random());
    for (let i = 0; i < 4; i++) {
      roundList.push({ pair: samePool[i % samePool.length], isSame: true });
    }
    let diffPool = currentLvl === 1
      ? [...EASY_DISTINCT_PAIRS, ...MINIMAL_PAIRS_VOICING, ...MINIMAL_PAIRS_PLACE]
      : [...MINIMAL_PAIRS_VOICING, ...MINIMAL_PAIRS_PLACE];
    diffPool.sort(() => 0.5 - Math.random());
    for (let i = 0; i < 4; i++) {
      roundList.push({ pair: diffPool[i % diffPool.length], isSame: false });
    }
    return roundList.sort(() => 0.5 - Math.random());
  }, []);

  // Initialise / reset session
  const resetSession = useCallback(() => {
    const newRounds = generateRounds(level);
    setRounds(newRounds);
    setCurrentRoundIdx(0);
    setScore(0);
    setTotalStars(0);
    setRoundTelemetry([]);
    setIsFinished(false);
    resetRoundState();
  }, [level, generateRounds]);

  const resetRoundState = () => {
    setSound1Playing(false);
    setSound2Playing(false);
    setSound1Heard(false);
    setSound2Heard(false);
    setSound1Replays(0);
    setSound2Replays(0);
    setAnswerState(null);
    setSelectedAnswer(null);
    setInstructionSpoken(false);
    bothHeardTimeRef.current = null;
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { resetSession(); }, [level]);

  // Speak fixed instruction once at the start of each round
  useEffect(() => {
    if (!instructionSpoken && rounds.length > 0 && !isFinished) {
      setInstructionSpoken(true);
      speakHumanText(ROUND_INSTRUCTION, { rate: 0.85 });
    }
  }, [currentRoundIdx, instructionSpoken, rounds.length, isFinished]);

  // Record the moment both sounds have been heard
  useEffect(() => {
    if (sound1Heard && sound2Heard && bothHeardTimeRef.current === null) {
      bothHeardTimeRef.current = Date.now();
    }
  }, [sound1Heard, sound2Heard]);

  const currentRound = rounds[currentRoundIdx] || { pair: ['cat', 'cat'], isSame: true };

  // ── Individual sound playback ──
  const playSound1 = () => {
    if (sound1Playing || sound2Playing || answerState !== null) return;
    if (sound1Heard) setSound1Replays((prev) => prev + 1);
    setSound1Playing(true);
    speakHumanText(currentRound.pair[0], {
      rate: currentConfig.speechRate,
      onend: () => { setSound1Playing(false); setSound1Heard(true); },
      onerror: () => { setSound1Playing(false); setSound1Heard(true); }
    });
  };

  const playSound2 = () => {
    if (sound1Playing || sound2Playing || answerState !== null) return;
    if (sound2Heard) setSound2Replays((prev) => prev + 1);
    setSound2Playing(true);
    speakHumanText(currentRound.pair[1], {
      rate: currentConfig.speechRate,
      onend: () => { setSound2Playing(false); setSound2Heard(true); },
      onerror: () => { setSound2Playing(false); setSound2Heard(true); }
    });
  };

  // ── Answer handler ──
  const handleAnswer = (choice) => {
    if (!answersUnlocked) return;
    const isCorrect = (choice === 'Same' && currentRound.isSame) || (choice === 'Different' && !currentRound.isSame);
    const responseLatency = bothHeardTimeRef.current ? Date.now() - bothHeardTimeRef.current : 0;

    setSelectedAnswer(choice);
    setAnswerState(isCorrect ? 'correct' : 'incorrect');

    const newScore = isCorrect ? score + 1 : score;
    const totalReplays = sound1Replays + sound2Replays;
    const starsEarned = isCorrect ? (totalReplays === 0 ? 3 : 2) : 0;
    const newStars = totalStars + starsEarned;

    if (isCorrect) {
      setScore(newScore);
      setTotalStars(newStars);
      speakHumanText('Great ear!', { rate: 1.0 });
    } else {
      const actual = currentRound.isSame ? 'same' : 'different';
      speakHumanText('Nice try! They were ' + actual + '.', { rate: 0.95 });
    }

    const entry = {
      round: currentRoundIdx + 1,
      soundPair: currentRound.pair[0] + ' / ' + currentRound.pair[1],
      isSamePair: currentRound.isSame,
      userAnswer: choice,
      isCorrect: isCorrect,
      responseTimeMs: responseLatency,
      replayCount: totalReplays,
      sound1Replays: sound1Replays,
      sound2Replays: sound2Replays,
      difficultyLevel: level
    };
    const updatedTelemetry = [...roundTelemetry, entry];
    setRoundTelemetry(updatedTelemetry);

    setTimeout(() => {
      if (currentRoundIdx < rounds.length - 1) {
        setCurrentRoundIdx(currentRoundIdx + 1);
        resetRoundState();
      } else {
        setIsFinished(true);
        const accuracyPct = Math.round((newScore / rounds.length) * 100);
        if (onCompleteRound) {
          onCompleteRound({
            game: 'Copy Cat Echo',
            level: level,
            score: newScore,
            totalRounds: rounds.length,
            accuracyPct: accuracyPct,
            stars: newStars,
            telemetry: updatedTelemetry
          });
        }
      }
    }, 1600);
  };

  // ── Styles (all camelCase, no CSS-hyphen keys) ──
  const soundBtnBase = {
    width: '100%',
    borderRadius: '20px',
    padding: '1.5rem 1.25rem',
    fontSize: '1.3rem',
    fontWeight: 800,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    transition: 'all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
    border: '3px solid transparent',
    position: 'relative',
    overflow: 'hidden'
  };

  const getSoundBtnStyle = (isPlaying, isHeard, idx) => {
    const baseColor = idx === 1 ? '#8b5cf6' : '#06b6d4';
    const lightBg = idx === 1
      ? 'linear-gradient(135deg, #ede9fe 0%, #ddd6fe 100%)'
      : 'linear-gradient(135deg, #ecfeff 0%, #cffafe 100%)';
    const playingBg = idx === 1
      ? 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)'
      : 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)';

    if (isPlaying) {
      return {
        ...soundBtnBase,
        background: playingBg,
        borderColor: baseColor,
        color: '#ffffff',
        transform: 'scale(1.04)',
        boxShadow: '0 0 30px ' + baseColor + '66'
      };
    }
    if (isHeard) {
      return {
        ...soundBtnBase,
        background: lightBg,
        borderColor: baseColor,
        color: idx === 1 ? '#5b21b6' : '#0e7490',
        boxShadow: '0 4px 15px rgba(0,0,0,0.06)'
      };
    }
    return {
      ...soundBtnBase,
      background: '#ffffff',
      borderColor: '#e2e8f0',
      color: '#475569',
      boxShadow: '0 4px 12px rgba(0,0,0,0.04)'
    };
  };

  const answerBtnStyle = (type) => {
    const isActive = answersUnlocked;
    const base = {
      borderRadius: '24px',
      padding: '1.5rem 1.25rem',
      fontSize: '1.5rem',
      fontWeight: 900,
      cursor: isActive ? 'pointer' : 'default',
      textAlign: 'center',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px',
      border: '3.5px solid transparent',
      transition: 'all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
      opacity: isActive ? 1 : 0.4,
      filter: isActive ? 'none' : 'grayscale(0.6)',
      transform: isActive ? 'scale(1)' : 'scale(0.97)'
    };

    if (type === 'Same') {
      return {
        ...base,
        background: isActive
          ? 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)'
          : '#f8fafc',
        borderColor: isActive ? '#22c55e' : '#cbd5e1',
        color: isActive ? '#15803d' : '#94a3b8',
        boxShadow: isActive ? '0 8px 20px rgba(34, 197, 94, 0.15)' : 'none'
      };
    }
    return {
      ...base,
      background: isActive
        ? 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)'
        : '#f8fafc',
      borderColor: isActive ? '#ef4444' : '#cbd5e1',
      color: isActive ? '#b91c1c' : '#94a3b8',
      boxShadow: isActive ? '0 8px 20px rgba(239, 68, 68, 0.15)' : 'none'
    };
  };

  const getAnswerClass = (type) => {
    const btnType = type === 'Same' ? 'same-btn' : 'different-btn';
    if (selectedAnswer === type) {
      return 'echo-answer-btn ' + btnType + ' ' + (answerState === 'correct' ? 'correct-choice' : 'wrong-choice');
    }
    if (answerState === 'incorrect') {
      const correctType = currentRound.isSame ? 'Same' : 'Different';
      if (type === correctType) return 'echo-answer-btn ' + btnType + ' correct-choice';
    }
    return 'echo-answer-btn ' + btnType;
  };

  // ── RENDER ──
  if (isFinished) {
    const totalReplays = roundTelemetry.reduce((a, c) => a + c.replayCount, 0);
    return (
      <div className="ap-game-arena">
        <div className="ap-summary-card">
          <div className="ap-summary-trophy">🐱✨</div>
          <h2 className="ap-summary-title">Copy Cat Echo Complete!</h2>
          <p className="ap-summary-subtitle">
            You scored {score} out of 8 correct on {currentConfig.name}!
          </p>
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px',
            margin: '1.5rem 0', background: '#f8fafc', padding: '1rem',
            borderRadius: '16px', border: '1.5px solid #e2e8f0'
          }}>
            <div>
              <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#8b5cf6' }}>
                {rounds.length > 0 ? Math.round((score / rounds.length) * 100) : 0}%
              </div>
              <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 700 }}>Accuracy</div>
            </div>
            <div>
              <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#f59e0b' }}>{totalStars}</div>
              <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 700 }}>Stars</div>
            </div>
            <div>
              <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#06b6d4' }}>{totalReplays}</div>
              <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 700 }}>Replays</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={resetSession} style={{
              background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)', color: '#fff',
              border: 'none', borderRadius: '20px', padding: '12px 24px', fontWeight: 800, cursor: 'pointer'
            }}>
              🔄 Play Again
            </button>
            {level < 3 && (
              <button onClick={() => setLevel(level + 1)} style={{
                background: 'linear-gradient(135deg, #06b6d4, #0891b2)', color: '#fff',
                border: 'none', borderRadius: '20px', padding: '12px 24px', fontWeight: 800, cursor: 'pointer'
              }}>
                ⚡ Level {level + 1} →
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="ap-game-arena">
      {/* Mascot Banner */}
      <div className="ap-sparky-banner" style={{ borderColor: '#8b5cf6', background: 'linear-gradient(135deg, #ede9fe 0%, #ddd6fe 100%)' }}>
        <div className="ap-sparky-avatar" style={{ borderColor: '#8b5cf6' }}>🐱</div>
        <div>
          <div className="ap-sparky-title" style={{ color: '#6d28d9' }}>Copy Cat Echo</div>
          <p className="ap-sparky-instruction" style={{ color: '#4c1d95' }}>
            {ROUND_INSTRUCTION}
          </p>
        </div>
      </div>

      {/* Status Bar */}
      <div className="ap-status-bar">
        <div className="ap-status-pill"><span>🎯</span> Round {currentRoundIdx + 1} of 8</div>
        <div className="ap-status-pill"><span>⚡</span> {currentConfig.name}</div>
        <div className="ap-status-pill"><span>⭐</span> Stars: {totalStars}</div>
      </div>

      {/* Sound Stage: Two independent buttons */}
      <div className="echo-sound-stage" style={{ minHeight: '200px', gap: '1.25rem' }}>
        <p style={{ margin: '0 0 0.5rem 0', fontSize: '1rem', fontWeight: 700, color: '#a78bfa', letterSpacing: '0.03em' }}>
          Tap each word, then decide below
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', width: '100%', maxWidth: '500px' }}>
          {/* Sound 1 Button */}
          <button
            style={getSoundBtnStyle(sound1Playing, sound1Heard, 1)}
            onClick={playSound1}
            disabled={sound1Playing || sound2Playing || answerState !== null}
          >
            <span style={{ fontSize: '1.8rem' }}>{sound1Playing ? '🔊' : (sound1Heard ? '✅' : '🔈')}</span>
            <span>Word 1</span>
            {sound1Replays > 0 && (
              <span style={{ fontSize: '0.7rem', opacity: 0.7 }}>({sound1Replays}x)</span>
            )}
          </button>

          {/* Word 2 Button */}
          <button
            style={getSoundBtnStyle(sound2Playing, sound2Heard, 2)}
            onClick={playSound2}
            disabled={sound1Playing || sound2Playing || answerState !== null}
          >
            <span style={{ fontSize: '1.8rem' }}>{sound2Playing ? '🔊' : (sound2Heard ? '✅' : '🔈')}</span>
            <span>Word 2</span>
            {sound2Replays > 0 && (
              <span style={{ fontSize: '0.7rem', opacity: 0.7 }}>({sound2Replays}x)</span>
            )}
          </button>
        </div>

        {/* Readiness indicator */}
        {!bothHeard && !sound1Playing && !sound2Playing && (
          <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.85rem', color: '#94a3b8', fontWeight: 600 }}>
            {!sound1Heard && !sound2Heard
              ? 'Tap Word 1 or Word 2 to listen'
              : sound1Heard ? 'Now tap Word 2' : 'Now tap Word 1'}
          </p>
        )}
        {bothHeard && answerState === null && (
          <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.95rem', color: '#22c55e', fontWeight: 800 }}>
            ✅ Both words heard — pick your answer!
          </p>
        )}
      </div>

      {/* Same / Different answer buttons */}
      <div className="echo-answers-grid">
        <button
          className={getAnswerClass('Same')}
          style={answerState === null ? answerBtnStyle('Same') : undefined}
          onClick={() => handleAnswer('Same')}
          disabled={!answersUnlocked}
        >
          <span style={{ fontSize: '2rem' }}>👯</span>
          <span>Same</span>
        </button>

        <button
          className={getAnswerClass('Different')}
          style={answerState === null ? answerBtnStyle('Different') : undefined}
          onClick={() => handleAnswer('Different')}
          disabled={!answersUnlocked}
        >
          <span style={{ fontSize: '2rem' }}>🔀</span>
          <span>Different</span>
        </button>
      </div>
    </div>
  );
}
