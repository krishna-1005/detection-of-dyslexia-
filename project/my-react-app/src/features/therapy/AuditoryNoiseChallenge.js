import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '../auth/AuthContext';
import { saveTherapyProgress } from './ExerciseSystem';
import './AuditoryNoiseChallenge.css';

const auditoryTasksPool = [
  { target: 'B', options: ['Ball', 'Dog', 'Cat', 'Fish'], correct: 'Ball', example: 'Say "/b/ as in Ball"' },
  { target: 'S', options: ['Sun', 'Moon', 'Star', 'Cloud'], correct: 'Sun', example: 'Say "/s/ as in Sun"' },
  { target: 'M', options: ['Apple', 'Milk', 'Bread', 'Egg'], correct: 'Milk', example: 'Say "/m/ as in Milk"' },
  { target: 'P', options: ['Pencil', 'Table', 'Book', 'Chair'], correct: 'Pencil', example: 'Say "/p/ as in Pencil"' },
  { target: 'T', options: ['Tiger', 'Lion', 'Bear', 'Monkey'], correct: 'Tiger', example: 'Say "/t/ as in Tiger"' },
  { target: 'D', options: ['Drum', 'Guitar', 'Piano', 'Flute'], correct: 'Drum', example: 'Say "/d/ as in Drum"' },
  { target: 'F', options: ['Feather', 'Rock', 'Stone', 'Wood'], correct: 'Feather', example: 'Say "/f/ as in Feather"' },
  { target: 'V', options: ['Violin', 'Harp', 'Organ', 'Trumpet'], correct: 'Violin', example: 'Say "/v/ as in Violin"' },
  { target: 'K', options: ['Kite', 'Plane', 'Train', 'Car'], correct: 'Kite', example: 'Say "/k/ as in Kite"' },
  { target: 'G', options: ['Garden', 'Forest', 'Desert', 'River'], correct: 'Garden', example: 'Say "/g/ as in Garden"' }
];

const SNR_TIERS = {
  easy: { label: 'Easy (-20dB)', noiseGain: 0.05, desc: 'Soft ambient hum' },
  medium: { label: 'Medium (-10dB)', noiseGain: 0.15, desc: 'Moderate background static' },
  hard: { label: 'Hard (-3dB)', noiseGain: 0.35, desc: 'Heavy background noise' }
};

const shuffleArray = (arr) => {
  const n = [...arr];
  for (let i = n.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [n[i], n[j]] = [n[j], n[i]];
  }
  return n;
};

const AuditoryNoiseChallenge = ({ onComplete }) => {
  const { currentUser } = useAuth();

  const [tasks] = useState(() => shuffleArray(auditoryTasksPool).slice(0, 4));
  const [currentIdx, setCurrentIdx] = useState(0);
  const [snrTier, setSnrTier] = useState('medium');
  const [noiseType, setNoiseType] = useState('white'); // white | pink | babble
  const [score, setScore] = useState(0);
  const [selectedWord, setSelectedWord] = useState(null);
  const [isFinished, setIsFinished] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  // Voice Answering State
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);

  const audioCtxRef = useRef(null);
  const noiseSourceRef = useRef(null);
  const noiseGainRef = useRef(null);

  const currentTask = tasks[currentIdx];

  // Initialize Web Audio Context for noise generation
  const initAudioCtx = useCallback(() => {
    if (!audioCtxRef.current) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      audioCtxRef.current = new AudioCtx();
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  }, []);

  // Generate Noise Buffer (White or Pink noise)
  const createNoiseBuffer = useCallback((ctx, type, durationSec = 2) => {
    const bufferSize = ctx.sampleRate * durationSec;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    if (type === 'white') {
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
    } else if (type === 'pink') {
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        data[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
        data[i] *= 0.11; // scale down pink noise
        b6 = white * 0.115926;
      }
    } else {
      // Babble noise simulation: random clicks/pulses
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() > 0.95 ? (Math.random() * 2 - 1) : 0) * 0.8;
      }
    }
    return buffer;
  }, []);

  // Play word with background noise modulation
  const playTargetWithNoise = useCallback((textToSpeak) => {
    const ctx = initAudioCtx();
    if (!ctx) return;

    setIsPlayingAudio(true);

    // Stop existing noise if playing
    if (noiseSourceRef.current) {
      try { noiseSourceRef.current.stop(); } catch (e) {}
    }

    const noiseGain = ctx.createGain();
    noiseGainRef.current = noiseGain;
    const gainVal = SNR_TIERS[snrTier].noiseGain;
    noiseGain.gain.setValueAtTime(gainVal, ctx.currentTime);

    // Create noise source
    const noiseBuffer = createNoiseBuffer(ctx, noiseType, 2.5);
    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;
    noiseSource.connect(noiseGain);
    noiseGain.connect(ctx.destination);

    noiseSourceRef.current = noiseSource;
    noiseSource.start();

    // Fade out noise after 2.2 seconds
    noiseGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 2.2);
    setTimeout(() => {
      setIsPlayingAudio(false);
    }, 2200);

    // Speak target word via Web Speech Synthesis
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const ut = new SpeechSynthesisUtterance(textToSpeak);
      ut.rate = 0.85;
      ut.pitch = 1.0;
      window.speechSynthesis.speak(ut);
    }
  }, [initAudioCtx, createNoiseBuffer, snrTier, noiseType]);

  const handleChoice = useCallback(async (word) => {
    if (selectedWord) return;
    const isCorrect = word === currentTask.correct;
    setSelectedWord({ word, isCorrect });

    setTimeout(async () => {
      setSelectedWord(null);
      const nextScore = isCorrect ? score + 1 : score;
      if (isCorrect) setScore(nextScore);

      if (currentIdx < tasks.length - 1) {
        setCurrentIdx(currentIdx + 1);
      } else {
        setIsFinished(true);
        const accuracy = Math.round((nextScore / tasks.length) * 100);
        await saveTherapyProgress(currentUser, 'auditory', nextScore * 100, accuracy, `${snrTier.toUpperCase()} SNR`);
      }
    }, 1200);
  }, [currentIdx, currentTask.correct, currentUser, score, selectedWord, snrTier, tasks.length]);

  // ── Voice Answering Logic ──
  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const startListening = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition not supported in this browser.");
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = false;
      recognition.lang = 'en-US';
      recognitionRef.current = recognition;

      recognition.onresult = (event) => {
        const lastResultIndex = event.results.length - 1;
        const transcript = event.results[lastResultIndex][0].transcript.trim().toLowerCase();
        
        // Check if spoken word matches any option
        const matchedWord = currentTask.options.find(opt => opt.toLowerCase() === transcript.replace(/[^a-z]/gi, ''));
        if (matchedWord && !selectedWord) {
          handleChoice(matchedWord);
        }
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        if (isListening) {
          try { recognition.start(); } catch (e) {} // Restart if intentionally listening
        }
      };

      recognition.start();
      setIsListening(true);
    } catch (err) {
      console.warn("Speech Recog Start Failed:", err);
      setIsListening(false);
    }
  }, [currentTask.options, handleChoice, selectedWord, isListening]);

  const stopListening = useCallback(() => {
    setIsListening(false);
    if (recognitionRef.current) {
      recognitionRef.current.onend = null;
      try { recognitionRef.current.stop(); } catch (e) {}
      recognitionRef.current = null;
    }
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      stopListening();
      if (noiseSourceRef.current) {
        try { noiseSourceRef.current.stop(); } catch (e) {}
      }
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        try { audioCtxRef.current.close(); } catch (e) {}
      }
    };
  }, [stopListening]);

  const resetSession = () => {
    setCurrentIdx(0);
    setScore(0);
    setIsFinished(false);
    setSelectedWord(null);
  };

  return (
    <div className="anc-container">
      <div>
        <h3 className="anc-title">🎧 Acoustic Shield</h3>
        <p className="anc-desc">
          Test phoneme discrimination under background noise. Listen carefully and select or <strong>speak</strong> the word that begins with the target sound.
        </p>
      </div>

      {/* SNR Tier & Noise Type Selectors */}
      <div className="anc-controls-panel">
        <div className="anc-control-group">
          <label className="anc-control-label">Signal-to-Noise Ratio (SNR) Tier</label>
          <div className="anc-btn-group">
            {Object.keys(SNR_TIERS).map(tierKey => (
              <button
                key={tierKey}
                onClick={() => setSnrTier(tierKey)}
                className={`anc-btn-toggle ${snrTier === tierKey ? 'active' : ''}`}
              >
                {SNR_TIERS[tierKey].label.split(' ')[0]}
              </button>
            ))}
          </div>
        </div>

        <div className="anc-control-group">
          <label className="anc-control-label">Noise Signal Profile</label>
          <div className="anc-btn-group">
            {['white', 'pink', 'babble'].map(type => (
              <button
                key={type}
                onClick={() => setNoiseType(type)}
                className={`anc-btn-toggle ${noiseType === type ? 'active' : ''}`}
                style={{ textTransform: 'capitalize' }}
              >
                {type}
              </button>
            ))}
          </div>
        </div>
      </div>

      {!isFinished ? (
        <>
          {/* Audio Hero Play Area */}
          <div className="anc-hero-area">
            <h1 className="anc-target-word">"{currentTask.target}"</h1>
            
            <button
              className={`anc-btn-play ${isPlayingAudio ? 'playing' : ''}`}
              onClick={() => playTargetWithNoise(currentTask.target)}
            >
              {isPlayingAudio ? '🔊 Playing Sound + Ambient Noise...' : `🔊 Play Sound "${currentTask.target}"`}
            </button>
            
            <button 
              onClick={toggleListening} 
              className={`anc-mic-status ${isListening ? 'listening' : ''}`}
              style={{ cursor: 'pointer', border: 'none', fontFamily: 'inherit' }}
            >
              {isListening ? '🎙️ Listening for answer...' : '🎤 Click to answer with voice'}
            </button>
          </div>

          {/* Options Grid */}
          <div className="anc-match-grid">
            {currentTask.options.map(word => {
              const isSelected = selectedWord?.word === word;
              const isCorrectTile = isSelected && selectedWord.isCorrect;
              const isIncorrectTile = isSelected && !selectedWord.isCorrect;

              let tileClass = 'anc-match-tile';
              if (isCorrectTile) tileClass += ' correct';
              if (isIncorrectTile) tileClass += ' incorrect';

              return (
                <div
                  key={word}
                  className={tileClass}
                  onClick={() => handleChoice(word)}
                >
                  <button
                    className="anc-tile-audio-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      playTargetWithNoise(word);
                    }}
                    title="Listen to word with noise"
                  >
                    🔊
                  </button>
                  <span>{word}</span>
                  {isCorrectTile && <span>✅</span>}
                  {isIncorrectTile && <span>❌</span>}
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <div className="anc-completion-card">
          <div className="anc-completion-icon">🛡️</div>
          <h4 className="anc-title" style={{ marginBottom: '0.5rem' }}>
            Acoustic Shield Module Complete!
          </h4>
          <p className="anc-desc" style={{ marginBottom: '2rem' }}>
            You correctly identified {score} out of {tasks.length} initial sound targets under <strong>{snrTier.toUpperCase()} SNR</strong> ({noiseType} noise).
          </p>
          <div className="anc-completion-actions">
            <button className="anc-btn-secondary" onClick={resetSession}>🔄 Try Another Difficulty</button>
            <button className="anc-btn-play" onClick={onComplete}>Complete & View Dashboard →</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuditoryNoiseChallenge;
