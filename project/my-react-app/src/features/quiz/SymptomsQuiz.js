import React, { useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { saveTherapyProgress } from '../therapy/ExerciseSystem';
import './SymptomsQuiz.css';

// ─────────────────────────────────────────────────────────────────
// SUBTYPE DEFINITIONS & MAPPINGS
// ─────────────────────────────────────────────────────────────────
export const SUBTYPES = {
  dysphonetic: {
    id: 'dysphonetic',
    name: 'Dysphonetic Dyslexia',
    label: 'Phonological Decoding Subtype',
    icon: '🧩',
    color: '#2563eb',
    bg: 'rgba(37,99,235,0.08)',
    exerciseId: 'phoneme',
    exerciseTitle: 'Sound-Blast Cannon',
    exercisePath: '/therapy/phoneme?mode=advanced',
    description: 'Difficulty breaking words into individual phonetic sounds (grapheme-to-phoneme conversion).'
  },
  dyseidetic: {
    id: 'dyseidetic',
    name: 'Dyseidetic Dyslexia',
    label: 'Surface / Orthographic Subtype',
    icon: '🧬',
    color: '#d97706',
    bg: 'rgba(217,119,6,0.08)',
    exerciseId: 'morphology',
    exerciseTitle: 'Morph-Bot Builder',
    exercisePath: '/therapy/morphology?mode=advanced',
    description: 'Struggles with visual word memory and sight-word recognition of irregular spellings.'
  },
  ran: {
    id: 'ran',
    name: 'Rapid Naming (RAN) Deficit',
    label: 'Cognitive Processing Speed Subtype',
    icon: '⚡',
    color: '#e11d48',
    bg: 'rgba(225,29,72,0.08)',
    exerciseId: 'naming',
    exerciseTitle: 'Speed-Dash Runner',
    exercisePath: '/therapy/naming?mode=advanced',
    description: 'Delayed retrieval speed for visual symbols, letters, digits, and familiar object names.'
  },
  visual: {
    id: 'visual',
    name: 'Visual-Perceptual Dyslexia',
    label: 'Ocular-Motor Tracking Subtype',
    icon: '👁️',
    color: '#0d9488',
    bg: 'rgba(13,148,136,0.08)',
    exerciseId: 'visual',
    exerciseTitle: 'Gaze-Laser Mission',
    exercisePath: '/therapy/visual?mode=advanced',
    description: 'Eye muscle coordination challenges causing letter inversions, line skipping, and visual fatigue.'
  },
  auditory: {
    id: 'auditory',
    name: 'Auditory Processing Deficit',
    label: 'Acoustic Signal Modulation Subtype',
    icon: '🎧',
    color: '#7c3aed',
    bg: 'rgba(124,58,237,0.08)',
    exerciseId: 'auditory',
    exerciseTitle: 'Acoustic Shield',
    exercisePath: '/therapy/auditory?mode=advanced',
    description: 'Difficulty isolating target speech signals in ambient noise or matching subtle sound frequencies.'
  }
};

// ─────────────────────────────────────────────────────────────────
// 10 DIAGNOSTIC QUESTIONS BANK (2 per Subtype)
// ─────────────────────────────────────────────────────────────────
const DIAGNOSTIC_QUESTIONS = [
  // ── DYSPHONETIC (Phonological) ──
  {
    id: 'q1',
    subtype: 'dysphonetic',
    title: 'Q1: Phoneme Isolation Test',
    instruction: 'Identify which of the following words contains the ending phoneme sound "/ck/" as in "Duck"?',
    type: 'choice',
    options: ['Clock', 'Pen', 'Ring', 'Duck'],
    correct: ['Clock', 'Duck'], // Either contains /ck/
    explanation: 'Both "Clock" and "Duck" contain the hard /ck/ phonetic sound.'
  },
  {
    id: 'q2',
    subtype: 'dysphonetic',
    title: 'Q2: Acoustic Decoding Test',
    instruction: 'Select the non-word spelling that accurately matches the spoken sound "/ch-op/":',
    type: 'choice',
    options: ['Chop', 'Kop', 'Tzop', 'Qop'],
    correct: ['Chop'],
    explanation: 'The digraph "Ch" corresponds to the /ch/ sound in acoustic decoding.'
  },

  // ── DYSEIDETIC (Surface / Orthographic) ──
  {
    id: 'q3',
    subtype: 'dyseidetic',
    title: 'Q3: Sight Word Recognition (Flash Test)',
    instruction: 'A sight word will flash for 800ms. Select the word that was displayed!',
    type: 'flash',
    flashWord: 'Yacht',
    options: ['Yacht', 'Yachting', 'Yatch', 'Yat'],
    correct: ['Yacht'],
    explanation: 'Irregular words like "Yacht" require orthographic visual memory.'
  },
  {
    id: 'q4',
    subtype: 'dyseidetic',
    title: 'Q4: Orthographic Pattern Match',
    instruction: 'Choose the correct visual spelling for the target word:',
    type: 'choice',
    options: ['Friend', 'Frend', 'Freind', 'Phriend'],
    correct: ['Friend'],
    explanation: '"Friend" follows the irregular "i before e" visual orthographic rule.'
  },

  // ── RAPID NAMING (RAN) ──
  {
    id: 'q5',
    subtype: 'ran',
    title: 'Q5: Symbol Retrieval Speed',
    instruction: 'Name the displayed symbols aloud as fast as possible. Click "Start Timer", then "Done" when named!',
    type: 'latency',
    symbols: ['A', '7', 'B', '3'],
    targetMaxMs: 2500,
    explanation: 'Rapid symbol retrieval measures phonological retrieval speed.'
  },
  {
    id: 'q6',
    subtype: 'ran',
    title: 'Q6: Object Naming Latency',
    instruction: 'Identify and name these 4 visual icons in order as fast as possible:',
    type: 'latency',
    symbols: ['🍎', '🐶', '⭐', '🚗'],
    targetMaxMs: 2200,
    explanation: 'Object naming speed predicts continuous reading fluency.'
  },

  // ── VISUAL-PERCEPTUAL (Ocular-Motor) ──
  {
    id: 'q7',
    subtype: 'visual',
    title: 'Q7: Spatial Orientation & Letter Inversion',
    instruction: 'Which pair of letters contains a flipped or reversed letter anomaly?',
    type: 'choice',
    options: ['b — d', 'p — q', 'b — b', 'n — u'],
    correct: ['b — d'],
    explanation: '"b" and "d" are horizontal mirror inversions frequently confused in ocular tracking.'
  },
  {
    id: 'q8',
    subtype: 'visual',
    title: 'Q8: Line Tracking Anomaly Detection',
    instruction: 'Read the text below and click where the sentence skipped a line incorrectly:',
    type: 'linetrack',
    textLine1: 'The brave little dog jumped over the tall wooden fence.',
    textLine2: 'and ran straight into the muddy garden puddle happily.',
    options: ['Line 1 (dog jumped)', 'Line 2 (ran straight)', 'Line Skip Anomaly at "and ran"'],
    correct: ['Line Skip Anomaly at "and ran"'],
    explanation: 'Line tracking tests evaluate ocular saccadic movements across line breaks.'
  },

  // ── AUDITORY PROCESSING ──
  {
    id: 'q9',
    subtype: 'auditory',
    title: 'Q9: Noise Discrimination Test',
    instruction: 'Listen to the audio sound under ambient background noise (-10dB SNR) and select the word spoken:',
    type: 'auditory_noise',
    audioText: 'Sun',
    options: ['Sun', 'Moon', 'Star', 'Cloud'],
    correct: ['Sun'],
    explanation: 'Background noise discrimination tests auditory signal isolation.'
  },
  {
    id: 'q10',
    subtype: 'auditory',
    title: 'Q10: Auditory Frequency Match',
    instruction: 'Listen to Tone 1 and Tone 2. Do the two target phoneme frequencies match?',
    type: 'auditory_match',
    tone1: 'B',
    tone2: 'B',
    options: ['Yes, Tones Match', 'No, Tones Differ'],
    correct: ['Yes, Tones Match'],
    explanation: 'Pitch discrimination tests rapid temporal processing in the auditory cortex.'
  }
];

// ─────────────────────────────────────────────────────────────────
// MAIN DIAGNOSTIC QUIZ COMPONENT
// ─────────────────────────────────────────────────────────────────
const SymptomsQuiz = ({ onQuizComplete }) => {
  const { currentUser } = useAuth();

  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState({});
  const [latencies, setLatencies] = useState({});
  const [flashVisible, setFlashVisible] = useState(false);
  const [flashStarted, setFlashStarted] = useState(false);
  const [timerStart, setTimerStart] = useState(null);
  const [isCompleted, setIsCompleted] = useState(false);
  const [diagnosticResult, setDiagnosticResult] = useState(null);

  const currentQ = DIAGNOSTIC_QUESTIONS[currentIdx];
  const progress = Math.round(((currentIdx + 1) / DIAGNOSTIC_QUESTIONS.length) * 100);

  // ── Handle Flash Word Test ──
  const startFlashTest = () => {
    setFlashStarted(true);
    setFlashVisible(true);
    setTimeout(() => {
      setFlashVisible(false);
    }, 800);
  };

  // ── Handle Latency Timer Test ──
  const startLatencyTimer = () => {
    setTimerStart(performance.now());
  };

  const stopLatencyTimer = () => {
    if (!timerStart) return;
    const elapsed = Math.round(performance.now() - timerStart);
    setLatencies(prev => ({ ...prev, [currentQ.id]: elapsed }));
    const isPassed = elapsed <= currentQ.targetMaxMs;
    handleAnswer(currentQ.id, isPassed ? currentQ.symbols.join(' ') : 'slow', isPassed);
    setTimerStart(null);
  };

  // ── Handle Answer Selection ──
  const handleAnswer = (qId, selectedVal, isCorrectVal = null) => {
    const q = DIAGNOSTIC_QUESTIONS.find(item => item.id === qId);
    const isCorrect = isCorrectVal !== null
      ? isCorrectVal
      : q.correct.includes(selectedVal);

    setAnswers(prev => ({
      ...prev,
      [qId]: { selectedVal, isCorrect, subtype: q.subtype }
    }));
  };

  const nextQuestion = () => {
    if (currentIdx < DIAGNOSTIC_QUESTIONS.length - 1) {
      setCurrentIdx(currentIdx + 1);
      setFlashStarted(false);
      setFlashVisible(false);
      setTimerStart(null);
    } else {
      finishDiagnostic();
    }
  };

  // ── Play Speech Utterance ──
  const playAudioUtterance = (text) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const ut = new SpeechSynthesisUtterance(text);
      ut.rate = 0.85;
      window.speechSynthesis.speak(ut);
    }
  };

  // ── Finish & Compute Subtype Diagnostics ──
  const finishDiagnostic = async () => {
    // 1. Calculate scores per subtype (2 questions each = max 2 points)
    const subtypeScoresRaw = {
      dysphonetic: 0,
      dyseidetic: 0,
      ran: 0,
      visual: 0,
      auditory: 0
    };

    Object.values(answers).forEach(ans => {
      if (ans.isCorrect && subtypeScoresRaw[ans.subtype] !== undefined) {
        subtypeScoresRaw[ans.subtype] += 1;
      }
    });

    // Convert raw (0-2) to percentage (0-100%)
    const scores = {
      dysphonetic: Math.round((subtypeScoresRaw.dysphonetic / 2) * 100),
      dyseidetic: Math.round((subtypeScoresRaw.dyseidetic / 2) * 100),
      ran: Math.round((subtypeScoresRaw.ran / 2) * 100),
      visual: Math.round((subtypeScoresRaw.visual / 2) * 100),
      auditory: Math.round((subtypeScoresRaw.auditory / 2) * 100)
    };

    // Find primary subtype (lowest score = highest deficit)
    let minScore = 101;
    let primarySubtypeKey = 'dysphonetic';
    Object.entries(scores).forEach(([key, scoreVal]) => {
      if (scoreVal < minScore) {
        minScore = scoreVal;
        primarySubtypeKey = key;
      }
    });

    const primarySubtypeObj = SUBTYPES[primarySubtypeKey];
    const totalCorrect = Object.values(answers).filter(a => a.isCorrect).length;
    const overallAccuracy = Math.round((totalCorrect / DIAGNOSTIC_QUESTIONS.length) * 100);
    const overallScore = totalCorrect * 100;

    const report = {
      id: Date.now(),
      date: new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      timestamp: Date.now(),
      overallAccuracy,
      overallScore,
      scores,
      primarySubtype: primarySubtypeKey,
      primarySubtypeDetails: primarySubtypeObj,
      answers
    };

    // Save to lexiflow_diagnostic_reports
    try {
      const existingReports = JSON.parse(localStorage.getItem('lexiflow_diagnostic_reports') || '[]');
      localStorage.setItem('lexiflow_diagnostic_reports', JSON.stringify([report, ...existingReports]));
    } catch (e) {
      console.warn('LocalStorage save report error:', e);
    }

    // Wire into saveTherapyProgress
    await saveTherapyProgress(
      currentUser,
      primarySubtypeObj.exerciseId,
      overallScore,
      overallAccuracy,
      'Diagnostic Quiz'
    );

    setDiagnosticResult(report);
    setIsCompleted(true);

    if (onQuizComplete) {
      onQuizComplete(report);
    }
  };

  if (isCompleted && diagnosticResult) {
    return null; // Handled by QuizPage results view if present
  }

  const isCurrentAnswered = !!answers[currentQ.id];

  return (
    <div className="diag-quiz-container">
      {/* Header bar & Progress */}
      <div className="diag-quiz-header">
        <div className="diag-header-top">
          <span className="badge badge-info">
            {SUBTYPES[currentQ.subtype].icon} {SUBTYPES[currentQ.subtype].name}
          </span>
          <span className="diag-counter">
            Question {currentIdx + 1} of {DIAGNOSTIC_QUESTIONS.length}
          </span>
        </div>
        <div className="diag-progress-track">
          <div className="diag-progress-fill" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* Question Card */}
      <div className="diag-card">
        <h3 className="diag-card-title">{currentQ.title}</h3>
        <p className="diag-card-instruction">{currentQ.instruction}</p>

        {/* ── QUESTION TYPE: Flash Word ── */}
        {currentQ.type === 'flash' && (
          <div className="diag-interactive-box">
            {!flashStarted ? (
              <button className="diag-btn-hero" onClick={startFlashTest}>
                ⚡ Start 800ms Flash Test
              </button>
            ) : flashVisible ? (
              <div className="flash-word-display">{currentQ.flashWord}</div>
            ) : (
              <div className="flash-word-hidden">🔒 Word Hidden — Select What You Saw:</div>
            )}
          </div>
        )}

        {/* ── QUESTION TYPE: Latency Speed Test ── */}
        {currentQ.type === 'latency' && (
          <div className="diag-interactive-box">
            <div className="diag-symbols-row">
              {currentQ.symbols.map((sym, i) => (
                <span key={i} className="diag-symbol-chip">{sym}</span>
              ))}
            </div>
            <div style={{ marginTop: '1rem' }}>
              {!timerStart && !latencies[currentQ.id] && (
                <button className="diag-btn-hero" onClick={startLatencyTimer}>
                  ⏱️ Start Naming Timer
                </button>
              )}
              {timerStart && (
                <button className="diag-btn-hero" style={{ background: '#e11d48' }} onClick={stopLatencyTimer}>
                  ⏹️ Done Naming — Stop Timer
                </button>
              )}
              {latencies[currentQ.id] && (
                <div className="diag-latency-result">
                  ⚡ Response Latency: <strong>{latencies[currentQ.id]} ms</strong>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── QUESTION TYPE: Auditory Noise & Match ── */}
        {(currentQ.type === 'auditory_noise' || currentQ.type === 'auditory_match') && (
          <div className="diag-interactive-box">
            <button
              className="diag-btn-hero"
              onClick={() => playAudioUtterance(currentQ.audioText || `${currentQ.tone1} sound ${currentQ.tone2}`)}
            >
              🔊 Play Audio Target {-10 ? '(-10dB Noise)' : ''}
            </button>
          </div>
        )}

        {/* ── OPTIONS GRID ── */}
        {((currentQ.type !== 'flash' || (flashStarted && !flashVisible)) && currentQ.type !== 'latency') && (
          <div className="diag-options-grid">
            {currentQ.options.map((opt) => {
              const isSelected = answers[currentQ.id]?.selectedVal === opt;
              const isAns = answers[currentQ.id];
              const isCorrectOpt = isSelected && isAns?.isCorrect;
              const isIncorrectOpt = isSelected && !isAns?.isCorrect;

              return (
                <button
                  key={opt}
                  className={`diag-opt-btn ${isSelected ? 'selected' : ''} ${isCorrectOpt ? 'correct' : ''} ${isIncorrectOpt ? 'incorrect' : ''}`}
                  onClick={() => handleAnswer(currentQ.id, opt)}
                >
                  <span>{opt}</span>
                  {isCorrectOpt && <span>✅</span>}
                  {isIncorrectOpt && <span>❌</span>}
                </button>
              );
            })}
          </div>
        )}

        {/* Explanation hint */}
        {isCurrentAnswered && (
          <div className="diag-explanation">
            💡 {currentQ.explanation}
          </div>
        )}
      </div>

      {/* Footer Navigation */}
      <div className="diag-footer">
        <button
          className={`diag-btn-next ${!isCurrentAnswered ? 'disabled' : ''}`}
          disabled={!isCurrentAnswered}
          onClick={nextQuestion}
        >
          {currentIdx < DIAGNOSTIC_QUESTIONS.length - 1 ? 'Next Question →' : 'Generate Diagnostic Report 🚀'}
        </button>
      </div>
    </div>
  );
};

export default SymptomsQuiz;
