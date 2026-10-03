import React, { useState } from 'react';
import LetterTwinsHunt from './LetterTwinsHunt';
import WordJumbleNinja from './WordJumbleNinja';
import { saveTherapyProgress } from './ExerciseSystem';
import { useAuth } from '../auth/AuthContext';
import './VisualTrackingSuite.css';

export default function VisualTrackingSuite({ onComplete }) {
  const [activeGame, setActiveGame] = useState('twins'); // 'twins' | 'ninja' | 'quest'
  const [sessionStats, setSessionStats] = useState({
    twinsRounds: 0,
    ninjaRounds: 0,
    totalAccuracy: 0,
    totalScore: 0,
    totalReversalMistakes: 0,
    totalMigrationMistakes: 0
  });

  const { currentUser } = useAuth();
  const [sessionMode] = useState(() => {
    return localStorage.getItem('lexiflow_therapy_mode') || 'assessment';
  });

  const handleRoundComplete = async (roundData) => {
    // Update local statistics
    setSessionStats((prev) => {
      const newTwinsRounds = prev.twinsRounds + (roundData.game === 'Letter Twins Hunt' ? 1 : 0);
      const newNinjaRounds = prev.ninjaRounds + (roundData.game === 'Word Jumble Ninja' ? 1 : 0);
      const totalRounds = newTwinsRounds + newNinjaRounds;

      const currentAcc = roundData.accuracyPct || 0;
      const updatedAvgAcc = Math.round(
        (prev.totalAccuracy * (totalRounds - 1) + currentAcc) / Math.max(1, totalRounds)
      );

      const scoreEarned = Math.round(currentAcc * 10 + (roundData.stars ? roundData.stars * 50 : 0));
      const newTotalScore = prev.totalScore + scoreEarned;

      const newReversalMistakes = prev.totalReversalMistakes + (roundData.reversalMistakes || 0);
      const newMigrationMistakes = prev.totalMigrationMistakes + (roundData.letterMigrationCount || 0);

      // Save to localStorage telemetry as requested in specifications
      try {
        const telemetryPayload = {
          timestamp: new Date().toISOString(),
          module: 'Visual Tracking Practice',
          score: newTotalScore,
          accuracy: updatedAvgAcc,
          reversalMistakes: newReversalMistakes,
          migrationMistakes: newMigrationMistakes,
          lastRoundData: roundData
        };
        localStorage.setItem('lexiflow_session_history_visual', JSON.stringify(telemetryPayload));
        window.dispatchEvent(new Event('therapy_progress_updated'));
      } catch (e) {
        console.warn('Telemetry save error:', e);
      }

      // Automatically sync with dashboard & backend via saveTherapyProgress
      saveTherapyProgress(
        currentUser,
        'visual',
        newTotalScore,
        updatedAvgAcc,
        `${totalRounds} Rounds`,
        sessionMode
      );

      return {
        twinsRounds: newTwinsRounds,
        ninjaRounds: newNinjaRounds,
        totalAccuracy: updatedAvgAcc,
        totalScore: newTotalScore,
        totalReversalMistakes: newReversalMistakes,
        totalMigrationMistakes: newMigrationMistakes
      };
    });
  };

  return (
    <div className="vt-suite-container">
      {/* Game Mode Selector Tabs */}
      <div className="vt-mode-tabs">
        <button
          className={`vt-tab-btn ${activeGame === 'twins' ? 'active-twins' : ''}`}
          onClick={() => setActiveGame('twins')}
        >
          <span>🐰</span>
          <span>Game 1: Letter Twins Hunt</span>
        </button>

        <button
          className={`vt-tab-btn ${activeGame === 'ninja' ? 'active-ninja' : ''}`}
          onClick={() => setActiveGame('ninja')}
        >
          <span>🥷</span>
          <span>Game 2: Word Jumble Ninja</span>
        </button>

        <button
          className={`vt-tab-btn ${activeGame === 'quest' ? 'active-quest' : ''}`}
          onClick={() => setActiveGame('quest')}
        >
          <span>🏆</span>
          <span>Full Visual Quest</span>
        </button>
      </div>

      {/* Render Active Mini Game */}
      {activeGame === 'twins' && (
        <LetterTwinsHunt onCompleteRound={handleRoundComplete} initialLevel={1} />
      )}

      {activeGame === 'ninja' && (
        <WordJumbleNinja onCompleteRound={handleRoundComplete} initialLevel={1} />
      )}

      {activeGame === 'quest' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <LetterTwinsHunt onCompleteRound={handleRoundComplete} initialLevel={1} />
          <WordJumbleNinja onCompleteRound={handleRoundComplete} initialLevel={2} />
        </div>
      )}

      {/* Completion & Dashboard return trigger */}
      <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
        <button
          className="vt-btn-secondary"
          onClick={onComplete}
          style={{ padding: '10px 22px', fontSize: '0.9rem', borderRadius: '14px' }}
        >
          Complete & View Dashboard →
        </button>
      </div>
    </div>
  );
}
