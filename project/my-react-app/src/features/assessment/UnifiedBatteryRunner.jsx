import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../dashboard/Navbar';
import MarioPhonemeJumper from '../therapy/MarioPhonemeJumper';
import BalloonPopRAN from '../therapy/BalloonPopRAN';
import MirrorMatchHighway from '../therapy/MirrorMatchHighway';
import RhythmRail from '../therapy/RhythmRail';
import MorphoSnake from '../therapy/MorphoSnake';
import AuditorySoundShield from '../therapy/AuditorySoundShield';
import SoundBlastCannon from '../therapy/SoundBlastCannon';
import UnifiedDiagnosticReport from './UnifiedDiagnosticReport';
import { speakHumanText } from '../therapy/humanVoiceEngine';
import './UnifiedBatteryRunner.css';

// ── STAGE CONFIGURATION WITH RICH SAFARI METADATA ──
const STAGES = [
  {
    key: 'phoneme',
    name: 'Sound Matching',
    subtitle: 'The Bouncing "B" Grove',
    emoji: '🐱',
    targetCount: 4,
    Component: MarioPhonemeJumper,
    color: '#f59e0b',
    badgeColor: '#fef3c7',
    badgeTextColor: '#b45309',
    voiceLabel: 'Lexi the Owl (Playful & Warm)',
    missionTitle: 'Listen & Match',
    missionPrompt: 'Can you tap the block that begins with the "B" sound?',
    targetPhoneme: '/b/ as in "B-B-Bat!"',
    hintText: 'Lips start closed together!',
    tip: 'Run and jump to hit correct phoneme blocks!',
    speechInstruction: 'Can you tap or jump on the block starting with the B sound?'
  },
  {
    key: 'ran',
    name: 'Rapid Naming',
    subtitle: 'Breezy Balloon Valley',
    emoji: '🎈',
    targetCount: 6,
    Component: BalloonPopRAN,
    color: '#38bdf8',
    badgeColor: '#e0f2fe',
    badgeTextColor: '#0369a1',
    voiceLabel: 'Lexi the Owl (Playful & Warm)',
    missionTitle: 'Rapid Visual Naming',
    missionPrompt: 'Can you pop the target balloons as fast as they float up?',
    targetPhoneme: 'Target: Colors, Numbers & Symbols',
    hintText: 'Keep your eyes moving across the sky!',
    tip: 'Pop target balloons as fast as you can!',
    speechInstruction: 'Pop the target balloon as fast as you can!'
  },
  {
    key: 'visual',
    name: 'Visual Tracking',
    subtitle: 'Mirror Letter Highway',
    emoji: '📖',
    targetCount: 4,
    Component: MirrorMatchHighway,
    color: '#818cf8',
    badgeColor: '#e0e7ff',
    badgeTextColor: '#4338ca',
    voiceLabel: 'Lexi the Owl (Playful & Warm)',
    missionTitle: 'Mirror Reversals & Tracking',
    missionPrompt: 'Lock on the target letter while tracking the highway!',
    targetPhoneme: 'Target Pair: b vs d / u vs n',
    hintText: 'Watch out for 180° mirrored decoys!',
    tip: 'Track the highway and lock on the correct letter!',
    speechInstruction: 'Lock on the target letter and avoid mirror flips!'
  },
  {
    key: 'auditory',
    name: 'Auditory Safari',
    subtitle: 'Acoustic Sound Shield',
    emoji: '🎧',
    targetCount: 4,
    Component: RhythmRail,
    color: '#c084fc',
    badgeColor: '#f3e8ff',
    badgeTextColor: '#6b21a8',
    voiceLabel: 'Lexi the Owl (Playful & Warm)',
    missionTitle: 'Minimal-Pair Acoustic Trials',
    missionPrompt: 'Listen carefully to the initial sound and hit the matching note!',
    targetPhoneme: 'Target: Initial Sound Discrimination',
    hintText: 'Use your headphones for crisp sound!',
    tip: 'Tap the correct sound as notes cross the strike bar!',
    speechInstruction: 'Listen to the sound and hit the matching rhythm note!'
  },
  {
    key: 'morphology',
    name: 'Morpheme Forest',
    subtitle: 'Morph-Bot Assembly Workshop',
    emoji: '🐍',
    targetCount: 2,
    Component: MorphoSnake,
    color: '#f472b6',
    badgeColor: '#fce7f3',
    badgeTextColor: '#be185d',
    voiceLabel: 'Lexi the Owl (Playful & Warm)',
    missionTitle: 'Morpheme Assembly',
    missionPrompt: 'Guide the snake to collect morphemes in sequential order!',
    targetPhoneme: 'Prefix + Root + Suffix',
    hintText: 'Eat Prefix blue, Root yellow, Suffix pink!',
    tip: 'Guide the snake to eat morphemes in the right order!',
    speechInstruction: 'Guide the snake to eat prefix, root, and suffix!'
  }
];

// ── INTERSTITIAL TRANSITION COMPONENT ──
const InterstitialScreen = ({ completedStage, nextStage, countdown }) => (
  <div className="ubr-interstitial">
    <div className="ubr-interstitial-card">
      <div className="ubr-pulse-ring">
        <div className="ubr-pulse-inner">
          <span className="ubr-pulse-emoji">{completedStage.emoji}</span>
        </div>
      </div>

      <h2 className="ubr-interstitial-title">Stage Completed! 🎉</h2>
      <p className="ubr-interstitial-subtitle">
        <span style={{ color: '#d97706' }}>{completedStage.name}</span> — Completed!
      </p>

      {nextStage && (
        <div className="ubr-next-preview">
          <div className="ubr-next-badge">
            <span style={{ fontSize: '1.5rem' }}>{nextStage.emoji}</span>
          </div>
          <div>
            <p className="ubr-next-label">Up Next</p>
            <h3 className="ubr-next-name">{nextStage.name}</h3>
            <p className="ubr-next-tip">{nextStage.tip}</p>
          </div>
        </div>
      )}

      <div className="ubr-countdown-ring">
        <span>{Math.ceil(countdown / 1000)}s</span>
      </div>
    </div>
  </div>
);

// ── EXIT CONFIRMATION MODAL ──
const ExitModal = ({ onConfirm, onCancel }) => (
  <div className="ubr-exit-overlay">
    <div className="ubr-exit-card">
      <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🌴</div>
      <h3 className="ubr-exit-title">Leave Island Safari?</h3>
      <p className="ubr-exit-desc">
        Your current safari progress will be saved. Are you sure you want to return to Mission HQ?
      </p>
      <div className="ubr-exit-btns">
        <button className="ubr-exit-cancel" onClick={onCancel}>Continue Safari</button>
        <button className="ubr-exit-confirm" onClick={onConfirm}>Leave Safari</button>
      </div>
    </div>
  </div>
);

// ── ISLAND MAP MODAL ──
const IslandMapModal = ({ stages, currentIndex, onSelectStage, onClose }) => (
  <div className="ubr-exit-overlay">
    <div className="ubr-map-card">
      <div className="ubr-map-header">
        <div>
          <span className="ubr-safari-badge">🗺️ PHONICS ISLAND MAP</span>
          <h2 style={{ margin: '0.2rem 0 0 0', fontSize: '1.1rem', fontWeight: 800, color: '#4a2e1b' }}>
            5 Safari Exploration Stages
          </h2>
        </div>
        <button className="ubr-map-close-btn" onClick={onClose}>✕</button>
      </div>

      <div className="ubr-map-stages-grid">
        {stages.map((stg, i) => {
          const isDone = i < currentIndex;
          const isCurrent = i === currentIndex;
          return (
            <div
              key={stg.key}
              className={`ubr-map-stage-item ${isDone ? 'done' : ''} ${isCurrent ? 'current' : ''}`}
              onClick={() => { onSelectStage(i); onClose(); }}
            >
              <div className="ubr-map-stage-icon">
                {stg.emoji}
              </div>
              <div style={{ flex: 1 }}>
                <span className="ubr-map-stage-num">STAGE {i + 1}</span>
                <h4 style={{ margin: '2px 0 0 0', fontSize: '0.9rem', fontWeight: 800, color: '#4a2e1b' }}>
                  {stg.name}
                </h4>
                <p style={{ margin: '2px 0 0 0', fontSize: '0.72rem', color: '#7c5c43', fontWeight: 500 }}>
                  {stg.subtitle}
                </p>
              </div>
              <div className="ubr-map-status-pill">
                {isDone ? '✅ Done' : isCurrent ? '🌟 Active' : '🔒 Locked'}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  </div>
);

// ── MAIN ORCHESTRATOR ──
export default function UnifiedBatteryRunner() {
  const navigate = useNavigate();
  const [currentStageIndex, setCurrentStageIndex] = useState(0);
  const [selectedAuditoryGame, setSelectedAuditoryGame] = useState('rhythm'); // rhythm | shield | cannon
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [transitionCountdown, setTransitionCountdown] = useState(2500);
  const [showExitModal, setShowExitModal] = useState(false);
  const [showIslandMap, setShowIslandMap] = useState(false);
  const [showHintDrawer, setShowHintDrawer] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [batteryStartTime] = useState(Date.now());
  const [micReady] = useState(true);
  const [sparklesScore] = useState(120);

  const [batteryResults, setBatteryResults] = useState({
    phoneme: null,
    ran: null,
    visual: null,
    auditory: null,
    morphology: null
  });

  const transitionTimerRef = useRef(null);
  const countdownIntervalRef = useRef(null);

  useEffect(() => {
    return () => {
      if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, []);

  // Speak initial stage prompt when entering a new stage
  useEffect(() => {
    const stage = STAGES[currentStageIndex];
    if (stage && stage.speechInstruction && !isTransitioning && !showReport) {
      const timer = setTimeout(() => {
        speakHumanText(stage.speechInstruction);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [currentStageIndex, isTransitioning, showReport]);

  const handleStageComplete = useCallback((metrics) => {
    const stage = STAGES[currentStageIndex];

    setBatteryResults(prev => ({
      ...prev,
      [stage.key]: {
        accuracy: metrics.accuracy ?? 100,
        latencyMs: metrics.latencyMs ?? 0,
        errorCount: metrics.errorCount ?? 0,
        errorTypes: metrics.errorTypes ?? [],
        score: metrics.score ?? 0,
        timestamp: Date.now()
      }
    }));

    if (currentStageIndex >= STAGES.length - 1) {
      setTimeout(() => setShowReport(true), 800);
      return;
    }

    setIsTransitioning(true);
    setTransitionCountdown(2500);

    const startTime = Date.now();
    countdownIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 2500 - elapsed);
      setTransitionCountdown(remaining);
      if (remaining <= 0) {
        clearInterval(countdownIntervalRef.current);
      }
    }, 50);

    transitionTimerRef.current = setTimeout(() => {
      setIsTransitioning(false);
      setCurrentStageIndex(prev => prev + 1);
      clearInterval(countdownIntervalRef.current);
    }, 2500);
  }, [currentStageIndex]);

  const handleModuleComplete = useCallback(() => {
    handleStageComplete({
      accuracy: 100,
      latencyMs: 0,
      errorCount: 0,
      errorTypes: [],
      score: 0
    });
  }, [handleStageComplete]);

  const handleExit = () => {
    navigate('/dashboard');
  };

  const handleReplayPrompt = () => {
    const stage = STAGES[currentStageIndex];
    if (stage) {
      speakHumanText(`${stage.missionPrompt} ${stage.hintText}`);
    }
  };

  if (showReport) {
    return (
      <UnifiedDiagnosticReport
        results={batteryResults}
        totalDurationMs={Date.now() - batteryStartTime}
      />
    );
  }

  const currentStage = STAGES[currentStageIndex];
  let ActiveComponent = currentStage.Component;
  if (currentStage.key === 'auditory') {
    if (selectedAuditoryGame === 'shield') ActiveComponent = AuditorySoundShield;
    else if (selectedAuditoryGame === 'cannon') ActiveComponent = SoundBlastCannon;
    else ActiveComponent = RhythmRail;
  }

  return (
    <div className="ubr-safari-page">
      {/* ── 0. GLOBAL NAVIGATION BAR ── */}
      <Navbar showDropdown={showDropdown} setShowDropdown={setShowDropdown} />

      <div className="ubr-safari-wrapper">
        {/* ── 1. UNIFIED ULTRA-SLEEK TOP SAFARI HEADER ── */}
        <header className="ubr-safari-header">
          <div className="ubr-header-left">
            <span className="ubr-leaf-badge">
              STAGE {currentStageIndex + 1}/{STAGES.length}
            </span>
            <h2 className="ubr-safari-main-title">
              {currentStage.name}
            </h2>
          </div>

          {/* 5 Stage Navigation Tabs */}
          <nav className="ubr-safari-tabs">
            {STAGES.map((stage, idx) => {
              const isCompleted = idx < currentStageIndex;
              const isActive = idx === currentStageIndex;
              return (
                <button
                  key={stage.key}
                  className={`ubr-tab-chip ${isCompleted ? 'completed' : ''} ${isActive ? 'active' : ''}`}
                  onClick={() => {
                    if (idx <= currentStageIndex) {
                      setCurrentStageIndex(idx);
                    }
                  }}
                  title={stage.subtitle}
                >
                  <span className="ubr-tab-icon">{stage.emoji}</span>
                  <span className="ubr-tab-text">{idx + 1}. {stage.name}</span>
                  {isCompleted && <span className="ubr-tab-check">✓</span>}
                </button>
              );
            })}
          </nav>

          {/* AUDITORY GAME SELECTOR CHIPS */}
          {currentStage.key === 'auditory' && (
            <div className="ubr-auditory-switcher">
              <button
                className={`ubr-mode-chip ${selectedAuditoryGame === 'rhythm' ? 'active' : ''}`}
                onClick={() => setSelectedAuditoryGame('rhythm')}
                title="Rhythm Rail — Minimal Pair Track"
              >
                🎧 Rhythm Rail
              </button>
              <button
                className={`ubr-mode-chip ${selectedAuditoryGame === 'shield' ? 'active' : ''}`}
                onClick={() => setSelectedAuditoryGame('shield')}
                title="Sound Shield — Initial Phoneme Target"
              >
                🛡️ Sound Shield
              </button>
              <button
                className={`ubr-mode-chip ${selectedAuditoryGame === 'cannon' ? 'active' : ''}`}
                onClick={() => setSelectedAuditoryGame('cannon')}
                title="AI Sound Cannon — Voice-Activated Cannon"
              >
                🚀 AI Cannon
              </button>
            </div>
          )}

          {/* Quick Header Actions & Status */}
          <div className="ubr-header-right">
            <div className="ubr-mini-stat" title="Current Apples">
              <span>🍎</span>
              <strong>3/3</strong>
            </div>
            <div className="ubr-mini-stat" title="Sparkles Score">
              <span>⭐</span>
              <strong>{sparklesScore}</strong>
            </div>
            <div className={`ubr-mini-stat mic ${micReady ? 'ready' : ''}`} title="Microphone Status">
              <span>🎙️</span>
              <strong>{micReady ? 'Ready' : 'Off'}</strong>
            </div>
            <button className="ubr-map-btn" onClick={() => setShowIslandMap(true)}>
              🗺️ Map
            </button>
            <button className="ubr-leave-btn" onClick={() => setShowExitModal(true)}>
              Leave Safari
            </button>
          </div>
        </header>

        {/* ── 4. GAME VIEWPORT FRAME (WOODEN FRAME) ── */}
        <main className="ubr-game-frame">
          <div className="ubr-game-viewport-container">
            {isTransitioning ? (
              <InterstitialScreen
                completedStage={STAGES[currentStageIndex]}
                nextStage={STAGES[currentStageIndex + 1]}
                countdown={transitionCountdown}
              />
            ) : (
              <ActiveComponent
                key={`stage-${currentStageIndex}`}
                assessmentMode={true}
                targetCount={currentStage.targetCount}
                onAutoFinish={handleStageComplete}
                onComplete={handleModuleComplete}
                stageIndex={currentStageIndex}
                totalStages={STAGES.length}
                stageName={currentStage.name}
                onExit={() => setShowExitModal(true)}
              />
            )}
          </div>
        </main>

        {/* ── 5. ACTION CONTROLS & FOOTER BAR ── */}
        <footer className="ubr-safari-footer">
          <div className="ubr-footer-hint-left">
            <span className="ubr-foot-mic-icon">📢</span>
            <div>
              <strong>Speak or Tap to Play!</strong>
              <small>Say "BAT" into your microphone or tap the block above!</small>
            </div>
          </div>

          <div className="ubr-footer-buttons">
            <button className="ubr-action-btn listen" onClick={handleReplayPrompt}>
              🔊 Listen Again (L)
            </button>
            <button className="ubr-action-btn mic" onClick={handleReplayPrompt}>
              🎙️ Speak Word (Mic)
            </button>
            <button className="ubr-action-btn action" onClick={handleReplayPrompt}>
              🚀 Jump! (Spacebar)
            </button>
          </div>

          <button className="ubr-ask-lexi-floating" onClick={() => setShowHintDrawer(!showHintDrawer)}>
            <div className="ubr-ask-lexi-avatar">🦉</div>
            <div style={{ textAlign: 'left' }}>
              <strong style={{ fontSize: '0.72rem', display: 'block', color: '#4a2e1b' }}>Ask Lexi Owl</strong>
              <small style={{ fontSize: '0.6rem', color: '#7c5c43' }}>"Need a hint?" 💡</small>
            </div>
            <span className="ubr-ask-badge">?</span>
          </button>
        </footer>

        {/* ── 6. FLOATING LEXI HINT DRAWER POPOVER ── */}
        {showHintDrawer && (
          <div className="ubr-lexi-drawer-popover">
            <div className="ubr-lexi-drawer-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1.2rem' }}>🦉</span>
                <strong style={{ color: '#4a2e1b', fontSize: '0.88rem' }}>Lexi's Hint</strong>
              </div>
              <button style={{ background: '#f5ebe0', border: '1px solid #ebd5b3', width: '24px', height: '24px', borderRadius: '50%', fontSize: '0.8rem', cursor: 'pointer', color: '#7c5c43', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setShowHintDrawer(false)}>✕</button>
            </div>
            <p style={{ margin: '0.4rem 0', fontSize: '0.82rem', color: '#7c5c43', lineHeight: '1.5', fontWeight: 500 }}>
              "{currentStage.tip}"
            </p>
            <button
              style={{ background: 'linear-gradient(135deg, #fbc02d, #f57f17)', color: '#4a2e1b', border: 'none', borderRadius: '50px', padding: '4px 12px', fontSize: '0.72rem', fontWeight: 800, cursor: 'pointer', marginTop: '4px', boxShadow: '0 2px 8px rgba(245,127,23,0.3)' }}
              onClick={() => { speakHumanText(currentStage.tip); }}
            >
              🔊 Read Hint Aloud
            </button>
          </div>
        )}

        {/* Modals */}
        {showExitModal && (
          <ExitModal
            onConfirm={handleExit}
            onCancel={() => setShowExitModal(false)}
          />
        )}

        {showIslandMap && (
          <IslandMapModal
            stages={STAGES}
            currentIndex={currentStageIndex}
            onSelectStage={(idx) => setCurrentStageIndex(idx)}
            onClose={() => setShowIslandMap(false)}
          />
        )}
      </div>
    </div>
  );
}
