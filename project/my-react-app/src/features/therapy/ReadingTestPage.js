import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../dashboard/Navbar';
import Sidebar from '../dashboard/Sidebar';
import VoicePractice from './VoicePractice';
import { useAuth } from '../auth/AuthContext';

const ReadingTestPage = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const user = currentUser;
  const [testStarted, setTestStarted] = useState(false);

  return (
    <div className="page-container kids-page-bg" style={{ minHeight: '100vh', background: 'radial-gradient(circle at 10% 20%, rgba(255, 242, 210, 0.5) 0%, rgba(224, 247, 250, 0.5) 50%, rgba(243, 229, 245, 0.5) 100%)' }}>
      <Navbar user={user} />
      <div className="dashboard-layout" style={{ display: 'flex' }}>
        <Sidebar />
        <main className="main-content" style={{ flex: 1, padding: '1rem 1.75rem' }}>
          {!testStarted ? (
            /* ── OPENING / WELCOME INSTRUCTIONS CARD VIEW ── */
            <>
              <header className="medical-header" style={{ marginBottom: '0.85rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span className="title-kids-badge" style={{ fontSize: '0.75rem', padding: '2px 10px', marginBottom: '0.2rem', display: 'inline-block' }}>
                    🎤 Live Reading Diagnostic Test
                  </span>
                  <h1 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#2f3542', margin: 0, fontFamily: 'var(--kids-font-display, "Fredoka", sans-serif)' }}>
                    🎤 Oral Reading Fluency & Voice Test
                  </h1>
                  <p style={{ color: '#57606f', fontSize: '0.82rem', margin: '0.15rem 0 0 0', fontWeight: 600 }}>
                    Read displayed sentences aloud into your microphone. Our real-time engine analyzes reading speed (WPM), accuracy, and flags mispronunciations.
                  </p>
                </div>
                <button 
                  className="kids-logout-btn" 
                  style={{ 
                    background: 'linear-gradient(135deg, #ff4757, #ff6b81)', 
                    border: 'none', 
                    color: '#fff', 
                    boxShadow: '0 4px 0 #d63031',
                    fontSize: '0.85rem',
                    padding: '0.5rem 1.2rem'
                  }} 
                  onClick={() => navigate('/dashboard')}
                >
                  🚀 Back to Dashboard
                </button>
              </header>

              <div style={{
                background: '#ffffff',
                borderRadius: '20px',
                padding: '1.25rem 1.75rem',
                border: '3px solid #74b9ff',
                boxShadow: '0 10px 30px rgba(0, 0, 0, 0.06)',
                maxWidth: '820px',
                margin: '0 auto',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '2.2rem', marginBottom: '0.2rem' }}>🎤 🎈</div>
                <span className="title-kids-badge" style={{ fontSize: '0.75rem', padding: '3px 12px', marginBottom: '0.35rem', display: 'inline-block' }}>
                  ✨ GET READY FOR YOUR READING TEST ✨
                </span>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 900, color: '#2f3542', margin: '0.1rem 0 0.35rem 0', fontFamily: 'var(--kids-font-display, "Fredoka", sans-serif)' }}>
                  Welcome to the Oral Reading & Fluency Test!
                </h2>
                <p style={{ color: '#57606f', fontSize: '0.88rem', lineHeight: '1.35', fontWeight: 600, maxWidth: '650px', margin: '0 auto 1rem auto' }}>
                  Test your reading superpowers! Read simple sentences aloud and get instant feedback on your reading speed, word accuracy, and fluency.
                </p>

                {/* 3 Step Instructions */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.85rem', marginBottom: '1.1rem', textAlign: 'left' }}>
                  <div style={{ background: '#f8fafc', padding: '0.75rem 0.9rem', borderRadius: '14px', border: '1.5px solid #e2e8f0' }}>
                    <div style={{ fontSize: '1.3rem', marginBottom: '0.2rem' }}>🎧</div>
                    <strong style={{ display: 'block', fontSize: '0.85rem', color: '#2f3542', marginBottom: '2px' }}>1. Quiet Room</strong>
                    <small style={{ color: '#64748b', fontSize: '0.75rem', lineHeight: '1.3', display: 'block', fontWeight: 600 }}>
                      Find a quiet place and allow microphone access when prompted.
                    </small>
                  </div>

                  <div style={{ background: '#f8fafc', padding: '0.75rem 0.9rem', borderRadius: '14px', border: '1.5px solid #e2e8f0' }}>
                    <div style={{ fontSize: '1.3rem', marginBottom: '0.2rem' }}>📖</div>
                    <strong style={{ display: 'block', fontSize: '0.85rem', color: '#2f3542', marginBottom: '2px' }}>2. Read Aloud</strong>
                    <small style={{ color: '#64748b', fontSize: '0.75rem', lineHeight: '1.3', display: 'block', fontWeight: 600 }}>
                      Read each target sentence clearly into your mic at your natural pace.
                    </small>
                  </div>

                  <div style={{ background: '#f8fafc', padding: '0.75rem 0.9rem', borderRadius: '14px', border: '1.5px solid #e2e8f0' }}>
                    <div style={{ fontSize: '1.3rem', marginBottom: '0.2rem' }}>📊</div>
                    <strong style={{ display: 'block', fontSize: '0.85rem', color: '#2f3542', marginBottom: '2px' }}>3. Star Rewards</strong>
                    <small style={{ color: '#64748b', fontSize: '0.75rem', lineHeight: '1.3', display: 'block', fontWeight: 600 }}>
                      Get WPM speed scores, accuracy metrics, and earn star trophies!
                    </small>
                  </div>
                </div>

                {/* OK Start Button */}
                <button
                  onClick={() => setTestStarted(true)}
                  style={{
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    color: '#ffffff',
                    border: 'none',
                    padding: '0.75rem 2.6rem',
                    fontSize: '1.05rem',
                    fontWeight: 900,
                    borderRadius: '16px',
                    cursor: 'pointer',
                    boxShadow: '0 6px 20px rgba(16, 185, 129, 0.35)',
                    transition: 'transform 0.15s ease',
                  }}
                >
                  OK, Start Reading Test! 🚀
                </button>
              </div>
            </>
          ) : (
            /* ── ACTIVE TEST CANVAS VIEW (COMPACT TOP BAR) ── */
            <div style={{ width: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span className="title-kids-badge" style={{ fontSize: '0.75rem', padding: '2px 10px' }}>
                  🎤 Live Oral Reading Diagnostic Test
                </span>
                <button 
                  className="kids-logout-btn" 
                  style={{ 
                    background: 'linear-gradient(135deg, #ff4757, #ff6b81)', 
                    border: 'none', 
                    color: '#fff', 
                    boxShadow: '0 3px 0 #d63031',
                    fontSize: '0.8rem',
                    padding: '0.4rem 1.1rem'
                  }} 
                  onClick={() => navigate('/dashboard')}
                >
                  🚀 Back to Dashboard
                </button>
              </div>
              <VoicePractice onComplete={() => navigate('/analysis')} />
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default ReadingTestPage;
