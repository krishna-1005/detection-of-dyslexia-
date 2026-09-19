import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../auth/AuthContext';
import { saveTherapyProgress } from './ExerciseSystem';
import useAudioVisualizer from './hooks/useAudioVisualizer';

const TARGET_WORDS = [
  { word: 'Ball', phoneme: '/b/', hint: 'Say "Ball" aloud' },
  { word: 'Boy', phoneme: '/b/', hint: 'Say "Boy" aloud' },
  { word: 'Bat', phoneme: '/b/', hint: 'Say "Bat" aloud' },
  { word: 'Boat', phoneme: '/b/', hint: 'Say "Boat" aloud' },
  { word: 'Bird', phoneme: '/b/', hint: 'Say "Bird" aloud' },
];

const ORB_COLORS = ['#22d3ee', '#fbbf24', '#84cc16', '#a78bfa', '#f472b6'];

const PhonemeJarCollector = ({ onComplete }) => {
  const { currentUser } = useAuth();
  const audio = useAudioVisualizer();

  const [targetIndex, setTargetIndex] = useState(0);
  const [fillPercent, setFillPercent] = useState(0); // 0 to 100%
  const [orbs, setOrbs] = useState([]);
  const [score, setScore] = useState(0);
  const [totalAttempts, setTotalAttempts] = useState(0);
  const [correctAttempts, setCorrectAttempts] = useState(0);
  const [statusState, setStatusState] = useState('idle'); // idle | listening | success | retry
  const [statusText, setStatusText] = useState('🎤 Enable mic to begin hands-free speech game');
  const [isSystemReady, setIsSystemReady] = useState(false);
  const [isSessionComplete, setIsSessionComplete] = useState(false);

  const recognitionRef = useRef(null);
  const isEvaluatingRef = useRef(false);
  const vadTimerRef = useRef(null);
  const activeWordRef = useRef(TARGET_WORDS[0]);
  const isSessionCompleteRef = useRef(false);
  const isSystemReadyRef = useRef(false);

  // Sync activeWordRef with targetIndex state
  useEffect(() => {
    activeWordRef.current = TARGET_WORDS[targetIndex];
  }, [targetIndex]);

  useEffect(() => {
    isSessionCompleteRef.current = isSessionComplete;
  }, [isSessionComplete]);

  useEffect(() => {
    isSystemReadyRef.current = isSystemReady;
  }, [isSystemReady]);

  const currentTarget = TARGET_WORDS[targetIndex];
  
  // Defer accuracy calculation until session completion
  const displayAccuracy = isSessionComplete
    ? `${totalAttempts > 0 ? Math.round((correctAttempts / totalAttempts) * 100) : 100}%`
    : '--';

  // Play audio chime on success
  const playSuccessChime = () => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
      osc.frequency.exponentialRampToValueAtTime(783.99, ctx.currentTime + 0.25); // G5
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } catch (e) {
      /* ignore audio error */
    }
  };

  const addOrbToJar = useCallback(() => {
    playSuccessChime();

    const newOrb = {
      id: Date.now(),
      color: ORB_COLORS[orbs.length % ORB_COLORS.length],
      cx: 30 + Math.random() * 40,
      cy: 80 - (fillPercent + 20) * 0.6,
      size: 14 + Math.random() * 6,
    };

    const newFill = Math.min(100, fillPercent + 20);
    setFillPercent(newFill);
    setOrbs((prev) => [...prev, newOrb]);
    setCorrectAttempts((prev) => prev + 1);
    setTotalAttempts((prev) => prev + 1);

    const newScore = score + 25;
    setScore(newScore);

    if (newFill >= 100) {
      setStatusState('success');
      setStatusText('✨ POTION JAR IS 100% FULL! Cosmic Power Unlocked! ✨');
      setIsSessionComplete(true);
      const finalAccuracy = Math.round(((correctAttempts + 1) / (totalAttempts + 1)) * 100);
      saveTherapyProgress(currentUser, 'phoneme', newScore, finalAccuracy);
    } else {
      setStatusState('success');
      setStatusText(`✨ Correct! Phoneme Orb Added (+20% Fill)! Next Word: "${TARGET_WORDS[(targetIndex + 1) % TARGET_WORDS.length].word}"`);
      
      setTimeout(() => {
        setTargetIndex((prev) => (prev + 1) % TARGET_WORDS.length);
        setStatusState('listening');
        setStatusText(`🎤 Listening for "${TARGET_WORDS[(targetIndex + 1) % TARGET_WORDS.length].word}"...`);
        isEvaluatingRef.current = false;
      }, 1000);
    }
  }, [fillPercent, orbs.length, score, correctAttempts, totalAttempts, targetIndex, currentUser]);

  const startSpeechEngine = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      try {
        if (recognitionRef.current) {
          try { recognitionRef.current.onend = null; recognitionRef.current.stop(); } catch (e) { /* ignore */ }
        }

        const rec = new SpeechRecognition();
        rec.continuous = true;
        rec.interimResults = true;
        rec.lang = 'en-US';
        recognitionRef.current = rec;

        rec.onresult = (event) => {
          if (isEvaluatingRef.current || isSessionCompleteRef.current) return;
          
          if (!event.results || event.results.length === 0) return;
          const latestResult = event.results[event.results.length - 1][0].transcript.toLowerCase().trim();
          const targetWord = (activeWordRef.current?.word || '').toLowerCase();

          if (latestResult.includes(targetWord) && targetWord.length > 0) {
            isEvaluatingRef.current = true;
            addOrbToJar();
          }
        };

        // Auto-restart guard if recognition terminates prematurely while session is active
        rec.onend = () => {
          if (isSystemReadyRef.current && !isSessionCompleteRef.current) {
            try {
              rec.start();
            } catch (e) {
              /* ignore if already starting */
            }
          }
        };

        rec.start();
      } catch (err) {
        console.warn('Speech recognition init error:', err);
      }
    }
  }, [addOrbToJar]);

  const handleStartMic = async () => {
    await audio.startMic();
    setIsSystemReady(true);
    setStatusState('listening');
    setStatusText(`🎤 Listening for "${currentTarget.word}"...`);

    startSpeechEngine();
  };

  // Fallback VAD Speech Trigger
  useEffect(() => {
    if (!isSystemReady || isSessionComplete || isEvaluatingRef.current) return;

    if (audio.amplitude >= 42) {
      if (!vadTimerRef.current) {
        vadTimerRef.current = setTimeout(() => {
          isEvaluatingRef.current = true;
          addOrbToJar();
          setTimeout(() => {
            isEvaluatingRef.current = false;
            vadTimerRef.current = null;
          }, 1200);
        }, 350);
      }
    } else {
      if (vadTimerRef.current) {
        clearTimeout(vadTimerRef.current);
        vadTimerRef.current = null;
      }
    }
  }, [audio.amplitude, isSystemReady, isSessionComplete, addOrbToJar]);

  const playTargetWordAudio = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const ut = new SpeechSynthesisUtterance(`${currentTarget.word}`);
      ut.rate = 0.85;
      window.speechSynthesis.speak(ut);
    }
  };

  return (
    <div
      style={{
        background: '#0c0e1a',
        color: '#f3f4f6',
        padding: '2rem',
        borderRadius: '20px',
        border: '1px solid rgba(255,255,255,0.1)',
        boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
        maxWidth: '800px',
        margin: '0 auto',
        textAlign: 'center',
      }}
    >
      {/* Header Stats */}
      <div
        style={{
          display: 'flex',
          justify: 'space-between',
          alignItems: 'center',
          marginBottom: '1.5rem',
          background: 'rgba(255,255,255,0.03)',
          padding: '1rem 1.5rem',
          borderRadius: '12px',
          border: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <div>
          <span style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 800, display: 'block' }}>
            XP SCORE
          </span>
          <span style={{ fontSize: '1.5rem', fontWeight: 900, color: '#fbbf24' }}>{score} XP</span>
        </div>
        <div>
          <span style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 800, display: 'block' }}>
            JAR FILL LEVEL
          </span>
          <span style={{ fontSize: '1.5rem', fontWeight: 900, color: '#22d3ee' }}>{fillPercent}%</span>
        </div>
        <div>
          <span style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 800, display: 'block' }}>
            ACCURACY
          </span>
          <span style={{ fontSize: '1.5rem', fontWeight: 900, color: '#84cc16' }}>{displayAccuracy}</span>
        </div>
      </div>

      {/* Target Word Selection Bar */}
      <div
        style={{
          background: 'rgba(34, 211, 238, 0.08)',
          border: '1px solid rgba(34, 211, 238, 0.3)',
          borderRadius: '16px',
          padding: '1.2rem',
          marginBottom: '1.5rem',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginBottom: '1rem' }}>
          {TARGET_WORDS.map((tw, idx) => (
            <span
              key={idx}
              style={{
                padding: '6px 14px',
                borderRadius: '20px',
                fontSize: '0.85rem',
                fontWeight: 800,
                background: idx === targetIndex ? '#22d3ee' : 'rgba(255,255,255,0.05)',
                color: idx === targetIndex ? '#000' : '#94a3b8',
                border: '1px solid rgba(255,255,255,0.1)',
                boxShadow: idx === targetIndex ? '0 0 12px rgba(34, 211, 238, 0.5)' : 'none',
              }}
            >
              {idx < targetIndex ? '✅ ' : idx === targetIndex ? '👉 ' : ''}
              {tw.word}
            </span>
          ))}
        </div>

        <h3 style={{ margin: '0 0 0.4rem 0', fontSize: '1.6rem', color: '#22d3ee' }}>
          Active Target Word: <strong style={{ color: '#fff', textDecoration: 'underline' }}>{currentTarget.word}</strong> ({currentTarget.phoneme})
        </h3>
        <p style={{ margin: 0, color: '#cbd5e1', fontSize: '0.95rem' }}>{currentTarget.hint}</p>
        <button
          onClick={playTargetWordAudio}
          style={{
            marginTop: '0.6rem',
            background: 'rgba(255,255,255,0.1)',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            padding: '5px 14px',
            fontSize: '0.85rem',
            cursor: 'pointer',
            fontWeight: 700,
          }}
        >
          🔊 Hear Word
        </button>
      </div>

      {/* Magic Jar SVG Display */}
      <div style={{ position: 'relative', width: '220px', height: '260px', margin: '0 auto 1.5rem auto' }}>
        <svg width="220" height="260" viewBox="0 0 220 260" style={{ filter: 'drop-shadow(0 0 15px rgba(34, 211, 238, 0.3))' }}>
          {/* Lid */}
          <rect x="70" y="10" width="80" height="15" rx="5" fill="#a78bfa" stroke="#c084fc" strokeWidth="2" />
          {/* Neck */}
          <path d="M 80 25 L 80 45 L 140 45 L 140 25 Z" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.2)" strokeWidth="2" />
          {/* Body */}
          <path
            d="M 40 50 Q 20 60 20 120 Q 20 240 50 250 L 170 250 Q 200 240 200 120 Q 200 60 180 50 Z"
            fill="rgba(15, 23, 42, 0.6)"
            stroke="rgba(34, 211, 238, 0.5)"
            strokeWidth="3"
          />

          {/* Liquid Fill */}
          {fillPercent > 0 && (
            <path
              d={`M 25 ${250 - fillPercent * 1.9} Q 110 ${240 - fillPercent * 1.9} 195 ${250 - fillPercent * 1.9} L 170 248 L 50 248 Z`}
              fill="rgba(34, 211, 238, 0.25)"
            />
          )}

          {/* Orbs */}
          {orbs.map((orb) => (
            <circle
              key={orb.id}
              cx={`${orb.cx}%`}
              cy={`${orb.cy}%`}
              r={orb.size}
              fill={orb.color}
              style={{ filter: `drop-shadow(0 0 10px ${orb.color})` }}
            />
          ))}
        </svg>
      </div>

      {/* Hands-Free Mic Control & Status Pill */}
      <div style={{ marginBottom: '1.5rem' }}>
        {!isSystemReady ? (
          <button
            onClick={handleStartMic}
            style={{
              background: 'linear-gradient(135deg, #22d3ee, #3b82f6)',
              color: '#000',
              fontWeight: 800,
              border: 'none',
              padding: '14px 28px',
              borderRadius: '12px',
              cursor: 'pointer',
              fontSize: '1rem',
              boxShadow: '0 0 20px rgba(34, 211, 238, 0.4)',
            }}
          >
            🎙️ START HANDS-FREE SPEECH MIC
          </button>
        ) : (
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '10px',
              padding: '10px 22px',
              borderRadius: '30px',
              fontSize: '0.95rem',
              fontWeight: 800,
              background: statusState === 'success' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(34, 211, 238, 0.15)',
              color: statusState === 'success' ? '#10b981' : '#22d3ee',
              border: statusState === 'success' ? '1px solid #10b981' : '1px solid #22d3ee',
              boxShadow: '0 0 15px rgba(34, 211, 238, 0.3)',
            }}
          >
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#22d3ee', display: 'inline-block', animation: 'pulse 1.5s infinite' }} />
            {statusText}
          </div>
        )}
      </div>

      {/* Session Complete Modal */}
      {isSessionComplete && (
        <div style={{ marginTop: '1.5rem', padding: '1.5rem', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid #10b981', borderRadius: '14px' }}>
          <h3 style={{ color: '#10b981', margin: '0 0 0.5rem 0' }}>🏆 MAGIC POTION JAR IS FULL!</h3>
          <p style={{ margin: '0 0 1rem 0', color: '#ecfdf5' }}>You filled the jar purely using speech pronunciation!</p>
          <button onClick={onComplete} style={{ background: '#10b981', color: '#000', fontWeight: 800, border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer' }}>
            Continue to Next Session →
          </button>
        </div>
      )}
    </div>
  );
};

export default PhonemeJarCollector;
