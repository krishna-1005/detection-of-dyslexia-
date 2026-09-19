import React, { useState, useRef, useEffect, useCallback } from 'react';
import useSpeechAlignment from './hooks/useSpeechAlignment';
import { useAuth } from '../auth/AuthContext';
import { saveTherapyProgress } from './ExerciseSystem';
import './VideoPractice.css';

const masterSentences = [
  "The sun is bright and warm today.",
  "I like to read books about space.",
  "Learning new things makes me happy.",
  "Practice helps me get better every day.",
  "Clear blue sky brings joy and peace.",
  "Stars glow brightly in the dark night sky."
];

const getRandomSentences = (count = 4) => {
  const shuffled = [...masterSentences].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
};

const LiveReadingHighlight = ({ onComplete }) => {
  const { currentUser } = useAuth();

  const [sentences, setSentences] = useState(() => getRandomSentences(4));
  const [currentSentenceIdx, setCurrentSentenceIdx] = useState(0);
  const [stream, setStream] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [sessionTime, setSessionTime] = useState(0);
  const [sentenceReports, setSentenceReports] = useState({});
  const [isFinished, setIsFinished] = useState(false);

  const videoRef = useRef(null);
  const currentSentence = sentences[currentSentenceIdx];

  // Real-time speech alignment hook
  const {
    wordStatuses,
    currentWordIndex,
    isComplete,
    transcript,
    isListening,
    start: startAlignment,
    stop: stopAlignment,
    reset: resetAlignment
  } = useSpeechAlignment(currentSentence);

  // Timer effect
  useEffect(() => {
    let timer;
    if (isRecording && !isFinished) {
      timer = setInterval(() => {
        setSessionTime(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isRecording, isFinished]);

  // Video element stream assignment
  useEffect(() => {
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  // Auto-record current sentence report on completion or change
  useEffect(() => {
    if (wordStatuses.length > 0) {
      const correctCount = wordStatuses.filter(w => w.status === 'correct').length;
      const mispronounced = wordStatuses.filter(w => w.status === 'mispronounced');
      const acc = Math.round((correctCount / wordStatuses.length) * 100);

      setSentenceReports(prev => ({
        ...prev,
        [currentSentenceIdx]: {
          sentence: currentSentence,
          transcript,
          wordStatuses,
          accuracy: acc,
          correctCount,
          totalWords: wordStatuses.length,
          mispronounced
        }
      }));
    }
  }, [wordStatuses, currentSentenceIdx, currentSentence, transcript]);

  // Auto-advance on sentence completion after short delay
  useEffect(() => {
    if (isComplete && isRecording && !isFinished) {
      const timer = setTimeout(() => {
        if (currentSentenceIdx < sentences.length - 1) {
          handleNextSentence();
        } else {
          finishSession();
        }
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [isComplete, isRecording, isFinished, currentSentenceIdx, sentences.length]);

  const startCamera = async () => {
    try {
      let mediaStream = null;
      try {
        mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      } catch (camErr) {
        mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      }
      setStream(mediaStream);
      setIsRecording(true);
      startAlignment();
    } catch (err) {
      console.warn("Camera/Mic access error:", err);
      setIsRecording(true);
      startAlignment();
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(t => t.stop());
      setStream(null);
    }
    setIsRecording(false);
    stopAlignment();
  };

  const handleNextSentence = () => {
    if (currentSentenceIdx < sentences.length - 1) {
      setCurrentSentenceIdx(prev => prev + 1);
      resetAlignment();
      setTimeout(() => startAlignment(), 200);
    } else {
      finishSession();
    }
  };

  const handlePrevSentence = () => {
    if (currentSentenceIdx > 0) {
      setCurrentSentenceIdx(prev => prev - 1);
      resetAlignment();
      setTimeout(() => startAlignment(), 200);
    }
  };

  const finishSession = async () => {
    setIsFinished(true);
    stopCamera();

    let totalWords = 0;
    let totalCorrect = 0;
    sentences.forEach((s, idx) => {
      const r = sentenceReports[idx];
      totalWords += s.split(/\s+/).length;
      if (r) totalCorrect += r.correctCount || 0;
    });

    const overallAcc = totalWords > 0 ? Math.round((totalCorrect / totalWords) * 100) : 100;
    await saveTherapyProgress(currentUser, 'video', Math.round(overallAcc * 3), overallAcc, `${sessionTime}s`);
  };

  const totalWordsSum = sentences.join(' ').split(/\s+/).length;
  const totalCorrectSum = Object.values(sentenceReports).reduce((sum, r) => sum + (r.correctCount || 0), 0);
  const overallAccuracy = Math.round((totalCorrectSum / totalWordsSum) * 100) || 0;

  return (
    <div className="exercise-session live-practice">
      {!isFinished ? (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3>🎤 Real-Time Karaoke Reading Highlight</h3>
            {isRecording && (
              <div className="recording-indicator">
                <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: isListening ? '#10b981' : '#f43f5e', marginRight: '4px' }}></span>
                {isListening ? '🎤 MIC ACTIVE' : '● REC'} ({sessionTime}s)
              </div>
            )}
          </div>

          <p className="exercise-desc">
            Read the sentence aloud. As you speak each word into your mic, it will light up in real time with Karaoke-style highlighting!
          </p>

          <div className="live-practice-grid">
            {/* Webcam feed */}
            <div className="webcam-container">
              {!stream && !isRecording ? (
                <div className="camera-setup">
                  <span style={{ fontSize: '3.5rem' }}>📹</span>
                  <button
                    className="btn-run"
                    onClick={startCamera}
                    style={{ background: 'linear-gradient(135deg, #2563eb 0%, #0d9488 100%)', padding: '0.85rem 1.75rem', fontSize: '0.95rem', borderRadius: '10px' }}
                  >
                    🎥 Activate Camera & Start Voice Reading
                  </button>
                </div>
              ) : (
                <>
                  {stream ? (
                    <video ref={videoRef} autoPlay muted playsInline className="webcam-feed" />
                  ) : (
                    <div className="camera-setup" style={{ background: 'rgba(15, 23, 42, 0.95)', color: '#ffffff' }}>
                      <span style={{ fontSize: '3.5rem' }}>🎤</span>
                      <p style={{ margin: 0, fontWeight: 700 }}>Karaoke Voice Practice Active (Audio Only)</p>
                    </div>
                  )}

                  <div className="live-transcript-overlay">
                    <div className={`feedback-badge ${isListening ? 'success' : 'neutral'}`}>
                      {isListening ? '🎤 Listening for your voice...' : 'Press Start to begin'}
                    </div>
                    {transcript && <p className="live-text">🎤 Spoken: "{transcript}"</p>}
                  </div>
                </>
              )}
            </div>

            {/* Karaoke Word Display Card */}
            <div className="practice-material">
              <div className="sentence-card" style={{ padding: '1.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <small>SENTENCE {currentSentenceIdx + 1}/{sentences.length}</small>
                  {isComplete && <span className="badge badge-low">✅ Sentence Complete!</span>}
                </div>

                {/* Real-time Karaoke word tiles */}
                <div className="interactive-sentence-words" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', fontSize: '1.35rem', fontWeight: 700, lineHeight: '1.8' }}>
                  {wordStatuses.map((item, idx) => {
                    const isPending = item.status === 'pending';
                    const isActive = item.status === 'active';
                    const isCorrect = item.status === 'correct';
                    const isMispronounced = item.status === 'mispronounced';

                    return (
                      <span
                        key={idx}
                        className={`karaoke-word ${item.status}`}
                        style={{
                          padding: '4px 10px',
                          borderRadius: '8px',
                          transition: 'all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
                          background: isCorrect ? '#10b981' : isMispronounced ? '#f43f5e' : isActive ? '#3b82f6' : 'rgba(0, 0, 0, 0.04)',
                          color: isCorrect || isMispronounced || isActive ? '#ffffff' : 'var(--lf-text-muted)',
                          transform: isActive ? 'scale(1.12)' : 'scale(1)',
                          boxShadow: isActive ? '0 0 16px rgba(59, 130, 246, 0.5)' : isCorrect ? '0 2px 8px rgba(16, 185, 129, 0.3)' : 'none',
                          border: isActive ? '2px solid #60a5fa' : '1px solid transparent'
                        }}
                      >
                        {item.word}
                        {isCorrect && ' ✓'}
                        {isMispronounced && ' ❌'}
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* Navigation controls */}
              <div className="practice-nav" style={{ marginTop: '1rem' }}>
                <button disabled={currentSentenceIdx === 0} onClick={handlePrevSentence}>
                  Previous
                </button>
                <button className="btn-primary" onClick={handleNextSentence}>
                  {currentSentenceIdx === sentences.length - 1 ? "Finish & View Report →" : "Next Sentence →"}
                </button>
              </div>
            </div>
          </div>

          <div className="live-controls">
            {!stream && !isRecording ? (
              <button className="btn-primary" onClick={startCamera} style={{ padding: '0.75rem 1.75rem', fontWeight: 700 }}>
                🎥 Activate Camera & Start Voice Reading
              </button>
            ) : (
              <button
                className={`record-toggle ${isRecording ? 'active' : ''}`}
                onClick={() => {
                  if (isRecording) {
                    stopCamera();
                  } else {
                    setIsRecording(true);
                    startAlignment();
                  }
                }}
              >
                {isRecording ? "⏹ Pause Voice Practice" : "⏺ Resume Voice Practice"}
              </button>
            )}
            <button className="btn-text" onClick={finishSession}>View Final Oral Reading Report</button>
          </div>
        </>
      ) : (
        /* Completion Report */
        <div className="oral-report-container" style={{ background: '#ffffff', padding: '2rem', borderRadius: '16px', border: '1px solid var(--lf-border)', boxShadow: 'var(--lf-shadow-md)' }}>
          <header style={{ borderBottom: '2px solid var(--lf-border)', paddingBottom: '1rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span className="badge badge-info" style={{ marginBottom: '0.4rem' }}>📊 Karaoke Speech Alignment Report</span>
              <h2 style={{ fontSize: '1.6rem', fontWeight: 800, margin: 0, color: 'var(--lf-text-primary)' }}>Live Speech & Word Fluency Analysis</h2>
              <small style={{ color: 'var(--lf-text-muted)' }}>Session duration: {sessionTime} seconds</small>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '2rem', fontWeight: 900, color: overallAccuracy >= 70 ? '#10b981' : '#f59e0b' }}>{overallAccuracy}%</div>
              <small style={{ color: 'var(--lf-text-muted)', fontWeight: 700 }}>Alignment Accuracy</small>
            </div>
          </header>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', marginBottom: '1.75rem' }}>
            <div style={{ background: 'rgba(16, 185, 129, 0.08)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(16, 185, 129, 0.25)', textAlign: 'center' }}>
              <span style={{ fontSize: '1.5rem' }}>✅</span>
              <strong style={{ display: 'block', fontSize: '1.4rem', fontWeight: 800, color: '#10b981' }}>{totalCorrectSum} / {totalWordsSum}</strong>
              <small style={{ color: 'var(--lf-text-muted)', fontWeight: 600 }}>Words Aligned & Spoken Correctly</small>
            </div>
            <div style={{ background: 'rgba(37, 99, 235, 0.08)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(37, 99, 235, 0.25)', textAlign: 'center' }}>
              <span style={{ fontSize: '1.5rem' }}>⏱️</span>
              <strong style={{ display: 'block', fontSize: '1.4rem', fontWeight: 800, color: '#3b82f6' }}>{sentences.length} Sentences</strong>
              <small style={{ color: 'var(--lf-text-muted)', fontWeight: 600 }}>Read in Karaoke Real-Time Mode</small>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
            <button className="btn-secondary" onClick={() => { setSentences(getRandomSentences(4)); setIsFinished(false); setCurrentSentenceIdx(0); setSentenceReports({}); setSessionTime(0); }}>
              🔄 Practice New Sentences
            </button>
            <button className="btn-primary" style={{ padding: '0.75rem 1.75rem', fontWeight: 700 }} onClick={onComplete}>
              Complete & View Dashboard →
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default LiveReadingHighlight;
