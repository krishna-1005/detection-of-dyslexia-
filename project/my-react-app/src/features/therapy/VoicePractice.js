import React, { useState, useRef, useEffect, useCallback } from 'react';
import './VoicePractice.css';
import { useAuth } from '../auth/AuthContext';
import { saveTherapyProgress } from './ExerciseSystem';
import { analyzeReading as analyzeReadingEngine } from './readingAnalyzer';

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

// ─── All analysis logic is now in readingAnalyzer.js ───────────────────────
// The following helpers remain only for the live per-sentence word-coloring
// during recording (not for final scoring).

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

// Standard clinical oral reading fluency pass threshold
const PASS_THRESHOLD = 75;

// Comprehensive bidirectional homophone, contraction, digit, and inflection dictionary
const HOMOPHONE_DICTIONARY = {
  night: ['knight', 'knights', 'nite', 'nites'],
  knight: ['night', 'nights', 'nite'],
  knights: ['night', 'nights', 'nite'],
  stars: ['star', "star's"],
  star: ['stars', "star's"],
  brightly: ['bright', 'brite'],
  bright: ['brightly', 'brite'],
  glow: ['glows', 'glowing', 'glo'],
  glows: ['glow', 'glowing'],
  sky: ['skies', 'ski'],
  skies: ['sky'],
  dark: ['darc'],
  in: ['inn'],
  inn: ['in'],
  the: ['da', 'th', 'thee'],
  read: ['red', 'reid', 'reed', 'reading'],
  reading: ['read', 'red'],
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
  right: ['write', 'wright', 'rite'],
  write: ['right', 'wright', 'rite'],
  their: ['there', "they're"],
  there: ['their', "they're"],
  "they're": ['there', 'their'],
  no: ['know'],
  know: ['no'],
  new: ['knew', 'gnu'],
  knew: ['new'],
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
  road: ['rode', 'rowed'],
  rode: ['road'],
  sail: ['sale'],
  sale: ['sail'],
  so: ['sew', 'sow'],
  sew: ['so'],
  stair: ['stare', 'stairs', 'stares'],
  stare: ['stair', 'stairs'],
  stairs: ['stares', 'stair'],
  stares: ['stairs', 'stare'],
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
  lake: ['lakes'],
  lakes: ['lake'],
  step: ['steps'],
  steps: ['step'],
  light: ['lights', 'lite'],
  lights: ['light'],
  word: ['words'],
  words: ['word'],
  bring: ['brings'],
  brings: ['bring'],
  lead: ['leads', 'led'],
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
  jumps: ['jump', 'jumped'],
  whole: ['hole'],
  hole: ['whole'],
  blue: ['blew'],
  blew: ['blue'],
  great: ['grate'],
  grate: ['great'],
  patience: ['patients'],
  patients: ['patience'],
  air: ['heir'],
  heir: ['air'],
  practice: ['practise'],
  practise: ['practice'],
  day: ['days'],
  days: ['day'],
  morning: ['mourning'],
  mourning: ['morning'],
  things: ['thing'],
  thing: ['things'],
  makes: ['make'],
  make: ['makes'],
  helps: ['help'],
  help: ['helps'],
  fills: ['fill'],
  fill: ['fills'],
  boost: ['boosts'],
  boosts: ['boost'],
  challenges: ['challenge'],
  challenge: ['challenges'],
  reflect: ['reflects'],
  reflects: ['reflect'],
  doors: ['door'],
  door: ['doors'],
  adventures: ['adventure'],
  adventure: ['adventures'],
  focus: ['focuses'],
  focuses: ['focus']
};

const stripSuffix = (w) => (w || '').toLowerCase().replace(/(es|s|ed|ing|ly|'s)$/gi, '');

// Phonetic normalizer to handle silent letters, digraphs, and common oral variations
const normalizePhonetic = (word) => {
  if (!word) return '';
  let w = word.toLowerCase().replace(/[^a-z]/g, '');
  w = w.replace(/^kn/, 'n');   // knight -> night
  w = w.replace(/^wr/, 'r');   // write -> right
  w = w.replace(/^wh/, 'w');   // whether -> weather
  w = w.replace(/^ps/, 's');
  w = w.replace(/^pn/, 'n');
  w = w.replace(/ight/g, 'ite'); // night -> nite, bright -> brite
  w = w.replace(/ph/g, 'f');
  w = w.replace(/([b-df-hj-np-tv-z])\1+/g, '$1'); // collapse duplicate consonants
  w = w.replace(/(es|s|ed|ing|ly|'s)$/g, '');     // strip suffixes
  return w;
};

// Check if a target word and a spoken word match phonetically
const isPhoneticMatch = (cleanTarget, hw) => {
  if (!cleanTarget || !hw) return false;
  const t = cleanTarget.toLowerCase();
  const h = hw.toLowerCase();
  if (t === h) return true;

  // 1. Homophone dictionary check
  if (HOMOPHONE_DICTIONARY[t]?.includes(h) || HOMOPHONE_DICTIONARY[h]?.includes(t)) return true;

  // 2. Stem match & stem homophone check (e.g. night vs knights, brightly vs bright)
  const tStem = stripSuffix(t);
  const hStem = stripSuffix(h);
  if (tStem && hStem) {
    if (tStem === hStem) return true;
    if (HOMOPHONE_DICTIONARY[tStem]?.includes(hStem) || HOMOPHONE_DICTIONARY[hStem]?.includes(tStem)) return true;
    if (HOMOPHONE_DICTIONARY[tStem]?.includes(h) || HOMOPHONE_DICTIONARY[t]?.includes(hStem)) return true;
  }

  // 3. Phonetic normalization match (silent letters, digraphs, suffix stripping)
  const tNorm = normalizePhonetic(t);
  const hNorm = normalizePhonetic(h);
  if (tNorm && hNorm && tNorm === hNorm) return true;

  // 4. Minor typo / ASR artifact: edit distance <= 1 on longer words only (length >= 6)
  const dist = getEditDistance(t, h);
  if (dist <= 1 && t.length >= 6 && h.length >= 6) return true;

  // 5. Prefix match for long words (length >= 5) with max 1 char difference
  if ((t.length >= 5 && h.length >= 5) && (t.startsWith(h) || h.startsWith(t)) && Math.abs(t.length - h.length) <= 2) {
    return true;
  }

  return false;
};

// Identify genuine mispronunciations without greedily stealing other target words
const isCandidateMispronunciation = (cleanTarget, hw, allCleanTargets) => {
  if (!cleanTarget || !hw) return false;
  const t = cleanTarget.toLowerCase();
  const h = hw.toLowerCase();
  if (t === h) return false;

  // CRUCIAL: If the spoken word matches ANY target word in the sentence, it is NEVER a mispronunciation of this word!
  if (allCleanTargets.some(otherTarget => isPhoneticMatch(otherTarget, h))) {
    return false;
  }

  // Small words (<= 3 chars like 'in', 'the', 'a', 'to') cannot be fuzzy matched to arbitrary words
  if (t.length <= 3 || h.length <= 3) {
    return false;
  }

  const dist = getEditDistance(t, h);
  const lenDiff = Math.abs(t.length - h.length);

  // Words length 4-5: edit distance must be 1 (e.g. 'dark' vs 'bark', 'glow' vs 'blow')
  if (t.length <= 5) {
    return dist === 1 && lenDiff <= 1;
  }

  // Words length 6+: edit distance <= 2, and must share starting letter or similar root
  if (t.length >= 6) {
    return dist <= 2 && lenDiff <= 2 && (t[0] === h[0] || getEditDistance(t.slice(0, 3), h.slice(0, 3)) <= 1);
  }

  return false;
};

// Global sequence alignment (Needleman-Wunsch DP) to align target sentence with spoken transcript
const alignTranscriptToTarget = (cleanTargetWords, cleanHeardWords, originalTargetWords, isSessionActive = true) => {
  const n = cleanTargetWords.length;
  const m = cleanHeardWords.length;

  if (n === 0) return { wordStatuses: [], correctCount: 0, mispronouncedList: [], omittedList: [] };

  if (m === 0) {
    const wordStatuses = originalTargetWords.map((orig) => ({
      word: orig,
      status: isSessionActive ? 'pending' : 'omitted',
      heard: '-'
    }));
    const omittedList = isSessionActive ? [] : originalTargetWords.map((orig, idx) => ({ target: orig, index: idx }));
    return { wordStatuses, correctCount: 0, mispronouncedList: [], omittedList };
  }

  const MATCH_SCORE = 10;
  const MISPRONOUNCE_SCORE = 2;
  const SKIP_TARGET_PENALTY = -2;
  const EXTRA_SPOKEN_PENALTY = -1;
  const MISMATCH_PENALTY = -15;

  const dp = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  const traceback = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(''));

  for (let i = 1; i <= n; i++) {
    dp[i][0] = dp[i - 1][0] + SKIP_TARGET_PENALTY;
    traceback[i][0] = 'skip_target';
  }
  for (let j = 1; j <= m; j++) {
    dp[0][j] = dp[0][j - 1] + EXTRA_SPOKEN_PENALTY;
    traceback[0][j] = 'extra_spoken';
  }

  for (let i = 1; i <= n; i++) {
    const t = cleanTargetWords[i - 1];
    for (let j = 1; j <= m; j++) {
      const h = cleanHeardWords[j - 1];

      let diagScore;
      let diagType;
      if (isPhoneticMatch(t, h)) {
        diagScore = dp[i - 1][j - 1] + MATCH_SCORE;
        diagType = 'match';
      } else if (isCandidateMispronunciation(t, h, cleanTargetWords)) {
        diagScore = dp[i - 1][j - 1] + MISPRONOUNCE_SCORE;
        diagType = 'mispronounce';
      } else {
        diagScore = dp[i - 1][j - 1] + MISMATCH_PENALTY;
        diagType = 'mismatch';
      }

      const skipTargetScore = dp[i - 1][j] + SKIP_TARGET_PENALTY;
      const extraSpokenScore = dp[i][j - 1] + EXTRA_SPOKEN_PENALTY;

      let bestScore = diagScore;
      let bestMove = diagType;

      if (skipTargetScore > bestScore) {
        bestScore = skipTargetScore;
        bestMove = 'skip_target';
      }
      if (extraSpokenScore > bestScore) {
        bestScore = extraSpokenScore;
        bestMove = 'extra_spoken';
      }

      dp[i][j] = bestScore;
      traceback[i][j] = bestMove;
    }
  }

  let i = n;
  let j = m;
  const alignment = [];

  while (i > 0 || j > 0) {
    const move = traceback[i][j];
    if (i > 0 && j > 0 && (move === 'match' || move === 'mispronounce' || move === 'mismatch')) {
      alignment.unshift({ targetIdx: i - 1, heardIdx: j - 1, type: move });
      i--;
      j--;
    } else if (i > 0 && (j === 0 || move === 'skip_target')) {
      alignment.unshift({ targetIdx: i - 1, heardIdx: -1, type: 'skip_target' });
      i--;
    } else if (j > 0) {
      alignment.unshift({ targetIdx: -1, heardIdx: j - 1, type: 'extra_spoken' });
      j--;
    } else {
      break;
    }
  }

  let correctCount = 0;
  const mispronouncedList = [];
  const omittedList = [];

  let maxMatchedTargetIdx = -1;
  alignment.forEach((item) => {
    if (item.type === 'match' || item.type === 'mispronounce') {
      if (item.targetIdx > maxMatchedTargetIdx) maxMatchedTargetIdx = item.targetIdx;
    }
  });

  const wordStatuses = originalTargetWords.map((orig, idx) => {
    const alignedItem = alignment.find((a) => a.targetIdx === idx);

    if (!alignedItem || alignedItem.type === 'skip_target') {
      if (isSessionActive && idx > maxMatchedTargetIdx) {
        return { word: orig, status: 'pending', heard: '' };
      }
      omittedList.push({ target: orig, index: idx });
      return { word: orig, status: 'omitted', heard: '-' };
    }

    if (alignedItem.type === 'match') {
      correctCount++;
      return { word: orig, status: 'correct', heard: cleanHeardWords[alignedItem.heardIdx] };
    }

    if (alignedItem.type === 'mispronounce') {
      const heardWord = cleanHeardWords[alignedItem.heardIdx];
      mispronouncedList.push({ target: orig, heard: heardWord, index: idx });
      return { word: orig, status: 'mispronounced', heard: heardWord };
    }

    if (isSessionActive && idx > maxMatchedTargetIdx) {
      return { word: orig, status: 'pending', heard: '' };
    }
    omittedList.push({ target: orig, index: idx });
    return { word: orig, status: 'omitted', heard: '-' };
  });

  return { wordStatuses, correctCount, mispronouncedList, omittedList };
};

const VoicePractice = ({ onComplete }) => {
  const [practiceSentences, setPracticeSentences] = useState(() => getRandomSentences(4));
  const [isRecording, setIsRecording] = useState(false);
  const [sessionTime, setSessionTime] = useState(0);
  const [currentTextIndex, setCurrentTextIndex] = useState(0);
  const [transcript, setTranscript] = useState('');
  const [feedback, setFeedback] = useState({ text: 'Click "Activate Microphone & Start Voice Practice" to begin', type: 'neutral' });
  const [isFinished, setIsFinished] = useState(false);
  const [sentenceReports, setSentenceReports] = useState({});  // { [idx]: string transcript }
  const [finalReport, setFinalReport] = useState(null);        // analyzeReading() result (single source of truth)
  const [isMicListening, setIsMicListening] = useState(false);
  const [micVolume, setMicVolume] = useState(0);
  const [audioErrorMessage, setAudioErrorMessage] = useState(null);

  // Refs for stale-closure-safe access inside async callbacks
  const sentenceReportsRef = useRef({});   // mirrors sentenceReports state
  const sessionTimeRef     = useRef(0);    // mirrors sessionTime state
  const startTimestampRef  = useRef(null); // Date.now() when recording started
  const endTimestampRef    = useRef(null); // Date.now() when recording stopped

  const isStartingRef = useRef(false);
  const audioCaptureErrorRef = useRef(false);
  const audioCaptureRetryCountRef = useRef(0);
  const prevIsRecordingRef = useRef(false);

  const recognitionRef = useRef(null);

  const transcriptRef = useRef('');
  const accumulatedTranscriptRef = useRef('');
  const sessionFinalRef = useRef('');
  const sessionInterimRef = useRef('');

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

  // ─── Live per-sentence analysis (for word-coloring during recording) ────────
  // Stores only the transcript string per sentence; final scoring runs
  // via analyzeReadingEngine in finishLiveSession.
  const analyzeLive = useCallback((heardText, targetSentence, isSessionActive = true) => {
    if (!targetSentence) return;
    const targetWords = targetSentence.split(" ").filter(Boolean);
    const cleanTargetWords = targetWords.map(w => w.toLowerCase().replace(/[^\w]/g, ''));
    const cleanHeardWords = (heardText || '').toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/).filter(Boolean);

    // Save transcript string for final scoring (ref is stale-closure-safe)
    const newReports = {
      ...sentenceReportsRef.current,
      [currentTextIndexRef.current]: heardText || ''
    };
    sentenceReportsRef.current = newReports;
    setSentenceReports(newReports);

    // Live word coloring via existing DP alignment (kept for UX only, not scoring)
    if (cleanHeardWords.length === 0) {
      const wordStatuses = targetWords.map(w => ({ word: w, status: isSessionActive ? 'pending' : 'omitted', heard: '-' }));
      setLiveWordStatuses(wordStatuses);
      setLiveAccuracy(null);
      if (isSessionActive) {
        setFeedback({ text: '🎤 Microphone Active — Read the sentence aloud!', type: 'progress' });
      } else {
        setFeedback({ text: `❌ Needs Improvement — 0% accuracy (0/${targetWords.length} words correct, ${PASS_THRESHOLD}% required to Pass)`, type: 'progress' });
      }
      return;
    }

    const { wordStatuses, correctCount, mispronouncedList } = alignTranscriptToTarget(
      cleanTargetWords, cleanHeardWords, targetWords, isSessionActive
    );
    const accuracyScore = Math.round((correctCount / targetWords.length) * 100);
    setLiveWordStatuses(wordStatuses);
    setLiveAccuracy(accuracyScore);

    if (accuracyScore >= PASS_THRESHOLD) {
      setFeedback({ text: `✅ PASS — ${accuracyScore}% word accuracy (${correctCount}/${targetWords.length} words correct)!`, type: 'success' });
    } else if (isSessionActive && correctCount > 0) {
      setFeedback({ text: `🎤 Reading: ${correctCount}/${targetWords.length} words correct (${accuracyScore}%) — keep reading!`, type: 'progress' });
    } else {
      setFeedback({ text: `❌ Needs Improvement — ${accuracyScore}% accuracy (${correctCount}/${targetWords.length} words correct, ${PASS_THRESHOLD}% required to Pass)`, type: 'progress' });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Live display state (separate from scoring)
  const [liveWordStatuses, setLiveWordStatuses] = useState([]);
  const [liveAccuracy, setLiveAccuracy]         = useState(null);

  const networkRetryCountRef = useRef(0);
  const isStartedRef = useRef(false);

  // Dynamic audio waveform simulation when microphone is listening
  // Eliminates hardware collisions by not holding an exclusive getUserMedia audio lock
  useEffect(() => {
    let animId;
    if (isMicListening && isRecording && !isFinished) {
      let t = 0;
      const animate = () => {
        t += 0.2;
        const baseLevel = 45 + Math.sin(t) * 25 + Math.random() * 15;
        setMicVolume(Math.round(baseLevel));
        animId = requestAnimationFrame(animate);
      };
      animId = requestAnimationFrame(animate);
    } else {
      setMicVolume(0);
    }
    return () => {
      if (animId) cancelAnimationFrame(animId);
    };
  }, [isMicListening, isRecording, isFinished]);

  // Clean, persistent & resilient Speech Recognition session manager
  // Preserves accumulated transcripts across Chrome's automatic onend pause cycles
  const startSpeechRecognitionSession = (resetAccumulator = false) => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setFeedback({ text: 'Speech engine fallback active. Type or use preset buttons below to test.', type: 'neutral' });
      return;
    }

    // Guard against concurrent duplicate starts, unless explicit reset requested
    if (isStartingRef.current || (isStartedRef.current && !resetAccumulator)) {
      return;
    }

    if (resetAccumulator) {
      accumulatedTranscriptRef.current = '';
      sessionFinalRef.current = '';
      sessionInterimRef.current = '';
      transcriptRef.current = '';
      setTranscript('');
      audioCaptureRetryCountRef.current = 0;
    }

    audioCaptureErrorRef.current = false;
    isStartingRef.current = true;

    // Safely cleanup previous recognition object if any
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onstart = null;
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.abort();
      } catch (e) {}
      recognitionRef.current = null;
    }
    isStartedRef.current = false;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      isStartingRef.current = false;
      isStartedRef.current = true;
      audioCaptureErrorRef.current = false;
      audioCaptureRetryCountRef.current = 0;
      setAudioErrorMessage(null);
      setIsMicListening(true);
      networkRetryCountRef.current = 0;
      setFeedback({ text: '🎤 Microphone Active — Read the sentence aloud!', type: 'progress' });
    };

    recognition.onresult = (event) => {
      networkRetryCountRef.current = 0;
      let finalPart = '';
      let interimPart = '';
      for (let i = 0; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalPart += event.results[i][0].transcript + ' ';
        } else {
          interimPart += event.results[i][0].transcript + ' ';
        }
      }
      sessionFinalRef.current = finalPart.trim();
      sessionInterimRef.current = interimPart.trim();

      const fullTranscript = [
        accumulatedTranscriptRef.current,
        sessionFinalRef.current,
        sessionInterimRef.current
      ]
        .filter(Boolean)
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();

      transcriptRef.current = fullTranscript;
      setTranscript(fullTranscript);
      analyzeLive(fullTranscript, practiceSentencesRef.current[currentTextIndexRef.current], true);
    };

    recognition.onerror = (event) => {
      isStartingRef.current = false;
      if (event.error === 'aborted') {
        isStartedRef.current = false;
        return;
      }
      console.warn("[VoicePractice] Speech recognition error:", event.error);

      if (event.error === 'not-allowed') {
        setIsMicListening(false);
        isStartedRef.current = false;
        audioCaptureErrorRef.current = true;
        setAudioErrorMessage("Microphone permission was denied. Please allow microphone access in your browser settings.");
        setFeedback({ text: '⚠️ Microphone access blocked. Please allow mic in browser settings.', type: 'neutral' });
        return;
      }

      if (event.error === 'audio-capture') {
        setIsMicListening(false);
        isStartedRef.current = false;
        if (audioCaptureRetryCountRef.current < 2 && isRecordingRef.current && !isFinishedRef.current) {
          audioCaptureRetryCountRef.current += 1;
          setFeedback({ text: '⏳ Connecting microphone...', type: 'progress' });
          setTimeout(() => {
            if (isRecordingRef.current && !isFinishedRef.current && !isStartedRef.current && !isStartingRef.current) {
              startSpeechRecognitionSession(false);
            }
          }, 1000);
          return;
        }
        audioCaptureErrorRef.current = true;
        setAudioErrorMessage("Microphone hardware busy or unavailable. Check if another app (Teams, Zoom, Recorder) is using it.");
        setFeedback({ text: '⚠️ Microphone hardware busy or in use. Click "Retry Recording" to reconnect.', type: 'neutral' });
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
      isStartingRef.current = false;
      isStartedRef.current = false;

      // Commit recognized speech from this cycle to the persistent buffer so pauses don't erase speech
      const newlyFinalized = [sessionFinalRef.current, sessionInterimRef.current].filter(Boolean).join(' ').trim();
      if (newlyFinalized) {
        accumulatedTranscriptRef.current = [accumulatedTranscriptRef.current, newlyFinalized]
          .filter(Boolean)
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim();
      }
      sessionFinalRef.current = '';
      sessionInterimRef.current = '';

      // If there was an audio-capture or permission error, do NOT auto-restart in a loop!
      if (audioCaptureErrorRef.current) {
        setIsMicListening(false);
        return;
      }

      if (isRecordingRef.current && !isFinishedRef.current) {
        // Auto restart for continuous listening within the current sentence
        const delay = networkRetryCountRef.current > 0 ? 1200 : 350;
        setTimeout(() => {
          if (isRecordingRef.current && !isFinishedRef.current && !isStartedRef.current && !isStartingRef.current && !audioCaptureErrorRef.current) {
            try {
              recognition.start();
              isStartingRef.current = true;
            } catch (e) {
              isStartingRef.current = false;
            }
          }
        }, delay);
      } else {
        setIsMicListening(false);
      }
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch (e) {
      isStartingRef.current = false;
      isStartedRef.current = false;
    }
  };

  // Mount effect to clean up speech engine on unmount
  useEffect(() => {
    return () => {
      isStartingRef.current = false;
      isStartedRef.current = false;
      if (recognitionRef.current) {
        try {
          recognitionRef.current.onstart = null;
          recognitionRef.current.onresult = null;
          recognitionRef.current.onerror = null;
          recognitionRef.current.onend = null;
          recognitionRef.current.abort();
        } catch (e) {}
        recognitionRef.current = null;
      }
    };
  }, []);

  // Control speech recognition starting / stopping on pause toggle
  useEffect(() => {
    if (prevIsRecordingRef.current !== isRecording) {
      prevIsRecordingRef.current = isRecording;
      if (isRecording && !isFinished) {
        if (!isStartedRef.current && !isStartingRef.current) {
          startSpeechRecognitionSession(false);
        }
      } else if (!isRecording || isFinished) {
        if (recognitionRef.current && (isStartedRef.current || isStartingRef.current)) {
          try {
            recognitionRef.current.abort();
          } catch (e) {}
          isStartedRef.current = false;
          isStartingRef.current = false;
          setIsMicListening(false);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRecording, isFinished]);

  // Timer — keeps sessionTimeRef in sync so finishLiveSession has the real value
  useEffect(() => {
    let timer;
    if (isRecording && !isFinished) {
      if (!startTimestampRef.current) {
        startTimestampRef.current = Date.now();
      }
      timer = setInterval(() => {
        const elapsed = Math.round((Date.now() - startTimestampRef.current) / 1000);
        sessionTimeRef.current = elapsed;
        setSessionTime(elapsed);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isRecording, isFinished]);

  const startVoiceSession = async () => {
    setAudioErrorMessage(null);
    audioCaptureErrorRef.current = false;
    audioCaptureRetryCountRef.current = 0;
    accumulatedTranscriptRef.current = '';
    sessionFinalRef.current = '';
    sessionInterimRef.current = '';
    transcriptRef.current = '';
    setTranscript('');
    // Start timestamp for accurate WPM / duration
    startTimestampRef.current = Date.now();
    endTimestampRef.current   = null;
    sessionTimeRef.current    = 0;
    setSessionTime(0);

    // Pre-Flight Stream Probe: verify device availability, wake up hardware, and release cleanly
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const tempStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        // Immediately release tracks so recognition can acquire the exclusive input
        tempStream.getTracks().forEach((track) => track.stop());
        // Buffer to ensure OS audio pipeline cleanly finishes releasing device
        await new Promise((r) => setTimeout(r, 120));
      } catch (err) {
        console.warn("[VoicePractice] Mic pre-flight check failed:", err);
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setAudioErrorMessage("Microphone permission was denied. Please allow microphone access in your browser settings.");
          setFeedback({ text: '⚠️ Microphone access blocked. Please allow mic in browser settings.', type: 'neutral' });
        } else {
          setAudioErrorMessage("Microphone hardware busy or unavailable. Check if another app (Teams, Zoom, Recorder) is using it.");
          setFeedback({ text: '⚠️ Microphone hardware busy or unavailable.', type: 'neutral' });
        }
        setIsRecording(false);
        setIsMicListening(false);
        prevIsRecordingRef.current = false;
        return;
      }
    }

    prevIsRecordingRef.current = true;
    setIsRecording(true);
    startSpeechRecognitionSession(true);
  };

  const stopVoiceSession = () => {
    setAudioErrorMessage(null);
    // Record end timestamp BEFORE clearing state
    if (!endTimestampRef.current) {
      endTimestampRef.current = Date.now();
    }
    // Do NOT clear transcriptRef / accumulatedTranscriptRef here — finishLiveSession reads them
    prevIsRecordingRef.current = false;
    setIsRecording(false);
    setIsMicListening(false);
    isStartingRef.current = false;
    isStartedRef.current = false;
    audioCaptureRetryCountRef.current = 0;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onstart = null;
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.abort();
      } catch (e) {}
      recognitionRef.current = null;
    }
  };

  const changeSentence = (newIndex) => {
    setCurrentTextIndex(newIndex);
    accumulatedTranscriptRef.current = '';
    sessionFinalRef.current = '';
    sessionInterimRef.current = '';
    transcriptRef.current = '';
    setTranscript('');
    audioCaptureErrorRef.current = false;
    audioCaptureRetryCountRef.current = 0;
    setAudioErrorMessage(null);
    setFeedback({ text: 'Next sentence ready. Read aloud into microphone...', type: 'progress' });
    if (isRecording && !isFinished) {
      startSpeechRecognitionSession(true);
    }
  };

  const handleNext = () => {
    // Save current transcript to ref before moving
    if (transcript) {
      const newReports = { ...sentenceReportsRef.current, [currentTextIndexRef.current]: transcript };
      sentenceReportsRef.current = newReports;
      setSentenceReports(newReports);
      analyzeLive(transcript, practiceSentences[currentTextIndex], false);
    }
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

  const handleRetry = async () => {
    accumulatedTranscriptRef.current = '';
    sessionFinalRef.current = '';
    sessionInterimRef.current = '';
    transcriptRef.current = '';
    setTranscript('');
    audioCaptureErrorRef.current = false;
    audioCaptureRetryCountRef.current = 0;
    setAudioErrorMessage(null);
    setSentenceReports(prev => {
      const copy = { ...prev };
      delete copy[currentTextIndex];
      return copy;
    });
    setFeedback({ text: '🎤 Retrying — Read the sentence aloud into your microphone!', type: 'progress' });

    // Pre-Flight Stream Probe on retry
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const tempStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        tempStream.getTracks().forEach((track) => track.stop());
        await new Promise((r) => setTimeout(r, 120));
      } catch (err) {
        console.warn("[VoicePractice] Mic retry pre-flight check failed:", err);
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setAudioErrorMessage("Microphone permission was denied. Please allow microphone access in your browser settings.");
          setFeedback({ text: '⚠️ Microphone access blocked. Please allow mic in browser settings.', type: 'neutral' });
        } else {
          setAudioErrorMessage("Microphone hardware busy or unavailable. Check if another app (Teams, Zoom, Recorder) is using it.");
          setFeedback({ text: '⚠️ Microphone hardware busy or unavailable.', type: 'neutral' });
        }
        setIsRecording(false);
        setIsMicListening(false);
        prevIsRecordingRef.current = false;
        return;
      }
    }

    prevIsRecordingRef.current = true;
    if (!isRecording) {
      setIsRecording(true);
    }
    startSpeechRecognitionSession(true);
  };

  const finishLiveSession = async () => {
    // Save current sentence transcript to ref BEFORE stopping
    if (transcript) {
      const newReports = { ...sentenceReportsRef.current, [currentTextIndexRef.current]: transcript };
      sentenceReportsRef.current = newReports;
      setSentenceReports(newReports);
    }

    stopVoiceSession(); // records endTimestampRef
    setIsFinished(true);

    // Build transcripts array from ref (stale-closure-safe)
    const sentences      = practiceSentencesRef.current;
    const transcriptMap  = sentenceReportsRef.current;
    const transcripts    = sentences.map((_, idx) => transcriptMap[idx] || '');
    const startTs        = startTimestampRef.current || (Date.now() - sessionTimeRef.current * 1000);
    const endTs          = endTimestampRef.current   || Date.now();

    // ── SINGLE SOURCE OF TRUTH: one call, one result object ──
    const report = analyzeReadingEngine(sentences, transcripts, startTs, endTs);
    setFinalReport(report);

    // Persist progress using real numbers from report
    const { summary } = report;
    const computedWpm = summary.wpm ?? 0;
    await saveTherapyProgress(
      currentUser,
      'voice',
      Math.round(summary.accuracy * 3),
      summary.accuracy,
      `${summary.durationSeconds}s (${computedWpm} WPM)`
    );
  };

  // Live display only — uses liveWordStatuses set by analyzeLive
  const currentStatuses = liveWordStatuses.length > 0
    ? liveWordStatuses
    : practiceSentences[currentTextIndex].split(" ").map(w => ({ word: w, status: 'pending' }));

  // For the completed report, pull everything from finalReport (single source of truth)
  const reportReady = isFinished && finalReport !== null;

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
              {!isRecording ? (
                <div className="camera-setup" style={{ padding: '1.25rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: '3rem' }}>{audioErrorMessage ? '🎙️⚠️' : '🎤'}</span>
                  {audioErrorMessage ? (
                    <div style={{ maxWidth: '92%', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: '10px', padding: '0.75rem', margin: '0.35rem 0' }}>
                      <p style={{ color: '#ef4444', fontWeight: 700, fontSize: '0.82rem', margin: '0 0 0.5rem 0', lineHeight: 1.4 }}>
                        {audioErrorMessage}
                      </p>
                      <button className="btn-run" onClick={startVoiceSession} style={{ background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', padding: '0.6rem 1.4rem', fontSize: '0.85rem', borderRadius: '8px' }}>
                        🔄 Retry Microphone Connection
                      </button>
                    </div>
                  ) : (
                    <button className="btn-run" onClick={startVoiceSession} style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #0d9488 100%)', padding: '0.85rem 1.75rem', fontSize: '0.95rem', borderRadius: '10px' }}>
                      🎤 Activate Microphone & Start Voice Practice
                    </button>
                  )}
                  {audioErrorMessage && (
                    <small style={{ color: 'var(--lf-text-muted)', fontSize: '0.75rem', marginTop: '4px' }}>
                      💡 Tip: You can also use the preset chips or type words below.
                    </small>
                  )}
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
                      {audioErrorMessage ? (
                        <div style={{ background: 'rgba(239, 68, 68, 0.25)', border: '1px solid rgba(239, 68, 68, 0.4)', borderRadius: '6px', padding: '6px 10px', color: '#fca5a5', fontSize: '0.72rem', fontWeight: 600 }}>
                          <div>⚠️ {audioErrorMessage}</div>
                          <button onClick={handleRetry} style={{ marginTop: '4px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '4px', padding: '3px 8px', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}>
                            🔄 Reconnect Mic
                          </button>
                        </div>
                      ) : (
                        <div className={`feedback-badge ${feedback.type}`} style={{ fontSize: '0.72rem', padding: '3px 8px', borderRadius: '6px', width: 'fit-content' }}>
                          {feedback.text}
                        </div>
                      )}
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
                  {liveAccuracy !== null && (
                    <span className={`badge ${liveAccuracy >= 70 ? 'badge-low' : 'badge-high'}`}>
                      {liveAccuracy}% Accuracy
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

                {liveWordStatuses.some(w => w.status === 'mispronounced') && (
                  <div style={{ marginTop: '1rem', padding: '0.65rem', background: 'rgba(244,63,94,0.08)', borderRadius: '8px', border: '1px solid rgba(244,63,94,0.2)', fontSize: '0.8rem' }}>
                    <strong style={{ color: '#f43f5e' }}>⚠️ Mispronunciation Detected:</strong>
                    {liveWordStatuses.filter(w => w.status === 'mispronounced').map((w, i) => (
                      <span key={i} style={{ marginLeft: '6px', fontWeight: 600 }}>
                        Target: "<strong>{w.word}</strong>" → Spoken: "<em>{w.heard}</em>"
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
                        transcriptRef.current = correctSample;
                        accumulatedTranscriptRef.current = correctSample;
                        sessionFinalRef.current = '';
                        sessionInterimRef.current = '';
                        analyzeLive(correctSample, correctSample, false);
                      }}
                      style={{ background: 'rgba(20, 184, 166, 0.1)', color: '#14b8a6', border: '1px solid rgba(20, 184, 166, 0.25)', padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer' }}
                    >
                      🧪 Test Correct
                    </button>
                    <button
                      onClick={() => {
                        const words = practiceSentences[currentTextIndex].split(" ");
                        let misSample = practiceSentences[currentTextIndex];
                        if (words.length > 2) {
                          // Change one letter in word 2 to simulate a natural oral mispronunciation
                          const targetWord = words[2];
                          if (targetWord.length >= 4) {
                            words[2] = 'b' + targetWord.slice(1);
                          } else {
                            words[2] = targetWord + 's';
                          }
                          misSample = words.join(" ");
                        } else {
                          misSample = practiceSentences[currentTextIndex] + " extra";
                        }
                        setTranscript(misSample);
                        transcriptRef.current = misSample;
                        accumulatedTranscriptRef.current = misSample;
                        sessionFinalRef.current = '';
                        sessionInterimRef.current = '';
                        analyzeLive(misSample, practiceSentences[currentTextIndex], false);
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
                      sessionFinalRef.current = '';
                      sessionInterimRef.current = '';
                      analyzeLive(val, practiceSentences[currentTextIndex], true);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const textToAnalyze = transcript.trim();
                        analyzeLive(textToAnalyze, practiceSentences[currentTextIndex], false);
                      }
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
                      analyzeLive(textToAnalyze, practiceSentences[currentTextIndex], false);
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
          {sentenceReports[currentTextIndex] !== undefined && (
            <details style={{ marginTop: '0.75rem', background: '#ffffff', padding: '0.85rem 1.25rem', borderRadius: '14px', border: '1.5px solid #e2e8f0', boxShadow: '0 4px 15px rgba(0,0,0,0.03)' }}>
              <summary style={{ cursor: 'pointer', fontWeight: 800, fontSize: '0.92rem', color: 'var(--lf-text-primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', userSelect: 'none' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  📊 Sentence Live Analysis (Click to view)
                </span>
                {liveAccuracy !== null && (
                  <span className="badge" style={{ background: liveAccuracy >= PASS_THRESHOLD ? 'rgba(20,184,166,0.12)' : 'rgba(245,158,11,0.12)', color: liveAccuracy >= PASS_THRESHOLD ? '#14b8a6' : '#f59e0b', fontWeight: 800, padding: '2px 8px', fontSize: '0.75rem' }}>
                    {liveAccuracy}% (live)
                  </span>
                )}
              </summary>

              <div style={{ marginTop: '0.85rem', paddingTop: '0.85rem', borderTop: '1px solid #f1f5f9' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '0.85rem' }}>
                  <div style={{ background: '#f8fafc', padding: '0.85rem 1rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                    <small style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: 'var(--lf-primary)', textTransform: 'uppercase', marginBottom: '4px' }}>🗣️ Spoken:</small>
                    <p style={{ margin: 0, fontSize: '0.92rem', fontWeight: 700, color: 'var(--lf-text-primary)', lineHeight: '1.4' }}>
                      "{sentenceReports[currentTextIndex] || transcript || '(No speech recorded)'}"
                    </p>
                  </div>
                  <div style={{ background: '#f8fafc', padding: '0.85rem 1rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                    <small style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: '#0d9488', textTransform: 'uppercase', marginBottom: '4px' }}>🎯 Target:</small>
                    <p style={{ margin: 0, fontSize: '0.92rem', fontWeight: 700, color: 'var(--lf-text-primary)', lineHeight: '1.4' }}>
                      "{practiceSentences[currentTextIndex]}"
                    </p>
                  </div>
                </div>
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--lf-text-muted)', fontStyle: 'italic' }}>
                  Final scores will be computed when you finish the session.
                </p>
              </div>
            </details>
          )}

          <div className="live-controls" style={{ marginTop: '0.75rem', paddingTop: '0.75rem' }}>
            {!isRecording ? (
              <button className="btn-primary" onClick={startVoiceSession} style={{ padding: '0.55rem 1.5rem', fontSize: '0.85rem', fontWeight: 700 }}>
                🎤 Activate Microphone & Start Voice Practice
              </button>
            ) : (
              <button 
                className={`record-toggle ${isRecording ? 'active' : ''}`}
                onClick={() => {
                  if (isRecording) {
                    stopVoiceSession();
                  } else {
                    startVoiceSession();
                  }
                }}
                style={{ padding: '0.55rem 1.5rem', fontSize: '0.85rem' }}
              >
                {isRecording ? "⏹ Pause Voice Practice" : "⏺ Resume Voice Practice"}
              </button>
            )}
            <button className="btn-text" onClick={finishLiveSession} style={{ padding: '0.5rem 1.25rem', fontSize: '0.85rem' }}>View Final Oral Reading Report</button>
          </div>
        </>
      ) : (
        /* ── POST-SESSION REPORT — ALL NUMBERS FROM finalReport (single source of truth) ── */
        <div className="oral-report-container" style={{ background: '#ffffff', padding: '2rem', borderRadius: '20px', border: '2px solid var(--lf-border)', boxShadow: '0 10px 30px rgba(0,0,0,0.08)' }}>
          {!reportReady ? (
            <div style={{ textAlign: 'center', padding: '3rem' }}>
              <span style={{ fontSize: '2rem' }}>⏳</span>
              <p style={{ color: 'var(--lf-text-muted)', fontWeight: 700 }}>Computing your results…</p>
            </div>
          ) : (() => {
            const { sentences: sentenceResults, summary } = finalReport;
            const acc = summary.accuracy;
            const wpmDisplay = summary.wpm !== null ? `${summary.wpm} WPM` : '—';

            return (
              <>
                <header style={{ borderBottom: '2px dashed var(--lf-border)', paddingBottom: '1.25rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span className="badge badge-info" style={{ marginBottom: '0.4rem', fontSize: '0.85rem', padding: '4px 12px' }}>🎈 Child Reading Diagnostic Report</span>
                    <h2 style={{ fontSize: '1.75rem', fontWeight: 900, margin: 0, color: 'var(--lf-text-primary)' }}>Oral Reading Fluency & Speech Analysis</h2>
                    <small style={{ color: 'var(--lf-text-muted)', fontWeight: 600 }}>
                      Session Duration: {summary.durationSeconds}s | Speaker: {currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Learner'}
                    </small>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1.5rem', marginBottom: '2px' }}>{acc >= 90 ? '⭐️⭐️⭐️' : acc >= 70 ? '⭐️⭐️' : '⭐️'}</div>
                    <div style={{ fontSize: '2rem', fontWeight: 900, color: acc >= 70 ? '#14b8a6' : '#f59e0b' }}>{acc}%</div>
                    <small style={{ color: 'var(--lf-text-muted)', fontWeight: 700 }}>Phonetic Accuracy</small>
                  </div>
                </header>

                {/* ── METRICS GRID — from summary only ── */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1rem', marginBottom: '1.75rem' }}>
                  <div style={{ background: 'rgba(20,184,166,0.08)', padding: '1rem', borderRadius: '14px', border: '1.5px solid rgba(20,184,166,0.25)', textAlign: 'center' }}>
                    <span style={{ fontSize: '1.6rem' }}>✅</span>
                    <strong style={{ display: 'block', fontSize: '1.4rem', fontWeight: 800, color: '#14b8a6' }}>{summary.correctWords} / {summary.totalWords}</strong>
                    <small style={{ color: 'var(--lf-text-muted)', fontWeight: 700 }}>Words Correct</small>
                  </div>
                  <div style={{ background: 'rgba(59,130,246,0.08)', padding: '1rem', borderRadius: '14px', border: '1.5px solid rgba(59,130,246,0.25)', textAlign: 'center' }}>
                    <span style={{ fontSize: '1.6rem' }}>⏱️</span>
                    <strong style={{ display: 'block', fontSize: '1.4rem', fontWeight: 800, color: '#3b82f6' }}>{wpmDisplay}</strong>
                    <small style={{ color: 'var(--lf-text-muted)', fontWeight: 700 }}>Reading Speed</small>
                  </div>
                  <div style={{ background: 'rgba(244,63,94,0.08)', padding: '1rem', borderRadius: '14px', border: '1.5px solid rgba(244,63,94,0.25)', textAlign: 'center' }}>
                    <span style={{ fontSize: '1.6rem' }}>❌</span>
                    <strong style={{ display: 'block', fontSize: '1.4rem', fontWeight: 800, color: '#f43f5e' }}>{summary.mispronounced}</strong>
                    <small style={{ color: 'var(--lf-text-muted)', fontWeight: 700 }}>Mispronounced</small>
                  </div>
                  <div style={{ background: 'rgba(245,158,11,0.08)', padding: '1rem', borderRadius: '14px', border: '1.5px solid rgba(245,158,11,0.25)', textAlign: 'center' }}>
                    <span style={{ fontSize: '1.6rem' }}>⚠️</span>
                    <strong style={{ display: 'block', fontSize: '1.4rem', fontWeight: 800, color: '#f59e0b' }}>{summary.skipped}</strong>
                    <small style={{ color: 'var(--lf-text-muted)', fontWeight: 700 }}>Skipped Words</small>
                  </div>
                  <div style={{ background: 'rgba(100,116,139,0.08)', padding: '1rem', borderRadius: '14px', border: '1.5px solid rgba(100,116,139,0.25)', textAlign: 'center' }}>
                    <span style={{ fontSize: '1.6rem' }}>🕐</span>
                    <strong style={{ display: 'block', fontSize: '1.4rem', fontWeight: 800, color: '#64748b' }}>{summary.durationSeconds}s</strong>
                    <small style={{ color: 'var(--lf-text-muted)', fontWeight: 700 }}>Session Duration</small>
                  </div>
                </div>

                {/* ── DIAGNOSTIC — shown only when there is real data ── */}
                {summary.diagnostic && summary.diagnostic.type !== 'no_data' && (
                  <div style={{ background: 'linear-gradient(135deg, rgba(79,70,229,0.06) 0%, rgba(13,148,136,0.06) 100%)', padding: '1.25rem', borderRadius: '14px', border: '1.5px solid rgba(79,70,229,0.18)', marginBottom: '1.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.5rem' }}>
                      <span style={{ fontSize: '1.2rem' }}>🔬</span>
                      <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'var(--lf-primary)' }}>Child Dyslexia Speech & Fluency Diagnostic:</h4>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.92rem', lineHeight: '1.6', color: 'var(--lf-text-secondary)', fontWeight: 600 }}>
                      {summary.diagnostic.message}
                    </p>
                    {summary.diagnostic.disclaimer && (
                      <p style={{ margin: '0.75rem 0 0 0', fontSize: '0.78rem', color: 'var(--lf-text-muted)', fontStyle: 'italic' }}>
                        {summary.diagnostic.disclaimer}
                      </p>
                    )}
                  </div>
                )}

                {/* ── SENTENCE BREAKDOWN — from sentenceResults, not sentenceReports ── */}
                <h4 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '1rem', color: 'var(--lf-text-primary)' }}>Sentence-by-Sentence Fluency Breakdown</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
                  {sentenceResults.map((sr, idx) => {
                    const badgeStyle = sr.status === 'PASS'
                      ? { bg: 'rgba(20,184,166,0.12)', color: '#14b8a6' }
                      : sr.status === 'NEEDS_PRACTICE'
                      ? { bg: 'rgba(245,158,11,0.12)', color: '#d97706' }
                      : { bg: 'rgba(244,63,94,0.12)', color: '#f43f5e' };
                    const statusLabel = sr.status === 'PASS' ? '✅ PASS' : sr.status === 'NEEDS_PRACTICE' ? '🟡 NEEDS PRACTICE' : '❌ FAIL';
                    const fluent = sr.mispronouncedCount === 0 && sr.skippedCount === 0 && sr.accuracy === 100;

                    return (
                      <div key={idx} style={{ background: '#f8fafc', padding: '1.1rem', borderRadius: '12px', border: '1px solid var(--lf-border)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                          <strong style={{ fontSize: '0.85rem', color: 'var(--lf-primary)' }}>Sentence #{idx + 1}</strong>
                          <span style={{ background: badgeStyle.bg, color: badgeStyle.color, border: `1px solid ${badgeStyle.color}`, padding: '2px 10px', borderRadius: '6px', fontWeight: 800, fontSize: '0.78rem' }}>
                            {statusLabel} ({sr.accuracy}%)
                          </span>
                        </div>

                        <p style={{ margin: '0 0 0.4rem 0', fontSize: '1.05rem', fontWeight: 700, color: 'var(--lf-text-primary)' }}>"{sr.referenceText}"</p>

                        {/* Show spoken transcript */}
                        {(sentenceReports[idx] || '') && (
                          <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.88rem', color: 'var(--lf-text-secondary)' }}>
                            🎤 <em>Spoken:</em> "{sentenceReports[idx]}"
                          </p>
                        )}

                        {/* Metrics row */}
                        <div style={{ display: 'flex', gap: '1.25rem', fontSize: '0.8rem', flexWrap: 'wrap', marginBottom: '0.4rem' }}>
                          <span><strong style={{ color: '#14b8a6' }}>✅ {sr.correctCount}</strong> correct</span>
                          <span><strong style={{ color: '#f43f5e' }}>❌ {sr.mispronouncedCount}</strong> mispronounced</span>
                          <span><strong style={{ color: '#f59e0b' }}>⚠️ {sr.skippedCount}</strong> skipped</span>
                          {sr.insertedCount > 0 && <span><strong style={{ color: '#6366f1' }}>➕ {sr.insertedCount}</strong> extra</span>}
                        </div>

                        {/* Mispronounced words */}
                        {sr.mispronouncedCount > 0 && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '0.5rem' }}>
                            {sr.words.filter(w => w.status === 'mispronounced').map((w, i) => (
                              <span key={i} style={{ background: 'rgba(244,63,94,0.12)', color: '#f43f5e', border: '1px solid rgba(244,63,94,0.3)', padding: '3px 8px', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 600 }}>
                                "{w.expected}" → "{w.spoken}"
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Skipped words */}
                        {sr.skippedCount > 0 && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '0.4rem' }}>
                            {sr.words.filter(w => w.status === 'skipped').map((w, i) => (
                              <span key={i} style={{ background: 'rgba(245,158,11,0.12)', color: '#d97706', border: '1px solid rgba(245,158,11,0.3)', padding: '3px 8px', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 600 }}>
                                Skipped: "{w.expected}"
                              </span>
                            ))}
                          </div>
                        )}

                        {/* "All fluent" — ONLY when accuracy IS 100% and errors ARE 0 */}
                        {fluent && sr.noSpeech !== true && (
                          <small style={{ color: '#14b8a6', fontWeight: 600 }}>✓ All words read fluently without errors!</small>
                        )}

                        {/* No speech case */}
                        {sr.noSpeech && (
                          <small style={{ color: '#f43f5e', fontWeight: 600 }}>🎤 No speech detected for this sentence.</small>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', flexWrap: 'wrap' }}>
                  <button className="btn-secondary" onClick={() => window.print()} style={{ fontWeight: 700 }}>🖨️ Print Report</button>
                  <button className="btn-secondary" style={{ fontWeight: 700 }} onClick={() => {
                    setPracticeSentences(getRandomSentences(4));
                    setIsFinished(false);
                    setCurrentTextIndex(0);
                    setSentenceReports({});
                    sentenceReportsRef.current = {};
                    setFinalReport(null);
                    setLiveWordStatuses([]);
                    setLiveAccuracy(null);
                    setSessionTime(0);
                    sessionTimeRef.current = 0;
                    startTimestampRef.current = null;
                    endTimestampRef.current = null;
                    setTranscript('');
                    transcriptRef.current = '';
                    accumulatedTranscriptRef.current = '';
                  }}>🔄 Practice New Sentence Set</button>
                  <button className="btn-primary" style={{ padding: '0.75rem 1.75rem', fontWeight: 700 }} onClick={onComplete}>Complete & View Dashboard →</button>
                </div>
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
};

export default VoicePractice;