import React, { useState, useRef, useEffect } from 'react';
import './VoicePractice.css';
import { useAuth } from '../auth/AuthContext';
import { saveTherapyProgress } from './ExerciseSystem';

const masterPracticeSentencesPool = [
  "The sun is bright and warm today.",
  "I like to read books about space.", 
  "Learning new things makes me happy.",
  "Practice helps me get better every day.",
  "Clear blue sky brings joy and peace.",
  "A quick brown fox jumps over the dog.",
  "Kind words can change someone's whole day.",
  "Reading every morning strengthens your brain.",
  "Music and art inspire creative thoughts.",
  "Exploring nature fills the mind with wonder.",
  "Fresh air and sunshine boost your energy.",
  "Teamwork makes big challenges much easier.",
  "Stars glow brightly in the dark night sky.",
  "Every small step brings you closer to your goal.",
  "Lakes reflect the golden light of sunset.",
  "Curiosity opens doors to endless discovery.",
  "Patience and effort lead to great success.",
  "Laughter spreads happiness everywhere around us.",
  "Books take us on amazing adventures.",
  "Focus on progress rather than perfection."
];

const getRandomSentences = (count = 4) => {
  const shuffled = [...masterPracticeSentencesPool].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
};

// Helper to compute edit distance (Levenshtein) between two strings for mispronunciation detection
const getEditDistance = (a, b) => {
  if (!a || !b) return (a || b).length;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const matrix = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1)
        );
      }
    }
  }
  return matrix[b.length][a.length];
};

// Strict word-accuracy threshold required to mark a sentence as "Pass".
// Anything below this is reported as "Fail / Needs Improvement".
const PASS_THRESHOLD = 85;

// Homophone and speech engine phonetic variation mapping
const HOMOPHONE_DICTIONARY = {
  read: ['red', 'reid', 'reed'],
  red: ['read', 'reed'],
  to: ['two', 'too', '2'],
  two: ['to', 'too', '2'],
  too: ['to', 'two', '2'],
  sun: ['son'],
  son: ['sun'],
  for: ['four', 'fore', '4'],
  four: ['for', 'fore', '4'],
  be: ['bee'],
  bee: ['be'],
  see: ['sea'],
  sea: ['see'],
  by: ['buy', 'bye'],
  buy: ['by', 'bye'],
  bye: ['by', 'buy'],
  hear: ['here'],
  here: ['hear'],
  right: ['write', 'wright'],
  write: ['right', 'wright'],
  their: ['there', "they're"],
  there: ['their', "they're"],
  "they're": ['there', 'their'],
  no: ['know'],
  know: ['no'],
  new: ['knew'],
  knew: ['new'],
  night: ['knight'],
  knight: ['night'],
  one: ['won', '1'],
  won: ['one', '1'],
  our: ['hour'],
  hour: ['our'],
  pair: ['pear', 'pare'],
  pear: ['pair'],
  peace: ['piece'],
  piece: ['peace'],
  plane: ['plain'],
  plain: ['plane'],
  road: ['rode'],
  rode: ['road'],
  sail: ['sale'],
  sale: ['sail'],
  so: ['sew', 'sow'],
  sew: ['so'],
  stair: ['stare'],
  stare: ['stair'],
  tail: ['tale'],
  tale: ['tail'],
  weather: ['whether'],
  whether: ['weather'],
  which: ['witch'],
  witch: ['which'],
  wood: ['would'],
  would: ['wood'],
  your: ["you're"],
  "you're": ['your'],
  i: ['eye', 'aye'],
  eye: ['i'],
  book: ['books'],
  books: ['book'],
  space: ['spaces'],
  spaces: ['space'],
  dog: ['dogs'],
  dogs: ['dog'],
  star: ['stars'],
  stars: ['star'],
  glow: ['glows'],
  glows: ['glow'],
  lake: ['lakes'],
  lakes: ['lake'],
  step: ['steps'],
  steps: ['step'],
  light: ['lights'],
  lights: ['light'],
  word: ['words'],
  words: ['word'],
  bring: ['brings'],
  brings: ['bring'],
  lead: ['leads'],
  leads: ['lead'],
  spread: ['spreads'],
  spreads: ['spread'],
  open: ['opens'],
  opens: ['open'],
  take: ['takes'],
  takes: ['take'],
  fox: ['foxes'],
  foxes: ['fox'],
  jump: ['jumps', 'jumped'],
  jumps: ['jump', 'jumped']
};

const isPhoneticMatch = (cleanTarget, hw) => {
  if (!cleanTarget || !hw) return false;
  if (cleanTarget === hw) return true;

  // 1. Homophone check
  if (HOMOPHONE_DICTIONARY[cleanTarget] && HOMOPHONE_DICTIONARY[cleanTarget].includes(hw)) return true;
  if (HOMOPHONE_DICTIONARY[hw] && HOMOPHONE_DICTIONARY[hw].includes(cleanTarget)) return true;

  // 2. Stem / Plural / Tense match check (e.g. books vs book, jumps vs jump, glowing vs glow)
  const stripSuffix = (w) => w.replace(/(es|s|ed|ing|ly|'s)$/gi, '');
  const targetStem = stripSuffix(cleanTarget);
  const hwStem = stripSuffix(hw);
  if (targetStem && hwStem && targetStem === hwStem && Math.abs(cleanTarget.length - hw.length) <= 3) return true;

  // 3. Edit distance <= 1 on words length >= 3
  const dist = getEditDistance(cleanTarget, hw);
  if (dist <= 1 && (cleanTarget.length >= 3 || hw.length >= 3)) return true;

  // 4. Substring / Prefix match for long words (>=5 chars) with max 1 char difference
  if ((cleanTarget.length >= 5 || hw.length >= 5) && (cleanTarget.startsWith(hw) || hw.startsWith(cleanTarget)) && Math.abs(cleanTarget.length - hw.length) <= 2) return true;

  return false;
};

const VoicePractice = ({ onComplete }) => {
  const [practiceSentences, setPracticeSentences] = useState(() => getRandomSentences(4));
  const [stream, setStream] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [sessionTime, setSessionTime] = useState(0);
  const [currentTextIndex, setCurrentTextIndex] = useState(0);
  const [transcript, setTranscript] = useState('');
  const [feedback, setFeedback] = useState({ text: 'Click "Activate Microphone & Start Voice Practice" to begin', type: 'neutral' });
  const [isFinished, setIsFinished] = useState(false);
  const [sentenceReports, setSentenceReports] = useState({});
  const [isMicListening, setIsMicListening] = useState(false);
  const [micVolume, setMicVolume] = useState(0);

  const audioCtxRef = useRef(null);
  const analyserRef = useRef(null);

  const recognitionRef = useRef(null);

  const transcriptRef = useRef('');
  const accumulatedTranscriptRef = useRef('');

  const isRecordingRef = useRef(isRecording);
  const currentTextIndexRef = useRef(currentTextIndex);
  const isFinishedRef = useRef(isFinished);
  const practiceSentencesRef = useRef(practiceSentences);

  const { currentUser } = useAuth();

  useEffect(() => {
    practiceSentencesRef.current = practiceSentences;
  }, [practiceSentences]);

  useEffect(() => {
    isRecordingRef.current = isRecording;
  }, [isRecording]);

  useEffect(() => {
    currentTextIndexRef.current = currentTextIndex;
  }, [currentTextIndex]);

  useEffect(() => {
    isFinishedRef.current = isFinished;
  }, [isFinished]);

  useEffect(() => {
    transcriptRef.current = transcript;
  }, [transcript]);

  // Analyze spoken transcript vs target sentence word-by-word
  const analyzeReading = (heardText, targetSentence) => {
    const targetWords = targetSentence.split(" ");
    const cleanTargetWords = targetWords.map(w => w.toLowerCase().replace(/[^\w]/g, ''));
    const cleanHeardWords = (heardText || '').toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/).filter(Boolean);

    // If no speech has been captured, evaluate as 0% accuracy (0 words correct, all target words omitted)
    if (cleanHeardWords.length === 0) {
      const omittedList = targetWords.map((originalWord, idx) => ({ target: originalWord, index: idx }));
      const wordStatuses = targetWords.map((originalWord) => ({ word: originalWord, status: 'omitted', heard: '-' }));

      setSentenceReports(prev => ({
        ...prev,
        [currentTextIndexRef.current]: {
          targetSentence,
          transcript: heardText || '',
          wordStatuses,
          correctCount: 0,
          totalWords: targetWords.length,
          accuracy: 0,
          mispronounced: [],
          omitted: omittedList,
          passStatus: 'Fail',
          missedWords: omittedList.map(m => ({ ...m, reason: 'omitted' }))
        }
      }));

      setFeedback({ text: `❌ Needs Improvement — 0% accuracy (0/${targetWords.length} words correct, ${PASS_THRESHOLD}% required to Pass)`, type: 'progress' });
      return;
    }

    let correctCount = 0;
    let mispronouncedList = [];
    let omittedList = [];
    let lastMatchedHeardIdx = -1;
    const usedHeardIndices = new Set();

    const wordStatuses = targetWords.map((originalWord, idx) => {
      const cleanTarget = cleanTargetWords[idx];
      if (!cleanTarget) return { word: originalWord, status: 'pending', heard: '' };

      // 1. Phonetic or Homophone match in sequence (higher priority)
      const seqPhoneticIdx = cleanHeardWords.findIndex((hw, i) => !usedHeardIndices.has(i) && i > lastMatchedHeardIdx && isPhoneticMatch(cleanTarget, hw));
      if (seqPhoneticIdx !== -1) {
        lastMatchedHeardIdx = seqPhoneticIdx;
        usedHeardIndices.add(seqPhoneticIdx);
        correctCount++;
        return { word: originalWord, status: 'correct', heard: cleanHeardWords[seqPhoneticIdx] };
      }

      // 2. Phonetic or Homophone match anywhere in unused heard words
      const anyPhoneticIdx = cleanHeardWords.findIndex((hw, i) => !usedHeardIndices.has(i) && isPhoneticMatch(cleanTarget, hw));
      if (anyPhoneticIdx !== -1) {
        if (anyPhoneticIdx > lastMatchedHeardIdx) lastMatchedHeardIdx = anyPhoneticIdx;
        usedHeardIndices.add(anyPhoneticIdx);
        correctCount++;
        return { word: originalWord, status: 'correct', heard: cleanHeardWords[anyPhoneticIdx] };
      }

      // 3. Fuzzy match (mispronunciation)
      const fuzzyIdx = cleanHeardWords.findIndex((hw, i) => {
        if (usedHeardIndices.has(i) || i <= lastMatchedHeardIdx) return false;
        const dist = getEditDistance(cleanTarget, hw);
        return dist > 0 && dist <= 3 && Math.abs(cleanTarget.length - hw.length) <= 3;
      });

      if (fuzzyIdx !== -1) {
        const heardWord = cleanHeardWords[fuzzyIdx];
        usedHeardIndices.add(fuzzyIdx);
        mispronouncedList.push({ target: originalWord, heard: heardWord, index: idx });
        return { word: originalWord, status: 'mispronounced', heard: heardWord };
      }

      // 4. Check if user has already spoken words beyond this position in target sequence
      const futureWordsTarget = cleanTargetWords.slice(idx + 1);
      const userSpokeFutureWords = cleanHeardWords.some((hw, i) => i > lastMatchedHeardIdx && futureWordsTarget.some(ft => isPhoneticMatch(ft, hw)));

      if (userSpokeFutureWords) {
        omittedList.push({ target: originalWord, index: idx });
        return { word: originalWord, status: 'omitted', heard: '-' };
      }

      return { word: originalWord, status: 'pending', heard: '' };
    });

    const accuracyScore = Math.round((correctCount / targetWords.length) * 100);

    const passStatus = accuracyScore >= PASS_THRESHOLD ? 'Pass' : 'Fail';
    const missedWords = [
      ...mispronouncedList.map(m => ({ ...m, reason: 'mispronounced' })),
      ...omittedList.map(m => ({ ...m, reason: 'omitted' }))
    ];

    setSentenceReports(prev => ({
      ...prev,
      [currentTextIndexRef.current]: {
        targetSentence,
        transcript: heardText,
        wordStatuses,
        correctCount,
        totalWords: targetWords.length,
        accuracy: accuracyScore,
        mispronounced: mispronouncedList,
        omitted: omittedList,
        passStatus,
        missedWords
      }
    }));

    if (accuracyScore >= PASS_THRESHOLD) {
      setFeedback({ text: `✅ PASS — ${accuracyScore}% word accuracy (≥${PASS_THRESHOLD}% required)`, type: 'success' });
    } else if (cleanHeardWords.length > 0) {
      setFeedback({ text: `❌ Needs Improvement — ${accuracyScore}% accuracy (${correctCount}/${targetWords.length} words correct, ${PASS_THRESHOLD}% required to Pass)`, type: 'progress' });
    }
  };

  const networkRetryCountRef = useRef(0);
  const isStartedRef = useRef(false);

  // Clean, persistent & resilient Speech Recognition session manager
  const startSpeechRecognitionSession = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setFeedback({ text: 'Speech engine fallback active. Type or use preset buttons below to test.', type: 'neutral' });
      return;
    }

    // Safely abort previous session if active to clear Chrome's internal result buffer
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onstart = null;
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.abort();
      } catch (e) {}
    }

    accumulatedTranscriptRef.current = '';
    transcriptRef.current = '';
    setTranscript('');

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      isStartedRef.current = true;
      setIsMicListening(true);
      networkRetryCountRef.current = 0;
      setFeedback({ text: '🎤 Microphone Active — Read the sentence aloud!', type: 'progress' });
    };

    recognition.onresult = (event) => {
      networkRetryCountRef.current = 0;
      let currentSegment = '';
      for (let i = 0; i < event.results.length; i++) {
        currentSegment += event.results[i][0].transcript + ' ';
      }
      const fullTranscript = currentSegment.trim();
      transcriptRef.current = fullTranscript;
      setTranscript(fullTranscript);
      analyzeReading(fullTranscript, practiceSentencesRef.current[currentTextIndexRef.current]);
    };

    recognition.onerror = (event) => {
      if (event.error === 'aborted') {
        isStartedRef.current = false;
        return;
      }
      console.warn("Speech recognition error:", event.error);
      if (event.error === 'not-allowed') {
        setIsMicListening(false);
        setFeedback({ text: '⚠️ Microphone access blocked by browser settings.', type: 'neutral' });
        return;
      }

      if (event.error === 'no-speech') {
        setFeedback({ text: '🤫 Listening for your voice — speak clearly into the mic.', type: 'progress' });
      } else if (event.error === 'network') {
        networkRetryCountRef.current += 1;
        setFeedback({ text: '⚠️ Speech engine reconnecting...', type: 'progress' });
      } else {
        setFeedback({ text: '🎤 Microphone Active — Continue reading aloud.', type: 'progress' });
      }
    };

    recognition.onend = () => {
      isStartedRef.current = false;
      if (isRecordingRef.current && !isFinishedRef.current) {
        // Auto restart for continuous listening within the current sentence
        const delay = networkRetryCountRef.current > 0 ? 1000 : 250;
        setTimeout(() => {
          if (isRecordingRef.current && !isFinishedRef.current && !isStartedRef.current) {
            try {
              recognition.start();
              isStartedRef.current = true;
              setIsMicListening(true);
            } catch (e) {}
          }
        }, delay);
      } else {
        setIsMicListening(false);
      }
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
      isStartedRef.current = true;
      setIsMicListening(true);
    } catch (e) {
      isStartedRef.current = false;
    }
  };

  // Mount effect to initialize speech engine setup
  useEffect(() => {
    return () => {
      isStartedRef.current = false;
      if (recognitionRef.current) {
        try {
          recognitionRef.current.onstart = null;
          recognitionRef.current.onresult = null;
          recognitionRef.current.onerror = null;
          recognitionRef.current.onend = null;
          recognitionRef.current.abort();
        } catch (e) {}
      }
    };
  }, []);

  // Control speech recognition starting / stopping on pause toggle
  useEffect(() => {
    if (isRecording && !isFinished) {
      if (!isStartedRef.current) {
        startSpeechRecognitionSession();
      }
    } else if (!isRecording || isFinished) {
      if (recognitionRef.current && isStartedRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {}
        isStartedRef.current = false;
        setIsMicListening(false);
      }
    }
  }, [isRecording, isFinished]);

  // Web Audio API Audio Level Meter
  const startAudioVisualizer = (mediaStream) => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const audioCtx = new AudioContext();
      const source = audioCtx.createMediaStreamSource(mediaStream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);

      audioCtxRef.current = audioCtx;
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const updateVolume = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        const vol = Math.min(100, Math.round((avg / 128) * 100));
        setMicVolume(vol);
        if (isRecordingRef.current) {
          requestAnimationFrame(updateVolume);
        }
      };
      updateVolume();
    } catch (e) {
      console.warn("Audio Context Visualizer error:", e);
    }
  };

  useEffect(() => {
    let timer;
    if (isRecording && !isFinished) {
      timer = setInterval(() => {
        setSessionTime(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isRecording, isFinished]);

  const startCamera = async () => {
    accumulatedTranscriptRef.current = '';
    transcriptRef.current = '';
    setTranscript('');

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setStream(mediaStream);
      setIsRecording(true);
      startSpeechRecognitionSession();
      if (mediaStream) {
        startAudioVisualizer(mediaStream);
      }
    } catch (err) {
      setIsRecording(true);
      startSpeechRecognitionSession();
      alert("Microphone requested. Please click 'Allow' in your browser so speech recognition can hear your voice.");
    }
  };

  const stopCamera = () => {
    accumulatedTranscriptRef.current = '';
    transcriptRef.current = '';
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsRecording(false);
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onstart = null;
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.abort();
      } catch (e) {}
      isStartedRef.current = false;
    }
    if (audioCtxRef.current) {
      try { audioCtxRef.current.close(); } catch(e){}
    }
  };

  const changeSentence = (newIndex) => {
    setCurrentTextIndex(newIndex);
    setFeedback({ text: 'Next sentence ready. Read aloud into microphone...', type: 'progress' });
    if (isRecording && !isFinished) {
      startSpeechRecognitionSession();
    } else {
      setTranscript('');
    }
  };

  const handleNext = () => {
    if (currentTextIndex < practiceSentences.length - 1) {
      changeSentence(currentTextIndex + 1);
    } else {
      finishLiveSession();
    }
  };

  const handlePrev = () => {
    if (currentTextIndex > 0) {
      changeSentence(currentTextIndex - 1);
    }
  };

  const handleRetry = () => {
    setSentenceReports(prev => {
      const copy = { ...prev };
      delete copy[currentTextIndex];
      return copy;
    });
    setFeedback({ text: '🎤 Retrying — Read the sentence aloud into your microphone!', type: 'progress' });

    if (!isRecording) {
      setIsRecording(true);
    }
    startSpeechRecognitionSession();
  };

  const finishLiveSession = async () => {
    // Ensure current sentence is evaluated if transcript exists
    if (transcript && (!sentenceReports[currentTextIndex] || sentenceReports[currentTextIndex].transcript !== transcript)) {
      analyzeReading(transcript, practiceSentences[currentTextIndex]);
    }

    setIsFinished(true);
    stopCamera();

    let totalTargetWords = 0;
    let totalCorrectWords = 0;
    let allMispronounced = [];
    let allOmitted = [];

    practiceSentences.forEach((sent, idx) => {
      const rep = sentenceReports[idx];
      const targetWords = sent.split(" ");
      totalTargetWords += targetWords.length;
      if (rep) {
        totalCorrectWords += rep.correctCount || 0;
        if (rep.mispronounced) allMispronounced.push(...rep.mispronounced);
        if (rep.omitted) allOmitted.push(...rep.omitted);
      }
    });

    const overallAccuracy = totalTargetWords > 0 ? Math.round((totalCorrectWords / totalTargetWords) * 100) : 100;
    const computedWpm = sessionTime > 0 ? Math.round((totalCorrectWords / sessionTime) * 60) : 0;

    await saveTherapyProgress(
      currentUser, 
      'voice', 
      Math.round(overallAccuracy * 3), 
      overallAccuracy, 
      `${sessionTime}s (${computedWpm} WPM)`
    );
  };

  const currentReport = sentenceReports[currentTextIndex] || {};
  const currentStatuses = currentReport.wordStatuses || practiceSentences[currentTextIndex].split(" ").map(w => ({ word: w, status: 'pending' }));

  const totalCorrect = Object.values(sentenceReports).reduce((sum, r) => sum + (r.correctCount || 0), 0);
  const totalMispronounced = Object.values(sentenceReports).reduce((sum, r) => sum + (r.mispronounced?.length || 0), 0);
  const totalOmitted = Object.values(sentenceReports).reduce((sum, r) => sum + (r.omitted?.length || 0), 0);
  const totalWords = practiceSentences.join(" ").split(" ").length;
  const overallAcc = Math.round((totalCorrect / totalWords) * 100) || 0;

  return (
    <div className="exercise-session live-practice">
      {!isFinished ? (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
            <h3 style={{ fontSize: '1.15rem', margin: 0, fontWeight: 800 }}>🎤 Live Reading & Voice Recognition Session</h3>
            {isRecording && (
              <div className="recording-indicator">
                <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: isMicListening ? '#14b8a6' : '#f43f5e', marginRight: '4px' }}></span>
                {isMicListening ? '🎤 MIC ACTIVE' : '● REC'} ({sessionTime}s)
              </div>
            )}
          </div>

          <div className="live-practice-grid">
            {/* Mic Feed & Audio Meter */}
            <div className="webcam-container">
              {!stream && !isRecording ? (
                <div className="camera-setup">
                  <span style={{ fontSize: '3.5rem' }}>🎤</span>
                  <button className="btn-run" onClick={startCamera} style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #0d9488 100%)', padding: '0.85rem 1.75rem', fontSize: '0.95rem', borderRadius: '10px' }}>
                    🎤 Activate Microphone & Start Voice Practice
                  </button>
                </div>
              ) : (
                <>
                  <div className="camera-setup" style={{ background: 'linear-gradient(145deg, #0f172a 0%, #1e1838 100%)', color: '#ffffff', padding: '0.85rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%', boxSizing: 'border-box' }}>
                    {/* Top bar: Mic Level */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255, 255, 255, 0.08)', padding: '3px 8px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <small style={{ color: '#14b8a6', fontSize: '0.7rem', fontWeight: 800 }}>MIC INPUT</small>
                        <div style={{ width: '60px', height: '5px', background: 'rgba(255,255,255,0.2)', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{ width: `${Math.max(8, micVolume)}%`, height: '100%', background: micVolume > 30 ? '#14b8a6' : '#818cf8', transition: 'width 0.1s ease' }}></div>
                        </div>
                      </div>
                      <span className="badge" style={{ background: 'rgba(20, 184, 166, 0.15)', color: '#14b8a6', fontSize: '0.7rem', fontWeight: 800, padding: '2px 8px' }}>
                        🎙️ LIVE MIC
                      </span>
                    </div>

                    {/* Center: Audio Waveform Visualizer */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px', margin: '0.35rem 0' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px', height: '36px' }}>
                        {Array.from({ length: 14 }).map((_, i) => {
                          const barHeight = Math.max(4, (micVolume / 100) * (18 + Math.sin(Date.now() * 0.01 + i * 0.8) * 12 + Math.random() * 6));
                          return (
                            <div key={i} style={{
                              width: '4px',
                              height: `${barHeight}px`,
                              background: micVolume > 30 ? '#14b8a6' : '#818cf8',
                              borderRadius: '2px',
                              transition: 'height 0.1s ease'
                            }} />
                          );
                        })}
                      </div>
                      <p style={{ margin: 0, fontWeight: 700, fontSize: '0.82rem', color: '#cbd5e1' }}>Speak sentence aloud into mic</p>
                    </div>

                    {/* Bottom: Feedback message badge & Spoken text */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div className={`feedback-badge ${feedback.type}`} style={{ fontSize: '0.72rem', padding: '3px 8px', borderRadius: '6px', width: 'fit-content' }}>
                        {feedback.text}
                      </div>
                      {transcript && (
                        <p className="live-text" style={{ fontSize: '0.78rem', padding: '4px 8px', margin: 0 }}>
                          🎤 Spoken: "{transcript}"
                        </p>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Practice Material & Realtime Word-by-Word Analysis */}
            <div className="practice-material">
              <div className="sentence-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
                  <small>SENTENCE {currentTextIndex + 1}/{practiceSentences.length}</small>
                  {currentReport.accuracy !== undefined && (
                    <span className={`badge ${currentReport.accuracy >= 70 ? 'badge-low' : 'badge-high'}`}>
                      {currentReport.accuracy}% Accuracy
                    </span>
                  )}
                </div>

                <div className="interactive-sentence-words" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', fontSize: '1.2rem', fontWeight: 700 }}>
                  {currentStatuses.map((item, idx) => (
                    <span 
                      key={idx} 
                      className={`word-tile ${item.status}`}
                      title={item.status === 'mispronounced' ? `Heard: "${item.heard}"` : ''}
                      style={{
                        padding: '4px 8px',
                        borderRadius: '6px',
                        background: item.status === 'correct' ? 'rgba(20, 184, 166, 0.15)' : item.status === 'mispronounced' ? 'rgba(244, 63, 94, 0.15)' : item.status === 'omitted' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(0, 0, 0, 0.04)',
                        color: item.status === 'correct' ? '#14b8a6' : item.status === 'mispronounced' ? '#f43f5e' : item.status === 'omitted' ? '#f59e0b' : 'var(--lf-text-primary)',
                        border: `1px solid ${item.status === 'correct' ? '#14b8a6' : item.status === 'mispronounced' ? '#f43f5e' : item.status === 'omitted' ? '#f59e0b' : 'var(--lf-border)'}`
                      }}
                    >
                      {item.word}
                      {item.status === 'correct' && ' ✓'}
                      {item.status === 'mispronounced' && ' ❌'}
                      {item.status === 'omitted' && ' ⚠️'}
                    </span>
                  ))}
                </div>

                {currentReport.mispronounced && currentReport.mispronounced.length > 0 && (
                  <div style={{ marginTop: '1rem', padding: '0.65rem', background: 'rgba(244,63,94,0.08)', borderRadius: '8px', border: '1px solid rgba(244,63,94,0.2)', fontSize: '0.8rem' }}>
                    <strong style={{ color: '#f43f5e' }}>⚠️ Mispronunciation Detected:</strong>
                    {currentReport.mispronounced.map((m, i) => (
                      <span key={i} style={{ marginLeft: '6px', fontWeight: 600 }}>
                        Target: "<strong>{m.target}</strong>" → Spoken: "<em>{m.heard}</em>"
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Live Speech Recognition Input & Quick Preset Chips */}
              <div style={{ marginTop: '0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--lf-text-muted)' }}>
                    REALTIME SPOKEN VOICE TRANSCRIPT:
                  </label>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button
                      onClick={() => {
                        const correctSample = practiceSentences[currentTextIndex];
                        setTranscript(correctSample);
                        analyzeReading(correctSample, correctSample);
                      }}
                      style={{ background: 'rgba(20, 184, 166, 0.1)', color: '#14b8a6', border: '1px solid rgba(20, 184, 166, 0.25)', padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer' }}
                    >
                      🧪 Test Correct
                    </button>
                    <button
                      onClick={() => {
                        const words = practiceSentences[currentTextIndex].split(" ");
                        let misSample = practiceSentences[currentTextIndex];
                        if (words.length > 3) {
                          words[3] = words[3].replace(/a|e|i|o|u/gi, 'i');
                          misSample = words.join(" ");
                        } else {
                          misSample = practiceSentences[currentTextIndex] + " extra";
                        }
                        setTranscript(misSample);
                        analyzeReading(misSample, practiceSentences[currentTextIndex]);
                      }}
                      style={{ background: 'rgba(244, 63, 94, 0.1)', color: '#f43f5e', border: '1px solid rgba(244, 63, 94, 0.25)', padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer' }}
                    >
                      🧪 Test Mispronunciation
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    value={transcript}
                    onChange={(e) => {
                      const val = e.target.value;
                      setTranscript(val);
                      transcriptRef.current = val;
                      accumulatedTranscriptRef.current = val;
                      analyzeReading(val, practiceSentences[currentTextIndex]);
                    }}
                    placeholder="Speak aloud into mic (or type/click preset to test)..."
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--lf-border)',
                      fontSize: '0.85rem',
                      background: '#ffffff',
                      color: 'var(--lf-text-primary)'
                    }}
                  />
                  <button
                    onClick={() => {
                      const textToAnalyze = transcript.trim();
                      analyzeReading(textToAnalyze, practiceSentences[currentTextIndex]);
                    }}
                    style={{
                      background: 'var(--lf-primary)',
                      color: '#ffffff',
                      border: 'none',
                      padding: '8px 16px',
                      borderRadius: '8px',
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      boxShadow: 'var(--lf-shadow-sm)'
                    }}
                  >
                    🔍 Analyze
                  </button>
                  <button
                    onClick={handleRetry}
                    style={{
                      background: 'rgba(245, 158, 11, 0.12)',
                      color: '#d97706',
                      border: '1px solid rgba(245, 158, 11, 0.3)',
                      padding: '8px 14px',
                      borderRadius: '8px',
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      cursor: 'pointer'
                    }}
                    title="Clear transcript and record voice again"
                  >
                    🔄 Retry Recording
                  </button>
                </div>
              </div>

              <div className="practice-nav" style={{ marginTop: '0.65rem', display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button 
                  disabled={currentTextIndex === 0} 
                  onClick={handlePrev}
                  style={{ padding: '0.5rem 1rem', fontSize: '0.82rem' }}
                >
                  Previous
                </button>
                <button 
                  onClick={handleRetry}
                  style={{
                    background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                    color: '#ffffff',
                    border: 'none',
                    padding: '0.5rem 1.1rem',
                    borderRadius: '8px',
                    fontWeight: 700,
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    boxShadow: 'var(--lf-shadow-sm)'
                  }}
                >
                  🔄 Retry Sentence
                </button>
                <button 
                  className="btn-primary"
                  onClick={handleNext}
                  style={{ padding: '0.5rem 1.25rem', fontSize: '0.85rem', fontWeight: 800 }}
                >
                  {currentTextIndex === practiceSentences.length - 1 ? "Finish & Generate Report →" : "Next Sentence →"}
                </button>
              </div>
            </div>
          </div>

          {/* ── SPACIOUS SENTENCE DIAGNOSTIC & DEFECT REPORT SECTION (Collapsible for zero-scroll default zoom view) ── */}
          {sentenceReports[currentTextIndex] && (
            <details style={{ marginTop: '0.75rem', background: '#ffffff', padding: '0.85rem 1.25rem', borderRadius: '14px', border: '1.5px solid #e2e8f0', boxShadow: '0 4px 15px rgba(0,0,0,0.03)' }}>
              <summary style={{ cursor: 'pointer', fontWeight: 800, fontSize: '0.92rem', color: 'var(--lf-text-primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', userSelect: 'none' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  📊 Sentence Defect & Accuracy Diagnostic Analysis (Click to view details)
                </span>
                <div style={{ display: 'inline-flex', gap: '6px' }}>
                  <span className="badge" style={{ background: sentenceReports[currentTextIndex].passStatus === 'Pass' ? 'rgba(20, 184, 166, 0.12)' : 'rgba(244, 63, 94, 0.12)', color: sentenceReports[currentTextIndex].passStatus === 'Pass' ? '#14b8a6' : '#f43f5e', fontWeight: 800, padding: '2px 8px', fontSize: '0.75rem' }}>
                    {sentenceReports[currentTextIndex].passStatus === 'Pass' ? '✅ PASS' : '❌ FAIL'}
                  </span>
                  <span className="badge" style={{ background: (sentenceReports[currentTextIndex].accuracy || 0) >= PASS_THRESHOLD ? 'rgba(20, 184, 166, 0.12)' : 'rgba(245, 158, 11, 0.12)', color: (sentenceReports[currentTextIndex].accuracy || 0) >= PASS_THRESHOLD ? '#14b8a6' : '#f59e0b', fontWeight: 800, padding: '2px 8px', fontSize: '0.75rem' }}>
                    {sentenceReports[currentTextIndex].accuracy || 0}% Accuracy
                  </span>
                </div>
              </summary>

              <div style={{ marginTop: '0.85rem', paddingTop: '0.85rem', borderTop: '1px solid #f1f5f9' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '0.85rem' }}>
                  {/* What User Told */}
                  <div style={{ background: '#f8fafc', padding: '0.85rem 1rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                    <small style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: 'var(--lf-primary)', textTransform: 'uppercase', marginBottom: '4px', letterSpacing: '0.05em' }}>
                      🗣️ Spoken Voice Input (What User Said):
                    </small>
                    <p style={{ margin: 0, fontSize: '0.92rem', fontWeight: 700, color: 'var(--lf-text-primary)', lineHeight: '1.4' }}>
                      "{sentenceReports[currentTextIndex].transcript || transcript || '(No speech recorded)'}"
                    </p>
                  </div>

                  {/* Actual Expected Target Output */}
                  <div style={{ background: '#f8fafc', padding: '0.85rem 1rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                    <small style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: '#0d9488', textTransform: 'uppercase', marginBottom: '4px', letterSpacing: '0.05em' }}>
                      🎯 Target Sentence (Expected Output):
                    </small>
                    <p style={{ margin: 0, fontSize: '0.92rem', fontWeight: 700, color: 'var(--lf-text-primary)', lineHeight: '1.4' }}>
                      "{practiceSentences[currentTextIndex]}"
                    </p>
                  </div>
                </div>

                {/* Defect Metrics & Detailed Breakdown */}
                <div style={{ background: '#f8fafc', padding: '0.85rem 1rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <small style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: 'var(--lf-text-muted)', textTransform: 'uppercase', marginBottom: '6px', letterSpacing: '0.05em' }}>
                    📋 Word-by-Word Defect & Fluency Metrics:
                  </small>
                  <div style={{ display: 'flex', gap: '1.25rem', fontSize: '0.82rem', flexWrap: 'wrap', marginBottom: '0.4rem' }}>
                    <div>
                      <span style={{ color: '#14b8a6', fontWeight: 700 }}>✅ Correct:</span>{' '}
                      <strong style={{ color: '#0f766e' }}>{sentenceReports[currentTextIndex].correctCount} / {sentenceReports[currentTextIndex].totalWords} words</strong>
                    </div>
                    <div>
                      <span style={{ color: '#f43f5e', fontWeight: 700 }}>❌ Mispronounced:</span>{' '}
                      <strong style={{ color: '#be123c' }}>{sentenceReports[currentTextIndex].mispronounced?.length || 0} word(s)</strong>
                    </div>
                    <div>
                      <span style={{ color: '#f59e0b', fontWeight: 700 }}>⚠️ Skipped:</span>{' '}
                      <strong style={{ color: '#b45309' }}>{sentenceReports[currentTextIndex].omitted?.length || 0} word(s)</strong>
                    </div>
                  </div>

                  {sentenceReports[currentTextIndex].mispronounced && sentenceReports[currentTextIndex].mispronounced.length > 0 && (
                    <div style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px dashed #cbd5e1', fontSize: '0.8rem' }}>
                      <strong style={{ color: '#f43f5e', display: 'block', marginBottom: '3px' }}>Specific Mispronunciation Details:</strong>
                      {sentenceReports[currentTextIndex].mispronounced.map((m, i) => (
                        <div key={i} style={{ color: '#334155', marginTop: '2px', fontWeight: 600 }}>
                          • Target word "<strong>{m.target}</strong>" was read as "<em>{m.heard}</em>"
                        </div>
                      ))}
                    </div>
                  )}

                  {sentenceReports[currentTextIndex].omitted && sentenceReports[currentTextIndex].omitted.length > 0 && (
                    <div style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px dashed #cbd5e1', fontSize: '0.8rem' }}>
                      <strong style={{ color: '#f59e0b', display: 'block', marginBottom: '3px' }}>Skipped / Omitted Words:</strong>
                      {sentenceReports[currentTextIndex].omitted.map((m, i) => (
                        <div key={i} style={{ color: '#334155', marginTop: '2px', fontWeight: 600 }}>
                          • Target word "<strong>{m.target}</strong>" was skipped during oral reading
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </details>
          )}

          <div className="live-controls" style={{ marginTop: '0.75rem', paddingTop: '0.75rem' }}>
            {!stream && !isRecording ? (
              <button className="btn-primary" onClick={startCamera} style={{ padding: '0.55rem 1.5rem', fontSize: '0.85rem', fontWeight: 700 }}>
                🎤 Activate Microphone & Start Voice Practice
              </button>
            ) : (
              <button 
                className={`record-toggle ${isRecording ? 'active' : ''}`}
                onClick={() => setIsRecording(!isRecording)}
                style={{ padding: '0.55rem 1.5rem', fontSize: '0.85rem' }}
              >
                {isRecording ? "⏹ Pause Voice Practice" : "⏺ Resume Voice Practice"}
              </button>
            )}
            <button className="btn-text" onClick={finishLiveSession} style={{ padding: '0.5rem 1.25rem', fontSize: '0.85rem' }}>View Final Oral Reading Report</button>
          </div>
        </>
      ) : (
        /* Post-Session Comprehensive Child Oral Reading & Fluency Report */
        <div className="oral-report-container" style={{ background: '#ffffff', padding: '2rem', borderRadius: '20px', border: '2px solid var(--lf-border)', boxShadow: '0 10px 30px rgba(0,0,0,0.08)' }}>
          <header style={{ borderBottom: '2px dashed var(--lf-border)', paddingBottom: '1.25rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span className="badge badge-info" style={{ marginBottom: '0.4rem', fontSize: '0.85rem', padding: '4px 12px' }}>
                🎈 Child Reading Diagnostic Report
              </span>
              <h2 style={{ fontSize: '1.75rem', fontWeight: 900, margin: 0, color: 'var(--lf-text-primary)' }}>
                Oral Reading Fluency & Speech Analysis
              </h2>
              <small style={{ color: 'var(--lf-text-muted)', fontWeight: 600 }}>
                Session Duration: {sessionTime} seconds | Speaker: {currentUser?.displayName || currentUser?.email?.split('@')[0] || "Learner"}
              </small>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '1.5rem', marginBottom: '2px' }}>
                {overallAcc >= 90 ? '⭐️⭐️⭐️' : overallAcc >= 70 ? '⭐️⭐️' : '⭐️'}
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 900, color: overallAcc >= 70 ? '#14b8a6' : '#f59e0b' }}>
                {overallAcc}%
              </div>
              <small style={{ color: 'var(--lf-text-muted)', fontWeight: 700 }}>Phonetic Accuracy</small>
            </div>
          </header>

          {/* Child Clinical Metrics Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.75rem' }}>
            <div style={{ background: 'rgba(20, 184, 166, 0.08)', padding: '1rem', borderRadius: '14px', border: '1.5px solid rgba(20, 184, 166, 0.25)', textAlign: 'center' }}>
              <span style={{ fontSize: '1.6rem' }}>✅</span>
              <strong style={{ display: 'block', fontSize: '1.4rem', fontWeight: 800, color: '#14b8a6' }}>{totalCorrect} / {totalWords}</strong>
              <small style={{ color: 'var(--lf-text-muted)', fontWeight: 700 }}>Words Correct</small>
            </div>

            <div style={{ background: 'rgba(59, 130, 246, 0.08)', padding: '1rem', borderRadius: '14px', border: '1.5px solid rgba(59, 130, 246, 0.25)', textAlign: 'center' }}>
              <span style={{ fontSize: '1.6rem' }}>⏱️</span>
              <strong style={{ display: 'block', fontSize: '1.4rem', fontWeight: 800, color: '#3b82f6' }}>
                {sessionTime > 0 ? Math.round((totalCorrect / sessionTime) * 60) : 0} WPM
              </strong>
              <small style={{ color: 'var(--lf-text-muted)', fontWeight: 700 }}>Reading Speed (WPM)</small>
            </div>

            <div style={{ background: 'rgba(244, 63, 94, 0.08)', padding: '1rem', borderRadius: '14px', border: '1.5px solid rgba(244, 63, 94, 0.25)', textAlign: 'center' }}>
              <span style={{ fontSize: '1.6rem' }}>❌</span>
              <strong style={{ display: 'block', fontSize: '1.4rem', fontWeight: 800, color: '#f43f5e' }}>{totalMispronounced}</strong>
              <small style={{ color: 'var(--lf-text-muted)', fontWeight: 700 }}>Mispronounced</small>
            </div>

            <div style={{ background: 'rgba(245, 158, 11, 0.08)', padding: '1rem', borderRadius: '14px', border: '1.5px solid rgba(245, 158, 11, 0.25)', textAlign: 'center' }}>
              <span style={{ fontSize: '1.6rem' }}>⚠️</span>
              <strong style={{ display: 'block', fontSize: '1.4rem', fontWeight: 800, color: '#f59e0b' }}>{totalOmitted}</strong>
              <small style={{ color: 'var(--lf-text-muted)', fontWeight: 700 }}>Skipped Words</small>
            </div>
          </div>

          {/* Specialist Clinical Insight Card */}
          <div style={{ background: 'linear-gradient(135deg, rgba(79, 70, 229, 0.06) 0%, rgba(13, 148, 136, 0.06) 100%)', padding: '1.25rem', borderRadius: '14px', border: '1.5px solid rgba(79, 70, 229, 0.18)', marginBottom: '1.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '1.2rem' }}>🔬</span>
              <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'var(--lf-primary)' }}>
                Child Dyslexia Speech & Fluency Diagnostic:
              </h4>
            </div>
            <p style={{ margin: 0, fontSize: '0.92rem', lineHeight: '1.6', color: 'var(--lf-text-secondary)', fontWeight: 600 }}>
              {overallAcc >= 90 ? (
                "🌟 Excellent Oral Decoding: The child demonstrated high phonetic accuracy and smooth reading cadence. Grapheme-to-phoneme conversion speed is well-established."
              ) : totalMispronounced >= totalOmitted ? (
                "⚠️ Visual-Phonetic Substitution Pattern Detected: The child experienced hesitation on specific consonant/vowel blends. Recommended action: Engage in 5 minutes of Phoneme Matching and Morphology Builder games to reinforce decoding."
              ) : (
                "⚠️ Sight-Word Omission & Visual Tracking Strain Detected: The child skipped connecting sight words during sentence reading. Recommended action: Use Bionic Reader overlays and Visual Tracking practice to reduce visual crowding."
              )}
            </p>
          </div>

          {/* Sentence by Sentence Detailed Breakdown */}
          <h4 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '1rem', color: 'var(--lf-text-primary)' }}>Sentence-by-Sentence Fluency Breakdown</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
            {practiceSentences.map((sent, idx) => {
              const rep = sentenceReports[idx] || {};
              const acc = rep.accuracy !== undefined ? rep.accuracy : 0;

              return (
                <div key={idx} style={{ background: '#f8fafc', padding: '1.1rem', borderRadius: '12px', border: '1px solid var(--lf-border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <strong style={{ fontSize: '0.85rem', color: 'var(--lf-primary)' }}>Sentence #{idx + 1}</strong>
                    <span className={`badge ${acc >= PASS_THRESHOLD ? 'badge-low' : 'badge-high'}`}>
                      {acc >= PASS_THRESHOLD ? '✅ PASS' : '❌ FAIL'} ({acc}% Accuracy)
                    </span>
                  </div>

                  <p style={{ margin: '0 0 0.5rem 0', fontSize: '1.05rem', fontWeight: 700, color: 'var(--lf-text-primary)' }}>
                    "{sent}"
                  </p>

                  {rep.transcript && (
                    <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.88rem', color: 'var(--lf-text-secondary)' }}>
                      🎤 <em>Spoken Voice Transcript:</em> "{rep.transcript}"
                    </p>
                  )}

                  {rep.mispronounced && rep.mispronounced.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '0.5rem' }}>
                      {rep.mispronounced.map((m, i) => (
                        <span key={i} style={{ background: 'rgba(244,63,94,0.12)', color: '#f43f5e', border: '1px solid rgba(244,63,94,0.3)', padding: '3px 8px', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 600 }}>
                          Target: "{m.target}" → Read as: "{m.heard}"
                        </span>
                      ))}
                    </div>
                  )}

                  {rep.omitted && rep.omitted.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '0.4rem' }}>
                      {rep.omitted.map((m, i) => (
                        <span key={i} style={{ background: 'rgba(245,158,11,0.12)', color: '#d97706', border: '1px solid rgba(245,158,11,0.3)', padding: '3px 8px', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 600 }}>
                          Skipped: "{m.target}"
                        </span>
                      ))}
                    </div>
                  )}

                  {(!rep.mispronounced || rep.mispronounced.length === 0) && (!rep.omitted || rep.omitted.length === 0) && (
                    <small style={{ color: '#14b8a6', fontWeight: 600 }}>✓ All words in this sentence read fluently without errors!</small>
                  )}
                </div>
              );
            })}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', flexWrap: 'wrap' }}>
            <button 
              className="btn-secondary" 
              onClick={() => window.print()}
              style={{ fontWeight: 700 }}
            >
              🖨️ Print Child Clinical Report
            </button>
            <button 
              className="btn-secondary" 
              onClick={() => { setPracticeSentences(getRandomSentences(4)); setIsFinished(false); setCurrentTextIndex(0); setSentenceReports({}); setSessionTime(0); setTranscript(''); }}
              style={{ fontWeight: 700 }}
            >
              🔄 Practice New Sentence Set
            </button>
            <button className="btn-primary" style={{ padding: '0.75rem 1.75rem', fontWeight: 700 }} onClick={onComplete}>
              Complete & View Dashboard →
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default VoicePractice;