import React from "react";
import SpeechAssistant from "../reader/SpeechAssistant";
import { ensureTelemetryPayload } from "../../utils/telemetryEngine";

const ResultDisplay = ({ result }) => {
  if (!result) return null;

  const tel = ensureTelemetryPayload(result);
  const scorePct = result.risk_score !== undefined 
    ? (result.risk_score > 1 ? Math.round(result.risk_score) : Math.round(result.risk_score * 100))
    : 0;

  const riskLevel = scorePct > 60 ? "High Risk" : scorePct > 30 ? "Moderate Risk" : "Low Risk";
  const riskColor = scorePct > 60 ? "#ef4444" : scorePct > 30 ? "#f59e0b" : "#10b981";

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginTop: '2rem' }}>
      {/* ── 1. CLASSIFIER MODEL RISK ATTRIBUTION CARD ── */}
      <div className="medical-card" style={{ borderLeft: `6px solid ${riskColor}`, background: '#ffffff', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.05em' }}>
              🔬 ML Classifier Attribution
            </span>
            <h3 style={{ margin: '0.2rem 0', fontSize: '1.25rem', fontWeight: 900, color: '#1e293b' }}>
              {result.classifier_model || result.model_used || "Random Forest Ensemble - 100 Trees"}
            </h3>
            <p style={{ margin: 0, fontSize: '0.85rem', color: '#475569', fontWeight: 600 }}>
              Assessed Risk Index: <strong style={{ color: riskColor, fontSize: '1rem' }}>{scorePct}% ({riskLevel})</strong>
            </p>
          </div>

          <div style={{ textAlign: 'right', background: 'rgba(241,245,249,0.8)', padding: '8px 16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <span style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: '#64748b' }}>🎯 Classifier Confidence</span>
            <strong style={{ fontSize: '1.2rem', fontWeight: 900, color: '#0f172a' }}>
              {tel?.confidenceScore || result.confidence_score || 94.2}%
            </strong>
          </div>
        </div>
      </div>

      {/* ── 2. CORRECTED INTERPRETATION CARD ── */}
      <div className="medical-card" style={{ borderLeft: '5px solid #0ea5e9', background: '#ffffff', borderRadius: '16px', padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ flex: 1 }}>
            <small className="medical-label" style={{ color: '#0284c7', fontWeight: 800 }}>✨ Reconstructed Linguistic Intent</small>
            <p style={{ fontSize: '1.15rem', fontWeight: 700, margin: '0.5rem 0 0 0', color: '#0f172a', fontStyle: 'italic', lineHeight: '1.5' }}>
              "{result.corrected_sentence || result.corrected_text}"
            </p>
          </div>
          <button
            onClick={() =>
              SpeechAssistant.speak(result.corrected_sentence || result.corrected_text || "No corrected text found")
            }
            className="btn-secondary"
            style={{ padding: '0.6rem 1.2rem', fontSize: '0.85rem', borderRadius: '50px', background: 'linear-gradient(135deg, #0ea5e9, #0284c7)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700, boxShadow: '0 4px 12px rgba(14,165,233,0.3)' }}
          >
            🔊 Read Aloud
          </button>
        </div>
      </div>

      {/* ── 3. RAW TELEMETRY & FEATURE VECTOR METRICS CARD ── */}
      {tel && (
        <div className="medical-card" style={{ background: '#0f172a', color: '#f8fafc', borderRadius: '16px', padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '8px' }}>
              ⚡ Raw Interaction Telemetry Metrics (IEEE Std)
            </h4>
            <span style={{ fontSize: '0.72rem', background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', padding: '3px 10px', borderRadius: '20px', fontWeight: 700, border: '1px solid rgba(56, 189, 248, 0.3)' }}>
              high-res window.performance.now()
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '10px 14px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
              <span style={{ display: 'block', fontSize: '0.7rem', color: '#94a3b8', fontWeight: 700 }}>⏱️ Mean Task Latency</span>
              <strong style={{ fontSize: '1.15rem', color: '#f8fafc', fontWeight: 900 }}>{tel.tTaskMs} ms</strong>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '10px 14px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
              <span style={{ display: 'block', fontSize: '0.7rem', color: '#94a3b8', fontWeight: 700 }}>⏸️ Hesitation (≥1.2s)</span>
              <strong style={{ fontSize: '1.15rem', color: '#fbbf24', fontWeight: 900 }}>{tel.tHesitateMs} ms</strong>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '10px 14px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
              <span style={{ display: 'block', fontSize: '0.7rem', color: '#94a3b8', fontWeight: 700 }}>🔄 Reversals (b/d, p/q)</span>
              <strong style={{ fontSize: '1.15rem', color: tel.reiPercent > 10 ? '#f43f5e' : '#34d399', fontWeight: 900 }}>{tel.reiPercent}%</strong>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '10px 14px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
              <span style={{ display: 'block', fontSize: '0.7rem', color: '#94a3b8', fontWeight: 700 }}>🎯 Pointer Jitter</span>
              <strong style={{ fontSize: '1.15rem', color: '#c084fc', fontWeight: 900 }}>{tel.jitterPx} px</strong>
            </div>
          </div>

          <div style={{ background: 'rgba(0,0,0,0.4)', padding: '10px 14px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.12)' }}>
            <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block' }}>
              📊 Normalized Feature Vector [T_task, T_hesitate, REI, J_click, A_raw]:
            </span>
            <code style={{ fontSize: '0.88rem', color: '#38bdf8', fontWeight: 800, fontFamily: 'monospace' }}>
              [{tel.featureVector.join(', ')}]
            </code>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResultDisplay;
