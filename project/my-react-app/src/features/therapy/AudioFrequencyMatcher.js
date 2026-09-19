import React, { useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { saveTherapyProgress } from './ExerciseSystem';

const TONE_TRIALS = [
  { id: 1, freq1: 440, freq2: 440, isSame: true, label: 'Track 1 (Standard A)' },
  { id: 2, freq1: 440, freq2: 480, isSame: false, label: 'Track 2 (Frequency Shift)' },
  { id: 3, freq1: 520, freq2: 520, isSame: true, label: 'Track 3 (Mid-Pitch Tone)' },
  { id: 4, freq1: 300, freq2: 360, isSame: false, label: 'Track 4 (Bass Pitch Shift)' },
  { id: 5, freq1: 600, freq2: 600, isSame: true, label: 'Track 5 (High Frequency)' },
  { id: 6, freq1: 440, freq2: 455, isSame: false, label: 'Track 6 (Fine Discrimination)' },
];

const AudioFrequencyMatcher = ({ onComplete }) => {
  const { currentUser } = useAuth();

  const [trialIndex, setTrialIndex] = useState(0);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [score, setScore] = useState(0);
  const [totalAttempts, setTotalAttempts] = useState(0);
  const [correctAttempts, setCorrectAttempts] = useState(0);
  const [feedback, setFeedback] = useState('Press "Play Tones" to listen to the DJ Equalizer!');
  const [isSessionComplete, setIsSessionComplete] = useState(false);

  const currentTrial = TONE_TRIALS[trialIndex];
  const currentAccuracy = totalAttempts > 0 ? Math.round((correctAttempts / totalAttempts) * 100) : 100;

  // Synthesize dual tone sequence using Web Audio API
  const playDualTones = () => {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    setIsPlayingAudio(true);

    // Tone 1
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.frequency.setValueAtTime(currentTrial.freq1, ctx.currentTime);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + 0.6);

    // Tone 2 (plays 0.8s later)
    setTimeout(() => {
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.frequency.setValueAtTime(currentTrial.freq2, ctx.currentTime);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(ctx.currentTime);
      osc2.stop(ctx.currentTime + 0.6);

      setTimeout(() => {
        setIsPlayingAudio(false);
        setFeedback('Did Tone 1 and Tone 2 MATCH or DIFFER?');
      }, 700);
    }, 800);
  };

  const handleAnswer = (userSaidSame) => {
    if (isSessionComplete) return;

    const isRight = userSaidSame === currentTrial.isSame;
    setTotalAttempts(prev => prev + 1);

    if (isRight) {
      const newScore = score + 30;
      setScore(newScore);
      setCorrectAttempts(prev => prev + 1);
      setFeedback(`🎧 DJ MATCH! Perfect Auditory Discrimination (+30 XP)!`);
    } else {
      setFeedback(`❌ MISMATCH! Tones were actually ${currentTrial.isSame ? 'MATCHING' : 'DIFFERENT'}.`);
    }

    if (trialIndex >= TONE_TRIALS.length - 1) {
      setIsSessionComplete(true);
      const finalAcc = Math.round(((correctAttempts + (isRight ? 1 : 0)) / (totalAttempts + 1)) * 100);
      saveTherapyProgress(currentUser, 'auditory', score + 30, finalAcc, 'Audio Frequency Matcher');
    } else {
      setTimeout(() => {
        setTrialIndex(prev => prev + 1);
      }, 900);
    }
  };

  return (
    <div style={{ background: '#0c0e1a', color: '#f3f4f6', padding: '2rem', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 20px 50px rgba(0,0,0,0.6)', maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
      {/* Header Stats */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', background: 'rgba(255,255,255,0.03)', padding: '1rem 1.5rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
        <div>
          <span style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 800, display: 'block' }}>DJ XP SCORE</span>
          <span style={{ fontSize: '1.5rem', fontWeight: 900, color: '#fbbf24' }}>{score} XP</span>
        </div>
        <div>
          <span style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 800, display: 'block' }}>TRACK NUMBER</span>
          <span style={{ fontSize: '1.5rem', fontWeight: 900, color: '#22d3ee' }}>Track {trialIndex + 1}/{TONE_TRIALS.length}</span>
        </div>
        <div>
          <span style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 800, display: 'block' }}>ACCURACY</span>
          <span style={{ fontSize: '1.5rem', fontWeight: 900, color: '#84cc16' }}>{currentAccuracy}%</span>
        </div>
      </div>

      <div style={{ background: 'rgba(34, 211, 238, 0.08)', border: '1px solid rgba(34, 211, 238, 0.3)', borderRadius: '16px', padding: '1rem', marginBottom: '1.5rem' }}>
        <h3 style={{ margin: '0 0 0.5rem 0', color: '#22d3ee' }}>🎛️ Audio Frequency Matcher (DJ Sound Mixer)</h3>
        <p style={{ margin: 0, color: '#cbd5e1', fontSize: '0.95rem' }}>Listen to the 2 sequential audio tones, then tap whether they were identical or different pitches!</p>
      </div>

      {/* Equalizer Visual Display */}
      <div style={{ height: '140px', background: 'rgba(15, 23, 42, 0.8)', borderRadius: '16px', border: '2px solid rgba(34, 211, 238, 0.3)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '0 2rem' }}>
        {[40, 70, 30, 85, 60, 95, 45, 75, 50, 90, 65, 35].map((h, idx) => (
          <div
            key={idx}
            style={{
              flex: 1,
              height: `${isPlayingAudio ? Math.min(100, h + (idx % 3) * 15) : 20}%`,
              background: 'linear-gradient(180deg, #22d3ee 0%, #3b82f6 100%)',
              borderRadius: '4px',
              transition: 'height 0.15s ease',
              boxShadow: isPlayingAudio ? '0 0 10px #22d3ee' : 'none'
            }}
          />
        ))}
      </div>

      {/* Play Tones Button */}
      <button
        onClick={playDualTones}
        disabled={isPlayingAudio || isSessionComplete}
        style={{ background: 'linear-gradient(135deg, #a78bfa, #8b5cf6)', color: '#fff', border: 'none', padding: '14px 28px', borderRadius: '12px', fontSize: '1.1rem', fontWeight: 800, cursor: 'pointer', marginBottom: '1.5rem', boxShadow: '0 4px 15px rgba(167, 139, 250, 0.4)' }}
      >
        {isPlayingAudio ? '🔊 PLAYING TONE SEQUENCE...' : '▶️ PLAY AUDIO TONES'}
      </button>

      {/* Answer Choice Buttons */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', marginBottom: '1.5rem' }}>
        <button
          onClick={() => handleAnswer(true)}
          disabled={isPlayingAudio || isSessionComplete}
          style={{ background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', border: 'none', padding: '14px 28px', borderRadius: '12px', fontSize: '1.1rem', fontWeight: 800, cursor: 'pointer', boxShadow: '0 4px 15px rgba(16, 185, 129, 0.4)' }}
        >
          🎵 MATCH (SAME PITCH)
        </button>
        <button
          onClick={() => handleAnswer(false)}
          disabled={isPlayingAudio || isSessionComplete}
          style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: '#fff', border: 'none', padding: '14px 28px', borderRadius: '12px', fontSize: '1.1rem', fontWeight: 800, cursor: 'pointer', boxShadow: '0 4px 15px rgba(245, 158, 11, 0.4)' }}
        >
          🎶 DIFFER (DIFFERENT PITCH)
        </button>
      </div>

      {/* Feedback */}
      <div style={{ padding: '0.8rem 1.2rem', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', fontSize: '0.9rem', color: '#e2e8f0', border: '1px solid rgba(255,255,255,0.1)' }}>
        {feedback}
      </div>

      {/* Completion Modal */}
      {isSessionComplete && (
        <div style={{ marginTop: '1.5rem', padding: '1.5rem', background: 'rgba(34, 211, 238, 0.15)', border: '1px solid #22d3ee', borderRadius: '14px' }}>
          <h3 style={{ color: '#22d3ee', margin: '0 0 0.5rem 0' }}>🏆 DJ SOUND MIXER COMPLETE!</h3>
          <p style={{ margin: '0 0 1rem 0', color: '#e0f2fe' }}>You completed frequency discrimination analysis!</p>
          <button onClick={onComplete} style={{ background: '#22d3ee', color: '#000', fontWeight: 800, border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer' }}>
            Continue to Next Session →
          </button>
        </div>
      )}
    </div>
  );
};

export default AudioFrequencyMatcher;
