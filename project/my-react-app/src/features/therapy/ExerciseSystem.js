import React, { useState, useEffect } from 'react';
import './Exercises.css';
import VideoPractice from './VideoPractice';
import SoundQuest from './SoundQuest';
import MorphologyQuest from './MorphologyQuest';
import MorphoSnake from './MorphoSnake';
import MarioPhonemeJumper from './MarioPhonemeJumper';
import MorphologySnakeGame from './MorphologySnakeGame';
import BalloonPopRAN from './BalloonPopRAN';
import MirrorMatchHighway from './MirrorMatchHighway';
import AuditoryProcessingSuite from './AuditoryProcessingSuite';
import { useAuth } from '../auth/AuthContext';
import { fetchWithAuth } from '../../services/api';

export const saveTherapyProgress = async (currentUser, type, score, accuracy, timeTaken = "N/A", mode = "assessment") => {
  const uid = currentUser?.uid;
  const now = new Date();
  const dateStr = now.toLocaleDateString() + ' ' + now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const sessionEntry = {
    type,
    score,
    accuracy,
    timeTaken,
    mode,
    date: dateStr,
    timestamp: now.getTime()
  };

  const moduleNames = {
    phoneme: 'Phoneme Matching',
    morphology: 'Morphology Builder',
    naming: 'Visual Attention Speed',
    visual: 'Visual Tracking',
    auditory: 'Auditory Processing',
    video: 'Live Voice Practice'
  };

  const modName = moduleNames[type] || type;

  const historyItem = {
    id: Date.now(),
    date: dateStr,
    isoDate: now.toISOString(),
    type: `Therapy: ${modName}`,
    score: accuracy,
    riskLevel: accuracy >= 70 ? "Low" : accuracy >= 40 ? "Moderate" : "High",
    status: "Completed",
    mode,
    details: sessionEntry
  };

  // 1. Save synchronously to localStorage first to guarantee instant UI updates
  // Only assessment-mode sessions feed the main dashboard history/risk metrics;
  // practice-mode sessions are tracked separately for personal stats only.
  try {
    if (mode === 'assessment') {
      const uidHistKey = uid ? `lexiflow_history_${uid}` : "lexiflow_history";
      const uidHist = JSON.parse(localStorage.getItem(uidHistKey) || "[]");
      localStorage.setItem(uidHistKey, JSON.stringify([historyItem, ...uidHist]));

      const globalHist = JSON.parse(localStorage.getItem("lexiflow_history") || "[]");
      localStorage.setItem("lexiflow_history", JSON.stringify([historyItem, ...globalHist]));
    }

    const historyKey = uid ? `lexiflow_exercise_history_${uid}` : 'lexiflow_exercise_history';
    const lastKey = uid ? `lexiflow_last_therapy_${uid}` : 'lexiflow_last_therapy';

    let history = {};
    try {
      const rawHist = localStorage.getItem(historyKey) || localStorage.getItem('lexiflow_exercise_history');
      if (rawHist) history = JSON.parse(rawHist);
    } catch (e) {
      history = {};
    }

    const prev = history[type] || { pb: '0 pts', pb_val: 0, sessions: 0, accuracy: '0%', level: 'Beginner' };
    const newSessions = (prev.sessions || 0) + 1;
    const pb_val = Math.max(prev.pb_val || 0, score);
    const trend = accuracy >= 80 ? 'Improving' : accuracy >= 50 ? 'Stable' : 'Needs Practice';

    history[type] = {
      pb: `${pb_val} pts`,
      pb_val: pb_val,
      sessions: newSessions,
      accuracy: `${accuracy}%`,
      lastPlayed: dateStr,
      trend: trend,
      level: accuracy > 80 ? 'Advanced' : accuracy > 50 ? 'Intermediate' : 'Beginner'
    };

    localStorage.setItem(historyKey, JSON.stringify(history));
    localStorage.setItem('lexiflow_exercise_history', JSON.stringify(history));
    localStorage.setItem(lastKey, type);
    localStorage.setItem('lexiflow_last_therapy', type);
  } catch (err) {
    console.warn("Local storage save error:", err);
  }

  // 2. Post to backend DB asynchronously
  if (currentUser) {
    try {
      await fetchWithAuth("/api/therapy/progress", {
        method: "POST",
        body: JSON.stringify(sessionEntry)
      });
      await fetchWithAuth("/api/history", {
        method: "POST",
        body: JSON.stringify(historyItem)
      });
    } catch (e) {
      console.warn("Backend therapy progress save error:", e);
    }
  }
};

// Helper utility functions for dynamic item sampling & option shuffling
const shuffleArray = (arr) => {
  const newArr = [...arr];
  for (let i = newArr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
  }
  return newArr;
};

const getRandomItems = (arr, count) => {
  return shuffleArray(arr).slice(0, count);
};

// ---------------- VISUAL TRACKING PASSAGES POOL ----------------
const visualPassagesPool = [
  { text: "The soft morning sunlight filtered through the heavy curtains. A breeze moved the pages of the open book. Everything felt calm and quiet in the small library. The gentle scent of old paper filled the cool air.", targetWord: "breeze" },
  { text: "A small blue bird perched upon the wooden fence post. The gentle whisper of the wind rustled through the oak trees. High above, golden clouds drifted across the endless blue sky.", targetWord: "whisper" },
  { text: "Deep inside the thick forest, a hidden stream flowed over smooth pebbles. The warm glow of dusk illuminated the quiet trail. Animals gathered near the water before nightfall arrived.", targetWord: "glow" },
  { text: "Bright stars began to sparkle across the dark midnight sky. A solitary lighthouse guided ships safely toward the calm harbor. Ocean waves lapped rhythmically against the sandy shoreline.", targetWord: "sparkle" },
  { text: "The young explorer set out on an exciting journey up the steep mountain. Cold mountain air filled her lungs as she climbed higher. The panoramic view from the peak was truly breathtaking.", targetWord: "journey" },
  { text: "Floating gently on the river, a light white feather drifted toward the sea. Children laughed as they chased colorful butterflies through the wildflower meadow on a warm summer day.", targetWord: "feather" }
];

const VisualTracking = ({ onComplete, speedMultiplier = 1 }) => {
  const [currentPassage, setCurrentPassage] = useState(() => getRandomItems(visualPassagesPool, 1)[0]);
  const words = currentPassage.text.split(" ");
  const targetWord = currentPassage.targetWord;
  
  const [activeIndex, setActiveIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [score, setScore] = useState(0);
  const [totalAttempts, setTotalAttempts] = useState(0);
  const [focusPoints, setFocusPoints] = useState(0);
  const [accuracy, setAccuracy] = useState(100);

  const { currentUser } = useAuth();
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
  }, [isPlaying, activeIndex, speed, words.length]);

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
  }, [isPlaying, activeIndex, handleAction]);

  const speakText = () => {
    const ut = new SpeechSynthesisUtterance(currentPassage.text);
    window.speechSynthesis.speak(ut);
  };

  const handleFinish = async () => {
    await saveTherapyProgress(currentUser, 'visual', focusPoints, accuracy, `${speedMultiplier < 1 ? 'Fast' : 'Normal'} Pace`);
    onComplete();
  };

  const resetSession = () => {
    setCurrentPassage(getRandomItems(visualPassagesPool, 1)[0]);
    setActiveIndex(-1);
    setIsPlaying(true);
    setScore(0);
    setTotalAttempts(0);
    setFocusPoints(0);
    setAccuracy(100);
  };

  return (
    <div className="visual-exercise-container">
      <h3>Visual Tracking Exercise</h3>
      <p className="visual-instructions">
        Follow the highlighted word with your eyes. Press <span className="key-badge">SPACE</span> or 
        <span className="key-badge">CLICK</span> when it lands on the target word: <strong className="target-word-label" style={{ textTransform: 'capitalize' }}>{targetWord}</strong>.
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
            <span className="medical-label">Accuracy</span>
            <span className="metric-value">{accuracy}%</span>
          </div>
        </div>
        <div className="metric-card speed">
          <div className="metric-icon-box">⏱️</div>
          <div>
            <span className="medical-label">Tracking Speed</span>
            <span className="metric-value">{speedMultiplier < 1 ? 'Fast' : 'Normal'}</span>
          </div>
        </div>
        <div className="metric-card points">
          <div className="metric-icon-box">🎯</div>
          <div>
            <span className="medical-label">Focus Points</span>
            <span className="metric-value">{focusPoints.toLocaleString()}</span>
          </div>
        </div>
      </div>

      <div className="visual-actions">
        <button className="btn-gradient" onClick={resetSession}>
          {activeIndex === -1 ? "▶ Start Tracking Exercise" : "🔄 Restart Session"}
        </button>
        {activeIndex >= words.length - 1 && (
          <button className="btn-finish" style={{ marginTop: 0 }} onClick={handleFinish}>Complete & View Dashboard →</button>
        )}
      </div>
    </div>
  );
};

// ---------------- PHONEME MATCHING POOL ----------------
const phonemePairsPool = [
  { phoneme: 'CH', words: ['Chair', 'Chip', 'Catch', 'Bench'], options: ['Chair', 'Apple', 'Chip', 'Sun'] },
  { phoneme: 'SH', words: ['Ship', 'Shop', 'Fish', 'Brush'], options: ['Ship', 'Book', 'Fish', 'Ball'] },
  { phoneme: 'TH', words: ['Thin', 'That', 'Math', 'Thumb'], options: ['Thin', 'Frog', 'Math', 'Star'] },
  { phoneme: 'WH', words: ['Whale', 'White', 'Wheel', 'Whistle'], options: ['Whale', 'Duck', 'Wheel', 'Lamp'] },
  { phoneme: 'PH', words: ['Phone', 'Photo', 'Dolphin', 'Graph'], options: ['Phone', 'Tree', 'Photo', 'Desk'] },
  { phoneme: 'CK', words: ['Duck', 'Clock', 'Rock', 'Sock'], options: ['Clock', 'Pen', 'Duck', 'Ring'] },
  { phoneme: 'NG', words: ['King', 'Sing', 'Ring', 'Wing'], options: ['King', 'Cat', 'Ring', 'Moon'] },
  { phoneme: 'TR', words: ['Tree', 'Train', 'Truck', 'Track'], options: ['Train', 'Shoe', 'Tree', 'Boat'] },
  { phoneme: 'DR', words: ['Drum', 'Drop', 'Drive', 'Dress'], options: ['Drum', 'Bird', 'Dress', 'House'] },
  { phoneme: 'ST', words: ['Star', 'Stop', 'Step', 'Store'], options: ['Star', 'Milk', 'Stop', 'Leaf'] },
  { phoneme: 'FL', words: ['Flag', 'Fly', 'Flower', 'Flame'], options: ['Flag', 'Cake', 'Flower', 'Hill'] },
  { phoneme: 'BL', words: ['Blue', 'Block', 'Blow', 'Blade'], options: ['Blue', 'Rain', 'Block', 'Door'] },
  { phoneme: 'CL', words: ['Clock', 'Clap', 'Cloud', 'Clean'], options: ['Cloud', 'Hand', 'Clap', 'Rock'] },
  { phoneme: 'PR', words: ['Prize', 'Print', 'Prince', 'Press'], options: ['Prize', 'Wall', 'Prince', 'Desk'] },
  { phoneme: 'SL', words: ['Slide', 'Sleep', 'Slow', 'Slip'], options: ['Slide', 'Fish', 'Sleep', 'Bell'] },
  { phoneme: 'BR', words: ['Bread', 'Brave', 'Brick', 'Brush'], options: ['Bread', 'Desk', 'Brick', 'Star'] },
  { phoneme: 'CR', words: ['Crown', 'Crab', 'Cry', 'Cross'], options: ['Crab', 'Tree', 'Crown', 'Moon'] },
  { phoneme: 'FR', words: ['Frog', 'Frame', 'Free', 'Fruit'], options: ['Frog', 'Book', 'Fruit', 'Lamp'] },
  { phoneme: 'GR', words: ['Green', 'Grape', 'Grass', 'Grow'], options: ['Grape', 'Door', 'Green', 'Boat'] },
  { phoneme: 'PL', words: ['Plant', 'Plate', 'Play', 'Plum'], options: ['Plate', 'Shoe', 'Plant', 'Wall'] },
  { phoneme: 'SK', words: ['Sky', 'Skate', 'Skin', 'Skirt'], options: ['Skate', 'Fish', 'Sky', 'Bell'] },
  { phoneme: 'SM', words: ['Smile', 'Small', 'Smoke', 'Smart'], options: ['Smile', 'Ring', 'Small', 'Duck'] },
  { phoneme: 'SN', words: ['Snow', 'Snake', 'Snail', 'Snack'], options: ['Snow', 'Cake', 'Snail', 'Hill'] },
  { phoneme: 'SP', words: ['Spoon', 'Space', 'Spot', 'Spider'], options: ['Spoon', 'Hand', 'Spider', 'Rock'] },
  { phoneme: 'SW', words: ['Swim', 'Sweet', 'Swing', 'Swan'], options: ['Swing', 'Pen', 'Swim', 'Door'] }
];

const PhonemeMatching = ({ onComplete }) => {
  const generateNewPairs = () => {
    const sampled = getRandomItems(phonemePairsPool, 6);
    return sampled.map(p => ({
      ...p,
      options: shuffleArray(p.options)
    }));
  };

  const [pairs, setPairs] = useState(generateNewPairs);
  const [currentPair, setCurrentPair] = useState(0);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const [selectedWord, setSelectedWord] = useState(null);
  const { currentUser } = useAuth();

  const resetPhonemeSession = () => {
    setPairs(generateNewPairs());
    setCurrentPair(0);
    setScore(0);
    setFinished(false);
    setSelectedWord(null);
  };

  const handleMatch = async (word, isCorrect) => {
    setSelectedWord({ word, isCorrect });
    setTimeout(async () => {
      setSelectedWord(null);
      const nextScore = isCorrect ? score + 1 : score;
      if (isCorrect) setScore(nextScore);

      if (currentPair < pairs.length - 1) {
        setCurrentPair(currentPair + 1);
      } else {
        setFinished(true);
        const finalAccuracy = Math.round((nextScore / pairs.length) * 100);
        await saveTherapyProgress(currentUser, 'phoneme', nextScore * 100, finalAccuracy);
      }
    }, 600);
  };

  return (
    <div className="exercise-session">
      <h3>Phoneme Sound Matching</h3>
      {!finished ? (
        <>
          <p className="exercise-desc">Identify which of the words contain the phoneme sound: <strong>"{pairs[currentPair].phoneme}"</strong></p>
          
          <div className="sound-display-hero">
            <span className="big-sound-card">{pairs[currentPair].phoneme}</span>
            <button className="btn-audio-hero" onClick={() => {
              const ut = new SpeechSynthesisUtterance(pairs[currentPair].phoneme);
              window.speechSynthesis.speak(ut);
            }}>
              🔊 Play Target Phoneme Sound
            </button>
          </div>

          <div className="match-grid">
            {pairs[currentPair].options.map(word => {
              const isSelected = selectedWord?.word === word;
              const isCorrectTile = isSelected && selectedWord.isCorrect;
              const isIncorrectTile = isSelected && !selectedWord.isCorrect;

              return (
                <button 
                  key={word} 
                  className={`match-btn-tile ${isCorrectTile ? 'correct-selected' : ''} ${isIncorrectTile ? 'incorrect-selected' : ''}`}
                  onClick={() => handleMatch(word, pairs[currentPair].words.includes(word))}
                >
                  <span>{word}</span>
                  {isCorrectTile && <span>✅</span>}
                  {isIncorrectTile && <span>❌</span>}
                </button>
              );
            })}
          </div>
        </>
      ) : (
        <div className="exercise-completion-card">
          <div className="completion-trophy">🏆</div>
          <h4 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--lf-primary)', marginBottom: '0.5rem' }}>Session Complete!</h4>
          <p style={{ color: 'var(--lf-text-muted)', fontSize: '0.95rem', marginBottom: '1.5rem' }}>You correctly matched {score} out of {pairs.length} phoneme sounds.</p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="btn-finish" style={{ background: 'linear-gradient(135deg, #ff7675, #d63031)', boxShadow: '0 4px 15px rgba(214,48,49,0.3)' }} onClick={resetPhonemeSession}>
              🔄 PLAY AGAIN
            </button>
            <button className="btn-secondary" onClick={resetPhonemeSession}>Practice New Sound Set</button>
            <button className="btn-finish" onClick={onComplete}>Complete & View Dashboard →</button>
          </div>
        </div>
      )}
    </div>
  );
};

// ---------------- AUDITORY PROCESSING POOL ----------------
const auditoryTasksPool = [
  { target: 'B', options: ['Ball', 'Dog', 'Cat', 'Fish'], correct: 'Ball' },
  { target: 'S', options: ['Sun', 'Moon', 'Star', 'Cloud'], correct: 'Sun' },
  { target: 'M', options: ['Apple', 'Milk', 'Bread', 'Egg'], correct: 'Milk' },
  { target: 'P', options: ['Pencil', 'Table', 'Book', 'Chair'], correct: 'Pencil' },
  { target: 'T', options: ['Tiger', 'Lion', 'Bear', 'Monkey'], correct: 'Tiger' },
  { target: 'D', options: ['Drum', 'Guitar', 'Piano', 'Flute'], correct: 'Drum' },
  { target: 'F', options: ['Feather', 'Rock', 'Stone', 'Wood'], correct: 'Feather' },
  { target: 'V', options: ['Violin', 'Harp', 'Organ', 'Trumpet'], correct: 'Violin' },
  { target: 'K', options: ['Kite', 'Plane', 'Train', 'Car'], correct: 'Kite' },
  { target: 'G', options: ['Garden', 'Forest', 'Desert', 'River'], correct: 'Garden' },
  { target: 'R', options: ['Rainbow', 'Cloud', 'Storm', 'Snow'], correct: 'Rainbow' },
  { target: 'L', options: ['Lemon', 'Orange', 'Grape', 'Peach'], correct: 'Lemon' },
  { target: 'N', options: ['Nest', 'Tree', 'Leaf', 'Branch'], correct: 'Nest' },
  { target: 'W', options: ['Water', 'Fire', 'Air', 'Earth'], correct: 'Water' },
  { target: 'H', options: ['House', 'Road', 'Path', 'Bridge'], correct: 'House' },
  { target: 'J', options: ['Jug', 'Cap', 'Hat', 'Pen'], correct: 'Jug' },
  { target: 'Z', options: ['Zebra', 'Horse', 'Lion', 'Bear'], correct: 'Zebra' },
  { target: 'CH', options: ['Chair', 'Desk', 'Table', 'Bench'], correct: 'Chair' },
  { target: 'SH', options: ['Shark', 'Fish', 'Whale', 'Dolphin'], correct: 'Shark' },
  { target: 'TH', options: ['Thumb', 'Hand', 'Foot', 'Finger'], correct: 'Thumb' },
  { target: 'BL', options: ['Blast', 'Rocket', 'Star', 'Moon'], correct: 'Blast' },
  { target: 'CL', options: ['Clock', 'Watch', 'Bell', 'Ring'], correct: 'Clock' },
  { target: 'FL', options: ['Flower', 'Tree', 'Plant', 'Leaf'], correct: 'Flower' },
  { target: 'ST', options: ['Star', 'Sun', 'Moon', 'Sky'], correct: 'Star' },
  { target: 'TR', options: ['Train', 'Bus', 'Car', 'Bike'], correct: 'Train' }
];

const AuditoryProcessing = ({ onComplete }) => {
  const generateNewTasks = () => {
    const sampled = getRandomItems(auditoryTasksPool, 6);
    return sampled.map(t => ({
      ...t,
      options: shuffleArray(t.options)
    }));
  };

  const [tasks, setTasks] = useState(generateNewTasks);
  const [currentTask, setCurrentTask] = useState(0);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const { currentUser } = useAuth();

  const resetAuditorySession = () => {
    setTasks(generateNewTasks());
    setCurrentTask(0);
    setScore(0);
    setFinished(false);
  };

  const playWord = (word) => {
    const ut = new SpeechSynthesisUtterance(word);
    window.speechSynthesis.speak(ut);
  };

  const handleChoice = async (word) => {
    const isCorrect = word === tasks[currentTask].correct;
    const nextScore = isCorrect ? score + 1 : score;
    if (isCorrect) setScore(nextScore);

    if (currentTask < tasks.length - 1) {
      setCurrentTask(currentTask + 1);
    } else {
      setFinished(true);
      const finalAccuracy = Math.round((nextScore / tasks.length) * 100);
      await saveTherapyProgress(currentUser, 'auditory', nextScore * 100, finalAccuracy);
    }
  };

  return (
    <div className="exercise-session">
      <h3>Auditory Discrimination</h3>
      {!finished ? (
        <>
          <p className="exercise-desc">Listen carefully. Which word begins with the initial sound <strong>"{tasks[currentTask].target}"</strong>?</p>
          
          <div className="sound-display-hero">
            <div className="sound-pulse" style={{ width: '80px', height: '80px', fontSize: '2.5rem', background: 'var(--lf-primary-soft)', color: 'var(--lf-primary)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🎧</div>
            <button className="btn-audio-hero" onClick={() => playWord(tasks[currentTask].target)}>
              🔊 Play Initial Target Sound ("{tasks[currentTask].target}")
            </button>
          </div>

          <div className="match-grid">
            {tasks[currentTask].options.map(word => (
              <button 
                key={word} 
                className="match-btn-tile"
                onClick={() => handleChoice(word)}
              >
                <span onClick={(e) => { e.stopPropagation(); playWord(word); }} style={{ cursor: 'pointer' }}>🔊</span> {word}
              </button>
            ))}
          </div>
        </>
      ) : (
        <div className="exercise-completion-card">
          <div className="completion-trophy">🎧</div>
          <h4 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--lf-primary)', marginBottom: '0.5rem' }}>Auditory Exercise Complete!</h4>
          <p style={{ color: 'var(--lf-text-muted)', fontSize: '0.95rem', marginBottom: '1.5rem' }}>You identified {score} out of {tasks.length} initial sound targets correctly.</p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="btn-finish" style={{ background: 'linear-gradient(135deg, #ff7675, #d63031)', boxShadow: '0 4px 15px rgba(214,48,49,0.3)' }} onClick={resetAuditorySession}>
              🔄 PLAY AGAIN
            </button>
            <button className="btn-secondary" onClick={resetAuditorySession}>Practice New Sound Targets</button>
            <button className="btn-finish" onClick={onComplete}>Complete & View Dashboard →</button>
          </div>
        </div>
      )}
    </div>
  );
};

// ---------------- MORPHOLOGY BUILDER POOL ----------------
const morphologyTasksPool = [
  { root: 'Play', options: ['Played', 'Player', 'Playful'], instruction: 'Select the word that means "someone who plays".', correct: 'Player' },
  { root: 'Happy', options: ['Happily', 'Unhappy', 'Happiness'], instruction: 'Select the word that means "not happy".', correct: 'Unhappy' },
  { root: 'Read', options: ['Reading', 'Readable', 'Misread'], instruction: 'Select the word that means "easy to read".', correct: 'Readable' },
  { root: 'Care', options: ['Careful', 'Careless', 'Caring'], instruction: 'Select the word that means "without care".', correct: 'Careless' },
  { root: 'Hope', options: ['Hopeless', 'Hopeful', 'Hoping'], instruction: 'Select the word that means "full of hope".', correct: 'Hopeful' },
  { root: 'Act', options: ['Action', 'Actor', 'Active'], instruction: 'Select the word that means "a person who acts".', correct: 'Actor' },
  { root: 'Form', options: ['Format', 'Transform', 'Formless'], instruction: 'Select the word that means "to change shape or structure".', correct: 'Transform' },
  { root: 'Use', options: ['Useful', 'Useless', 'Reusable'], instruction: 'Select the word that means "able to be used again".', correct: 'Reusable' },
  { root: 'Move', options: ['Movement', 'Movable', 'Unmoved'], instruction: 'Select the word that means "able to be moved".', correct: 'Movable' },
  { root: 'Create', options: ['Creator', 'Creative', 'Creation'], instruction: 'Select the word that means "having the ability to create".', correct: 'Creative' },
  { root: 'View', options: ['Viewer', 'Preview', 'Review'], instruction: 'Select the word that means "to look at beforehand".', correct: 'Preview' },
  { root: 'Direct', options: ['Director', 'Direction', 'Indirect'], instruction: 'Select the word that means "not direct".', correct: 'Indirect' },
  { root: 'Sign', options: ['Signature', 'Signal', 'Resign'], instruction: 'Select the word that means "a person\'s written name".', correct: 'Signature' },
  { root: 'Struct', options: ['Structure', 'Construct', 'Destruct'], instruction: 'Select the word that means "to build together".', correct: 'Construct' },
  { root: 'Flex', options: ['Flexible', 'Reflex', 'Flexibility'], instruction: 'Select the word that means "capable of bending".', correct: 'Flexible' },
  { root: 'Lock', options: ['Locked', 'Unlock', 'Locker'], instruction: 'Select the word that means "to open a lock".', correct: 'Unlock' },
  { root: 'Help', options: ['Helper', 'Helpless', 'Helpful'], instruction: 'Select the word that means "full of help".', correct: 'Helpful' },
  { root: 'Port', options: ['Export', 'Portable', 'Porter'], instruction: 'Select the word that means "able to be carried".', correct: 'Portable' },
  { root: 'Script', options: ['Scribble', 'Transcript', 'Subscribe'], instruction: 'Select the word that means "a written copy or record".', correct: 'Transcript' },
  { root: 'Tract', options: ['Tractor', 'Attract', 'Subtract'], instruction: 'Select the word that means "to draw toward oneself".', correct: 'Attract' },
  { root: 'Bio', options: ['Biology', 'Biography', 'Autobiography'], instruction: 'Select the word that means "the study of living things".', correct: 'Biology' },
  { root: 'Auto', options: ['Automatic', 'Autograph', 'Automobile'], instruction: 'Select the word that means "a person\'s self-written signature".', correct: 'Autograph' },
  { root: 'Tele', options: ['Telescope', 'Television', 'Telegraph'], instruction: 'Select the word that means "an instrument for seeing distant objects".', correct: 'Telescope' },
  { root: 'Dict', options: ['Predict', 'Dictator', 'Dictionary'], instruction: 'Select the word that means "to speak or say beforehand".', correct: 'Predict' },
  { root: 'Vis', options: ['Visible', 'Vision', 'Invisible'], instruction: 'Select the word that means "not able to be seen".', correct: 'Invisible' }
];

const MorphologyBuilder = ({ onComplete }) => {
  const generateNewTasks = () => {
    const sampled = getRandomItems(morphologyTasksPool, 6);
    return sampled.map(t => ({
      ...t,
      options: shuffleArray(t.options)
    }));
  };

  const [tasks, setTasks] = useState(generateNewTasks);
  const [currentTask, setCurrentTask] = useState(0);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const [selectedChoice, setSelectedChoice] = useState(null);
  const { currentUser } = useAuth();

  const resetMorphologySession = () => {
    setTasks(generateNewTasks());
    setCurrentTask(0);
    setScore(0);
    setFinished(false);
    setSelectedChoice(null);
  };

  const playSFX = (isCorrect) => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      if (isCorrect) {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.18);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.22);
        osc.start();
        osc.stop(ctx.currentTime + 0.22);
      } else {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(260, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(190, ctx.currentTime + 0.2);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
        osc.start();
        osc.stop(ctx.currentTime + 0.25);
      }
    } catch (e) {}
  };

  const speakText = (text) => {
    try {
      window.speechSynthesis.cancel();
      const ut = new SpeechSynthesisUtterance(text);
      window.speechSynthesis.speak(ut);
    } catch (e) {}
  };

  const handleChoice = async (choice) => {
    if (selectedChoice !== null) return;
    const isCorrect = choice === tasks[currentTask].correct;
    setSelectedChoice({ choice, isCorrect });
    playSFX(isCorrect);
    speakText(isCorrect ? `Correct! ${choice}` : `Try again! ${choice}`);

    const nextScore = isCorrect ? score + 1 : score;
    if (isCorrect) setScore(nextScore);

    setTimeout(async () => {
      setSelectedChoice(null);
      if (currentTask < tasks.length - 1) {
        setCurrentTask(currentTask + 1);
      } else {
        setFinished(true);
        const finalAccuracy = Math.round((nextScore / tasks.length) * 100);
        await saveTherapyProgress(currentUser, 'morphology', nextScore * 100, finalAccuracy);
      }
    }, 700);
  };

  const currentTaskObj = tasks[currentTask];

  return (
    <div className="exercise-session">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: '0.5rem' }}>
        <h3 style={{ margin: 0 }}>Morphology Word Builder</h3>
        {!finished && (
          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--lf-primary)', background: 'var(--lf-primary-soft)', padding: '4px 12px', borderRadius: '20px' }}>
            Question {currentTask + 1} of {tasks.length}
          </span>
        )}
      </div>

      {!finished ? (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '0.75rem' }}>
            <p className="exercise-desc" style={{ margin: 0 }}>
              Root Word: <strong style={{ color: 'var(--lf-primary)', fontSize: '1.25rem' }}>{currentTaskObj.root}</strong>
            </p>
            <button
              onClick={() => speakText(`Root word: ${currentTaskObj.root}. ${currentTaskObj.instruction}`)}
              style={{
                background: 'var(--lf-primary-soft)',
                color: 'var(--lf-primary)',
                border: 'none',
                padding: '4px 12px',
                borderRadius: '20px',
                fontWeight: 700,
                fontSize: '0.8rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              🔊 Listen
            </button>
          </div>

          <div className="badge badge-info" style={{ marginBottom: '1.5rem', alignSelf: 'flex-start', padding: '8px 14px', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>💡</span> {currentTaskObj.instruction}
          </div>
          
          <div className="match-grid">
            {currentTaskObj.options.map(opt => {
              const isSelected = selectedChoice?.choice === opt;
              const isCorrectTile = isSelected && selectedChoice.isCorrect;
              const isIncorrectTile = isSelected && !selectedChoice.isCorrect;

              return (
                <button
                  key={opt}
                  className={`match-btn-tile ${isCorrectTile ? 'correct-selected' : ''} ${isIncorrectTile ? 'incorrect-selected' : ''}`}
                  onClick={() => handleChoice(opt)}
                  disabled={selectedChoice !== null}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    transition: 'all 0.2s ease',
                    transform: isSelected ? 'scale(1.03)' : 'scale(1)',
                  }}
                >
                  <span>{opt}</span>
                  {isCorrectTile && <span>✅</span>}
                  {isIncorrectTile && <span>❌</span>}
                </button>
              );
            })}
          </div>
        </>
      ) : (
        <div className="exercise-completion-card">
          <div className="completion-trophy">🧬</div>
          <h4 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--lf-primary)', marginBottom: '0.5rem' }}>Morphology Module Complete!</h4>
          <p style={{ color: 'var(--lf-text-muted)', fontSize: '0.95rem', marginBottom: '1.5rem' }}>You derived {score} out of {tasks.length} morphological structures correctly.</p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="btn-finish" style={{ background: 'linear-gradient(135deg, #ff7675, #d63031)', boxShadow: '0 4px 15px rgba(214,48,49,0.3)' }} onClick={resetMorphologySession}>
              🔄 PLAY AGAIN
            </button>
            <button className="btn-secondary" onClick={resetMorphologySession}>Practice New Root Words</button>
            <button className="btn-finish" onClick={onComplete}>Complete & View Dashboard →</button>
          </div>
        </div>
      )}
    </div>
  );
};

// ---------------- RAPID AUTOMATED NAMING (RAN) POOLS ----------------
const ranCategoryPools = [
  ['🍎', '🍌', '🍇', '🍊', '🍓', '🥝', '🫐', '🍍', '🍒', '🍉'],
  ['🐶', '🐱', '🦁', '🐯', '🐰', '🦊', '🐻', '🐼', '🐸', '🐵'],
  ['🔴', '🟦', '🟢', '🟡', '🟣', '🟠', '⭐', '🔺', '🔷', '🖤'],
  ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'],
  ['🚗', '🚕', '🚌', '🏎️', '🚓', '🚑', '🚒', '🚀', '🚁', '⛵']
];

const RapidNaming = ({ onComplete }) => {
  const generateNewItems = () => {
    const chosenCategory = getRandomItems(ranCategoryPools, 1)[0];
    return shuffleArray(chosenCategory);
  };

  const [items, setItems] = useState(generateNewItems);
  const [startTime, setStartTime] = useState(null);
  const [elapsed, setElapsed] = useState(null);
  const [isActive, setIsActive] = useState(false);
  const { currentUser } = useAuth();

  const resetRANSession = () => {
    setItems(generateNewItems());
    setStartTime(null);
    setElapsed(null);
    setIsActive(false);
  };

  const startTest = () => {
    setStartTime(Date.now());
    setIsActive(true);
  };

  const finishTest = async () => {
    const time = ((Date.now() - startTime) / 1000).toFixed(2);
    setElapsed(time);
    setIsActive(false);
    await saveTherapyProgress(currentUser, 'naming', Math.round(100 - parseFloat(time)), 100, `${time}s`);
  };

  return (
    <div className="exercise-session">
      <h3>Rapid Automated Naming (RAN)</h3>
      <p className="exercise-desc">Name each symbol or item aloud from left to right as quickly and accurately as possible.</p>
      
      <div className="naming-grid">
        {items.map((item, idx) => (
          <div key={idx} className="naming-tile">{item}</div>
        ))}
      </div>

      {!isActive && !elapsed && (
        <button className="btn-finish" onClick={startTest}>⏱️ Ready? Start Timer</button>
      )}
      {isActive && (
        <button className="btn-finish" style={{ background: 'var(--lf-rose)' }} onClick={finishTest}>⏹️ Finish & Stop Timer</button>
      )}
      {elapsed && (
        <div className="exercise-completion-card">
          <div className="completion-trophy">⚡</div>
          <h4 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--lf-primary)', marginBottom: '0.5rem' }}>RAN Session Complete!</h4>
          <p style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--lf-teal)', marginBottom: '1.5rem' }}>Completion Time: {elapsed} seconds</p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="btn-finish" style={{ background: 'linear-gradient(135deg, #ff7675, #d63031)', boxShadow: '0 4px 15px rgba(214,48,49,0.3)' }} onClick={resetRANSession}>
              🔄 PLAY AGAIN
            </button>
            <button className="btn-secondary" onClick={resetRANSession}>Practice New Symbol Set</button>
            <button className="btn-finish" onClick={onComplete}>Complete & View Dashboard →</button>
          </div>
        </div>
      )}
    </div>
  );
};

const ExerciseSystem = ({ type, onComplete }) => {
  const [exerciseStats, setExerciseStats] = useState(null);
  const [isAdvanced, setIsAdvanced] = useState(false);
  const [sessionMode, setSessionMode] = useState(() => {
    return localStorage.getItem('lexiflow_therapy_mode') || 'assessment';
  });
  const { currentUser } = useAuth();

  const [showFullAnalytics, setShowFullAnalytics] = useState(false);

  useEffect(() => {
    if (!currentUser) return;
    const historyKey = `lexiflow_exercise_history_${currentUser.uid}`;
    const history = JSON.parse(localStorage.getItem(historyKey) || localStorage.getItem('lexiflow_exercise_history') || '{}');
    const typeStats = history[type] || { pb: '3020 pts', pb_val: 3020, sessions: 1, accuracy: '67%', trend: 'Stable', level: 'Intermediate', lastPlayed: 'Recent' };
    setExerciseStats(typeStats);
  }, [type, currentUser]);

  const toggleAdvanced = () => {
    setIsAdvanced(!isAdvanced);
  };

  return (
    <div className="exercise-container-flat">
        {showFullAnalytics && type !== 'video' && <aside className="exercise-stats-sidebar">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span className="medical-label" style={{ margin: 0 }}>PERFORMANCE</span>
            <button 
              onClick={toggleAdvanced}
              style={{
                background: isAdvanced ? 'var(--lf-primary)' : '#ffffff',
                color: isAdvanced ? '#ffffff' : 'var(--lf-text-secondary)',
                border: '1px solid var(--lf-border)',
                borderRadius: 'var(--lf-radius-sm)',
                padding: '3px 8px',
                fontSize: '0.7rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              {isAdvanced ? 'ADVANCED MODE' : 'NORMAL MODE'}
            </button>
          </div>
          
          <div className="ex-stat-card-mini">
            <div className="ex-stat-icon-wrap indigo">🏆</div>
            <div>
              <small className="medical-label">PERSONAL BEST</small>
              <span className="ex-stat-val-big">{exerciseStats?.pb || '3020 pts'}</span>
            </div>
          </div>

          <div className="ex-stat-card-mini">
            <div className="ex-stat-icon-wrap teal">🎯</div>
            <div>
              <small className="medical-label">ACCURACY RATE</small>
              <span className="ex-stat-val-big" style={{ color: 'var(--lf-teal)' }}>{exerciseStats?.accuracy || '67%'}</span>
            </div>
          </div>

          <div className="ex-stat-card-mini">
            <div className="ex-stat-icon-wrap amber">⭐</div>
            <div>
              <small className="medical-label">CURRENT LEVEL</small>
              <span className="badge badge-mod" style={{ marginTop: '2px' }}>
                {isAdvanced ? 'Advanced Tier' : (exerciseStats?.level || 'Intermediate')}
              </span>
            </div>
          </div>

          <div className="analysis-box">
            <h5 style={{ margin: '0 0 0.85rem 0', fontSize: '0.8rem', fontWeight: 800, color: 'var(--lf-text-primary)' }}>MODULE ANALYSIS</h5>
            <div style={{ fontSize: '0.78rem', color: 'var(--lf-text-secondary)', lineHeight: '1.65' }}>
              <p>• <strong>Frequency:</strong> {exerciseStats?.sessions || 1} session(s)</p>
              <p>• <strong>Last Played:</strong> {exerciseStats?.lastPlayed || 'Just now'}</p>
              <p>• <strong>Progress Trend:</strong> {exerciseStats?.trend === 'Improving' ? '📈 Improving' : exerciseStats?.trend === 'Needs Practice' ? '💡 Needs Practice' : '➡️ Stable'}</p>
              <p>• <strong>Focus Area:</strong> {type === 'phoneme' ? 'Phonological Decoding' : type === 'visual' ? 'Visual Tracking' : 'Linguistic Retrieval'}</p>
            </div>
            
            <div className="velocity-bar-container">
              {[40, 65, 55, 80, 75, 90].map((h, i) => (
                <div key={i} className="velocity-bar-item" style={{ height: `${h}%` }}></div>
              ))}
            </div>
            <small style={{ display: 'block', textAlign: 'center', marginTop: '6px', fontSize: '0.65rem', color: 'var(--lf-text-muted)', fontWeight: 600 }}>Accuracy Velocity (Last 6 Sessions)</small>
          </div>
        </aside>}

        <div className="exercise-content-area">
          {/* Top Quick-Stats Header Bar for Theatrical Full-Width Game View */}
          <div style={{
            width: '100%',
            background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)',
            border: '1.5px solid rgba(251,191,36,0.35)',
            borderRadius: '16px',
            padding: '0.65rem 1.25rem',
            marginBottom: '0.85rem',
            color: '#f8fafc',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            boxShadow: '0 4px 15px rgba(0,0,0,0.2)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', fontSize: '0.85rem', fontWeight: 800 }}>
              <span>🏆 Personal Best: <strong style={{ color: '#fbbf24' }}>{exerciseStats?.pb || '3020 pts'}</strong></span>
              <span>🎯 Accuracy: <strong style={{ color: '#4ade80' }}>{exerciseStats?.accuracy || '67%'}</strong></span>
              <span>⭐ Level: <strong style={{ color: '#38bdf8' }}>{isAdvanced ? 'Advanced Tier' : (exerciseStats?.level || 'Intermediate')}</strong></span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
              <button 
                onClick={toggleAdvanced}
                style={{
                  background: isAdvanced ? '#3b82f6' : 'rgba(255,255,255,0.1)',
                  color: '#ffffff',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '50px',
                  padding: '4px 12px',
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  cursor: 'pointer'
                }}
              >
                {isAdvanced ? '🔥 ADVANCED' : '⚙️ NORMAL'}
              </button>
              <button 
                onClick={() => setShowFullAnalytics(!showFullAnalytics)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '0.78rem', textDecoration: 'underline', cursor: 'pointer', fontWeight: 700 }}
              >
                {showFullAnalytics ? 'Hide Analytics ▲' : 'View Full Analytics ▾'}
              </button>
              {/* Priority 7: Assessment vs Practice Mode Toggle */}
              <button
                onClick={() => {
                  const next = sessionMode === 'assessment' ? 'practice' : 'assessment';
                  setSessionMode(next);
                  localStorage.setItem('lexiflow_therapy_mode', next);
                }}
                style={{
                  background: sessionMode === 'assessment' ? 'rgba(20, 184, 166, 0.15)' : 'rgba(251, 191, 36, 0.15)',
                  color: sessionMode === 'assessment' ? '#14b8a6' : '#f59e0b',
                  border: `1px solid ${sessionMode === 'assessment' ? 'rgba(20, 184, 166, 0.3)' : 'rgba(251, 191, 36, 0.3)'}`,
                  borderRadius: '50px',
                  padding: '4px 14px',
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  cursor: 'pointer'
                }}
                title={sessionMode === 'assessment' ? 'Results feed the dashboard' : 'Practice only — results do NOT feed the dashboard'}
              >
                {sessionMode === 'assessment' ? '📊 Assessment Mode' : '🎮 Practice Mode'}
              </button>
            </div>
          </div>

          {type === 'visual' && <MirrorMatchHighway onComplete={onComplete} />}
          {type === 'phoneme' && <MarioPhonemeJumper onComplete={onComplete} />}
          {type === 'auditory' && <AuditoryProcessingSuite onComplete={onComplete} />}
          {type === 'morphology' && <MorphoSnake onComplete={onComplete} />}
          {type === 'naming' && <BalloonPopRAN onComplete={onComplete} />}
          {type === 'video' && <VideoPractice onComplete={onComplete} />}
        </div>
    </div>
  );
};

export default ExerciseSystem;

