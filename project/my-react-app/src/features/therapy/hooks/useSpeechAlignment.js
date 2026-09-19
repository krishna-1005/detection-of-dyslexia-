import { useState, useRef, useCallback, useEffect } from 'react';

/**
 * useSpeechAlignment
 *
 * Real-time rolling alignment between live speech and a target sentence.
 * Uses Web Speech API with interimResults to track word-by-word progress.
 * Exposes wordStatuses[], currentWordIndex, isComplete, and controls.
 */

// Levenshtein distance for fuzzy matching
const levenshtein = (a, b) => {
  if (!a || !b) return (a || b || '').length;
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) => [i]);
  for (let j = 1; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j - 1], dp[i][j - 1], dp[i - 1][j]);
    }
  }
  return dp[m][n];
};

const cleanWord = (w) => (w || '').toLowerCase().replace(/[^\w]/g, '');

const useSpeechAlignment = (targetSentence) => {
  const targetWords = (targetSentence || '').split(/\s+/).filter(Boolean);

  const [wordStatuses, setWordStatuses] = useState(() =>
    targetWords.map((w) => ({ word: w, status: 'pending', heard: '' }))
  );
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);

  const recognitionRef = useRef(null);
  const isActiveRef = useRef(false);
  const targetWordsRef = useRef(targetWords);

  // Keep refs in sync
  useEffect(() => {
    targetWordsRef.current = targetWords;
  }, [targetSentence]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset when target sentence changes
  useEffect(() => {
    const words = (targetSentence || '').split(/\s+/).filter(Boolean);
    setWordStatuses(words.map((w) => ({ word: w, status: 'pending', heard: '' })));
    setCurrentWordIndex(0);
    setIsComplete(false);
    setTranscript('');
  }, [targetSentence]);

  // ── Alignment algorithm ──
  const computeAlignment = useCallback(
    (spokenText) => {
      const words = targetWordsRef.current;
      const cleanTargets = words.map(cleanWord);
      const spokenWords = spokenText
        .toLowerCase()
        .replace(/[^\w\s]/g, '')
        .split(/\s+/)
        .filter(Boolean);

      let matchedUpTo = -1;
      const statuses = words.map((originalWord, idx) => {
        const target = cleanTargets[idx];
        if (!target) return { word: originalWord, status: 'pending', heard: '' };

        // Look for exact match in spoken words after last matched position
        const exactIdx = spokenWords.findIndex(
          (sw, i) => i > matchedUpTo && sw === target
        );
        if (exactIdx !== -1) {
          matchedUpTo = exactIdx;
          return { word: originalWord, status: 'correct', heard: target };
        }

        // Look for exact match anywhere
        const anyExact = spokenWords.findIndex((sw) => sw === target);
        if (anyExact !== -1) {
          return { word: originalWord, status: 'correct', heard: target };
        }

        // Fuzzy match (mispronounced)
        const fuzzyIdx = spokenWords.findIndex((sw, i) => {
          if (i <= matchedUpTo) return false;
          const dist = levenshtein(target, sw);
          return dist > 0 && dist <= 2 && Math.abs(target.length - sw.length) <= 2;
        });

        if (fuzzyIdx !== -1) {
          matchedUpTo = fuzzyIdx;
          return {
            word: originalWord,
            status: 'mispronounced',
            heard: spokenWords[fuzzyIdx],
          };
        }

        return { word: originalWord, status: 'pending', heard: '' };
      });

      // Determine the "active" word (first pending after last correct/mispronounced)
      let lastMatchedIdx = -1;
      statuses.forEach((s, i) => {
        if (s.status === 'correct' || s.status === 'mispronounced') {
          lastMatchedIdx = i;
        }
      });

      const activeIdx = lastMatchedIdx + 1;
      if (activeIdx < statuses.length && statuses[activeIdx].status === 'pending') {
        statuses[activeIdx] = { ...statuses[activeIdx], status: 'active' };
      }

      setWordStatuses(statuses);
      setCurrentWordIndex(Math.min(activeIdx, words.length - 1));

      // Check completion
      const allDone = statuses.every(
        (s) => s.status === 'correct' || s.status === 'mispronounced'
      );
      if (allDone && words.length > 0) {
        setIsComplete(true);
      }
    },
    [] // no deps needed - uses refs
  );

  // ── Start listening ──
  const start = useCallback(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn('SpeechRecognition not supported');
      return;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        /* ignore */
      }
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event) => {
      let fullTranscript = '';
      for (let i = 0; i < event.results.length; i++) {
        fullTranscript += event.results[i][0].transcript + ' ';
      }
      const trimmed = fullTranscript.trim();
      setTranscript(trimmed);
      computeAlignment(trimmed);
    };

    recognition.onerror = (e) => {
      if (e.error === 'no-speech' || e.error === 'network') {
        // Auto-restart on transient errors
        if (isActiveRef.current) {
          setTimeout(() => {
            try {
              recognition.start();
            } catch (err) {
              /* ignore */
            }
          }, 300);
        }
      }
    };

    recognition.onend = () => {
      setIsListening(false);
      if (isActiveRef.current) {
        setTimeout(() => {
          try {
            recognition.start();
          } catch (err) {
            /* ignore */
          }
        }, 200);
      }
    };

    recognitionRef.current = recognition;
    isActiveRef.current = true;

    try {
      recognition.start();
    } catch (e) {
      console.warn('Speech recognition start failed:', e);
    }
  }, [computeAlignment]);

  // ── Stop listening ──
  const stop = useCallback(() => {
    isActiveRef.current = false;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onend = null;
        recognitionRef.current.stop();
      } catch (e) {
        /* ignore */
      }
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, []);

  // ── Reset ──
  const reset = useCallback(() => {
    stop();
    const words = targetWordsRef.current;
    setWordStatuses(words.map((w) => ({ word: w, status: 'pending', heard: '' })));
    setCurrentWordIndex(0);
    setIsComplete(false);
    setTranscript('');
  }, [stop]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isActiveRef.current = false;
      if (recognitionRef.current) {
        try {
          recognitionRef.current.onend = null;
          recognitionRef.current.stop();
        } catch (e) {
          /* ignore */
        }
      }
    };
  }, []);

  return {
    wordStatuses,
    currentWordIndex,
    isComplete,
    transcript,
    isListening,
    start,
    stop,
    reset,
  };
};

export default useSpeechAlignment;
