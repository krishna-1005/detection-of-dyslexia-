import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import './GuideMe.css';

const GuideMe = () => {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  
  const guides = {
    '/': [
      { title: 'Welcome to LexiFlow', content: 'Explore our AI-powered dyslexia detection and assistance platform.' },
      { title: 'Join Now', content: 'Create an account to track your progress and access personalized features.' },
      { title: 'Run Analysis', content: 'Try our analysis tool to see how we can help you read and write better.' }
    ]
  };

  const activeGuide = guides[location.pathname] || [];

  const [currentStep, setCurrentStep] = useState(() => {
    return parseInt(localStorage.getItem(`lexiflow_guide_step_${location.pathname}`) || '0');
  });

  const [completedSteps, setCompletedSteps] = useState(() => {
    return JSON.parse(localStorage.getItem(`lexiflow_guide_completed_${location.pathname}`) || '{}');
  });

  useEffect(() => {
    localStorage.setItem(`lexiflow_guide_step_${location.pathname}`, currentStep);
  }, [currentStep, location.pathname]);

  useEffect(() => {
    localStorage.setItem(`lexiflow_guide_completed_${location.pathname}`, JSON.stringify(completedSteps));
  }, [completedSteps, location.pathname]);

  if (activeGuide.length === 0) return null;

  const toggleStepCompleted = (index) => {
    setCompletedSteps(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  return (
    <div className={`guide-me-container ${isOpen ? 'open' : ''}`}>
      <button className="guide-toggle" onClick={() => setIsOpen(!isOpen)}>
        {isOpen ? '✕' : '💡 Guide Me'}
      </button>
      
      {isOpen && (
        <div className="guide-content">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--primary-teal, #0f766e)' }}>{activeGuide[currentStep].title}</h3>
            {completedSteps[currentStep] && <span style={{ color: '#0d9488', fontWeight: 'bold' }}>✓</span>}
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-sub, #475569)', lineHeight: '1.4', marginBottom: '1rem' }}>{activeGuide[currentStep].content}</p>

          <div style={{ display: 'flex', gap: '6px', marginBottom: '1rem', alignItems: 'center' }}>
            {activeGuide.map((step, idx) => (
              <div 
                key={idx} 
                onClick={() => setCurrentStep(idx)}
                style={{
                  flex: 1,
                  height: '6px',
                  borderRadius: '3px',
                  background: completedSteps[idx] 
                    ? '#0d9488' 
                    : (idx === currentStep ? '#0f766e' : '#cbd5e1'),
                  cursor: 'pointer'
                }}
                title={`Go to Step ${idx + 1}`}
              />
            ))}
          </div>

          <div className="guide-nav" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: '4px' }}>
              <button 
                disabled={currentStep === 0} 
                onClick={() => setCurrentStep(currentStep - 1)}
                style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer', fontSize: '0.75rem' }}
              >
                Prev
              </button>
              <button 
                disabled={currentStep === activeGuide.length - 1} 
                onClick={() => setCurrentStep(currentStep + 1)}
                style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer', fontSize: '0.75rem' }}
              >
                Next
              </button>
            </div>
            <button 
              onClick={() => toggleStepCompleted(currentStep)}
              style={{
                padding: '4px 8px',
                borderRadius: '6px',
                border: 'none',
                background: completedSteps[currentStep] ? '#fee2e2' : '#ccfbf1',
                color: completedSteps[currentStep] ? '#ef4444' : '#0d9488',
                fontWeight: 700,
                cursor: 'pointer',
                fontSize: '0.75rem'
              }}
            >
              {completedSteps[currentStep] ? 'Undo ✓' : 'Complete ✓'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default GuideMe;
