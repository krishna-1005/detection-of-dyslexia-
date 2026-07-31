import React, { useState, useRef, useEffect } from 'react';
import './VideoPractice.css';
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
const PASS_THRESHOLD = 95;

// Points at your Flask backend's new /api/pronunciation-assessment route (see pronunciation_routes.py).
// Update the host/port if your Flask server runs somewhere other than localhost:5000, or use an
// env var like process.env.REACT_APP_API_URL if you already have one set up elsewhere in the app.
const PRONUNCIATION_ASSESSMENT_URL = "http://localhost:5000/api/pronunciation-assessment";

const VideoPractice = ({ onComplete }) => {
  const [practiceSentences, setPracticeSentences] = useState(() => getRandomSentences(4));
  const [stream, setStream] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [sessionTime, setSessionTime] = useState(0);
  const [currentTextIndex, setCurrentTextIndex] = useState(0);
  const [transcript, setTranscript] = useState('');
  const [feedback, setFeedback] = useState({ text: 'Click "Activate Camera & Start Voice Practice" to begin', type: 'neutral' });
  const [isFinished, setIsFinished] = useState(false);
  const [sentenceReports, setSentenceReports] = useState({});
  const [isMicListening, setIsMicListening] = useState(false);
  const [micVolume, setMicVolume] = useState(0);
  const [isAssessing, setIsAssessing] = useState(false); // true while waiting on the Azure pronunciation call

  const videoRef = useRef(null);
  const recognitionRef = useRef(null);
  const audioCtxRef = useRef(null);
  const analyserRef = useRef(null);

  // --- Real-audio recording (for Azure Pronunciation Assessment) ---
  const streamRef = useRef(null);        // latest camera/mic MediaStream, kept in sync with `stream` state
  const mediaRecorderRef = useRef(null); // MediaRecorder capturing the current sentence attempt
  const audioChunksRef = useRef([]);     // accumulated audio chunks for the in-progress recording

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
    streamRef.current = stream;
  }, [stream]);

  // Starts a fresh MediaRecorder against the active mic/camera stream, ready to
  // capture the next sentence-reading attempt as real audio for Azure to score.
  const startNewRecorder = (mediaStreamOverride) => {
    const targetStream = mediaStreamOverride || streamRef.current;
    if (!targetStream) return;
    try {
      const recorder = new MediaRecorder(targetStream, { mimeType: "audio/webm;codecs=opus" });
      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      mediaRecorderRef.current = recorder;
      recorder.start(250); // collect data every 250ms
    } catch (e) {
      console.warn("Audio recorder could not start:", e);
    }
  };

  // Stops the current recorder and resolves with the captured audio Blob (or null if nothing recorded).
  const stopRecordingAndGetBlob = () => {
    return new Promise((resolve) => {
      const recorder = mediaRecorderRef.current;
      if (!recorder || recorder.state === "inactive") {
        resolve(audioChunksRef.current.length ? new Blob(audioChunksRef.current, { type: "audio/webm" }) : null);
        return;
      }
      recorder.onstop = () => {
        const blob = audioChunksRef.current.length ? new Blob(audioChunksRef.current, { type: "audio/webm" }) : null;
        audioChunksRef.current = [];
        resolve(blob);
      };
      try {
        recorder.stop();
      } catch (e) {
        resolve(null);
      }
    });
  };

  // Converts a recorded audio Blob into base64 for sending to the Cloud Function as JSON.
  const blobToBase64 = (blob) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result.split(",")[1]);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  // Maps the Azure Pronunciation Assessment response into the same report shape
  // that analyzeReading() already produces, so all existing report UI just works.
  const applyAzureResult = (data, targetSentence) => {
    const targetWords = targetSentence.split(" ");
    // Azure (with EnableMiscue) aligns recognized words to the reference sequence;
    // filter out pure "Insertion" words (extra words not in the target) before mapping by position.
    const alignedWords = (data.words || []).filter((w) => w.errorType !== "Insertion");

    const wordStatuses = targetWords.map((originalWord, idx) => {
      const azureWord = alignedWords[idx];
      if (!azureWord || azureWord.errorType === "Omission") {
        return { word: originalWord, status: "omitted", heard: "-" };
      }
      if (azureWord.errorType === "Mispronunciation" || azureWord.accuracyScore < 60) {
        return { word: originalWord, status: "mispronounced", heard: azureWord.word };
      }
      return { word: originalWord, status: "correct", heard: azureWord.word };
    });

    const correctCount = wordStatuses.filter((w) => w.status === "correct").length;
    const mispronouncedList = wordStatuses
      .filter((w) => w.status === "mispronounced")
      .map((w) => ({ target: w.word, heard: w.heard }));
    const omittedList = wordStatuses
      .filter((w) => w.status === "omitted")
      .map((w) => ({ target: w.word }));
    const missedWords = [
      ...mispronouncedList.map((m) => ({ ...m, reason: "mispronounced" })),
      ...omittedList.map((m) => ({ ...m, reason: "omitted" })),
    ];

    setTranscript(data.recognizedText || "");
    setSentenceReports((prev) => ({
      ...prev,
      [currentTextIndexRef.current]: {
        targetSentence,
        transcript: data.recognizedText || "",
        wordStatuses,
        correctCount,
        totalWords: targetWords.length,
        accuracy: data.accuracy,
        mispronounced: mispronouncedList,
        omitted: omittedList,
        passStatus: data.passStatus,
        missedWords,
      },
    }));

    setFeedback(
      data.passStatus === "Pass"
        ? { text: `✅ PASS — ${data.accuracy}% phonetic accuracy (Azure)`, type: "success" }
        : { text: `❌ Needs Improvement — ${data.accuracy}% phonetic accuracy (Azure)`, type: "progress" }
    );
  };

  // Stops the current recording, sends it to the Azure-backed Cloud Function, and
  // applies the real phonetic assessment. Falls back to the local text-based
  // analyzeReading() if no audio was captured or the request fails, so the user
  // always gets a result even if the network/Azure call has a problem.
  const runPronunciationAssessment = async (targetSentence) => {
    setIsAssessing(true);
    try {
      const blob = await stopRecordingAndGetBlob();

      if (!blob || blob.size < 500) {
        // Too little/no audio captured — friendly inline message, then fall back to text matching
        setFeedback({ text: "🤫 No audio captured — please read the sentence aloud and try again.", type: "neutral" });
        const fallbackText = transcript.trim() || targetSentence;
        analyzeReading(fallbackText, targetSentence);
        return;
      }

      const audioBase64 = await blobToBase64(blob);

      const response = await fetch(PRONUNCIATION_ASSESSMENT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ audioBase64, referenceText: targetSentence }),
      });

      if (!response.ok) {
        throw new Error(`Assessment request failed with status ${response.status}`);
      }

      const data = await response.json();
      applyAzureResult(data, targetSentence);
    } catch (err) {
      console.warn("Azure pronunciation assessment failed, falling back to text match:", err);
      setFeedback({ text: "⚠️ Pronunciation check had an issue — showing a basic text match instead.", type: "neutral" });
      const fallbackText = transcript.trim() || targetSentence;
      analyzeReading(fallbackText, targetSentence);
    } finally {
      setIsAssessing(false);
      // Always leave a fresh recorder running so the next attempt/sentence can be captured
      startNewRecorder();
    }
  };

  // Analyze spoken transcript vs target sentence word-by-word
  const analyzeReading = (heardText, targetSentence) => {
    if (!heardText || !heardText.trim()) return;

    const targetWords = targetSentence.split(" ");
    const cleanTargetWords = targetWords.map(w => w.toLowerCase().replace(/[^\w]/g, ''));
    const cleanHeardWords = heardText.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/).filter(Boolean);

    let correctCount = 0;
    let mispronouncedList = [];
    let omittedList = [];
    let lastMatchedHeardIdx = -1;

    const wordStatuses = targetWords.map((originalWord, idx) => {
      const cleanTarget = cleanTargetWords[idx];
      if (!cleanTarget) return { word: originalWord, status: 'pending', heard: '' };

      // Check exact match in heard words near index or sequence
      const exactIdx = cleanHeardWords.findIndex((hw, i) => i > lastMatchedHeardIdx && hw === cleanTarget);
      if (exactIdx !== -1) {
        lastMatchedHeardIdx = exactIdx;
        correctCount++;
        return { word: originalWord, status: 'correct', heard: cleanTarget };
      }

      // Check if exact match exists anywhere in heard words
      const anyExactIdx = cleanHeardWords.findIndex(hw => hw === cleanTarget);
      if (anyExactIdx !== -1) {
        correctCount++;
        return { word: originalWord, status: 'correct', heard: cleanTarget };
      }

      // Look for fuzzy match (mispronunciation)
      const fuzzyIdx = cleanHeardWords.findIndex((hw, i) => {
        if (i <= lastMatchedHeardIdx) return false;
        const dist = getEditDistance(cleanTarget, hw);
        return dist > 0 && dist <= 2 && Math.abs(cleanTarget.length - hw.length) <= 2;
      });

      if (fuzzyIdx !== -1) {
        const heardWord = cleanHeardWords[fuzzyIdx];
        mispronouncedList.push({ target: originalWord, heard: heardWord, index: idx });
        return { word: originalWord, status: 'mispronounced', heard: heardWord };
      }

      // Check if user has already spoken words beyond this position in target sequence
      const futureWordsTarget = cleanTargetWords.slice(idx + 1);
      const userSpokeFutureWords = cleanHeardWords.some((hw, i) => i > lastMatchedHeardIdx && futureWordsTarget.includes(hw));

      if (userSpokeFutureWords) {
        omittedList.push({ target: originalWord, index: idx });
        return { word: originalWord, status: 'omitted', heard: '-' };
      }

      return { word: originalWord, status: 'pending', heard: '' };
    });

    const accuracyScore = Math.round((correctCount / targetWords.length) * 100);

    // Strict Pass/Fail verdict based on PASS_THRESHOLD (95%) word accuracy.
    // A combined list of every missed/mismatched word (mispronounced + omitted)
    // is stored alongside so the report can show exactly what needs fixing.
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

  // Persistent Speech Recognition Setup
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setFeedback({ text: 'Speech engine fallback active. Type or use preset buttons below to test.', type: 'neutral' });
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsMicListening(true);
      setFeedback({ text: '🎤 Microphone Active — Read the sentence aloud!', type: 'progress' });
    };

    recognition.onresult = (event) => {
      let currentTranscript = '';
      // Always iterate from index 0 to accumulate the full transcript for the current sentence
      for (let i = 0; i < event.results.length; i++) {
        currentTranscript += event.results[i][0].transcript + ' ';
      }
      const trimmed = currentTranscript.trim();
      setTranscript(trimmed);
      analyzeReading(trimmed, practiceSentencesRef.current[currentTextIndexRef.current]);
    };

    recognition.onerror = (event) => {
      console.warn("Speech recognition error:", event.error);
      if (event.error === 'no-speech') {
        // Friendly inline message for "no speech detected" instead of a silent console-only warning
        setFeedback({ text: '🤫 No speech detected — try reading the sentence a little louder.', type: 'neutral' });
        if (isRecordingRef.current && !isFinishedRef.current) {
          setTimeout(() => {
            try { recognition.start(); } catch (e) {}
          }, 400);
        }
      } else if (event.error === 'network') {
        setFeedback({ text: '⚠️ Speech service network hiccup — retrying...', type: 'neutral' });
        if (isRecordingRef.current && !isFinishedRef.current) {
          setTimeout(() => {
            try { recognition.start(); } catch (e) {}
          }, 400);
        }
      } else if (event.error === 'not-allowed') {
        setIsMicListening(false);
        setFeedback({ text: '⚠️ Microphone access blocked by browser settings.', type: 'neutral' });
      } else {
        // Catch-all for any other browser/engine error so the user always sees something
        setFeedback({ text: '⚠️ Voice recognition hit a snag. Please try again.', type: 'neutral' });
      }
    };

    recognition.onend = () => {
      setIsMicListening(false);
      if (isRecordingRef.current && !isFinishedRef.current) {
        setTimeout(() => {
          try { recognition.start(); } catch (e) {}
        }, 300);
      }
    };

    recognitionRef.current = recognition;

    return () => {
      try { recognition.stop(); } catch (e) {}
    };
  }, []);

  // Control speech recognition starting / stopping
  useEffect(() => {
    if (!recognitionRef.current) return;

    if (isRecording && !isFinished) {
      try {
        recognitionRef.current.start();
      } catch (e) {}
    } else {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
      setIsMicListening(false);
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

  useEffect(() => {
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  const startCamera = async () => {
    // Trigger speech recognition synchronously within user click event for Chrome activation
    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
      } catch (e) {
        console.warn("Speech recognition user click start:", e);
      }
    }

    try {
      let mediaStream = null;
      try {
        mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      } catch (camErr) {
        console.warn("Webcam unavailable, falling back to audio mic stream:", camErr);
        mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      }
      setStream(mediaStream);
      setIsRecording(true);
      if (mediaStream) {
        startAudioVisualizer(mediaStream);
        startNewRecorder(mediaStream); // begin capturing real audio for Azure pronunciation scoring
      }
    } catch (err) {
      setIsRecording(true);
      alert("Microphone requested. Please click 'Allow' in your browser so speech recognition can hear your voice.");
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsRecording(false);
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch(e){}
    }
    if (audioCtxRef.current) {
      try { audioCtxRef.current.close(); } catch(e){}
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      try { mediaRecorderRef.current.stop(); } catch (e) {}
    }
  };

  const changeSentence = (newIndex) => {
    setCurrentTextIndex(newIndex);
    setTranscript('');
    setFeedback({ text: 'Next sentence ready. Read aloud into microphone...', type: 'progress' });

    // Stop and restart recognition to reset accumulated event.results for the new sentence
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (e) {}
      setTimeout(() => {
        if (isRecordingRef.current && !isFinishedRef.current) {
          try { recognitionRef.current.start(); } catch (e) {}
        }
      }, 200);
    }

    // Discard any audio recorded for the previous sentence and start a clean recording for this one
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      try { mediaRecorderRef.current.stop(); } catch (e) {}
    }
    audioChunksRef.current = [];
    if (isRecordingRef.current && !isFinishedRef.current) {
      startNewRecorder();
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

    await saveTherapyProgress(currentUser, 'video', Math.round(overallAccuracy * 3), overallAccuracy, `${sessionTime}s`);
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3>Live Practice & Oral Reading Diagnostic</h3>
            {isRecording && (
              <div className="recording-indicator">
                <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: isMicListening ? '#14b8a6' : '#f43f5e', marginRight: '4px' }}></span>
                {isMicListening ? '🎤 MIC ACTIVE' : '● REC'} ({sessionTime}s)
              </div>
            )}
          </div>
          
          <p className="exercise-desc">
            Read each sentence aloud into your microphone. Our speech engine tracks your voice in real time and flags mispronounced or misread words.
          </p>

          <div className="live-practice-grid">
            {/* Webcam Feed & Mic Meter */}
            <div className="webcam-container">
              {!stream && !isRecording ? (
                <div className="camera-setup">
                  <span style={{ fontSize: '3.5rem' }}>📹</span>
                  <button className="btn-run" onClick={startCamera} style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #0d9488 100%)', padding: '0.85rem 1.75rem', fontSize: '0.95rem', borderRadius: '10px' }}>
                    🎥 Activate Camera & Start Voice Practice
                  </button>
                </div>
              ) : (
                <>
                  {stream ? (
                    <video ref={videoRef} autoPlay muted playsInline className="webcam-feed" />
                  ) : (
                    <div className="camera-setup" style={{ background: 'rgba(15, 23, 42, 0.95)', color: '#ffffff' }}>
                      <span style={{ fontSize: '3.5rem' }}>🎤</span>
                      <p style={{ margin: 0, fontWeight: 700 }}>Voice Practice Active (Audio Only)</p>
                    </div>
                  )}
                  <div className="live-transcript-overlay">
                    {/* Live Mic Decibel Meter */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(15, 23, 42, 0.85)', padding: '4px 10px', borderRadius: '8px', width: 'fit-content', border: '1px solid rgba(255,255,255,0.1)' }}>
                      <small style={{ color: '#14b8a6', fontSize: '0.72rem', fontWeight: 700 }}>MIC INPUT</small>
                      <div style={{ width: '80px', height: '6px', background: 'rgba(255,255,255,0.2)', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ width: `${Math.max(8, micVolume)}%`, height: '100%', background: micVolume > 30 ? '#14b8a6' : '#818cf8', transition: 'width 0.1s ease' }}></div>
                      </div>
                    </div>
                    <div className={`feedback-badge ${feedback.type}`}>
                      {feedback.text}
                    </div>
                    {transcript && <p className="live-text">🎤 Spoken: "{transcript}"</p>}
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
                      setTranscript(e.target.value);
                      analyzeReading(e.target.value, practiceSentences[currentTextIndex]);
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
                    disabled={isAssessing}
                    onClick={() => {
                      // If real mic audio was captured for this attempt, send it to Azure for
                      // true phonetic pronunciation scoring. Otherwise (typed input / preset test
                      // buttons), fall back to the existing local text-based match.
                      const hasRecordedAudio = audioChunksRef.current && audioChunksRef.current.length > 0;
                      if (hasRecordedAudio) {
                        runPronunciationAssessment(practiceSentences[currentTextIndex]);
                        return;
                      }
                      const textToAnalyze = transcript.trim() || practiceSentences[currentTextIndex];
                      if (!transcript.trim()) {
                        setTranscript(textToAnalyze);
                      }
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
                      cursor: isAssessing ? 'not-allowed' : 'pointer',
                      opacity: isAssessing ? 0.7 : 1,
                      boxShadow: 'var(--lf-shadow-sm)'
                    }}
                  >
                    {isAssessing ? '⏳ Analyzing...' : '🔍 Analyze'}
                  </button>
                </div>
              </div>

              {/* Detailed Sentence Analysis & Defect Diagnostic Card */}
              {sentenceReports[currentTextIndex] && (
                <div style={{ marginTop: '1rem', background: '#f8fafc', padding: '1rem', borderRadius: '12px', border: '1px solid var(--lf-border)', boxShadow: 'var(--lf-shadow-sm)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', borderBottom: '1px solid var(--lf-border)', paddingBottom: '0.5rem' }}>
                    <h5 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 800, color: 'var(--lf-text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      📊 Sentence Defect & Accuracy Diagnostic
                    </h5>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      {/* Explicit Pass/Fail verdict badge, driven by the 95% strict threshold (PASS_THRESHOLD) */}
                      <span className="badge" style={{ background: sentenceReports[currentTextIndex].passStatus === 'Pass' ? 'rgba(20, 184, 166, 0.12)' : 'rgba(244, 63, 94, 0.12)', color: sentenceReports[currentTextIndex].passStatus === 'Pass' ? '#14b8a6' : '#f43f5e', fontWeight: 800 }}>
                        {sentenceReports[currentTextIndex].passStatus === 'Pass' ? '✅ PASS' : '❌ FAIL'}
                      </span>
                      <span className="badge" style={{ background: (100 - (sentenceReports[currentTextIndex].accuracy || 0)) > 20 ? 'rgba(244, 63, 94, 0.12)' : 'rgba(20, 184, 166, 0.12)', color: (100 - (sentenceReports[currentTextIndex].accuracy || 0)) > 20 ? '#f43f5e' : '#14b8a6', fontWeight: 800 }}>
                        {100 - (sentenceReports[currentTextIndex].accuracy || 0)}% Defect
                      </span>
                      <span className="badge" style={{ background: (sentenceReports[currentTextIndex].accuracy || 0) >= PASS_THRESHOLD ? 'rgba(20, 184, 166, 0.12)' : 'rgba(245, 158, 11, 0.12)', color: (sentenceReports[currentTextIndex].accuracy || 0) >= PASS_THRESHOLD ? '#14b8a6' : '#f59e0b', fontWeight: 800 }}>
                        {sentenceReports[currentTextIndex].accuracy || 0}% Accuracy
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                    {/* What User Told */}
                    <div style={{ background: '#ffffff', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--lf-border)' }}>
                      <small style={{ display: 'block', fontSize: '0.7rem', fontWeight: 800, color: 'var(--lf-primary)', textTransform: 'uppercase', marginBottom: '3px' }}>
                        🗣️ What User Told / Spoke:
                      </small>
                      <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600, color: 'var(--lf-text-primary)' }}>
                        "{sentenceReports[currentTextIndex].transcript || transcript || '(No input captured yet)'}"
                      </p>
                    </div>

                    {/* Actual Expected Output */}
                    <div style={{ background: '#ffffff', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--lf-border)' }}>
                      <small style={{ display: 'block', fontSize: '0.7rem', fontWeight: 800, color: '#0d9488', textTransform: 'uppercase', marginBottom: '3px' }}>
                        🎯 Actual Target Output:
                      </small>
                      <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600, color: 'var(--lf-text-primary)' }}>
                        "{practiceSentences[currentTextIndex]}"
                      </p>
                    </div>
                  </div>

                  {/* Defect Metrics Summary */}
                  <div style={{ background: '#ffffff', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--lf-border)' }}>
                    <small style={{ display: 'block', fontSize: '0.7rem', fontWeight: 800, color: 'var(--lf-text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>
                      📋 Word Defect Analysis:
                    </small>
                    <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem', flexWrap: 'wrap' }}>
                      <div>
                        <span style={{ color: '#14b8a6', fontWeight: 700 }}>✅ Correct:</span>{' '}
                        <strong>{sentenceReports[currentTextIndex].correctCount} / {sentenceReports[currentTextIndex].totalWords} words</strong>
                      </div>
                      <div>
                        <span style={{ color: '#f43f5e', fontWeight: 700 }}>❌ Mispronounced:</span>{' '}
                        <strong>{sentenceReports[currentTextIndex].mispronounced?.length || 0} word(s)</strong>
                      </div>
                      <div>
                        <span style={{ color: '#f59e0b', fontWeight: 700 }}>⚠️ Omitted/Skipped:</span>{' '}
                        <strong>{sentenceReports[currentTextIndex].omitted?.length || 0} word(s)</strong>
                      </div>
                    </div>

                    {sentenceReports[currentTextIndex].mispronounced && sentenceReports[currentTextIndex].mispronounced.length > 0 && (
                      <div style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px dashed var(--lf-border)', fontSize: '0.78rem' }}>
                        <strong style={{ color: '#f43f5e' }}>Specific Defect Details:</strong>
                        {sentenceReports[currentTextIndex].mispronounced.map((m, i) => (
                          <div key={i} style={{ color: 'var(--lf-text-secondary)', marginTop: '2px' }}>
                            • Target word "<strong>{m.target}</strong>" was spoken as "<em>{m.heard}</em>"
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Specific omitted/skipped words, so the report lists every missed word, not just mispronounced ones */}
                    {sentenceReports[currentTextIndex].omitted && sentenceReports[currentTextIndex].omitted.length > 0 && (
                      <div style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px dashed var(--lf-border)', fontSize: '0.78rem' }}>
                        <strong style={{ color: '#f59e0b' }}>Skipped Word Details:</strong>
                        {sentenceReports[currentTextIndex].omitted.map((m, i) => (
                          <div key={i} style={{ color: 'var(--lf-text-secondary)', marginTop: '2px' }}>
                            • Target word "<strong>{m.target}</strong>" was not heard / skipped
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="practice-nav" style={{ marginTop: '1rem' }}>
                <button 
                  disabled={currentTextIndex === 0} 
                  onClick={handlePrev}
                >
                  Previous
                </button>
                <button 
                  className="btn-primary"
                  onClick={handleNext}
                >
                  {currentTextIndex === practiceSentences.length - 1 ? "Finish & Generate Report →" : "Next Sentence →"}
                </button>
              </div>
            </div>
          </div>

          <div className="live-controls">
            {!stream && !isRecording ? (
              <button className="btn-primary" onClick={startCamera} style={{ padding: '0.75rem 1.75rem', fontWeight: 700 }}>
                🎥 Activate Camera & Start Voice Practice
              </button>
            ) : (
              <button 
                className={`record-toggle ${isRecording ? 'active' : ''}`}
                onClick={() => setIsRecording(!isRecording)}
              >
                {isRecording ? "⏹ Pause Voice Practice" : "⏺ Resume Voice Practice"}
              </button>
            )}
            <button className="btn-text" onClick={finishLiveSession}>View Final Oral Reading Report</button>
          </div>
        </>
      ) : (
        /* Post-Session Comprehensive Oral Reading & Mispronunciation Report */
        <div className="oral-report-container" style={{ background: '#ffffff', padding: '2rem', borderRadius: '16px', border: '1px solid var(--lf-border)', boxShadow: 'var(--lf-shadow-md)' }}>
          <header style={{ borderBottom: '2px solid var(--lf-border)', paddingBottom: '1rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span className="badge badge-info" style={{ marginBottom: '0.4rem' }}>📊 Oral Reading Diagnostic Report</span>
              <h2 style={{ fontSize: '1.6rem', fontWeight: 800, margin: 0, color: 'var(--lf-text-primary)' }}>Live Speech & Pronunciation Analysis</h2>
              <small style={{ color: 'var(--lf-text-muted)' }}>Session duration: {sessionTime} seconds</small>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '2rem', fontWeight: 900, color: overallAcc >= 70 ? '#14b8a6' : '#f59e0b' }}>{overallAcc}%</div>
              <small style={{ color: 'var(--lf-text-muted)', fontWeight: 700 }}>Reading Accuracy</small>
            </div>
          </header>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.75rem' }}>
            <div style={{ background: 'rgba(20, 184, 166, 0.08)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(20, 184, 166, 0.25)', textAlign: 'center' }}>
              <span style={{ fontSize: '1.5rem' }}>✅</span>
              <strong style={{ display: 'block', fontSize: '1.4rem', fontWeight: 800, color: '#14b8a6' }}>{totalCorrect} / {totalWords}</strong>
              <small style={{ color: 'var(--lf-text-muted)', fontWeight: 600 }}>Words Read Correctly</small>
            </div>

            <div style={{ background: 'rgba(244, 63, 94, 0.08)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(244, 63, 94, 0.25)', textAlign: 'center' }}>
              <span style={{ fontSize: '1.5rem' }}>❌</span>
              <strong style={{ display: 'block', fontSize: '1.4rem', fontWeight: 800, color: '#f43f5e' }}>{totalMispronounced}</strong>
              <small style={{ color: 'var(--lf-text-muted)', fontWeight: 600 }}>Mispronounced / Misread Words</small>
            </div>

            <div style={{ background: 'rgba(245, 158, 11, 0.08)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(245, 158, 11, 0.25)', textAlign: 'center' }}>
              <span style={{ fontSize: '1.5rem' }}>⚠️</span>
              <strong style={{ display: 'block', fontSize: '1.4rem', fontWeight: 800, color: '#f59e0b' }}>{totalOmitted}</strong>
              <small style={{ color: 'var(--lf-text-muted)', fontWeight: 600 }}>Skipped / Omitted Words</small>
            </div>
          </div>

          {/* Sentence by Sentence Breakdown */}
          <h4 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '1rem', color: 'var(--lf-text-primary)' }}>Sentence-by-Sentence Breakdown</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
            {practiceSentences.map((sent, idx) => {
              const rep = sentenceReports[idx] || {};
              const acc = rep.accuracy !== undefined ? rep.accuracy : 0;

              return (
                <div key={idx} style={{ background: 'rgba(255,255,255,0.03)', padding: '1.1rem', borderRadius: '12px', border: '1px solid var(--lf-border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <strong style={{ fontSize: '0.85rem', color: 'var(--lf-primary)' }}>Sentence #{idx + 1}</strong>
                    <span className={`badge ${acc >= 70 ? 'badge-low' : 'badge-high'}`}>{acc}% Accuracy</span>
                  </div>

                  <p style={{ margin: '0 0 0.5rem 0', fontSize: '1.05rem', fontWeight: 700, color: 'var(--lf-text-primary)' }}>
                    "{sent}"
                  </p>

                  {rep.transcript && (
                    <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.88rem', color: 'var(--lf-text-secondary)' }}>
                      🎤 <em>Heard Spoken Voice:</em> "{rep.transcript}"
                    </p>
                  )}

                  {rep.mispronounced && rep.mispronounced.length > 0 ? (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '0.5rem' }}>
                      {rep.mispronounced.map((m, i) => (
                        <span key={i} style={{ background: 'rgba(244,63,94,0.12)', color: '#f43f5e', border: '1px solid rgba(244,63,94,0.3)', padding: '3px 8px', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 600 }}>
                          Target: "{m.target}" → Read as: "{m.heard}"
                        </span>
                      ))}
                    </div>
                  ) : (
                    <small style={{ color: '#14b8a6', fontWeight: 600 }}>✓ All words in this sentence read fluently!</small>
                  )}
                </div>
              );
            })}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
            <button className="btn-secondary" onClick={() => { setPracticeSentences(getRandomSentences(4)); setIsFinished(false); setCurrentTextIndex(0); setSentenceReports({}); setSessionTime(0); setTranscript(''); }}>
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

export default VideoPractice;