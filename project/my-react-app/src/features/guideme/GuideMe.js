import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import './GuideMe.css';

// Web Audio API helper for friendly UI sound effects
const playSoundEffect = (type = 'chime') => {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;

    if (type === 'chime') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.15); // A5
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      osc.start(now);
      osc.stop(now + 0.3);
    } else if (type === 'pop') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(300, now);
      osc.frequency.exponentialRampToValueAtTime(600, now + 0.08);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      osc.start(now);
      osc.stop(now + 0.12);
    } else if (type === 'fanfare') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.setValueAtTime(554.37, now + 0.1);
      osc.frequency.setValueAtTime(659.25, now + 0.2);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
      osc.start(now);
      osc.stop(now + 0.4);
    }
  } catch (e) {
    console.log('Audio playback unavailable', e);
  }
};

// Animated SVG Characters
const MascotAvatar = ({ characterId, isSpeaking, isHappy }) => {
  switch (characterId) {
    case 'pup': // Byte the Cyber-Pup
      return (
        <svg className={`mascot-svg ${isSpeaking ? 'speaking' : ''} ${isHappy ? 'happy-bounce' : ''}`} viewBox="0 0 100 100">
          <defs>
            <linearGradient id="pupGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#1d4ed8" />
            </linearGradient>
            <linearGradient id="visorGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#06b6d4" />
              <stop offset="100%" stopColor="#0891b2" />
            </linearGradient>
          </defs>
          {/* Cyber Antenna */}
          <line x1="50" y1="20" x2="50" y2="30" stroke="#60a5fa" strokeWidth="4" strokeLinecap="round" />
          <circle className="antenna-light" cx="50" cy="18" r="5" fill="#38bdf8" />
          
          {/* Head */}
          <rect x="25" y="30" width="50" height="46" rx="20" fill="url(#pupGrad)" />
          {/* Floppy Ears */}
          <path className="ear-left" d="M22 38 C 10 40, 10 65, 24 55 Z" fill="#1e40af" />
          <path className="ear-right" d="M78 38 C 90 40, 90 65, 76 55 Z" fill="#1e40af" />

          {/* Cyber Visor / Eyes */}
          <rect x="33" y="42" width="34" height="18" rx="8" fill="url(#visorGrad)" />
          <circle cx="43" cy="51" r="3.5" fill="#ffffff" />
          <circle cx="57" cy="51" r="3.5" fill="#ffffff" />

          {/* Nose & Mouth */}
          <ellipse cx="50" cy="64" rx="4" ry="3" fill="#1e293b" />
          <path className={`mascot-mouth ${isSpeaking ? 'talking' : ''}`} d={isSpeaking ? "M 44 68 Q 50 76 56 68 Z" : "M 45 68 Q 50 72 55 68"} fill={isSpeaking ? "#ef4444" : "none"} stroke="#1e293b" strokeWidth="2" />
        </svg>
      );

    case 'dragon': // Sparky the Fire Dragon
      return (
        <svg className={`mascot-svg ${isSpeaking ? 'speaking' : ''} ${isHappy ? 'happy-bounce' : ''}`} viewBox="0 0 100 100">
          <defs>
            <linearGradient id="dragonGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#047857" />
            </linearGradient>
          </defs>
          {/* Tiny Wings */}
          <path className="wing-left" d="M 25 45 C 5 35, 10 60, 26 58 Z" fill="#f59e0b" />
          <path className="wing-right" d="M 75 45 C 95 35, 90 60, 74 58 Z" fill="#f59e0b" />

          {/* Dragon Horns */}
          <polygon points="36,22 42,32 32,32" fill="#f59e0b" />
          <polygon points="64,22 68,32 58,32" fill="#f59e0b" />

          {/* Body Head */}
          <circle cx="50" cy="52" r="26" fill="url(#dragonGrad)" />

          {/* Cute Snout */}
          <ellipse cx="50" cy="60" rx="14" ry="10" fill="#a7f3d0" />
          <circle cx="45" cy="58" r="1.5" fill="#047857" />
          <circle cx="55" cy="58" r="1.5" fill="#047857" />

          {/* Big Sparkle Eyes */}
          <circle cx="39" cy="45" r="5" fill="#1e293b" />
          <circle cx="61" cy="45" r="5" fill="#1e293b" />
          <circle cx="41" cy="43" r="2" fill="#ffffff" />
          <circle cx="63" cy="43" r="2" fill="#ffffff" />

          {/* Mouth */}
          <path className={`mascot-mouth ${isSpeaking ? 'talking' : ''}`} d={isSpeaking ? "M 43 64 Q 50 74 57 64 Z" : "M 44 63 Q 50 67 56 63"} fill={isSpeaking ? "#f43f5e" : "none"} stroke="#047857" strokeWidth="2.5" />
        </svg>
      );

    case 'star': // Nova the Star Scout
      return (
        <svg className={`mascot-svg ${isSpeaking ? 'speaking' : ''} ${isHappy ? 'happy-bounce' : ''}`} viewBox="0 0 100 100">
          <defs>
            <linearGradient id="starGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#d97706" />
            </linearGradient>
          </defs>
          {/* Star Body */}
          <polygon points="50,15 61,38 86,38 66,54 73,78 50,63 27,78 34,54 14,38 39,38" fill="url(#starGrad)" stroke="#b45309" strokeWidth="2" />
          
          {/* Wand / Orbit Ring */}
          <ellipse cx="50" cy="52" rx="36" ry="12" fill="none" stroke="#67e8f9" strokeWidth="2.5" strokeDasharray="6 3" />

          {/* Eyes */}
          <circle cx="42" cy="46" r="4" fill="#1e293b" />
          <circle cx="58" cy="46" r="4" fill="#1e293b" />
          <circle cx="43.5" cy="44.5" r="1.5" fill="#ffffff" />
          <circle cx="59.5" cy="44.5" r="1.5" fill="#ffffff" />

          {/* Cheeks */}
          <circle cx="36" cy="52" r="3" fill="#f43f5e" opacity="0.6" />
          <circle cx="64" cy="52" r="3" fill="#f43f5e" opacity="0.6" />

          {/* Mouth */}
          <path className={`mascot-mouth ${isSpeaking ? 'talking' : ''}`} d={isSpeaking ? "M 45 54 Q 50 63 55 54 Z" : "M 46 54 Q 50 58 54 54"} fill={isSpeaking ? "#ef4444" : "none"} stroke="#1e293b" strokeWidth="2" />
        </svg>
      );

    case 'owl': // Lexi the Owl (Default)
    default:
      return (
        <svg className={`mascot-svg ${isSpeaking ? 'speaking' : ''} ${isHappy ? 'happy-bounce' : ''}`} viewBox="0 0 100 100">
          <defs>
            <linearGradient id="owlGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#0d9488" />
              <stop offset="100%" stopColor="#0f766e" />
            </linearGradient>
            <linearGradient id="bellyGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ccfbf1" />
              <stop offset="100%" stopColor="#99f6e4" />
            </linearGradient>
          </defs>
          {/* Graduation Cap */}
          <polygon points="50,14 78,24 50,34 22,24" fill="#1e293b" />
          <rect x="42" y="27" width="16" height="7" fill="#1e293b" />
          <path d="M 72 25 L 75 42" stroke="#f59e0b" strokeWidth="2.5" />
          <circle cx="75" cy="43" r="3" fill="#f59e0b" />

          {/* Wings */}
          <path className="wing-left" d="M 20 45 C 8 50, 12 75, 25 70 Z" fill="#0f766e" />
          <path className="wing-right" d="M 80 45 C 92 50, 88 75, 75 70 Z" fill="#0f766e" />

          {/* Main Body */}
          <ellipse cx="50" cy="56" rx="28" ry="30" fill="url(#owlGrad)" />
          {/* Belly */}
          <ellipse cx="50" cy="62" rx="18" ry="18" fill="url(#bellyGrad)" />

          {/* Big Wise Eyes */}
          <circle cx="38" cy="48" r="9" fill="#ffffff" stroke="#0f766e" strokeWidth="2" />
          <circle cx="62" cy="48" r="9" fill="#ffffff" stroke="#0f766e" strokeWidth="2" />
          <circle cx="39" cy="48" r="4.5" fill="#1e293b" />
          <circle cx="61" cy="48" r="4.5" fill="#1e293b" />
          <circle cx="41" cy="46" r="1.5" fill="#ffffff" />
          <circle cx="63" cy="46" r="1.5" fill="#ffffff" />

          {/* Beak */}
          <polygon points="50,53 54,60 46,60" fill="#f59e0b" />

          {/* Mouth / Talking indicator */}
          {isSpeaking && (
            <ellipse cx="50" cy="62" rx="3" ry="4" fill="#ef4444" />
          )}
        </svg>
      );
  }
};

const CHARACTER_LIST = [
  { id: 'owl', name: 'Lexi the Owl', title: 'Wise Companion', icon: '🦉', color: '#0d9488' },
  { id: 'pup', name: 'Byte the Cyber-Pup', title: 'AI Detective', icon: '🐶', color: '#3b82f6' },
  { id: 'dragon', name: 'Sparky the Dragon', title: 'Motivation Coach', icon: '🐉', color: '#10b981' },
  { id: 'star', name: 'Nova the Star Scout', title: 'Reading Navigator', icon: '🌟', color: '#f59e0b' }
];

const GuideMe = () => {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isHappy, setIsHappy] = useState(false);
  const [showSelector, setShowSelector] = useState(false);

  // Active Mascot state saved in localStorage
  const [selectedCharacter, setSelectedCharacter] = useState(() => {
    return localStorage.getItem('lexiflow_mascot_character') || 'owl';
  });

  const activeMascotObj = CHARACTER_LIST.find(c => c.id === selectedCharacter) || CHARACTER_LIST[0];

  // Comprehensive section guides map for all routes
  const guides = {
    '/': [
      { title: '✨ Welcome to LexiFlow', content: 'Explore our AI-powered dyslexia detection, multi-sensory therapy arcade, and bionic reading assistance platform.' },
      { title: '🎯 Step 1: AI Dyslexia Detection', content: 'Navigate to "Detect Dyslexia" to analyze reading speed, phonemic errors, and saccadic eye movements.' },
      { title: '📚 Step 2: Try Smart Reader', content: 'Open the Smart Reader to convert any text into OpenDyslexic font, bionic reading mode, and tinted overlays.' },
      { title: '🎮 Step 3: Kids Therapy Arcade', content: 'Play 6 fun mini-games designed to treat phonological, spatial, and surface dyslexia types.' }
    ],
    '/detect': [
      { title: '📝 Step 1: Input Text or Upload Sample', content: 'Type or paste a paragraph, or upload a photo of handwritten notes for instant AI diagnosis.' },
      { title: '👁️ Step 2: Enable Eye & Voice Tracking', content: 'Turn on camera/microphone permissions to track eye fixation pauses and voice phoneme lag.' },
      { title: '🤖 Step 3: Run AI Diagnostic', content: 'Click "Analyze Reading" to let our machine learning models calculate your risk profile.' },
      { title: '📊 Step 4: Review Risk Breakdown', content: 'Inspect percentage scores for phonological, spatial reversal, and rapid naming markers.' }
    ],
    '/dashboard': [
      { title: '📈 Step 1: Clinical Risk Trends', content: 'Monitor your diagnostic risk category (Low, Moderate, High) and progress over practice sessions.' },
      { title: '🎯 Step 2: Custom Recommended Drills', content: 'Select target therapy shortcuts generated specifically for your identified reading challenges.' },
      { title: '🏆 Step 3: Daily Streaks & XP', content: 'Earn XP coins as you complete daily exercises to unlock cute outfits for your mascot companion!' },
      { title: '📄 Step 4: Export Clinical Summary', content: 'Download a full PDF diagnostic report to share with educators, parents, or speech therapists.' }
    ],
    '/reader': [
      { title: '📄 Step 1: Load Reading Canvas', content: 'Paste any text, article, or homework assignment directly into the Smart Reader canvas.' },
      { title: '🔤 Step 2: Font & Tint Overlay', content: 'Toggle OpenDyslexic font, adjust letter spacing, and choose tinted filters (yellow, blue, green).' },
      { title: '⚡ Step 3: Bionic & Syllable Mode', content: 'Bold initial word letters and split long words into color-coded syllables to prevent visual crowding.' },
      { title: '🔊 Step 4: Audio Synchronized TTS', content: 'Click play to hear natural text-to-speech audio with synchronized line and word highlights.' }
    ],
    '/therapy/kids': [
      { title: '🎮 DysTherapy Arcade Overview', content: 'Welcome to the therapy zone! Choose a game zone to train specific dyslexia neural pathways.' },
      { title: '👾 Zone 1: Phoneme Monster', content: 'Zap target phoneme sounds (SH, CH, TH, WH, PH) matching the spoken audio prompt.' },
      { title: '🎈 Zone 2: Mirror Buster', content: 'Pop target letter balloons (b, d, p, q) while dodging reversed mirror distractors.' },
      { title: '⚔️ Zone 3: Sight Word Ninja', content: 'Slice flying irregular sight words (because, friend, people) before they drop.' },
      { title: '🤖 Zone 4: Morph-Bot Workshop', content: 'Snap prefix, root, and suffix blocks to assemble high-power battle robots.' },
      { title: '🏎️ Zone 5: Safari Kart (RAN)', content: 'Rapidly identify and tap track items in named sequence to activate Nitrous speed boosts.' },
      { title: '🎧 Zone 6: Acoustic Shield', content: 'Filter audio static to isolate initial speech sounds and train auditory processing.' },
      { title: '👕 Mascot Outfits', content: 'Use earned XP coins to customize your mascot companion with superhero capes and glasses!' }
    ],
    '/simulator': [
      { title: '👀 Step 1: Eye Target Calibration', content: 'Follow the moving tracking dot across text lines to practice smooth saccadic eye movements.' },
      { title: '⚙️ Step 2: Speed & Pause Duration', content: 'Adjust dot movement speed and fixation pause time to match your comfortable reading rhythm.' },
      { title: '📊 Step 3: Track Regression Count', content: 'Aim to reduce backward eye jumps (regressions) and increase reading fluency score.' }
    ],
    '/quiz': [
      { title: '📋 Step 1: Self-Assessment Quiz', content: 'Answer diagnostic questions about reading speed, spelling challenges, and letter confusion.' },
      { title: '📊 Step 2: Category Analysis', content: 'Review your visual, auditory, and rapid naming sub-scores.' },
      { title: '🎯 Step 3: Customized Action Plan', content: 'Receive tailored therapy game recommendations based on your answers.' }
    ],
    '/analysis': [
      { title: '📊 Step 1: Detailed Risk Report', content: 'Examine detailed breakdowns of phonemic precision, reading cadence, and error rates.' },
      { title: '📅 Step 2: Progress Charts', content: 'Compare week-over-week performance graphs to track your reading improvement.' },
      { title: '📥 Step 3: Download & Print', content: 'Export clean diagnostic summaries ready for academic or medical review.' }
    ],
    '/login': [
      { title: '🔑 Sign In to LexiFlow', content: 'Enter your credentials to access your saved reading progress, streaks, and therapy stats.' }
    ],
    '/signup': [
      { title: '✨ Create Your Account', content: 'Sign up to personalize your mascot companion, track daily streaks, and store diagnostic reports.' }
    ]
  };

  // Fallback for sub-routes like /therapy/phonological, /therapy/spatial, etc.
  const getActiveGuide = () => {
    if (guides[location.pathname]) return guides[location.pathname];
    if (location.pathname.startsWith('/therapy/')) {
      return [
        { title: '🎧 Step 1: Listen to Auditory Cues', content: 'Listen closely to the audio prompt before selecting your answer.' },
        { title: '🎯 Step 2: Select Matching Targets', content: 'Tap or drag the correct phoneme, letter, or word block.' },
        { title: '⭐ Step 3: Earn Bonus Stars', content: 'Maintain 80%+ accuracy to earn high scores and XP coins!' }
      ];
    }
    return guides['/'];
  };

  const activeGuide = getActiveGuide();

  const [currentStep, setCurrentStep] = useState(() => {
    return parseInt(localStorage.getItem(`lexiflow_guide_step_${location.pathname}`) || '0', 10);
  });

  const [completedSteps, setCompletedSteps] = useState(() => {
    return JSON.parse(localStorage.getItem(`lexiflow_guide_completed_${location.pathname}`) || '{}');
  });

  useEffect(() => {
    localStorage.setItem('lexiflow_mascot_character', selectedCharacter);
  }, [selectedCharacter]);

  useEffect(() => {
    const savedStep = parseInt(localStorage.getItem(`lexiflow_guide_step_${location.pathname}`) || '0', 10);
    setCurrentStep(savedStep < activeGuide.length ? savedStep : 0);
  }, [location.pathname, activeGuide.length]);

  useEffect(() => {
    localStorage.setItem(`lexiflow_guide_step_${location.pathname}`, currentStep);
  }, [currentStep, location.pathname]);

  useEffect(() => {
    localStorage.setItem(`lexiflow_guide_completed_${location.pathname}`, JSON.stringify(completedSteps));
  }, [completedSteps, location.pathname]);

  // Stop speech when changing routes or closing
  useEffect(() => {
    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, [location.pathname]);

  const speakText = (text) => {
    if (!('speechSynthesis' in window)) return;

    window.speechSynthesis.cancel();

    if (isSpeaking) {
      setIsSpeaking(false);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    utterance.pitch = selectedCharacter === 'pup' ? 1.2 : (selectedCharacter === 'star' ? 1.3 : 1.0);

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  };

  const toggleStepCompleted = (index) => {
    const isNowCompleted = !completedSteps[index];
    setCompletedSteps(prev => ({
      ...prev,
      [index]: isNowCompleted
    }));

    if (isNowCompleted) {
      playSoundEffect('fanfare');
      setIsHappy(true);
      setTimeout(() => setIsHappy(false), 1200);
    } else {
      playSoundEffect('pop');
    }
  };

  const handleMascotClick = () => {
    playSoundEffect('pop');
    setIsHappy(true);
    setTimeout(() => setIsHappy(false), 800);
    setIsOpen(!isOpen);
  };

  const currentStepData = activeGuide[currentStep] || activeGuide[0];

  return (
    <div className={`guide-me-wrapper ${isOpen ? 'is-open' : ''}`}>
      {/* Minimized Floating Mascot Trigger */}
      <button 
        className="mascot-trigger-btn"
        onClick={handleMascotClick}
        aria-label="Toggle Section Guide Companion"
      >
        <div className="mascot-trigger-avatar">
          <MascotAvatar characterId={selectedCharacter} isSpeaking={isSpeaking} isHappy={isHappy} />
        </div>
        <div className="mascot-trigger-badge">
          <span className="badge-pulse"></span>
          <span className="badge-text">{isOpen ? 'Close' : 'Guide Me'}</span>
        </div>
      </button>

      {/* Expanded Animated Guide Companion Window */}
      {isOpen && (
        <div className="guide-companion-card">
          {/* Header */}
          <div className="companion-header">
            <div className="companion-identity">
              <div 
                className="companion-avatar-wrap" 
                onClick={() => {
                  playSoundEffect('chime');
                  setShowSelector(!showSelector);
                }}
                title="Click to change companion character!"
              >
                <MascotAvatar characterId={selectedCharacter} isSpeaking={isSpeaking} isHappy={isHappy} />
                <span className="character-switch-chip">🔄</span>
              </div>
              <div className="companion-meta">
                <div className="companion-name-row">
                  <h4>{activeMascotObj.name}</h4>
                  <span className="mascot-tag">{activeMascotObj.title}</span>
                </div>
                <p className="companion-subtitle">Section Assistant • Step {currentStep + 1} of {activeGuide.length}</p>
              </div>
            </div>

            <div className="header-actions">
              <button 
                className={`speech-btn ${isSpeaking ? 'active' : ''}`}
                onClick={() => speakText(`${currentStepData.title}. ${currentStepData.content}`)}
                title={isSpeaking ? 'Stop Voice Narration' : 'Listen to Audio Narration'}
              >
                {isSpeaking ? '🔊 Speaking...' : '🗣️ Listen'}
              </button>
              <button 
                className="close-companion-btn" 
                onClick={() => {
                  playSoundEffect('pop');
                  setIsOpen(false);
                }}
              >
                ✕
              </button>
            </div>
          </div>

          {/* Character Selector Popup */}
          {showSelector && (
            <div className="character-selector-drawer">
              <div className="selector-header">
                <h5>Choose Your Game Companion</h5>
                <button onClick={() => setShowSelector(false)}>✕</button>
              </div>
              <div className="character-grid">
                {CHARACTER_LIST.map(char => (
                  <button
                    key={char.id}
                    className={`character-card ${char.id === selectedCharacter ? 'selected' : ''}`}
                    onClick={() => {
                      setSelectedCharacter(char.id);
                      playSoundEffect('chime');
                      setShowSelector(false);
                    }}
                  >
                    <span className="char-emoji">{char.icon}</span>
                    <div className="char-info">
                      <span className="char-name">{char.name}</span>
                      <span className="char-role">{char.title}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Animated Speech Bubble & Step Content */}
          <div className="companion-speech-box">
            <div className="speech-tail"></div>
            <div className="speech-content">
              <div className="step-title-row">
                <h3 className="step-title">{currentStepData.title}</h3>
                {completedSteps[currentStep] && (
                  <span className="completed-badge">Done ✓</span>
                )}
              </div>
              <p className="step-description">{currentStepData.content}</p>
            </div>
          </div>

          {/* Step Segment Progress Bar */}
          <div className="step-progress-row">
            {activeGuide.map((step, idx) => (
              <div
                key={idx}
                className={`step-segment ${completedSteps[idx] ? 'completed' : ''} ${idx === currentStep ? 'active' : ''}`}
                onClick={() => {
                  setCurrentStep(idx);
                  playSoundEffect('pop');
                }}
                title={`Jump to step ${idx + 1}: ${step.title}`}
              >
                {completedSteps[idx] ? '✓' : idx + 1}
              </div>
            ))}
          </div>

          {/* Navigation & Action Footer */}
          <div className="companion-footer">
            <div className="nav-buttons">
              <button
                disabled={currentStep === 0}
                onClick={() => {
                  setCurrentStep(currentStep - 1);
                  playSoundEffect('pop');
                }}
                className="step-nav-btn"
              >
                ◀ Prev
              </button>
              <button
                disabled={currentStep === activeGuide.length - 1}
                onClick={() => {
                  setCurrentStep(currentStep + 1);
                  playSoundEffect('pop');
                }}
                className="step-nav-btn"
              >
                Next ▶
              </button>
            </div>

            <button
              onClick={() => toggleStepCompleted(currentStep)}
              className={`complete-toggle-btn ${completedSteps[currentStep] ? 'is-done' : ''}`}
            >
              {completedSteps[currentStep] ? 'Mark Incomplete' : 'Complete Step ✓'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default GuideMe;

