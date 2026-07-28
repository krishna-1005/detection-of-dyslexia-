import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "./DetectPage.css";
import "../dashboard/Dashboard.css";
import Navbar from "../dashboard/Navbar";
import Sidebar from "../dashboard/Sidebar";
import FocusRuler from "../reader/FocusRuler";
import ReportGenerator from "../analytics/ReportGenerator";
import ResultDisplay from "./ResultDisplay";
import { useAuth } from "../auth/AuthContext";
import { fetchWithAuth } from "../../services/api";

const DetectPage = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const user = currentUser;
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
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (result && resultsRef.current) {
      resultsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [result]);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setLoading(true);
    const formData = new FormData();
    formData.append("file", file);
    
    try {
      const response = await fetchWithAuth("/api/upload", {
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
      const response = await fetchWithAuth("/api/analyze", {
        method: "POST",
        body: JSON.stringify({ text }),
      });
      const data = await response.json();
      setResult(data);
      
      const score = Math.round((data.risk_score || 0) * 100);
      const riskLevel = score > 60 ? "High" : score > 35 ? "Moderate" : "Low";
      const now = new Date();
      const formattedDate = now.toLocaleDateString() + " " + now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      
      const newEntry = {
        id: Date.now(),
        date: formattedDate,
        isoDate: now.toISOString(),
        type: "Linguistic Text Analysis",
        score: score,
        riskLevel: riskLevel,
        status: "Completed",
        details: data
      };

      try {
        await fetchWithAuth("/api/history", {
          method: "POST",
          body: JSON.stringify(newEntry)
        });
      } catch (err) {
        console.warn("Could not post history to backend:", err);
      }

      const uidKey = currentUser?.uid ? `lexiflow_history_${currentUser.uid}` : "lexiflow_history";
      const uidHist = JSON.parse(localStorage.getItem(uidKey) || "[]");
      localStorage.setItem(uidKey, JSON.stringify([newEntry, ...uidHist]));

      const globalHist = JSON.parse(localStorage.getItem("lexiflow_history") || "[]");
      localStorage.setItem("lexiflow_history", JSON.stringify([newEntry, ...globalHist]));
    } catch (error) {
      alert("Error contacting diagnostic engine.");
    } finally {
      setLoading(false);
    }
  };

  const storageKey = currentUser?.uid ? `lexiflow_history_${currentUser.uid}` : "lexiflow_history";
  const history = JSON.parse(localStorage.getItem(storageKey) || localStorage.getItem("lexiflow_history") || "[]");

  return (
    <div className={`page-container ${isDyslexiaFriendly ? "dyslexia-friendly" : ""}`}>
      <Navbar user={user} showDropdown={showDropdown} setShowDropdown={setShowDropdown} />
      <FocusRuler isActive={isFocusRulerActive} />

      <div className="dashboard-layout" style={{ display: 'flex' }}>
        <Sidebar />

        <main className="main-content" style={{ flex: 1, padding: '2.5rem' }}>
          <header className="medical-header" style={{ marginBottom: '2rem' }}>
            <span className="badge badge-info" style={{ marginBottom: '0.4rem' }}>🧬 Neural Engine v4.2</span>
            <h1 style={{ fontSize: '1.9rem', fontWeight: 800 }}>Linguistic Diagnostic Engine</h1>
            <p style={{ color: 'var(--lf-text-muted)', fontSize: '0.9rem', marginTop: '0.2rem' }}>
              Input clinical linguistic text samples or upload document files (.pdf, .docx, .txt) for AI dyslexia screening.
            </p>
          </header>

          <section className="medical-card" style={{ marginBottom: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--lf-text-primary)' }}>Session Clinical Sample</h3>
                <span className="badge badge-info">{text.split(/\s+/).filter(Boolean).length} words</span>
              </div>
              <button className="btn-secondary" onClick={() => fileInputRef.current.click()}>
                📄 Upload File (.pdf, .docx, .txt)
              </button>
              <input type="file" ref={fileInputRef} style={{ display: 'none' }} accept=".txt,.pdf,.docx" onChange={handleFileUpload} />
            </div>

            <textarea 
              className={`analysis-input ${colorOverlay !== "none" ? `overlay-${colorOverlay}` : ""} ${isOvercrowdingSimActive ? "overcrowding-active" : ""}`} 
              placeholder="Paste patient reading/writing sample text here for instant diagnostic analysis..." 
              value={text} 
              onChange={(e) => setText(e.target.value)}
              style={{ 
                letterSpacing: letterSpacing === "wide" ? "0.15em" : "normal", 
                lineHeight: lineHeight,
                fontSize: `${fontSize}px`
              }}
            />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem' }}>
              <div style={{ display: 'flex', gap: '2rem' }}>
                <div className="medical-stat">
                  <small className="medical-label">Character Count</small>
                  <strong style={{ color: 'var(--lf-text-primary)', fontSize: '1.1rem' }}>{text.length}</strong>
                </div>
                <div className="medical-stat">
                  <small className="medical-label">Sample Status</small>
                  <span className={`badge ${text.length >= 20 ? 'badge-low' : text.length >= 3 ? 'badge-mod' : 'badge-high'}`}>
                    {text.length >= 20 ? '✓ VALID SAMPLE' : text.length >= 3 ? 'LIMITED SAMPLE' : 'TOO SHORT'}
                  </span>
                </div>
              </div>

              <button className="btn-gradient" onClick={handleAnalyze} disabled={loading || text.length < 3}>
                {loading ? "⚙️ PROCESSING DIAGNOSTIC..." : "🧬 RUN DIAGNOSTIC ENGINE"}
              </button>
            </div>
          </section>

          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '1.5rem' }}>
            {/* Analytics Trends */}
            <section className="medical-card">
              <h3 style={{ marginBottom: '1.25rem', fontSize: '1.05rem', fontWeight: 700, color: 'var(--lf-text-primary)' }}>
                Session Diagnostics History
              </h3>
              {history.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {history.slice(0, 4).map((h, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.85rem 1.15rem', background: 'var(--lf-bg-primary)', borderRadius: 'var(--lf-radius-md)', border: '1px solid var(--lf-border)' }}>
                      <div>
                        <strong style={{ display: 'block', fontSize: '0.85rem', color: 'var(--lf-text-primary)' }}>{h.date}</strong>
                        <small style={{ fontSize: '0.75rem', color: 'var(--lf-text-muted)' }}>{h.type}</small>
                      </div>
                      <span className={`badge ${h.score > 60 ? 'badge-high' : h.score > 35 ? 'badge-mod' : 'badge-low'}`}>
                        {h.score}% RISK ({h.riskLevel})
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--lf-text-muted)', fontSize: '0.9rem' }}>
                  No historical diagnostic sessions logged yet.
                </div>
              )}
            </section>

            {/* Diagnostic Parameters */}
            <section className="medical-card">
              <h3 style={{ marginBottom: '1.25rem', fontSize: '1.05rem', fontWeight: 700, color: 'var(--lf-text-primary)' }}>
                Clinical Visual Overlays
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <strong style={{ fontSize: '0.88rem', display: 'block' }}>Focus Ruler Overlay</strong>
                    <small style={{ color: 'var(--lf-text-muted)', fontSize: '0.75rem' }}>Highlights current line focus</small>
                  </div>
                  <button onClick={() => setIsFocusRulerActive(!isFocusRulerActive)} className={`btn-secondary ${isFocusRulerActive ? 'btn-primary' : ''}`} style={{ padding: '0.35rem 0.85rem', fontSize: '0.8rem' }}>
                    {isFocusRulerActive ? 'ACTIVE' : 'INACTIVE'}
                  </button>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <strong style={{ fontSize: '0.88rem', display: 'block' }}>Visual Crowding Sim</strong>
                    <small style={{ color: 'var(--lf-text-muted)', fontSize: '0.75rem' }}>Simulate visual distortion</small>
                  </div>
                  <button onClick={() => setIsOvercrowdingSimActive(!isOvercrowdingSimActive)} className={`btn-secondary ${isOvercrowdingSimActive ? 'btn-primary' : ''}`} style={{ padding: '0.35rem 0.85rem', fontSize: '0.8rem' }}>
                    {isOvercrowdingSimActive ? 'ON' : 'OFF'}
                  </button>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <strong style={{ fontSize: '0.88rem', display: 'block' }}>Clinical Color Tint</strong>
                    <small style={{ color: 'var(--lf-text-muted)', fontSize: '0.75rem' }}>Glare reduction filter</small>
                  </div>
                  <select value={colorOverlay} onChange={(e) => setColorOverlay(e.target.value)} style={{ padding: '0.4rem 0.75rem', borderRadius: 'var(--lf-radius-sm)', border: '1px solid var(--lf-border)', background: '#ffffff', color: 'var(--lf-text-primary)', fontSize: '0.85rem', fontWeight: 600 }}>
                    <option value="none">Default Slate</option>
                    <option value="yellow">Contrast Yellow</option>
                    <option value="blue">Calm Blue</option>
                    <option value="pink">High-Vis Pink</option>
                  </select>
                </div>
              </div>
            </section>
          </div>

          {result && !loading && (
            <div ref={resultsRef} style={{ marginTop: '2.5rem' }}>
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
