import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../auth/AuthContext';
import { saveTherapyProgress } from './ExerciseSystem';

const GATES = [
  { id: 1, label: 'Red 7', symbol: '7', color: '#ef4444', options: ['7', 'A', '3', 'X'] },
  { id: 2, label: 'Blue A', symbol: 'A', color: '#3b82f6', options: ['9', 'A', 'B', '5'] },
  { id: 3, label: 'Green 4', symbol: '4', color: '#10b981', options: ['4', 'M', '7', 'Z'] },
  { id: 4, label: 'Yellow B', symbol: 'B', color: '#fbbf24', options: ['8', 'B', '2', 'K'] },
  { id: 5, label: 'Purple 9', symbol: '9', color: '#a78bfa', options: ['9', 'C', '6', 'P'] },
  { id: 6, label: 'Cyan X', symbol: 'X', color: '#22d3ee', options: ['R', '5', 'X', '1'] },
];

const SymbolCircuit = ({ onComplete }) => {
  const { currentUser } = useAuth();

  const [gateIndex, setGateIndex] = useState(0);
  const [carSpeed, setCarSpeed] = useState(40); // mph
  const [score, setScore] = useState(0);
  const [totalAttempts, setTotalAttempts] = useState(0);
  const [correctAttempts, setCorrectAttempts] = useState(0);
  const [feedback, setFeedback] = useState('Identify the Gate Symbol to Boost your Car!');
  const [isSessionComplete, setIsSessionComplete] = useState(false);

  const gateStartTimeRef = useRef(performance.now());
  const currentGate = GATES[gateIndex];
  const currentAccuracy = totalAttempts > 0 ? Math.round((correctAttempts / totalAttempts) * 100) : 100;

  useEffect(() => {
    gateStartTimeRef.current = performance.now();
  }, [gateIndex]);

  const handleSelectSymbol = (selectedSymbol) => {
    if (isSessionComplete) return;

    const latencyMs = Math.round(performance.now() - gateStartTimeRef.current);
    const isRight = selectedSymbol === currentGate.symbol;

    setTotalAttempts(prev => prev + 1);

    if (isRight) {
      const boost = Math.max(10, Math.round(100 - latencyMs / 10));
      const newScore = score + boost + 20;
      setScore(newScore);
      setCorrectAttempts(prev => prev + 1);
      setCarSpeed(prev => Math.min(160, prev + 25));
      setFeedback(`🏎️ TURBO BOOST! Latency: ${latencyMs}ms (+${boost + 20} XP)`);
    } else {
      setCarSpeed(prev => Math.max(20, prev - 15));
      setFeedback(`⚠️ GATE SLOWNESS! Incorrect symbol selected.`);
    }

    if (gateIndex >= GATES.length - 1) {
      setIsSessionComplete(true);
      const finalAcc = Math.round(((correctAttempts + (isRight ? 1 : 0)) / (totalAttempts + 1)) * 100);
      saveTherapyProgress(currentUser, 'naming', score + 50, finalAcc, 'Symbol Circuit');
    } else {
      setGateIndex(prev => prev + 1);
    }
  };

  return (
    <div style={{ background: '#0c0e1a', color: '#f3f4f6', padding: '2rem', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 20px 50px rgba(0,0,0,0.6)', maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
      {/* Header Stats */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', background: 'rgba(255,255,255,0.03)', padding: '1rem 1.5rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
        <div>
          <span style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 800, display: 'block' }}>CIRCUIT XP</span>
          <span style={{ fontSize: '1.5rem', fontWeight: 900, color: '#fbbf24' }}>{score} XP</span>
        </div>
        <div>
          <span style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 800, display: 'block' }}>SPEEDOMETER</span>
          <span style={{ fontSize: '1.5rem', fontWeight: 900, color: '#22d3ee' }}>⚡ {carSpeed} MPH</span>
        </div>
        <div>
          <span style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 800, display: 'block' }}>ACCURACY</span>
          <span style={{ fontSize: '1.5rem', fontWeight: 900, color: '#84cc16' }}>{currentAccuracy}%</span>
        </div>
      </div>

      <div style={{ background: 'rgba(34, 211, 238, 0.08)', border: '1px solid rgba(34, 211, 238, 0.3)', borderRadius: '16px', padding: '1rem', marginBottom: '1.5rem' }}>
        <h3 style={{ margin: '0 0 0.5rem 0', color: '#22d3ee' }}>🏎️ Symbol Circuit Sprint (Gate {gateIndex + 1}/{GATES.length})</h3>
        <p style={{ margin: 0, color: '#cbd5e1', fontSize: '0.95rem' }}>Name or tap the symbol on the upcoming Race Gate to keep your car boosting at top speed!</p>
      </div>

      {/* Race Track Canvas/SVG View */}
      <div style={{ position: 'relative', height: '180px', background: 'linear-gradient(180deg, #0f172a 0%, #1e1b4b 100%)', borderRadius: '16px', border: '2px solid rgba(255,255,255,0.15)', marginBottom: '1.5rem', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {/* Race Gate Display */}
        <div style={{ border: `4px solid ${currentGate.color}`, borderRadius: '16px', padding: '1.5rem 3rem', background: 'rgba(0,0,0,0.7)', boxShadow: `0 0 30px ${currentGate.color}` }}>
          <span style={{ fontSize: '0.8rem', color: '#94a3b8', textTransform: 'uppercase', display: 'block', fontWeight: 800, marginBottom: '4px' }}>APPROACHING GATE</span>
          <span style={{ fontSize: '3.5rem', fontWeight: 900, color: currentGate.color, letterSpacing: '2px' }}>
            {currentGate.symbol}
          </span>
        </div>
      </div>

      {/* Symbol Choice Options */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        {currentGate.options.map((symbolOpt, idx) => (
          <button
            key={idx}
            onClick={() => handleSelectSymbol(symbolOpt)}
            disabled={isSessionComplete}
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', padding: '16px', borderRadius: '12px', fontSize: '1.8rem', fontWeight: 900, cursor: 'pointer', transition: 'all 0.15s ease' }}
          >
            {symbolOpt}
          </button>
        ))}
      </div>

      {/* Feedback */}
      <div style={{ padding: '0.8rem 1.2rem', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', fontSize: '0.9rem', color: '#e2e8f0', border: '1px solid rgba(255,255,255,0.1)' }}>
        {feedback}
      </div>

      {/* Completion Modal */}
      {isSessionComplete && (
        <div style={{ marginTop: '1.5rem', padding: '1.5rem', background: 'rgba(34, 211, 238, 0.15)', border: '1px solid #22d3ee', borderRadius: '14px' }}>
          <h3 style={{ color: '#22d3ee', margin: '0 0 0.5rem 0' }}>🏆 CIRCUIT SPRINT FINISHED!</h3>
          <p style={{ margin: '0 0 1rem 0', color: '#e0f2fe' }}>You cleared all gates with high naming velocity!</p>
          <button onClick={onComplete} style={{ background: '#22d3ee', color: '#000', fontWeight: 800, border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer' }}>
            Continue to Next Session →
          </button>
        </div>
      )}
    </div>
  );
};

export default SymbolCircuit;
