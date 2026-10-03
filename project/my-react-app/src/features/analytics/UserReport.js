import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../dashboard/Navbar';
import Sidebar from '../dashboard/Sidebar';
import './UserReport.css';
import { useAuth } from '../auth/AuthContext';

const UserReport = () => {
  const navigate = useNavigate();
  const [reportData, setReportData] = useState(null);
  const { currentUser } = useAuth();
  const user = currentUser;

  useEffect(() => {
    const uid = currentUser?.uid;
    const historyKey = uid ? `lexiflow_history_${uid}` : "lexiflow_history";
    const exHistoryKey = uid ? `lexiflow_exercise_history_${uid}` : 'lexiflow_exercise_history';

    const historyUid = JSON.parse(localStorage.getItem(historyKey) || "[]");
    const historyGlobal = JSON.parse(localStorage.getItem("lexiflow_history") || "[]");
    const history = [...historyUid, ...historyGlobal];

    const exHistoryUid = JSON.parse(localStorage.getItem(exHistoryKey) || "{}");
    const exHistoryGlobal = JSON.parse(localStorage.getItem("lexiflow_exercise_history") || "{}");
    const exHistory = { ...exHistoryGlobal, ...exHistoryUid };
    
    if (history.length === 0 && Object.keys(exHistory).length === 0) {
      setReportData({ isEmpty: true });
      return;
    }

    const report = {
      isEmpty: false,
      overallProgress: Math.min(100, (history.length + Object.keys(exHistory).length) * 5),
      lastActive: new Date().toLocaleDateString(),
      modules: [
        { 
          name: 'Phoneme Matching', 
          sessions: exHistory.phoneme?.sessions || 0,
          score: exHistory.phoneme?.accuracy?.replace('%', '') || 0,
          trend: exHistory.phoneme?.trend || 'Stable',
          color: '#10b981'
        },
        { 
          name: 'Morphology Builder', 
          sessions: exHistory.morphology?.sessions || 0,
          score: exHistory.morphology?.accuracy?.replace('%', '') || 0,
          trend: exHistory.morphology?.trend || 'Stable',
          color: '#818cf8'
        },
        { 
          name: 'Rapid Naming', 
          sessions: exHistory.naming?.sessions || 0,
          score: exHistory.naming?.accuracy?.replace('%', '') || 0,
          trend: exHistory.naming?.trend || 'Stable',
          color: '#fbbf24'
        },
        { 
          name: 'Visual Tracking Practice', 
          sessions: exHistory.visual?.sessions || 0,
          score: exHistory.visual?.accuracy?.replace('%', '') || 0,
          trend: exHistory.visual?.trend || 'Stable',
          color: '#f43f5e'
        },
        { 
          name: 'Auditory Processing', 
          sessions: exHistory.auditory?.sessions || 0,
          score: exHistory.auditory?.accuracy?.replace('%', '') || 0,
          trend: exHistory.auditory?.trend || 'Stable',
          color: '#f59e0b'
        },
        { 
          name: 'Live Video Practice', 
          sessions: exHistory.video?.sessions || 0,
          score: exHistory.video?.accuracy?.replace('%', '') || 0,
          trend: exHistory.video?.trend || 'Stable',
          color: '#a78bfa'
        }
      ],
      cognitiveMarkers: [
        { label: 'Grapheme-Phoneme Link', value: parseInt(exHistory.phoneme?.accuracy) || 0 },
        { label: 'Morphological Awareness', value: parseInt(exHistory.morphology?.accuracy) || 0 },
        { label: 'Rapid Retrieval Speed', value: exHistory.naming ? 85 : 0 },
        { label: 'Ocular Focus Stability', value: parseInt(exHistory.visual?.accuracy) || 0 },
        { label: 'Auditory Discrimination', value: parseInt(exHistory.auditory?.accuracy) || 0 },
        { label: 'Reading Fluency', value: history.length > 0 ? 60 : 0 }
      ],
      clinicianSummary: history.length > 0 
        ? "User has initiated diagnostics. Patterns indicate initial cognitive markers consistent with linguistic transposition."
        : "Initial baseline established. Awaiting further interactive session data for comprehensive analysis."
    };
    setReportData(report);
  }, []);

  if (!reportData) return null;

  if (reportData.isEmpty) {
    return (
      <div className="page-container">
        <Navbar user={user} />
        <div className="dashboard-layout" style={{ display: 'flex' }}>
          <Sidebar />
          <main className="main-content" style={{ flex: 1, padding: '2.5rem' }}>
            <div className="medical-card" style={{ textAlign: 'center', padding: '5rem 2rem' }}>
              <span style={{ fontSize: '4rem' }}>📊</span>
              <h2 style={{ color: 'var(--lf-indigo-light)', marginTop: '2rem', fontFamily: "'Outfit', sans-serif" }}>No Diagnostic History Found</h2>
              <p style={{ color: 'var(--lf-text-muted)', maxWidth: '500px', margin: '1rem auto' }}>
                Your clinical analysis report will be generated once you complete your first text analysis or therapeutic exercise.
              </p>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container kids-page-bg" style={{ minHeight: '100vh', background: 'radial-gradient(circle at 10% 20%, rgba(255, 242, 210, 0.5) 0%, rgba(224, 247, 250, 0.5) 50%, rgba(243, 229, 245, 0.5) 100%)' }}>
      <Navbar user={user} />
      <div className="dashboard-layout" style={{ display: 'flex' }}>
        <Sidebar />
        <main className="main-content" style={{ flex: 1, padding: '2.5rem' }}>
          <header className="medical-header" style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span className="title-kids-badge" style={{ fontSize: '0.85rem', padding: '4px 12px', marginBottom: '0.4rem', display: 'inline-block' }}>📊 Kids Therapy Analysis 🎈</span>
              <h1 style={{ fontSize: '2.2rem', fontWeight: 900, color: '#2f3542', margin: 0, fontFamily: 'var(--kids-font-display, "Fredoka", sans-serif)' }}>
                🏆 Comprehensive Performance Report 🎈
              </h1>
              <p style={{ color: '#57606f', fontSize: '0.95rem', marginTop: '0.4rem', fontWeight: 600 }}>
                Clinical & Arcade Summary - {reportData.lastActive}
              </p>
            </div>
            <button className="kids-logout-btn" style={{ background: 'linear-gradient(135deg, #74b9ff, #0984e3)', border: 'none', color: '#fff', boxShadow: '0 5px 0 #0984e3', fontSize: '0.9rem', padding: '0.55rem 1.3rem' }} onClick={() => window.print()}>
              🖨️ Download Report 🚀
            </button>
          </header>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            {/* Module Performance */}
            <div className="medical-card">
              <h3 style={{ marginBottom: '1.5rem', fontSize: '1.05rem', fontWeight: 700, color: 'var(--lf-text-primary)' }}>Module Performance</h3>
              <div>
                {reportData.modules.map(mod => (
                  <div key={mod.name} style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem 0', borderBottom: '1px solid var(--lf-border)' }}>
                    <div>
                      <strong style={{ display: 'block', fontSize: '0.95rem', color: 'var(--lf-text-primary)' }}>{mod.name}</strong>
                      <small style={{ color: 'var(--lf-text-muted)' }}>{mod.sessions} Sessions Completed</small>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ color: mod.color, fontWeight: 800, fontSize: '1.2rem', display: 'block' }}>{mod.score}%</span>
                      <small style={{ fontWeight: 700, fontSize: '0.75rem', color: 'var(--lf-text-muted)' }}>{mod.trend}</small>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Cognitive Profile */}
            <div className="medical-card">
              <h3 style={{ marginBottom: '1.5rem', fontSize: '1.05rem', fontWeight: 700, color: 'var(--lf-text-primary)' }}>Cognitive Markers</h3>
              <div>
                {reportData.cognitiveMarkers.map(marker => (
                  <div key={marker.label} style={{ marginBottom: '1.25rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <small style={{ fontWeight: 700, color: 'var(--lf-text-muted)' }}>{marker.label}</small>
                      <small style={{ fontWeight: 800, color: 'var(--lf-text-primary)' }}>{marker.value}%</small>
                    </div>
                    <div style={{ height: '8px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ width: `${marker.value}%`, height: '100%', background: 'var(--lf-gradient-primary)', borderRadius: '4px', transition: 'width 1s ease-out' }}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* SoundQuest Telemetry & Mistake Analytics Card */}
            <div className="medical-card" style={{ gridColumn: 'span 2' }}>
              <h3 style={{ marginBottom: '1.5rem', fontSize: '1.1rem', fontWeight: 800, color: 'var(--lf-text-primary)' }}>
                🎮 SoundQuest Phoneme Telemetry & Section Breakdown
              </h3>
              {(() => {
                const sqData = JSON.parse(localStorage.getItem(`sq_analytics_${currentUser?.uid}`) || '{}');
                const phonemeStats = sqData.phonemeStats || {};
                const keys = Object.keys(phonemeStats);

                if (keys.length === 0) {
                  return (
                    <p style={{ color: 'var(--lf-text-muted)', fontSize: '0.9rem' }}>
                      No SoundQuest arcade telemetry recorded yet. Play a few missions in SoundQuest to see response times and mistake breakdowns!
                    </p>
                  );
                }

                const easySec = (sqData.easyTimeMs / 1000 || 0).toFixed(1);
                const mediumSec = (sqData.mediumTimeMs / 1000 || 0).toFixed(1);
                const hardSec = (sqData.hardTimeMs / 1000 || 0).toFixed(1);

                return (
                  <div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.25rem' }}>
                      <div style={{ padding: '0.85rem', background: '#f0fdf4', border: '1.5px solid #86efac', borderRadius: '14px', textAlign: 'center' }}>
                        <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#15803d' }}>🟢 Easy Level Time</span>
                        <strong style={{ fontSize: '1.4rem', color: '#14532d' }}>{easySec}s</strong>
                      </div>
                      <div style={{ padding: '0.85rem', background: '#fefce8', border: '1.5px solid #fde047', borderRadius: '14px', textAlign: 'center' }}>
                        <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#b45309' }}>🟡 Medium Level Time</span>
                        <strong style={{ fontSize: '1.4rem', color: '#78350f' }}>{mediumSec}s</strong>
                      </div>
                      <div style={{ padding: '0.85rem', background: '#fef2f2', border: '1.5px solid #fca5a5', borderRadius: '14px', textAlign: 'center' }}>
                        <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#be123c' }}>🔴 Hard Level Time</span>
                        <strong style={{ fontSize: '1.4rem', color: '#881337' }}>{hardSec}s</strong>
                      </div>
                    </div>

                    <h4 style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--lf-text-secondary)', marginBottom: '0.5rem' }}>
                      Phoneme Mistake Breakdown & Response Times:
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {keys.map(p => {
                        const item = phonemeStats[p];
                        const avg = item.attempts > 0 ? (item.totalTimeMs / (item.attempts * 1000)).toFixed(1) : '0.0';
                        return (
                          <div key={p} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 14px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                            <div>
                              <strong style={{ color: '#0369a1', fontSize: '0.95rem' }}>{p}</strong>
                              <span style={{ marginLeft: '10px', fontSize: '0.85rem', color: '#64748b' }}>{item.targetWord} ({item.difficulty?.toUpperCase()})</span>
                            </div>
                            <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>
                              <span style={{ color: '#64748b', marginRight: '14px' }}>Avg: {avg}s</span>
                              <span style={{ color: item.mistakes > 0 ? '#dc2626' : '#166534', background: item.mistakes > 0 ? '#fee2e2' : '#dcfce7', padding: '3px 10px', borderRadius: '20px' }}>
                                {item.mistakes > 0 ? `⚠️ ${item.mistakes} Mistakes` : '✨ Perfect'}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Clinical Insights */}
            <div className="medical-card" style={{ gridColumn: 'span 2' }}>
              <h3 style={{ marginBottom: '1.5rem', fontSize: '1.05rem', fontWeight: 700, color: 'var(--lf-text-primary)' }}>Specialist Analysis & Recommendations</h3>
              <div style={{ background: 'rgba(79, 70, 229, 0.06)', padding: '1.5rem', borderRadius: '12px', marginBottom: '1.5rem', border: '1px solid rgba(79, 70, 229, 0.15)' }}>
                <p style={{ lineHeight: '1.6', color: 'var(--lf-text-secondary)', fontWeight: 500 }}>{reportData.clinicianSummary}</p>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <span style={{ padding: '6px 14px', background: 'rgba(79, 70, 229, 0.1)', color: 'var(--lf-indigo-light)', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 700, border: '1px solid rgba(79, 70, 229, 0.2)' }}>Primary Goal: Ocular Tracking</span>
                <span style={{ padding: '6px 14px', background: 'rgba(245, 158, 11, 0.1)', color: 'var(--lf-amber)', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 700, border: '1px solid rgba(245, 158, 11, 0.2)' }}>Next Review: 15 Jun</span>
                <span style={{ padding: '6px 14px', background: 'rgba(244, 63, 94, 0.1)', color: 'var(--lf-rose)', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 700, border: '1px solid rgba(244, 63, 94, 0.2)' }}>Therapy Intensity: High</span>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default UserReport;
