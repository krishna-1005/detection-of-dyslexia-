import React from 'react';
import './ReportGenerator.css';

const ReportGenerator = ({ result, user }) => {
  const generatePDF = () => {
    // In a real app, we'd use jspdf here. For this demo, we'll trigger a print view
    window.print();
  };

  if (!result) return null;

  return (
    <div className="report-generator">
      <div className="clinical-header">
        <div className="hospital-branding">
          <h2>LEXIFLOW CLINICAL REPORT</h2>
          <p>Cognitive Diagnostics Division</p>
        </div>
        <div className="patient-meta">
          <p><strong>Patient Name:</strong> {user?.name || 'Guest'}</p>
          <p><strong>Report ID:</strong> {Math.random().toString(36).substr(2, 9).toUpperCase()}</p>
          <p><strong>Date:</strong> {new Date().toLocaleDateString()}</p>
        </div>
      </div>

      <div className="clinical-summary">
        <h3>Diagnostic Summary</h3>
        <p>The neural diagnostic engine has completed an analysis of the provided linguistic samples. Below are the clinical findings categorized by cognitive impact levels.</p>
        
        <div className="risk-indicator">
          <span className="label">Composite Risk Score:</span>
          <span className={`value ${result.risk_score > 0.5 ? 'high' : 'moderate'}`}>
            {Math.round(result.risk_score * 100)}% - {result.risk_score > 0.5 ? 'High Risk' : 'Moderate Risk'}
          </span>
        </div>
      </div>

      <div className="clinical-findings">
        <h3>Reconstructed Linguistic Intent</h3>
        <div className="intent-box" style={{ background: 'var(--med-blue-light)', padding: '1.5rem', borderRadius: '12px', borderLeft: '5px solid var(--med-blue-primary)', marginBottom: '2rem' }}>
          <p style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600, color: 'var(--med-blue-primary)', fontStyle: 'italic' }}>
            "{result.corrected_sentence || result.corrected_text}"
          </p>
          <small style={{ color: 'var(--med-gray)', display: 'block', marginTop: '0.5rem' }}>
            * This is the engine's interpretation of the intended clinical sample.
          </small>
        </div>

        <h3>Key Linguistic Markers</h3>
        <table className="clinical-table">
          <thead>
            <tr>
              <th>Pattern Category</th>
              <th>Detected Example</th>
              <th>Impact Level</th>
            </tr>
          </thead>
          <tbody>
            {result.linguistic_patterns?.map((p, i) => (
              <tr key={i}>
                <td>{p.category}</td>
                <td>"{p.example}"</td>
                <td><span className={`tag ${p.level.toLowerCase()}`}>{p.level}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="clinical-recommendations">
        <h3>Recommendations</h3>
        <ul>
          <li>Implement visual overcrowding simulations during therapy.</li>
          <li>Utilize the 'Focus Ruler' for extended reading sessions.</li>
          <li>Focus on grapheme-phoneme correspondence exercises.</li>
        </ul>
      </div>

      <button className="btn-print no-print" onClick={generatePDF}>
        🖨️ Export Clinical PDF
      </button>
    </div>
  );
};

export default ReportGenerator;
