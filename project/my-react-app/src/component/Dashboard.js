import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./Dashboard.css";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";
import { getUserSession } from "./authSession";

const Dashboard = () => {
  const navigate = useNavigate();
  const user = getUserSession();
  const [showDropdown, setShowDropdown] = useState(false);
  
  const [patientData, setPatientData] = useState({
    name: user?.name || "Guest User",
    id: user?.patientId || "LX-GUEST",
    age: "24",
    lastAssessment: "No Data",
    riskLevel: "None",
    progress: 0,
  });

  const [recentTests, setRecentTests] = useState([]);
  const [stats, setStats] = useState({
    totalTests: 0,
    avgRisk: "0%",
    completionRate: "0%",
  });

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }
    const history = JSON.parse(localStorage.getItem("lexiflow_history") || "[]");
    
    if (history.length > 0) {
      const totalTests = history.length;
      const totalScore = history.reduce((acc, curr) => acc + (curr.score || 0), 0);
      const avgRisk = Math.round(totalScore / totalTests);
      
      setRecentTests(history.slice(0, 5));
      setStats({
        totalTests: totalTests,
        avgRisk: `${avgRisk}%`,
        completionRate: "100%",
      });

      setPatientData(prev => ({
        ...prev,
        lastAssessment: history[0].date,
        riskLevel: avgRisk > 70 ? "High" : avgRisk > 30 ? "Moderate" : "Low",
        progress: Math.min(100, totalTests * 10),
      }));
    }
  }, [user, navigate]);

  const statCards = [
    { label: "Total Diagnostics", value: stats.totalTests, icon: "🧪", color: "#4f46e5" },
    { label: "Average Risk Index", value: stats.avgRisk, icon: "📊", color: patientData.riskLevel === 'High' ? '#f43f5e' : '#0d9488' },
    { label: "Therapy Progress", value: `${patientData.progress}%`, icon: "📈", color: "#7c3aed" },
  ];

  const therapyModules = [
    { id: 'phoneme', name: 'Phoneme Matching', icon: '🧩', desc: 'Sound-letter association' },
    { id: 'morphology', name: 'Morphology Builder', icon: '🧬', desc: 'Word structure training' },
    { id: 'naming', name: "Rapid Naming (RAN)", icon: '⚡', desc: 'Speed recognition drills' },
    { id: 'visual', name: 'Visual Tracking', icon: '📖', desc: 'Eye movement exercises' },
    { id: 'auditory', name: 'Auditory Processing', icon: '🎧', desc: 'Sound discrimination' },
    { id: 'video', name: 'Live Video Session', icon: '📹', desc: 'Interactive practice' }
  ];

  return (
    <div className="page-container">
      <Navbar user={user} showDropdown={showDropdown} setShowDropdown={setShowDropdown} />

      <div className="dashboard-layout" style={{ display: 'flex' }}>
        <Sidebar />

        <main className="main-content" style={{ flex: 1, padding: '2.5rem' }}>
          <header className="dash-header">
            <div>
              <span className="medical-label">Clinical Overview</span>
              <h1 className="dash-title">Patient Dashboard</h1>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button className="medical-btn-secondary" onClick={() => navigate('/analysis')}>📈 View Analysis</button>
              <Link to="/detect" className="medical-btn-primary">🧬 New Diagnostic</Link>
            </div>
          </header>

          {/* Stats Grid */}
          <div className="dash-stats-grid">
            {statCards.map((card, i) => (
              <div className="dash-stat-card" key={i} style={{ animationDelay: `${i * 0.1}s` }}>
                <div className="dash-stat-icon" style={{ background: `${card.color}15`, color: card.color }}>
                  {card.icon}
                </div>
                <div>
                  <span className="medical-label">{card.label}</span>
                  <div className="dash-stat-value" style={{ color: card.color }}>{card.value}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="dash-main-grid">
            {/* Diagnostic History */}
            <section className="medical-card dash-history-card">
              <h3 className="dash-card-title">Diagnostic History</h3>
              <table className="dash-table">
                <thead>
                  <tr>
                    <th>Session Date</th>
                    <th>Risk Level</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentTests.map(test => (
                    <tr key={test.id}>
                      <td style={{ fontWeight: 600 }}>{test.date}</td>
                      <td>
                        <span className={`dash-risk-badge ${test.score > 60 ? 'high' : 'moderate'}`}>
                          {test.score}% {test.score > 60 ? 'HIGH' : 'MODERATE'}
                        </span>
                      </td>
                      <td><span className="dash-status">● COMPLETE</span></td>
                    </tr>
                  ))}
                  {recentTests.length === 0 && (
                    <tr>
                      <td colSpan="3" className="dash-empty">No diagnostic records available.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </section>

            {/* Therapy Suite */}
            <section className="medical-card">
              <h3 className="dash-card-title">Therapy Suite</h3>
              <div className="dash-therapy-list">
                {therapyModules.map(ex => (
                  <div key={ex.id} className="dash-therapy-item">
                    <div className="dash-therapy-info">
                      <span className="dash-therapy-icon">{ex.icon}</span>
                      <div>
                        <strong>{ex.name}</strong>
                        <small>{ex.desc}</small>
                      </div>
                    </div>
                    <button onClick={() => navigate(`/therapy/${ex.id}`)} className="dash-therapy-btn">Start</button>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Dashboard;
