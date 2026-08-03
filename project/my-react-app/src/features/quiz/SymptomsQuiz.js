import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import './SymptomsQuiz.css';

// ─────────────────────────────────────────────────────────────────
// QUESTION BANK — each question is tagged with the exercise domains
// it signals, enabling fine-grained exercise prioritization.
// ─────────────────────────────────────────────────────────────────
const masterQuestionsPool = [
  { id: 1,  text: "Has difficulty reading unfamiliar words and often guesses at them.",         domains: ['phoneme', 'auditory'] },
  { id: 2,  text: "Pauses, repeats or makes frequent mistakes when reading aloud.",              domains: ['visual', 'phoneme'] },
  { id: 3,  text: "Mispronounces (or used to) only certain words (e.g., says 'amunul' for animal).", domains: ['phoneme', 'auditory'] },
  { id: 4,  text: "Struggles to remember the names of letters or their associated sounds.",     domains: ['phoneme', 'naming'] },
  { id: 5,  text: "Mixes up letters that look similar (e.g., b/d, p/q, n/u).",                 domains: ['visual', 'phoneme'] },
  { id: 6,  text: "Finds it difficult to learn nursery rhymes or play rhyming games.",          domains: ['phoneme', 'auditory'] },
  { id: 7,  text: "Takes a long time to finish reading or writing tasks compared to peers.",    domains: ['visual', 'naming'] },
  { id: 8,  text: "Avoids reading activities or expresses frustration when asked to read.",     domains: ['visual', 'phoneme'] },
  { id: 9,  text: "Has trouble following multi-step directions given verbally.",                domains: ['auditory', 'naming'] },
  { id: 10, text: "Displays excellent verbal ability but struggles to translate ideas to paper.", domains: ['morphology', 'phoneme'] },
  { id: 11, text: "Reverses numbers or letters when writing (e.g., writing 15 as 51).",         domains: ['visual', 'phoneme'] },
  { id: 12, text: "Struggles to organize written thoughts in a logical sequence.",              domains: ['morphology', 'naming'] },
  { id: 13, text: "Has difficulty remembering sequences like days of the week or months.",      domains: ['naming', 'auditory'] },
  { id: 14, text: "Finds spelling inconsistent, spelling the same word differently in one text.", domains: ['phoneme', 'morphology'] },
  { id: 15, text: "Complains that letters look blurred or move around on the page.",            domains: ['visual'] },
  { id: 16, text: "Has trouble distinguishing left from right quickly.",                        domains: ['visual', 'naming'] },
  { id: 17, text: "Struggles to tell time on an analog clock.",                                 domains: ['naming', 'visual'] },
  { id: 18, text: "Shows high intelligence and curiosity but unexpectedly low reading score.",  domains: ['phoneme', 'morphology'] },
  { id: 19, text: "Has difficulty summarizing a story after reading it independently.",         domains: ['morphology', 'auditory'] },
  { id: 20, text: "Tires quickly or gets headache/eye strain while reading continuous text.",   domains: ['visual'] },
];

// ─────────────────────────────────────────────────────────────────
// EXERCISE CATALOGUE — metadata for each therapy type
// ─────────────────────────────────────────────────────────────────
const EXERCISES = {
  phoneme: {
    id: 'phoneme',
    icon: '🧩',
    title: 'Phoneme Matching',
    subtitle: 'Sound-letter decoding drills',
    color: '#2563eb',
    bg: 'rgba(37,99,235,0.08)',
    border: 'rgba(37,99,235,0.25)',
    path: '/therapy/phoneme',
    description: 'Trains phonological awareness — the ability to break words into individual sounds. Critical for spelling and decoding.',
    targetSymptoms: ['Letter confusion', 'Mispronunciation', 'Rhyming difficulty', 'Inconsistent spelling'],
  },
  visual: {
    id: 'visual',
    icon: '👁️',
    title: 'Visual Tracking',
    subtitle: 'Ocular saccadic exercises',
    color: '#0d9488',
    bg: 'rgba(13,148,136,0.08)',
    border: 'rgba(13,148,136,0.25)',
    path: '/therapy/visual',
    description: 'Trains eye-muscle coordination to prevent letter reversal, line skipping, and visual fatigue during reading.',
    targetSymptoms: ['Letter reversal', 'Eye strain', 'Line skipping', 'Left/right confusion'],
  },
  auditory: {
    id: 'auditory',
    icon: '🎧',
    title: 'Auditory Processing',
    subtitle: 'Sound discrimination training',
    color: '#7c3aed',
    bg: 'rgba(124,58,237,0.08)',
    border: 'rgba(124,58,237,0.25)',
    path: '/therapy/auditory',
    description: 'Sharpens the brain\'s ability to distinguish fast-changing sounds — vital for spoken instruction comprehension.',
    targetSymptoms: ['Following verbal directions', 'Sound discrimination', 'Auditory memory'],
  },
  morphology: {
    id: 'morphology',
    icon: '🧬',
    title: 'Morphology Builder',
    subtitle: 'Word structure & comprehension',
    color: '#d97706',
    bg: 'rgba(217,119,6,0.08)',
    border: 'rgba(217,119,6,0.25)',
    path: '/therapy/morphology',
    description: 'Teaches roots, prefixes and suffixes so complex words can be decoded by their internal structure.',
    targetSymptoms: ['Writing organization', 'Comprehension gaps', 'Vocabulary building'],
  },
  naming: {
    id: 'naming',
    icon: '⚡',
    title: 'Rapid Naming (RAN)',
    subtitle: 'Processing speed exercises',
    color: '#e11d48',
    bg: 'rgba(225,29,72,0.08)',
    border: 'rgba(225,29,72,0.25)',
    path: '/therapy/naming',
    description: 'Boosts the speed of retrieving words, letters and numbers from memory — a key predictor of reading fluency.',
    targetSymptoms: ['Slow task completion', 'Sequence memory', 'Clock reading difficulty'],
  },
};

// ─────────────────────────────────────────────────────────────────
// ADAPTIVE ENGINE — localStorage-backed scoring that learns over
// time. Each time a user flags a domain, that domain accumulates
// weight. The engine blends the per-session score with the running
// aggregate so recommendations improve with usage.
// ─────────────────────────────────────────────────────────────────
const STORAGE_KEY = 'lexiflow_domain_weights';

function loadDomainWeights() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch {
    return {};
  }
}

function saveDomainWeights(weights) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(weights));
}

function computeRecommendations(questions, answers) {
  // 1. Tally domain scores from this session
  const sessionScores = { phoneme: 0, visual: 0, auditory: 0, morphology: 0, naming: 0 };
  questions.forEach(q => {
    if (answers[q.id] === 'yes') {
      q.domains.forEach(d => { sessionScores[d] = (sessionScores[d] || 0) + 1; });
    }
  });

  // 2. Load historical aggregate weights
  const historical = loadDomainWeights();

  // 3. Merge: session (70%) + historical aggregate (30%)
  const HISTORY_WEIGHT = 0.3;
  const SESSION_WEIGHT = 0.7;
  const merged = {};
  const allDomains = Object.keys(EXERCISES);
  allDomains.forEach(d => {
    const s = sessionScores[d] || 0;
    const h = historical[d] || 0;
    merged[d] = SESSION_WEIGHT * s + HISTORY_WEIGHT * h;
  });

  // 4. Update aggregate weights persistently (+= session scores)
  const updated = { ...historical };
  allDomains.forEach(d => {
    updated[d] = (updated[d] || 0) + (sessionScores[d] || 0);
  });
  saveDomainWeights(updated);

  // 5. Rank exercises by merged score, descending
  const ranked = allDomains
    .map(d => ({ domain: d, score: merged[d] }))
    .sort((a, b) => b.score - a.score);

  return { ranked, sessionScores };
}

function getRandomQuestions(count = 10) {
  const shuffled = [...masterQuestionsPool].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

// ─────────────────────────────────────────────────────────────────
// RISK GAUGE COMPONENT
// ─────────────────────────────────────────────────────────────────
const RiskGauge = ({ score, total }) => {
  const pct = Math.round((score / total) * 100);
  const angle = -90 + (pct / 100) * 180; // -90 to +90 degrees
  const color = pct >= 60 ? '#e11d48' : pct >= 30 ? '#d97706' : '#10b981';
  const label = pct >= 60 ? 'High' : pct >= 30 ? 'Moderate' : 'Low';

  return (
    <div className="risk-gauge-wrap">
      <svg viewBox="0 0 200 110" className="risk-gauge-svg">
        {/* Background arc */}
        <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="#e2e8f0" strokeWidth="16" strokeLinecap="round" />
        {/* Low zone */}
        <path d="M 20 100 A 80 80 0 0 1 70 31" fill="none" stroke="#10b981" strokeWidth="16" strokeLinecap="butt" opacity="0.3" />
        {/* Moderate zone */}
        <path d="M 70 31 A 80 80 0 0 1 130 31" fill="none" stroke="#d97706" strokeWidth="16" strokeLinecap="butt" opacity="0.3" />
        {/* High zone */}
        <path d="M 130 31 A 80 80 0 0 1 180 100" fill="none" stroke="#e11d48" strokeWidth="16" strokeLinecap="butt" opacity="0.3" />
        {/* Needle */}
        <line
          x1="100" y1="100"
          x2={100 + 65 * Math.cos((angle * Math.PI) / 180)}
          y2={100 + 65 * Math.sin((angle * Math.PI) / 180)}
          stroke={color} strokeWidth="3" strokeLinecap="round"
          style={{ transition: 'all 1s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
        />
        <circle cx="100" cy="100" r="6" fill={color} />
        {/* Score text */}
        <text x="100" y="88" textAnchor="middle" fontSize="18" fontWeight="900" fill={color}>{pct}%</text>
        <text x="100" y="108" textAnchor="middle" fontSize="10" fontWeight="700" fill="#64748b">{label} Risk</text>
      </svg>
      <div className="gauge-labels">
        <span style={{ color: '#10b981' }}>Low</span>
        <span style={{ color: '#d97706' }}>Moderate</span>
        <span style={{ color: '#e11d48' }}>High</span>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────
// EXERCISE CARD COMPONENT
// ─────────────────────────────────────────────────────────────────
const ExerciseCard = ({ exercise, rank, score, isTop }) => {
  const ex = EXERCISES[exercise.domain];
  if (!ex) return null;
  const hasSignal = score > 0;

  return (
    <div className={`ex-card ${isTop ? 'ex-card--top' : ''}`} style={{ borderColor: isTop ? ex.color : undefined }}>
      {isTop && <div className="ex-card-ribbon" style={{ background: ex.color }}>START HERE</div>}
      <div className="ex-card-header">
        <div className="ex-icon-wrap" style={{ background: ex.bg, color: ex.color }}>
          {ex.icon}
        </div>
        <div className="ex-card-meta">
          <div className="ex-card-rank" style={{ color: ex.color }}>
            {isTop ? '🥇 Priority #1' : `Priority #${rank}`}
          </div>
          <div className="ex-card-title">{ex.title}</div>
          <div className="ex-card-subtitle">{ex.subtitle}</div>
        </div>
        <div className="ex-signal-bar-wrap">
          <div className="ex-signal-label">Signal</div>
          <div className="ex-signal-bar">
            <div
              className="ex-signal-fill"
              style={{
                width: `${Math.min(100, score * 33)}%`,
                background: ex.color
              }}
            />
          </div>
          <div className="ex-signal-val" style={{ color: ex.color }}>
            {!hasSignal ? 'None' : score <= 1 ? 'Mild' : score <= 2 ? 'Moderate' : 'Strong'}
          </div>
        </div>
      </div>
      <p className="ex-card-desc">{ex.description}</p>
      <div className="ex-symptoms-wrap">
        {ex.targetSymptoms.map(s => (
          <span key={s} className="ex-symptom-chip" style={{ background: ex.bg, color: ex.color, borderColor: ex.border }}>{s}</span>
        ))}
      </div>
      {hasSignal ? (
        <Link to={ex.path} className="ex-start-btn" style={{ background: ex.color }}>
          Start {ex.title} →
        </Link>
      ) : (
        <Link to={ex.path} className="ex-start-btn ex-start-btn--ghost" style={{ borderColor: ex.color, color: ex.color }}>
          Explore {ex.title}
        </Link>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────
// DOMAIN BREAKDOWN BAR CHART
// ─────────────────────────────────────────────────────────────────
const DomainBreakdown = ({ sessionScores }) => {
  const max = Math.max(...Object.values(sessionScores), 1);
  return (
    <div className="domain-breakdown">
      <div className="breakdown-title">Symptom Domain Breakdown</div>
      {Object.entries(EXERCISES).map(([key, ex]) => {
        const val = sessionScores[key] || 0;
        const pct = Math.round((val / max) * 100);
        return (
          <div key={key} className="breakdown-row">
            <div className="breakdown-label">
              <span>{ex.icon}</span>
              <span>{ex.title}</span>
            </div>
            <div className="breakdown-bar-bg">
              <div
                className="breakdown-bar-fill"
                style={{ width: `${pct}%`, background: ex.color }}
              />
            </div>
            <div className="breakdown-val" style={{ color: ex.color }}>{val}</div>
          </div>
        );
      })}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────
// MAIN QUIZ COMPONENT
// ─────────────────────────────────────────────────────────────────
const SymptomsQuiz = () => {
  const [questions, setQuestions] = useState(() => getRandomQuestions(10));
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);

  const handleAnswer = (id, val) => {
    setAnswers(prev => ({ ...prev, [id]: val }));
  };

  const answeredCount = Object.keys(answers).length;
  const progress = Math.round((answeredCount / questions.length) * 100);

  const calculateResult = () => {
    if (answeredCount < questions.length) {
      alert(`Please answer all ${questions.length} questions. (${answeredCount} answered so far)`);
      return;
    }

    const yesCount = Object.values(answers).filter(a => a === 'yes').length;
    const { ranked, sessionScores } = computeRecommendations(questions, answers);

    const scorePercent = Math.round((yesCount / questions.length) * 100);
    const riskLevel = scorePercent >= 60 ? 'High' : scorePercent >= 30 ? 'Moderate' : 'Low';
    const category = `${riskLevel} Indicators`;

    // Save to lexiflow_history
    const now = new Date();
    const newEntry = {
      id: Date.now(),
      date: now.toLocaleDateString() + ' ' + now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isoDate: now.toISOString(),
      type: 'Symptoms Screening Quiz',
      score: scorePercent,
      riskLevel,
      status: 'Completed',
      details: { score: yesCount, total: questions.length, category, ranked }
    };
    const hist = JSON.parse(localStorage.getItem('lexiflow_history') || '[]');
    localStorage.setItem('lexiflow_history', JSON.stringify([newEntry, ...hist]));

    setResult({ yesCount, total: questions.length, scorePercent, riskLevel, ranked, sessionScores });
  };

  const resetQuiz = () => {
    setQuestions(getRandomQuestions(10));
    setAnswers({});
    setResult(null);
  };

  // ── RESULT SCREEN ──────────────────────────────────────────────
  if (result) {
    const topExercise = result.ranked[0];
    const otherExercises = result.ranked.slice(1);

    return (
      <div className="quiz-report-root">
        {/* Header */}
        <div className="report-header-band">
          <div className="report-header-left">
            <span className="report-badge">📋 Screening Complete</span>
            <h2 className="report-main-title">Your Personalised Report</h2>
            <p className="report-subtitle">
              Based on your {result.total} responses, our adaptive engine has analysed your symptom profile
              and ranked the most effective therapy exercises for you.
            </p>
          </div>
          <RiskGauge score={result.yesCount} total={result.total} />
        </div>

        {/* Adaptive learning notice */}
        <div className="adaptive-notice">
          <span className="adaptive-icon">🧠</span>
          <div>
            <strong>Adaptive Intelligence Active</strong>
            <span>
              This report learns from every screening session. Your recommendations will become more
              precise the more you use the app.
            </span>
          </div>
        </div>

        {/* Stats row */}
        <div className="report-stats-row">
          <div className="report-stat">
            <div className="report-stat-val" style={{ color: '#2563eb' }}>{result.yesCount}/{result.total}</div>
            <div className="report-stat-lbl">Indicators flagged</div>
          </div>
          <div className="report-stat">
            <div className="report-stat-val" style={{ color: result.riskLevel === 'High' ? '#e11d48' : result.riskLevel === 'Moderate' ? '#d97706' : '#10b981' }}>
              {result.riskLevel}
            </div>
            <div className="report-stat-lbl">Risk level</div>
          </div>
          <div className="report-stat">
            <div className="report-stat-val" style={{ color: '#7c3aed' }}>
              {result.ranked.filter(r => result.sessionScores[r.domain] > 0).length}
            </div>
            <div className="report-stat-lbl">Domains affected</div>
          </div>
          <div className="report-stat">
            <div className="report-stat-val" style={{ color: '#0d9488' }}>5</div>
            <div className="report-stat-lbl">Exercises available</div>
          </div>
        </div>

        {/* Primary exercise recommendation */}
        <div className="section-label">🥇 Recommended — Start Here</div>
        <ExerciseCard exercise={topExercise} rank={1} score={result.sessionScores[topExercise.domain] || 0} isTop />

        {/* Domain breakdown */}
        <DomainBreakdown sessionScores={result.sessionScores} />

        {/* Other exercises */}
        <div className="section-label">📚 Full Exercise Roadmap</div>
        <div className="ex-grid">
          {otherExercises.map((ex, i) => (
            <ExerciseCard
              key={ex.domain}
              exercise={ex}
              rank={i + 2}
              score={result.sessionScores[ex.domain] || 0}
              isTop={false}
            />
          ))}
        </div>

        {/* Actions */}
        <div className="report-actions">
          <button className="report-btn-retake" onClick={resetQuiz}>🔄 Retake Screening</button>
          <Link to="/signup" className="report-btn-account">Create Free Account →</Link>
        </div>
      </div>
    );
  }

  // ── QUIZ SCREEN ────────────────────────────────────────────────
  return (
    <div className="quiz-list-container">
      <div className="quiz-header-bar">
        <h2>Dyslexia Symptoms Quiz</h2>
        <span className="page-counter">{answeredCount} / {questions.length} answered</span>
      </div>

      {/* Progress bar */}
      <div className="quiz-progress-wrap">
        <div className="quiz-progress-bar">
          <div className="quiz-progress-fill" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="quiz-body-content">
        <p className="instruction-text">Select whether each statement applies to you or your child.</p>

        <div className="questions-stack">
          {questions.map((q, idx) => (
            <div key={q.id} className="quiz-row">
              <p className="row-text">
                <span className="q-num">{idx + 1}.</span> {q.text}
              </p>
              <div className="row-options">
                <button
                  className={`row-btn ${answers[q.id] === 'yes' ? 'selected-yes' : ''}`}
                  onClick={() => handleAnswer(q.id, 'yes')}
                >
                  ✓ Yes
                </button>
                <button
                  className={`row-btn ${answers[q.id] === 'no' ? 'selected-no' : ''}`}
                  onClick={() => handleAnswer(q.id, 'no')}
                >
                  ✗ No
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="quiz-footer">
          <div className="quiz-completion-hint">
            {answeredCount < questions.length
              ? `${questions.length - answeredCount} question${questions.length - answeredCount !== 1 ? 's' : ''} remaining`
              : '✅ All answered — ready to generate your report!'}
          </div>
          <button
            className={`medical-btn-primary finish-btn ${answeredCount < questions.length ? 'btn-disabled-look' : ''}`}
            onClick={calculateResult}
          >
            Generate My Report →
          </button>
        </div>
      </div>
    </div>
  );
};

export default SymptomsQuiz;
