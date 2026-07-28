import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import './Home.css';
import { useAuth } from '../auth/AuthContext';

import SymptomsQuiz from '../quiz/SymptomsQuiz';

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

const VisualSaccadicSandbox = () => {
  const [pattern, setPattern] = useState('horizontal'); // horizontal, vertical, bounce, infinity
  const [speed, setSpeed] = useState('medium'); // slow (3s), medium (2s), fast (1s)
  const [targetType, setTargetType] = useState('dot'); // dot, cross, ring
  const [isActive, setIsActive] = useState(false);
  const [position, setPosition] = useState({ x: 50, y: 50 });
  const requestRef = useRef();
  const startTimeRef = useRef();

  useEffect(() => {
    if (!isActive) {
      setPosition({ x: 50, y: 50 });
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
      return;
    }

    const duration = speed === 'slow' ? 3000 : speed === 'medium' ? 2000 : 1000;

    const animate = (time) => {
      if (!startTimeRef.current) startTimeRef.current = time;
      const progress = ((time - startTimeRef.current) % duration) / duration;

      let newX = 50;
      let newY = 50;

      if (pattern === 'horizontal') {
        // Smooth sweeping left to right
        newX = 15 + Math.sin(progress * Math.PI * 2) * 35 + 35;
        newY = 50;
      } else if (pattern === 'vertical') {
        // Smooth sweeping up and down
        newX = 50;
        newY = 15 + Math.sin(progress * Math.PI * 2) * 35 + 35;
      } else if (pattern === 'bounce') {
        // Sharp jumps (saccades)
        const segment = Math.floor(progress * 4);
        if (segment === 0) { newX = 20; newY = 20; }
        else if (segment === 1) { newX = 80; newY = 20; }
        else if (segment === 2) { newX = 80; newY = 80; }
        else { newX = 20; newY = 80; }
      } else if (pattern === 'infinity') {
        // Figure eight tracking
        const angle = progress * Math.PI * 2;
        newX = 50 + Math.sin(angle) * 35;
        newY = 50 + (Math.sin(angle * 2) * 20);
      }

      setPosition({ x: newX, y: newY });
      requestRef.current = requestAnimationFrame(animate);
    };

    requestRef.current = requestAnimationFrame(animate);

    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
      startTimeRef.current = null;
    };
  }, [isActive, pattern, speed]);

  return (
    <div className="sandbox-panel">
      <div className="sandbox-controls">
        <div className="sandbox-section-title">Therapy Simulator Toggles</div>
        <p className="sandbox-helper">LexiFlow uses ocular saccadic exercises to train tracking coordination. Test different tracking patterns below.</p>
        
        <div className="sandbox-group">
          <div className="sandbox-title-label">Tracking Pattern</div>
          <button 
            className={`sandbox-btn ${pattern === 'horizontal' ? 'active' : ''}`}
            onClick={() => setPattern('horizontal')}
          >
            ↔ Horizontal Sweep
          </button>
          <button 
            className={`sandbox-btn ${pattern === 'vertical' ? 'active' : ''}`}
            onClick={() => setPattern('vertical')}
          >
            ↕ Vertical Sweep
          </button>
          <button 
            className={`sandbox-btn ${pattern === 'bounce' ? 'active' : ''}`}
            onClick={() => setPattern('bounce')}
          >
            ⤢ Saccadic Jumps
          </button>
          <button 
            className={`sandbox-btn ${pattern === 'infinity' ? 'active' : ''}`}
            onClick={() => setPattern('infinity')}
          >
            ∞ Figure Eight
          </button>
        </div>

        <div className="sandbox-group">
          <div className="sandbox-title-label">Speed Level</div>
          <select 
            value={speed} 
            onChange={(e) => setSpeed(e.target.value)}
            className="sandbox-select"
          >
            <option value="slow">Slow Pace</option>
            <option value="medium">Medium Pace</option>
            <option value="fast">High Pace</option>
          </select>
        </div>

        <div className="sandbox-group">
          <div className="sandbox-title-label">Focus Target Graphic</div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button 
              className={`sandbox-btn-sm ${targetType === 'dot' ? 'active' : ''}`}
              onClick={() => setTargetType('dot')}
            >
              ● Dot
            </button>
            <button 
              className={`sandbox-btn-sm ${targetType === 'ring' ? 'active' : ''}`}
              onClick={() => setTargetType('ring')}
            >
              ◎ Ring
            </button>
            <button 
              className={`sandbox-btn-sm ${targetType === 'cross' ? 'active' : ''}`}
              onClick={() => setTargetType('cross')}
            >
              ✚ Cross
            </button>
          </div>
        </div>

        <button 
          onClick={() => setIsActive(!isActive)}
          className={`btn-finish ${isActive ? 'active-stop' : ''}`}
          style={{ marginTop: '1rem' }}
        >
          {isActive ? '⏹ Stop Exercise' : '▶ Start Tracking'}
        </button>
      </div>

      <div className="sandbox-workspace">
        <div className="sandbox-section-title">Ocular Saccadic Sandbox</div>
        <div className="saccadic-viewport">
          {/* Subtle guide lines showing the tracking grid */}
          <div className="saccadic-grid-line line-h"></div>
          <div className="saccadic-grid-line line-v"></div>

          {/* Dynamic Animated Target */}
          <div 
            className={`saccadic-target ${targetType}`}
            style={{ 
              left: `${position.x}%`, 
              top: `${position.y}%`,
              transform: 'translate(-50%, -50%)',
              transition: pattern === 'bounce' ? 'left 0.15s cubic-bezier(0.25, 0.8, 0.25, 1), top 0.15s cubic-bezier(0.25, 0.8, 0.25, 1)' : 'none'
            }}
          >
            {targetType === 'cross' && '✚'}
            {targetType === 'ring' && <span className="target-ring-inner"></span>}
          </div>
          
          <div className="saccadic-instruction-overlay">
            {isActive ? 'Follow the moving focus marker with your eyes only.' : 'Click "Start Tracking" to begin ocular preview.'}
          </div>
        </div>
      </div>
    </div>
  );
};

const HeroDashboardShowcase = () => {
  const [showVideoModal, setShowVideoModal] = useState(false);

  return (
    <div className="hero-dashboard-showcase-container">
      {/* Background Radial Glow Effects */}
      <div className="glow-spot glow-cyan-top"></div>
      <div className="glow-spot glow-cyan-bottom"></div>
      <div className="glow-spot glow-purple-right"></div>

      {/* Floating Decorative Outline Doodles */}
      <div className="doodle-icon doodle-book-top">📖</div>
      <div className="doodle-icon doodle-brain-top">🧠</div>
      <div className="doodle-icon doodle-sparkle-mid">✨</div>
      <div className="doodle-icon doodle-book-bot">📚</div>
      <div className="doodle-icon doodle-sparkle-bot">✨</div>

      {/* Floating Overlay Cards (exact match from mockup) */}
      <div className="showcase-float-card float-badge-complete">
        <div className="float-badge-icon">✓</div>
        <div>
          <strong>AI Analysis</strong>
          <small style={{ color: '#10b981' }}>Complete</small>
        </div>
      </div>

      <div className="showcase-float-card float-badge-improvement">
        <div className="float-arrow-box">↑</div>
        <div>
          <strong>Reading Improvement</strong>
          <small style={{ color: '#10b981', fontWeight: 800 }}>+18%</small>
        </div>
      </div>

      <div className="showcase-float-card float-badge-sessions">
        <span style={{ fontSize: '1.2rem' }}>🗓️</span>
        <div>
          <strong>24 Therapy</strong>
          <small style={{ fontWeight: 700 }}>Sessions</small>
        </div>
      </div>

      <div className="showcase-float-card float-badge-progress">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
          <strong style={{ fontSize: '0.78rem' }}>Therapy Progress</strong>
          <strong style={{ color: '#4f46e5', fontSize: '0.78rem' }}>82%</strong>
        </div>
        <div className="mini-progress-bar">
          <div className="mini-progress-fill" style={{ width: '82%' }}></div>
        </div>
      </div>

      {/* Main Mock Application Window */}
      <div className="mock-app-window">
        {/* Top App Bar */}
        <div className="mock-app-navbar">
          <div className="mock-app-brand">
            <div className="mock-app-logo">L</div>
            <span>Application</span>
          </div>
          <button className="mock-demo-btn" onClick={() => setShowVideoModal(true)}>
            ▶ Live Demo
          </button>
        </div>

        {/* Inner App Body */}
        <div className="mock-app-body">
          {/* App Sidebar */}
          <div className="mock-app-sidebar">
            <div className="mock-nav-item active">🏠</div>
            <div className="mock-nav-item">👥</div>
            <div className="mock-nav-item">⚙️</div>
          </div>

          {/* App Content Grid */}
          <div className="mock-app-content">
            {/* Left Column: Risk Donut + Line Chart */}
            <div className="mock-col-left">
              {/* Donut Card */}
              <div className="mock-panel-card">
                <span className="mock-panel-title">Dyslexia Risk Level</span>
                <div className="donut-chart-wrapper">
                  <svg className="donut-svg" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="38" fill="none" stroke="#e2e8f0" strokeWidth="9" />
                    <circle 
                      cx="50" cy="50" r="38" fill="none" 
                      stroke="url(#donutGrad)" strokeWidth="9" 
                      strokeDasharray="238" strokeDashoffset="75"
                      strokeLinecap="round"
                    />
                    <defs>
                      <linearGradient id="donutGrad" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor="#f59e0b" />
                        <stop offset="100%" stopColor="#3b82f6" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="donut-center-label">
                    <strong>Moderate Risk</strong>
                    <span>(68%)</span>
                  </div>
                </div>
              </div>

              {/* Line Chart Card */}
              <div className="mock-panel-card">
                <span className="mock-panel-title">Progress Line Chart</span>
                <div style={{ width: '100%', height: '50px', marginTop: '4px' }}>
                  <svg viewBox="0 0 200 50" style={{ width: '100%', height: '100%' }}>
                    <path 
                      d="M 0 40 Q 30 35, 60 42 T 120 20 T 170 30 T 200 10" 
                      fill="none" stroke="#3b82f6" strokeWidth="3" strokeLinecap="round"
                    />
                    <path 
                      d="M 0 40 Q 30 35, 60 42 T 120 20 T 170 30 T 200 10 L 200 50 L 0 50 Z" 
                      fill="rgba(59, 130, 246, 0.15)"
                    />
                  </svg>
                </div>
              </div>
            </div>

            {/* Right Column: Score + Therapy Modules */}
            <div className="mock-col-right">
              {/* Assessment Score Card */}
              <div className="mock-panel-card score-card">
                <span className="mock-panel-title">Assessment Score</span>
                <div className="big-score-val">720<span className="score-max">/1000</span></div>
              </div>

              {/* Recommended Therapy Modules */}
              <div className="mock-panel-card">
                <span className="mock-panel-title">Recommended Therapy Modules</span>
                <div className="mock-therapy-mini-list">
                  <div className="mini-therapy-row">
                    <span>💡 Phoneme Matching</span>
                  </div>
                  <div className="mini-therapy-row">
                    <span>👁️ Visual Tracking</span>
                  </div>
                  <div className="mini-therapy-row">
                    <span>🎧 Auditory Processing</span>
                  </div>
                  <div className="mini-therapy-row">
                    <span>⚡ Rapid Naming</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Mock Overlay Cards */}
        <div className="mock-bottom-history-overlay">
          <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#0f172a', display: 'block', marginBottom: '4px' }}>Assessment History</span>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.6rem', color: '#64748b', borderBottom: '1px solid #e2e8f0', paddingBottom: '2px' }}>
            <span>Date</span><span>Updated</span><span>Score</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.62rem', fontWeight: 700, color: '#334155', marginTop: '2px' }}>
            <span>12/16/24</span><span>01/03/2025</span><strong style={{ color: '#4f46e5' }}>720</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.62rem', fontWeight: 700, color: '#334155', marginTop: '2px' }}>
            <span>12/30/24</span><span>02/08/2025</span><strong style={{ color: '#10b981' }}>750</strong>
          </div>
        </div>

        <div className="mock-bottom-weekly-overlay">
          <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#0f172a', display: 'block', marginBottom: '4px' }}>Weekly Progress</span>
          <div style={{ display: 'flex', gap: '8px', fontSize: '0.6rem', color: '#64748b' }}>
            <div><small style={{ display: 'block' }}>10m</small><strong style={{ color: '#4f46e5' }}>35m</strong></div>
            <div><small style={{ display: 'block' }}>44m</small><strong style={{ color: '#10b981' }}>45%</strong></div>
            <div><small style={{ display: 'block' }}>Time</small><strong style={{ color: '#0f172a' }}>30</strong></div>
          </div>
        </div>
      </div>

      {/* Video Modal Preview */}
      {showVideoModal && (
        <div className="modal-overlay" onClick={() => setShowVideoModal(false)}>
          <div className="modal-content video-modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: '750px' }}>
            <button className="modal-close-btn" onClick={() => setShowVideoModal(false)}>✕</button>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.85rem', color: 'var(--lf-text-primary)' }}>
              LexiFlow AI Reading & Diagnostic Demonstration
            </h3>
            
            <div className="modal-video-container">
              <video 
                controls 
                autoPlay 
                className="full-modal-video"
                src="https://cdn.coverr.co/videos/coverr-a-child-reading-a-book-5668/1080p.mp4"
              />
            </div>

            <div style={{ marginTop: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="dash-status">● SCIENCE-BACKED DYSLEXIA INTERVENTION</span>
              <button className="medical-btn-primary" onClick={() => setShowVideoModal(false)}>
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const Home = () => {
  const { currentUser, logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (e) {
      console.error("Logout error:", e);
    }
  };

  return (
    <div className="home-container">
      <div className="home-bg-effects">
        <div className="bg-grid"></div>
      </div>

      <nav className="home-navbar">
        <div className="nav-brand">
          <div className="nav-logo-icon">L</div>
          <h2>LexiFlow Clinical</h2>
        </div>
        <div className="nav-links">
          {currentUser ? (
            <>
              <Link to="/dashboard" className="home-cta-btn">Dashboard →</Link>
              <button 
                onClick={handleLogout} 
                className="nav-item"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--lf-rose, #f43f5e)', fontWeight: 600 }}
              >
                Sign Out
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="nav-item">Login</Link>
              <Link to="/signup" className="home-cta-btn">Get Started →</Link>
            </>
          )}
        </div>
      </nav>

      <main>
        {/* Refined Hero Section matching Mockup */}
        <section className="hero-section">
          <div className="hero-container-inner">
            <div className="hero-content-left">
              {/* Badge */}
              <span className="hero-badge-green">
                <span className="badge-dot-green"></span>
                AI-Powered Dyslexia Screening
              </span>

              {/* Heading */}
              <h1 className="hero-title-mockup">
                Helping Every Child <br />
                Read with Confidence.
              </h1>

              {/* Highlighted Subtitle Pill Box */}
              <div className="hero-subtitle-highlight-box">
                Powered by AI. Guided by Personalized Therapy.
              </div>

              {/* Feature Chips (2x2 Grid with pastel tints) */}
              <div className="hero-chips-grid-2x2">
                <span className="mock-chip chip-blue">🔍 AI-Powered Screening</span>
                <span className="mock-chip chip-pink">👤 Interactive Therapy</span>
                <span className="mock-chip chip-green">📈 Progress Dashboard</span>
                <span className="mock-chip chip-orange">🧠 Personalized Learning</span>
              </div>

              {/* CTA Buttons */}
              <div className="hero-btn-group-mockup">
                <Link to={currentUser ? "/detect" : "/signup"} className="btn-royal-blue">
                  Start Dyslexia Assessment
                </Link>
                <Link to="/therapy/phoneme" className="btn-outline-white">
                  Explore Therapy Modules
                </Link>
              </div>

              {/* Trust Indicators Row */}
              <div className="hero-trust-row-mockup">
                <div className="trust-box-item">
                  <div className="trust-icon-box">🔒</div>
                  <span>Secure User<br />Accounts</span>
                </div>
                <div className="trust-box-item">
                  <div className="trust-icon-box">🧠</div>
                  <span>AI-Powered<br />Analysis</span>
                </div>
                <div className="trust-box-item">
                  <div className="trust-icon-box">🔮</div>
                  <span>Personalized<br />Learning</span>
                </div>
              </div>
            </div>

            <div className="hero-content-right">
              <HeroDashboardShowcase />
            </div>
          </div>
        </section>


        {/* Interactive Saccadic Simulator Section */}
        <section className="features-grid sandbox-section" style={{ paddingTop: '5rem', paddingBottom: '3rem' }}>
          <div className="features-header" style={{ marginBottom: '3rem' }}>
            <span className="section-badge">Interactive Preview</span>
            <h2 className="section-title">Ocular Saccadic Tracking Simulator</h2>
            <p className="section-subtitle">Test the motor visual-coordination exercises used in dyslexia recovery protocols. Follow the tracking marker to experience it live.</p>
          </div>
          <VisualSaccadicSandbox />
        </section>

        {/* 3 Core Feature Cards matching Mockup */}
        <section className="features-grid" style={{ paddingTop: '2rem' }}>
          <div className="features-header">
            <span className="section-badge">Core Platform Features</span>
            <h2 className="section-title">Powerful Tools for Neurodivergent Learners</h2>
            <p className="section-subtitle">Advanced AI screening and evidence-based therapeutic modules designed to support reading confidence.</p>
          </div>
          <div className="features-cards">
            <div className="feature-card mock-feature-card">
              <div className="feature-icon-wrap icon-blue">
                <span className="feature-icon">🔍</span>
              </div>
              <h3>AI Screening</h3>
              <p>Accurate, data-driven screening using advanced AI models to identify risk factors early.</p>
            </div>

            <div className="feature-card mock-feature-card">
              <div className="feature-icon-wrap icon-purple">
                <span className="feature-icon">👩‍💻</span>
              </div>
              <h3>Interactive Therapy</h3>
              <p>Engaging, gamified modules that make therapy fun and effective for children.</p>
              <Link to="/therapy/phoneme" className="feature-learn-more">Learn More →</Link>
            </div>

            <div className="feature-card mock-feature-card">
              <div className="feature-icon-wrap icon-green">
                <span className="feature-icon">📊</span>
              </div>
              <h3>Progress Tracking</h3>
              <p>Real-time dashboards and reports to monitor growth and adjust learning plans.</p>
            </div>
          </div>
        </section>

        <section className="quiz-section">
          <div className="section-header">
            <span className="section-badge">Quick Screening</span>
            <h2 className="section-title">Dyslexia Symptoms Screening</h2>
            <p className="section-subtitle">
              Answer 10 basic questions to evaluate key indicators and receive recommendations.
            </p>
          </div>
          <SymptomsQuiz />
        </section>
      </main>

      <footer className="home-footer">
        <div className="footer-inner">
          <div className="footer-brand">
            <div className="nav-logo-icon">L</div>
            <span>LexiFlow</span>
          </div>
          <p>© 2026 LexiFlow Clinical. Designed for educational accessibility.</p>
          <div className="footer-links">
            <a href="#">Privacy Policy</a>
            <a href="#">Terms of Service</a>
            <a href="#">Contact Us</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;
