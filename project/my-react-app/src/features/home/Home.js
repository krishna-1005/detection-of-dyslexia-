import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import './Home.css';
import { useAuth } from '../auth/AuthContext';

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



// 1. Live Bionic & Accessibility Reader Sandbox Component
const BionicReaderSandbox = () => {
  const [inputText, setInputText] = useState(
    "Dyslexia is a neurobiological difference that affects how the brain decodes written letters. With multisensory instruction and bionic visual cues, reading speed and comprehension improve dramatically."
  );
  const [bionicActive, setBionicActive] = useState(true);
  const [dyslexicFont, setDyslexicFont] = useState(true);
  const [focusLine, setFocusLine] = useState(false);
  const [compareMode, setCompareMode] = useState(false);

  const formatBionicText = (text) => {
    return text.split(' ').map((word, wIdx) => {
      if (word.length <= 1) return <span key={wIdx}>{word} </span>;
      const mid = Math.ceil(word.length / 2);
      const boldPart = word.slice(0, mid);
      const restPart = word.slice(mid);
      return (
        <span key={wIdx} className="bionic-word">
          <strong style={{ color: 'var(--lf-primary, #2563eb)', fontWeight: 800 }}>{boldPart}</strong>
          <span>{restPart}</span>{' '}
        </span>
      );
    });
  };

  return (
    <div className="sandbox-panel bionic-sandbox-panel" style={{ background: '#ffffff', border: '1px solid var(--lf-border)', borderRadius: '24px', padding: '2rem', boxShadow: 'var(--lf-shadow-lg)' }}>
      <div className="sandbox-controls">
        <div className="sandbox-section-title">Live Accessibility Controls</div>
        <p className="sandbox-helper">Experience LexiFlow's real-time AI reader transformations directly below.</p>
        
        <div className="sandbox-group">
          <div className="sandbox-title-label">Interactive Toggles</div>
          <button 
            className={`sandbox-btn ${bionicActive ? 'active' : ''}`}
            onClick={() => setBionicActive(!bionicActive)}
          >
            ✨ Bionic Fixation ({bionicActive ? 'ON' : 'OFF'})
          </button>
          <button 
            className={`sandbox-btn ${dyslexicFont ? 'active' : ''}`}
            onClick={() => setDyslexicFont(!dyslexicFont)}
          >
            📖 OpenDyslexic Font ({dyslexicFont ? 'ON' : 'OFF'})
          </button>
          <button 
            className={`sandbox-btn ${focusLine ? 'active' : ''}`}
            onClick={() => setFocusLine(!focusLine)}
          >
            🔍 Focus Highlight ({focusLine ? 'ON' : 'OFF'})
          </button>
          <button 
            className={`sandbox-btn ${compareMode ? 'active' : ''}`}
            onClick={() => setCompareMode(!compareMode)}
            style={{ background: compareMode ? 'rgba(13, 148, 136, 0.1)' : '', borderColor: compareMode ? '#0d9488' : '', color: compareMode ? '#0d9488' : '' }}
          >
            ⚖️ Split Compare Mode
          </button>
        </div>

        <div className="sandbox-group">
          <div className="sandbox-title-label">Sample Input Passage</div>
          <textarea 
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            className="analysis-input"
            style={{ minHeight: '90px', fontSize: '0.88rem', padding: '0.75rem', borderRadius: '12px' }}
            placeholder="Type or paste any text to test accessibility transformation..."
          />
        </div>
      </div>

      <div className="sandbox-workspace">
        <div className="sandbox-section-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Transformed Reading Canvas</span>
          <span style={{ fontSize: '0.75rem', color: 'var(--lf-teal, #0d9488)', fontWeight: 700 }}>LIVE PREVIEW</span>
        </div>

        {compareMode ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
            <div style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '16px', border: '1px solid var(--lf-border)' }}>
              <small style={{ display: 'block', fontSize: '0.7rem', fontWeight: 800, color: 'var(--lf-text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>Standard Web Text</small>
              <p style={{ fontSize: '0.95rem', lineHeight: 1.5, color: '#334155', margin: 0 }}>{inputText}</p>
            </div>
            <div style={{
              background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.04) 0%, rgba(13, 148, 136, 0.04) 100%)',
              padding: '1.25rem',
              borderRadius: '16px',
              border: '1px solid rgba(37, 99, 235, 0.25)',
              fontFamily: dyslexicFont ? "'OpenDyslexic', 'Comic Sans MS', sans-serif" : 'inherit',
              letterSpacing: dyslexicFont ? '0.04em' : 'normal',
              lineHeight: 1.8
            }}>
              <small style={{ display: 'block', fontSize: '0.7rem', fontWeight: 800, color: 'var(--lf-primary)', textTransform: 'uppercase', marginBottom: '8px' }}>✨ LexiFlow Bionic Reader</small>
              <p style={{ fontSize: '0.98rem', color: '#0f172a', margin: 0 }}>
                {bionicActive ? formatBionicText(inputText) : inputText}
              </p>
            </div>
          </div>
        ) : (
          <div style={{
            background: focusLine ? 'linear-gradient(180deg, rgba(255,255,255,1) 0%, rgba(37,99,235,0.08) 50%, rgba(255,255,255,1) 100%)' : '#ffffff',
            padding: '1.5rem',
            borderRadius: '16px',
            border: '1px solid var(--lf-border)',
            minHeight: '160px',
            marginTop: '1rem',
            fontFamily: dyslexicFont ? "'OpenDyslexic', 'Comic Sans MS', sans-serif" : 'inherit',
            letterSpacing: dyslexicFont ? '0.05em' : 'normal',
            lineHeight: 1.85,
            boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.02)'
          }}>
            <p style={{ fontSize: '1.05rem', color: 'var(--lf-text-primary, #0f172a)', margin: 0 }}>
              {bionicActive ? formatBionicText(inputText) : inputText}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

// 2. Interactive Sound & Phoneme Audio Sampler
const PhonemeAudioSampler = () => {
  const [activePhoneme, setActivePhoneme] = useState(null);

  const phonemeList = [
    { sound: '/ch/', word: 'Chair', breakdown: '/ch/ - /ɛər/', color: '#2563eb' },
    { sound: '/sh/', word: 'Shadow', breakdown: '/sh/ - /æd/ - /oʊ/', color: '#0d9488' },
    { sound: '/th/', word: 'Think', breakdown: '/th/ - /ɪŋk/', color: '#d97706' },
    { sound: '/ph/', word: 'Phonics', breakdown: '/f/ - /ɒn/ - /ɪks/', color: '#e11d48' },
    { sound: '/bl/', word: 'Blend', breakdown: '/bl/ - /ɛnd/', color: '#7c3aed' },
    { sound: '/str/', word: 'Stream', breakdown: '/str/ - /iːm/', color: '#059669' }
  ];

  const playAudio = (item) => {
    setActivePhoneme(item.sound);
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(`${item.word}. Sound: ${item.sound.replace(/\//g, '')}`);
      utterance.rate = 0.85;
      window.speechSynthesis.speak(utterance);
    }
  };

  return (
    <div className="phoneme-sampler-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.25rem', marginTop: '1.5rem' }}>
      {phonemeList.map((item) => (
        <div 
          key={item.sound}
          onClick={() => playAudio(item)}
          style={{
            background: activePhoneme === item.sound ? 'linear-gradient(135deg, rgba(37,99,235,0.08) 0%, rgba(13,148,136,0.08) 100%)' : '#ffffff',
            border: activePhoneme === item.sound ? `2px solid ${item.color}` : '1px solid var(--lf-border)',
            borderRadius: '18px',
            padding: '1.35rem 1.25rem',
            cursor: 'pointer',
            boxShadow: 'var(--lf-shadow-sm)',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem'
          }}
        >
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '14px',
            background: `${item.color}15`,
            color: item.color,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.25rem',
            fontWeight: 900,
            flexShrink: 0
          }}>
            🔊
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <strong style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--lf-text-primary)' }}>{item.sound}</strong>
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: item.color }}>({item.word})</span>
            </div>
            <small style={{ color: 'var(--lf-text-muted)', fontSize: '0.75rem', fontWeight: 600, display: 'block', marginTop: '2px' }}>
              {item.breakdown}
            </small>
          </div>
        </div>
      ))}
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
          <Link to="/simulator" className="nav-item" style={{ fontWeight: 600 }}>Ocular Simulator</Link>
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


        {/* 4-Step How LexiFlow Works Section */}
        <section className="features-grid" style={{ paddingTop: '4rem', paddingBottom: '2rem' }}>
          <div className="features-header" style={{ marginBottom: '2.5rem' }}>
            <span className="section-badge">Clinical Workflow</span>
            <h2 className="section-title">How LexiFlow Empowers Readers</h2>
            <p className="section-subtitle">A seamless 4-step pipeline bridging diagnostic identification with engaging therapeutic intervention.</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.25rem' }}>
            <div style={{ background: '#ffffff', padding: '1.5rem', borderRadius: '18px', border: '1px solid var(--lf-border)', boxShadow: 'var(--lf-shadow-sm)', position: 'relative' }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 900, color: 'var(--lf-primary)', background: 'rgba(37,99,235,0.08)', padding: '4px 10px', borderRadius: '12px' }}>STEP 01</span>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: '0.85rem 0 0.4rem 0', color: 'var(--lf-text-primary)' }}>🔍 Diagnostic Ingestion</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--lf-text-muted)', lineHeight: 1.5, margin: 0 }}>Input text samples or upload documents to analyze phonetic & visual reading bottlenecks.</p>
            </div>
            <div style={{ background: '#ffffff', padding: '1.5rem', borderRadius: '18px', border: '1px solid var(--lf-border)', boxShadow: 'var(--lf-shadow-sm)', position: 'relative' }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 900, color: 'var(--lf-teal)', background: 'rgba(13,148,136,0.08)', padding: '4px 10px', borderRadius: '12px' }}>STEP 02</span>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: '0.85rem 0 0.4rem 0', color: 'var(--lf-text-primary)' }}>🧩 Cognitive Drills</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--lf-text-muted)', lineHeight: 1.5, margin: 0 }}>Engage in randomized phoneme matching, morphology, and ocular tracking exercises.</p>
            </div>
            <div style={{ background: '#ffffff', padding: '1.5rem', borderRadius: '18px', border: '1px solid var(--lf-border)', boxShadow: 'var(--lf-shadow-sm)', position: 'relative' }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 900, color: '#d97706', background: 'rgba(217,119,6,0.08)', padding: '4px 10px', borderRadius: '12px' }}>STEP 03</span>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: '0.85rem 0 0.4rem 0', color: 'var(--lf-text-primary)' }}>✨ Smart Reader</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--lf-text-muted)', lineHeight: 1.5, margin: 0 }}>Transform any article into Bionic fixation text with customized dyslexia-friendly overlays.</p>
            </div>
            <div style={{ background: '#ffffff', padding: '1.5rem', borderRadius: '18px', border: '1px solid var(--lf-border)', boxShadow: 'var(--lf-shadow-sm)', position: 'relative' }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 900, color: '#e11d48', background: 'rgba(225,29,72,0.08)', padding: '4px 10px', borderRadius: '12px' }}>STEP 04</span>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: '0.85rem 0 0.4rem 0', color: 'var(--lf-text-primary)' }}>📈 Growth Analytics</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--lf-text-muted)', lineHeight: 1.5, margin: 0 }}>Track longitudinal accuracy, speed trends, and milestone badges on your clinical dashboard.</p>
            </div>
          </div>
        </section>

        {/* Interactive Saccadic Simulator Section */}
        <section className="features-grid sandbox-section" style={{ paddingTop: '2rem', paddingBottom: '3rem' }}>
          <div className="home-screening-banner-card" style={{
            background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.06) 0%, rgba(13, 148, 136, 0.06) 100%)',
            border: '1px solid var(--lf-border)',
            borderRadius: '24px',
            padding: '3.5rem 2rem',
            textAlign: 'center',
            boxShadow: 'var(--lf-shadow-lg)',
            maxWidth: '920px',
            margin: '0 auto'
          }}>
            <span className="section-badge" style={{ marginBottom: '1rem', display: 'inline-block' }}>👁️ Dedicated Interactive Tool</span>
            <h2 className="section-title" style={{ fontSize: '2.2rem', marginBottom: '1rem' }}>
              Ocular Saccadic Tracking Simulator
            </h2>
            <p className="section-subtitle" style={{ maxWidth: '640px', margin: '0 auto 2rem auto', fontSize: '1rem', lineHeight: 1.6 }}>
              Test the motor visual-coordination exercises used in dyslexia recovery protocols. Customize tracking patterns, target speeds, and focus graphics in real-time.
            </p>

            <Link to="/simulator" className="btn-gradient" style={{ padding: '0.95rem 2.5rem', fontSize: '1.05rem', borderRadius: '14px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              Launch Full Saccadic Simulator 👁️ →
            </Link>
          </div>
        </section>

        <section className="quiz-section">
          <div className="home-screening-banner-card" style={{
            background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.06) 0%, rgba(13, 148, 136, 0.06) 100%)',
            border: '1px solid var(--lf-border)',
            borderRadius: '24px',
            padding: '3.5rem 2rem',
            textAlign: 'center',
            boxShadow: 'var(--lf-shadow-lg)',
            maxWidth: '920px',
            margin: '0 auto',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{ position: 'relative', zIndex: 2 }}>
              <span className="section-badge" style={{ marginBottom: '1rem', display: 'inline-block' }}>📋 Quick Clinical Assessment</span>
              <h2 className="section-title" style={{ fontSize: '2.2rem', marginBottom: '1rem' }}>
                Dyslexia Symptoms Screening
              </h2>
              <p className="section-subtitle" style={{ maxWidth: '640px', margin: '0 auto 2rem auto', fontSize: '1rem', lineHeight: 1.6 }}>
                Answer 10 basic developmental questions to evaluate key reading and phonological indicators in under 3 minutes, and receive immediate personalized recommendations.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.25rem', marginBottom: '2.5rem', textAlign: 'left' }}>
                <div style={{ background: '#ffffff', padding: '1.25rem', borderRadius: '16px', border: '1px solid var(--lf-border)', boxShadow: 'var(--lf-shadow-sm)' }}>
                  <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>⏱️</div>
                  <strong style={{ display: 'block', fontSize: '0.95rem', color: 'var(--lf-text-primary)', marginBottom: '4px' }}>3-Minute Test</strong>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--lf-text-muted)', lineHeight: 1.4 }}>Quick and non-invasive screening designed for parents and educators.</p>
                </div>
                <div style={{ background: '#ffffff', padding: '1.25rem', borderRadius: '16px', border: '1px solid var(--lf-border)', boxShadow: 'var(--lf-shadow-sm)' }}>
                  <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>🔄</div>
                  <strong style={{ display: 'block', fontSize: '0.95rem', color: 'var(--lf-text-primary)', marginBottom: '4px' }}>Dynamic Questions</strong>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--lf-text-muted)', lineHeight: 1.4 }}>Questions refresh automatically on every run for reliable results.</p>
                </div>
                <div style={{ background: '#ffffff', padding: '1.25rem', borderRadius: '16px', border: '1px solid var(--lf-border)', boxShadow: 'var(--lf-shadow-sm)' }}>
                  <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>📊</div>
                  <strong style={{ display: 'block', fontSize: '0.95rem', color: 'var(--lf-text-primary)', marginBottom: '4px' }}>Instant Report</strong>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--lf-text-muted)', lineHeight: 1.4 }}>Get immediate clinical insights and next steps after completing.</p>
                </div>
              </div>

              <Link to="/quiz" className="btn-gradient" style={{ padding: '0.95rem 2.5rem', fontSize: '1.05rem', borderRadius: '14px', textDecoration: 'none' }}>
                Start Symptoms Screening 📋 →
              </Link>
            </div>
          </div>
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
