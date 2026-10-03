import React, { useState } from 'react';
import AuditorySoundShield from './AuditorySoundShield';
import CopyCatEcho from './CopyCatEcho';
import { saveTherapyProgress } from './ExerciseSystem';
import { useAuth } from '../auth/AuthContext';
import './AuditoryProcessingSuite.css';

export default function AuditoryProcessingSuite({ onComplete }) {
  const [activeGame, setActiveGame] = useState('shield'); // 'shield' | 'echo' | 'quest'
  const [sessionStats, setSessionStats] = useState({
    shieldRounds: 0,
    echoRounds: 0,
    totalAccuracy: 0,
    totalScore: 0,
    totalReplaysUsed: 0
  });

  const { currentUser } = useAuth();
  const [sessionMode] = useState(() => {
    return localStorage.getItem('lexiflow_therapy_mode') || 'assessment';
  });

  const handleRoundComplete = async (roundData) => {
    setSessionStats((prev) => {
      const isShield = roundData.game === 'Sound Shield';
      const newShieldRounds = prev.shieldRounds + (isShield ? 1 : 0);
      const newEchoRounds = prev.echoRounds + (!isShield ? 1 : 0);
      const totalSessions = newShieldRounds + newEchoRounds;

      const currentAcc = roundData.accuracyPct || 0;
      const updatedAvgAcc = Math.round(
        (prev.totalAccuracy * (totalSessions - 1) + currentAcc) / Math.max(1, totalSessions)
      );

      const scoreEarned = Math.round(currentAcc * 10 + (roundData.stars ? roundData.stars * 20 : 0));
      const newTotalScore = prev.totalScore + scoreEarned;

      const replaysInRound = roundData.telemetry
        ? roundData.telemetry.reduce((acc, curr) => acc + (curr.replayCount || 0), 0)
        : 0;
      const newTotalReplays = prev.totalReplaysUsed + replaysInRound;

      // Telemetry saving into localStorage
      try {
        const telemetryPayload = {
          timestamp: new Date().toISOString(),
          module: 'Auditory Processing Suite',
          gameType: roundData.game,
          score: newTotalScore,
          accuracy: updatedAvgAcc,
          totalReplaysUsed: newTotalReplays,
          lastRoundData: roundData
        };
        localStorage.setItem('lexiflow_session_history_auditory', JSON.stringify(telemetryPayload));
        window.dispatchEvent(new Event('therapy_progress_updated'));
      } catch (e) {
        console.warn('Telemetry save error:', e);
      }

      // Sync with dashboard & backend
      saveTherapyProgress(
        currentUser,
        'auditory',
        newTotalScore,
        updatedAvgAcc,
        totalSessions + ' Sessions (' + roundData.game + ')',
        sessionMode
      );

      return {
        shieldRounds: newShieldRounds,
        echoRounds: newEchoRounds,
        totalAccuracy: updatedAvgAcc,
        totalScore: newTotalScore,
        totalReplaysUsed: newTotalReplays
      };
    });
  };

  return (
    <div className="ap-suite-container">
      {/* Game Mode Selector Tabs */}
      <div className="ap-mode-tabs">
        <button
          className={'ap-tab-btn' + (activeGame === 'shield' ? ' active-shield' : '')}
          onClick={() => setActiveGame('shield')}
        >
          <span>🛡️</span>
          <span>Game 1: Sound Shield</span>
        </button>

        <button
          className={'ap-tab-btn' + (activeGame === 'echo' ? ' active-echo' : '')}
          onClick={() => setActiveGame('echo')}
        >
          <span>🐱</span>
          <span>Game 2: Copy Cat Echo</span>
        </button>

        <button
          className={'ap-tab-btn' + (activeGame === 'quest' ? ' active-quest' : '')}
          onClick={() => setActiveGame('quest')}
        >
          <span>🏆</span>
          <span>Full Auditory Quest</span>
        </button>
      </div>

      {sessionStats.totalScore > 0 && (
        <div style={{ textAlign: 'center', marginBottom: '1rem', color: '#64748b', fontSize: '0.85rem', fontWeight: 700 }}>
          📊 Suite Session Score: <strong style={{ color: '#8b5cf6' }}>{sessionStats.totalScore}</strong> | Avg Accuracy: <strong style={{ color: '#22c55e' }}>{sessionStats.totalAccuracy}%</strong>
        </div>
      )}

      {/* Render Active Game */}
      {activeGame === 'shield' && (
        <AuditorySoundShield onCompleteRound={handleRoundComplete} />
      )}

      {activeGame === 'echo' && (
        <CopyCatEcho onCompleteRound={handleRoundComplete} initialLevel={1} />
      )}

      {activeGame === 'quest' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <AuditorySoundShield onCompleteRound={handleRoundComplete} />
          <CopyCatEcho onCompleteRound={handleRoundComplete} initialLevel={2} />
        </div>
      )}

      {/* Completion & Dashboard return button */}
      <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
        <button
          onClick={onComplete}
          style={{
            background: 'linear-gradient(135deg, #1e293b, #0f172a)',
            color: '#ffffff',
            border: 'none',
            borderRadius: '16px',
            padding: '12px 28px',
            fontSize: '0.95rem',
            fontWeight: 800,
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
          }}
        >
          Complete & View Dashboard →
        </button>
      </div>
    </div>
  );
}
