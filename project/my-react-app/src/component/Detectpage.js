import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "./DetectPage.css";
import "./Dashboard.css";
import SpeechAssistant from "./SpeechAssistant";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";
import FocusRuler from "./FocusRuler";
import ReportGenerator from "./ReportGenerator";
import ResultDisplay from "./ResultDisplay";
import { getUserSession } from "./authSession";

const DetectPage = () => {
  const navigate = useNavigate();
  const user = getUserSession();
  const [text, setText] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isDyslexiaFriendly, setIsDyslexiaFriendly] = useState(false);
  const [fontSize, setFontSize] = useState(18);
  const [letterSpacing, setLetterSpacing] = useState("normal");
  const [lineHeight, setLineHeight] = useState("1.6");
  const [isOvercrowdingSimActive, setIsOvercrowdingSimActive] = useState(false);
  const [colorOverlay, setColorOverlay] = useState("none");
  const [isFocusRulerActive, setIsFocusRulerActive] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const resultsRef = useRef(null);
  const reportRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (result && resultsRef.current) {
      resultsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [result]);

  useEffect(() => {
    if (!user) {
      navigate("/login");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, navigate]);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setLoading(true);
    const formData = new FormData();
    formData.append("file", file);
    
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || "http://localhost:5000"}/api/upload`, {
        method: "POST",
        body: formData,
      });
      const data = await response.json();
      if (response.ok) {
        setText(data.text || "");
      } else {
        alert(data.error || "Failed to read file.");
      }
    } catch (error) {
      alert("Error contacting file processing engine.");
    } finally {
      setLoading(false);
      e.target.value = "";
    }
  };

  const handleAnalyze = async () => {
    if (!text || !text.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || "http://localhost:5000"}/api/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await response.json();
      setResult(data);
      
      const history = JSON.parse(localStorage.getItem("lexiflow_history") || "[]");
      const newEntry = {
        id: Date.now(),
        date: new Date().toISOString().split('T')[0],
        type: "Text Analysis",
        score: Math.round(data.risk_score * 100),
        status: "Completed",
        details: data
      };
      localStorage.setItem("lexiflow_history", JSON.stringify([newEntry, ...history]));
    } catch (error) {
      alert("Error contacting diagnostic engine.");
    } finally {
      setLoading(false);
    }
  };

  const history = JSON.parse(localStorage.getItem("lexiflow_history") || "[]");

  return (
    <div className={`page-container ${isDyslexiaFriendly ? "dyslexia-friendly" : ""}`}>
      <Navbar user={user} showDropdown={showDropdown} setShowDropdown={setShowDropdown} />
      <FocusRuler isActive={isFocusRulerActive} />

      <div className="dashboard-layout" style={{ display: 'flex' }}>
        <Sidebar />

        <main className="main-content" style={{ flex: 1, padding: '2.5rem' }}>
          <header className="medical-header">
            <span className="medical-label">Neural Engine v4.2</span>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 800, fontFamily: "'Outfit', sans-serif" }}>Linguistic Diagnostic Engine</h1>
          </header>

          <section className="medical-card" style={{ marginBottom: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--lf-text-primary)' }}>Session Input</h3>
              <button className="medical-btn-secondary" style={{ fontSize: '0.8rem' }} onClick={() => fileInputRef.current.click()}>📄 Upload Clinical Sample</button>
              <input type="file" ref={fileInputRef} style={{ display: 'none' }} accept=".txt,.pdf,.docx" onChange={handleFileUpload} />
            </div>

            <textarea 
              className={`analysis-input ${colorOverlay !== "none" ? `overlay-${colorOverlay}` : ""}`} 
              placeholder="Paste patient linguistic sample here for analysis..." 
              value={text} 
              onChange={(e) => setText(e.target.value)}
              style={{ 
                letterSpacing: letterSpacing === "wide" ? "0.15em" : "normal", 
                lineHeight: lineHeight
              }}
            />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem' }}>
              <div style={{ display: 'flex', gap: '1.5rem' }}>
                <div className="medical-stat">
                  <small className="medical-label">Character Count</small>
                  <strong style={{ color: 'var(--lf-text-primary)' }}>{text.length}</strong>
                </div>
                <div className="medical-stat">
                  <small className="medical-label">Sample Status</small>
                  <strong style={{ color: text.length >= 20 ? 'var(--lf-teal-light)' : text.length >= 3 ? 'var(--lf-indigo-light)' : 'var(--lf-rose)' }}>
                    {text.length >= 20 ? 'VALID' : text.length >= 3 ? 'LIMITED' : 'TOO SHORT'}
                  </strong>
                </div>
              </div>
              <button className="medical-btn-primary" onClick={handleAnalyze} disabled={loading || text.length < 3}>
                {loading ? "⚙️ PROCESSING..." : "🧬 RUN DIAGNOSTIC"}
              </button>
            </div>
          </section>

          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '1.5rem' }}>
            {/* Analytics Trends */}
            <section className="medical-card">
              <h3 style={{ marginBottom: '1.5rem', fontSize: '1rem', fontWeight: 700, color: 'var(--lf-text-primary)' }}>Session Diagnostics History</h3>
              {history.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {history.slice(0, 4).map((h, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.85rem 1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', border: '1px solid var(--lf-border)' }}>
                      <span style={{ fontWeight: 600, color: 'var(--lf-text-secondary)' }}>{h.date}</span>
                      <span style={{ fontWeight: 800, color: h.score > 50 ? 'var(--lf-rose)' : 'var(--lf-amber)' }}>{h.score}% RISK</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--lf-text-muted)' }}>No historical data for this session.</div>
              )}
            </section>

            {/* Diagnostic Parameters */}
            <section className="medical-card">
              <h3 style={{ marginBottom: '1.5rem', fontSize: '1rem', fontWeight: 700, color: 'var(--lf-text-primary)' }}>Analysis Parameters</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.9rem', color: 'var(--lf-text-secondary)' }}>Focus Ruler</span>
                  <button onClick={() => setIsFocusRulerActive(!isFocusRulerActive)} style={{ padding: '4px 12px', borderRadius: '6px', border: '1px solid var(--lf-border)', cursor: 'pointer', background: isFocusRulerActive ? 'var(--lf-indigo)' : 'rgba(255,255,255,0.04)', color: isFocusRulerActive ? 'white' : 'var(--lf-text-secondary)', fontWeight: 600, fontSize: '0.8rem' }}>{isFocusRulerActive ? 'ACTIVE' : 'INACTIVE'}</button>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.9rem', color: 'var(--lf-text-secondary)' }}>Simulated Crowding</span>
                  <button onClick={() => setIsOvercrowdingSimActive(!isOvercrowdingSimActive)} style={{ padding: '4px 12px', borderRadius: '6px', border: '1px solid var(--lf-border)', cursor: 'pointer', background: isOvercrowdingSimActive ? 'var(--lf-rose)' : 'rgba(255,255,255,0.04)', color: isOvercrowdingSimActive ? 'white' : 'var(--lf-text-secondary)', fontWeight: 600, fontSize: '0.8rem' }}>{isOvercrowdingSimActive ? 'ON' : 'OFF'}</button>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.9rem', color: 'var(--lf-text-secondary)' }}>Clinical Overlay</span>
                  <select value={colorOverlay} onChange={(e) => setColorOverlay(e.target.value)} style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid var(--lf-border)', background: 'rgba(255,255,255,0.04)', color: 'var(--lf-text-primary)', fontSize: '0.85rem' }}>
                    <option value="none">None</option>
                    <option value="yellow">Contrast Yellow</option>
                    <option value="blue">Calm Blue</option>
                    <option value="pink">High-Vis Pink</option>
                  </select>
                </div>
              </div>
            </section>
          </div>

          {result && !loading && (
            <div ref={resultsRef} style={{ marginTop: '2rem' }}>
              <ResultDisplay result={result} />
              <ReportGenerator result={result} user={user} />
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default DetectPage;
