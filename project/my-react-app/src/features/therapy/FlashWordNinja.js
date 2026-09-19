import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../auth/AuthContext';
import { saveTherapyProgress } from './ExerciseSystem';

const WORD_BANK = [
  { word: 'Yacht', correct: true, hint: 'A luxurious boat' },
  { word: 'Yot', correct: false, hint: 'Misspelled sight word!' },
  { word: 'Friend', correct: true, hint: 'Someone you like' },
  { word: 'Frend', correct: false, hint: 'Misspelled sight word!' },
  { word: 'Island', correct: true, hint: 'Land surrounded by water' },
  { word: 'Iland', correct: false, hint: 'Misspelled sight word!' },
  { word: 'Listen', correct: true, hint: 'To pay attention to sound' },
  { word: 'Lisen', correct: false, hint: 'Misspelled sight word!' },
  { word: 'Knight', correct: true, hint: 'A medieval warrior' },
  { word: 'Nite', correct: false, hint: 'Misspelled sight word!' },
];

const FlashWordNinja = ({ onComplete }) => {
  const { currentUser } = useAuth();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [wordVisible, setWordVisible] = useState(false);
  const [score, setScore] = useState(0);
  const [totalAttempts, setTotalAttempts] = useState(0);
  const [correctAttempts, setCorrectAttempts] = useState(0);
  const [streak, setStreak] = useState(0);
  const [feedback, setFeedback] = useState('Get ready! Word will flash for 800ms...');
  const [isSessionComplete, setIsSessionComplete] = useState(false);

  const startTimeRef = useRef(null);
  const timerRef = useRef(null);

  const currentItem = WORD_BANK[currentIndex];
  const currentAccuracy = totalAttempts > 0 ? Math.round((correctAttempts / totalAttempts) * 100) : 100;

  // Flash word logic
  const startWordFlash = () => {
    setWordVisible(true);
    startTimeRef.current = performance.now();

    timerRef.current = setTimeout(() => {
      setWordVisible(false);
    }, 800); // 800ms flash duration
  };

  useEffect(() => {
    if (!isSessionComplete) {
      startWordFlash();
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [currentIndex, isSessionComplete]);

  const handleAnswer = (userSaidCorrect) => {
    if (isSessionComplete) return;

    const reactionTime = startTimeRef.current ? Math.round(performance.now() - startTimeRef.current) : 1000;
    const isRight = userSaidCorrect === currentItem.correct;

    setTotalAttempts(prev => prev + 1);

    if (isRight) {
      const isSpeedy = reactionTime <= 600;
      const points = isSpeedy ? 40 : 25;
      const newScore = score + points;
      setScore(newScore);
      setCorrectAttempts(prev => prev + 1);
      setStreak(prev => prev + 1);
      setFeedback(`⚡ NINJA STRIKE! ${isSpeedy ? 'Lightning Speed Bonus (+40 XP)!' : 'Correct (+25 XP)!'}`);
    } else {
      setStreak(0);
      setFeedback(`❌ Missed! "${currentItem.word}" was ${currentItem.correct ? 'Correct' : 'Misspelled'}.`);
    }

    if (currentIndex >= WORD_BANK.length - 1) {
      setIsSessionComplete(true);
      const finalAcc = Math.round(((correctAttempts + (isRight ? 1 : 0)) / (totalAttempts + 1)) * 100);
      saveTherapyProgress(currentUser, 'morphology', score + (isRight ? 25 : 0), finalAcc, 'Flash Ninja');
    } else {
      setTimeout(() => {
        setCurrentIndex(prev => prev + 1);
      }, 900);
    }
  };

  return (
    <div style={{ background: '#0c0e1a', color: '#f3f4f6', padding: '2rem', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 20px 50px rgba(0,0,0,0.6)', maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
      {/* Header Stats */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', background: 'rgba(255,255,255,0.03)', padding: '1rem 1.5rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
        <div>
          <span style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 800, display: 'block' }}>NINJA SCORE</span>
          <span style={{ fontSize: '1.5rem', fontWeight: 900, color: '#fbbf24' }}>{score} XP</span>
        </div>
        <div>
          <span style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 800, display: 'block' }}>STREAK</span>
          <span style={{ fontSize: '1.5rem', fontWeight: 900, color: '#22d3ee' }}>🔥 {streak}</span>
        </div>
        <div>
          <span style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 800, display: 'block' }}>ACCURACY</span>
          <span style={{ fontSize: '1.5rem', fontWeight: 900, color: '#84cc16' }}>{currentAccuracy}%</span>
        </div>
      </div>

      <div style={{ background: 'rgba(251, 191, 36, 0.08)', border: '1px solid rgba(251, 191, 36, 0.3)', borderRadius: '16px', padding: '1rem', marginBottom: '1.5rem' }}>
        <h3 style={{ margin: '0 0 0.5rem 0', color: '#fbbf24' }}>🥷 Flash-Word Ninja ({currentIndex + 1}/{WORD_BANK.length})</h3>
        <p style={{ margin: 0, color: '#cbd5e1', fontSize: '0.95rem' }}>A sight word will flash for 800ms. Tap whether it is spelled correctly!</p>
      </div>

      {/* 800ms Flash Container */}
      <div style={{ height: '160px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15, 23, 42, 0.8)', borderRadius: '16px', border: '2px dashed rgba(255,255,255,0.15)', marginBottom: '1.5rem', position: 'relative' }}>
        {wordVisible ? (
          <span style={{ fontSize: '3rem', fontWeight: 900, color: '#22d3ee', letterSpacing: '2px', textShadow: '0 0 20px rgba(34, 211, 238, 0.8)' }}>
            {currentItem.word}
          </span>
        ) : (
          <span style={{ fontSize: '1.2rem', color: '#64748b', fontStyle: 'italic' }}>
            [ Word Hidden - Make Your Choice! ]
          </span>
        )}
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', marginBottom: '1.5rem' }}>
        <button
          onClick={() => handleAnswer(true)}
          disabled={isSessionComplete}
          style={{ background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', border: 'none', padding: '14px 28px', borderRadius: '12px', fontSize: '1.1rem', fontWeight: 800, cursor: 'pointer', boxShadow: '0 4px 15px rgba(16, 185, 129, 0.4)' }}
        >
          ✅ SPELLED CORRECTLY
        </button>
        <button
          onClick={() => handleAnswer(false)}
          disabled={isSessionComplete}
          style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)', color: '#fff', border: 'none', padding: '14px 28px', borderRadius: '12px', fontSize: '1.1rem', fontWeight: 800, cursor: 'pointer', boxShadow: '0 4px 15px rgba(239, 68, 68, 0.4)' }}
        >
          ❌ MISSPELLED WORD
        </button>
      </div>

      {/* Feedback */}
      <div style={{ padding: '0.8rem 1.2rem', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', fontSize: '0.9rem', color: '#e2e8f0', border: '1px solid rgba(255,255,255,0.1)' }}>
        {feedback}
      </div>

      {/* Completion Modal */}
      {isSessionComplete && (
        <div style={{ marginTop: '1.5rem', padding: '1.5rem', background: 'rgba(251, 191, 36, 0.15)', border: '1px solid #fbbf24', borderRadius: '14px' }}>
          <h3 style={{ color: '#fbbf24', margin: '0 0 0.5rem 0' }}>🏆 NINJA MASTERY COMPLETE!</h3>
          <p style={{ margin: '0 0 1rem 0', color: '#fef3c7' }}>You completed all sight word flash challenges!</p>
          <button onClick={onComplete} style={{ background: '#fbbf24', color: '#000', fontWeight: 800, border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer' }}>
            Continue to Next Session →
          </button>
        </div>
      )}
    </div>
  );
};

export default FlashWordNinja;
