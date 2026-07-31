import React from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../dashboard/Navbar';
import SymptomsQuiz from './SymptomsQuiz';
import './SymptomsQuiz.css';

const QuizPage = () => {
  return (
    <div className="page-container" style={{ minHeight: '100vh', background: 'var(--lf-bg-primary, #f8fafc)', display: 'flex', flexDirection: 'column' }}>
      <Navbar />

      <main style={{ flex: 1, padding: '2.5rem 1.5rem', maxWidth: '1000px', margin: '0 auto', width: '100%' }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <Link to="/" style={{ textDecoration: 'none', color: 'var(--lf-primary, #2563eb)', fontWeight: 700, fontSize: '0.88rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            ← Back to Home
          </Link>
        </div>

        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <span className="badge badge-info" style={{ textTransform: 'uppercase', letterSpacing: '0.05em', padding: '6px 14px', borderRadius: '20px', fontWeight: 800, fontSize: '0.75rem', marginBottom: '0.75rem', display: 'inline-block' }}>
            ✨ QUICK SCREENING
          </span>
          <h1 style={{ fontSize: '2.2rem', fontWeight: 900, color: 'var(--lf-text-primary, #0f172a)', margin: '0.25rem 0 0.5rem 0', letterSpacing: '-0.025em' }}>
            Dyslexia Symptoms Screening
          </h1>
          <p style={{ color: 'var(--lf-text-muted, #64748b)', fontSize: '1rem', maxWidth: '620px', margin: '0 auto', lineHeight: 1.6 }}>
            Answer 10 basic questions to evaluate key developmental indicators and receive instant clinical recommendations.
          </p>
        </div>

        <SymptomsQuiz />
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
