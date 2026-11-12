import React, { useState, useEffect, useRef } from "react";
import Navbar from "../dashboard/Navbar";
import Sidebar from "../dashboard/Sidebar";
import FocusRuler from "../reader/FocusRuler";
import ScreeningDisclaimer from "../dashboard/ScreeningDisclaimer";
import { useAuth } from "../auth/AuthContext";
import { fetchWithAuth } from "../../services/api";
import "./HandwritingIntelligence.css";
import "../dashboard/Dashboard.css";
import "../detection/DetectPage.css";

const CALIBRATION_SAMPLES = [
  { id: "SYNTH_001_SCOOL", label: "SCOOL", expected: "SCHOOL", file: "SYNTH_001_SCOOL.png", note: "Missing letter 'H'" },
  { id: "SYNTH_002_FRIENB", label: "FRIENB", expected: "FRIEND", file: "SYNTH_002_FRIENB.png", note: "Substituted 'D' with 'B'" },
  { id: "SYNTH_003_DEAR", label: "DEAR", expected: "BEAR", file: "SYNTH_003_DEAR.png", note: "Reversal 'B' -> 'D'" },
  { id: "SYNTH_004_PLAY", label: "PLAY", expected: "PLAY", file: "SYNTH_004_PLAY.png", note: "Exact Match Control" },
  { id: "SYNTH_005_QUITE", label: "QUITE", expected: "QUIET", file: "SYNTH_005_QUITE.png", note: "Letter Transposition" },
  { id: "SYNTH_006_DAG", label: "DAG", expected: "BAG", file: "SYNTH_006_DAG.png", note: "Reversal 'B' -> 'D'" },
  { id: "SYNTH_010_bed_ded", label: "bed/ded", expected: "bed", file: "SYNTH_010_bed_ded.png", note: "Lowercase 'b' -> 'd'" },
];

const REVERSAL_PAIRS = [
  ["b", "d"], ["d", "b"],
  ["p", "q"], ["q", "p"],
  ["m", "w"], ["w", "m"],
  ["n", "u"], ["u", "n"],
  ["B", "D"], ["D", "B"],
  ["P", "Q"], ["Q", "P"]
];

function detectReversals(expected, recognized) {
  if (!expected || !recognized) return [];
  const reversals = [];
  const expUpper = expected.toUpperCase();
  const recUpper = recognized.toUpperCase();

  const minLen = Math.min(expUpper.length, recUpper.length);
  for (let i = 0; i < minLen; i++) {
    const e = expUpper[i];
    const r = recUpper[i];
    if (e !== r) {
      const isReversal = REVERSAL_PAIRS.some(([a, b]) => a.toUpperCase() === e && b.toUpperCase() === r);
      if (isReversal) {
        reversals.push({ position: i + 1, expected: e, recognized: r });
      }
    }
  }
  return reversals;
}

const HandwritingIntelligence = () => {
  const { currentUser } = useAuth();
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [expectedWord, setExpectedWord] = useState("");
  const [preprocess, setPreprocess] = useState(true);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [selectedSampleId, setSelectedSampleId] = useState(null);
  const [engineHealth, setEngineHealth] = useState(null);
  const [isFocusRulerActive, setIsFocusRulerActive] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef(null);
  const resultsRef = useRef(null);

  // Load backend engine telemetry on mount
  useEffect(() => {
    let isMounted = true;
    const fetchHealth = async () => {
      try {
        const res = await fetchWithAuth("/api/handwriting/health");
        if (res.ok) {
          const data = await res.json();
          if (isMounted) setEngineHealth(data);
        }
      } catch (err) {
        console.warn("Handwriting telemetry unavailable:", err);
      }
    };
    fetchHealth();
    return () => { isMounted = false; };
  }, []);

  // Smooth scroll to results when received
  useEffect(() => {
    if (result && resultsRef.current) {
      resultsRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [result]);

  const handleFileSelect = (selectedFile) => {
    if (!selectedFile) return;
    if (!selectedFile.type.startsWith("image/")) {
      setError("Please select a valid image file (.png, .jpg, .jpeg, .webp, .bmp).");
      return;
    }
    setError(null);
    setFile(selectedFile);
    setSelectedSampleId(null);
    setResult(null);

    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result);
    reader.readAsDataURL(selectedFile);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const loadCalibrationSample = async (sample) => {
    try {
      setSelectedSampleId(sample.id);
      setExpectedWord(sample.expected);
      setError(null);
      setResult(null);

      const sampleUrl = `${process.env.PUBLIC_URL || ""}/samples/${sample.file}`;
      const res = await fetch(sampleUrl);
      if (!res.ok) throw new Error("Could not load calibration sample image.");
      const blob = await res.blob();
      const loadedFile = new File([blob], sample.file, { type: "image/png" });
      setFile(loadedFile);
      setPreview(sampleUrl);
    } catch (err) {
      console.warn("Failed to load sample:", err);
      setError(`Failed to load calibration sample: ${err.message}`);
    }
  };

  const handleAnalyze = async () => {
    if (!file) {
      setError("Please upload an image or select a calibration sample first.");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    const formData = new FormData();
    formData.append("file", file);
    if (expectedWord.trim()) {
      formData.append("expected_word", expectedWord.trim());
    }
    formData.append("preprocess", preprocess ? "true" : "false");

    try {
      const response = await fetchWithAuth("/api/handwriting/analyze", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok && data.error && !data.recognized_text) {
        setError(data.error || "Analysis failed.");
        setResult(data);
      } else {
        setResult(data);

        // Record entry into local session history
        const now = new Date();
        const formattedDate = now.toLocaleDateString() + " " + now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        const historyItem = {
          id: Date.now(),
          date: formattedDate,
          isoDate: now.toISOString(),
          type: "Handwriting Optical Intelligence",
          score: Math.round(((1 - (data.character_error_rate || 0)) * 100)),
          riskLevel: (data.character_error_rate > 0.35 || data.is_uncertain) ? "Moderate" : "Low",
          status: "Completed",
          details: {
            recognized: data.recognized_text,
            expected: data.expected_word,
            cer: data.character_error_rate,
            confidence: data.confidence,
            model: data.model_used
          }
        };

        try {
          const uidKey = currentUser?.uid ? `cognilex_history_${currentUser.uid}` : "cognilex_history";
          const hist = JSON.parse(localStorage.getItem(uidKey) || "[]");
          localStorage.setItem(uidKey, JSON.stringify([historyItem, ...hist]));
          const globalHist = JSON.parse(localStorage.getItem("cognilex_history") || "[]");
          localStorage.setItem("cognilex_history", JSON.stringify([historyItem, ...globalHist]));
        } catch (e) {
          console.warn("Could not save handwriting history locally:", e);
        }
      }
    } catch (err) {
      setError("Failed to connect to Cognilex Handwriting Service (Port 5000). Please ensure backend is running.");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setPreview(null);
    setExpectedWord("");
    setResult(null);
    setError(null);
    setSelectedSampleId(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Reversal analysis helper
  const reversals = result ? detectReversals(result.expected_word || expectedWord, result.recognized_text) : [];

  return (
    <div
      className="page-container kids-page-bg"
      style={{
        minHeight: "100vh",
        background: "radial-gradient(circle at 10% 20%, rgba(255, 242, 210, 0.5) 0%, rgba(224, 247, 250, 0.5) 50%, rgba(243, 229, 245, 0.5) 100%)",
      }}
    >
      <Navbar user={currentUser} showDropdown={showDropdown} setShowDropdown={setShowDropdown} />
      <FocusRuler isActive={isFocusRulerActive} />

      <div className="dashboard-layout" style={{ display: "flex" }}>
        <Sidebar />

        <main className="main-content" style={{ flex: 1, padding: "2rem 2.5rem" }}>
          {/* Header */}
          <header className="medical-header" style={{ marginBottom: "1.75rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
              <div>
                <span className="title-kids-badge" style={{ fontSize: "0.85rem", padding: "4px 12px", marginBottom: "0.4rem", display: "inline-block" }}>
                  ✍️ Handwriting Intelligence Studio
                </span>
                <h1 style={{ fontSize: "2.2rem", fontWeight: 900, color: "#2f3542", margin: 0, fontFamily: 'var(--kids-font-display, "Fredoka", sans-serif)' }}>
                  🖋️ AI Handwriting Recognition & Analysis 🎈
                </h1>
                <p style={{ color: "#57606f", fontSize: "0.95rem", marginTop: "0.4rem", fontWeight: 600 }}>
                  Upload handwritten words to evaluate character formations, spelling deviations, and visual letter inversions with TrOCR vision transformers.
                </p>
              </div>

              <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap" }}>
                <button
                  type="button"
                  className="sample-pill-btn"
                  onClick={() => setIsFocusRulerActive(prev => !prev)}
                  title="Toggle Reading Focus Ruler"
                  style={{ background: isFocusRulerActive ? "#eef2ff" : "#ffffff", borderColor: isFocusRulerActive ? "#6366f1" : "#e2e8f0" }}
                >
                  <span>📏</span>
                  <span>{isFocusRulerActive ? "Ruler Active" : "Focus Ruler"}</span>
                </button>

                {/* Telemetry Indicator */}
                <div className="handwriting-telemetry-pill">
                <span className={`handwriting-telemetry-dot ${engineHealth?.is_model_loaded ? "" : "offline"}`} />
                <span>
                  {engineHealth?.is_model_loaded
                    ? `Engine: ${engineHealth.preferred_model || "TrOCR"}`
                    : engineHealth?.offline_fallback_enabled
                    ? "Engine: Contour Offline Fallback (Active)"
                    : "Connecting to ML Engine..."}
                </span>
              </div>
            </div>

            <div style={{ marginTop: "0.75rem" }}>
              <ScreeningDisclaimer compact />
            </div>
          </header>

          <div className="handwriting-container">
            {/* Main Interactive Grid */}
            <div className="handwriting-workspace-grid">
              {/* Left Column: Input & Upload */}
              <section className="medical-card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                  <h3 style={{ fontSize: "1.1rem", fontWeight: 800, color: "#1e293b", margin: 0 }}>
                    1. Upload Handwritten Word
                  </h3>
                  {file && (
                    <button className="sample-pill-btn" onClick={handleReset} title="Clear selected image">
                      ↺ Clear
                    </button>
                  )}
                </div>

                {/* Dropzone */}
                {!preview ? (
                  <div
                    className={`handwriting-dropzone ${isDragging ? "drag-active" : ""}`}
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current.click()}
                  >
                    <span className="handwriting-dropzone-icon">📝</span>
                    <p className="handwriting-dropzone-title">Click to upload or drag & drop</p>
                    <p className="handwriting-dropzone-subtitle">Supported formats: PNG, JPG, JPEG, WEBP, BMP</p>
                    <span className="badge badge-info" style={{ marginTop: "0.25rem" }}>
                      Single-word handwritten crops recommended
                    </span>
                  </div>
                ) : (
                  <div className="handwriting-preview-box">
                    <img src={preview} alt="Handwritten preview" className="handwriting-preview-img" />
                    <div style={{ display: "flex", justifyContent: "space-between", width: "100%", fontSize: "0.75rem", color: "#64748b" }}>
                      <span><strong>File:</strong> {file?.name || "Selected sample"}</span>
                      {file?.size && <span><strong>Size:</strong> {(file.size / 1024).toFixed(1)} KB</span>}
                    </div>
                  </div>
                )}

                <input
                  type="file"
                  ref={fileInputRef}
                  style={{ display: "none" }}
                  accept="image/png,image/jpeg,image/jpg,image/webp,image/bmp"
                  onChange={(e) => handleFileSelect(e.target.files[0])}
                />

                {/* Calibration Sample Selector */}
                <div style={{ marginTop: "1.25rem" }}>
                  <label className="hw-input-label">
                    <span>Or Select a Calibration Test Sample:</span>
                    <small style={{ color: "#6366f1", fontWeight: 600 }}>Synthetic Benchmarks</small>
                  </label>
                  <div className="sample-pills-row">
                    {CALIBRATION_SAMPLES.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        className={`sample-pill-btn ${selectedSampleId === s.id ? "active" : ""}`}
                        onClick={() => loadCalibrationSample(s)}
                        title={`${s.note} (Target: ${s.expected})`}
                      >
                        <span>📄</span>
                        <span>{s.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Expected Word Input */}
                <div className="hw-input-group">
                  <label className="hw-input-label">
                    <span>Target / Expected Word (Optional)</span>
                    <small style={{ color: "#64748b" }}>For spelling CER & deviation analysis</small>
                  </label>
                  <input
                    type="text"
                    className="hw-input-text"
                    placeholder="e.g. SCHOOL, FRIEND, BEAR, PLAY"
                    value={expectedWord}
                    onChange={(e) => setExpectedWord(e.target.value.toUpperCase())}
                  />
                </div>

                {/* Preprocessing toggle & Run button */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "1.25rem", flexWrap: "wrap", gap: "1rem" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.85rem", color: "#334155", cursor: "pointer", fontWeight: 600 }}>
                    <input
                      type="checkbox"
                      checked={preprocess}
                      onChange={(e) => setPreprocess(e.target.checked)}
                      style={{ accentColor: "#6366f1", width: "16px", height: "16px" }}
                    />
                    <span>OpenCV Deskew & Normalization</span>
                  </label>

                  <button
                    className="btn-gradient"
                    onClick={handleAnalyze}
                    disabled={loading || !file}
                    style={{ padding: "0.75rem 1.75rem", fontSize: "0.95rem" }}
                  >
                    {loading ? "⚙️ RUNNING RECOGNITION..." : "✍️ ANALYZE HANDWRITING"}
                  </button>
                </div>

                {error && (
                  <div style={{ marginTop: "1rem", padding: "0.75rem 1rem", background: "#fef2f2", border: "1px solid #f87171", borderRadius: "10px", color: "#b91c1c", fontSize: "0.85rem" }}>
                    ⚠️ {error}
                  </div>
                )}
              </section>

              {/* Right Column: Engine Info & Quick Guidelines */}
              <section className="medical-card" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                <div>
                  <h3 style={{ fontSize: "1.1rem", fontWeight: 800, color: "#1e293b", marginBottom: "1rem" }}>
                    ℹ️ How Handwriting Intelligence Works
                  </h3>

                  <div style={{ display: "flex", flexDirection: "column", gap: "0.9rem", fontSize: "0.86rem", color: "#475569", lineHeight: 1.55 }}>
                    <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
                      <span style={{ fontSize: "1.2rem" }}>🔬</span>
                      <div>
                        <strong style={{ color: "#0f172a" }}>Vision Transformer OCR (TrOCR):</strong>
                        <p style={{ margin: "2px 0 0 0" }}>Processes raw handwriting strokes without requiring external cloud OCR APIs, preserving student privacy.</p>
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
                      <span style={{ fontSize: "1.2rem" }}>📐</span>
                      <div>
                        <strong style={{ color: "#0f172a" }}>Adaptive Deskewing:</strong>
                        <p style={{ margin: "2px 0 0 0" }}>Calculates contour moments to orient handwritten baselines horizontally and normalizes to a standard 384x128 canvas.</p>
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
                      <span style={{ fontSize: "1.2rem" }}>🔍</span>
                      <div>
                        <strong style={{ color: "#0f172a" }}>Uncertainty Awareness:</strong>
                        <p style={{ margin: "2px 0 0 0" }}>Flags ambiguous strokes or unreadable handwriting rather than forcing a misleading transcription.</p>
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
                      <span style={{ fontSize: "1.2rem" }}>🔤</span>
                      <div>
                        <strong style={{ color: "#0f172a" }}>Character Error Rate (CER):</strong>
                        <p style={{ margin: "2px 0 0 0" }}>Quantifies phonetic and orthographic distance between the intended target and the written sample.</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: "1.5rem", padding: "0.85rem", background: "rgba(99, 102, 241, 0.05)", borderRadius: "10px", border: "1px solid rgba(99, 102, 241, 0.2)" }}>
                  <small style={{ color: "#4f46e5", fontWeight: 700, display: "block", marginBottom: "3px" }}>
                    Clinical Safety Principle:
                  </small>
                  <small style={{ color: "#64748b", lineHeight: 1.4, display: "block" }}>
                    Handwriting analysis serves as an assistive screening signal. Results are never used alone for clinical diagnosis.
                  </small>
                </div>
              </section>
            </div>

            {/* Results Section */}
            {result && (
              <div ref={resultsRef} className="hw-result-hero">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
                  <div>
                    <span className="title-kids-badge" style={{ fontSize: "0.75rem", padding: "3px 10px" }}>
                      Recognition Results
                    </span>
                    <h2 style={{ fontSize: "1.6rem", fontWeight: 800, color: "#1e1b4b", margin: "0.25rem 0 0 0" }}>
                      Optical Character Recognition & Analysis
                    </h2>
                  </div>

                  <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                    {result.exact_match === true ? (
                      <span className="badge badge-low" style={{ fontSize: "0.85rem", padding: "6px 14px" }}>
                        ✓ EXACT SPELLING MATCH
                      </span>
                    ) : result.expected_word ? (
                      <span className="badge badge-mod" style={{ fontSize: "0.85rem", padding: "6px 14px" }}>
                        ⚠️ SPELLING DEVIATION DETECTED
                      </span>
                    ) : null}

                    {result.is_uncertain && (
                      <span className="badge badge-high" style={{ fontSize: "0.85rem", padding: "6px 14px" }}>
                        ❓ UNCERTAINTY FLAGGED
                      </span>
                    )}
                  </div>
                </div>

                {/* Big Recognized Word Box */}
                <div className="hw-comparison-box">
                  <div className="hw-comparison-item" style={{ minWidth: "200px" }}>
                    <span className="hw-comparison-label">Recognized Text</span>
                    <span className="hw-word-display">{result.recognized_text || "— (No Text Detected)"}</span>
                  </div>

                  {result.expected_word && (
                    <>
                      <div style={{ fontSize: "1.5rem", color: "#cbd5e1" }}>➔</div>
                      <div className="hw-comparison-item">
                        <span className="hw-comparison-label">Expected Target</span>
                        <span className="hw-comparison-value" style={{ color: "#0f766e" }}>{result.expected_word}</span>
                      </div>
                    </>
                  )}
                </div>

                {/* Character-level breakdown if target word is provided */}
                {result.expected_word && (
                  <div style={{ marginTop: "1.25rem" }}>
                    <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "#334155" }}>
                      Character Alignment & Deviation Inspector:
                    </span>
                    <div className="hw-char-chip-row">
                      {Array.from(result.recognized_text || "").map((char, idx) => {
                        const targetChar = (result.expected_word || "")[idx] || "";
                        const isMatch = char.toUpperCase() === targetChar.toUpperCase();
                        const isRev = reversals.some(r => r.position === idx + 1);

                        return (
                          <div
                            key={idx}
                            className={`hw-char-chip ${isRev ? "reversal" : isMatch ? "match" : "mismatch"}`}
                            title={`Pos ${idx + 1}: Found '${char}' vs Target '${targetChar || "None"}'`}
                          >
                            <span className="hw-char-char">{char}</span>
                            <span className="hw-char-subtext">
                              {isRev ? "Reversal" : isMatch ? "Match" : targetChar ? `Exp ${targetChar}` : "Extra"}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Reversal Banner if detected */}
                {reversals.length > 0 && (
                  <div style={{ marginTop: "1rem", padding: "0.85rem 1.15rem", background: "rgba(217, 70, 239, 0.08)", border: "1.5px solid rgba(217, 70, 239, 0.3)", borderRadius: "12px", display: "flex", gap: "10px", alignItems: "center" }}>
                    <span style={{ fontSize: "1.4rem" }}>🔄</span>
                    <div>
                      <strong style={{ color: "#86198f", fontSize: "0.88rem" }}>Potential Letter Reversal Identified:</strong>
                      <div style={{ fontSize: "0.8rem", color: "#701a75", marginTop: "2px" }}>
                        {reversals.map((r, i) => (
                          <span key={i} style={{ marginRight: "12px" }}>
                            Position {r.position}: <strong>'{r.expected}'</strong> written as <strong>'{r.recognized}'</strong>
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Uncertainty Warning Box */}
                {result.is_uncertain && (
                  <div className="hw-uncertainty-alert">
                    <span style={{ fontSize: "1.4rem" }}>⚠️</span>
                    <div>
                      <h4>Recognition Uncertainty Notice</h4>
                      <p>
                        The AI engine flagged this sample as uncertain due to:{" "}
                        <strong>{(result.uncertainty_reasons || []).join(", ") || "Stroke Ambiguity"}</strong>.
                        We recommend repeating the sample with clearer lighting or verifying manually before concluding screening results.
                      </p>
                    </div>
                  </div>
                )}

                {/* Metrics Breakdown Grid */}
                <div className="hw-metrics-grid">
                  <div className="hw-metric-card">
                    <span className="hw-metric-title">Model Confidence</span>
                    <span className="hw-metric-stat" style={{ color: "#4f46e5" }}>
                      {result.confidence != null ? `${Math.round(result.confidence * 100)}%` : "N/A"}
                    </span>
                    <span className="hw-metric-note">Uncalibrated token logit score</span>
                  </div>

                  {result.character_error_rate != null && (
                    <div className="hw-metric-card">
                      <span className="hw-metric-title">Char Error Rate (CER)</span>
                      <span className="hw-metric-stat" style={{ color: result.character_error_rate === 0 ? "#10b981" : "#f59e0b" }}>
                        {result.character_error_rate}
                      </span>
                      <span className="hw-metric-note">Levenshtein normalized distance</span>
                    </div>
                  )}

                  {result.levenshtein_distance != null && (
                    <div className="hw-metric-card">
                      <span className="hw-metric-title">Edit Distance</span>
                      <span className="hw-metric-stat" style={{ color: "#0f172a" }}>
                        {result.levenshtein_distance} {result.levenshtein_distance === 1 ? "char" : "chars"}
                      </span>
                      <span className="hw-metric-note">Character insertions/deletions</span>
                    </div>
                  )}

                  <div className="hw-metric-card">
                    <span className="hw-metric-title">Inference Latency</span>
                    <span className="hw-metric-stat" style={{ color: "#0f766e" }}>
                      {result.inference_time_ms ? `${result.inference_time_ms} ms` : "—"}
                    </span>
                    <span className="hw-metric-note">Device: {result.device || "cpu"}</span>
                  </div>

                  <div className="hw-metric-card">
                    <span className="hw-metric-title">Vision Architecture</span>
                    <span className="hw-metric-stat" style={{ fontSize: "1rem", color: "#334155" }}>
                      {result.model_used || "TrOCR"}
                    </span>
                    <span className="hw-metric-note">
                      {result.preprocessed ? "OpenCV Preprocessed" : "Raw Input"}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default HandwritingIntelligence;
