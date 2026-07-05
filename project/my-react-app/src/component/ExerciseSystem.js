import React, { useState, useEffect } from 'react';
import './Exercises.css';
import VideoPractice from './VideoPractice';

const VisualTracking = ({ onComplete, speedMultiplier = 1 }) => {
  const fullText = "The soft morning sunlight filtered through the heavy curtains. A breeze moved the pages of the open book. Everything felt calm and quiet in the small library. The gentle scent of old paper filled the cool air.";
  const words = fullText.split(" ");
  const targetWord = "breeze";
  
  const [activeIndex, setActiveIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [score, setScore] = useState(0);
  const [totalAttempts, setTotalAttempts] = useState(0);
  const [focusPoints, setFocusPoints] = useState(0);
  const [accuracy, setAccuracy] = useState(100);

  const speed = 600 * speedMultiplier;

  useEffect(() => {
    let interval;
    if (isPlaying && activeIndex < words.length - 1) {
      interval = setInterval(() => {
        setActiveIndex(prev => prev + 1);
      }, speed);
    } else if (activeIndex >= words.length - 1) {
      setIsPlaying(false);
    }
    return () => clearInterval(interval);
  }, [isPlaying, activeIndex, speed]);

  const handleAction = () => {
    if (!isPlaying || activeIndex === -1) return;
    
    setTotalAttempts(prev => prev + 1);
    const currentWord = words[activeIndex].toLowerCase().replace(/[^\w]/g, '');
    
    if (currentWord === targetWord) {
      setScore(prev => prev + 1);
      setFocusPoints(prev => prev + 250);
    } else {
      setFocusPoints(prev => Math.max(0, prev - 50));
    }
  };

  useEffect(() => {
    if (totalAttempts > 0) {
      setAccuracy(Math.round((score / totalAttempts) * 100));
    }
  }, [score, totalAttempts]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === 'Space') {
        e.preventDefault();
        handleAction();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, activeIndex]);

  const speakText = () => {
    const ut = new SpeechSynthesisUtterance(fullText);
    window.speechSynthesis.speak(ut);
  };

  const handleFinish = () => {
    const history = JSON.parse(localStorage.getItem('lexiflow_exercise_history') || '{}');
    history['visual'] = {
      pb: `${accuracy}%`,
      sessions: (history['visual']?.sessions || 0) + 1,
      accuracy: `${accuracy}%`,
      level: speedMultiplier < 1 ? 'Advanced' : 'Normal'
    };
    localStorage.setItem('lexiflow_exercise_history', JSON.stringify(history));
    onComplete();
  };

  return (
    <div className="visual-exercise-container">
      <h3>Visual Tracking Exercise</h3>
      <p className="visual-instructions">
        Follow the highlighted word with your eyes. Press <span className="key-badge">SPACE</span> or 
        <span className="key-badge">CLICK</span> when it lands on the target word: <strong className="target-word-label">Breeze</strong>.
      </p>

      <div className="reading-card">
        <div className="reading-content" onClick={handleAction}>
          {words.map((word, idx) => (
            <span 
              key={idx} 
              className={`tracking-word ${idx === activeIndex ? 'active' : ''}`}
            >
              {word}{" "}
            </span>
          ))}
        </div>
        <button className="btn-listen" onClick={(e) => { e.stopPropagation(); speakText(); }}>
          <span>🔊</span> Listen to Text
        </button>
      </div>

      <div className="visual-metrics-footer">
        <div className="metric-card accuracy">
          <div className="metric-icon-box">👁️</div>
          <div>
            <span className="metric-label">Accuracy</span>
            <span className="metric-value">{accuracy}%</span>
          </div>
        </div>
        <div className="metric-card speed">
          <div className="metric-icon-box">⏱️</div>
          <div>
            <span className="metric-label">Tracking Speed</span>
            <span className="metric-value">{speedMultiplier < 1 ? 'Fast' : 'Normal'}</span>
          </div>
        </div>
        <div className="metric-card points">
          <div className="metric-icon-box">🎯</div>
          <div>
            <span className="metric-label">Focus Points</span>
            <span className="metric-value">{focusPoints.toLocaleString()}</span>
          </div>
        </div>
      </div>

      <div className="visual-actions">
        <button className="btn-visual-main" onClick={() => { setActiveIndex(-1); setIsPlaying(true); }}>
          {activeIndex === -1 ? "▶ Start Exercise" : "🔄 Restart"}
        </button>
        {activeIndex >= words.length - 1 && (
          <button className="btn-finish" style={{ marginTop: 0, width: 'auto' }} onClick={handleFinish}>Finish & Save Results</button>
        )}
      </div>
    </div>
  );
};

const PhonemeMatching = ({ onComplete }) => {
  const pairs = [
    { phoneme: 'CH', words: ['Chair', 'Chip', 'Catch'], audio: 'ch' },
    { phoneme: 'SH', words: ['Ship', 'Shop', 'Fish'], audio: 'sh' },
    { phoneme: 'TH', words: ['Thin', 'That', 'Math'], audio: 'th' },
  ];
  const [currentPair, setCurrentPair] = useState(0);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);

  const handleMatch = (isCorrect) => {
    const nextScore = isCorrect ? score + 1 : score;
    if (isCorrect) setScore(nextScore);

    if (currentPair < pairs.length - 1) {
      setCurrentPair(currentPair + 1);
    } else {
      setFinished(true);
      const history = JSON.parse(localStorage.getItem('lexiflow_exercise_history') || '{}');
      const prevStats = history['phoneme'] || { pb: 0, sessions: 0, accuracy: '0%', level: 'New User' };
      const newSessions = (prevStats.sessions || 0) + 1;
      const finalAccuracy = Math.round((nextScore / pairs.length) * 100);
      const pb = Math.max(prevStats.pb || 0, nextScore);
      history['phoneme'] = {
        pb: `${pb} / ${pairs.length}`,
        sessions: newSessions,
        accuracy: `${finalAccuracy}%`,
        level: finalAccuracy > 80 ? 'Advanced' : finalAccuracy > 50 ? 'Intermediate' : 'Beginner'
      };
      localStorage.setItem('lexiflow_exercise_history', JSON.stringify(history));
    }
  };

  return (
    <div className="exercise-session">
      <h3>Phoneme Matching</h3>
      {!finished ? (
        <>
          <p className="exercise-desc">Identify the words that contain the sound: <strong>{pairs[currentPair].phoneme}</strong></p>
          
          <div className="phoneme-display">
            <span className="big-sound">{pairs[currentPair].phoneme}</span>
            <button className="btn-audio" onClick={() => {
              const ut = new SpeechSynthesisUtterance(pairs[currentPair].phoneme);
              window.speechSynthesis.speak(ut);
            }}>🔊 Play Sound</button>
          </div>

          <div className="match-grid">
            {['Chair', 'Apple', 'Chip', 'Sun'].map(word => (
              <button 
                key={word} 
                className="match-btn"
                onClick={() => handleMatch(pairs[currentPair].words.includes(word))}
              >
                {word}
              </button>
            ))}
          </div>
        </>
      ) : (
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <h4 style={{ color: 'var(--primary-teal)', marginBottom: '1rem' }}>Exercise Complete!</h4>
          <p style={{ marginBottom: '2rem' }}>You scored {score} out of {pairs.length} correct.</p>
          <button className="btn-finish" onClick={onComplete}>Complete Session</button>
        </div>
      )}
    </div>
  );
};

const AuditoryProcessing = ({ onComplete }) => {
  const tasks = [
    { target: 'B', options: ['Ball', 'Dog', 'Cat', 'Fish'], correct: 'Ball' },
    { target: 'S', options: ['Sun', 'Moon', 'Star', 'Cloud'], correct: 'Sun' },
    { target: 'M', options: ['Apple', 'Milk', 'Bread', 'Egg'], correct: 'Milk' },
  ];
  const [currentTask, setCurrentTask] = useState(0);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);

  const playWord = (word) => {
    const ut = new SpeechSynthesisUtterance(word);
    window.speechSynthesis.speak(ut);
  };

  const handleChoice = (word) => {
    const isCorrect = word === tasks[currentTask].correct;
    const nextScore = isCorrect ? score + 1 : score;
    if (isCorrect) setScore(nextScore);

    if (currentTask < tasks.length - 1) {
      setCurrentTask(currentTask + 1);
    } else {
      setFinished(true);
      const history = JSON.parse(localStorage.getItem('lexiflow_exercise_history') || '{}');
      const prevStats = history['auditory'] || { pb: 0, sessions: 0, accuracy: '0%', level: 'New User' };
      const newSessions = (prevStats.sessions || 0) + 1;
      const finalAccuracy = Math.round((nextScore / tasks.length) * 100);
      const pb = Math.max(prevStats.pb || 0, nextScore);
      history['auditory'] = {
        pb: `${pb} / ${tasks.length}`,
        sessions: newSessions,
        accuracy: `${finalAccuracy}%`,
        level: finalAccuracy > 80 ? 'Advanced' : finalAccuracy > 50 ? 'Intermediate' : 'Beginner'
      };
      localStorage.setItem('lexiflow_exercise_history', JSON.stringify(history));
    }
  };

  return (
    <div className="exercise-session">
      <h3>Auditory Processing</h3>
      {!finished ? (
        <>
          <p className="exercise-desc">Listen to the words. Which word starts with the sound <strong>"{tasks[currentTask].target}"</strong>?</p>
          
          <div className="auditory-display">
            <div className="sound-pulse">🎧</div>
            <button className="btn-audio" onClick={() => playWord(tasks[currentTask].target)}>🔊 Play Target Sound</button>
          </div>

          <div className="match-grid">
            {tasks[currentTask].options.map(word => (
              <button 
                key={word} 
                className="match-btn auditory-btn"
                onClick={() => handleChoice(word)}
              >
                <span onClick={(e) => { e.stopPropagation(); playWord(word); }}>🔊</span> {word}
              </button>
            ))}
          </div>
        </>
      ) : (
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <h4 style={{ color: 'var(--primary-teal)', marginBottom: '1rem' }}>Exercise Complete!</h4>
          <p style={{ marginBottom: '2rem' }}>You scored {score} out of {tasks.length} correct.</p>
          <button className="btn-finish" onClick={onComplete}>Complete Session</button>
        </div>
      )}
    </div>
  );
};

const MorphologyBuilder = ({ onComplete }) => {
  const tasks = [
    { root: 'Play', options: ['Played', 'Player', 'Playful'], instruction: 'Select the word that means "someone who plays".', correct: 'Player' },
    { root: 'Happy', options: ['Happily', 'Unhappy', 'Happiness'], instruction: 'Select the word that means "not happy".', correct: 'Unhappy' },
    { root: 'Read', options: ['Reading', 'Readable', 'Misread'], instruction: 'Select the word that means "easy to read".', correct: 'Readable' },
  ];
  const [currentTask, setCurrentTask] = useState(0);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);

  const handleChoice = (choice) => {
    const isCorrect = choice === tasks[currentTask].correct;
    const nextScore = isCorrect ? score + 1 : score;
    if (isCorrect) setScore(nextScore);

    if (currentTask < tasks.length - 1) {
      setCurrentTask(currentTask + 1);
    } else {
      setFinished(true);
      const history = JSON.parse(localStorage.getItem('lexiflow_exercise_history') || '{}');
      history['morphology'] = { pb: `${Math.max(nextScore, 0)} / 3`, sessions: 1, accuracy: `${Math.round((nextScore/3)*100)}%`, level: 'Level 1' };
      localStorage.setItem('lexiflow_exercise_history', JSON.stringify(history));
    }
  };

  return (
    <div className="exercise-session">
      <h3>Morphology Builder</h3>
      {!finished ? (
        <>
          <p className="exercise-desc">Word Root: <strong>{tasks[currentTask].root}</strong></p>
          <p className="exercise-sub-desc">{tasks[currentTask].instruction}</p>
          
          <div className="match-grid">
            {tasks[currentTask].options.map(opt => (
              <button key={opt} className="match-btn" onClick={() => handleChoice(opt)}>{opt}</button>
            ))}
          </div>
        </>
      ) : (
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <h4 style={{ color: 'var(--primary-teal)', marginBottom: '1rem' }}>Complete!</h4>
          <button className="btn-finish" onClick={onComplete}>Complete Session</button>
        </div>
      )}
    </div>
  );
};

const RapidNaming = ({ onComplete }) => {
  const items = ['🍎', '🍌', '🍇', '🍊', '🍓', '🥝', '🫐', '🍍', '🥭', '🍉'];
  const [startTime, setStartTime] = useState(null);
  const [elapsed, setElapsed] = useState(null);
  const [isActive, setIsActive] = useState(false);

  const startTest = () => {
    setStartTime(Date.now());
    setIsActive(true);
  };

  const finishTest = () => {
    const time = ((Date.now() - startTime) / 1000).toFixed(2);
    setElapsed(time);
    setIsActive(false);
    const history = JSON.parse(localStorage.getItem('lexiflow_exercise_history') || '{}');
    history['naming'] = { pb: `${time}s`, sessions: 1, accuracy: '100%', level: 'Fast' };
    localStorage.setItem('lexiflow_exercise_history', JSON.stringify(history));
  };

  return (
    <div className="exercise-session">
      <h3>Rapid Automated Naming (RAN)</h3>
      <p className="exercise-desc">Name each object aloud as fast as you can from left to right!</p>
      
      <div className="naming-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1rem', margin: '2rem 0', fontSize: '3rem' }}>
        {items.map((item, idx) => (
          <div key={idx} style={{ background: '#f1f5f9', borderRadius: '12px', padding: '1rem', textAlign: 'center' }}>{item}</div>
        ))}
      </div>

      {!isActive && !elapsed && <button className="btn-finish" onClick={startTest}>Ready? Start Timer</button>}
      {isActive && <button className="btn-finish" style={{ background: '#ef4444' }} onClick={finishTest}>Done! Stop Timer</button>}
      {elapsed && (
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary-teal)' }}>Time: {elapsed}s</p>
          <button className="btn-finish" onClick={onComplete}>Complete Session</button>
        </div>
      )}
    </div>
  );
};

const ExerciseSystem = ({ type, onComplete }) => {
  const [exerciseStats, setExerciseStats] = useState(null);
  const [isAdvanced, setIsAdvanced] = useState(false);

  useEffect(() => {
    // Fetch real stats from localStorage
    const history = JSON.parse(localStorage.getItem('lexiflow_exercise_history') || '{}');
    const typeStats = history[type] || { pb: '0 / 3', sessions: 0, accuracy: '0%', level: 'New User', history: [] };
    
    // Fix NaN display
    if (typeStats.pb === '--' || !typeStats.pb) {
        typeStats.pb = '0 / 3';
    }
    
    setExerciseStats(typeStats);
  }, [type]);

  const toggleAdvanced = () => {
    setIsAdvanced(!isAdvanced);
  };

  return (
    <div className="exercise-container-flat" style={{ display: 'flex', width: '100%', background: 'white', overflow: 'hidden' }}>
        {/* Exercise Stats Sidebar — hidden for video sessions */}
        {type !== 'video' && <aside className="exercise-stats-sidebar" style={{ width: '320px', background: '#f8fafc', padding: '3rem 2rem', borderRight: '1px solid var(--border-soft)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
            <h4 style={{ color: 'var(--primary-teal)', fontSize: '0.9rem', margin: 0 }}>PERFORMANCE</h4>
            <button 
              onClick={toggleAdvanced}
              style={{
                background: isAdvanced ? 'var(--primary-teal)' : '#e2e8f0',
                color: isAdvanced ? 'white' : '#64748b',
                border: 'none',
                borderRadius: '8px',
                padding: '4px 10px',
                fontSize: '0.7rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              {isAdvanced ? 'ADVANCED ON' : 'NORMAL MODE'}
            </button>
          </div>
          
          <div className="ex-stat-item" style={{ marginBottom: '1.5rem' }}>
            <small style={{ color: 'var(--text-sub)', fontWeight: 700, display: 'block', marginBottom: '0.5rem' }}>PERSONAL BEST</small>
            <span style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary-teal)' }}>{exerciseStats?.pb || '0 / 3'}</span>
          </div>

          <div className="ex-stat-item" style={{ marginBottom: '1.5rem' }}>
            <small style={{ color: 'var(--text-sub)', fontWeight: 700, display: 'block', marginBottom: '0.5rem' }}>ACCURACY RATE</small>
            <span style={{ fontSize: '1.5rem', fontWeight: 800, color: '#10b981' }}>{exerciseStats?.accuracy || '0%'}</span>
          </div>

          <div className="ex-stat-item" style={{ marginBottom: '1.5rem' }}>
            <small style={{ color: 'var(--text-sub)', fontWeight: 700, display: 'block', marginBottom: '0.5rem' }}>CURRENT LEVEL</small>
            <span className="level-badge" style={{ background: isAdvanced ? '#8b5cf6' : 'var(--primary-teal)', color: 'white', padding: '4px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700 }}>
              {isAdvanced ? 'Advanced Tier' : (exerciseStats?.level || 'New')}
            </span>
          </div>

          <div className="analysis-box" style={{ marginTop: '3rem', padding: '1.5rem', background: 'white', borderRadius: '16px', border: '1px solid var(--border-soft)' }}>
            <h5 style={{ margin: '0 0 1rem 0', fontSize: '0.8rem', fontWeight: 800 }}>MODULE ANALYSIS</h5>
            <div style={{ fontSize: '0.75rem', color: '#475569', lineHeight: '1.5' }}>
              <p>• <strong>Frequency:</strong> {exerciseStats?.sessions || 0} sessions</p>
              <p>• <strong>Trend:</strong> {parseInt(exerciseStats?.accuracy) > 80 ? '📈 Improving' : '➡️ Stable'}</p>
              <p>• <strong>Focus Area:</strong> {type === 'phoneme' ? 'Phonological Decoding' : type === 'visual' ? 'Saccadic Eye Movement' : 'Linguistic Retrieval'}</p>
            </div>
            <div style={{ marginTop: '1rem', height: '60px', display: 'flex', alignItems: 'flex-end', gap: '4px' }}>
                {[40, 65, 55, 80, 75, 90].map((h, i) => (
                    <div key={i} style={{ flex: 1, height: `${h}%`, background: 'var(--med-teal-soft)', borderRadius: '2px' }}></div>
                ))}
            </div>
            <small style={{ display: 'block', textAlign: 'center', marginTop: '4px', fontSize: '0.65rem', color: 'var(--med-gray)' }}>Accuracy Velocity (Last 6 Sessions)</small>
          </div>
        </aside>}

        {/* Main Exercise Content */}
        <div className="exercise-content-area" style={{ flex: 1, padding: '3rem', position: 'relative' }}>
          {type === 'visual' && <VisualTracking onComplete={onComplete} speedMultiplier={isAdvanced ? 0.6 : 1} />}
          {type === 'phoneme' && <PhonemeMatching onComplete={onComplete} advanced={isAdvanced} />}
          {type === 'auditory' && <AuditoryProcessing onComplete={onComplete} advanced={isAdvanced} />}
          {type === 'morphology' && <MorphologyBuilder onComplete={onComplete} advanced={isAdvanced} />}
          {type === 'naming' && <RapidNaming onComplete={onComplete} advanced={isAdvanced} />}
          {type === 'video' && <VideoPractice onComplete={onComplete} />}
        </div>
    </div>
  );
};

export default ExerciseSystem;
