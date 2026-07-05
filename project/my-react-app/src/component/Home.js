import React from 'react';
import { Link } from 'react-router-dom';
import './Home.css';

import SymptomsQuiz from './SymptomsQuiz';

const Home = () => {
  return (
    <div className="home-container">
      <nav className="navbar">
        <div className="nav-brand">
          <div className="nav-logo-icon">L</div>
          <h2>LexiFlow</h2>
        </div>
        <div className="nav-links">
          <Link to="/login" className="nav-item">Login</Link>
          <Link to="/signup" className="medical-btn-primary">Get Started</Link>
        </div>
      </nav>

      <main>
        <section className="hero-section">
          <div className="hero-container-inner">
            <div className="hero-content-left">
              <span className="medical-label-badge">Science-Backed Therapy</span>
              <h1 className="hero-title">
                Your Child Deserves to <br />
                <span className="highlight-text">Read with Confidence!</span>
              </h1>
              <p className="hero-subtitle">
                Our science-backed therapy helps most students gain a full grade level in just 
                eight weeks. Proven by research. Delivered by experts. Trusted by thousands of families.
              </p>
              <div className="hero-btn-group">
                <Link to="/signup" className="btn-orange-solid">Explore Free Testing</Link>
                <button 
                  onClick={() => document.querySelector('.quiz-section').scrollIntoView({ behavior: 'smooth' })} 
                  className="btn-orange-outline"
                >
                  Take Symptoms Quiz
                </button>
              </div>
            </div>
            <div className="hero-content-right">
              <div className="hero-illustration">
                <div className="blob-bg"></div>
                <div className="blob-secondary"></div>
                <div className="swirl s1"></div>
                <div className="swirl s2"></div>
                <div className="child-image-container">
                   <img 
                    src="https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?auto=format&fit=crop&q=80&w=1000" 
                    alt="Child reading with confidence" 
                    className="hero-child-img"
                   />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">🔍</div>
            <h3>Neural Diagnostics</h3>
            <p>Advanced NLP models to detect linguistic transpositions and phonetic patterns with 94% accuracy.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">📊</div>
            <h3>Longitudinal Tracking</h3>
            <p>Monitor patient progress over time with comprehensive data-driven reports and clinical markers.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🎬</div>
            <h3>Therapeutic Suite</h3>
            <p>Interactive exercises including visual tracking and auditory processing for holistic treatment.</p>
          </div>
        </section>

        <section className="quiz-section" style={{ background: '#f8fafc', padding: '6rem 2rem' }}>
          <div className="section-header" style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <span className="medical-label">Quick Screening</span>
            <h2 style={{ fontSize: '2.5rem', fontWeight: 800 }}>Check Your Symptoms</h2>
            <p style={{ color: 'var(--med-gray)', maxWidth: '600px', margin: '1rem auto' }}>
              Take our interactive 10-question quiz to identify potential dyslexic indicators and get personalized next steps.
            </p>
          </div>
          <SymptomsQuiz />
        </section>
      </main>

      <footer style={{ padding: '4rem 2rem', textAlign: 'center', borderTop: '1px solid var(--med-border)' }}>
        <p style={{ color: 'var(--med-gray)', fontSize: '0.9rem' }}>© 2026 LexiFlow Clinical. Supporting neurodiversity through technology.</p>
      </footer>
    </div>
  );
};

export default Home;
