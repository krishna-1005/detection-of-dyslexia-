import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  BarChart,
  Bar,
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid,
  Cell
} from "recharts";
import "./Dashboard.css";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";
import { useAuth } from "../auth/AuthContext";
import { fetchWithAuth } from "../../services/api";

const Dashboard = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedTest, setSelectedTest] = useState(null);
  const [showReportModal, setShowReportModal] = useState(false);

  const [allTests, setAllTests] = useState([]);
  const [therapyProgress, setTherapyProgress] = useState({});
  const [therapySessions, setTherapySessions] = useState([]);
  const [lastPlayedModule, setLastPlayedModule] = useState('phoneme');

  const [profile, setProfile] = useState({
    name: currentUser?.displayName || currentUser?.email?.split('@')[0] || "User",
    email: currentUser?.email || "No email",
    patientId: "LX-" + (currentUser?.uid?.slice(0, 5) || "GUEST").toUpperCase(),
    dateJoined: "Active Member"
  });

  const moduleDefinitions = [
    { id: 'phoneme', name: 'Phoneme Matching', icon: '🧩', desc: 'Sound-letter association' },
    { id: 'morphology', name: 'Morphology Builder', icon: '🧬', desc: 'Word structure training' },
    { id: 'naming', name: "Rapid Naming (RAN)", icon: '⚡', desc: 'Speed recognition drills' },
    { id: 'visual', name: 'Visual Tracking', icon: '📖', desc: 'Eye movement exercises' },
    { id: 'auditory', name: 'Auditory Processing', icon: '🎧', desc: 'Sound discrimination' },
    { id: 'video', name: 'Live Video Session', icon: '📹', desc: 'Interactive practice' }
  ];

  useEffect(() => {
    const loadDashboardData = async () => {
      let historyList = [];
      let thProgress = {};
      let thSessions = [];
      let lastMod = 'phoneme';

      // 1. Fetch from Flask backend if logged in
      if (currentUser) {
        try {
          const response = await fetchWithAuth("/api/dashboard");
          if (response.ok) {
            const data = await response.json();
            if (data.history) historyList = data.history;
            if (data.profile) {
              setProfile(prev => ({
                ...prev,
                name: data.profile.name || prev.name,
                email: data.profile.email || prev.email,
                patientId: data.profile.patientId || prev.patientId
              }));
            }
          }

          const thRes = await fetchWithAuth("/api/therapy/progress");
          if (thRes.ok) {
            const thData = await thRes.json();
            if (thData.progress) thProgress = thData.progress;
            if (thData.sessions) thSessions = thData.sessions;
            if (thData.lastPlayedModule) lastMod = thData.lastPlayedModule;
          }
        } catch (err) {
          console.warn("Backend fetch note:", err);
        }
      }

      // 2. Combine and deduplicate history from backend and local storage
      const uid = currentUser?.uid;
      const localHistoryUid = uid ? JSON.parse(localStorage.getItem(`lexiflow_history_${uid}`) || "[]") : [];
      const localHistoryGlobal = JSON.parse(localStorage.getItem("lexiflow_history") || "[]");

      const combinedRaw = [...historyList, ...localHistoryUid, ...localHistoryGlobal];
      const seenIds = new Set();
      const combinedHistory = [];
      for (const item of combinedRaw) {
        const itemId = item.id || (item.date + "_" + (item.type || "")) || item.timestamp;
        if (itemId && !seenIds.has(itemId)) {
          seenIds.add(itemId);
          combinedHistory.push(item);
        }
      }

      // 3. Combine therapy progress
      const localThUid = uid ? JSON.parse(localStorage.getItem(`lexiflow_exercise_history_${uid}`) || "{}") : {};
      const localThGlobal = JSON.parse(localStorage.getItem("lexiflow_exercise_history") || "{}");
      const mergedTherapyProgress = { ...localThGlobal, ...localThUid, ...thProgress };

      const savedLastMod = (uid ? localStorage.getItem(`lexiflow_last_therapy_${uid}`) : null) || localStorage.getItem("lexiflow_last_therapy") || lastMod;

      setAllTests(combinedHistory);
      setTherapyProgress(mergedTherapyProgress);
      setTherapySessions(thSessions);
      setLastPlayedModule(savedLastMod);
    };

    loadDashboardData();
  }, [currentUser]);

  // Assessment Statistics
  const totalTests = allTests.length;
  const scores = allTests.map(t => typeof t.score === 'number' ? t.score : Math.round((t.details?.risk_score || 0) * 100));
  const latestScore = scores.length > 0 ? scores[0] : 0;

  const latestTest = allTests.length > 0 ? allTests[0] : null;
  const latestRiskLevel = latestTest?.riskLevel || (latestScore > 60 ? "High" : latestScore > 35 ? "Moderate" : "Low");

  // Assessment Chart Data (Chronological)
  const chartData = [...allTests].reverse().map((t, idx) => {
    const rawScore = typeof t.score === 'number' ? t.score : Math.round((t.details?.risk_score || 0) * 100);
    const dateLabel = t.date ? t.date.split(' ')[0] : `Test #${idx + 1}`;
    return { name: dateLabel, score: rawScore, risk: t.riskLevel || "Moderate" };
  });

  // Therapy Statistics Calculation
  let totalTherapySessions = 0;
  let completedModulesCount = 0;
  let totalAccuracySum = 0;
  let activeAccuracyModulesCount = 0;
  let bestPerformingModule = "None";
  let bestModAcc = -1;
  let mostPracticedModule = "None";
  let maxSessionsCount = 0;
  let lastTherapyActivityDate = "No Activity";

  const moduleBarData = moduleDefinitions.map(mod => {
    const prog = therapyProgress[mod.id] || {};
    const sessions = prog.sessions || 0;
    const accStr = prog.accuracy || "0%";
    const accNum = parseInt(accStr) || 0;

    totalTherapySessions += sessions;
    if (sessions > 0) {
      if (accNum >= 70) completedModulesCount += 1;
      totalAccuracySum += accNum;
      activeAccuracyModulesCount += 1;
      if (prog.lastPlayed) lastTherapyActivityDate = prog.lastPlayed;
    }

    if (accNum > bestModAcc && sessions > 0) {
      bestModAcc = accNum;
      bestPerformingModule = mod.name;
    }

    if (sessions > maxSessionsCount) {
      maxSessionsCount = sessions;
      mostPracticedModule = mod.name;
    }

    return {
      name: mod.name.split(' ')[0],
      fullName: mod.name,
      accuracy: accNum,
      sessions: sessions
    };
  });

  const avgTherapyAccuracy = activeAccuracyModulesCount > 0 ? Math.round(totalAccuracySum / activeAccuracyModulesCount) : 0;

  // Achievement Badges Status
  const achievements = [
    { id: 'first', icon: '🎉', title: 'First Session', desc: 'Completed 1 therapy session', unlocked: totalTherapySessions >= 1 },
    { id: 'sessions5', icon: '⭐', title: 'Dedicated Learner', desc: 'Completed 5 therapy sessions', unlocked: totalTherapySessions >= 5 },
    { id: 'accuracy90', icon: '🏆', title: 'High Accuracy', desc: 'Achieved 90%+ in a module', unlocked: bestModAcc >= 90 },
    { id: 'all_modules', icon: '📚', title: 'Mastery Explorer', desc: 'Completed all 6 therapy modules', unlocked: completedModulesCount === 6 }
  ];

  // Dynamic Interpretation
  const getInterpretation = (score, risk) => {
    if (score > 60 || risk === "High") {
      return "Your latest screening indicates a High probability of dyslexia. We strongly recommend engaging in daily visual tracking, phoneme matching, and structured morphological therapy drills.";
    } else if (score > 35 || risk === "Moderate") {
      return "Your latest screening indicates a Moderate probability of dyslexia. Continue practicing the recommended reading and therapy exercises and monitor your progress through future assessments.";
    }
    return "Your latest screening indicates a Low probability of dyslexia. Your phonetic decoding and reading speed show excellent baseline stability.";
  };

  const getModuleStatus = (modId) => {
    const prog = therapyProgress[modId] || {};
    const sessions = prog.sessions || 0;
    const accNum = parseInt(prog.accuracy || "0") || 0;

    if (sessions === 0) return { label: '⏳ Not Started', class: 'not-started' };
    if (accNum >= 70) return { label: '✅ Completed', class: 'completed' };
    return { label: '🟡 In Progress', class: 'in-progress' };
  };

  const getModuleRecommendation = () => {
    if (latestScore > 60) {
      return { id: 'phoneme', name: 'Phoneme Matching & Auditory Processing', reason: 'High phonological decoding risk identified in latest test.' };
    } else if (latestScore > 35) {
      return { id: 'visual', name: 'Visual Tracking & Rapid Naming', reason: 'Moderate tracking & processing speed variation detected.' };
    }
    return { id: 'morphology', name: 'Morphology Builder & Smart AI Reader', reason: 'Maintain reading fluency with structural vocabulary drills.' };
  };

  const currentRec = getModuleRecommendation();

  return (
    <div className="page-container">
      <Navbar user={currentUser} showDropdown={showDropdown} setShowDropdown={setShowDropdown} />

      <div className="dashboard-layout" style={{ display: 'flex' }}>
        <Sidebar />

        <main className="main-content" style={{ flex: 1, padding: '2rem 2.5rem' }}>
          <header className="dash-header">
            <div>
              <span className="medical-label">Personal Clinical Analytics</span>
              <h1 className="dash-title">Dyslexia & Therapy Dashboard</h1>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button className="medical-btn-secondary" onClick={() => setShowReportModal(true)}>📥 Progress Report</button>
              <button className="medical-btn-primary" onClick={() => navigate(`/therapy/${lastPlayedModule || 'phoneme'}`)}>
                ▶ Continue Last Therapy ({moduleDefinitions.find(m => m.id === lastPlayedModule)?.name || 'Phoneme'})
              </button>
            </div>
          </header>

          {/* 1. User Profile Banner */}
          <div className="user-profile-banner">
            <div className="user-banner-left">
              <div className="user-banner-avatar">
                {profile.name.charAt(0).toUpperCase()}
              </div>
              <div className="user-banner-details">
                <h2>{profile.name}</h2>
                <p>📧 {profile.email} • 🆔 <strong style={{ color: 'var(--lf-primary-light)' }}>{profile.patientId}</strong></p>
              </div>
            </div>
            <div className="user-banner-stats">
              <div className="banner-stat-box">
                <small>Therapy Sessions</small>
                <strong>{totalTherapySessions} Completed</strong>
              </div>
              <div className="banner-stat-box">
                <small>Last Activity</small>
                <strong>{lastTherapyActivityDate.split(' ')[0]}</strong>
              </div>
            </div>
          </div>

          {/* 9. Simple Achievement System */}
          <div style={{ marginBottom: '1.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--lf-text-primary)', margin: 0 }}>🏆 Milestone Achievements</h3>
              <small style={{ color: 'var(--lf-text-muted)', fontWeight: 600 }}>{achievements.filter(a => a.unlocked).length} of 4 Unlocked</small>
            </div>
            <div className="achievements-grid">
              {achievements.map(ach => (
                <div key={ach.id} className={`achievement-card ${ach.unlocked ? 'unlocked' : ''}`}>
                  <div className="achievement-icon">{ach.icon}</div>
                  <div className="achievement-info">
                    <strong>{ach.title}</strong>
                    <small>{ach.desc}</small>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {totalTests === 0 && totalTherapySessions === 0 ? (
            /* Empty State */
            <div className="empty-dashboard-card">
              <div className="empty-icon">🧬</div>
              <h3>No Assessments or Therapy Records Found</h3>
              <p>You haven't completed any dyslexia screenings or therapy sessions yet. Take your first test to generate your personalized progress profile, charts, and recommendations.</p>
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                <Link to="/detect" className="medical-btn-primary" style={{ padding: '0.85rem 1.75rem', fontSize: '0.95rem' }}>
                  🚀 Start Your First Assessment
                </Link>
                <button onClick={() => navigate('/therapy/phoneme')} className="medical-btn-secondary" style={{ padding: '0.85rem 1.75rem', fontSize: '0.95rem' }}>
                  🧩 Explore Therapy Suite
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* 3. Progress Overview: 5 Metric Cards */}
              <div className="dash-metrics-5grid">
                <div className="metric-card">
                  <div className="metric-card-header">
                    <div className="metric-icon" style={{ background: 'rgba(79, 70, 229, 0.15)', color: '#818cf8' }}>📊</div>
                  </div>
                  <div>
                    <div className="metric-card-val">{totalTests}</div>
                    <div className="metric-card-label">Total Diagnostics</div>
                  </div>
                </div>

                <div className="metric-card">
                  <div className="metric-card-header">
                    <div className="metric-icon" style={{ background: 'rgba(20, 184, 166, 0.15)', color: '#14b8a6' }}>🎯</div>
                  </div>
                  <div>
                    <div className="metric-card-val">{latestScore}%</div>
                    <div className="metric-card-label">Latest Risk Index</div>
                  </div>
                </div>

                <div className="metric-card">
                  <div className="metric-card-header">
                    <div className="metric-icon" style={{ background: 'rgba(124, 58, 237, 0.15)', color: '#a78bfa' }}>🎧</div>
                  </div>
                  <div>
                    <div className="metric-card-val">{totalTherapySessions}</div>
                    <div className="metric-card-label">Therapy Sessions</div>
                  </div>
                </div>

                <div className="metric-card">
                  <div className="metric-card-header">
                    <div className="metric-icon" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' }}>📈</div>
                  </div>
                  <div>
                    <div className="metric-card-val">{avgTherapyAccuracy}%</div>
                    <div className="metric-card-label">Avg Therapy Accuracy</div>
                  </div>
                </div>

                <div className="metric-card">
                  <div className="metric-card-header">
                    <div className="metric-icon" style={{ background: 'rgba(244, 63, 94, 0.15)', color: '#f43f5e' }}>🧩</div>
                  </div>
                  <div>
                    <div className="metric-card-val">{completedModulesCount}/6</div>
                    <div className="metric-card-label">Modules Completed</div>
                  </div>
                </div>
              </div>

              {/* Charts Section: Screening Trend + Therapy Performance */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: '1.5rem', marginBottom: '1.75rem' }}>
                {/* Screening Risk Chart */}
                <div className="dash-chart-card" style={{ margin: 0 }}>
                  <div className="chart-header">
                    <div>
                      <span className="medical-label">Diagnostic Trend</span>
                      <h3 className="chart-title">Dyslexia Probability (%) Over Time</h3>
                    </div>
                  </div>
                  <div style={{ width: '100%', height: 220 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                        <XAxis dataKey="name" stroke="var(--lf-text-muted)" fontSize={11} tickLine={false} />
                        <YAxis domain={[0, 100]} stroke="var(--lf-text-muted)" fontSize={11} tickLine={false} unit="%" />
                        <Tooltip 
                          contentStyle={{ background: '#181428', borderColor: 'var(--lf-border)', borderRadius: '10px', color: '#fff' }} 
                          formatter={(val) => [`${val}% Risk`, 'Probability']}
                        />
                        <Line type="monotone" dataKey="score" stroke="#818cf8" strokeWidth={3} dot={{ r: 4, fill: '#818cf8' }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* 8. Therapy Progress Bar Chart */}
                <div className="dash-chart-card" style={{ margin: 0 }}>
                  <div className="chart-header">
                    <div>
                      <span className="medical-label">Therapy Suite</span>
                      <h3 className="chart-title">Module Accuracy (%) Breakdown</h3>
                    </div>
                  </div>
                  <div style={{ width: '100%', height: 220 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={moduleBarData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                        <XAxis dataKey="name" stroke="var(--lf-text-muted)" fontSize={10} tickLine={false} />
                        <YAxis domain={[0, 100]} stroke="var(--lf-text-muted)" fontSize={11} tickLine={false} unit="%" />
                        <Tooltip 
                          contentStyle={{ background: '#181428', borderColor: 'var(--lf-border)', borderRadius: '10px', color: '#fff' }}
                          formatter={(val) => [`${val}% Accuracy`, 'Module Accuracy']}
                        />
                        <Bar dataKey="accuracy" radius={[6, 6, 0, 0]}>
                          {moduleBarData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.accuracy >= 70 ? '#14b8a6' : entry.accuracy >= 40 ? '#f59e0b' : '#6366f1'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* 5. Highlighted Summary + 7. Personalized Recommendation Banner */}
              <div className="highlight-summary-card">
                <div className="summary-score-badge">
                  <div className="score-val" style={{ color: latestScore > 60 ? '#f43f5e' : latestScore > 35 ? '#f59e0b' : '#14b8a6' }}>
                    {latestScore}%
                  </div>
                  <div className="score-lbl">Diagnostic Risk</div>
                  <span className={`dash-risk-badge ${latestRiskLevel.toLowerCase()}`} style={{ marginTop: '0.5rem' }}>
                    {latestRiskLevel.toUpperCase()} RISK
                  </span>
                </div>
                <div className="summary-details">
                  <h3>Latest Clinical Interpretation</h3>
                  <p style={{ marginBottom: '0.75rem' }}>{getInterpretation(latestScore, latestRiskLevel)}</p>
                  <div style={{ background: 'rgba(20, 184, 166, 0.1)', padding: '0.6rem 1rem', borderRadius: '8px', border: '1px solid rgba(20, 184, 166, 0.2)', fontSize: '0.82rem' }}>
                    💡 <strong style={{ color: '#14b8a6' }}>Targeted Recommendation:</strong> {currentRec.name} — <em>{currentRec.reason}</em>
                  </div>
                </div>
              </div>

              <div className="dash-main-grid">
                {/* 2. Assessment History Table */}
                <section className="medical-card dash-history-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                    <h3 className="dash-card-title" style={{ margin: 0 }}>Screening History</h3>
                    <small style={{ color: 'var(--lf-text-muted)' }}>Showing {allTests.length} Records</small>
                  </div>
                  <table className="dash-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Date & Time</th>
                        <th>Test Type</th>
                        <th>Score (%)</th>
                        <th>Risk Level</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allTests.map((test, index) => {
                        const scoreVal = typeof test.score === 'number' ? test.score : Math.round((test.details?.risk_score || 0) * 100);
                        const rLevel = test.riskLevel || (scoreVal > 60 ? "High" : scoreVal > 35 ? "Moderate" : "Low");
                        return (
                          <tr key={test.id || index}>
                            <td style={{ fontWeight: 700, color: 'var(--lf-text-muted)' }}>#{allTests.length - index}</td>
                            <td style={{ fontWeight: 600 }}>{test.date}</td>
                            <td><span style={{ fontSize: '0.8rem', color: 'var(--lf-indigo-light)' }}>{test.type || "Text Analysis"}</span></td>
                            <td style={{ fontWeight: 800 }}>{scoreVal}%</td>
                            <td>
                              <span className={`dash-risk-badge ${rLevel.toLowerCase()}`}>
                                {rLevel.toUpperCase()}
                              </span>
                            </td>
                            <td>
                              <button 
                                onClick={() => setSelectedTest(test)} 
                                style={{
                                  background: 'rgba(129, 140, 248, 0.12)',
                                  color: '#818cf8',
                                  border: '1px solid rgba(129, 140, 248, 0.25)',
                                  padding: '4px 10px',
                                  borderRadius: '6px',
                                  cursor: 'pointer',
                                  fontSize: '0.75rem',
                                  fontWeight: 700
                                }}
                              >
                                Details
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </section>

                {/* 5. Therapy Modules Completion Status */}
                <section className="medical-card">
                  <h3 className="dash-card-title" style={{ marginBottom: '1.25rem' }}>Therapy Suite Completion Status</h3>
                  <div className="dash-therapy-list" style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                    {moduleDefinitions.map(ex => {
                      const status = getModuleStatus(ex.id);
                      const prog = therapyProgress[ex.id] || {};
                      return (
                        <div key={ex.id} className="dash-therapy-item" style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '1rem',
                          padding: '0.85rem 1.1rem',
                          background: 'rgba(255, 255, 255, 0.03)',
                          border: '1px solid var(--lf-border, rgba(255, 255, 255, 0.08))',
                          borderRadius: '12px',
                          transition: 'all 0.15s ease'
                        }}>
                          <div className="dash-therapy-info" style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flex: 1, minWidth: 0 }}>
                            <span className="dash-therapy-icon" style={{
                              width: '40px',
                              height: '40px',
                              borderRadius: '10px',
                              background: 'rgba(129, 140, 248, 0.12)',
                              color: '#818cf8',
                              fontSize: '1.25rem',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0
                            }}>
                              {ex.icon}
                            </span>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', overflow: 'hidden' }}>
                              <strong style={{ display: 'block', fontSize: '0.92rem', fontWeight: 700, color: 'var(--lf-text-primary, #ffffff)', lineHeight: '1.2' }}>
                                {ex.name}
                              </strong>
                              <small style={{ display: 'block', fontSize: '0.78rem', color: 'var(--lf-text-muted, #94a3b8)', fontWeight: 500 }}>
                                {prog.sessions || 0} Sessions • PB: {prog.pb || '0 pts'} • Acc: {prog.accuracy || '0%'}
                              </small>
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
                            <span className={`module-status-badge ${status.class}`} style={{
                              padding: '5px 12px',
                              borderRadius: '20px',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              whiteSpace: 'nowrap'
                            }}>
                              {status.label}
                            </span>
                            <button 
                              onClick={() => navigate(`/therapy/${ex.id}`)} 
                              className="dash-therapy-btn"
                              style={{
                                background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)',
                                color: '#ffffff',
                                border: 'none',
                                padding: '6px 14px',
                                borderRadius: '8px',
                                fontWeight: 700,
                                fontSize: '0.8rem',
                                cursor: 'pointer',
                                boxShadow: '0 2px 8px rgba(79, 70, 229, 0.25)',
                                transition: 'all 0.15s ease',
                                whiteSpace: 'nowrap'
                              }}
                            >
                              Practice
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              </div>
            </>
          )}

          {/* Test Details Modal */}
          {selectedTest && (
            <div className="modal-overlay" onClick={() => setSelectedTest(null)}>
              <div className="modal-content" onClick={e => e.stopPropagation()}>
                <button className="modal-close-btn" onClick={() => setSelectedTest(null)}>✕</button>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span className="medical-label">Diagnostic Breakdown</span>
                  <span className={`dash-risk-badge ${(selectedTest.riskLevel || 'Low').toLowerCase()}`}>
                    {(selectedTest.riskLevel || 'Low').toUpperCase()} RISK
                  </span>
                </div>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '0.25rem' }}>Session Detail Analysis</h2>
                <p style={{ color: 'var(--lf-text-muted)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>Recorded on {selectedTest.date}</p>

                {selectedTest.details ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '10px', border: '1px solid var(--lf-border)' }}>
                      <strong style={{ display: 'block', color: 'var(--lf-text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: '0.4rem' }}>Corrected Text Output</strong>
                      <p style={{ margin: 0, fontSize: '0.95rem', color: 'var(--lf-text-primary)', lineHeight: 1.5 }}>
                        {selectedTest.details.corrected_sentence || "Text analysis completed successfully."}
                      </p>
                    </div>

                    {selectedTest.details.misspelled_words && selectedTest.details.misspelled_words.length > 0 && (
                      <div>
                        <strong style={{ display: 'block', color: 'var(--lf-text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Detected Misspellings & Transpositions</strong>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          {selectedTest.details.misspelled_words.map((item, i) => (
                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.6rem 0.85rem', background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.2)', borderRadius: '8px', fontSize: '0.85rem' }}>
                              <span>❌ <strong style={{ color: '#f43f5e' }}>{item.original}</strong> → Suggested: <strong style={{ color: '#14b8a6' }}>{item.suggested}</strong></span>
                              <small style={{ color: 'var(--lf-text-muted)' }}>{item.type}</small>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <p style={{ color: 'var(--lf-text-muted)' }}>No additional deep analysis details recorded for this session.</p>
                )}

                <div style={{ marginTop: '1.75rem', textAlign: 'right' }}>
                  <button className="medical-btn-secondary" onClick={() => setSelectedTest(null)}>Close Window</button>
                </div>
              </div>
            </div>
          )}

          {/* 10. Printable Progress Report Modal */}
          {showReportModal && (
            <div className="modal-overlay" onClick={() => setShowReportModal(false)}>
              <div className="modal-content printable-report-area" onClick={e => e.stopPropagation()} style={{ maxWidth: '750px' }}>
                <button className="modal-close-btn no-print" onClick={() => setShowReportModal(false)}>✕</button>
                
                <div style={{ borderBottom: '2px solid var(--lf-border)', paddingBottom: '1rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h2 style={{ fontSize: '1.6rem', fontWeight: 800, margin: 0, color: 'var(--lf-indigo-light)' }}>LexiFlow Clinical Progress Report</h2>
                    <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.85rem', color: 'var(--lf-text-muted)' }}>Generated on {new Date().toLocaleDateString()}</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <strong style={{ display: 'block', fontSize: '0.9rem' }}>{profile.name}</strong>
                    <small style={{ color: 'var(--lf-text-muted)' }}>ID: {profile.patientId}</small>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  <div>
                    <h4 style={{ color: 'var(--lf-text-primary)', borderBottom: '1px solid var(--lf-border)', paddingBottom: '0.4rem', marginBottom: '0.75rem' }}>1. Patient Information & Summary</h4>
                    <p style={{ fontSize: '0.85rem', lineHeight: 1.6, color: 'var(--lf-text-secondary)' }}>
                      <strong>Email:</strong> {profile.email}<br />
                      <strong>Total Diagnostic Screenings:</strong> {totalTests}<br />
                      <strong>Latest Risk Level:</strong> {latestRiskLevel.toUpperCase()} ({latestScore}% Risk Index)<br />
                      <strong>Average Therapy Accuracy:</strong> {avgTherapyAccuracy}% across {totalTherapySessions} sessions.
                    </p>
                  </div>

                  <div>
                    <h4 style={{ color: 'var(--lf-text-primary)', borderBottom: '1px solid var(--lf-border)', paddingBottom: '0.4rem', marginBottom: '0.75rem' }}>2. Therapy Suite Module Status</h4>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--lf-border)', textAlign: 'left' }}>
                          <th style={{ padding: '6px 0' }}>Module</th>
                          <th>Sessions</th>
                          <th>Accuracy</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {moduleDefinitions.map(mod => {
                          const prog = therapyProgress[mod.id] || {};
                          const status = getModuleStatus(mod.id);
                          return (
                            <tr key={mod.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                              <td style={{ padding: '8px 0', fontWeight: 600 }}>{mod.name}</td>
                              <td>{prog.sessions || 0}</td>
                              <td>{prog.accuracy || '0%'}</td>
                              <td>{status.label}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div>
                    <h4 style={{ color: 'var(--lf-text-primary)', borderBottom: '1px solid var(--lf-border)', paddingBottom: '0.4rem', marginBottom: '0.75rem' }}>3. Clinical Recommendations</h4>
                    <p style={{ fontSize: '0.85rem', lineHeight: 1.6, color: 'var(--lf-text-secondary)' }}>
                      • <strong>Recommended Module:</strong> {currentRec.name} ({currentRec.reason})<br />
                      • Maintain regular therapy sessions (at least 3x per week).<br />
                      • Continue using Smart AI Reader with Bionic Mode and Focus Ruler enabled to reduce visual fatigue.
                    </p>
                  </div>
                </div>

                <div className="no-print" style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                  <button className="medical-btn-secondary" onClick={() => setShowReportModal(false)}>Close</button>
                  <button className="medical-btn-primary" onClick={() => window.print()}>🖨️ Save PDF / Print</button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default Dashboard;
