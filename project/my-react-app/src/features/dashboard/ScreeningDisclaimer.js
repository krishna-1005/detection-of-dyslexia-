import React from 'react';

/**
 * ScreeningDisclaimer — A persistent, non-dismissible banner
 * rendered wherever any screening risk/result data is displayed.
 *
 * This component MUST appear on:
 *   - Overview Dashboard (when results are shown)
 *   - Diagnostic Engine results (DetectPage / ResultDisplay)
 *   - Symptoms Quiz results (QuizPage)
 *   - Clinical Reports / Progress Report modal
 */
const ScreeningDisclaimer = ({ compact = false }) => {
  const style = compact
    ? {
        background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.08) 0%, rgba(245, 158, 11, 0.06) 100%)',
        border: '1px solid rgba(251, 191, 36, 0.25)',
        borderRadius: '10px',
        padding: '0.6rem 0.85rem',
        fontSize: '0.72rem',
        lineHeight: 1.55,
        color: '#92400e',
        fontWeight: 600,
        display: 'flex',
        alignItems: 'flex-start',
        gap: '6px',
      }
    : {
        background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.1) 0%, rgba(245, 158, 11, 0.07) 100%)',
        border: '1.5px solid rgba(251, 191, 36, 0.3)',
        borderRadius: '14px',
        padding: '0.85rem 1.15rem',
        fontSize: '0.8rem',
        lineHeight: 1.6,
        color: '#92400e',
        fontWeight: 600,
        display: 'flex',
        alignItems: 'flex-start',
        gap: '8px',
      };

  return (
    <div style={style} role="note" aria-label="Screening disclaimer">
      <span style={{ fontSize: compact ? '0.85rem' : '1rem', flexShrink: 0, marginTop: '1px' }}>
        ℹ️
      </span>
      <span>
        <strong style={{ color: '#b45309' }}>Important:</strong>{' '}
        This is a developmental screening tool, not a medical diagnosis.
        If your child shows risk indicators, please consult a licensed
        educational psychologist or reading specialist for a full evaluation.
      </span>
    </div>
  );
};

export default ScreeningDisclaimer;
