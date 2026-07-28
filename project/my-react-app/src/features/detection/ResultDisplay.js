import React from "react";
import SpeechAssistant from "../reader/SpeechAssistant";

const ResultDisplay = ({ result }) => {
  if (!result) return null;

  return (
    <div className="medical-card" style={{ marginTop: '2rem', borderLeft: '5px solid var(--med-teal)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <small className="medical-label">Corrected Interpretation</small>
          <p style={{ fontSize: '1.2rem', fontWeight: 600, margin: '0.5rem 0', color: 'var(--med-teal)' }}>
            {result.corrected_sentence || result.corrected_text}
          </p>
        </div>
        <button
          onClick={() =>
            SpeechAssistant.speak(result.corrected_sentence || result.corrected_text || "No corrected text found")
          }
          className="medical-btn-secondary"
          style={{ padding: '0.5rem 1rem', fontSize: '0.8rem' }}
        >
          🔊 Read Aloud
        </button>
      </div>
    </div>
  );
};

export default ResultDisplay;
