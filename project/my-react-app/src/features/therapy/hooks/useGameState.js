import { useState, useCallback, useRef, useEffect } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { saveTherapyProgress } from '../ExerciseSystem';

// ─────────────────────────────────────────────────────────────────
// TARGET PHONEME DATASET (reused from PhonemeAnalyzer)
// ─────────────────────────────────────────────────────────────────
export const TARGET_PHONEMES = [
  {
    id: 'b',
    symbol: '/b/',
    word: 'Ball',
    example: 'Make the sound: /b/ as in Ball',
    phoneticNote: 'Voiced bilabial plosive',
    tips: {
      success: 'AMAZING BLAST! You unlocked a Sound Power Gem! +25 XP!',
      close: 'Oops! Close attempt! Sparky heard a different sound—try to focus on the soft /b/ sound again!',
      miss: 'Not quite, Cadet! Press your lips together softly and let the /b/ sound burst out!',
    },
  },
  {
    id: 'ch',
    symbol: '/ch/',
    word: 'Chair',
    example: 'Make the sound: /ch/ as in Chair',
    phoneticNote: 'Voiceless postalveolar affricate',
    tips: {
      success: 'STELLAR SHOT! Your tongue placement was spot-on! +25 XP!',
      close: 'Almost there! Try blocking the airflow with your tongue tip first, then release sharply!',
      miss: 'Let\'s try again! Place your tongue behind your top teeth and push air out quickly!',
    },
  },
  {
    id: 'sh',
    symbol: '/sh/',
    word: 'Shadow',
    example: 'Make the sound: /sh/ as in Shadow',
    phoneticNote: 'Voiceless postalveolar fricative',
    tips: {
      success: 'SONIC BOOM! Perfect airflow control, Cadet! +25 XP!',
      close: 'So close! Round your lips a little more and blow air softly!',
      miss: 'Try again! Keep your lips rounded like blowing a candle and say shhhh!',
    },
  },
  {
    id: 'th',
    symbol: '/th/',
    word: 'Think',
    example: 'Make the sound: /th/ as in Think',
    phoneticNote: 'Voiceless dental fricative',
    tips: {
      success: 'THUNDER BLAST! Perfect dental fricative! +25 XP!',
      close: 'Nearly perfect! Make sure your tongue peeks out between your teeth!',
      miss: 'Place your tongue gently between your teeth and blow air—you\'ve got this!',
    },
  },
  {
    id: 'p',
    symbol: '/p/',
    word: 'Pen',
    example: 'Make the sound: /p/ as in Pen',
    phoneticNote: 'Voiceless bilabial plosive',
    tips: {
      success: 'POWER SURGE! Crisp plosive burst, incredible! +25 XP!',
      close: 'Close! Make sure you don\'t vibrate your throat—keep it whisper-quiet!',
      miss: 'Press your lips together and pop out a quiet puff of air!',
    },
  },
  {
    id: 'f',
    symbol: '/f/',
    word: 'Fish',
    example: 'Make the sound: /f/ as in Fish',
    phoneticNote: 'Voiceless labiodental fricative',
    tips: {
      success: 'FREQUENCY LOCK! Perfect labiodental friction! +25 XP!',
      close: 'Almost! Touch your top teeth softly on your bottom lip!',
      miss: 'Rest your top teeth on your lower lip and blow steady air through!',
    },
  },
];

const XP_PER_SUCCESS = 25;
const XP_PER_RETRY = 5;
const XP_THRESHOLD = 100; // XP needed to level up

/**
 * useGameState
 *
 * Game state machine for the Sound-Blast Cannon mini-game.
 * Manages phases, XP, levels, session results, and simulated phoneme analysis.
 */
const useGameState = ({ onComplete } = {}) => {
  const { currentUser } = useAuth();
  const uid = currentUser?.uid;

  // ── Persisted XP/Level from localStorage ──
  const storageKey = uid ? `lexiflow_soundcannon_xp_${uid}` : 'lexiflow_soundcannon_xp';

  const loadSavedProgress = () => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) return JSON.parse(raw);
    } catch (e) { /* ignore */ }
    return { xp: 0, level: 1 };
  };

  const savedProgress = loadSavedProgress();

  // ── State ──
  const [gamePhase, setGamePhase] = useState('LISTENING');
  // IDLE | CHARGING | PROCESSING | BLAST_SUCCESS | BLAST_RETRY
  const [currentTargetIndex, setCurrentTargetIndex] = useState(0);
  const [xp, setXp] = useState(savedProgress.xp);
  const [level, setLevel] = useState(savedProgress.level);
  const [sessionResults, setSessionResults] = useState([]);
  const [accuracyScore, setAccuracyScore] = useState(0);
  const [sparkyMessage, setSparkyMessage] = useState('Ready your voice to fire the sound cannon, Cadet!');
  const [statusText, setStatusText] = useState('✦ Listening...');

  // Speech recognition refs
  const recognitionRef = useRef(null);
  const transcriptRef = useRef('');
  const isChargingRef = useRef(false);

  const currentTarget = TARGET_PHONEMES[currentTargetIndex];

  // Persist XP/level changes
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify({ xp, level }));
    } catch (e) { /* ignore */ }
  }, [xp, level, storageKey]);

  // ── Speech Recognition helpers ──
  const startSpeechRecognition = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      recognitionRef.current = recognition;

      recognition.onresult = (event) => {
        let text = '';
        for (let i = 0; i < event.results.length; ++i) {
          text += event.results[i][0].transcript;
        }
        transcriptRef.current = text;
      };

      recognition.onerror = () => { /* silently handle */ };

      recognition.onend = () => {
        if (isChargingRef.current && recognitionRef.current) {
          try { recognitionRef.current.start(); } catch (e) { /* ignore */ }
        }
      };

      recognition.start();
    } catch (err) {
      console.warn('SpeechRecognition start failed:', err);
    }
  }, []);

  const stopSpeechRecognition = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onend = null;
        recognitionRef.current.stop();
      } catch (e) { /* ignore */ }
      recognitionRef.current = null;
    }
  }, []);

  // ── Simulated Phoneme Evaluation ──
  const evaluatePhoneme = useCallback((speechText, peakEnergy) => {
    const target = TARGET_PHONEMES[currentTargetIndex];
    const cleanText = (speechText || '').toLowerCase().trim();
    const targetWordClean = target.word.toLowerCase();
    const targetSymbolClean = target.symbol.replace(/\//g, '').toLowerCase();

    let isDirectMatch = false;
    let isPartialMatch = false;

    if (cleanText.includes(targetWordClean) || cleanText.includes(targetSymbolClean)) {
      isDirectMatch = true;
    } else if (cleanText.length > 0) {
      if (
        cleanText.startsWith(targetSymbolClean.charAt(0)) ||
        targetWordClean.startsWith(cleanText.charAt(0))
      ) {
        isPartialMatch = true;
      }
    }

    let score = 0;
    let tipKey = 'miss';

    if (isDirectMatch) {
      score = Math.floor(88 + Math.random() * 12);
      tipKey = 'success';
    } else if (isPartialMatch || peakEnergy > 20) {
      score = Math.floor(65 + Math.random() * 20);
      tipKey = 'close';
    } else {
      score = Math.floor(40 + Math.random() * 20);
      tipKey = 'miss';
    }

    return { score, tipKey, tip: target.tips[tipKey] };
  }, [currentTargetIndex]);

  // ── Start Charging (button press) ──
  const startCharging = useCallback(() => {
    if (isChargingRef.current) return;
    isChargingRef.current = true;
    transcriptRef.current = '';

    setGamePhase('CHARGING');
    setAccuracyScore(0);
    setStatusText('✦ Listening...');
    setSparkyMessage('I can hear your voice charging up! Keep going!');

    startSpeechRecognition();
  }, [startSpeechRecognition]);

  // ── Stop Charging (button release) ──
  const stopCharging = useCallback(
    (peakEnergy) => {
      if (!isChargingRef.current) return;
      isChargingRef.current = false;

      stopSpeechRecognition();

      // Processing phase
      setGamePhase('PROCESSING');
      setStatusText('✦ Analyzing Tone...');
      setSparkyMessage('Sparky is analyzing your soundwave frequency...');

      // Simulate processing delay
      setTimeout(() => {
        const { score, tipKey, tip } = evaluatePhoneme(transcriptRef.current, peakEnergy);
        setAccuracyScore(score);

        const isSuccess = score >= 70;

        if (isSuccess) {
          setGamePhase('BLAST_SUCCESS');
          setStatusText('✦ Perfect Match!');
          setSparkyMessage(tip);

          // Award XP
          setXp((prev) => {
            const newXp = prev + XP_PER_SUCCESS;
            if (newXp >= XP_THRESHOLD) {
              setLevel((lvl) => lvl + 1);
              return newXp - XP_THRESHOLD;
            }
            return newXp;
          });
        } else {
          setGamePhase('BLAST_RETRY');
          setStatusText('✖ Incorrect - Try Again!');
          setSparkyMessage("Almost! Let's try making the sound again, Cadet!");

          // Small consolation XP
          setXp((prev) => {
            const newXp = prev + XP_PER_RETRY;
            if (newXp >= XP_THRESHOLD) {
              setLevel((lvl) => lvl + 1);
              return newXp - XP_THRESHOLD;
            }
            return newXp;
          });
        }

        // Record session result
        setSessionResults((prev) => [
          ...prev,
          {
            target: TARGET_PHONEMES[currentTargetIndex].symbol,
            word: TARGET_PHONEMES[currentTargetIndex].word,
            score,
            status: isSuccess ? 'Passed' : 'Retry',
          },
        ]);
      }, 800);
    },
    [evaluatePhoneme, stopSpeechRecognition, currentTargetIndex]
  );

  // ── Next Target ──
  const nextTarget = useCallback(() => {
    // Give time for any lingering animations to finish
    setTimeout(() => {
      setCurrentTargetIndex((prev) => (prev + 1) % TARGET_PHONEMES.length);
      setGamePhase('LISTENING');
      setAccuracyScore(0);
      setStatusText('✦ Listening...');
      setSparkyMessage('Ready your voice to fire the sound cannon, Cadet!');
      
      // Explicitly reset speech state
      isChargingRef.current = false;
      transcriptRef.current = '';
      stopSpeechRecognition();
    }, 800);
  }, [stopSpeechRecognition]);

  // ── Retry Target ──
  const retryTarget = useCallback(() => {
    setGamePhase('LISTENING');
    setAccuracyScore(0);
    setStatusText('✦ Listening...');
    setSparkyMessage('Ready your voice to fire the sound cannon, Cadet!');
    
    // Explicitly reset speech state
    isChargingRef.current = false;
    transcriptRef.current = '';
    stopSpeechRecognition();
  }, [stopSpeechRecognition]);

  // ── Cancel Blast (for dropped VAD durations) ──
  const cancelBlast = useCallback(() => {
    setGamePhase('LISTENING');
    setStatusText('✦ Listening...');
    setSparkyMessage('Ready your voice to fire the sound cannon, Cadet!');
    
    isChargingRef.current = false;
    transcriptRef.current = '';
    stopSpeechRecognition();
  }, [stopSpeechRecognition]);

  // ── Select specific target ──
  const selectTarget = useCallback((index) => {
    setCurrentTargetIndex(index);
    setGamePhase('LISTENING');
    setAccuracyScore(0);
    setStatusText('✦ Listening...');
    setSparkyMessage('Ready your voice to fire the sound cannon, Cadet!');
    
    // Explicitly reset speech state
    isChargingRef.current = false;
    transcriptRef.current = '';
    stopSpeechRecognition();
  }, [stopSpeechRecognition]);

  // ── Finish Session ──
  const finishSession = useCallback(async () => {
    const avgScore =
      sessionResults.length > 0
        ? Math.round(sessionResults.reduce((a, b) => a + b.score, 0) / sessionResults.length)
        : accuracyScore || 85;

    await saveTherapyProgress(currentUser, 'phoneme', avgScore * 10, avgScore, 'AI Sound Cannon');
    if (onComplete) onComplete();
  }, [sessionResults, accuracyScore, currentUser, onComplete]);

  // ── Reset Game ──
  const resetGame = useCallback(() => {
    setCurrentTargetIndex(0);
    setGamePhase('LISTENING');
    setAccuracyScore(0);
    setSessionResults([]);
    setStatusText('✦ Listening...');
    setSparkyMessage('Ready your voice to fire the sound cannon, Cadet!');
  }, []);

  return {
    // State
    gamePhase,
    currentTarget,
    currentTargetIndex,
    xp,
    level,
    xpThreshold: XP_THRESHOLD,
    sessionResults,
    accuracyScore,
    sparkyMessage,
    statusText,
    // Actions
    startCharging,
    stopCharging,
    nextTarget,
    retryTarget,
    selectTarget,
    cancelBlast,
    finishSession,
    resetGame,
    isChargingRef,
  };
};

export default useGameState;
