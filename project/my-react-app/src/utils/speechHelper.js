/**
 * Natural Human Voice Helper & Tactile Sound FX Engine for LexiFlow Kids
 * Selects ultra-realistic neural/natural human voices from Web Speech API
 * and plays tactile click sound effects on all button/interactive element clicks.
 */

let cachedVoice = null;

export const loadNaturalVoice = () => {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;

  const voices = window.speechSynthesis.getVoices();
  if (!voices || voices.length === 0) return null;

  // Priority 1: Natural / Neural human online voices (Microsoft Natural, Google Neural, Apple Natural)
  let bestVoice = voices.find(v => 
    v.lang.startsWith('en') && (
      v.name.includes('Natural') || 
      v.name.includes('Online (Natural)') ||
      v.name.includes('Neural') ||
      v.name.includes('Google US English') ||
      v.name.includes('Google UK English Female') ||
      v.name.includes('Samantha') ||
      v.name.includes('Karen') ||
      v.name.includes('Victoria') ||
      v.name.includes('Daniel')
    )
  );

  // Priority 2: Any English female/warm voice
  if (!bestVoice) {
    bestVoice = voices.find(v => 
      v.lang.startsWith('en') && (
        v.name.includes('Female') || 
        v.name.includes('Zira') || 
        v.name.includes('Eva') || 
        v.name.includes('Jenny')
      )
    );
  }

  // Priority 3: Any English voice
  if (!bestVoice) {
    bestVoice = voices.find(v => v.lang.startsWith('en-US')) 
      || voices.find(v => v.lang.startsWith('en')) 
      || voices[0];
  }

  cachedVoice = bestVoice;
  return bestVoice;
};

// Pre-warm voice list listener
if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  window.speechSynthesis.onvoiceschanged = () => {
    loadNaturalVoice();
  };
  loadNaturalVoice();
}

/**
 * Speaks text using ultra-realistic natural human voice with enthusiastic cadence.
 */
export const speakText = (text, options = {}) => {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

  try {
    // Play subtle audio cue first
    playClickSound();

    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }
    window.speechSynthesis.cancel(); // Cancel ongoing speech

    // Format text cleanly for TTS reading (e.g. /FL/ -> F L, /SH/ -> S H)
    let cleanText = text
      .replace(/\/([A-Za-z]+)\//g, (_, p) => p.split('').join(' '))
      .replace(/[\/\*]/g, ' ')
      .trim();

    const utterance = new SpeechSynthesisUtterance(cleanText);
    const voice = cachedVoice || loadNaturalVoice();

    if (voice) {
      utterance.voice = voice;
    }

    utterance.rate = options.rate || 0.9;   // Clear, child-friendly pacing
    utterance.pitch = options.pitch || 1.08; // Friendly warm pitch
    utterance.volume = options.volume || 1.0;

    if (options.onend) utterance.onend = options.onend;
    if (options.onerror) utterance.onerror = options.onerror;

    // Small 40ms delay after cancel() prevents Chrome from dropping the speech request
    setTimeout(() => {
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
      window.speechSynthesis.speak(utterance);
    }, 40);
  } catch (err) {
    console.warn("Speech synthesis error:", err);
  }
};

/**
 * Tactile Button Click Sound Synthesizer (Zero-latency Web Audio API)
 */
export const playClickSound = () => {
  if (typeof window === 'undefined') return;
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    // Frequency sweep for a satisfying wooden bubble click
    osc.frequency.setValueAtTime(650, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(140, ctx.currentTime + 0.045);

    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.045);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.045);
  } catch (e) {
    /* Ignore audio context restrictions prior to user interaction */
  }
};

// Global click event listener for instant tactile audio feedback on all buttons & links
if (typeof window !== 'undefined') {
  window.addEventListener('click', (e) => {
    const isInteractive = e.target.closest('button, a, input[type="button"], input[type="submit"], [role="button"], .kids-nav-item, .kids-sound-card, .sidebar-item, .sq-answer-card, .btn-play-level, .kids-logout-btn, .kids-cta-btn, .game-card-kids');
    if (isInteractive) {
      playClickSound();
    }
  }, { capture: true, passive: true });
}
