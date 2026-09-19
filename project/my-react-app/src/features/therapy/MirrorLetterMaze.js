import React, { useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { saveTherapyProgress } from './ExerciseSystem';

const MAZE_STAGES = [
  { stage: 1, prompt: 'Select the CORRECT non-reversed letter "b":', target: 'b', options: ['d', 'b', 'q', 'p'] },
  { stage: 2, prompt: 'Select the CORRECT non-reversed letter "d":', target: 'd', options: ['b', 'q', 'd', 'p'] },
  { stage: 3, prompt: 'Select the CORRECT non-reversed letter "p":', target: 'p', options: ['q', 'p', 'b', 'd'] },
  { stage: 4, prompt: 'Select the CORRECT non-reversed letter "q":', target: 'q', options: ['p', 'd', 'q', 'b'] },
  { stage: 5, prompt: 'Select the CORRECT letter "m" (not upside down):', target: 'm', options: ['w', 'm', 'u', 'n'] },
  { stage: 6, prompt: 'Select the CORRECT letter "n" (not upside down):', target: 'n', options: ['u', 'n', 'w', 'm'] },
];

const MirrorLetterMaze = ({ onComplete }) => {
  const { currentUser } = useAuth();

  const [stageIndex, setStageIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [totalAttempts, setTotalAttempts] = useState(0);
  const [correctAttempts, setCorrectAttempts] = useState(0);
  const [feedback, setFeedback] = useState('Identify the non-reversed letter to unlock the Maze Gate!');
  const [isSessionComplete, setIsSessionComplete] = useState(false);

  const currentStage = MAZE_STAGES[stageIndex];
  const currentAccuracy = totalAttempts > 0 ? Math.round((correctAttempts / totalAttempts) * 100) : 100;

  const handleSelectOption = (chosen) => {
    if (isSessionComplete) return;

    const isRight = chosen === currentStage.target;
    setTotalAttempts(prev => prev + 1);

    if (isRight) {
      const newScore = score + 30;
      setScore(newScore);
      setCorrectAttempts(prev => prev + 1);
      setFeedback(`✨ GATE UNLOCKED! Perfect spatial orientation (+30 XP)!`);
    } else {
      setFeedback(`❌ DOOR LOCKED! "${chosen}" is a mirrored/flipped letter. Try again!`);
    }

    if (stageIndex >= MAZE_STAGES.length - 1) {
      setIsSessionComplete(true);
      const finalAcc = Math.round(((correctAttempts + (isRight ? 1 : 0)) / (totalAttempts + 1)) * 100);
      saveTherapyProgress(currentUser, 'visual', score + 30, finalAcc, 'Mirror Letter Maze');
    } else {
      setTimeout(() => {
        setStageIndex(prev => prev + 1);
      }, 700);
    }
  };

  return (
    <div style={{ background: '#0c0e1a', color: '#f3f4f6', padding: '2rem', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 20px 50px rgba(0,0,0,0.6)', maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
      {/* Header Stats */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', background: 'rgba(255,255,255,0.03)', padding: '1rem 1.5rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
        <div>
          <span style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 800, display: 'block' }}>MAZE XP</span>
          <span style={{ fontSize: '1.5rem', fontWeight: 900, color: '#fbbf24' }}>{score} XP</span>
        </div>
        <div>
          <span style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 800, display: 'block' }}>MAZE PROGRESS</span>
          <span style={{ fontSize: '1.5rem', fontWeight: 900, color: '#22d3ee' }}>Gate {stageIndex + 1}/{MAZE_STAGES.length}</span>
        </div>
        <div>
          <span style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 800, display: 'block' }}>ACCURACY</span>
          <span style={{ fontSize: '1.5rem', fontWeight: 900, color: '#84cc16' }}>{currentAccuracy}%</span>
        </div>
      </div>

      <div style={{ background: 'rgba(167, 139, 250, 0.08)', border: '1px solid rgba(167, 139, 250, 0.3)', borderRadius: '16px', padding: '1rem', marginBottom: '1.5rem' }}>
        <h3 style={{ margin: '0 0 0.5rem 0', color: '#a78bfa' }}>🗝️ Mirror-Letter Maze (Spatial Orientation)</h3>
        <p style={{ margin: 0, color: '#cbd5e1', fontSize: '0.95rem' }}>{currentStage.prompt}</p>
      </div>

      {/* Visual Maze Pathway Graphics */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '1.5rem' }}>
        {MAZE_STAGES.map((s, idx) => (
          <div
            key={idx}
            style={{
              flex: 1,
              height: '10px',
              borderRadius: '5px',
              background: idx < stageIndex ? '#10b981' : idx === stageIndex ? '#22d3ee' : 'rgba(255,255,255,0.1)',
              boxShadow: idx === stageIndex ? '0 0 10px #22d3ee' : 'none'
            }}
          />
        ))}
      </div>

      {/* Letter Door Grid Options */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.2rem', marginBottom: '1.5rem' }}>
        {currentStage.options.map((opt, idx) => (
          <button
            key={idx}
            onClick={() => handleSelectOption(opt)}
            disabled={isSessionComplete}
            style={{
              background: 'rgba(15, 23, 42, 0.8)',
              border: '2px solid rgba(34, 211, 238, 0.3)',
              borderRadius: '16px',
              padding: '2rem',
              fontSize: '3rem',
              fontWeight: 900,
              color: '#22d3ee',
              cursor: 'pointer',
              boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
              transition: 'transform 0.15s ease, border-color 0.15s ease'
            }}
          >
            {opt}
          </button>
        ))}
      </div>

      {/* Feedback */}
      <div style={{ padding: '0.8rem 1.2rem', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', fontSize: '0.9rem', color: '#e2e8f0', border: '1px solid rgba(255,255,255,0.1)' }}>
        {feedback}
      </div>

      {/* Completion Modal */}
      {isSessionComplete && (
        <div style={{ marginTop: '1.5rem', padding: '1.5rem', background: 'rgba(167, 139, 250, 0.15)', border: '1px solid #a78bfa', borderRadius: '14px' }}>
          <h3 style={{ color: '#a78bfa', margin: '0 0 0.5rem 0' }}>🏆 MAZE ESCAPED!</h3>
          <p style={{ margin: '0 0 1rem 0', color: '#f3e8ff' }}>You successfully mastered spatial letter orientation!</p>
          <button onClick={onComplete} style={{ background: '#a78bfa', color: '#000', fontWeight: 800, border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer' }}>
            Continue to Next Session →
          </button>
        </div>
      )}
    </div>
  );
};

export default MirrorLetterMaze;
