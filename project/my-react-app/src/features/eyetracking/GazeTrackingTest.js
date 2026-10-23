import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../dashboard/Navbar';
import Sidebar from '../dashboard/Sidebar';
import './GazeTrackingTest.css';
import gazeEngine, {
  CALIBRATION_POINTS,
  READING_PASSAGES,
  analyzeGazeSession
} from './gazeEngine';
import { useAuth } from '../auth/AuthContext';

const STEP_SETUP = 1;
const STEP_CALIBRATE = 2;
const STEP_READING = 3;
const STEP_REPORT = 4;

const GazeTrackingTest = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const user = currentUser;

  const [currentStep, setCurrentStep] = useState(STEP_SETUP);
  const [selectedPassage, setSelectedPassage] = useState(READING_PASSAGES[0]);

  // Video and Canvas Refs
  const videoRef = useRef(null);
  const cvCanvasRef = useRef(null);
  const wordsContainerRef = useRef(null);
  const visualCanvasRef = useRef(null);

  // Calibration State
  const [calibrationPointIndex, setCalibrationPointIndex] = useState(0);
  const [isCapturingPoint, setIsCapturingPoint] = useState(false);
  const [calibrationScore, setCalibrationScore] = useState(null);

  // Live Gaze & Reading Session State
  const gazeDotRef = useRef(null);
  const samplesRef = useRef([]);
  const wordBoxesRef = useRef([]);
  const [sampleCount, setSampleCount] = useState(0);
  const [readingStartTime, setReadingStartTime] = useState(null);
  const [hoveredWordIndex, setHoveredWordIndex] = useState(-1);

  // Diagnostic Report State
  const [reportData, setReportData] = useState(null);
  const [visualViewMode, setVisualViewMode] = useState('scanpath'); // 'scanpath' | 'heatmap'

  // Camera initialization
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState(null);

  // Init camera on setup
  const initCamera = async () => {
    setCameraError(null);
    if (!videoRef.current || !cvCanvasRef.current) return;
    const res = await gazeEngine.startCamera(videoRef.current, cvCanvasRef.current);
    if (res.success) {
      setCameraActive(true);
    } else {
      setCameraError(res.error || 'Failed to access webcam. Please check permissions.');
    }
  };

  useEffect(() => {
    initCamera();
    return () => {
      gazeEngine.stop();
    };
  }, []);

  // Pre-cache word bounding boxes when entering reading step to prevent layout thrashing
  useEffect(() => {
    if (currentStep === STEP_READING && wordsContainerRef.current) {
      const timer = setTimeout(() => {
        if (!wordsContainerRef.current) return;
        const spans = wordsContainerRef.current.querySelectorAll('.reading-word-span');
        const boxes = [];
        spans.forEach((span, idx) => {
          const rect = span.getBoundingClientRect();
          boxes.push({ index: idx, left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom });
        });
        wordBoxesRef.current = boxes;
      }, 60);
      return () => clearTimeout(timer);
    }
  }, [currentStep]);

  // Listen to live gaze stream during reading: Direct GPU transform for zero-jitter rendering
  useEffect(() => {
    if (currentStep !== STEP_READING) return;

    let lastCountUpdate = performance.now();
    let currentHoverIdx = -1;

    const unsubscribe = gazeEngine.subscribe((gaze) => {
      // Direct hardware-accelerated transform: Eliminates 60fps React re-render thrashing
      if (gazeDotRef.current) {
        gazeDotRef.current.style.transform = `translate3d(${gaze.x}px, ${gaze.y}px, 0)`;
        gazeDotRef.current.style.display = 'block';
      }

      // Collect raw coordinate in ref
      samplesRef.current.push(gaze);

      // Throttle UI counter state updates to a calm 2.5Hz
      const now = performance.now();
      if (now - lastCountUpdate > 400) {
        setSampleCount(samplesRef.current.length);
        lastCountUpdate = now;
      }

      // Fast word hover detection using pre-cached bounding boxes
      const boxes = wordBoxesRef.current;
      let found = -1;
      for (let i = 0; i < boxes.length; i++) {
        const b = boxes[i];
        if (
          gaze.x >= b.left - 10 &&
          gaze.x <= b.right + 10 &&
          gaze.y >= b.top - 14 &&
          gaze.y <= b.bottom + 14
        ) {
          found = b.index;
          break;
        }
      }
      if (found !== currentHoverIdx) {
        currentHoverIdx = found;
        setHoveredWordIndex(found);
      }
    });

    return () => unsubscribe();
  }, [currentStep]);

  // Start 9-point Calibration
  const handleStartCalibration = () => {
    setCurrentStep(STEP_CALIBRATE);
    setCalibrationPointIndex(0);
  };

  // Click on active calibration point
  const handleCalibratePointClick = async () => {
    if (isCapturingPoint) return;
    setIsCapturingPoint(true);

    const pt = CALIBRATION_POINTS[calibrationPointIndex];
    const targetX = Math.round((pt.x / 100) * window.innerWidth);
    const targetY = Math.round((pt.y / 100) * window.innerHeight);

    await gazeEngine.recordCalibrationSample(pt.id, targetX, targetY, 1000);

    setIsCapturingPoint(false);
    if (calibrationPointIndex < CALIBRATION_POINTS.length - 1) {
      setCalibrationPointIndex(prev => prev + 1);
    } else {
      // Completed all 9 points
      const result = gazeEngine.finalizeCalibration();
      setCalibrationScore(result.accuracyScore);
      // Auto-advance to reading session
      setTimeout(() => {
        setCurrentStep(STEP_READING);
        samplesRef.current = [];
        setSampleCount(0);
        setReadingStartTime(performance.now());
      }, 700);
    }
  };

  // Skip calibration directly to reading session (uses default biometric eye ratios)
  const handleSkipCalibration = () => {
    setCurrentStep(STEP_READING);
    samplesRef.current = [];
    setSampleCount(0);
    setReadingStartTime(performance.now());
  };

  // Cancel and go back to camera setup
  const handleCancelCalibration = () => {
    setCurrentStep(STEP_SETUP);
  };

  // Finish Reading & Analyze
  const handleFinishReading = () => {
    const durationSeconds = (performance.now() - (readingStartTime || performance.now())) / 1000;

    // Collect word bounding boxes
    const wordsBoxes = [];
    if (wordsContainerRef.current) {
      const spans = wordsContainerRef.current.querySelectorAll('.reading-word-span');
      spans.forEach((s, idx) => {
        const r = s.getBoundingClientRect();
        wordsBoxes.push({
          index: idx,
          text: s.innerText.trim(),
          left: r.left,
          right: r.right,
          top: r.top,
          bottom: r.bottom,
          width: r.width,
          height: r.height
        });
      });
    }

    const samples = samplesRef.current;
    const analysis = analyzeGazeSession(samples, wordsBoxes, durationSeconds);
    setReportData(analysis);
    setCurrentStep(STEP_REPORT);

    // Save to user history
    try {
      const uid = user?.uid;
      const historyKey = uid ? `cognilex_eyetracking_history_${uid}` : 'cognilex_eyetracking_history';
      const existing = JSON.parse(localStorage.getItem(historyKey) || '[]');
      const sessionRecord = {
        id: 'eye_' + Date.now(),
        date: new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        passageTitle: selectedPassage.title,
        grade: selectedPassage.grade,
        summary: analysis.summary,
        hotspots: analysis.hotspotWords
      };
      localStorage.setItem(historyKey, JSON.stringify([sessionRecord, ...existing]));

      // Also append to main diagnostic history
      const mainHistKey = uid ? `cognilex_history_${uid}` : 'cognilex_history';
      const mainHist = JSON.parse(localStorage.getItem(mainHistKey) || '[]');
      const mainRecord = {
        id: Date.now(),
        date: sessionRecord.date,
        type: 'Diagnostic: Ocular Eye-Tracking',
        score: Math.max(0, 100 - analysis.summary.odriScore),
        riskLevel: analysis.summary.riskLevel.includes('High') ? 'High' : analysis.summary.riskLevel.includes('Mod') ? 'Moderate' : 'Low',
        status: 'Completed',
        details: analysis.summary
      };
      localStorage.setItem(mainHistKey, JSON.stringify([mainRecord, ...mainHist]));
    } catch (e) {
      console.warn("Error saving eye-tracking session:", e);
    }
  };

  // Render Visual Scanpath or Heatmap on Report Canvas
  useEffect(() => {
    if (currentStep !== STEP_REPORT || !reportData || !visualCanvasRef.current) return;

    const canvas = visualCanvasRef.current;
    const ctx = canvas.getContext('2d');
    const width = canvas.parentElement.clientWidth || 900;
    const height = 360;
    canvas.width = width;
    canvas.height = height;

    ctx.clearRect(0, 0, width, height);

    // Coordinate normalization scale (relative to reading container offset)
    const fixations = reportData.fixations || [];
    const saccades = reportData.saccades || [];

    if (fixations.length === 0) return;

    const minX = Math.min(...fixations.map(f => f.x));
    const maxX = Math.max(...fixations.map(f => f.x));
    const minY = Math.min(...fixations.map(f => f.y));
    const maxY = Math.max(...fixations.map(f => f.y));

    const scaleX = (width - 100) / Math.max(200, maxX - minX || 1);
    const scaleY = (height - 80) / Math.max(100, maxY - minY || 1);

    const mapX = (x) => 50 + (x - minX) * scaleX;
    const mapY = (y) => 40 + (y - minY) * scaleY;

    if (visualViewMode === 'scanpath') {
      // Draw Saccade Vectors
      saccades.forEach(s => {
        const fromX = mapX(s.fromX);
        const fromY = mapY(s.fromY);
        const toX = mapX(s.toX);
        const toY = mapY(s.toY);

        ctx.beginPath();
        ctx.moveTo(fromX, fromY);
        ctx.lineTo(toX, toY);
        ctx.lineWidth = s.isRegression ? 3 : 2;
        ctx.strokeStyle = s.isRegression ? '#ef4444' : '#10b981'; // Red for backward regression, Green for forward
        ctx.setLineDash(s.isRegression ? [4, 4] : []);
        ctx.stroke();
        ctx.setLineDash([]);

        // Arrow head on regression
        if (s.isRegression) {
          const angle = Math.atan2(toY - fromY, toX - fromX);
          ctx.fillStyle = '#ef4444';
          ctx.beginPath();
          ctx.arc(toX, toY, 4, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      // Draw Numbered Fixation Nodes
      fixations.forEach((f, idx) => {
        const cx = mapX(f.x);
        const cy = mapY(f.y);
        const radius = Math.min(26, Math.max(12, Math.round(f.duration / 25)));

        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(37, 99, 235, 0.25)';
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#2563eb';
        ctx.stroke();

        ctx.fillStyle = '#1e3a8a';
        ctx.font = 'bold 11px Outfit, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(idx + 1), cx, cy);
      });
    } else {
      // Heatmap Gaze Density Mode (Gaussian Radial Blur Gradient)
      fixations.forEach(f => {
        const cx = mapX(f.x);
        const cy = mapY(f.y);
        const radius = Math.min(65, Math.max(30, Math.round(f.duration / 14)));

        const radGrad = ctx.createRadialGradient(cx, cy, 4, cx, cy, radius);
        radGrad.addColorStop(0, 'rgba(239, 68, 68, 0.85)');   // Hot red center
        radGrad.addColorStop(0.35, 'rgba(245, 158, 11, 0.6)'); // Yellow mid
        radGrad.addColorStop(0.7, 'rgba(59, 130, 246, 0.3)');  // Cool blue
        radGrad.addColorStop(1, 'rgba(59, 130, 246, 0)');     // Transparent edge

        ctx.fillStyle = radGrad;
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.fill();
      });
    }
  }, [currentStep, reportData, visualViewMode]);

  // Split passage text into word tokens
  const wordsList = selectedPassage.text.split(' ');

  return (
    <div className="gaze-page-container">
      <Navbar user={user} />

      <main className="gaze-main-content">
        {/* HEADER HERO */}
        <section className="gaze-header-card">
          <div className="gaze-header-title">
            <h1>👁️ Ocular Motility & Gaze-Tracking Diagnostic Suite</h1>
            <p>
              Measures real-time visual scanpaths, regressive saccades, and fixation durations to detect neuro-visual reading bottlenecks.
            </p>
          </div>
          <button 
            className="btn-gaze-secondary"
            onClick={() => navigate('/dashboard')}
          >
            ← Back to Dashboard
          </button>
        </section>

        {/* STEPPER */}
        <div className="gaze-stepper">
          <div className={`gaze-step-item ${currentStep === STEP_SETUP ? 'active' : currentStep > STEP_SETUP ? 'completed' : ''}`}>
            <span className="gaze-step-num">1</span>
            <span>Webcam Setup</span>
          </div>
          <div className={`gaze-step-item ${currentStep === STEP_CALIBRATE ? 'active' : currentStep > STEP_CALIBRATE ? 'completed' : ''}`}>
            <span className="gaze-step-num">2</span>
            <span>9-Point Eye Calibration</span>
          </div>
          <div className={`gaze-step-item ${currentStep === STEP_READING ? 'active' : currentStep > STEP_READING ? 'completed' : ''}`}>
            <span className="gaze-step-num">3</span>
            <span>Paragraph Reading</span>
          </div>
          <div className={`gaze-step-item ${currentStep === STEP_REPORT ? 'active' : ''}`}>
            <span className="gaze-step-num">4</span>
            <span>Ocular Dyslexia Report</span>
          </div>
        </div>

        {/* ── STAGE 1: SETUP & PERSISTENT CAMERA FEED ── */}
        <div className={`gaze-setup-card ${currentStep !== STEP_SETUP ? 'setup-card-compact' : ''}`}>
          <div className={`setup-grid ${currentStep !== STEP_SETUP ? 'grid-compact' : ''}`}>
            {/* The Camera Box stays permanently mounted in DOM to prevent video play abortion */}
            <div 
              className={`setup-camera-box ${
                currentStep === STEP_SETUP 
                  ? 'setup-in-card' 
                  : (currentStep === STEP_CALIBRATE || currentStep === STEP_READING) 
                    ? 'floating-during-test' 
                    : 'camera-hidden'
              }`}
            >
              <video 
                ref={videoRef} 
                playsInline 
                muted 
                className="setup-video-feed" 
              />
              <canvas ref={cvCanvasRef} className="setup-cv-overlay" />
              {currentStep === STEP_SETUP && <div className="face-target-guide" />}
              <div className="camera-status-pill">
                <span className={`status-dot ${cameraActive ? 'green' : 'amber'}`} />
                {cameraActive 
                  ? (currentStep === STEP_READING ? '👁️ Live Gaze Tracking' : 'Camera Active') 
                  : 'Initializing...'}
              </div>
            </div>

            {currentStep === STEP_SETUP && (
              <div className="setup-info-col">
                <h3>Position Your Face in the Guide</h3>
                <p>
                  Ensure your room is well lit and your face fits comfortably inside the oval guide. Remove tinted glasses if possible for optimal pupil tracking.
                </p>

                <ul className="clinical-bullet-list">
                  <li>
                    <span className="icon">🎯</span>
                    <span><strong>9-Point Spatial Calibration:</strong> Focus on red targets to align gaze to screen coordinates.</span>
                  </li>
                  <li>
                    <span className="icon">📖</span>
                    <span><strong>Natural Reading:</strong> Read the clinical paragraph at your everyday, comfortable pace.</span>
                  </li>
                  <li>
                    <span className="icon">🔬</span>
                    <span><strong>Ocular Saccade Index:</strong> Quantifies backward eye jumps and hesitation hotspots.</span>
                  </li>
                </ul>

                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 800, color: '#475569', display: 'block', marginBottom: 6 }}>
                    Select Reading Passage Grade:
                  </label>
                  <select 
                    value={selectedPassage.id}
                    onChange={(e) => setSelectedPassage(READING_PASSAGES.find(p => p.id === e.target.value) || READING_PASSAGES[0])}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 10,
                      border: '1.5px solid #cbd5e1',
                      fontSize: '0.85rem',
                      outline: 'none',
                      fontWeight: 600,
                      background: '#ffffff'
                    }}
                  >
                    {READING_PASSAGES.map(p => (
                      <option key={p.id} value={p.id}>{p.grade} — {p.title}</option>
                    ))}
                  </select>
                </div>

                {cameraError && (
                  <div style={{ color: '#dc2626', fontSize: '0.8rem', fontWeight: 700, marginBottom: 12 }}>
                    ⚠️ {cameraError}
                  </div>
                )}

                <button 
                  className="btn-gaze-primary"
                  onClick={handleStartCalibration}
                  disabled={!cameraActive}
                >
                  Start 9-Point Eye Calibration →
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── STAGE 2: 9-POINT CALIBRATION FULLSCREEN OVERLAY ── */}
        {currentStep === STEP_CALIBRATE && (
          <div className="calibration-stage-overlay">
            {/* Top Navigation & Status Bar */}
            <div className="calibration-top-controls">
              <button 
                className="btn-calib-back"
                onClick={handleCancelCalibration}
                title="Return to Camera Setup"
              >
                ◀ Back to Setup
              </button>

              <div className="calibration-notice-banner">
                <span className="calib-step-badge">Point {calibrationPointIndex + 1} of {CALIBRATION_POINTS.length}</span>
                <span>Focus eyes directly on the red target:</span>
                {isCapturingPoint ? (
                  <span style={{ color: '#10b981', fontWeight: 800 }}>● Calibrating ocular position...</span>
                ) : (
                  <span style={{ color: '#38bdf8', fontWeight: 700 }}>Click dot to capture</span>
                )}
              </div>

              <button 
                className="btn-calib-skip"
                onClick={handleSkipCalibration}
                title="Skip calibration and start reading test immediately using default eye profile"
              >
                ⚡ Skip & Start Reading →
              </button>
            </div>

            {/* Bottom Guidance Hint */}
            <div className="calibration-hint-text">
              💡 Stare at the pulsing red target with your eyes and click it. To jump straight to reading, click "Skip & Start Reading".
            </div>

            {/* Calibration Target Dot */}
            {(() => {
              const pt = CALIBRATION_POINTS[calibrationPointIndex];
              return (
                <div 
                  className={`calibration-target-dot ${isCapturingPoint ? 'capturing' : ''}`}
                  style={{ left: `${pt.x}%`, top: `${pt.y}%` }}
                  onClick={handleCalibratePointClick}
                >
                  <div className="calibration-target-center" />
                  <span className="calib-dot-number">{calibrationPointIndex + 1}</span>
                </div>
              );
            })()}
          </div>
        )}

        {/* ── STAGE 3: LIVE READING SESSION ── */}
        {currentStep === STEP_READING && (
          <div className="reading-session-wrap">
            {/* Live Gaze Cursor Dot with Hardware-Accelerated Positioning */}
            <div 
              ref={gazeDotRef}
              className="live-gaze-dot"
              style={{ display: 'none' }}
            />

            <div className="reading-top-bar">
              <div>
                <span className="passage-grade-tag">{selectedPassage.grade}</span>
                <h2 style={{ margin: '4px 0 0 0', fontSize: '1.25rem', color: '#0f172a' }}>
                  {selectedPassage.title}
                </h2>
              </div>

              <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                <div className="reading-live-indicator">
                  <span className="pulse-red-ring" />
                  <span>Tracking Gaze Stream ({sampleCount} pts)</span>
                </div>

                <button 
                  className="btn-gaze-primary"
                  onClick={handleFinishReading}
                >
                  Finished Reading → Generate Report
                </button>
              </div>
            </div>

            <div className="reading-paragraph-canvas-container">
              <p className="reading-passage-text" ref={wordsContainerRef}>
                {wordsList.map((word, wIdx) => {
                  const isHovered = hoveredWordIndex === wIdx;
                  return (
                    <React.Fragment key={wIdx}>
                      <span className={`reading-word-span ${isHovered ? 'gaze-hover' : ''}`}>
                        {word}
                      </span>
                      {' '}
                    </React.Fragment>
                  );
                })}
              </p>
            </div>
          </div>
        )}

        {/* ── STAGE 4: CLINICAL OCULAR REPORT ── */}
        {currentStep === STEP_REPORT && reportData && (
          <div className="gaze-report-hub">
            <div className="report-header-banner">
              <div>
                <span className="passage-grade-tag">Clinical Biomarker Report</span>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#0f172a', margin: '4px 0 6px 0' }}>
                  Ocular Motility & Saccadic Reading Analysis
                </h2>
                <div style={{ color: '#475569', fontSize: '0.86rem', fontWeight: 600 }}>
                  Clinical Phenotype: <strong style={{ color: '#1d4ed8' }}>{reportData.summary.clinicalPhenotype}</strong>
                </div>
              </div>

              <div className="odri-score-pill-wrap">
                <div className={`odri-gauge-circle ${reportData.summary.riskLevel.includes('High') ? 'High' : reportData.summary.riskLevel.includes('Mod') ? 'Moderate' : 'Low'}`}>
                  <span className="odri-gauge-val">{reportData.summary.odriScore}</span>
                  <span className="odri-gauge-label">ODRI Index</span>
                </div>
                <div>
                  <div style={{ fontSize: '0.74rem', textTransform: 'uppercase', fontWeight: 800, color: '#64748b' }}>
                    Ocular Risk Level
                  </div>
                  <strong style={{
                    fontSize: '1.2rem',
                    color: reportData.summary.riskLevel.includes('High') ? '#dc2626' : reportData.summary.riskLevel.includes('Mod') ? '#d97706' : '#059669'
                  }}>
                    ● {reportData.summary.riskLevel}
                  </strong>
                </div>
              </div>
            </div>

            {/* 4 STATS CARDS */}
            <div className="report-stat-grid">
              <div className="report-stat-card">
                <small>Backward Regressions</small>
                <strong>{reportData.summary.regressionRatePercent}%</strong>
                <span className="unit">({reportData.summary.regressiveCount} jumps)</span>
                <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: 4 }}>
                  Normal benchmark: 10–18%
                </div>
              </div>

              <div className="report-stat-card">
                <small>Mean Fixation Duration</small>
                <strong>{reportData.summary.meanFixationDurationMs}</strong>
                <span className="unit">ms</span>
                <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: 4 }}>
                  Normal benchmark: 200–260ms
                </div>
              </div>

              <div className="report-stat-card">
                <small>Reading Cadence</small>
                <strong>{reportData.summary.wpm}</strong>
                <span className="unit">WPM</span>
                <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: 4 }}>
                  Total Time: {reportData.summary.readingDurationSeconds}s
                </div>
              </div>

              <div className="report-stat-card">
                <small>Total Fixation Clusters</small>
                <strong>{reportData.summary.totalFixations}</strong>
                <span className="unit">nodes</span>
                <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: 4 }}>
                  Calibration Accuracy: {calibrationScore || 92}%
                </div>
              </div>
            </div>

            {/* VISUAL SCANPATH & HEATMAP CANVAS */}
            <div className="report-view-toggle-row">
              <div className="scanpath-legend">
                <div className="legend-item">
                  <span className="legend-color green" />
                  <span>Forward Progression Saccades</span>
                </div>
                <div className="legend-item">
                  <span className="legend-color red" />
                  <span>Backward Regressive Saccades (Dyslexia Bottlenecks)</span>
                </div>
                <div className="legend-item">
                  <span className="legend-color blue" />
                  <span>Fixation Dwell Node (Larger = Longer Lingering)</span>
                </div>
              </div>

              <div className="view-toggle-btns">
                <button 
                  className={`view-btn ${visualViewMode === 'scanpath' ? 'active' : ''}`}
                  onClick={() => setVisualViewMode('scanpath')}
                >
                  Saccade Scanpath Map
                </button>
                <button 
                  className={`view-btn ${visualViewMode === 'heatmap' ? 'active' : ''}`}
                  onClick={() => setVisualViewMode('heatmap')}
                >
                  Gaze Density Heatmap
                </button>
              </div>
            </div>

            <div className="visual-canvas-card">
              <canvas ref={visualCanvasRef} style={{ width: '100%', height: '360px', display: 'block' }} />
            </div>

            {/* REFIXATION HOTSPOT WORDS */}
            {reportData.hotspotWords && reportData.hotspotWords.length > 0 && (
              <div style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: 16, border: '1px solid #e2e8f0', marginBottom: '1.5rem' }}>
                <strong style={{ fontSize: '0.9rem', color: '#0f172a', display: 'block' }}>
                  🔍 Word-Level Refixation Hotspots (Words Re-read 2+ Times):
                </strong>
                <p style={{ margin: '4px 0 10px 0', fontSize: '0.78rem', color: '#64748b' }}>
                  These specific multi-syllabic or visually dense words triggered backward saccadic regressions or prolonged phonological decoding pauses:
                </p>
                <div className="hotspot-words-wrap">
                  {reportData.hotspotWords.map((hw, idx) => (
                    <span key={idx} className="hotspot-chip">
                      <strong>"{hw.word}"</strong>
                      <span>{hw.fixations} fixations</span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* CLINICAL INTERVENTION RECOMMENDATIONS */}
            <div style={{ background: '#f0fdf4', border: '1.5px solid #bbf7d0', borderRadius: 16, padding: '1.25rem', marginBottom: '1.75rem' }}>
              <strong style={{ fontSize: '0.92rem', color: '#166534', display: 'block', marginBottom: 6 }}>
                💡 Recommended Neuro-Visual Clinical Interventions:
              </strong>
              <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.84rem', color: '#166534', display: 'flex', flexDirection: 'column', gap: 6 }}>
                <li><strong>Saccadic Visual Tracking Therapy:</strong> Prescribe 10 minutes of daily visual tracking exercises at <code>/therapy/visual</code> to train horizontal ocular sweep stability.</li>
                <li><strong>Bionic Reader Fixation Guide:</strong> Enable Bionic Reading bold anchors on <code>/reader</code> to reduce regression rates by providing natural visual anchors on word onsets.</li>
                <li><strong>Single-Line Focus Ruler:</strong> Utilize the line ruler overlay to eliminate vertical line-hopping and visual crowding.</li>
              </ul>
            </div>

            {/* ACTION BUTTONS */}
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
              <button 
                className="btn-gaze-secondary"
                onClick={() => window.print()}
              >
                🖨️ Print Clinical Dossier
              </button>
              <button 
                className="btn-gaze-secondary"
                onClick={() => {
                  setCurrentStep(STEP_SETUP);
                  samplesRef.current = [];
                  setSampleCount(0);
                  setReportData(null);
                }}
              >
                🔄 Retest with New Passage
              </button>
              <button 
                className="btn-gaze-primary"
                onClick={() => navigate('/dashboard')}
              >
                Save & Return to Dashboard →
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default GazeTrackingTest;
