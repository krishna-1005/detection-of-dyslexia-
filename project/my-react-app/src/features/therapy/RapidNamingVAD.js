import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '../auth/AuthContext';
import { saveTherapyProgress } from './ExerciseSystem';

// ─────────────────────────────────────────────────────────────────
// RAN CATEGORY POOLS (reuse from ExerciseSystem)
// ─────────────────────────────────────────────────────────────────
const ranCategoryPools = [
  ['🍎', '🍌', '🍇', '🍊', '🍓', '🥝', '🫐', '🍍', '🍒', '🍉'],
  ['🐶', '🐱', '🦁', '🐯', '🐰', '🦊', '🐻', '🐼', '🐸', '🐵'],
  ['🔴', '🟦', '🟢', '🟡', '🟣', '🟠', '⭐', '🔺', '🔷', '🖤'],
  ['🚗', '🚕', '🚌', '🏎️', '🚓', '🚑', '🚒', '🚀', '🚁', '⛵'],
];

const shuffleArray = (arr) => {
  const n = [...arr];
  for (let i = n.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [n[i], n[j]] = [n[j], n[i]];
  }
  return n;
};

// ─────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────
// VAD CONFIG — Double-Gate System
// ─────────────────────────────────────────────────────────────────
const VAD_ONSET_THRESHOLD = 45;   // Volume Gate: 45/100 threshold to ignore breathing/room hum
const VAD_DURATION_GATE_MS = 300; // Duration Gate: Require continuous speech for 300ms
const VAD_OFFSET_THRESHOLD = 20;  // Offset threshold
const VAD_OFFSET_HOLD_MS = 450;   // Silence hold duration

// ─────────────────────────────────────────────────────────────────
// RAPID NAMING VAD COMPONENT
// ─────────────────────────────────────────────────────────────────
const RapidNamingVAD = ({ onComplete }) => {
  const { currentUser } = useAuth();

  const [items] = useState(() => {
    const pool = ranCategoryPools[Math.floor(Math.random() * ranCategoryPools.length)];
    return shuffleArray(pool);
  });

  const [phase, setPhase] = useState('READY'); // READY | RUNNING | FINISHED
  const [activeIdx, setActiveIdx] = useState(0);
  const [amplitude, setAmplitude] = useState(0);
  const [latencies, setLatencies] = useState([]); // ms per item
  const [itemStatus, setItemStatus] = useState([]); // 'pending' | 'active' | 'done'

  // Audio refs
  const audioCtxRef = useRef(null);
  const analyserRef = useRef(null);
  const streamRef = useRef(null);
  const animFrameRef = useRef(null);

  // VAD refs
  const highlightTimeRef = useRef(null); // when the icon was highlighted
  const isSpeakingRef = useRef(false);
  const silenceTimerRef = useRef(null);
  const speechOnsetTimerRef = useRef(null);
  const speechStartTimeRef = useRef(null);
  const activeIdxRef = useRef(0);
  const latenciesRef = useRef([]);
  const phaseRef = useRef('READY');

  // Keep refs in sync
  useEffect(() => { activeIdxRef.current = activeIdx; }, [activeIdx]);
  useEffect(() => { phaseRef.current = phase; }, [phase]);

  // ── Initialize mic + analyser ──
  const startMic = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }, video: false,
      });
      streamRef.current = stream;

      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const audioCtx = new AudioCtx();
      if (audioCtx.state === 'suspended') {
        await audioCtx.resume();
      }
      audioCtxRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 128;
      analyser.smoothingTimeConstant = 0.75;
      analyserRef.current = analyser;
      source.connect(analyser);

      const bufLen = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufLen);

      // VAD pump loop with Double-Gate (Volume 45 + Duration 300ms)
      const pump = () => {
        if (phaseRef.current === 'FINISHED') return;
        animFrameRef.current = requestAnimationFrame(pump);
        analyser.getByteFrequencyData(dataArray);

        let sumSquares = 0;
        for (let i = 0; i < bufLen; i++) {
          const normVal = dataArray[i] / 255;
          sumSquares += normVal * normVal;
        }
        const rms = Math.sqrt(sumSquares / bufLen);
        const norm = Math.min(100, Math.round(rms * 250));
        setAmplitude(norm);

        if (phaseRef.current !== 'RUNNING') return;

        // Gate 1: Volume Gate (norm >= 45)
        if (norm >= VAD_ONSET_THRESHOLD) {
          if (!isSpeakingRef.current) {
            // Start 300ms Duration Gate timer
            if (!speechStartTimeRef.current) {
              speechStartTimeRef.current = performance.now();
            }
            const elapsedAboveGate = performance.now() - speechStartTimeRef.current;
            if (elapsedAboveGate >= VAD_DURATION_GATE_MS) {
              // Both Volume Gate (>=45) and Duration Gate (>=300ms) passed!
              isSpeakingRef.current = true;
              const latency = highlightTimeRef.current
                ? Math.round(speechStartTimeRef.current - highlightTimeRef.current)
                : 0;

              latenciesRef.current = [...latenciesRef.current, Math.max(100, latency)];
              setLatencies([...latenciesRef.current]);

              if (silenceTimerRef.current) {
                clearTimeout(silenceTimerRef.current);
                silenceTimerRef.current = null;
              }
            }
          }
        } else {
          // Reset duration gate if volume drops below 45 before reaching 300ms
          if (!isSpeakingRef.current) {
            speechStartTimeRef.current = null;
          }
        }

        if (isSpeakingRef.current && norm < VAD_OFFSET_THRESHOLD) {
          // Potential speech offset — wait for sustained silence
          if (!silenceTimerRef.current) {
            silenceTimerRef.current = setTimeout(() => {
              isSpeakingRef.current = false;
              speechStartTimeRef.current = null;
              silenceTimerRef.current = null;
              advanceToNextItem();
            }, VAD_OFFSET_HOLD_MS);
          }
        } else if (isSpeakingRef.current && norm >= VAD_OFFSET_THRESHOLD) {
          // Still speaking — clear the silence timer
          if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
            silenceTimerRef.current = null;
          }
        }
      };

      pump();
    } catch (err) {
      console.warn('Mic access failed:', err);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const advanceToNextItem = useCallback(() => {
    const nextIdx = activeIdxRef.current + 1;

    setItemStatus((prev) => {
      const n = [...prev];
      n[activeIdxRef.current] = 'done';
      if (nextIdx < items.length) n[nextIdx] = 'active';
      return n;
    });

    if (nextIdx >= items.length) {
      setPhase('FINISHED');
      phaseRef.current = 'FINISHED';
      return;
    }

    setActiveIdx(nextIdx);
    activeIdxRef.current = nextIdx;
    highlightTimeRef.current = performance.now();
  }, [items.length]);

  // ── Stop mic ──
  const stopMic = useCallback(() => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
      audioCtxRef.current.close();
    }
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
  }, []);

  // Cleanup
  useEffect(() => () => stopMic(), [stopMic]);

  // ── Start the test ──
  const startTest = async () => {
    latenciesRef.current = [];
    setLatencies([]);
    setActiveIdx(0);
    activeIdxRef.current = 0;
    setItemStatus(items.map((_, i) => (i === 0 ? 'active' : 'pending')));
    isSpeakingRef.current = false;

    await startMic();

    setPhase('RUNNING');
    phaseRef.current = 'RUNNING';
    highlightTimeRef.current = performance.now();
  };

  // ── Finish & save ──
  const finishSession = async () => {
    stopMic();
    const avgLatency = latencies.length > 0
      ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length)
      : 0;
    const score = Math.max(0, Math.round(1000 - avgLatency));
    await saveTherapyProgress(currentUser, 'naming', score, 100, `Avg: ${avgLatency}ms`);
    if (onComplete) onComplete();
  };

  // Stats
  const avgLatency = latencies.length > 0 ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length) : 0;
  const minLatency = latencies.length > 0 ? Math.min(...latencies) : 0;
  const maxLatency = latencies.length > 0 ? Math.max(...latencies) : 0;
  const maxBar = maxLatency || 1;

  return (
    <div className="exercise-session" style={{ background: '#0c0e1a', color: '#f3f4f6', padding: '2rem', borderRadius: '16px' }}>
      <h3 style={{ color: 'var(--lf-primary)' }}>⚡ Rapid Naming — Voice Activity Detection</h3>
      <p className="exercise-desc" style={{ color: '#94a3b8' }}>
        Name each icon aloud as fast as you can. The AI detects your voice automatically and measures reaction time per item.
      </p>

      {/* Amplitude meter */}
      {phase === 'RUNNING' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1rem', padding: '12px 18px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
          <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>Voice Level</span>
          <div style={{ flex: 1, height: '12px', background: 'rgba(0,0,0,0.5)', borderRadius: '6px', overflow: 'hidden', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.5)' }}>
            <div style={{
              width: `${Math.max(5, amplitude)}%`, height: '100%', borderRadius: '6px',
              background: amplitude > VAD_ONSET_THRESHOLD ? 'linear-gradient(90deg, #10b981, #22d3ee)' : 'linear-gradient(90deg, #3b82f6, #8b5cf6)',
              boxShadow: amplitude > VAD_ONSET_THRESHOLD ? '0 0 10px #22d3ee' : 'none',
              transition: 'width 0.08s ease',
            }} />
          </div>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: amplitude > VAD_ONSET_THRESHOLD ? '#22d3ee' : '#94a3b8', minWidth: '55px', textShadow: amplitude > VAD_ONSET_THRESHOLD ? '0 0 8px #22d3ee' : 'none' }}>
            {amplitude > VAD_ONSET_THRESHOLD ? '🔊 Speaking' : '🔇 Silent'}
          </span>
        </div>
      )}

      {/* Icon strip */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px',
        margin: '2rem 0', padding: '1.5rem', background: 'rgba(255,255,255,0.02)', borderRadius: '20px',
        border: '1px solid rgba(255,255,255,0.05)', boxShadow: 'inset 0 0 20px rgba(0,0,0,0.5)',
      }}>
        {items.map((item, idx) => {
          const status = itemStatus[idx] || 'pending';
          const latency = latencies[idx];
          const isActive = status === 'active';
          const isDone = status === 'done';

          return (
            <div key={idx} style={{
              position: 'relative', textAlign: 'center', padding: '1rem 0.5rem',
              borderRadius: '16px', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              background: isActive ? 'rgba(34, 211, 238, 0.1)' : isDone ? 'rgba(132, 204, 22, 0.08)' : 'rgba(0,0,0,0.3)',
              border: `2px solid ${isActive ? '#22d3ee' : isDone ? '#84cc16' : 'rgba(255,255,255,0.1)'}`,
              boxShadow: isActive ? '0 0 25px rgba(34, 211, 238, 0.4)' : isDone ? '0 0 10px rgba(132, 204, 22, 0.1)' : 'none',
              transform: isActive ? 'scale(1.15)' : 'scale(1)',
              animation: isActive ? 'pulseGlow 1.5s infinite' : 'none',
            }}>
              <span style={{ fontSize: isActive ? '3rem' : '2.5rem', display: 'block', transition: 'font-size 0.3s ease' }}>{item}</span>
              {isDone && (
                <>
                  <span style={{ fontSize: '0.85rem', display: 'block', marginTop: '4px' }}>✅</span>
                  {latency !== undefined && (
                    <span className="latency-badge" style={{
                      position: 'absolute', top: '-12px', right: '-12px',
                      background: '#fbbf24',
                      color: '#000', fontSize: '0.75rem', fontWeight: 900,
                      padding: '4px 8px', borderRadius: '10px',
                      boxShadow: '0 4px 12px rgba(251, 191, 36, 0.4)',
                      border: '2px solid #fff'
                    }}>
                      {latency}ms
                    </span>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* Controls */}
      {phase === 'READY' && (
        <button className="btn-finish" onClick={startTest} style={{ alignSelf: 'center' }}>
          🎤 Start — Speak Each Icon Aloud
        </button>
      )}

      {/* Results panel */}
      {phase === 'FINISHED' && (
        <div style={{ animation: 'fadeInUp 0.4s ease' }}>
          <div className="exercise-completion-card" style={{ marginBottom: '1.5rem' }}>
            <div className="completion-trophy">⚡</div>
            <h4 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--lf-primary)', marginBottom: '0.5rem' }}>
              RAN Complete!
            </h4>
            <p style={{ color: 'var(--lf-text-muted)', fontSize: '0.95rem', marginBottom: '1rem' }}>
              You named {latencies.length} items. Average reaction: {avgLatency}ms
            </p>

            {/* Stats row */}
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
              <div style={{ background: 'rgba(16, 185, 129, 0.08)', padding: '0.75rem 1.25rem', borderRadius: '12px', border: '1px solid rgba(16, 185, 129, 0.2)', textAlign: 'center' }}>
                <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#10b981' }}>{minLatency}ms</div>
                <small style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--lf-text-muted)' }}>Fastest</small>
              </div>
              <div style={{ background: 'rgba(37, 99, 235, 0.08)', padding: '0.75rem 1.25rem', borderRadius: '12px', border: '1px solid rgba(37, 99, 235, 0.2)', textAlign: 'center' }}>
                <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#3b82f6' }}>{avgLatency}ms</div>
                <small style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--lf-text-muted)' }}>Average</small>
              </div>
              <div style={{ background: 'rgba(245, 158, 11, 0.08)', padding: '0.75rem 1.25rem', borderRadius: '12px', border: '1px solid rgba(245, 158, 11, 0.2)', textAlign: 'center' }}>
                <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#f59e0b' }}>{maxLatency}ms</div>
                <small style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--lf-text-muted)' }}>Slowest</small>
              </div>
            </div>

            {/* Latency bar chart */}
            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', marginBottom: '1.5rem' }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>
                Per-Icon Latency Breakdown
              </span>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px', height: '80px', padding: '0 4px' }}>
                {latencies.map((lat, i) => (
                  <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                    <span style={{ fontSize: '0.6rem', fontWeight: 700, color: '#94a3b8' }}>{lat}</span>
                    <div style={{
                      width: '100%', borderRadius: '4px 4px 0 0',
                      height: `${Math.max(5, (lat / maxBar) * 60)}px`,
                      background: lat < 500 ? '#22d3ee' : lat < 1000 ? '#fbbf24' : '#f43f5e',
                      transition: 'height 0.3s ease',
                      boxShadow: `0 0 8px ${lat < 500 ? 'rgba(34,211,238,0.5)' : lat < 1000 ? 'rgba(251,191,36,0.5)' : 'rgba(244,63,94,0.5)'}`
                    }} />
                    <span style={{ fontSize: '1rem' }}>{items[i]}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button className="btn-secondary" onClick={() => { setPhase('READY'); setLatencies([]); setItemStatus([]); setActiveIdx(0); }}>
                🔄 Try Again
              </button>
              <button className="btn-finish" onClick={finishSession}>Complete & View Dashboard →</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RapidNamingVAD;
