import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../dashboard/Navbar';
import SymptomsQuiz, { SUBTYPES } from './SymptomsQuiz';
import './SymptomsQuiz.css';

const QuizPage = () => {
  const navigate = useNavigate();
  const [completedReport, setCompletedReport] = useState(null);

  // Load recent diagnostic report on mount if available
  useEffect(() => {
    try {
      const reports = JSON.parse(localStorage.getItem('lexiflow_diagnostic_reports') || '[]');
      if (reports && reports.length > 0) {
        // Option to keep previous report if user navigates directly
      }
    } catch (e) {
      console.warn('Error reading reports:', e);
    }
  }, []);

  const handleQuizComplete = (report) => {
    setCompletedReport(report);
  };

  const handleLaunchGame = () => {
    if (!completedReport) return;
    const subObj = SUBTYPES[completedReport.primarySubtype];
    if (subObj && subObj.exercisePath) {
      navigate(subObj.exercisePath);
    } else {
      navigate('/therapy/phoneme?mode=advanced');
    }
  };

  const handleRetake = () => {
    setCompletedReport(null);
  };

  const primaryObj = completedReport ? SUBTYPES[completedReport.primarySubtype] : null;

  return (
    <div className="page-container kids-page-bg" style={{ minHeight: '100vh', background: 'radial-gradient(circle at 10% 20%, rgba(255, 242, 210, 0.5) 0%, rgba(224, 247, 250, 0.5) 50%, rgba(243, 229, 245, 0.5) 100%)', display: 'flex', flexDirection: 'column' }}>
      <Navbar />

      <main style={{ flex: 1, padding: '2.5rem 1.5rem', maxWidth: '1000px', margin: '0 auto', width: '100%' }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <Link to="/" className="kids-btn-secondary" style={{ padding: '8px 18px', fontSize: '0.9rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            ← Back to Home 🏠
          </Link>
        </div>

        {!completedReport ? (
          <>
            <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
              <span className="title-kids-badge" style={{ fontSize: '0.85rem', padding: '4px 14px', marginBottom: '0.75rem', display: 'inline-block' }}>
                ✨ CLINICAL SUBTYPE DIAGNOSIS 🎈
              </span>
              <h1 style={{ fontSize: '2.4rem', fontWeight: 900, color: '#2f3542', margin: '0.25rem 0 0.5rem 0', fontFamily: 'var(--kids-font-display, "Fredoka", sans-serif)' }}>
                📋 10-Question Subtype Screening Engine
              </h1>
              <p style={{ color: '#57606f', fontSize: '1rem', maxWidth: '620px', margin: '0 auto', lineHeight: 1.6, fontWeight: 600 }}>
                Complete the 10 diagnostic challenges to pinpoint your primary dyslexia subtype and unlock your personalized AI therapy path!
              </p>
            </div>

            <SymptomsQuiz onQuizComplete={handleQuizComplete} />
          </>
        ) : (
          /* ── CELEBRATION RESULTS & LAUNCHER SCREEN ── */
          <div className="quiz-report-root animate-fade-in">
            <div className="celebration-hero">
              <div className="celebration-badge">🚀 ASSESSMENT PASSED</div>
              <h1 className="celebration-title">Cadet Assessment Complete!</h1>
              <p className="celebration-subtitle">
                Outstanding effort! Your baseline diagnostic report has been analyzed across all 5 medical dyslexia subtypes.
              </p>
            </div>

            {/* Target Power-Up Highlight Banner */}
            {primaryObj && (
              <div className="powerup-card" style={{ borderColor: primaryObj.color, background: primaryObj.bg }}>
                <div className="powerup-icon" style={{ color: primaryObj.color }}>{primaryObj.icon}</div>
                <div className="powerup-content">
                  <div className="powerup-tag" style={{ color: primaryObj.color }}>YOUR BRAIN POWER-UP TARGET</div>
                  <h2 className="powerup-title" style={{ color: primaryObj.color }}>
                    Target Area: {primaryObj.name}
                  </h2>
                  <p className="powerup-desc">{primaryObj.description}</p>
                </div>
                <button className="btn-launch-hero" style={{ background: primaryObj.color }} onClick={handleLaunchGame}>
                  🚀 Launch Recommended Game
                </button>
              </div>
            )}

            {/* 5-Subtype Scores Breakdown Cards */}
            <div className="subtype-breakdown-section">
              <h3 className="section-title">📊 Medical Subtype Breakdown</h3>
              <div className="subtype-grid">
                {Object.entries(SUBTYPES).map(([key, sub]) => {
                  const scorePct = completedReport.scores[key] || 0;
                  const isTarget = key === completedReport.primarySubtype;

                  return (
                    <div key={key} className={`subtype-card ${isTarget ? 'target-card' : ''}`} style={{ borderColor: isTarget ? sub.color : 'var(--lf-border)' }}>
                      {isTarget && <span className="target-ribbon" style={{ background: sub.color }}>PRIMARY FOCUS</span>}
                      <div className="subtype-card-header">
                        <span className="subtype-icon" style={{ background: sub.bg, color: sub.color }}>{sub.icon}</span>
                        <div>
                          <div className="subtype-name">{sub.name}</div>
                          <div className="subtype-label">{sub.label}</div>
                        </div>
                      </div>

                      <div className="subtype-bar-wrap">
                        <div className="subtype-bar-track">
                          <div className="subtype-bar-fill" style={{ width: `${scorePct}%`, background: sub.color }} />
                        </div>
                        <span className="subtype-pct" style={{ color: sub.color }}>{scorePct}% Accuracy</span>
                      </div>

                      <p className="subtype-desc">{sub.description}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Action Row */}
            <div className="report-actions-row">
              <button className="btn-retake-quiz" onClick={handleRetake}>
                🔄 Retake Diagnostic Quiz
              </button>
              <button className="btn-launch-hero" style={{ background: primaryObj?.color || 'var(--lf-primary)' }} onClick={handleLaunchGame}>
                🚀 Launch Recommended Game ({primaryObj?.exerciseTitle}) →
              </button>
            </div>
          </div>
        )}
      </main>

      <footer className="home-footer" style={{ marginTop: 'auto' }}>
        <div className="footer-inner">
          <div className="footer-brand">
            <div className="nav-logo-icon">L</div>
            <span>LexiFlow</span>
          </div>
          <p>© 2026 LexiFlow Clinical. Designed for educational accessibility.</p>
        </div>
      </footer>
    </div>
  );
};

export default QuizPage;
