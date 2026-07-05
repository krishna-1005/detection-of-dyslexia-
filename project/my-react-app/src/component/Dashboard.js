import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./Dashboard.css";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";

const Dashboard = () => {
  const navigate = useNavigate();
  const userString = localStorage.getItem("lexiflow_user");
  const user = React.useMemo(() => JSON.parse(userString), [userString]);
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
    if (!userString) {
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
  }, [userString, navigate]);

  return (
    <div className="page-container" style={{ background: 'var(--med-blue-light)', minHeight: '100vh' }}>
      <Navbar user={user} showDropdown={showDropdown} setShowDropdown={setShowDropdown} />

      <div className="dashboard-layout" style={{ display: 'flex' }}>
        <Sidebar />

        <main className="main-content" style={{ flex: 1, padding: '3rem' }}>
          <header className="medical-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span className="medical-label">Clinical Overview</span>
              <h1 style={{ fontSize: '2rem', fontWeight: 800 }}>Patient Dashboard</h1>
            </div>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button className="medical-btn-secondary" onClick={() => navigate('/analysis')}>📈 View User Analysis</button>
              <Link to="/detect" className="medical-btn-primary">🧬 New Diagnostic Session</Link>
            </div>
          </header>

          <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', marginBottom: '3rem' }}>
            <div className="medical-card">
              <span className="medical-label">Total Diagnostics</span>
              <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--med-blue-primary)' }}>{stats.totalTests}</div>
            </div>
            <div className="medical-card">
              <span className="medical-label">Average Risk Index</span>
              <div style={{ fontSize: '2.5rem', fontWeight: 800, color: patientData.riskLevel === 'High' ? '#ef4444' : 'var(--med-teal)' }}>{stats.avgRisk}</div>
            </div>
            <div className="medical-card">
              <span className="medical-label">Therapy Progress</span>
              <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--med-blue-primary)' }}>{patientData.progress}%</div>
            </div>
          </div>

          <div className="dashboard-grid" style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '2rem' }}>
            <section className="medical-card">
              <h3 style={{ marginBottom: '2rem', fontSize: '1.1rem', fontWeight: 700 }}>Diagnostic History</h3>
              <table className="medical-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ textAlign: 'left', borderBottom: '2px solid var(--med-border)' }}>
                    <th style={{ padding: '1rem 0' }} className="medical-label">Session Date</th>
                    <th style={{ padding: '1rem 0' }} className="medical-label">Risk Level</th>
                    <th style={{ padding: '1rem 0' }} className="medical-label">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentTests.map(test => (
                    <tr key={test.id} style={{ borderBottom: '1px solid var(--med-border)' }}>
                      <td style={{ padding: '1.25rem 0', fontWeight: 600 }}>{test.date}</td>
                      <td style={{ padding: '1.25rem 0' }}>
                        <span style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 800, background: test.score > 60 ? '#fee2e2' : '#fef3c7', color: test.score > 60 ? '#ef4444' : '#d97706' }}>
                          {test.score}% {test.score > 60 ? 'HIGH' : 'MODERATE'}
                        </span>
                      </td>
                      <td style={{ padding: '1.25rem 0', color: 'var(--med-teal)', fontWeight: 700 }}>● COMPLETE</td>
                    </tr>
                  ))}
                  {recentTests.length === 0 && <tr><td colSpan="3" style={{ padding: '2rem', textAlign: 'center', color: 'var(--med-gray)' }}>No diagnostic records available.</td></tr>}
                </tbody>
              </table>
            </section>

            <section className="medical-card">
              <h3 style={{ marginBottom: '2rem', fontSize: '1.1rem', fontWeight: 700 }}>Therapy Suite</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {[
                  { id: 'phoneme', name: 'Phoneme Matching', icon: '🧩' },
                  { id: 'morphology', name: 'Morphology Builder', icon: '🧬' },
                  { id: 'naming', name: "Rapid Naming (RAN)", icon: '⚡' },
                  { id: 'visual', name: 'Visual Tracking', icon: '📖' },
                  { id: 'auditory', name: 'Auditory Processing', icon: '🎧' },
                  { id: 'video', name: 'Live Video Session', icon: '📹' }
                ].map(ex => (
                  <div key={ex.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem', background: 'var(--med-blue-light)', borderRadius: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <span style={{ fontSize: '1.25rem' }}>{ex.icon}</span>
                      <strong style={{ fontSize: '0.9rem' }}>{ex.name}</strong>
                    </div>
                    <button onClick={() => navigate(`/therapy/${ex.id}`)} className="medical-btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.75rem' }}>Start</button>
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
