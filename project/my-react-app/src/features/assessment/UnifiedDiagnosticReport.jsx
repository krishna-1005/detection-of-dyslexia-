import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import './UnifiedDiagnosticReport.css';

// ── AGE-MATCHED BASELINE THRESHOLDS (Clinical Reference Norms) ──
const BASELINES = {
  phoneme:    { accuracyNorm: 85, latencyNorm: 2000 },
  ran:        { accuracyNorm: 80, latencyNorm: 900 },
  visual:     { accuracyNorm: 82, latencyNorm: 450 },
  auditory:   { accuracyNorm: 78, latencyNorm: 400 },
  morphology: { accuracyNorm: 75, latencyNorm: 3000 }
};

const SUBTYPE_LABELS = {
  phoneme:    { label: 'Phonological Awareness', icon: '🔤', riskLabel: 'Sound-to-letter decoding risk' },
  ran:        { label: 'Rapid Automatized Naming (RAN)', icon: '⚡', riskLabel: 'Retrieval speed bottleneck' },
  visual:     { label: 'Visual-Perceptual Index', icon: '👁️', riskLabel: 'Saccadic tracking / mirror reversal' },
  auditory:   { label: 'Auditory Discrimination', icon: '🎧', riskLabel: 'Voicing contrast accuracy' },
  morphology: { label: 'Morphological Decoding', icon: '🧬', riskLabel: 'Prefix/suffix recognition speed' }
};

const getRiskLevel = (accuracy, baseline) => {
  if (accuracy >= baseline) return { level: 'Low', color: '#10b981', badge: '✅' };
  if (accuracy >= baseline - 15) return { level: 'Moderate', color: '#f59e0b', badge: '⚠️' };
  return { level: 'High', color: '#ef4444', badge: '🔴' };
};

const getClassification = (results) => {
  const scores = {};
  Object.keys(results).forEach(key => {
    if (results[key]) {
      const acc = results[key].accuracy ?? 100;
      const norm = BASELINES[key]?.accuracyNorm ?? 80;
      scores[key] = { accuracy: acc, deficit: norm - acc };
    }
  });

  const deficits = Object.entries(scores)
    .filter(([, v]) => v.deficit > 0)
    .sort((a, b) => b[1].deficit - a[1].deficit);

  if (deficits.length === 0) {
    return { primary: 'No Significant Risk Detected', secondary: 'All subtests within age-matched norms', color: '#10b981', emoji: '🌟' };
  }

  const topDeficit = deficits[0][0];
  const hasPhono = deficits.some(([k]) => k === 'phoneme');
  const hasRAN = deficits.some(([k]) => k === 'ran');

  if (hasPhono && hasRAN) {
    return { primary: 'Double-Deficit Profile', secondary: 'Both phonological awareness and rapid naming show below-norm performance', color: '#ef4444', emoji: '⚡🔤' };
  }

  const labels = {
    phoneme: { primary: 'Phonological-Dominant', secondary: 'Primary difficulty in sound-to-letter decoding', emoji: '🔤' },
    ran: { primary: 'Rapid Naming Deficit', secondary: 'Primary difficulty in rapid automatized naming speed', emoji: '⚡' },
    visual: { primary: 'Visual-Perceptual', secondary: 'Primary difficulty in visual tracking and mirror reversals', emoji: '👁️' },
    auditory: { primary: 'Auditory Processing', secondary: 'Primary difficulty in auditory minimal-pair discrimination', emoji: '🎧' },
    morphology: { primary: 'Morphological-Structural', secondary: 'Primary difficulty in morpheme assembly and word structure', emoji: '🧬' }
  };

  const label = labels[topDeficit] || labels.phoneme;
  return { ...label, color: '#f59e0b' };
};

export default function UnifiedDiagnosticReport({ results, totalDurationMs }) {
  const navigate = useNavigate();

  const classification = useMemo(() => getClassification(results), [results]);

  const durationMinSec = useMemo(() => {
    const totalSec = Math.round(totalDurationMs / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    return `${min}m ${sec}s`;
  }, [totalDurationMs]);

  // Radar chart data points (5 axes)
  const radarData = useMemo(() => {
    return Object.keys(SUBTYPE_LABELS).map(key => {
      const r = results[key];
      return {
        key,
        ...SUBTYPE_LABELS[key],
        accuracy: r?.accuracy ?? 0,
        latencyMs: r?.latencyMs ?? 0,
        errorCount: r?.errorCount ?? 0,
        baseline: BASELINES[key].accuracyNorm,
        risk: getRiskLevel(r?.accuracy ?? 0, BASELINES[key].accuracyNorm)
      };
    });
  }, [results]);

  // Build SVG Radar Polygon
  const buildRadarPolygon = (dataPoints, maxVal, radius, cx, cy) => {
    const angleStep = (Math.PI * 2) / dataPoints.length;
    return dataPoints.map((d, i) => {
      const angle = angleStep * i - Math.PI / 2;
      const val = Math.min(d / maxVal, 1);
      const x = cx + Math.cos(angle) * radius * val;
      const y = cy + Math.sin(angle) * radius * val;
      return `${x},${y}`;
    }).join(' ');
  };

  // Handle persistence and navigation
  const handleSaveAndRoute = (destination) => {
    const reportPayload = {
      timestamp: new Date().toISOString(),
      durationMs: totalDurationMs,
      classification: classification.primary,
      results: Object.fromEntries(
        Object.entries(results).map(([key, val]) => [key, val ? {
          accuracy: val.accuracy,
          latencyMs: val.latencyMs,
          errorCount: val.errorCount
        } : null])
      ),
      lowestSubtype: radarData.reduce((min, d) => d.accuracy < min.accuracy ? d : min, radarData[0]).key
    };

    try {
      localStorage.setItem('lexiflow_universal_battery_report', JSON.stringify(reportPayload));
      window.dispatchEvent(new Event('diagnostic_completed'));
    } catch (e) {
      console.warn('Report save error:', e);
    }

    if (destination === 'dashboard') {
      navigate('/dashboard');
    }
  };

  const handlePrint = () => {
    handleSaveAndRoute();
    window.print();
  };

  const CX = 150, CY = 150, RADAR_R = 110;

  return (
    <div className="udr-viewport">
      <div className="udr-scroll-area">
        {/* ── HEADER ── */}
        <header className="udr-header">
          <div>
            <h1 className="udr-main-title">🩺 Universal Dyslexia Screening Report</h1>
            <p className="udr-subtitle">
              Comprehensive 5-Subtype Diagnostic Profile • Duration: {durationMinSec}
            </p>
          </div>
          <div className="udr-header-actions">
            <button className="udr-print-btn" onClick={handlePrint}>📄 Export / Print</button>
          </div>
        </header>

        {/* ── DOMINANT CLASSIFICATION CARD ── */}
        <div className="udr-classification-card" style={{ borderColor: classification.color }}>
          <div className="udr-class-icon" style={{ background: `${classification.color}20`, color: classification.color }}>
            {classification.emoji}
          </div>
          <div>
            <p className="udr-class-label">Dominant Dyslexia Classification</p>
            <h2 className="udr-class-title" style={{ color: classification.color }}>
              {classification.primary}
            </h2>
            <p className="udr-class-desc">{classification.secondary}</p>
          </div>
        </div>

        {/* ── RADAR + METRICS GRID ── */}
        <div className="udr-content-grid">
          {/* SVG Radar Chart */}
          <div className="udr-radar-card">
            <h3 className="udr-card-title">📊 Subtype Profiler Radar</h3>
            <svg viewBox="0 0 300 300" className="udr-radar-svg">
              {/* Grid rings */}
              {[0.25, 0.5, 0.75, 1].map(pct => (
                <polygon
                  key={pct}
                  points={buildRadarPolygon(
                    Array(5).fill(pct * 100), 100, RADAR_R, CX, CY
                  )}
                  fill="none"
                  stroke="rgba(148, 163, 184, 0.15)"
                  strokeWidth="1"
                />
              ))}

              {/* Axis lines */}
              {radarData.map((_, i) => {
                const angle = ((Math.PI * 2) / 5) * i - Math.PI / 2;
                const x2 = CX + Math.cos(angle) * RADAR_R;
                const y2 = CY + Math.sin(angle) * RADAR_R;
                return <line key={i} x1={CX} y1={CY} x2={x2} y2={y2} stroke="rgba(148, 163, 184, 0.12)" strokeWidth="1" />;
              })}

              {/* Baseline polygon */}
              <polygon
                points={buildRadarPolygon(radarData.map(d => d.baseline), 100, RADAR_R, CX, CY)}
                fill="rgba(251, 191, 36, 0.08)"
                stroke="#fbbf24"
                strokeWidth="1.5"
                strokeDasharray="6 4"
              />

              {/* Score polygon */}
              <polygon
                points={buildRadarPolygon(radarData.map(d => d.accuracy), 100, RADAR_R, CX, CY)}
                fill="rgba(34, 211, 238, 0.15)"
                stroke="#22d3ee"
                strokeWidth="2.5"
              />

              {/* Data points */}
              {radarData.map((d, i) => {
                const angle = ((Math.PI * 2) / 5) * i - Math.PI / 2;
                const val = Math.min(d.accuracy / 100, 1);
                const x = CX + Math.cos(angle) * RADAR_R * val;
                const y = CY + Math.sin(angle) * RADAR_R * val;
                return <circle key={d.key} cx={x} cy={y} r="5" fill={d.risk.color} stroke="#fff" strokeWidth="1.5" />;
              })}

              {/* Labels */}
              {radarData.map((d, i) => {
                const angle = ((Math.PI * 2) / 5) * i - Math.PI / 2;
                const x = CX + Math.cos(angle) * (RADAR_R + 24);
                const y = CY + Math.sin(angle) * (RADAR_R + 24);
                return (
                  <text key={d.key} x={x} y={y} textAnchor="middle" dominantBaseline="middle"
                    fill="#94a3b8" fontSize="9" fontWeight="700"
                  >
                    {d.icon} {d.label.split(' ')[0]}
                  </text>
                );
              })}
            </svg>

            <div className="udr-radar-legend">
              <span className="udr-legend-item"><span className="udr-legend-dot" style={{ background: '#22d3ee' }} /> Your Score</span>
              <span className="udr-legend-item"><span className="udr-legend-dot" style={{ background: '#fbbf24', border: '1px dashed #fbbf24' }} /> Age Baseline</span>
            </div>
          </div>

          {/* Detailed Metrics Cards */}
          <div className="udr-metrics-stack">
            {radarData.map(d => (
              <div key={d.key} className="udr-metric-card" style={{ borderLeftColor: d.risk.color }}>
                <div className="udr-metric-header">
                  <span className="udr-metric-icon">{d.icon}</span>
                  <div>
                    <h4 className="udr-metric-name">{d.label}</h4>
                    <p className="udr-metric-risk-label">{d.riskLabel}</p>
                  </div>
                  <span className="udr-risk-badge" style={{ background: `${d.risk.color}20`, color: d.risk.color, borderColor: d.risk.color }}>
                    {d.risk.badge} {d.risk.level} Risk
                  </span>
                </div>

                <div className="udr-metric-stats">
                  <div className="udr-metric-stat">
                    <span className="udr-stat-label">Accuracy</span>
                    <span className="udr-stat-value" style={{ color: d.risk.color }}>{d.accuracy}%</span>
                  </div>
                  <div className="udr-metric-stat">
                    <span className="udr-stat-label">Latency</span>
                    <span className="udr-stat-value">{d.latencyMs} ms</span>
                  </div>
                  <div className="udr-metric-stat">
                    <span className="udr-stat-label">Baseline</span>
                    <span className="udr-stat-value" style={{ color: '#fbbf24' }}>{d.baseline}%</span>
                  </div>
                  <div className="udr-metric-stat">
                    <span className="udr-stat-label">Errors</span>
                    <span className="udr-stat-value">{d.errorCount}</span>
                  </div>
                </div>

                {/* Accuracy Progress Bar */}
                <div className="udr-progress-track">
                  <div className="udr-progress-fill" style={{ width: `${Math.min(100, d.accuracy)}%`, background: d.risk.color }} />
                  <div className="udr-progress-baseline" style={{ left: `${d.baseline}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── ACTION CTAs ── */}
        <div className="udr-actions">
          <button className="udr-action-btn primary" onClick={handlePrint}>
            📄 Export Clinical Summary (PDF / Print)
          </button>
          <button className="udr-action-btn secondary" onClick={() => handleSaveAndRoute('dashboard')}>
            🎮 Launch Tailored Therapy Plan
          </button>
        </div>

        {/* ── DISCLAIMER ── */}
        <div className="udr-disclaimer">
          <p>
            <strong>⚠️ Disclaimer:</strong> This screening tool provides an indicative risk profile based on game-based performance metrics.
            It is NOT a medical diagnosis. Please consult a qualified educational psychologist or speech-language pathologist for formal assessment.
          </p>
        </div>
      </div>
    </div>
  );
}
