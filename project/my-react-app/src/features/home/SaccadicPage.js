import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../dashboard/Navbar';
import './Home.css';

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
        newX = 15 + Math.sin(progress * Math.PI * 2) * 35 + 35;
        newY = 50;
      } else if (pattern === 'vertical') {
        newX = 50;
        newY = 15 + Math.sin(progress * Math.PI * 2) * 35 + 35;
      } else if (pattern === 'bounce') {
        const segment = Math.floor(progress * 4);
        if (segment === 0) { newX = 20; newY = 20; }
        else if (segment === 1) { newX = 80; newY = 20; }
        else if (segment === 2) { newX = 80; newY = 80; }
        else { newX = 20; newY = 80; }
      } else if (pattern === 'infinity') {
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
          <div className="saccadic-grid-line line-h"></div>
          <div className="saccadic-grid-line line-v"></div>

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

const SaccadicPage = () => {
  return (
    <div className="page-container" style={{ minHeight: '100vh', background: 'var(--lf-bg-primary, #f8fafc)', display: 'flex', flexDirection: 'column' }}>
      <Navbar />

      <main style={{ flex: 1, padding: '2.5rem 1.5rem', maxWidth: '1100px', margin: '0 auto', width: '100%' }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <Link to="/" style={{ textDecoration: 'none', color: 'var(--lf-primary, #2563eb)', fontWeight: 700, fontSize: '0.88rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            ← Back to Home
          </Link>
        </div>

        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <span className="badge badge-info" style={{ textTransform: 'uppercase', letterSpacing: '0.05em', padding: '6px 14px', borderRadius: '20px', fontWeight: 800, fontSize: '0.75rem', marginBottom: '0.75rem', display: 'inline-block' }}>
            👁️ INTERACTIVE SIMULATOR
          </span>
          <h1 style={{ fontSize: '2.2rem', fontWeight: 900, color: 'var(--lf-text-primary, #0f172a)', margin: '0.25rem 0 0.5rem 0', letterSpacing: '-0.025em' }}>
            Ocular Saccadic Tracking Simulator
          </h1>
          <p style={{ color: 'var(--lf-text-muted, #64748b)', fontSize: '1rem', maxWidth: '640px', margin: '0 auto', lineHeight: 1.6 }}>
            Test the motor visual-coordination exercises used in dyslexia recovery protocols. Follow the tracking marker to experience it live.
          </p>
        </div>

        <VisualSaccadicSandbox />
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

export default SaccadicPage;
