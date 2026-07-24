import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import './Home.css';
import { useAuth } from './AuthContext';

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

const AnimatedHeroVideo = () => {
  const [showModal, setShowModal] = useState(false);
  const videoRef = useRef(null);

  return (
    <div className="hero-animated-video-card">
      <div className="video-frame-wrapper" onClick={() => setShowModal(true)}>
        <video 
          ref={videoRef}
          className="hero-video-element"
          autoPlay 
          loop 
          muted 
          playsInline
          poster="https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?auto=format&fit=crop&q=80&w=1000"
        >
          <source src="https://cdn.coverr.co/videos/coverr-a-child-reading-a-book-5668/1080p.mp4" type="video/mp4" />
          Your browser does not support HTML5 video.
        </video>

        {/* Animated Scanning Line */}
        <div className="video-scan-line"></div>

        {/* Floating AI Badges */}
        <div className="video-live-badge badge-top-left">
          <span className="live-dot"></span> AI Phonetic Tracker
        </div>

        <div className="video-live-badge badge-bottom-right">
          ⚡ RAN Speed: 94%
        </div>

        {/* Equalizer Sound Waves */}
        <div className="video-sound-bars">
          <span className="bar bar1"></span>
          <span className="bar bar2"></span>
          <span className="bar bar3"></span>
          <span className="bar bar4"></span>
        </div>

        {/* Play Overlay Button */}
        <div className="video-play-overlay">
          <button className="play-circle-btn" onClick={(e) => { e.stopPropagation(); setShowModal(true); }}>
            ▶
          </button>
          <span className="play-btn-label">Watch Live Demo Video</span>
        </div>
      </div>

      {/* Video Modal Preview */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content video-modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: '750px' }}>
            <button className="modal-close-btn" onClick={() => setShowModal(false)}>✕</button>
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
              <button className="medical-btn-primary" onClick={() => setShowModal(false)}>
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
        <section className="hero-section">
          <div className="hero-container-inner">
            <div className="hero-content-left">
              <span className="hero-badge">
                <span className="badge-dot"></span>
                Science-Backed Therapy
              </span>
              <h1 className="hero-title">
                Your Child Deserves to <br />
                <span className="hero-gradient-text">Read with Confidence</span>
              </h1>
              <p className="hero-subtitle">
                Our science-backed therapy helps students gain a full grade level in just 
                eight weeks. Proven by research, delivered by experts, and trusted by families worldwide.
              </p>
              <div className="hero-benefits">
                <span className="benefit-item">
                  <span className="benefit-check">✓</span> Science-Backed Intervention
                </span>
                <span className="benefit-item">
                  <span className="benefit-check">✓</span> Pediatric Approved
                </span>
                <span className="benefit-item">
                  <span className="benefit-check">✓</span> 94% Accuracy Rate
                </span>
              </div>
              <div className="hero-btn-group">
                <Link to="/signup" className="btn-primary-glow">
                  <span>Explore Free Testing</span>
                </Link>
                <button 
                  onClick={() => document.querySelector('.sandbox-section').scrollIntoView({ behavior: 'smooth' })} 
                  className="btn-glass"
                >
                  Try Visual Simulator
                </button>
              </div>
            </div>
            <div className="hero-content-right">
              <AnimatedHeroVideo />
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
            <div className="stat-item">
              <div className="stat-number"><AnimatedCounter target={94} suffix="%" /></div>
              <div className="stat-desc">Detection Accuracy</div>
            </div>
            <div className="stat-item">
              <div className="stat-number"><AnimatedCounter target={8} suffix=" Weeks" /></div>
              <div className="stat-desc">Avg Improvement</div>
            </div>
            <div className="stat-item">
              <div className="stat-number"><AnimatedCounter target={6} suffix="+" /></div>
              <div className="stat-desc">Therapy Modules</div>
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

        <section className="features-grid" style={{ paddingTop: '2rem' }}>
          <div className="features-header">
            <span className="section-badge">Core Features</span>
            <h2 className="section-title">Powerful Tools for Every Need</h2>
            <p className="section-subtitle">Advanced diagnostics and tools designed to support and empower neurodivergent learners.</p>
          </div>
          <div className="features-cards">
            <div className="feature-card">
              <div className="feature-icon-wrap">
                <span className="feature-icon">🔍</span>
              </div>
              <h3>Neural Diagnostics</h3>
              <p>Linguistic pattern analysis and phonetic tests to identify markers with high scientific precision.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon-wrap">
                <span className="feature-icon">📊</span>
              </div>
              <h3>Longitudinal Tracking</h3>
              <p>Monitor assessment results over time with clinical indicators and printable progress reports.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon-wrap">
                <span className="feature-icon">🎬</span>
              </div>
              <h3>Therapeutic Suite</h3>
              <p>Interactive tasks including visual tracking, auditory discrimination, and morphology exercises.</p>
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
