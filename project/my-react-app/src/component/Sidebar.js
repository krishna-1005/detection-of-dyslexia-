import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import './Sidebar.css';

const guides = {
  '/dashboard': [
    { title: '1. Dashboard Overview', content: 'Review your total diagnostic sessions, Average Risk score, and therapy progress at a glance.' },
    { title: '2. Diagnostic History', content: 'Observe historical session logs to check risk status trends over time.' },
    { title: '3. Therapy Suite', content: 'Launch any cognitive exercise (e.g. Visual Tracking, Phonemes) to build skills.' }
  ],
  '/detect': [
    { title: '1. Ingest Text', content: 'Input text manually, or click "Upload Clinical Sample" to read a doc/pdf/docx.' },
    { title: '2. Clinical Settings', content: 'Apply a clinical overlay, adjust letter spacing, or toggle Simulated Crowding/Focus Ruler.' },
    { title: '3. Run Diagnostics', content: 'Click "Run Diagnostics" to assess dyslexia risk indicators and download clinical reports.' }
  ],
  '/reader': [
    { title: '1. Source Content', content: 'Paste any complex text into the input area to begin the transformation.' },
    { title: '2. AI Simplification', content: 'Click "AI Simplify" to let Gemini rewrite the text into shorter, clearer sentences.' },
    { title: '3. Personalize View', content: 'Adjust font size, spacing, and toggle Bionic Reading or the Focus Ruler for your comfort.' }
  ]
};

const Sidebar = () => {
  const location = useLocation();
  const [visited, setVisited] = useState({});

  useEffect(() => {
    const savedVisited = JSON.parse(localStorage.getItem('lexiflow_visited') || '{}');
    const currentPath = location.pathname;
    if (!savedVisited[currentPath] && currentPath !== '/') {
      savedVisited[currentPath] = true;
      localStorage.setItem('lexiflow_visited', JSON.stringify(savedVisited));
    }
    setVisited(savedVisited);
  }, [location]);

  const mainLinks = [
    { path: '/dashboard', label: 'Overview', icon: '📊' },
    { path: '/detect', label: 'Diagnostic Engine', icon: '🧬' },
    { path: '/reader', label: 'Smart AI Reader', icon: '✨' },
  ];

  const therapyLinks = [
    { path: '/therapy/phoneme', label: 'Phoneme Matching', icon: '🧩' },
    { path: '/therapy/morphology', label: 'Morphology Builder', icon: '🧬' },
    { path: '/therapy/naming', label: 'Rapid Naming', icon: '⚡' },
    { path: '/therapy/visual', label: 'Visual Tracking', icon: '📖' },
    { path: '/therapy/auditory', label: 'Auditory Processing', icon: '🎧' },
    { path: '/therapy/video', label: 'Video Sessions', icon: '📹' },
  ];

  // Guide Me Integration
  const activeGuide = guides[location.pathname] || [];
  
  const [guideEnabled, setGuideEnabled] = useState(() => {
    return localStorage.getItem('lexiflow_guide_enabled') === 'true';
  });
  
  const [currentStep, setCurrentStep] = useState(() => {
    return parseInt(localStorage.getItem(`lexiflow_guide_step_${location.pathname}`) || '0');
  });

  const [completedSteps, setCompletedSteps] = useState(() => {
    return JSON.parse(localStorage.getItem(`lexiflow_guide_completed_${location.pathname}`) || '{}');
  });

  useEffect(() => {
    localStorage.setItem('lexiflow_guide_enabled', guideEnabled);
    window.dispatchEvent(new Event('storage'));
  }, [guideEnabled]);

  useEffect(() => {
    localStorage.setItem(`lexiflow_guide_step_${location.pathname}`, currentStep);
    window.dispatchEvent(new Event('storage'));
  }, [currentStep, location.pathname]);

  useEffect(() => {
    localStorage.setItem(`lexiflow_guide_completed_${location.pathname}`, JSON.stringify(completedSteps));
    window.dispatchEvent(new Event('storage'));
  }, [completedSteps, location.pathname]);

  useEffect(() => {
    const handleStorageChange = () => {
      const newGuideEnabled = localStorage.getItem('lexiflow_guide_enabled') === 'true';
      const newStep = parseInt(localStorage.getItem(`lexiflow_guide_step_${location.pathname}`) || '0');
      const newCompleted = localStorage.getItem(`lexiflow_guide_completed_${location.pathname}`) || '{}';

      setGuideEnabled(prev => prev !== newGuideEnabled ? newGuideEnabled : prev);
      setCurrentStep(prev => prev !== newStep ? newStep : prev);
      setCompletedSteps(prev => {
        const currentStr = JSON.stringify(prev);
        return currentStr !== newCompleted ? JSON.parse(newCompleted) : prev;
      });
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [location.pathname]);

  const toggleStepCompleted = (index) => {
    setCompletedSteps(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-section-title">Diagnostics</div>
      {mainLinks.map((link) => (
        <Link 
          key={link.path} 
          to={link.path} 
          className={`sidebar-item ${location.pathname === link.path ? 'active' : ''}`}
        >
          <span><span className="sidebar-icon">{link.icon}</span> {link.label}</span>
          {visited[link.path] && location.pathname !== link.path && <span className="visited-tick">✓</span>}
        </Link>
      ))}

      <div className="sidebar-section-title">Therapy Suite</div>
      {therapyLinks.map((link) => (
        <Link 
          key={link.label} 
          to={link.path} 
          className="sidebar-item"
        >
          <span><span className="sidebar-icon">{link.icon}</span> {link.label}</span>
        </Link>
      ))}

      {/* Persistent Guide Me Sidebar Widget */}
      {activeGuide.length > 0 && (
        <>
          <div className="sidebar-section-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem' }}>
            <span>Guide Me Mode</span>
            <button 
              onClick={() => setGuideEnabled(!guideEnabled)} 
              className="sidebar-guide-btn"
              style={{
                background: 'none',
                border: 'none',
                color: guideEnabled ? 'var(--med-teal)' : 'var(--med-gray)',
                cursor: 'pointer',
                fontWeight: 700,
                fontSize: '0.75rem',
                padding: '2px 6px'
              }}
            >
              {guideEnabled ? 'ON 🟢' : 'OFF ⚪'}
            </button>
          </div>

          {guideEnabled && (
            <div className="sidebar-guide-card">
              <h4 style={{ color: 'var(--med-blue-primary)', margin: 0, fontWeight: 700, fontSize: '0.85rem' }}>
                {activeGuide[currentStep]?.title}
              </h4>
              <p style={{ color: 'var(--med-gray)', margin: '0.5rem 0 0.75rem 0', lineHeight: '1.4', fontSize: '0.78rem' }}>
                {activeGuide[currentStep]?.content}
              </p>

              {/* Step Bar Indicators */}
              <div style={{ display: 'flex', gap: '6px', marginBottom: '0.75rem', alignItems: 'center' }}>
                {activeGuide.map((step, idx) => (
                  <div 
                    key={idx} 
                    onClick={() => setCurrentStep(idx)}
                    className="sidebar-guide-step-bar"
                    style={{
                      background: completedSteps[idx] 
                        ? 'var(--med-teal)' 
                        : (idx === currentStep ? 'var(--med-blue-primary)' : '#cbd5e1'),
                    }}
                    title={`Step ${idx + 1}: ${step.title}`}
                  />
                ))}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button 
                    disabled={currentStep === 0} 
                    onClick={() => setCurrentStep(currentStep - 1)}
                    className="sidebar-guide-btn"
                  >
                    Prev
                  </button>
                  <button 
                    disabled={currentStep === activeGuide.length - 1} 
                    onClick={() => setCurrentStep(currentStep + 1)}
                    className="sidebar-guide-btn"
                  >
                    Next
                  </button>
                </div>

                <button 
                  onClick={() => toggleStepCompleted(currentStep)}
                  className="sidebar-guide-btn"
                  style={{
                    background: completedSteps[currentStep] ? '#fee2e2' : 'var(--med-teal-soft)',
                    color: completedSteps[currentStep] ? '#ef4444' : 'var(--med-teal)',
                    border: 'none',
                    fontWeight: 700
                  }}
                >
                  {completedSteps[currentStep] ? 'Undo ✓' : 'Complete ✓'}
                </button>
              </div>
            </div>
          )}
        </>
      )}
      
      <div style={{ marginTop: 'auto', padding: '1rem', background: 'var(--med-teal-soft)', borderRadius: '12px', border: '1px solid #ccfbf1' }}>
        <small style={{ fontWeight: 800, color: 'var(--med-teal)', fontSize: '0.65rem', textTransform: 'uppercase' }}>System Status</small>
        <p style={{ fontSize: '0.75rem', color: 'var(--med-teal)', fontWeight: 600, marginTop: '0.25rem' }}>Neural Engine v4.2 Active</p>
      </div>
    </aside>
  );
};

export default Sidebar;
