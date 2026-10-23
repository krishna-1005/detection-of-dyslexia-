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
// Phonetic Prolongation & Sound Dragging Matchers
// Collapses duplicate letters (e.g. "aaaaaaa" -> "a", "ssssun" -> "sun", "theeee" -> "the", "caaaat" -> "cat")
// ---------------------------------------------------------------------------
export const collapseRepeatedChars = (w) => {
  if (!w) return '';
  return w.toLowerCase().replace(/[^a-z]/g, '').replace(/(.)\1+/g, '$1');
};

export const isProlongationMatch = (ref, spoken) => {
  if (!ref || !spoken) return false;
  const r = ref.toLowerCase().replace(/[^a-z]/g, '');
  const s = spoken.toLowerCase().replace(/[^a-z]/g, '');
  if (r === s) return false;
  const hasRepeat = /(.)\1+/i.test(s);
  if (!hasRepeat) return false;
  return collapseRepeatedChars(r) === collapseRepeatedChars(s);
};

// ---------------------------------------------------------------------------
// Word-level Needleman-Wunsch sequence alignment
// Returns alignment array: { refWord, spokenWord|null, status }[]
// ---------------------------------------------------------------------------
const MATCH     =  4;
const MISSPRON  =  1;   // similar but not exact
const GAP       = -2;   // skip ref (→ skipped) or skip spoken (→ inserted)

const alignWords = (refTokens, spokenTokens) => {
  const n = refTokens.length;
  const m = spokenTokens.length;

  // Score function for a ref/spoken pair
  const pairScore = (r, s) => {
    if (r === s) return MATCH;
    if (isProlongationMatch(r, s)) return MATCH;
    if (charSimilarity(r, s) >= 0.75 || isPhoneticMatch(r, s)) return MISSPRON;
    // If spoken word s matches another ref token in this sentence, penalize heavily so s aligns with its true ref token
    if (refTokens.includes(s)) return -6;
    // Otherwise, s is a wrong spoken attempt for r (substitution / mispronunciation)
    // A substitution score of -1 beats 2 gaps (-4) so the aligner correctly registers the user's spoken attempt!
    return -1;
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
  const isExact = ref === spoken;
  const isProlonged = !isExact && isProlongationMatch(ref, spoken);

  if (isExact || isProlonged) {
    // Exact normalised match or prolonged phonetic match (e.g. "aaaaaaa" -> "a", "ssssun" -> "sun", "theeee" -> "the")
    const conf = wordConfidence?.[spoken];
    if (conf !== undefined && conf < 0.5) {
      return { expected: ref, spoken, status: 'mispronounced', prolongation: isProlonged };
    }
    return { expected: ref, spoken, status: 'correct', prolongation: isProlonged };
  }

  // Any non-exact match where the user said something is mispronounced.
  // We do NOT further split this into "close" vs "far" because the aligner
  // already decided this is the best pairing — both close misses (sim≥0.75)
  // and far misses (sim<0.75) are mispronunciations, not skips.
  return { expected: ref, spoken, status: 'mispronounced' };
};

// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// Clinical Miscue Classification & Dyslexia Subtype Detection Helpers
// ---------------------------------------------------------------------------

const FUNCTION_WORDS = new Set([
  'the', 'is', 'a', 'an', 'to', 'in', 'and', 'of', 'on', 'for', 'at', 'by',
  'it', 'with', 'as', 'or', 'if', 'be', 'are', 'was', 'were', 'that', 'this',
  'from', 'he', 'she', 'they', 'we', 'you', 'me', 'him', 'her', 'my', 'your'
]);

const stripCommonSuffix = (w) => {
  if (!w) return '';
  return w.replace(/(ing|ed|es|s|ly|er|est|ful|ness|ment|tion)$/gi, '');
};

// Dyslexia substitution pattern detector
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

/**
 * Detailed Clinical Miscue Diagnoser for doctor review
 */
export const diagnoseWordMiscue = (expected, spoken, status, hasExplicitProlongation = false) => {
  if (status === 'correct') {
    const isProlonged = hasExplicitProlongation || isProlongationMatch(expected, spoken);
    return {
      type: isProlonged ? 'prolonged_reading' : 'correct',
      label: isProlonged ? 'Decoded with Phonetic Prolongation' : 'Accurate Phonemic Decoding',
      severity: isProlonged ? 'mild' : 'none',
      pathway: isProlonged ? 'Dorsal Phonics (Compensatory Articulatory Elongation)' : 'Integrated Dual-Route Phonics',
      details: isProlonged ? `Word "${expected}" was correctly identified and read, spoken with elongated sound ("${spoken || expected}").` : null
    };
  }

  if (status === 'skipped') {
    const norm = normalizeWord(expected);
    const isFunctionWord = FUNCTION_WORDS.has(norm);
    return {
      type: isFunctionWord ? 'tracking_omission' : 'content_omission',
      label: isFunctionWord ? 'Visual Tracking / Line-Crowding Skip' : 'Content Word Omission (Lexical Avoidance)',
      severity: isFunctionWord ? 'mild' : 'moderate',
      pathway: 'Ventral Stream / Oculomotor Tracking',
      details: `Word "${expected}" was omitted without vocalization attempt.`
    };
  }

  if (status === 'inserted') {
    return {
      type: 'insertion',
      label: 'Spoken Word Insertion / Self-Extrapolation',
      severity: 'mild',
      pathway: 'Executive Self-Monitoring',
      details: `Extra word "${spoken}" added.`
    };
  }

  // status === 'mispronounced'
  const expNorm = normalizeWord(expected);
  const spkNorm = normalizeWord(spoken);

  // 1. Kinetic / Transposition Reversal (was ↔ saw, on ↔ no, etc.)
  const reversedExp = expNorm.split('').reverse().join('');
  if (
    spkNorm === reversedExp ||
    (expNorm === 'was' && spkNorm === 'saw') || (expNorm === 'saw' && spkNorm === 'was') ||
    (expNorm === 'on' && spkNorm === 'no') || (expNorm === 'no' && spkNorm === 'on') ||
    (expNorm === 'from' && spkNorm === 'form')
  ) {
    return {
      type: 'kinetic_reversal',
      label: 'Kinetic Transposition Reversal',
      severity: 'high',
      pathway: 'Ventral Stream (Visual Word Form Area)',
      pattern: `${expNorm} ↔ ${spkNorm}`,
      details: `Letter sequence inverted: "${expected}" read as "${spoken}". Distinct marker of spatial/visual dyslexia.`
    };
  }

  // 2. Static Mirror Letter Reversal (b ↔ d, p ↔ q, u ↔ n, m ↔ w)
  for (const [c1, c2] of [['b', 'd'], ['p', 'q'], ['p', 'd'], ['b', 'q'], ['u', 'n'], ['m', 'w']]) {
    const swapped1 = expNorm.replace(new RegExp(c1, 'g'), '\x00').replace(new RegExp(c2, 'g'), c1).replace(/\x00/g, c2);
    const swapped2 = spkNorm.replace(new RegExp(c1, 'g'), '\x00').replace(new RegExp(c2, 'g'), c1).replace(/\x00/g, c2);
    if (swapped1 === spkNorm || swapped2 === expNorm) {
      return {
        type: 'visual_reversal',
        label: `Static Mirror Reversal (${c1} ↔ ${c2})`,
        severity: 'high',
        pathway: 'Ventral Stream (Orthographic Representation)',
        pattern: `${c1} ↔ ${c2}`,
        details: `Mirror orientation confusion (${c1} ↔ ${c2}) in "${expected}" → "${spoken}". High clinical indicator for dyseidetic (visual) dyslexia.`
      };
    }
  }

  // 3. Morphological Suffix Inflection
  const expStem = stripCommonSuffix(expNorm);
  const spkStem = stripCommonSuffix(spkNorm);
  if (expStem && spkStem && expStem === spkStem) {
    return {
      type: 'morphological_inflection',
      label: 'Morphological / Suffix Inflection Error',
      severity: 'moderate',
      pathway: 'Morpho-Syntactic Processing',
      pattern: 'Suffix Mismatch',
      details: `Root stem preserved ("${expStem}"), but inflection dropped or modified in "${expected}" → "${spoken}".`
    };
  }

  // 4. Phonological Substitution / Voicing Swap
  const subst = hasSubstitutionPattern(expNorm, spkNorm);
  if (subst) {
    return {
      type: 'phonological_substitution',
      label: `Phonemic Substitution (${subst.pattern})`,
      severity: 'moderate',
      pathway: 'Dorsal Stream (Temporo-Parietal Phonics)',
      pattern: subst.pattern,
      details: `Phoneme articulation or voicing swap (${subst.pattern}) in "${expected}" → "${spoken}". Points to phonological decoding weakness.`
    };
  }

  // 5. Consonant Blend Simplification
  const hasCluster = /(bl|cl|fl|gl|pl|br|cr|dr|fr|gr|pr|tr|sc|sk|sl|sm|sn|sp|st|sw|str|spr|spl)/i.test(expNorm);
  if (hasCluster && spkNorm.length < expNorm.length) {
    return {
      type: 'blend_reduction',
      label: 'Consonant Cluster Blend Reduction',
      severity: 'moderate',
      pathway: 'Dorsal Stream (Complex Phonemic Blending)',
      pattern: 'Cluster Simplification',
      details: `Consonant blend in "${expected}" was simplified to "${spoken}".`
    };
  }

  // 6. Lexical Word Substitution Miscue (arbitrary or semantic word substitution)
  const dist = levenshteinChar(expNorm, spkNorm);
  if (dist > 2) {
    return {
      type: 'lexical_substitution',
      label: 'Lexical Word Substitution Miscue',
      severity: 'moderate',
      pathway: 'Ventral/Lexical Retrieval & Sight-Vocabulary',
      pattern: 'Word Substitution',
      details: `Target "${expected}" read aloud as substituted word "${spoken}". Common in contextual guessing.`
    };
  }

  // 7. General Phonemic Decoding Miscue
  return {
    type: 'phonological_miscue',
    label: 'Grapheme-Phoneme Decoding Miscue',
    severity: 'moderate',
    pathway: 'Dorsal Stream (Grapheme-to-Phoneme Conversion)',
    pattern: 'Phonetic Approximation',
    details: `Target "${expected}" read aloud as "${spoken}".`
  };
};

// ---------------------------------------------------------------------------
// Analyse a single sentence
// ---------------------------------------------------------------------------
const analyzeSentence = (index, referenceText, spokenText, wordConfidence, sentenceProlongations = []) => {
  const refWords     = referenceText.split(' ').filter(Boolean); // original casing
  const refTokens    = refWords.map(normalizeWord);
  const spokenTokens = tokenize(spokenText || '');
  const totalWords   = refTokens.length;

  // Empty transcript → all skipped
  if (spokenTokens.length === 0) {
    const words = refWords.map((w) => ({
      expected: w,
      spoken: null,
      status: 'skipped',
      miscue: diagnoseWordMiscue(w, null, 'skipped')
    }));
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

    // Check if this word was flagged by acoustic or textual prolongation
    const isAcousticDrag = (sentenceProlongations || []).some(
      (p) => collapseRepeatedChars(p.word) === collapseRepeatedChars(classified.expected)
    );
    if (isAcousticDrag) {
      classified.prolongation = true;
    }
    classified.miscue = diagnoseWordMiscue(classified.expected, classified.spoken, classified.status, classified.prolongation);

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
// ---------------------------------------------------------------------------
// Speech Cadence & Syllable Estimator Helpers
// ---------------------------------------------------------------------------

/**
 * Lightweight vowel nucleus estimator to calculate syllable counts for English words.
 *
 * @param {string} word - Token to estimate syllables for
 * @returns {number} Estimated syllables count (min 1 for non-empty alphanumeric tokens)
 */
export const countSyllables = (word) => {
  if (!word) return 0;
  const w = word.toLowerCase().replace(/[^a-z]/g, '').trim();
  if (!w) return 0;
  if (w.length <= 3) return 1;

  // Strip common trailing silent letters/inflections (e.g., -e, -ed, -es)
  let clean = w.replace(/(?:[^laeiouy]|ed|es|e)$/, '');
  if (!clean) return 1;

  // Split vowel hiatus pairs that form separate syllable nuclei (e.g. io in curiosity, ia in media)
  const expanded = clean
    .replace(/([aeiouy])(ia|io|eo|ua|ue|ui)/g, '$1 $2')
    .replace(/(i)(o|a)/g, '$1 $2');

  // Match vowel groups (including y as vowel nucleus)
  const vowelMatches = expanded.match(/[aeiouy]{1,2}/g);
  const count = vowelMatches ? vowelMatches.length : 1;
  return Math.max(1, count);
};


/**
 * Evaluates real-time speech cadence, syllables per second, and phonetic prolongation severity.
 *
 * @param {Object} params
 * @param {number} params.durationSec - Elapsed oral reading duration in seconds
 * @param {number} params.totalWords - Total decodable words spoken/attempted
 * @param {Array} params.prolongationsList - Array of logged prolongation events
 * @param {Array<string>} [params.allSpokenWords] - Array of all spoken token strings for syllable aggregation
 * @returns {Object} Comprehensive cadence and prosodic prolongation evaluation
 */
export const analyzeSpeechCadenceAndProlongation = ({
  durationSec = 0,
  totalWords = 0,
  prolongationsList = [],
  allSpokenWords = []
}) => {
  const elapsed = Math.max(0, parseFloat(durationSec) || 0);
  const words = Math.max(0, parseInt(totalWords, 10) || 0);
  const drags = Array.isArray(prolongationsList) ? prolongationsList : [];
  const totalDrags = drags.length;

  // Calculate total syllables across spoken tokens
  let totalSyllables = 0;
  if (Array.isArray(allSpokenWords) && allSpokenWords.length > 0) {
    totalSyllables = allSpokenWords.reduce((sum, w) => sum + countSyllables(w), 0);
  } else {
    // Standard clinical approximation ~1.3 syllables per word if token array is empty
    totalSyllables = Math.round(words * 1.3);
  }

  // WPM and Syllables Per Second (SPS)
  const wpm = elapsed >= 1 && words > 0 ? parseFloat(((words / elapsed) * 60).toFixed(1)) : 0;
  const sps = elapsed >= 1 && totalSyllables > 0 ? parseFloat((totalSyllables / elapsed).toFixed(2)) : 0;

  // Severity Stratification:
  // 0 drags: "Normal Fluency"
  // 1–2 drags: "Mild Hesitation / Continuant Lengthening"
  // 3+ drags: "Marked Phonetic Prolongation (Dysfluency / Phonological Decoding Strain)"
  let severity = 'Normal Fluency';
  if (totalDrags >= 3) {
    severity = 'Marked Phonetic Prolongation (Dysfluency / Phonological Decoding Strain)';
  } else if (totalDrags >= 1) {
    severity = 'Mild Hesitation / Continuant Lengthening';
  }

  // Cadence Category (Bradylexic / Hesitant / Fluent / Rushed)
  let cadenceCategory = 'Fluent';
  let cadenceDescription = 'Normative reading tempo within standard conversational parameters.';
  if (wpm < 45) {
    cadenceCategory = 'Bradylexic';
    cadenceDescription = 'Severe oral reading latency characterized by prolonged decoding pauses and sluggish articulatory transitions.';
  } else if (wpm < 70) {
    cadenceCategory = 'Hesitant';
    cadenceDescription = 'Sub-standard reading rate indicating elevated cognitive decoding load and cautious phonetic sounding-out.';
  } else if (wpm <= 130) {
    cadenceCategory = 'Fluent';
    cadenceDescription = 'Age-appropriate, fluid oral reading cadence with stable inter-word rhythm.';
  } else {
    cadenceCategory = 'Rushed';
    cadenceDescription = 'Accelerated cadence (tachylexia) with risk of articulatory slurring or omitted word endings.';
  }

  // Prolongation Index (% of words elongated)
  const prolongationIndex = words > 0 ? parseFloat(((totalDrags / words) * 100).toFixed(1)) : 0;

  // Clinical Rationale Note
  let clinicalRationale = '';
  if (totalDrags > 0) {
    clinicalRationale = `Acoustic and textual sound prolongations identified (${totalDrags} event${totalDrags > 1 ? 's' : ''}, ${prolongationIndex}% prolongation index). Sound elongation in oral reading typically reflects compensatory decoding delay—wherein the student sustains the initial continuant phoneme or vowel to maintain vocal continuity while visually scanning subsequent graphemes—or motor-speech dysfluency under phonological processing strain.`;
  } else {
    clinicalRationale = 'No sound elongation or phonetic dragging observed. Speech cadence and articulatory transitions remained continuous and fluent without signs of phonological hold-stalls.';
  }

  // Child / Patient Friendly View metrics (Non-stigmatizing, motivating framing)
  let childPacingBadge = 'Steady Pacing Star ⭐️⭐️⭐️';
  let childPacingTitle = 'Super Smooth Reader! 🚀';
  let childPacingMessage = 'Your speech flowed smoothly like a calm river with great pace!';
  if (totalDrags >= 3) {
    childPacingBadge = 'Patient Thinker Star ⭐️';
    childPacingTitle = 'Thoughtful Sound Explorer! 💡';
    childPacingMessage = 'You took your time stretching out sounds to figure out tricky words. Fantastic perseverance!';
  } else if (totalDrags >= 1) {
    childPacingBadge = 'Steady Pacing Star ⭐️⭐️';
    childPacingTitle = 'Steady & Careful Reader! 🌟';
    childPacingMessage = 'Good pace! Just a couple of stretched sounds while thinking through the sentence.';
  }

  return {
    durationSec: elapsed,
    totalWords: words,
    totalSyllables,
    wpm,
    sps,
    totalDrags,
    prolongationIndex,
    severity,
    cadenceCategory,
    cadenceDescription,
    clinicalRationale,
    prolongationsList: drags,
    childView: {
      badge: childPacingBadge,
      title: childPacingTitle,
      message: childPacingMessage,
      meterScore: Math.max(10, Math.round(100 - (totalDrags * 12))),
    }
  };
};

// ---------------------------------------------------------------------------
// Clinical Diagnostic & Doctor Subtype Risk Profiler
// ---------------------------------------------------------------------------
export const computeClinicalDiagnostics = (sentences, summary, cadenceAndProlongation = null) => {
  const allWordMiscues = [];
  sentences.forEach((s) => {
    (s.words || []).forEach((w) => {
      if (w.status !== 'correct' || w.prolongation || w.miscue?.type === 'prolonged_reading') {
        allWordMiscues.push(w);
      }
    });
  });

  const visualReversals = allWordMiscues.filter(
    (w) => w.miscue?.type === 'visual_reversal' || w.miscue?.type === 'kinetic_reversal'
  );
  const phonologicalSubs = allWordMiscues.filter(
    (w) =>
      w.miscue?.type === 'phonological_substitution' ||
      w.miscue?.type === 'blend_reduction' ||
      w.miscue?.type === 'phonological_miscue' ||
      w.miscue?.type === 'lexical_substitution'
  );
  const morphologicalErrors = allWordMiscues.filter(
    (w) => w.miscue?.type === 'morphological_inflection'
  );
  const trackingOmissions = allWordMiscues.filter(
    (w) => w.miscue?.type === 'tracking_omission'
  );
  const contentOmissions = allWordMiscues.filter(
    (w) => w.miscue?.type === 'content_omission'
  );
  const insertions = allWordMiscues.filter((w) => w.miscue?.type === 'insertion');

  // Subtype 1: Phonological (Dysphonetic) Risk (0 - 100)
  let phonoScore = 0;
  if (summary.accuracy < 70) phonoScore += 45;
  else if (summary.accuracy < 85) phonoScore += 25;
  else if (summary.accuracy < 92) phonoScore += 10;
  phonoScore += phonologicalSubs.length * 20;
  if (cadenceAndProlongation && cadenceAndProlongation.totalDrags >= 2) {
    phonoScore += 10; // Dragging/prolongation indicates phonemic decoding strain
  }
  phonoScore = Math.min(100, phonoScore);

  const phonoRisk =
    phonoScore >= 50
      ? 'Elevated Risk'
      : phonoScore >= 25
      ? 'Moderate Risk'
      : 'Low / Within Normal Limits';

  // Subtype 2: Surface / Visual (Dyseidetic) Risk (0 - 100)
  let visualScore = 0;
  visualScore += visualReversals.length * 35;
  visualScore += trackingOmissions.length * 15;
  visualScore = Math.min(100, visualScore);

  const visualRisk =
    visualScore >= 45
      ? 'Elevated Risk'
      : visualScore >= 20
      ? 'Moderate Risk'
      : 'Low / Within Normal Limits';

  // Subtype 3: Fluency & Rapid Automatized Naming (RAN) Risk
  let fluencyRisk = 'Optimal Fluency Cadence';
  let fluencyScore = 15;
  if (summary.wpm !== null) {
    if (summary.wpm < 45) {
      fluencyRisk = 'Elevated Risk (Severe Retrieval/Decoding Latency)';
      fluencyScore = 80;
    } else if (summary.wpm < 70) {
      fluencyRisk = 'Moderate Risk (Sub-standard Decoding Cadence)';
      fluencyScore = 50;
    } else {
      fluencyRisk = 'Optimal Fluency Cadence';
      fluencyScore = 15;
    }
  }

  // Elevate fluency score if severe prolongations are documented
  if (cadenceAndProlongation && cadenceAndProlongation.totalDrags >= 3) {
    fluencyScore = Math.min(100, fluencyScore + 20);
    if (!fluencyRisk.includes('Elevated')) {
      fluencyRisk = 'Moderate Risk (Phonetic Prolongations & Fluency Stalls)';
    }
  }

  // Primary Clinical Phenotype
  let primaryPhenotype = 'Fluent / Age-Appropriate Oral Reader';
  let primaryDescription =
    'Patient demonstrates robust grapheme-phoneme correspondence and fluid reading cadence without clinically significant visual or phonological deficits.';

  if (phonoScore >= 40 && visualScore >= 40) {
    primaryPhenotype = 'Mixed Dyslexia Phenotype (Double Deficit)';
    primaryDescription =
      'Co-occurring deficits in both dorsal phonological decoding and ventral visual-orthographic word recognition. Patient struggles with both unfamiliar phonetic sounding-out and sight word recognition.';
  } else if (phonoScore >= 35) {
    primaryPhenotype = 'Phonological Dyslexia Phenotype (Dysphonetic)';
    primaryDescription =
      'Primary impairment localized in the dorsal temporo-parietal phonological decoding circuit. Demonstrates difficulties with phonemic blending, consonant clusters, and phonetic letter-sound mapping.';
  } else if (visualScore >= 35) {
    primaryPhenotype = 'Surface / Visual Dyslexia Phenotype (Dyseidetic)';
    primaryDescription =
      'Primary impairment localized in the ventral occipito-temporal visual word form pathway. Demonstrates characteristic mirror letter reversals (b/d, p/q), transpositions, and spatial word-tracking omissions.';
  } else if (summary.accuracy < 80 || (summary.wpm !== null && summary.wpm < 50)) {
    primaryPhenotype = 'Emergent Reader with Oral Fluency Latency';
    primaryDescription =
      'Phonetic decoding is emerging, but decoding speed and oral cadence are constrained by cognitive processing latency.';
  }

  // Clinical Recommendations & Doctor Action Plan
  const recommendations = [];
  if (phonoScore >= 25) {
    recommendations.push({
      domain: 'Phonological Decoding',
      action: 'Structured Multi-Sensory Phonics (Orton-Gillingham)',
      detail:
        'Implement explicit phoneme-grapheme segmentation drills, consonant blend isolation, and auditory discrimination exercises.'
    });
  }
  if (visualScore >= 20) {
    recommendations.push({
      domain: 'Visual-Spatial Processing',
      action: 'Orthographic Reversal Discrimination & Visual Tracking',
      detail:
        'Utilize tactile tracing for b/d differentiation (air writing, sandpaper letters), high-contrast line guides, and Bionic Reading font.'
    });
  }
  if (morphologicalErrors.length > 0) {
    recommendations.push({
      domain: 'Morphological Awareness',
      action: 'Base Word & Affix Decomposition Drills',
      detail:
        'Target inflectional morphemes (-ed, -ing, -s, -ly) through morphology puzzles and prefix/suffix identification.'
    });
  }
  if (fluencyScore >= 45 || (cadenceAndProlongation && cadenceAndProlongation.totalDrags >= 2)) {
    recommendations.push({
      domain: 'Fluency, Prosody & RAN',
      action: 'Paired Echo-Reading & Metronome-Paced Continuous Phonation',
      detail:
        'Practice repeated oral reading of familiar decodable texts with adult modeled cadence to strengthen automatic retrieval and diminish compensatory vowel dragging.'
    });
  }
  if (recommendations.length === 0) {
    recommendations.push({
      domain: 'Reading Maintenance',
      action: 'Independent Enriched Reading Exploration',
      detail:
        'Maintain daily reading engagement with age-appropriate vocabulary and expressive prosody.'
    });
  }

  return {
    totalMiscues: allWordMiscues.length,
    allWordMiscues,
    miscueCounts: {
      visualReversals: visualReversals.length,
      phonologicalSubs: phonologicalSubs.length,
      morphologicalErrors: morphologicalErrors.length,
      trackingOmissions: trackingOmissions.length,
      contentOmissions: contentOmissions.length,
      insertions: insertions.length,
    },
    subtypes: {
      phonological: {
        risk: phonoRisk,
        score: phonoScore,
        count: phonologicalSubs.length,
        pathway: 'Dorsal Temporo-Parietal Pathway'
      },
      visualOrthographic: {
        risk: visualRisk,
        score: visualScore,
        count: visualReversals.length + trackingOmissions.length,
        pathway: 'Ventral Occipito-Temporal Visual Word Form Area'
      },
      fluencyRan: {
        risk: fluencyRisk,
        score: fluencyScore,
        wpm: summary.wpm,
        sps: cadenceAndProlongation?.sps ?? null,
        totalProlongations: cadenceAndProlongation?.totalDrags ?? 0,
        prolongationIndex: cadenceAndProlongation?.prolongationIndex ?? 0,
        cadenceCategory: cadenceAndProlongation?.cadenceCategory ?? 'Fluent',
        pathway: 'Cerebellar / Rapid Retrieval Network'
      }
    },
    primaryPhenotype,
    primaryDescription,
    recommendations,
    gradeNorms: [
      {
        grade: 'Grade 1 - 2',
        expectedWpm: '40 - 65 WPM',
        expectedAcc: '≥ 90%',
        status: (summary.wpm || 0) >= 40 ? 'Meeting Norms' : 'Below Grade Benchmark'
      },
      {
        grade: 'Grade 3 - 4',
        expectedWpm: '70 - 105 WPM',
        expectedAcc: '≥ 95%',
        status: (summary.wpm || 0) >= 70 ? 'Meeting Norms' : 'Below Grade Benchmark'
      },
      {
        grade: 'Grade 5+',
        expectedWpm: '110 - 140 WPM',
        expectedAcc: '≥ 98%',
        status: (summary.wpm || 0) >= 110 ? 'Meeting Norms' : 'Below Grade Benchmark'
      },
    ],
    dsm5Classification: {
      code: 'DSM-5: 315.00 / ICD-11: 6A03.0',
      title: 'Specific Learning Disorder with Impairment in Reading (Dyslexia)',
      subcomponents: [
        { name: 'Word Reading Accuracy', status: summary.accuracy >= 90 ? 'Intact' : 'Impaired' },
        {
          name: 'Reading Rate or Fluency',
          status: summary.wpm !== null && summary.wpm >= 65 ? 'Intact' : 'Impaired / Hesitant'
        },
        { name: 'Phonological Decoding', status: phonoScore < 30 ? 'Intact' : 'Deficit Identified' },
        {
          name: 'Orthographic Word Form Identification',
          status: visualScore < 25 ? 'Intact' : 'Deficit Identified'
        },
      ]
    }
  };
};

export const analyzeReading = (
  referenceSentences,
  transcriptsBySentence,
  startTimestamp,
  endTimestamp,
  wordConfidenceMap = {},
  prolongationsList = []
) => {
  if (!referenceSentences || referenceSentences.length === 0) {
    return { sentences: [], summary: emptySummary(0) };
  }

  // Analyse each sentence
  const sentences = referenceSentences.map((ref, i) => {
    const sentProlongs = (prolongationsList || []).filter((p) => p.sentenceIndex === i);
    return analyzeSentence(i, ref, transcriptsBySentence?.[i] || '', wordConfidenceMap, sentProlongs);
  });

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

  // Layer B textual check across transcripts for graphemic elongation /(.)\1{2,}/i
  const textDrags = [];
  (transcriptsBySentence || []).forEach((transcript, sentIdx) => {
    const tokens = (transcript || '').split(/\s+/).filter(Boolean);
    tokens.forEach((tok) => {
      const clean = tok.toLowerCase().replace(/[^a-z-]/g, '');
      if (/(.)\1{2,}/i.test(clean) || (clean.length >= 2 && /^(.)\1+$/.test(clean))) {
        // Prevent duplicate logging if already recorded in prolongationsList
        const already = (prolongationsList || []).some(
          (p) => p.sentenceIndex === sentIdx && p.word && p.word.toLowerCase() === tok.toLowerCase()
        );
        if (!already) {
          textDrags.push({
            word: tok,
            durationMs: 750,
            type: 'Graphemic Repetition',
            timestamp: Date.now(),
            sentenceIndex: sentIdx
          });
        }
      }
    });
  });

  const combinedProlongations = [...(prolongationsList || []), ...textDrags];
  const allSpokenTokens = (transcriptsBySentence || []).flatMap((t) => (t || '').split(/\s+/).filter(Boolean));

  // Speech cadence & phonetic prolongation analytics
  const cadenceAndProlongation = analyzeSpeechCadenceAndProlongation({
    durationSec: durationSeconds,
    totalWords: correctWords + mispronounced,
    prolongationsList: combinedProlongations,
    allSpokenWords: allSpokenTokens
  });

  // Diagnostic message — data-driven, only shown when there is data
  const allNoSpeech = sentences.every((s) => s.noSpeech);
  const diagnostic  = buildDiagnostic(sentences, accuracy, allNoSpeech, mispronounced, skipped);

  // Clinical Diagnostics & Doctor Subtype Risk Profiler
  const clinicalDiagnostics = computeClinicalDiagnostics(sentences, {
    totalWords,
    correctWords,
    mispronounced,
    skipped,
    inserted,
    accuracy,
    durationSeconds,
    wpm,
    noSpeech: allNoSpeech
  }, cadenceAndProlongation);

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
      clinicalDiagnostics,
      cadenceAndProlongation,
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
  clinicalDiagnostics: null,
  cadenceAndProlongation: analyzeSpeechCadenceAndProlongation({ durationSec: 0, totalWords, prolongationsList: [] }),
});

