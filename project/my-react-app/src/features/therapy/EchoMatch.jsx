import React, { useState, useEffect, useRef } from 'react';
import { speakHumanText } from './humanVoiceEngine';
import './AuditoryProcessingSuite.css';

// ── SOUND PAIRS & MINIMAL PAIR CONTRASTS ──
const MINIMAL_PAIRS_VOICING = [
  ['ba', 'pa'],
  ['da', 'ta'],
  ['ga', 'ka']
];

const MINIMAL_PAIRS_PLACE = [
  ['ba', 'da'],
  ['pa', 'ta']
];

const EASY_DISTINCT_PAIRS = [
  ['ba', 'ma'],
  ['da', 'na'],
  ['ka', 'sa']
];

const SAME_PAIRS = [
  ['ba', 'ba'],
  ['da', 'da'],
  ['pa', 'pa'],
  ['ta', 'ta'],
  ['ga', 'ga'],
  ['ka', 'ka'],
  ['ma', 'ma'],
  ['na', 'na']
];

export default function EchoMatch({ onCompleteRound, initialLevel = 1 }) {
  const [level, setLevel] = useState(initialLevel);
  const [rounds, setRounds] = useState([]);
  const [currentRoundIdx, setCurrentRoundIdx] = useState(0);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [hasPlayedAudio, setHasPlayedAudio] = useState(false);
  const [replaysThisRound, setReplaysThisRound] = useState(0);
  const [answerState, setAnswerState] = useState(null); // null | 'correct' | 'incorrect'
  const [selectedAnswer, setSelectedAnswer] = useState(null); // 'Same' | 'Different'
  const [score, setScore] = useState(0);
  const [totalStars, setTotalStars] = useState(0);
  const [roundTelemetry, setRoundTelemetry] = useState([]);
  const [isFinished, setIsFinished] = useState(false);
  const roundStartTimeRef = useRef(Date.now());

  // Level configuration mapping
  const getLevelConfig = (lvl) => {
    switch (lvl) {
      case 1:
        return { gapMs: 1000, speechRate: 0.8, name: 'Level 1: Gentle Gap (1000ms)' };
      case 2:
        return { gapMs: 800, speechRate: 0.9, name: 'Level 2: Standard Gap (800ms)' };
      case 3:
      default:
        return { gapMs: 500, speechRate: 1.05, name: 'Level 3: Rapid Processing (500ms)' };
    }
  };

  const currentConfig = getLevelConfig(level);

  // Generate 8 randomized rounds for a session
  const generateRounds = (currentLvl) => {
    const roundList = [];
    // 4 Same rounds, 4 Different rounds
    const sameChoices = [...SAME_PAIRS].sort(() => 0.5 - Math.random());
    for (let i = 0; i < 4; i++) {
      roundList.push({
        pair: sameChoices[i % sameChoices.length],
        isSame: true
      });
    }

    let poolOfDifferent = [];
    if (currentLvl === 1) {
      poolOfDifferent = [...EASY_DISTINCT_PAIRS, ...MINIMAL_PAIRS_VOICING, ...MINIMAL_PAIRS_PLACE];
    } else {
      poolOfDifferent = [...MINIMAL_PAIRS_VOICING, ...MINIMAL_PAIRS_PLACE];
    }
    poolOfDifferent.sort(() => 0.5 - Math.random());

    for (let i = 0; i < 4; i++) {
      roundList.push({
        pair: poolOfDifferent[i % poolOfDifferent.length],
        isSame: false
      });
    }

    // Shuffle the 8 rounds
    return roundList.sort(() => 0.5 - Math.random());
  };

  // Initialize session
  useEffect(() => {
    const newRounds = generateRounds(level);
    setRounds(newRounds);
    setCurrentRoundIdx(0);
    setScore(0);
    setTotalStars(0);
    setRoundTelemetry([]);
    setIsFinished(false);
    setHasPlayedAudio(false);
    setReplaysThisRound(0);
    setAnswerState(null);
    setSelectedAnswer(null);
  }, [level]);

  // Read instructions on mount or round start
  useEffect(() => {
    roundStartTimeRef.current = Date.now();
  }, [currentRoundIdx]);

  const currentRound = rounds[currentRoundIdx] || { pair: ['ba', 'ba'], isSame: true };

  // Trigger audio playback for the 2 sounds
  const playSoundPair = (isReplay = false) => {
    if (isPlayingAudio) return;

    if (isReplay) {
      setReplaysThisRound((prev) => prev + 1);
    }

    setIsPlayingAudio(true);
    setAnswerState(null);
    setSelectedAnswer(null);

    const [s1, s2] = currentRound.pair;
    const rate = currentConfig.speechRate;
    const gap = currentConfig.gapMs;

    // Speak sound 1
    speakHumanText(s1, {
      rate: rate,
      pitch: 1.0,
      onend: () => {
        // Pause gap between sounds
        setTimeout(() => {
          // Speak sound 2
          speakHumanText(s2, {
            rate: rate,
            pitch: 1.0,
            onend: () => {
              setIsPlayingAudio(false);
              setHasPlayedAudio(true);
            },
            onerror: () => {
              setIsPlayingAudio(false);
              setHasPlayedAudio(true);
            }
          });
        }, gap);
      },
      onerror: () => {
        setIsPlayingAudio(false);
        setHasPlayedAudio(true);
      }
    });
  };

  // Handle Same / Different Choice
  const handleAnswer = (choice) => {
    if (isPlayingAudio || answerState !== null) return;

    const responseLatency = Date.now() - roundStartTimeRef.current;
    const isCorrect = (choice === 'Same' && currentRound.isSame) || (choice === 'Different' && !currentRound.isSame);

    setSelectedAnswer(choice);
    setAnswerState(isCorrect ? 'correct' : 'incorrect');

    const newScore = isCorrect ? score + 1 : score;
    const starsEarned = isCorrect ? (replaysThisRound === 0 ? 3 : 2) : 0;
    const newStars = totalStars + starsEarned;

    if (isCorrect) {
      setScore(newScore);
      setTotalStars(newStars);
      speakHumanText('Great ear! That is correct!', { rate: 1.1 });
    } else {
      const actualText = currentRound.isSame ? 'Same' : 'Different';
      speakHumanText(`Nice try! Those sounds were actually ${actualText}.`, { rate: 1.0 });
    }

    const telemetryEntry = {
      round: currentRoundIdx + 1,
      soundPair: `${currentRound.pair[0]} / ${currentRound.pair[1]}`,
      isSamePair: currentRound.isSame,
      userAnswer: choice,
      isCorrect: isCorrect,
      responseTimeMs: responseLatency,
      replayCount: replaysThisRound,
      difficultyLevel: level
    };

    const updatedTelemetry = [...roundTelemetry, telemetryEntry];
    setRoundTelemetry(updatedTelemetry);

    // Transition to next round after short delay
    setTimeout(() => {
      if (currentRoundIdx < rounds.length - 1) {
        setCurrentRoundIdx(currentRoundIdx + 1);
        setHasPlayedAudio(false);
        setReplaysThisRound(0);
        setAnswerState(null);
        setSelectedAnswer(null);
      } else {
        // Session Finished
        setIsFinished(true);
        const accuracyPct = Math.round((newScore / rounds.length) * 100);
        if (onCompleteRound) {
          onCompleteRound({
            game: 'Echo Match',
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

  const resetSession = () => {
    setRounds(generateRounds(level));
    setCurrentRoundIdx(0);
    setScore(0);
    setTotalStars(0);
    setRoundTelemetry([]);
    setIsFinished(false);
    setHasPlayedAudio(false);
    setReplaysThisRound(0);
    setAnswerState(null);
    setSelectedAnswer(null);
  };

  return (
    <div className="ap-game-arena">
      {/* Sparky Mascot Banner */}
      <div className="ap-sparky-banner">
        <div className="ap-sparky-avatar">🦊</div>
        <div>
          <div className="ap-sparky-title">Sparky's Sound Challenge</div>
          <p className="ap-sparky-instruction">
            "Listen carefully! Are these two sounds the same, or different?"
          </p>
        </div>
      </div>

      {/* Header Status Bar */}
      <div className="ap-status-bar">
        <div className="ap-status-pill">
          <span>🎯</span> Round {currentRoundIdx + 1} of 8
        </div>
        <div className="ap-status-pill">
          <span>⚡</span> {currentConfig.name}
        </div>
        <div className="ap-status-pill">
          <span>⭐</span> Stars: {totalStars}
        </div>
      </div>

      {!isFinished ? (
        <>
          {/* Echo Sound Stage */}
          <div className="echo-sound-stage">
            <div className={`echo-audio-pulse-ring ${isPlayingAudio ? 'is-playing' : ''}`}>
              {isPlayingAudio ? '🔊' : '🎧'}
            </div>

            {!hasPlayedAudio && !isPlayingAudio ? (
              <button className="echo-play-sound-btn" onClick={() => playSoundPair(false)}>
                <span>▶</span> Play Sounds
              </button>
            ) : isPlayingAudio ? (
              <p style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#a78bfa' }}>
                Listening to Sound Pair...
              </p>
            ) : (
              <div>
                <p style={{ margin: '0 0 6px 0', fontSize: '1.1rem', fontWeight: 800, color: '#e2e8f0' }}>
                  Sounds Played! Make your pick below:
                </p>
                <button className="echo-hear-again-btn" onClick={() => playSoundPair(true)}>
                  <span>🔄</span> Hear Again ({replaysThisRound} used)
                </button>
              </div>
            )}
          </div>

          {/* Same / Different Tactile Choice Buttons */}
          <div className="echo-answers-grid">
            <button
              className={`echo-answer-btn same-btn ${
                selectedAnswer === 'Same'
                  ? answerState === 'correct'
                    ? 'correct-choice'
                    : 'wrong-choice'
                  : answerState === 'incorrect' && currentRound.isSame
                  ? 'correct-choice'
                  : ''
              }`}
              onClick={() => handleAnswer('Same')}
              disabled={!hasPlayedAudio || isPlayingAudio || answerState !== null}
            >
              <span>=</span>
              <span>Same</span>
            </button>

            <button
              className={`echo-answer-btn different-btn ${
                selectedAnswer === 'Different'
                  ? answerState === 'correct'
                    ? 'correct-choice'
                    : 'wrong-choice'
                  : answerState === 'incorrect' && !currentRound.isSame
                  ? 'correct-choice'
                  : ''
              }`}
              onClick={() => handleAnswer('Different')}
              disabled={!hasPlayedAudio || isPlayingAudio || answerState !== null}
            >
              <span>≠</span>
              <span>Different</span>
            </button>
          </div>
        </>
      ) : (
        /* Completion Summary Card */
        <div className="ap-summary-card">
          <div className="ap-summary-trophy">🎧✨</div>
          <h2 className="ap-summary-title">Echo Match Completed!</h2>
          <p className="ap-summary-subtitle">
            You scored {score} out of 8 correct on {currentConfig.name}!
          </p>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '12px',
              margin: '1.5rem 0',
              background: '#f8fafc',
              padding: '1rem',
              borderRadius: '16px',
              border: '1.5px solid #e2e8f0'
            }}
          >
            <div>
              <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#8b5cf6' }}>
                {Math.round((score / rounds.length) * 100)}%
              </div>
              <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 700 }}>Accuracy</div>
            </div>

            <div>
              <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#f59e0b' }}>
                {totalStars}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 700 }}>Stars</div>
            </div>

            <div>
              <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#06b6d4' }}>
                {roundTelemetry.reduce((acc, curr) => acc + curr.replayCount, 0)}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 700 }}>Replays</div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={resetSession}
              style={{
                background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
                color: '#fff',
                border: 'none',
                borderRadius: '20px',
                padding: '12px 24px',
                fontWeight: 800,
                cursor: 'pointer'
              }}
            >
              🔄 Play Again
            </button>

            {level < 3 && (
              <button
                onClick={() => setLevel(level + 1)}
                style={{
                  background: 'linear-gradient(135deg, #06b6d4, #0891b2)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '20px',
                  padding: '12px 24px',
                  fontWeight: 800,
                  cursor: 'pointer'
                }}
              >
                ⚡ Level {level + 1} →
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
