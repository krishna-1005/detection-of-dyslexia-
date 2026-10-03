import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { saveTherapyProgress } from './ExerciseSystem';
import { fetchWithAuth } from '../../services/api';
import SparkyCharacter from './characters/SparkyCharacter';
import './MorphologyQuest.css';

// ── Web Audio Synthesizer Engine ──
const playSFX = (type) => {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'correct') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.18);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.22);
      osc.start();
      osc.stop(ctx.currentTime + 0.22);
    } else if (type === 'wrong') {
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

const shuffleArray = (arr) => {
  const newArr = [...arr];
  for (let i = newArr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
  }
  return newArr;
};

// ── MORPHOLOGY LEVEL POOLS ──
const EASY_MORPH_POOL = [
  { root: 'Play', instruction: 'Select the word that means "someone who plays".', targetWord: 'Player', hint: 'Suffix -er means a person who does', choices: [{ text: 'Played', hint: 'Past tense (-ed)', isCorrect: false }, { text: 'Player', hint: 'Suffix -er (person)', isCorrect: true }, { text: 'Playful', hint: 'Full of play (-ful)', isCorrect: false }] },
  { root: 'Happy', instruction: 'Select the word that means "not happy".', targetWord: 'Unhappy', hint: 'Prefix un- means NOT', choices: [{ text: 'Happily', hint: 'Adverb (-ly)', isCorrect: false }, { text: 'Unhappy', hint: 'Prefix un- (not)', isCorrect: true }, { text: 'Happiness', hint: 'State of being (-ness)', isCorrect: false }] },
  { root: 'Care', instruction: 'Select the word that means "without care".', targetWord: 'Careless', hint: 'Suffix -less means WITHOUT', choices: [{ text: 'Careful', hint: 'Full of care (-ful)', isCorrect: false }, { text: 'Careless', hint: 'Without care (-less)', isCorrect: true }, { text: 'Caring', hint: 'Present participle (-ing)', isCorrect: false }] },
  { root: 'Hope', instruction: 'Select the word that means "full of hope".', targetWord: 'Hopeful', hint: 'Suffix -ful means FULL OF', choices: [{ text: 'Hopeless', hint: 'Without hope (-less)', isCorrect: false }, { text: 'Hopeful', hint: 'Full of hope (-ful)', isCorrect: true }, { text: 'Hoping', hint: 'Action (-ing)', isCorrect: false }] },
  { root: 'Lock', instruction: 'Select the word that means "to open a lock".', targetWord: 'Unlock', hint: 'Prefix un- means to reverse or undo', choices: [{ text: 'Locked', hint: 'Past tense (-ed)', isCorrect: false }, { text: 'Unlock', hint: 'Prefix un- (undo)', isCorrect: true }, { text: 'Locker', hint: 'Container (-er)', isCorrect: false }] },
  { root: 'Help', instruction: 'Select the word that means "full of help".', targetWord: 'Helpful', hint: 'Suffix -ful means FULL OF', choices: [{ text: 'Helper', hint: 'Person helping (-er)', isCorrect: false }, { text: 'Helpful', hint: 'Full of help (-ful)', isCorrect: true }, { text: 'Helpless', hint: 'Without help (-less)', isCorrect: false }] },
  { root: 'Kind', instruction: 'Select the word that means "not kind".', targetWord: 'Unkind', hint: 'Prefix un- means NOT', choices: [{ text: 'Kindly', hint: 'Adverb (-ly)', isCorrect: false }, { text: 'Unkind', hint: 'Prefix un- (not)', isCorrect: true }, { text: 'Kindness', hint: 'State of being (-ness)', isCorrect: false }] },
  { root: 'Fear', instruction: 'Select the word that means "without fear".', targetWord: 'Fearless', hint: 'Suffix -less means WITHOUT', choices: [{ text: 'Fearful', hint: 'Full of fear (-ful)', isCorrect: false }, { text: 'Fearless', hint: 'Without fear (-less)', isCorrect: true }, { text: 'Fearing', hint: 'Action (-ing)', isCorrect: false }] },
  { root: 'Pain', instruction: 'Select the word that means "without pain".', targetWord: 'Painless', hint: 'Suffix -less means WITHOUT', choices: [{ text: 'Painful', hint: 'Full of pain (-ful)', isCorrect: false }, { text: 'Painless', hint: 'Without pain (-less)', isCorrect: true }, { text: 'Pained', hint: 'Past tense (-ed)', isCorrect: false }] },
  { root: 'Teach', instruction: 'Select the word that means "someone who teaches".', targetWord: 'Teacher', hint: 'Suffix -er means a person who does', choices: [{ text: 'Teaches', hint: 'Present 3rd person (-es)', isCorrect: false }, { text: 'Teacher', hint: 'Suffix -er (person)', isCorrect: true }, { text: 'Teaching', hint: 'Action (-ing)', isCorrect: false }] }
];

const MEDIUM_MORPH_POOL = [
  { root: 'Act', instruction: 'Select the word that means "a person who acts".', targetWord: 'Actor', hint: 'Suffix -or indicates a person who performs an action', choices: [{ text: 'Action', hint: 'Noun (-tion)', isCorrect: false }, { text: 'Actor', hint: 'Suffix -or (person)', isCorrect: true }, { text: 'Active', hint: 'Adjective (-ive)', isCorrect: false }] },
  { root: 'Read', instruction: 'Select the word that means "easy to read".', targetWord: 'Readable', hint: 'Suffix -able means CAPABLE OF', choices: [{ text: 'Reading', hint: 'Action (-ing)', isCorrect: false }, { text: 'Readable', hint: 'Capable of (-able)', isCorrect: true }, { text: 'Misread', hint: 'Read wrongly (mis-)', isCorrect: false }] },
  { root: 'Move', instruction: 'Select the word that means "able to be moved".', targetWord: 'Movable', hint: 'Suffix -able means ABLE TO BE', choices: [{ text: 'Movement', hint: 'State of moving (-ment)', isCorrect: false }, { text: 'Movable', hint: 'Able to be moved (-able)', isCorrect: true }, { text: 'Unmoved', hint: 'Not moved (un-)', isCorrect: false }] },
  { root: 'Use', instruction: 'Select the word that means "able to be used again".', targetWord: 'Reusable', hint: 'Prefix re- (again) + Suffix -able (capable of)', choices: [{ text: 'Useful', hint: 'Full of use (-ful)', isCorrect: false }, { text: 'Useless', hint: 'Without use (-less)', isCorrect: false }, { text: 'Reusable', hint: 'Re- (again) + -able', isCorrect: true }] },
  { root: 'View', instruction: 'Select the word that means "to look at beforehand".', targetWord: 'Preview', hint: 'Prefix pre- means BEFORE', choices: [{ text: 'Viewer', hint: 'Person looking (-er)', isCorrect: false }, { text: 'Preview', hint: 'Prefix pre- (before)', isCorrect: true }, { text: 'Review', hint: 'Look again (re-)', isCorrect: false }] },
  { root: 'Port', instruction: 'Select the word that means "able to be carried".', targetWord: 'Portable', hint: 'Suffix -able means ABLE TO BE', choices: [{ text: 'Export', hint: 'Carry out (ex-)', isCorrect: false }, { text: 'Portable', hint: 'Able to be carried (-able)', isCorrect: true }, { text: 'Porter', hint: 'Person carrying (-er)', isCorrect: false }] },
  { root: 'Pay', instruction: 'Select the word that means "to pay back or pay again".', targetWord: 'Repay', hint: 'Prefix re- means AGAIN or BACK', choices: [{ text: 'Payment', hint: 'State of paying (-ment)', isCorrect: false }, { text: 'Repay', hint: 'Prefix re- (again)', isCorrect: true }, { text: 'Payee', hint: 'Person receiving (-ee)', isCorrect: false }] },
  { root: 'Agree', instruction: 'Select the word that means "to not agree".', targetWord: 'Disagree', hint: 'Prefix dis- means NOT', choices: [{ text: 'Agreement', hint: 'State of agreeing (-ment)', isCorrect: false }, { text: 'Disagree', hint: 'Prefix dis- (not)', isCorrect: true }, { text: 'Agreeable', hint: 'Able to agree (-able)', isCorrect: false }] },
  { root: 'Like', instruction: 'Select the word that means "not like or to not enjoy".', targetWord: 'Dislike', hint: 'Prefix dis- means NOT', choices: [{ text: 'Likely', hint: 'Adverb (-ly)', isCorrect: false }, { text: 'Dislike', hint: 'Prefix dis- (not)', isCorrect: true }, { text: 'Liking', hint: 'State of liking (-ing)', isCorrect: false }] },
  { root: 'Pack', instruction: 'Select the word that means "to open or empty a pack".', targetWord: 'Unpack', hint: 'Prefix un- means to undo or reverse', choices: [{ text: 'Package', hint: 'Container (-age)', isCorrect: false }, { text: 'Unpack', hint: 'Prefix un- (undo)', isCorrect: true }, { text: 'Packer', hint: 'Person packing (-er)', isCorrect: false }] }
];

const HARD_MORPH_POOL = [
  { root: 'Flex', instruction: 'Select the word that means "capable of bending".', targetWord: 'Flexible', hint: 'Suffix -ible means CAPABLE OF', choices: [{ text: 'Flexible', hint: 'Capable of bending (-ible)', isCorrect: true }, { text: 'Reflex', hint: 'Automatic response', isCorrect: false }, { text: 'Flexibility', hint: 'State of flexibility (-ity)', isCorrect: false }] },
  { root: 'Form', instruction: 'Select the word that means "to change shape or structure".', targetWord: 'Transform', hint: 'Prefix trans- means ACROSS or CHANGE', choices: [{ text: 'Format', hint: 'Arrangement (-at)', isCorrect: false }, { text: 'Transform', hint: 'Prefix trans- (change)', isCorrect: true }, { text: 'Formless', hint: 'Without shape (-less)', isCorrect: false }] },
  { root: 'Create', instruction: 'Select the word that means "having the ability to create".', targetWord: 'Creative', hint: 'Suffix -ive means HAVING THE QUALITY OF', choices: [{ text: 'Creator', hint: 'Person who creates (-or)', isCorrect: false }, { text: 'Creative', hint: 'Quality of (-ive)', isCorrect: true }, { text: 'Creation', hint: 'Thing created (-tion)', isCorrect: false }] },
  { root: 'Direct', instruction: 'Select the word that means "not direct".', targetWord: 'Indirect', hint: 'Prefix in- means NOT', choices: [{ text: 'Director', hint: 'Person directing (-or)', isCorrect: false }, { text: 'Direction', hint: 'Path (-tion)', isCorrect: false }, { text: 'Indirect', hint: 'Prefix in- (not)', isCorrect: true }] },
  { root: 'Struct', instruction: 'Select the word that means "to build together".', targetWord: 'Construct', hint: 'Prefix con- means TOGETHER or WITH', choices: [{ text: 'Structure', hint: 'Building frame (-ure)', isCorrect: false }, { text: 'Construct', hint: 'Prefix con- (together)', isCorrect: true }, { text: 'Destruct', hint: 'Break down (de-)', isCorrect: false }] },
  { root: 'Script', instruction: 'Select the word that means "a written copy or record".', targetWord: 'Transcript', hint: 'Prefix trans- (across/copy) + Script (write)', choices: [{ text: 'Scribble', hint: 'Careless writing', isCorrect: false }, { text: 'Transcript', hint: 'Written copy (trans-)', isCorrect: true }, { text: 'Subscribe', hint: 'Under-write (sub-)', isCorrect: false }] },
  { root: 'Tract', instruction: 'Select the word that means "to draw toward oneself".', targetWord: 'Attract', hint: 'Prefix at- (ad-) means TOWARD', choices: [{ text: 'Tractor', hint: 'Drawing vehicle (-or)', isCorrect: false }, { text: 'Attract', hint: 'Prefix at- (toward)', isCorrect: true }, { text: 'Subtract', hint: 'Draw away (sub-)', isCorrect: false }] },
  { root: 'Bio', instruction: 'Select the word that means "the study of living things".', targetWord: 'Biology', hint: 'Suffix -logy means THE STUDY OF', choices: [{ text: 'Biology', hint: 'Study of life (-logy)', isCorrect: true }, { text: 'Biography', hint: 'Written life story (-graphy)', isCorrect: false }, { text: 'Autobiography', hint: 'Self-written story (auto-)', isCorrect: false }] },
  { root: 'Dict', instruction: 'Select the word that means "to speak or say beforehand".', targetWord: 'Predict', hint: 'Prefix pre- means BEFORE', choices: [{ text: 'Dictator', hint: 'Absolute ruler (-or)', isCorrect: false }, { text: 'Predict', hint: 'Prefix pre- (before)', isCorrect: true }, { text: 'Dictionary', hint: 'Book of words (-ionary)', isCorrect: false }] },
  { root: 'Vis', instruction: 'Select the word that means "not able to be seen".', targetWord: 'Invisible', hint: 'Prefix in- means NOT + -ible (able to be)', choices: [{ text: 'Visible', hint: 'Able to be seen (-ible)', isCorrect: false }, { text: 'Vision', hint: 'Sense of sight (-ion)', isCorrect: false }, { text: 'Invisible', hint: 'Prefix in- (not)', isCorrect: true }] }
];

const LEVEL_POOLS = {
  easy: EASY_MORPH_POOL,
  medium: MEDIUM_MORPH_POOL,
  hard: HARD_MORPH_POOL,
};

const MorphologyQuest = ({ onComplete }) => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const uid = currentUser?.uid || 'guest';
  const userName = currentUser?.displayName?.split(' ')[0] || 'Krish';

  // Game state
  const [difficulty, setDifficulty] = useState('easy'); // 'easy' | 'medium' | 'hard'
  const [missionIdx, setMissionIdx] = useState(0);
  const [xp, setXp] = useState(150);
  const [streak, setStreak] = useState(4);
  const [reactorEnergy, setReactorEnergy] = useState(40);
  const [selectedChoice, setSelectedChoice] = useState(null);
  const [isAiLoading, setIsAiLoading] = useState(false);

  // Modal & Telemetry state
  const [isMissionCompleteModal, setIsMissionCompleteModal] = useState(false);
  const [autoAdvanceCountdown, setAutoAdvanceCountdown] = useState(10);
  const [questionStartTime, setQuestionStartTime] = useState(() => Date.now());

  const [activeMissions, setActiveMissions] = useState(() => {
    return shuffleArray(EASY_MORPH_POOL).map(m => ({
      ...m,
      choices: shuffleArray(m.choices)
    }));
  });

  const [roundAnalytics, setRoundAnalytics] = useState({
    easy: { totalTimeMs: 0, mistakes: 0, rootStats: {} },
    medium: { totalTimeMs: 0, mistakes: 0, rootStats: {} },
    hard: { totalTimeMs: 0, mistakes: 0, rootStats: {} },
  });

  const [sparkyState, setSparkyState] = useState('idle');
  const [sparkyMessage, setSparkyMessage] = useState('Welcome to the Morpheme Explorer Lab! Let\'s build mega words!');

  // Select Level
  const handleSelectLevel = (newLevel) => {
    playSFX('correct');
    setDifficulty(newLevel);
    setMissionIdx(0);
    const pool = LEVEL_POOLS[newLevel] || EASY_MORPH_POOL;
    setActiveMissions(shuffleArray(pool).map(m => ({ ...m, choices: shuffleArray(m.choices) })));
    setSparkyState('happy');
    setSparkyMessage(`Switched to ${newLevel.toUpperCase()} Morpheme Lab! Ready to build! 🧬`);
    speakText(`Switched to ${newLevel} difficulty level!`);
  };

  const handleNextMission = () => {
    setIsMissionCompleteModal(false);
    if (difficulty === 'easy') {
      handleSelectLevel('medium');
    } else if (difficulty === 'medium') {
      handleSelectLevel('hard');
    } else {
      handleSelectLevel('easy');
    }
    setReactorEnergy(50);
  };

  const handlePlayAgain = () => {
    playSFX('correct');
    setIsMissionCompleteModal(false);
    handleSelectLevel('easy');
    setReactorEnergy(50);
  };

  // 10s auto-advance countdown
  useEffect(() => {
    let timerId = null;
    if (isMissionCompleteModal && (difficulty === 'easy' || difficulty === 'medium')) {
      setAutoAdvanceCountdown(10);
      timerId = setInterval(() => {
        setAutoAdvanceCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timerId);
            handleNextMission();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => { if (timerId) clearInterval(timerId); };
  }, [isMissionCompleteModal, difficulty]);

  const currentMission = activeMissions[missionIdx % activeMissions.length] || EASY_MORPH_POOL[0];

  useEffect(() => {
    setSelectedChoice(null);
    setQuestionStartTime(Date.now());
    setSparkyMessage(`Root Word: "${currentMission.root}" • ${currentMission.instruction}`);
  }, [missionIdx, currentMission]);

  const handleChoiceClick = (choice) => {
    if (selectedChoice !== null) return;
    setSelectedChoice(choice);
    const responseTimeMs = Math.max(200, Date.now() - questionStartTime);
    const isCorrect = choice.isCorrect;

    playSFX(isCorrect ? 'correct' : 'wrong');

    // Telemetry update
    setRoundAnalytics((prev) => {
      const current = prev[difficulty] || { totalTimeMs: 0, mistakes: 0, rootStats: {} };
      const rootKey = currentMission.root;
      const existingRoot = current.rootStats[rootKey] || { mistakes: 0, targetWord: currentMission.targetWord };
      return {
        ...prev,
        [difficulty]: {
          totalTimeMs: current.totalTimeMs + responseTimeMs,
          mistakes: current.mistakes + (isCorrect ? 0 : 1),
          rootStats: {
            ...current.rootStats,
            [rootKey]: {
              mistakes: existingRoot.mistakes + (isCorrect ? 0 : 1),
              targetWord: currentMission.targetWord,
            }
          }
        }
      };
    });

    if (isCorrect) {
      setXp(prev => prev + 25);
      setStreak(prev => prev + 1);
      setReactorEnergy(prev => Math.min(100, prev + 15));
      setSparkyState('thumbsUp');
      setSparkyMessage(`✨ Awesome! "${choice.text}" is derived correctly! 🌟`);
    } else {
      setSparkyState('tryAgain');
      setSparkyMessage(`Oops! ${choice.text} isn't right. 💡 ${choice.hint}`);
    }

    setTimeout(() => {
      setSelectedChoice(null);
      if (isCorrect) {
        const isLastQuestionOfRound = (missionIdx + 1) % 5 === 0;
        if (isLastQuestionOfRound) {
          setIsMissionCompleteModal(true);
        } else {
          setMissionIdx(prev => prev + 1);
        }
      }
    }, 750);
  };

  const loadAiMissions = async () => {
    setIsAiLoading(true);
    setSparkyState('thinking');
    setSparkyMessage('🤖 Gemini AI is generating new morphology missions...');
    setTimeout(() => {
      setActiveMissions(shuffleArray(EASY_MORPH_POOL.concat(MEDIUM_MORPH_POOL)).map(m => ({ ...m, choices: shuffleArray(m.choices) })));
      setMissionIdx(0);
      setIsAiLoading(false);
      setSparkyState('happy');
      setSparkyMessage('✨ New AI Morphology Missions Loaded!');
    }, 800);
  };

  const handleFinishSession = async () => {
    await saveTherapyProgress(currentUser, 'morphology', xp, 95, 'Morphology Quest');
    if (onComplete) onComplete();
    else navigate('/dashboard');
  };

  return (
    <div className="morph-quest-page">
      <div className="mq-floating-dna p1" />
      <div className="mq-floating-dna p2" />

      <main className="mq-viewport">
        {/* HUD HEADER */}
        <header className="mq-hud-header">
          <div className="mq-hud-title-box">
            <div className="mq-hud-icon">🧬</div>
            <div>
              <h1 className="mq-hud-title">MORPHOLOGY BUILDER ARCADE</h1>
              <div className="mq-hud-subtitle">Word Structure & Morpheme Lab</div>
            </div>
          </div>

          <div className="mq-level-switcher-bar">
            <button className={`mq-level-btn easy ${difficulty === 'easy' ? 'active' : ''}`} onClick={() => handleSelectLevel('easy')}>
              🟢 Easy
            </button>
            <button className={`mq-level-btn medium ${difficulty === 'medium' ? 'active' : ''}`} onClick={() => handleSelectLevel('medium')}>
              🟡 Medium
            </button>
            <button className={`mq-level-btn hard ${difficulty === 'hard' ? 'active' : ''}`} onClick={() => handleSelectLevel('hard')}>
              🔴 Hard
            </button>
          </div>

          <div className="mq-hud-stats">
            <button onClick={loadAiMissions} disabled={isAiLoading} style={{ background: 'linear-gradient(135deg, #a855f7, #7c3aed)', color: '#fff', border: 'none', padding: '6px 14px', borderRadius: '50px', fontWeight: 800, cursor: 'pointer' }}>
              {isAiLoading ? '🤖 Generating...' : '✨ AI Missions'}
            </button>
            <div className="mq-hud-stat-pill">⭐ {xp} XP</div>
            <div className="mq-hud-stat-pill">🔥 {streak} Streak</div>
            <div className="mq-hud-stat-pill">👦 {userName}</div>
          </div>
        </header>

        {/* MAIN GAME OR ROUND COMPLETE MODAL */}
        {isMissionCompleteModal ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem 0' }}>
            <div style={{ background: 'linear-gradient(135deg, #1e293b, #0f172a)', border: '4px solid #38bdf8', borderRadius: '32px', padding: '2.5rem', maxWidth: '650px', width: '100%', textAlign: 'center' }}>
              <span style={{ fontSize: '3.5rem', display: 'block', marginBottom: '0.5rem' }}>
                {difficulty === 'easy' ? '🏆 🟢 ✨' : difficulty === 'medium' ? '🏆 🟡 🧬' : '👑 🔴 🌟'}
              </span>
              <h2 style={{ fontSize: '2rem', fontWeight: 900, color: '#fff', margin: '0 0 0.5rem 0' }}>
                {difficulty === 'easy' ? 'ROUND 1 (EASY) COMPLETE!' : difficulty === 'medium' ? 'ROUND 2 (MEDIUM) COMPLETE!' : 'GRAND CHAMPION! ALL 3 ROUNDS MASTERED!'}
              </h2>
              <p style={{ color: '#cbd5e1', marginBottom: '1.5rem' }}>
                {difficulty === 'hard'
                  ? 'Unbelievable work! You mastered Easy, Medium, and Hard morphological structure challenges!'
                  : `Round complete! Round ${difficulty === 'easy' ? '2 (Medium)' : '3 (Hard)'} starting automatically in ${autoAdvanceCountdown}s...`}
              </p>

              {/* Round Telemetry */}
              {(() => {
                const currentRound = roundAnalytics[difficulty] || { totalTimeMs: 0, mistakes: 0, rootStats: {} };
                const timeSec = (currentRound.totalTimeMs / 1000).toFixed(1);
                const mistakesCount = currentRound.mistakes;

                return (
                  <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: '20px', padding: '1rem', marginBottom: '1.5rem', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                    <div>
                      <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>⏱️ Round Time</span>
                      <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#fff' }}>{timeSec}s</div>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>🎯 Mistakes</span>
                      <div style={{ fontSize: '1.25rem', fontWeight: 900, color: mistakesCount === 0 ? '#10b981' : '#ef4444' }}>
                        {mistakesCount === 0 ? '✨ 0 (Perfect!)' : `${mistakesCount} Mistakes`}
                      </div>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>⭐ XP Earned</span>
                      <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#fbbf24' }}>+125 XP</div>
                    </div>
                  </div>
                );
              })()}

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '14px', justifyContent: 'center', flexWrap: 'wrap' }}>
                <button
                  onClick={handlePlayAgain}
                  style={{ background: 'linear-gradient(135deg, #ff7675, #d63031)', border: 'none', color: '#ffffff', padding: '14px 24px', borderRadius: '50px', fontWeight: 800, fontSize: '1rem', cursor: 'pointer', boxShadow: '0 4px 15px rgba(214, 48, 49, 0.4)' }}
                >
                  🔄 PLAY AGAIN
                </button>
                {difficulty !== 'hard' && (
                  <button onClick={handleNextMission} style={{ background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none', color: '#fff', padding: '14px 24px', borderRadius: '50px', fontWeight: 800, fontSize: '1rem', cursor: 'pointer' }}>
                    START ROUND {difficulty === 'easy' ? '2' : '3'} NOW 🚀 ({autoAdvanceCountdown}s)
                  </button>
                )}
                <button onClick={handleFinishSession} style={{ background: 'rgba(255, 255, 255, 0.1)', color: '#ffffff', border: '2px solid rgba(255, 255, 255, 0.2)', padding: '14px 24px', borderRadius: '50px', fontSize: '1rem', fontWeight: 700, cursor: 'pointer' }}>
                  MISSION HQ 🏠
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="mq-game-grid">
            {/* Left: Challenge Card */}
            <div className="mq-mission-card">
              <div className="mq-sparky-row">
                <SparkyCharacter state={sparkyState} size={90} />
                <div className="mq-speech-bubble">{sparkyMessage}</div>
              </div>

              <div className="mq-question-banner">
                <div>
                  <span style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 800 }}>ROOT WORD:</span>
                  <div className="mq-root-badge">{currentMission.root}</div>
                </div>
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: '0.75rem', color: '#38bdf8', fontWeight: 800, textTransform: 'uppercase' }}>CHALLENGE INSTRUCTION</span>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#fff' }}>{currentMission.instruction}</h3>
                </div>
                <button onClick={() => speakText(`Root word: ${currentMission.root}. ${currentMission.instruction}`)} style={{ background: 'rgba(56, 189, 248, 0.2)', border: '1px solid #38bdf8', color: '#38bdf8', padding: '6px 14px', borderRadius: '50px', fontWeight: 800, cursor: 'pointer' }}>
                  🔊 Listen
                </button>
              </div>

              {/* Choices Grid */}
              <div className="mq-answers-grid">
                {currentMission.choices.map((choice, idx) => {
                  const isSelected = selectedChoice?.text === choice.text;
                  const cardClass = isSelected ? (choice.isCorrect ? 'correct' : 'wrong') : '';

                  return (
                    <div key={idx} className={`mq-answer-card ${cardClass}`} onClick={() => handleChoiceClick(choice)}>
                      <span className="mq-word-text">{choice.text}</span>
                      <span className="mq-word-hint">{choice.hint}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Side Panel */}
            <div className="mq-side-panel">
              <div className="mq-reactor-card">
                <h3 style={{ margin: '0 0 6px 0', fontSize: '1rem', color: '#a855f7' }}>🧬 DNA Morpheme Reactor</h3>
                <div className="mq-reactor-gauge">
                  <div className="mq-reactor-fill" style={{ width: `${reactorEnergy}%` }} />
                </div>
                <span style={{ fontSize: '0.85rem', color: '#cbd5e1', fontWeight: 700 }}>
                  Energy: {reactorEnergy}% • Complete rounds to unlock Morpheme Master status!
                </span>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default MorphologyQuest;
