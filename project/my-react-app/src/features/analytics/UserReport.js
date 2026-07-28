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
          name: 'Visual Tracking', 
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
    <div className="page-container">
      <Navbar user={user} />
      <div className="dashboard-layout" style={{ display: 'flex' }}>
        <Sidebar />
        <main className="main-content" style={{ flex: 1, padding: '2.5rem' }}>
          <header className="medical-header" style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span className="medical-label">Patient Analytics</span>
              <h1 style={{ fontSize: '2rem', fontWeight: 800, fontFamily: "'Outfit', sans-serif" }}>Comprehensive Therapy Analysis</h1>
              <p style={{ color: 'var(--lf-text-muted)', fontSize: '0.9rem' }}>Clinical Diagnostic Summary - {reportData.lastActive}</p>
            </div>
            <button className="medical-btn-primary" onClick={() => window.print()}>🖨️ Download Report</button>
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
