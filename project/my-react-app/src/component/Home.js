import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import './Home.css';

import SymptomsQuiz from './SymptomsQuiz';

const AnimatedCounter = ({ target, suffix = '', duration = 2000 }) => {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setIsVisible(true); },
      { threshold: 0.3 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isVisible) return;
    let start = 0;
    const step = target / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= target) { setCount(target); clearInterval(timer); }
      else setCount(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [isVisible, target, duration]);

  return <span ref={ref}>{count}{suffix}</span>;
};

const Home = () => {
  return (
    <div className="home-container">
      {/* Animated Background */}
      <div className="home-bg-effects">
        <div className="bg-orb bg-orb-1"></div>
        <div className="bg-orb bg-orb-2"></div>
        <div className="bg-orb bg-orb-3"></div>
        <div className="bg-grid"></div>
      </div>

      <nav className="home-navbar">
        <div className="nav-brand">
          <div className="nav-logo-icon">
            <span>L</span>
            <div className="logo-glow"></div>
          </div>
          <h2>LexiFlow</h2>
        </div>
        <div className="nav-links">
          <Link to="/login" className="nav-item">Login</Link>
          <Link to="/signup" className="home-cta-btn">Get Started →</Link>
        </div>
      </nav>

      <main>
        <section className="hero-section">
          <div className="hero-container-inner">
            <div className="hero-content-left">
              <span className="hero-badge">
                <span className="badge-dot"></span>
                Science-Backed Therapy
              </span>
              <h1 className="hero-title">
                Your Child Deserves to <br />
                <span className="hero-gradient-text">Read with Confidence!</span>
              </h1>
              <p className="hero-subtitle">
                Our science-backed therapy helps most students gain a full grade level in just 
                eight weeks. Proven by research. Delivered by experts. Trusted by thousands of families.
              </p>
              <div className="hero-btn-group">
                <Link to="/signup" className="btn-primary-glow">
                  <span>Explore Free Testing</span>
                  <div className="btn-shimmer"></div>
                </Link>
                <button 
                  onClick={() => document.querySelector('.quiz-section').scrollIntoView({ behavior: 'smooth' })} 
                  className="btn-glass"
                >
                  Take Symptoms Quiz
                </button>
              </div>
            </div>
            <div className="hero-content-right">
              <div className="hero-illustration">
                <div className="hero-ring hero-ring-1"></div>
                <div className="hero-ring hero-ring-2"></div>
                <div className="hero-ring hero-ring-3"></div>
                <div className="floating-badge floating-badge-1">🧠 94% Accuracy</div>
                <div className="floating-badge floating-badge-2">📊 AI Powered</div>
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

        {/* Stats Strip */}
        <section className="stats-strip">
          <div className="stats-strip-inner">
            <div className="stat-item">
              <div className="stat-number"><AnimatedCounter target={10} suffix="K+" /></div>
              <div className="stat-desc">Families Helped</div>
            </div>
            <div className="stat-divider"></div>
            <div className="stat-item">
              <div className="stat-number"><AnimatedCounter target={94} suffix="%" /></div>
              <div className="stat-desc">Detection Accuracy</div>
            </div>
            <div className="stat-divider"></div>
            <div className="stat-item">
              <div className="stat-number"><AnimatedCounter target={8} suffix=" Weeks" /></div>
              <div className="stat-desc">Average Improvement</div>
            </div>
            <div className="stat-divider"></div>
            <div className="stat-item">
              <div className="stat-number"><AnimatedCounter target={6} suffix="+" /></div>
              <div className="stat-desc">Therapy Modules</div>
            </div>
          </div>
        </section>

        <section className="features-grid">
          <div className="features-header">
            <span className="section-badge">Core Features</span>
            <h2 className="section-title">Powerful Tools for Every Need</h2>
            <p className="section-subtitle">Advanced AI-powered tools designed to detect, support, and empower neurodivergent learners.</p>
          </div>
          <div className="features-cards">
            <div className="feature-card">
              <div className="feature-icon-wrap">
                <span className="feature-icon">🔍</span>
                <div className="feature-icon-bg"></div>
              </div>
              <h3>Neural Diagnostics</h3>
              <p>Advanced NLP models to detect linguistic transpositions and phonetic patterns with 94% accuracy.</p>
              <div className="feature-card-glow"></div>
            </div>
            <div className="feature-card">
              <div className="feature-icon-wrap">
                <span className="feature-icon">📊</span>
                <div className="feature-icon-bg"></div>
              </div>
              <h3>Longitudinal Tracking</h3>
              <p>Monitor patient progress over time with comprehensive data-driven reports and clinical markers.</p>
              <div className="feature-card-glow"></div>
            </div>
            <div className="feature-card">
              <div className="feature-icon-wrap">
                <span className="feature-icon">🎬</span>
                <div className="feature-icon-bg"></div>
              </div>
              <h3>Therapeutic Suite</h3>
              <p>Interactive exercises including visual tracking and auditory processing for holistic treatment.</p>
              <div className="feature-card-glow"></div>
            </div>
          </div>
        </section>

        <section className="quiz-section">
          <div className="section-header">
            <span className="section-badge">Quick Screening</span>
            <h2 className="section-title">Check Your Symptoms</h2>
            <p className="section-subtitle">
              Take our interactive 10-question quiz to identify potential dyslexic indicators and get personalized next steps.
            </p>
          </div>
          <SymptomsQuiz />
        </section>
      </main>

      <footer className="home-footer">
        <div className="footer-inner">
          <div className="footer-brand">
            <div className="nav-logo-icon"><span>L</span></div>
            <span>LexiFlow</span>
          </div>
          <p>© 2026 LexiFlow Clinical. Supporting neurodiversity through technology.</p>
          <div className="footer-links">
            <a href="#">Privacy</a>
            <a href="#">Terms</a>
            <a href="#">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;
