/**
 * readingAnalyzer.test.js
 * ========================
 * Unit tests for the analyzeReading function.
 * Run with: npx jest readingAnalyzer.test.js
 */

import { analyzeReading, normalizeWord, tokenize } from './readingAnalyzer';

// ---------------------------------------------------------------------------
// Helper: build a simple session result for a set of sentences
// ---------------------------------------------------------------------------
const run = (sentences, transcripts, durationMs = 30000) => {
  const start = 1000000;
  const end   = start + durationMs;
  return analyzeReading(sentences, transcripts, start, end);
};

// ---------------------------------------------------------------------------
// The 4 reference sentences used in the app (25 words total)
// ---------------------------------------------------------------------------
const S1 = 'The sun is bright and warm today';       // 7 words
const S2 = 'I like to read books about space';       // 7 words
const S3 = 'Learning new things makes me happy';     // 6 words
const S4 = 'Curiosity opens doors to endless discovery'; // 6 words
const SENTENCES = [S1, S2, S3, S4];
const TOTAL = 7 + 7 + 6 + 6; // = 26

// ---------------------------------------------------------------------------
// TEST 1 — Perfect read of all 4 sentences in 30 s
// ---------------------------------------------------------------------------
test('TEST 1: Perfect read → 26/26, 100%, WPM ~52, 0 errors, all PASS', () => {
  const result = run(
    SENTENCES,
    [S1, S2, S3, S4],
    30000
  );

  const { sentences, summary } = result;

  // All sentences PASS
  sentences.forEach((s, i) => {
    expect(s.status).toBe('PASS');
    expect(s.accuracy).toBe(100);
    expect(s.correctCount).toBe(s.totalWords);
    expect(s.mispronouncedCount).toBe(0);
    expect(s.skippedCount).toBe(0);
  });

  // Summary
  expect(summary.correctWords).toBe(TOTAL);
  expect(summary.totalWords).toBe(TOTAL);
  expect(summary.mispronounced).toBe(0);
  expect(summary.skipped).toBe(0);
  expect(summary.accuracy).toBe(100);

  // WPM: 26 correct words / 30s * 60 = 52 WPM
  expect(summary.wpm).toBeCloseTo(52, 0);

  // Duration
  expect(summary.durationSeconds).toBe(30);

  // Invariant: correct + mispronounced + skipped === totalWords (per sentence)
  sentences.forEach(s => {
    expect(s.correctCount + s.mispronouncedCount + s.skippedCount).toBe(s.totalWords);
  });

  // Global invariant
  expect(summary.correctWords + summary.mispronounced + summary.skipped).toBe(summary.totalWords);
});

// ---------------------------------------------------------------------------
// TEST 2 — Empty transcript (no speech detected)
// ---------------------------------------------------------------------------
test('TEST 2: Empty transcript → 0/26, 26 skipped, no speech message', () => {
  const result = run(SENTENCES, ['', '', '', ''], 20000);
  const { sentences, summary } = result;

  expect(summary.correctWords).toBe(0);
  expect(summary.skipped).toBe(TOTAL);
  expect(summary.accuracy).toBe(0);
  expect(summary.noSpeech).toBe(true);
  expect(summary.diagnostic.type).toBe('no_data');
  expect(summary.diagnostic.message).toMatch(/no speech/i);

  sentences.forEach(s => {
    expect(s.noSpeech).toBe(true);
    expect(s.correctCount).toBe(0);
    expect(s.skippedCount).toBe(s.totalWords);
    // Invariant
    expect(s.correctCount + s.mispronouncedCount + s.skippedCount).toBe(s.totalWords);
  });
});

// ---------------------------------------------------------------------------
// TEST 3 — "doors" read as "door" → 5/6 correct, 1 mispronounced, 83.3%
// ---------------------------------------------------------------------------
test('TEST 3: doors→door → 5/6 correct, 1 mispronounced, 83.3% accuracy', () => {
  const sentence = 'Curiosity opens doors to endless discovery';
  const spoken   = 'Curiosity opens door to endless discovery';

  const result = run([sentence], [spoken], 10000);
  const { sentences, summary } = result;
  const s = sentences[0];

  expect(s.totalWords).toBe(6);
  expect(s.correctCount).toBe(5);
  expect(s.mispronouncedCount).toBe(1);
  expect(s.skippedCount).toBe(0);
  expect(s.accuracy).toBeCloseTo(83.3, 1);
  expect(s.status).toBe('NEEDS_PRACTICE');

  // The mispronounced word should be "doors"
  const mispWord = s.words.find(w => w.status === 'mispronounced');
  expect(mispWord).toBeDefined();
  expect(normalizeWord(mispWord.expected)).toBe('doors');
  expect(mispWord.spoken).toBe('door');

  // Invariant
  expect(s.correctCount + s.mispronouncedCount + s.skippedCount).toBe(s.totalWords);

  // Summary
  expect(summary.correctWords).toBe(5);
  expect(summary.mispronounced).toBe(1);
  expect(summary.skipped).toBe(0);
  expect(summary.accuracy).toBeCloseTo(83.3, 1);
});

// ---------------------------------------------------------------------------
// TEST 4 — One skipped word mid-sentence; later words still align correctly
// ---------------------------------------------------------------------------
test('TEST 4: Skipped mid-sentence word; later words still align', () => {
  // Reference: "Learning new things makes me happy" (6 words)
  // Spoken: "Learning new makes me happy" (skipped "things")
  const ref    = 'Learning new things makes me happy';
  const spoken = 'Learning new makes me happy';

  const result = run([ref], [spoken], 8000);
  const { sentences } = result;
  const s = sentences[0];

  expect(s.totalWords).toBe(6);
  expect(s.skippedCount).toBe(1);

  // "things" should be the skipped word
  const skipped = s.words.find(w => w.status === 'skipped');
  expect(skipped).toBeDefined();
  expect(normalizeWord(skipped.expected)).toBe('things');

  // After "things", "makes", "me", "happy" should still align correctly (not all wrong)
  const makesWord  = s.words.find(w => normalizeWord(w.expected) === 'makes');
  const meWord     = s.words.find(w => normalizeWord(w.expected) === 'me');
  const happyWord  = s.words.find(w => normalizeWord(w.expected) === 'happy');
  expect(makesWord?.status).toBe('correct');
  expect(meWord?.status).toBe('correct');
  expect(happyWord?.status).toBe('correct');

  // Invariant
  expect(s.correctCount + s.mispronouncedCount + s.skippedCount).toBe(s.totalWords);
});

// ---------------------------------------------------------------------------
// TEST 5 — Extra inserted word
// ---------------------------------------------------------------------------
test('TEST 5: Inserted word not counted as correct; totalWords unchanged', () => {
  // Reference: "The sun is bright and warm today" (7 words)
  // Spoken: "The sun is very bright and warm today" (extra "very")
  const ref    = 'The sun is bright and warm today';
  const spoken = 'The sun is very bright and warm today';

  const result = run([ref], [spoken], 15000);
  const { sentences, summary } = result;
  const s = sentences[0];

  expect(s.totalWords).toBe(7);                         // unchanged
  expect(s.insertedCount).toBe(1);                      // "very" is inserted
  expect(s.correctCount + s.mispronouncedCount + s.skippedCount).toBe(7); // invariant

  // "very" should not be counted as correct
  const insertedWord = s.words.find(w => w.status === 'inserted' && w.spoken === 'very');
  expect(insertedWord).toBeDefined();

  // All reference words should be correct
  expect(s.correctCount).toBe(7);
  expect(s.skippedCount).toBe(0);

  // Summary totalWords should still be 7
  expect(summary.totalWords).toBe(7);
  expect(summary.inserted).toBe(1);
});

// ---------------------------------------------------------------------------
// TEST 6 — Punctuation / capitalisation differences → still correct
// ---------------------------------------------------------------------------
test('TEST 6: Punctuation and capitalisation differences → correct', () => {
  const ref    = "The sun is bright and warm today.";
  const spoken = "the Sun Is Bright And Warm Today";

  const result = run([ref], [spoken], 10000);
  const { sentences, summary } = result;
  const s = sentences[0];

  expect(s.correctCount).toBe(s.totalWords);
  expect(s.mispronouncedCount).toBe(0);
  expect(s.skippedCount).toBe(0);
  expect(s.accuracy).toBe(100);
  expect(summary.accuracy).toBe(100);
});

// ---------------------------------------------------------------------------
// TEST 7 — Invariant: correct + mispronounced + skipped = total in every case
// ---------------------------------------------------------------------------
test('TEST 7: Invariant holds across all test cases', () => {
  const cases = [
    { ref: 'The sun is bright and warm today', spoken: 'The sun is brite and warm today' },
    { ref: 'Curiosity opens doors to endless discovery', spoken: 'curiosity open door to endless' },
    { ref: 'I like to read books about space', spoken: '' },
    { ref: 'Learning new things makes me happy', spoken: 'Learning new makes me very happy extra words here' },
  ];

  cases.forEach(({ ref, spoken }) => {
    const result = run([ref], [spoken], 15000);
    const s = result.sentences[0];
    const sum = s.correctCount + s.mispronouncedCount + s.skippedCount;
    expect(sum).toBe(s.totalWords);
  });
});

// ---------------------------------------------------------------------------
// TEST 8 — Summary equals sum of sentences; duration 0 doesn't crash
// ---------------------------------------------------------------------------
test('TEST 8: Summary equals sentence sums; duration 0 → no NaN/Infinity', () => {
  // Duration 0 case
  const zeroResult = analyzeReading(
    SENTENCES,
    [S1, S2, S3, S4],
    1000000,
    1000000 // same start/end → 0 duration
  );

  const { summary } = zeroResult;

  // wpm should be null (not 0 / NaN / Infinity) when duration < 1s
  expect(summary.wpm).toBeNull();
  expect(summary.rawWpm).toBeNull();
  expect(summary.durationSeconds).toBe(0);
  expect(Number.isNaN(summary.accuracy)).toBe(false);
  expect(Number.isFinite(summary.accuracy) || summary.accuracy === 0).toBe(true);

  // Check summary matches sentence sums
  const normalResult = run(SENTENCES, [S1, '', S3, 'Curiosity opens door to endless discovery'], 25000);
  const ns = normalResult.sentences;

  expect(normalResult.summary.totalWords).toBe(ns.reduce((a, s) => a + s.totalWords, 0));
  expect(normalResult.summary.correctWords).toBe(ns.reduce((a, s) => a + s.correctCount, 0));
  expect(normalResult.summary.mispronounced).toBe(ns.reduce((a, s) => a + s.mispronouncedCount, 0));
  expect(normalResult.summary.skipped).toBe(ns.reduce((a, s) => a + s.skippedCount, 0));
  expect(normalResult.summary.inserted).toBe(ns.reduce((a, s) => a + s.insertedCount, 0));
});

// ---------------------------------------------------------------------------
// Normalisation unit tests
// ---------------------------------------------------------------------------
describe('normalizeWord', () => {
  test('strips punctuation', () => expect(normalizeWord("today.")).toBe('today'));
  test('lowercases', () => expect(normalizeWord("Bright")).toBe('bright'));
  test('strips apostrophes', () => expect(normalizeWord("don't")).toBe('dont'));
  test('empty string', () => expect(normalizeWord("")).toBe(''));
  test('null/undefined', () => expect(normalizeWord(null)).toBe(''));
});

describe('tokenize', () => {
  test('splits sentence into tokens', () =>
    expect(tokenize("Hello World!")).toEqual(['hello', 'world']));
  test('collapses multiple spaces', () =>
    expect(tokenize("a  b   c")).toEqual(['a', 'b', 'c']));
  test('handles empty string', () =>
    expect(tokenize("")).toEqual([]));
  test('handles null', () =>
    expect(tokenize(null)).toEqual([]));
});
