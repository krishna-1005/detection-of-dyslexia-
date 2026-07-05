import React, { useState, useEffect } from 'react';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import './UserReport.css';

const UserReport = () => {
  const [reportData, setReportReportData] = useState(null);
  const user = JSON.parse(localStorage.getItem("lexiflow_user"));

  useEffect(() => {
    const history = JSON.parse(localStorage.getItem("lexiflow_history") || "[]");
    const exHistory = JSON.parse(localStorage.getItem('lexiflow_exercise_history') || '{}');
    
    if (history.length === 0 && Object.keys(exHistory).length === 0) {
      setReportReportData({ isEmpty: true });
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
          color: '#3b82f6'
        },
        { 
          name: 'Rapid Naming', 
          sessions: exHistory.naming?.sessions || 0,
          score: exHistory.naming?.accuracy?.replace('%', '') || 0,
          trend: exHistory.naming?.trend || 'Stable',
          color: '#f59e0b'
        },
        { 
          name: 'Visual Tracking', 
          sessions: exHistory.visual?.sessions || 0,
          score: exHistory.visual?.accuracy?.replace('%', '') || 0,
          trend: exHistory.visual?.trend || 'Stable',
          color: '#ec4899'
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
          color: '#8b5cf6'
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
    setReportReportData(report);
  }, []);

  if (!reportData) return null;

  if (reportData.isEmpty) {
    return (
      <div className="page-container" style={{ background: 'var(--med-blue-light)', minHeight: '100vh' }}>
        <Navbar user={user} />
        <div className="dashboard-layout" style={{ display: 'flex' }}>
          <Sidebar />
          <main className="main-content" style={{ flex: 1, padding: '3rem' }}>
            <div className="medical-card" style={{ textAlign: 'center', padding: '5rem 2rem' }}>
              <span style={{ fontSize: '4rem' }}>📊</span>
              <h2 style={{ color: 'var(--med-teal)', marginTop: '2rem' }}>No Diagnostic History Found</h2>
              <p style={{ color: 'var(--med-gray)', maxWidth: '500px', margin: '1rem auto' }}>
                Your clinical analysis report will be generated once you complete your first text analysis or therapeutic exercise.
              </p>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container" style={{ background: 'var(--med-blue-light)', minHeight: '100vh' }}>
      <Navbar user={user} />
      <div className="dashboard-layout" style={{ display: 'flex' }}>
        <Sidebar />
        <main className="main-content" style={{ flex: 1, padding: '3rem' }}>
          <header className="medical-header" style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span className="medical-label">Patient Analytics</span>
              <h1 style={{ fontSize: '2.5rem', fontWeight: 800 }}>Comprehensive Therapy Analysis</h1>
              <p style={{ color: 'var(--med-gray)' }}>Clinical Diagnostic Summary - {reportData.lastActive}</p>
            </div>
            <button className="medical-btn-primary" onClick={() => window.print()}>🖨️ Download Report</button>
          </header>

          <div className="report-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
            {/* Module Performance */}
            <div className="medical-card performance-section">
              <h3 style={{ marginBottom: '1.5rem', fontSize: '1.1rem', fontWeight: 700 }}>Module Performance</h3>
              <div className="performance-list">
                {reportData.modules.map(mod => (
                  <div key={mod.name} className="mod-item" style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem 0', borderBottom: '1px solid var(--med-border)' }}>
                    <div className="mod-info">
                      <strong style={{ display: 'block', fontSize: '1rem' }}>{mod.name}</strong>
                      <small style={{ color: 'var(--med-gray)' }}>{mod.sessions} Sessions Completed</small>
                    </div>
                    <div className="mod-stats" style={{ textAlign: 'right' }}>
                      <span className="mod-score" style={{ color: mod.color, fontWeight: 800, fontSize: '1.2rem', display: 'block' }}>{mod.score}%</span>
                      <small className={`trend ${mod.trend.startsWith('+') ? 'pos' : 'neg'}`} style={{ fontWeight: 700, fontSize: '0.75rem' }}>{mod.trend}</small>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Cognitive Profile */}
            <div className="medical-card cognitive-section">
              <h3 style={{ marginBottom: '1.5rem', fontSize: '1.1rem', fontWeight: 700 }}>Cognitive Markers</h3>
              <div className="marker-grid">
                {reportData.cognitiveMarkers.map(marker => (
                  <div key={marker.label} className="marker-item" style={{ marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <small style={{ fontWeight: 700, color: 'var(--med-gray)' }}>{marker.label}</small>
                      <small style={{ fontWeight: 800 }}>{marker.value}%</small>
                    </div>
                    <div className="progress-bg" style={{ height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                      <div className="progress-bar" style={{ width: `${marker.value}%`, height: '100%', background: 'var(--med-teal)' }}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Clinical Insights */}
            <div className="medical-card clinical-insights" style={{ gridColumn: 'span 2' }}>
              <h3 style={{ marginBottom: '1.5rem', fontSize: '1.1rem', fontWeight: 700 }}>Specialist Analysis & Recommendations</h3>
              <div className="insight-box" style={{ background: 'var(--med-blue-light)', padding: '1.5rem', borderRadius: '12px', marginBottom: '1.5rem' }}>
                <p style={{ lineHeight: '1.6', color: '#1e293b', fontWeight: 500 }}>{reportData.clinicianSummary}</p>
              </div>
              <div className="recommendation-chips" style={{ display: 'flex', gap: '1rem' }}>
                <span className="medical-label-badge" style={{ padding: '6px 12px' }}>Primary Goal: Ocular Tracking</span>
                <span className="medical-label-badge" style={{ background: '#fef3c7', color: '#d97706', padding: '6px 12px' }}>Next Review: 15 Jun</span>
                <span className="medical-label-badge" style={{ background: '#fee2e2', color: '#ef4444', padding: '6px 12px' }}>Therapy Intensity: High</span>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default UserReport;
