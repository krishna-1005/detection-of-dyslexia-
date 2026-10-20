/**
 * readingAnalyzer.js
 * ==================
 * Single Source of Truth for all Oral Reading Fluency metrics.
 *
 * Public API:
 *   analyzeReading(referenceSentences, transcriptsBySentence, startTimestamp, endTimestamp)
 *     → { sentences[], summary }
 *
 *   All UI components MUST render only from this object.
 *   No metric should be recomputed in component render code.
 */

// ---------------------------------------------------------------------------
// Normalisation helpers
// ---------------------------------------------------------------------------

/**
 * Normalise a word for comparison:
 * lowercase, collapse smart-quotes/apostrophes, strip all non-alpha characters,
 * trim whitespace.
 */
export const normalizeWord = (w) => {
  if (!w) return '';
  return w
    .toLowerCase()
    .replace(/[\u2018\u2019\u02BC']/g, '') // strip apostrophes (don't → dont)
    .replace(/[^a-z]/g, '')               // strip punctuation / digits
    .trim();
};

/**
 * Normalise a full sentence into an array of cleaned tokens.
 */
export const tokenize = (sentence) => {
  if (!sentence) return [];
  return sentence
    .toLowerCase()
    .replace(/[\u2018\u2019\u02BC']/g, '')
    .replace(/[^a-z\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean);
};

// ---------------------------------------------------------------------------
// Character-level similarity (0..1)
// ---------------------------------------------------------------------------
const charSimilarity = (a, b) => {
  if (!a || !b) return 0;
  if (a === b) return 1;
  const longer = a.length > b.length ? a : b;
  const shorter = a.length > b.length ? b : a;
  const editDist = levenshteinChar(longer, shorter);
  return (longer.length - editDist) / longer.length;
};

const levenshteinChar = (a, b) => {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1]);
    }
  }
  return dp[a.length][b.length];
};

// ---------------------------------------------------------------------------
// Simplified Soundex (phonetic matching)
// ---------------------------------------------------------------------------
const soundex = (word) => {
  if (!word) return '';
  const w = word.toLowerCase().replace(/[^a-z]/g, '');
  if (!w) return '';
  const map = { b: 1, f: 1, p: 1, v: 1, c: 2, g: 2, j: 2, k: 2, q: 2, s: 2, x: 2, z: 2, d: 3, t: 3, l: 4, m: 5, n: 5, r: 6 };
  let code = w[0].toUpperCase();
  let prev = map[w[0]] || 0;
  for (let i = 1; i < w.length && code.length < 4; i++) {
    const curr = map[w[i]] || 0;
    if (curr && curr !== prev) { code += curr; }
    prev = curr || prev;
  }
  return code.padEnd(4, '0');
};

const isPhoneticMatch = (a, b) => {
  if (!a || !b) return false;
  if (a === b) return true;
  const sa = soundex(a), sb = soundex(b);
  return sa === sb && sa !== '0000';
};

// ---------------------------------------------------------------------------
// Word-level Needleman-Wunsch sequence alignment
// Returns alignment array: { refWord, spokenWord|null, status }[]
// ---------------------------------------------------------------------------
const MATCH     =  4;
const MISSPRON  =  1;   // similar but not exact
const GAP       = -2;   // skip ref (→ skipped) or skip spoken (→ inserted)
const MISMATCH  = -5;

const alignWords = (refTokens, spokenTokens) => {
  const n = refTokens.length;
  const m = spokenTokens.length;

  // Score function for a ref/spoken pair
  const pairScore = (r, s) => {
    if (r === s) return MATCH;
    if (charSimilarity(r, s) >= 0.75 || isPhoneticMatch(r, s)) return MISSPRON;
    return MISMATCH;
  };

  // DP table
  const dp = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = 1; i <= n; i++) dp[i][0] = dp[i - 1][0] + GAP; // skip ref word
  for (let j = 1; j <= m; j++) dp[0][j] = dp[0][j - 1] + GAP; // extra spoken word

  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const diag = dp[i - 1][j - 1] + pairScore(refTokens[i - 1], spokenTokens[j - 1]);
      const skipRef     = dp[i - 1][j] + GAP;
      const skipSpoken  = dp[i][j - 1] + GAP;
      dp[i][j] = Math.max(diag, skipRef, skipSpoken);
    }
  }

  // Traceback
  const alignment = [];
  let i = n, j = m;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0) {
      const diag = dp[i - 1][j - 1] + pairScore(refTokens[i - 1], spokenTokens[j - 1]);
      if (dp[i][j] === diag) {
        alignment.unshift({ ref: refTokens[i - 1], spoken: spokenTokens[j - 1] });
        i--; j--;
        continue;
      }
    }
    if (i > 0 && (j === 0 || dp[i][j] === dp[i - 1][j] + GAP)) {
      alignment.unshift({ ref: refTokens[i - 1], spoken: null }); // skipped
      i--;
    } else {
      alignment.unshift({ ref: null, spoken: spokenTokens[j - 1] }); // inserted
      j--;
    }
  }

  return alignment;
};

// ---------------------------------------------------------------------------
// Classify each aligned pair
//
// Rules (strict):
//   ref === null              → inserted   (user said an extra word)
//   spoken === null           → skipped    (user said NOTHING for this ref word)
//   ref !== null, spoken !== null, exact   → correct
//   ref !== null, spoken !== null, similar → mispronounced
//   ref !== null, spoken !== null, unlike  → mispronounced (user attempted the
//                                            word but got it very wrong — the
//                                            aligner already chose this pairing
//                                            as the best option, so we trust it)
// ---------------------------------------------------------------------------
const classifyPair = (ref, spoken, wordConfidence) => {
  // Case 1: extra word spoken with no ref counterpart → inserted
  if (ref === null) {
    return { expected: null, spoken, status: 'inserted' };
  }

  // Case 2: ref word with no spoken counterpart → truly skipped
  if (spoken === null) {
    return { expected: ref, spoken: null, status: 'skipped' };
  }

  // Both ref and spoken are present → user ATTEMPTED this word
  if (ref === spoken) {
    // Exact normalised match — check ASR confidence if available
    const conf = wordConfidence?.[spoken];
    if (conf !== undefined && conf < 0.5) {
      return { expected: ref, spoken, status: 'mispronounced' };
    }
    return { expected: ref, spoken, status: 'correct' };
  }

  // Any non-exact match where the user said something is mispronounced.
  // We do NOT further split this into "close" vs "far" because the aligner
  // already decided this is the best pairing — both close misses (sim≥0.75)
  // and far misses (sim<0.75) are mispronunciations, not skips.
  return { expected: ref, spoken, status: 'mispronounced' };
};

// ---------------------------------------------------------------------------
// Dyslexia substitution pattern detector
// ---------------------------------------------------------------------------
const SUBSTITUTION_PAIRS = [
  ['b', 'd'], ['p', 'q'], ['m', 'n'], ['u', 'n'],
  ['a', 'e'], ['a', 'u'], ['e', 'i'], ['o', 'u'],
  ['f', 'v'], ['t', 'd'], ['s', 'z'], ['g', 'j'],
];

const hasSubstitutionPattern = (expected, spoken) => {
  if (!expected || !spoken) return false;
  for (const [c1, c2] of SUBSTITUTION_PAIRS) {
    // Check if replacing c1↔c2 in spoken makes it match expected
    const swapped = spoken.replace(new RegExp(c1, 'g'), '\x00').replace(new RegExp(c2, 'g'), c1).replace(/\x00/g, c2);
    if (swapped === expected || spoken.replace(new RegExp(c2, 'g'), '\x00').replace(new RegExp(c1, 'g'), c2).replace(/\x00/g, c1) === expected) {
      return { pattern: `${c1}↔${c2}`, expected, spoken };
    }
  }
  return false;
};

// ---------------------------------------------------------------------------
// Analyse a single sentence
// ---------------------------------------------------------------------------
const analyzeSentence = (index, referenceText, spokenText, wordConfidence) => {
  const refWords     = referenceText.split(' ').filter(Boolean); // original casing
  const refTokens    = refWords.map(normalizeWord);
  const spokenTokens = tokenize(spokenText || '');
  const totalWords   = refTokens.length;

  // Empty transcript → all skipped
  if (spokenTokens.length === 0) {
    const words = refWords.map((w) => ({ expected: w, spoken: null, status: 'skipped' }));
    return {
      index,
      referenceText,
      words,
      totalWords,
      correctCount:      0,
      mispronouncedCount: 0,
      skippedCount:      totalWords,
      insertedCount:     0,
      accuracy:          0,
      status:            'FAIL',
      noSpeech:          true,
    };
  }

  const alignment = alignWords(refTokens, spokenTokens);

  let correctCount = 0, mispronouncedCount = 0, skippedCount = 0, insertedCount = 0;

  // Map back to original casing for display
  let refIdx = 0;
  const words = alignment.map((pair) => {
    const originalRef = pair.ref !== null ? refWords[refIdx] : null;
    if (pair.ref !== null) refIdx++;

    const classified = classifyPair(pair.ref, pair.spoken, wordConfidence);
    // Override expected with original-case version
    if (originalRef) classified.expected = originalRef;

    switch (classified.status) {
      case 'correct':      correctCount++;      break;
      case 'mispronounced': mispronouncedCount++; break;
      case 'skipped':      skippedCount++;      break;
      case 'inserted':     insertedCount++;     break;
      default: break;
    }
    return classified;
  });

  // Invariant assertion
  const sum = correctCount + mispronouncedCount + skippedCount;
  if (sum !== totalWords) {
    console.error(
      `[readingAnalyzer] INVARIANT VIOLATED for sentence ${index}: ` +
      `correct(${correctCount}) + mispronounced(${mispronouncedCount}) + skipped(${skippedCount}) = ${sum} ≠ totalWords(${totalWords}). ` +
      `Inserted words do not count toward totalWords.`
    );
  }

  const accuracy   = totalWords > 0 ? parseFloat(((correctCount / totalWords) * 100).toFixed(1)) : 0;
  const sentStatus = accuracy >= 90 ? 'PASS' : accuracy >= 70 ? 'NEEDS_PRACTICE' : 'FAIL';

  return {
    index,
    referenceText,
    words,
    totalWords,
    correctCount,
    mispronouncedCount,
    skippedCount,
    insertedCount,
    accuracy,
    status: sentStatus,
    noSpeech: false,
  };
};

// ---------------------------------------------------------------------------
// Main exported function
// ---------------------------------------------------------------------------

/**
 * analyzeReading
 *
 * @param {string[]}  referenceSentences     - Array of reference sentence strings
 * @param {string[]}  transcriptsBySentence  - Array matching referenceSentences; spoken text per sentence (may be empty/null)
 * @param {number}    startTimestamp         - ms timestamp (Date.now()) when recording started
 * @param {number}    endTimestamp           - ms timestamp (Date.now()) when recording stopped
 * @param {Object}    [wordConfidenceMap]    - Optional: { normalizedWord: confidenceScore 0..1 }
 *
 * @returns {{
 *   sentences: SentenceResult[],
 *   summary: SummaryResult
 * }}
 */
export const analyzeReading = (
  referenceSentences,
  transcriptsBySentence,
  startTimestamp,
  endTimestamp,
  wordConfidenceMap = {}
) => {
  if (!referenceSentences || referenceSentences.length === 0) {
    return { sentences: [], summary: emptySummary(0) };
  }

  // Analyse each sentence
  const sentences = referenceSentences.map((ref, i) =>
    analyzeSentence(i, ref, transcriptsBySentence?.[i] || '', wordConfidenceMap)
  );

  // Summary = sums of per-sentence values (single source of truth)
  const totalWords        = sentences.reduce((s, r) => s + r.totalWords,        0);
  const correctWords      = sentences.reduce((s, r) => s + r.correctCount,      0);
  const mispronounced     = sentences.reduce((s, r) => s + r.mispronouncedCount,0);
  const skipped           = sentences.reduce((s, r) => s + r.skippedCount,      0);
  const inserted          = sentences.reduce((s, r) => s + r.insertedCount,     0);
  const accuracy          = totalWords > 0
    ? parseFloat(((correctWords / totalWords) * 100).toFixed(1))
    : 0;

  const durationSeconds = endTimestamp > startTimestamp
    ? parseFloat(((endTimestamp - startTimestamp) / 1000).toFixed(1))
    : 0;
  const wpm = durationSeconds >= 1
    ? parseFloat(((correctWords / durationSeconds) * 60).toFixed(1))
    : null; // null → display "—" not 0
  const rawWpm = durationSeconds >= 1
    ? parseFloat((((correctWords + mispronounced) / durationSeconds) * 60).toFixed(1))
    : null;

  // Global invariant check
  const globalSum = correctWords + mispronounced + skipped;
  if (globalSum !== totalWords) {
    console.error(
      `[readingAnalyzer] GLOBAL INVARIANT VIOLATED: ` +
      `correct(${correctWords}) + mispronounced(${mispronounced}) + skipped(${skipped}) = ${globalSum} ≠ totalWords(${totalWords})`
    );
  }

  // Diagnostic message — data-driven, only shown when there is data
  const allNoSpeech = sentences.every((s) => s.noSpeech);
  const diagnostic  = buildDiagnostic(sentences, accuracy, allNoSpeech, mispronounced, skipped);

  return {
    sentences,
    summary: {
      totalWords,
      correctWords,
      mispronounced,
      skipped,
      inserted,
      accuracy,
      durationSeconds,
      wpm,       // null if duration < 1s
      rawWpm,
      noSpeech: allNoSpeech,
      diagnostic,
    },
  };
};

// ---------------------------------------------------------------------------
// Diagnostic message builder (Step 5)
// ---------------------------------------------------------------------------
const buildDiagnostic = (sentences, accuracy, allNoSpeech, mispronouncedTotal, skippedTotal) => {
  if (allNoSpeech) {
    return {
      type: 'no_data',
      message: 'No speech was detected. Please check your microphone and try again.',
      disclaimer: null,
    };
  }

  if (accuracy >= 90) {
    return {
      type: 'excellent',
      message:
        '🌟 Excellent Oral Decoding: High phonetic accuracy and smooth reading cadence. ' +
        'Grapheme-to-phoneme conversion speed is well-established.',
      disclaimer: null,
    };
  }

  // Collect actual mispronounced pairs
  const mispronouncedPairs = [];
  for (const sent of sentences) {
    for (const w of sent.words) {
      if (w.status === 'mispronounced' && w.expected && w.spoken) {
        mispronouncedPairs.push({ expected: w.expected, spoken: w.spoken });
      }
    }
  }

  // Check for substitution patterns
  const foundPatterns = [];
  const patternWords  = [];
  for (const { expected, spoken } of mispronouncedPairs) {
    const match = hasSubstitutionPattern(normalizeWord(expected), normalizeWord(spoken));
    if (match && !foundPatterns.includes(match.pattern)) {
      foundPatterns.push(match.pattern);
      patternWords.push(`"${expected}" → "${spoken}" (${match.pattern})`);
    }
  }

  const disclaimer =
    '⚠️ Screening aid only — this is not a clinical dyslexia diagnosis. ' +
    'Consult a qualified educational psychologist for formal assessment.';

  if (mispronouncedTotal > 0 && foundPatterns.length > 0) {
    return {
      type: 'substitution_pattern',
      message:
        `⚠️ Visual-Phonetic Substitution Pattern Detected (${foundPatterns.join(', ')}): ` +
        `The following words showed letter-substitution errors: ${patternWords.join('; ')}. ` +
        `Recommended: Phoneme Matching and Morphology Builder exercises.`,
      disclaimer,
    };
  }

  if (mispronouncedTotal > 0) {
    const examples = mispronouncedPairs.slice(0, 3).map(p => `"${p.expected}" → "${p.spoken}"`).join(', ');
    return {
      type: 'mispronunciation',
      message:
        `⚠️ Mispronunciation Pattern Detected: ${mispronouncedTotal} word(s) pronounced differently from target. ` +
        `Examples: ${examples}. Recommended: Phoneme Matching and Echo-Reading exercises.`,
      disclaimer,
    };
  }

  if (skippedTotal > 0) {
    return {
      type: 'omission',
      message:
        `⚠️ Sight-Word Omission Detected: ${skippedTotal} word(s) were skipped during oral reading. ` +
        `Recommended: Bionic Reader overlays and Visual Tracking practice to reduce visual crowding.`,
      disclaimer,
    };
  }

  // Some errors but not mispronounced or skipped (edge case)
  return {
    type: 'low_accuracy',
    message: `Accuracy is below 90%. Review the sentence breakdown for specific areas to improve.`,
    disclaimer,
  };
};

const emptySummary = (totalWords) => ({
  totalWords,
  correctWords: 0,
  mispronounced: 0,
  skipped: 0,
  inserted: 0,
  accuracy: 0,
  durationSeconds: 0,
  wpm: null,
  rawWpm: null,
  noSpeech: true,
  diagnostic: { type: 'no_data', message: 'No data available.', disclaimer: null },
});
