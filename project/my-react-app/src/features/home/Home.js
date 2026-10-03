import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import './Home.css';
import { useAuth } from '../auth/AuthContext';
import mascotImg from '../../images/lexi_owl_mascot.png';
import { speakText } from '../../utils/speechHelper';

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

// 1. Fairy Tale Bionic Reader Sandbox for Kids
const BionicReaderSandbox = () => {
  const [inputText, setInputText] = useState(
    "Once upon a time, Barnaby the Little Dragon found a glowing magic map in the Whispering Forest! With bionic magic vision, reading every word becomes easy, fast, and super fun for every young adventurer!"
  );
  const [bionicActive, setBionicActive] = useState(true);
  const [dyslexicFont, setDyslexicFont] = useState(true);
  const [focusLine, setFocusLine] = useState(false);
  const [compareMode, setCompareMode] = useState(false);
  const [fontSize, setFontSize] = useState('1.1rem');

  const formatBionicText = (text) => {
    return text.split(' ').map((word, wIdx) => {
      if (word.length <= 1) return <span key={wIdx}>{word} </span>;
      const mid = Math.ceil(word.length / 2);
      const boldPart = word.slice(0, mid);
      const restPart = word.slice(mid);
      return (
        <span key={wIdx} className="bionic-word">
          <strong style={{ color: '#ff4757', fontWeight: 800 }}>{boldPart}</strong>
          <span>{restPart}</span>{' '}
        </span>
      );
    });
  };

  return (
    <div className="sandbox-panel bionic-sandbox-panel kids-card-box">
      <div className="sandbox-controls">
        <div className="sandbox-section-title">✨ Magic Story Reader Sandbox</div>
        <p className="sandbox-helper">Try turning on Bionic Fixation & Dyslexia Magic Font to see how easy reading becomes!</p>
        
        <div className="sandbox-group">
          <div className="sandbox-title-label">🎮 Interactive Magic Toggles</div>
          <button 
            className={`sandbox-btn kids-btn-toggle ${bionicActive ? 'active-kids' : ''}`}
            onClick={() => setBionicActive(!bionicActive)}
          >
            ✨ Bionic Fixation ({bionicActive ? 'ON 🌟' : 'OFF'})
          </button>
          <button 
            className={`sandbox-btn kids-btn-toggle ${dyslexicFont ? 'active-kids' : ''}`}
            onClick={() => setDyslexicFont(!dyslexicFont)}
          >
            📖 OpenDyslexic Font ({dyslexicFont ? 'ON 🦄' : 'OFF'})
          </button>
          <button 
            className={`sandbox-btn kids-btn-toggle ${focusLine ? 'active-kids' : ''}`}
            onClick={() => setFocusLine(!focusLine)}
          >
            🔍 Focus Reading Beam ({focusLine ? 'ON 🔦' : 'OFF'})
          </button>
          <button 
            className={`sandbox-btn kids-btn-toggle ${compareMode ? 'active-kids-compare' : ''}`}
            onClick={() => setCompareMode(!compareMode)}
          >
            ⚖️ Split Compare Mode
          </button>
        </div>

        <div className="sandbox-group">
          <div className="sandbox-title-label">🔤 Font Zoom Level</div>
          <div style={{ display: 'flex', gap: '0.4rem' }}>
            <button 
              className={`sandbox-btn-sm ${fontSize === '0.95rem' ? 'active-kids' : ''}`} 
              onClick={() => setFontSize('0.95rem')}
            >
              Normal A
            </button>
            <button 
              className={`sandbox-btn-sm ${fontSize === '1.15rem' ? 'active-kids' : ''}`} 
              onClick={() => setFontSize('1.15rem')}
            >
              Big A+
            </button>
            <button 
              className={`sandbox-btn-sm ${fontSize === '1.35rem' ? 'active-kids' : ''}`} 
              onClick={() => setFontSize('1.35rem')}
            >
              Super A++
            </button>
          </div>
        </div>

        <div className="sandbox-group">
          <div className="sandbox-title-label">✏️ Try Your Own Story</div>
          <textarea 
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            className="analysis-input kids-textarea"
            placeholder="Type or paste any story text to transform into magic text..."
          />
        </div>
      </div>

      <div className="sandbox-workspace">
        <div className="sandbox-section-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>📖 Transformed Storybook Canvas</span>
          <span className="kids-live-pill">LIVE MAGIC PREVIEW ✨</span>
        </div>

        {compareMode ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
            <div style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '20px', border: '2px solid #e2e8f0' }}>
              <small style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '8px' }}>Standard Book Text</small>
              <p style={{ fontSize: fontSize, lineHeight: 1.6, color: '#334155', margin: 0 }}>{inputText}</p>
            </div>
            <div style={{
              background: 'linear-gradient(135deg, rgba(255, 242, 210, 0.5) 0%, rgba(224, 247, 250, 0.6) 100%)',
              padding: '1.25rem',
              borderRadius: '20px',
              border: '2px solid #38ada9',
              fontFamily: dyslexicFont ? "'OpenDyslexic', 'Comic Sans MS', sans-serif" : 'inherit',
              letterSpacing: dyslexicFont ? '0.04em' : 'normal',
              lineHeight: 1.85
            }}>
              <small style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#079992', textTransform: 'uppercase', marginBottom: '8px' }}>✨ LexiFlow Magic Reader</small>
              <p style={{ fontSize: fontSize, color: '#1e272e', margin: 0 }}>
                {bionicActive ? formatBionicText(inputText) : inputText}
              </p>
            </div>
          </div>
        ) : (
          <div style={{
            background: focusLine ? 'linear-gradient(180deg, #ffffff 0%, rgba(255, 221, 89, 0.25) 50%, #ffffff 100%)' : '#ffffff',
            padding: '1.75rem',
            borderRadius: '20px',
            border: '2px solid #78e08f',
            minHeight: '170px',
            marginTop: '1rem',
            fontFamily: dyslexicFont ? "'OpenDyslexic', 'Comic Sans MS', sans-serif" : 'inherit',
            letterSpacing: dyslexicFont ? '0.05em' : 'normal',
            lineHeight: 1.9,
            boxShadow: '0 4px 15px rgba(0, 0, 0, 0.04)'
          }}>
            <p style={{ fontSize: fontSize, color: '#2f3542', margin: 0 }}>
              {bionicActive ? formatBionicText(inputText) : inputText}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

// 2. Interactive Sound & Phoneme Audio Sampler for Kids
const PhonemeAudioSampler = () => {
  const [activePhoneme, setActivePhoneme] = useState(null);
  const [popParticle, setPopParticle] = useState(null);

  const phonemeList = [
    { sound: '/ch/', word: 'Chair 🪑', breakdown: '/ch/ - /ɛər/', color: '#ff4757', emoji: '🪑' },
    { sound: '/sh/', word: 'Shark 🦈', breakdown: '/sh/ - /ɑːrk/', color: '#2e86de', emoji: '🦈' },
    { sound: '/th/', word: 'Thunder ⚡', breakdown: '/th/ - /ʌn/ - /dər/', color: '#ffa801', emoji: '⚡' },
    { sound: '/ph/', word: 'Phone 📱', breakdown: '/f/ - /oʊn/', color: '#ff6b81', emoji: '📱' },
    { sound: '/bl/', word: 'Blast 🚀', breakdown: '/bl/ - /æst/', color: '#9c88ff', emoji: '🚀' },
    { sound: '/str/', word: 'Star ⭐', breakdown: '/str/ - /ɑːr/', color: '#1dd1a1', emoji: '⭐' }
  ];

  const playAudio = (item) => {
    setActivePhoneme(item.sound);
    setPopParticle(item.sound);
    setTimeout(() => setPopParticle(null), 600);

    speakText(`${item.word}. Sound: ${item.sound.replace(/\//g, '')}`, { rate: 0.9, pitch: 1.08 });
  };

  return (
    <div className="phoneme-sampler-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.25rem', marginTop: '1.5rem' }}>
      {phonemeList.map((item) => (
        <div 
          key={item.sound}
          onClick={() => playAudio(item)}
          className={`kids-sound-card ${activePhoneme === item.sound ? 'active-sound' : ''} ${popParticle === item.sound ? 'pop-bounce' : ''}`}
          style={{
            background: activePhoneme === item.sound ? 'linear-gradient(135deg, rgba(255,255,255,1) 0%, rgba(255,242,210,0.8) 100%)' : '#ffffff',
            borderColor: item.color
          }}
        >
          <div 
            className="kids-sound-icon-box"
            style={{ background: `${item.color}20`, color: item.color }}
          >
            {item.emoji}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <strong style={{ fontSize: '1.3rem', fontWeight: 900, color: '#2f3542' }}>{item.sound}</strong>
              <span className="sound-word-tag" style={{ background: `${item.color}15`, color: item.color }}>{item.word}</span>
            </div>
            <small style={{ color: '#747d8c', fontSize: '0.8rem', fontWeight: 700, display: 'block', marginTop: '4px' }}>
              Breakdown: {item.breakdown}
            </small>
          </div>
          <div className="kids-speaker-bubble" style={{ background: item.color }}>
            🔊
          </div>
        </div>
      ))}
    </div>
  );
};

// 3. Hero Kids Adventure Hub & Mascot Showcase
const HeroKidsArcadeShowcase = () => {
  const [activeTab, setActiveTab] = useState('games');

  return (
    <div className="hero-dashboard-showcase-container kids-arcade-container">
      {/* Background Floating Rainbow Stars & Bubbles */}
      <div className="kids-floating-bubble bubble-1">🎈</div>
      <div className="kids-floating-bubble bubble-2">⭐</div>
      <div className="kids-floating-bubble bubble-3">✨</div>
      <div className="kids-floating-bubble bubble-4">🚀</div>

      {/* Floating Star & Streak Badges */}
      <div className="showcase-float-card kids-float-stars">
        <div className="float-badge-icon" style={{ background: '#fff200', color: '#d97706' }}>⭐</div>
        <div>
          <strong>450 Stars</strong>
          <small style={{ color: '#ff9f43', fontWeight: 800 }}>Collected!</small>
        </div>
      </div>

      <div className="showcase-float-card kids-float-streak">
        <div className="float-arrow-box" style={{ background: '#ff6b6b15', color: '#ff6b6b' }}>🔥</div>
        <div>
          <strong>7 Day Streak</strong>
          <small style={{ color: '#ee5253', fontWeight: 800 }}>Super Reader!</small>
        </div>
      </div>

      <div className="showcase-float-card kids-float-level">
        <span style={{ fontSize: '1.2rem' }}>🏆</span>
        <div>
          <strong>Level 5 Master</strong>
          <small style={{ fontWeight: 700, color: '#10b981' }}>Unstoppable!</small>
        </div>
      </div>

      {/* Main Mascot & Arcade Window */}
      <div className="mock-app-window kids-window-frame">
        {/* Top Playful Bar */}
        <div className="mock-app-navbar kids-top-bar">
          <div className="mock-app-brand">
            <div className="kids-logo-badge">🌈</div>
            <span style={{ fontWeight: 900, color: '#2f3542', fontSize: '1rem' }}>LexiFlow Kids Arcade</span>
          </div>
          <div className="kids-streak-pill">
            <span>⭐ 450 Stars</span>
          </div>
        </div>

        {/* Mascot Greeting Banner */}
        <div className="kids-mascot-hero-card">
          <img src={mascotImg} alt="Lexi Owl Mascot" className="kids-mascot-img-large" />
          <div className="kids-mascot-speech-bubble">
            <div className="speech-arrow"></div>
            <h3>Hi! I'm Lexi 🦉</h3>
            <p>Welcome to your reading quest! Ready to play games and collect stars?</p>
            <div className="kids-mascot-tags">
              <span className="kids-tag tag-pink">🎮 8 Mini Games</span>
              <span className="kids-tag tag-yellow">🏆 Star Trophies</span>
            </div>
          </div>
        </div>

        {/* Game Modules Grid */}
        <div className="kids-arcade-games-grid">
          <Link to="/therapy/phoneme" className="kids-game-card game-jar">
            <div className="game-icon">🫙</div>
            <div className="game-info">
              <h4>Phoneme Jar Collector</h4>
              <p>Catch falling letter sounds in magic jars!</p>
            </div>
            <span className="game-play-btn">Play ➔</span>
          </Link>

          <Link to="/therapy/phoneme" className="kids-game-card game-cannon">
            <div className="game-icon">🚀</div>
            <div className="game-info">
              <h4>Sound Blast Cannon</h4>
              <p>Pop sound bubbles in space!</p>
            </div>
            <span className="game-play-btn">Play ➔</span>
          </Link>

          <Link to="/therapy/phoneme" className="kids-game-card game-ninja">
            <div className="game-icon">🥷</div>
            <div className="game-info">
              <h4>Flash Word Ninja</h4>
              <p>Slice sight words before they land!</p>
            </div>
            <span className="game-play-btn">Play ➔</span>
          </Link>

          <Link to="/therapy/phoneme" className="kids-game-card game-maze">
            <div className="game-icon">🌀</div>
            <div className="game-info">
              <h4>Mirror Letter Maze</h4>
              <p>Untangle tricky 'b' & 'd' letters!</p>
            </div>
            <span className="game-play-btn">Play ➔</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

const Home = () => {
  const { currentUser, logout } = useAuth();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (e) {
      console.error("Logout error:", e);
    }
  };

  return (
    <div className="home-container kids-home-theme">
      {/* Navbar */}
      <nav className={`home-navbar kids-navbar ${scrolled ? 'navbar-kids-scrolled' : ''}`}>
        <Link to="/" className="nav-brand">
          <div className="nav-logo-icon kids-logo-rainbow">🌈</div>
          <h2 className="kids-brand-title">LexiFlow <span className="title-kids-badge">Kids 🎈</span></h2>
        </Link>
        <div className="nav-links">
          <Link to="/simulator" className="nav-item kids-nav-item">🎯 Tracking Practice</Link>
          <Link to="/therapy/phoneme" className="nav-item kids-nav-item">🎮 Therapy Games</Link>
          <Link to="/quiz" className="nav-item kids-nav-item">📋 Quick Quiz</Link>
          {currentUser ? (
            <>
              <Link to="/dashboard" className="home-cta-btn kids-cta-btn">Kid Dashboard 🚀</Link>
              <button 
                onClick={handleLogout} 
                className="kids-logout-btn"
              >
                Sign Out
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="kids-nav-item kids-login-btn">Login</Link>
              <Link to="/signup" className="home-cta-btn kids-cta-btn">Start Adventure 🚀</Link>
            </>
          )}
        </div>
      </nav>

      <main>
        {/* Playful Hero Section */}
        <section className="hero-section kids-hero-bg">
          <div className="hero-container-inner">
            <div className="hero-content-left">
              {/* Badge */}
              <span className="hero-badge-green kids-hero-badge">
                <span className="badge-dot-green"></span>
                🌟 100% Kid Friendly & Science Backed
              </span>

              {/* Heading */}
              <h1 className="hero-title-mockup kids-title">
                Make Reading Your <br />
                <span className="highlight-text-sparkle">Superpower! 🚀✨</span>
              </h1>

              {/* Subtitle Highlight Pill */}
              <div className="hero-subtitle-highlight-box kids-subtitle-box">
                Fun Therapy Games • Bionic Story Reader • Star Rewards 🏆
              </div>

              {/* Feature Chips */}
              <div className="hero-chips-grid-2x2">
                <span className="mock-chip chip-blue">🎮 8+ Playful Games</span>
                <span className="mock-chip chip-pink">📖 Magic Story Reader</span>
                <span className="mock-chip chip-green">🏆 Star Badges & Trophies</span>
                <span className="mock-chip chip-orange">🔊 Sound Blast Power</span>
              </div>

              {/* CTA Buttons */}
              <div className="hero-btn-group-mockup">
                <Link to={currentUser ? "/detect" : "/signup"} className="btn-royal-blue kids-btn-primary">
                  Start Your Fun Quest! 🚀
                </Link>
                <Link to="/therapy/phoneme" className="btn-outline-white kids-btn-secondary">
                  Play Therapy Games 🎮
                </Link>
              </div>

              {/* Trust Indicators Row */}
              <div className="hero-trust-row-mockup">
                <div className="trust-box-item">
                  <div className="trust-icon-box" style={{ background: '#ffeaa7', color: '#d97706' }}>🔒</div>
                  <span>100% Safe &<br />Ad-Free</span>
                </div>
                <div className="trust-box-item">
                  <div className="trust-icon-box" style={{ background: '#74b9ff20', color: '#0984e3' }}>👨‍👩‍👧</div>
                  <span>Loved by Parents<br />& Teachers</span>
                </div>
                <div className="trust-box-item">
                  <div className="trust-icon-box" style={{ background: '#55efc420', color: '#00b894' }}>🧠</div>
                  <span>Orton-Gillingham<br />Multisensory</span>
                </div>
              </div>
            </div>

            <div className="hero-content-right">
              <HeroKidsArcadeShowcase />
            </div>
          </div>
        </section>


        {/* 4-Step Kids Quest Roadmap */}
        <section className="features-grid kids-features-section">
          <div className="features-header">
            <span className="section-badge kids-badge-pill">🗺️ Your Reading Quest</span>
            <h2 className="section-title kids-section-title">Your Reading Adventure in 4 Easy Steps!</h2>
            <p className="section-subtitle">Discover how LexiFlow transforms reading practice into an exciting, reward-filled quest!</p>
          </div>

          <div className="kids-roadmap-grid">
            <div className="kids-step-card step-1">
              <div className="step-num-bubble">STEP 01</div>
              <h3>🎯 Take the Fun Quiz Quest</h3>
              <p>Answer 10 short, colorful questions to uncover your unique reading superpowers!</p>
            </div>
            <div className="kids-step-card step-2">
              <div className="step-num-bubble">STEP 02</div>
              <h3>🎧 Play Sound Games</h3>
              <p>Catch falling sound jars, blast phoneme bubbles, and slice sight words in mid-air!</p>
            </div>
            <div className="kids-step-card step-3">
              <div className="step-num-bubble">STEP 03</div>
              <h3>📖 Read Magic Stories</h3>
              <p>Transform any school book or story into easy-to-read Bionic magic text!</p>
            </div>
            <div className="kids-step-card step-4">
              <div className="step-num-bubble">STEP 04</div>
              <h3>🏆 Collect Stars & Badges</h3>
              <p>Track daily streaks, earn star trophies, and celebrate every reading milestone!</p>
            </div>
          </div>
        </section>

        {/* Live Interactive Sandboxes Section */}
        <section className="features-grid kids-sandbox-container">
          <div className="features-header">
            <span className="section-badge kids-badge-pill">✨ Interactive Magic Reader Sandbox</span>
            <h2 className="section-title kids-section-title">Experience the Magic Story Reader Live!</h2>
            <p className="section-subtitle">Test out our bionic reading cues and dyslexia-friendly font below!</p>
          </div>

          <BionicReaderSandbox />
        </section>

        {/* Interactive Sound Sampler Section */}
        <section className="features-grid kids-sound-container">
          <div className="features-header">
            <span className="section-badge kids-badge-pill">🔊 Sound Magic Sampler</span>
            <h2 className="section-title kids-section-title">Tap to Hear Sound Blasts!</h2>
            <p className="section-subtitle">Listen to key phoneme sounds and practice your listening powers!</p>
          </div>

          <PhonemeAudioSampler />
        </section>

        {/* Ocular Tracking Simulator Section */}
        <section className="features-grid sandbox-section">
          <div className="home-screening-banner-card kids-simulator-banner">
            <span className="section-badge kids-badge-pill" style={{ marginBottom: '1rem' }}>🎯 Visual Tracking Practice</span>
            <h2 className="section-title kids-banner-title">
              Visual Tracking Practice Games 🎯✨
            </h2>
            <p className="section-subtitle kids-banner-sub">
              Train your visual discrimination and letter-reversal skills with Letter Twins Hunt & Word Jumble Ninja!
            </p>

            <Link to="/therapy/visual" className="btn-gradient kids-btn-primary" style={{ padding: '0.95rem 2.5rem', fontSize: '1.05rem', borderRadius: '18px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              Launch Visual Tracking Practice 🎯 →
            </Link>
          </div>
        </section>

        {/* Symptoms Quiz Screening Section */}
        <section className="quiz-section">
          <div className="home-screening-banner-card kids-quiz-banner">
            <div style={{ position: 'relative', zIndex: 2 }}>
              <span className="section-badge kids-badge-pill" style={{ marginBottom: '1rem' }}>📋 Quick 3-Minute Quiz</span>
              <h2 className="section-title kids-banner-title">
                Ready for Your Reading Superpower Quiz? 📋✨
              </h2>
              <p className="section-subtitle kids-banner-sub">
                Answer 10 fun, non-invasive developmental questions to find your personalized therapy games and reading recommendations!
              </p>

              <div className="kids-quiz-perks-grid">
                <div className="kids-perk-card">
                  <div className="perk-emoji">⏱️</div>
                  <strong>3-Minute Test</strong>
                  <p>Quick & easy screening for kids, parents, and teachers.</p>
                </div>
                <div className="kids-perk-card">
                  <div className="perk-emoji">🔄</div>
                  <strong>Fun & Friendly</strong>
                  <p>Encouraging questions that adapt to your child's pace.</p>
                </div>
                <div className="kids-perk-card">
                  <div className="perk-emoji">📊</div>
                  <strong>Instant Insights</strong>
                  <p>Get immediate personalized game recommendations!</p>
                </div>
              </div>

              <Link to="/quiz" className="btn-gradient kids-btn-primary" style={{ padding: '0.95rem 2.5rem', fontSize: '1.05rem', borderRadius: '18px', textDecoration: 'none' }}>
                Start Symptoms Quiz 📋 →
              </Link>
            </div>
          </div>
        </section>

        {/* Parents & Educators Trust Section */}
        <section className="features-grid kids-parents-trust-section">
          <div className="features-header">
            <span className="section-badge kids-badge-pill">👨‍👩‍👧‍👦 Parent & Educator Hub</span>
            <h2 className="section-title kids-section-title">Designed for Kids, Trusted by Adults</h2>
            <p className="section-subtitle">We combine evidence-based phonics research with engaging game mechanics to build lasting reading confidence.</p>
          </div>

          <div className="kids-trust-cards-grid">
            <div className="kids-trust-card">
              <div className="trust-card-icon">🧪</div>
              <h3>Orton-Gillingham Science</h3>
              <p>Multi-sensory auditory, visual, and kinesthetic drills designed by dyslexia reading specialists.</p>
            </div>

            <div className="kids-trust-card">
              <div className="trust-card-icon">🔒</div>
              <h3>100% Safe & Ad-Free</h3>
              <p>Zero advertisements, strict data privacy, and a focused environment designed for zero stress.</p>
            </div>

            <div className="kids-trust-card">
              <div className="trust-card-icon">📈</div>
              <h3>Parent Growth Reports</h3>
              <p>Track real longitudinal reading speed, phoneme accuracy trends, and milestone achievements.</p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="home-footer kids-footer">
        <div className="footer-inner">
          <div className="footer-brand">
            <div className="nav-logo-icon kids-logo-rainbow">🌈</div>
            <span style={{ fontWeight: 900, fontSize: '1.2rem', color: '#2f3542' }}>LexiFlow Kids</span>
          </div>
          <p>© 2026 LexiFlow Kids • Making Reading a Magical Adventure for Everyone! 🚀</p>
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
