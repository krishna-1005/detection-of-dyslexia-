import React, { useState, useEffect } from 'react';
import { speakHumanText } from './humanVoiceEngine';
import './AuditoryProcessingSuite.css';

const AUDITORY_TARGET_POOL = [
  { target: 'B', options: ['Ball', 'Dog', 'Cat', 'Fish'], correct: 'Ball' },
  { target: 'S', options: ['Sun', 'Moon', 'Star', 'Cloud'], correct: 'Sun' },
  { target: 'M', options: ['Apple', 'Milk', 'Bread', 'Egg'], correct: 'Milk' },
  { target: 'P', options: ['Pencil', 'Table', 'Book', 'Chair'], correct: 'Pencil' },
  { target: 'T', options: ['Tiger', 'Lion', 'Bear', 'Monkey'], correct: 'Tiger' },
  { target: 'D', options: ['Drum', 'Guitar', 'Piano', 'Flute'], correct: 'Drum' },
  { target: 'F', options: ['Feather', 'Rock', 'Stone', 'Wood'], correct: 'Feather' },
  { target: 'V', options: ['Violin', 'Harp', 'Organ', 'Trumpet'], correct: 'Violin' },
  { target: 'K', options: ['Kite', 'Plane', 'Train', 'Car'], correct: 'Kite' },
  { target: 'G', options: ['Garden', 'Forest', 'Desert', 'River'], correct: 'Garden' },
  { target: 'R', options: ['Rainbow', 'Cloud', 'Storm', 'Snow'], correct: 'Rainbow' },
  { target: 'L', options: ['Lemon', 'Orange', 'Grape', 'Peach'], correct: 'Lemon' },
  { target: 'N', options: ['Nest', 'Tree', 'Leaf', 'Branch'], correct: 'Nest' },
  { target: 'W', options: ['Water', 'Fire', 'Air', 'Earth'], correct: 'Water' },
  { target: 'H', options: ['House', 'Road', 'Path', 'Bridge'], correct: 'House' },
  { target: 'CH', options: ['Chair', 'Desk', 'Table', 'Bench'], correct: 'Chair' },
  { target: 'SH', options: ['Shark', 'Fish', 'Whale', 'Dolphin'], correct: 'Shark' },
  { target: 'TH', options: ['Thumb', 'Hand', 'Foot', 'Finger'], correct: 'Thumb' }
];

export default function AuditorySoundShield({ onCompleteRound }) {
  const [tasks, setTasks] = useState([]);
  const [currentTaskIdx, setCurrentTaskIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [totalStars, setTotalStars] = useState(0);
  const [selectedWord, setSelectedWord] = useState(null);
  const [answerState, setAnswerState] = useState(null);
  const [isFinished, setIsFinished] = useState(false);
  const [telemetry, setTelemetry] = useState([]);

  const generate8Tasks = () => {
    const shuffled = [...AUDITORY_TARGET_POOL].sort(() => 0.5 - Math.random()).slice(0, 8);
    return shuffled.map((item) => ({
      ...item,
      options: [...item.options].sort(() => 0.5 - Math.random())
    }));
  };

  useEffect(() => {
    resetSession();
  }, []);

  const resetSession = () => {
    const newTasks = generate8Tasks();
    setTasks(newTasks);
    setCurrentTaskIdx(0);
    setScore(0);
    setTotalStars(0);
    setSelectedWord(null);
    setAnswerState(null);
    setIsFinished(false);
    setTelemetry([]);
  };

  const playSound = (word) => {
    speakHumanText(word, { rate: 0.9, pitch: 1.0 });
  };

  const currentTask = tasks[currentTaskIdx] || { target: 'B', options: ['Ball', 'Dog'], correct: 'Ball' };

  const handleChoice = (word) => {
    if (answerState !== null) return;

    const isCorrect = word === currentTask.correct;
    setSelectedWord(word);
    setAnswerState(isCorrect ? 'correct' : 'incorrect');

    const newScore = isCorrect ? score + 1 : score;
    const starsEarned = isCorrect ? 3 : 0;
    const newStars = totalStars + starsEarned;

    if (isCorrect) {
      setScore(newScore);
      setTotalStars(newStars);
      speakHumanText(`Awesome! ${word} starts with ${currentTask.target}!`, { rate: 1.0 });
    } else {
      speakHumanText(`Good try! ${currentTask.correct} starts with ${currentTask.target}.`, { rate: 1.0 });
    }

    const roundData = {
      round: currentTaskIdx + 1,
      targetSound: currentTask.target,
      userChoice: word,
      correctWord: currentTask.correct,
      isCorrect: isCorrect
    };
    const updatedTelemetry = [...telemetry, roundData];
    setTelemetry(updatedTelemetry);

    setTimeout(() => {
      if (currentTaskIdx < tasks.length - 1) {
        setCurrentTaskIdx(currentTaskIdx + 1);
        setSelectedWord(null);
        setAnswerState(null);
      } else {
        setIsFinished(true);
        const accuracyPct = Math.round((newScore / tasks.length) * 100);
        if (onCompleteRound) {
          onCompleteRound({
            game: 'Sound Shield',
            score: newScore,
            totalRounds: tasks.length,
            accuracyPct: accuracyPct,
            stars: newStars,
            telemetry: updatedTelemetry
          });
        }
      }
    }, 1500);
  };

  const iconCircleStyle = {
    width: '75px',
    height: '75px',
    borderRadius: '50%',
    background: 'rgba(245, 158, 11, 0.2)',
    border: '3px solid #f59e0b',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '2.5rem',
    color: '#f59e0b',
    marginBottom: '0.75rem'
  };

  const targetStageStyle = {
    minHeight: '190px',
    border: '3px solid #f59e0b'
  };

  const playBtnStyle = {
    background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
  };

  const gridStyle = {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '16px',
    maxWidth: '650px',
    margin: '0 auto'
  };

  return (
    <div className="ap-game-arena">
      <div className="ap-sparky-banner">
        <div className="ap-sparky-avatar">🛡️</div>
        <div>
          <div className="ap-sparky-title">Sound Shield Protection</div>
          <p className="ap-sparky-instruction">
            Listen carefully! Which word begins with the target sound <strong>&quot;{currentTask.target}&quot;</strong>?
          </p>
        </div>
      </div>

      <div className="ap-status-bar">
        <div className="ap-status-pill">
          <span>🎯</span> Round {currentTaskIdx + 1} of 8
        </div>
        <div className="ap-status-pill">
          <span>🔊</span> Target: &quot;{currentTask.target}&quot;
        </div>
        <div className="ap-status-pill">
          <span>⭐</span> Stars: {totalStars}
        </div>
      </div>

      {!isFinished ? (
        <>
          <div className="echo-sound-stage" style={targetStageStyle}>
            <div style={iconCircleStyle}>
              🎧
            </div>
            <button
              className="echo-play-sound-btn"
              style={playBtnStyle}
              onClick={() => playSound(currentTask.target)}
            >
              <span>🔊</span> Play Initial Sound (&quot;{currentTask.target}&quot;)
            </button>
          </div>

          <div style={gridStyle}>
            {currentTask.options.map((word) => {
              const isSelected = selectedWord === word;
              const isTargetCorrect = word === currentTask.correct;

              let btnStyle = {
                background: '#ffffff',
                border: '3px solid #cbd5e1',
                borderRadius: '20px',
                padding: '1.25rem 1rem',
                fontSize: '1.4rem',
                fontWeight: '800',
                color: '#1e293b',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
                transition: 'all 0.2s ease'
              };

              if (isSelected) {
                if (answerState === 'correct') {
                  btnStyle.background = '#dcfce7';
                  btnStyle.borderColor = '#22c55e';
                  btnStyle.color = '#15803d';
                } else if (answerState === 'incorrect') {
                  btnStyle.background = '#fee2e2';
                  btnStyle.borderColor = '#ef4444';
                  btnStyle.color = '#b91c1c';
                }
              } else if (answerState === 'incorrect' && isTargetCorrect) {
                btnStyle.background = '#dcfce7';
                btnStyle.borderColor = '#22c55e';
                btnStyle.color = '#15803d';
              }

              return (
                <button
                  key={word}
                  style={btnStyle}
                  onClick={() => handleChoice(word)}
                  disabled={answerState !== null}
                >
                  <span>{word}</span>
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      playSound(word);
                    }}
                    style={{
                      fontSize: '1.1rem',
                      opacity: 0.8,
                      padding: '4px',
                      borderRadius: '50%',
                      background: 'rgba(0,0,0,0.05)'
                    }}
                    title="Listen to word"
                  >
                    🔊
                  </span>
                </button>
              );
            })}
          </div>
        </>
      ) : (
        <div className="ap-summary-card">
          <div className="ap-summary-trophy">🛡️⭐</div>
          <h2 className="ap-summary-title">Sound Shield Complete!</h2>
          <p className="ap-summary-subtitle">
            You accurately identified {score} out of 8 initial sound targets!
          </p>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '12px',
              margin: '1.5rem 0',
              background: '#f8fafc',
              padding: '1rem',
              borderRadius: '16px',
              border: '1.5px solid #e2e8f0'
            }}
          >
            <div>
              <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#f59e0b' }}>
                {Math.round((score / tasks.length) * 100)}%
              </div>
              <div style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 700 }}>Accuracy</div>
            </div>

            <div>
              <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#22c55e' }}>
                {totalStars}
              </div>
              <div style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 700 }}>Stars Earned</div>
            </div>
          </div>

          <button
            onClick={resetSession}
            style={{
              background: 'linear-gradient(135deg, #f59e0b, #d97706)',
              color: '#fff',
              border: 'none',
              borderRadius: '20px',
              padding: '12px 28px',
              fontWeight: 800,
              cursor: 'pointer'
            }}
          >
            🔄 Practice New Target Sounds
          </button>
        </div>
      )}
    </div>
  );
}
