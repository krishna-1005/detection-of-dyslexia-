import React, { useState, useEffect } from 'react';

// ── HIGH-DEFINITION NATURAL HUMAN AUDIO VOICE API ENGINE ──
// eslint-disable-next-line no-unused-vars
let cachedVoices = [];
let selectedVoiceURI = typeof localStorage !== 'undefined' ? localStorage.getItem('lexiflow_preferred_voice') || '' : '';
// eslint-disable-next-line no-unused-vars
let currentUtterance = null; // Global reference to prevent Chrome Garbage Collection mid-speech

/**
 * Filter and prioritize ultra-realistic natural human neural voices.
 * Excludes robotic legacy SAPI5 offline voices when natural voices are available.
 */
export const getAvailableVoices = () => {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return [];
  const voices = window.speechSynthesis.getVoices() || [];
  
  // Sort voices so Neural / Natural / Online / High-Quality voices come first
  return voices.filter(v => v.lang.startsWith('en')).sort((a, b) => {
    const scoreA = getVoiceQualityScore(a);
    const scoreB = getVoiceQualityScore(b);
    return scoreB - scoreA;
  });
};

const getVoiceQualityScore = (voice) => {
  let score = 0;
  const name = voice.name;

  // Premium Natural / Neural Human Voices (Microsoft Online Natural, Google Natural, Apple Enhanced)
  if (name.includes('Natural') || name.includes('Online (Natural)')) score += 100;
  if (name.includes('Neural')) score += 90;
  if (name.includes('Google US English') || name.includes('Google UK English Female')) score += 80;
  if (name.includes('Samantha') || name.includes('Ava (Enhanced)') || name.includes('Jenny')) score += 70;
  if (name.includes('Aria') || name.includes('Guy') || name.includes('Ana')) score += 60;
  if (voice.default) score += 10;

  // Penalize legacy robotic voices (e.g. "Microsoft David Desktop", "Microsoft Zira Desktop")
  if (name.includes('Desktop') || name.includes('SAPI5')) score -= 40;

  return score;
};

export const getSelectedVoice = () => {
  const voices = getAvailableVoices();
  if (voices.length === 0) return null;

  if (selectedVoiceURI) {
    const matched = voices.find(v => v.voiceURI === selectedVoiceURI || v.name === selectedVoiceURI);
    if (matched) return matched;
  }

  // Default to highest quality human voice
  return voices[0] || null;
};

export const setPreferredVoice = (voiceURI) => {
  selectedVoiceURI = voiceURI;
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('lexiflow_preferred_voice', voiceURI);
  }
};

if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  window.speechSynthesis.onvoiceschanged = () => {
    cachedVoices = getAvailableVoices();
  };
  cachedVoices = getAvailableVoices();
}

/**
 * Formats raw text into natural human speech prosody with human-like breathing pauses.
 */
const formatHumanText = (text) => {
  if (!text) return '';
  return text
    .replace(/▶|◀|🐍|🧪|✨|🎉|💥|🤖|🔊|🟢|🟡|🔴|🔥|🧙|🎙️|🧩|🎮|🏃💨|⭐|⚡|🍄|❤️/g, '') // Strip UI symbols
    .replace(/([A-Z])-([A-Z])/gi, '$1 hyphen $2') // Read hyphenated prefixes cleanly
    .replace(/!/g, ', ') // Soften exclamation marks into conversational pauses
    .replace(/\s+/g, ' ')
    .trim();
};

/**
 * Speaks text using warm, natural human conversational pacing and expressive cadence.
 */
export const speakHumanText = (text, options = {}) => {
  if (!text || typeof window === 'undefined' || !('speechSynthesis' in window)) return;

  try {
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }
    window.speechSynthesis.cancel();

    // 40ms tick delay prevents Chrome from dropping the speech request
    setTimeout(() => {
      try {
        const cleanText = formatHumanText(text);
        const utterance = new SpeechSynthesisUtterance(cleanText);
        currentUtterance = utterance; // Retain global reference against GC

        const voice = getSelectedVoice();
        if (voice) {
          utterance.voice = voice;
        }

        // Natural Human Cadence Parameters
        utterance.rate = options.rate || 0.90;   // Warm, unhurried, natural human speech rate
        utterance.pitch = options.pitch || 1.0;   // Authentic natural human pitch (no artificial robotic elevation)
        utterance.volume = options.volume || 1.0;

        utterance.onend = () => {
          currentUtterance = null;
          if (options.onend) options.onend();
        };
        utterance.onerror = (err) => {
          console.warn('SpeechSynthesis error:', err);
          currentUtterance = null;
          if (options.onerror) options.onerror(err);
        };

        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }
        window.speechSynthesis.speak(utterance);
      } catch (e) {
        console.warn('Speech synthesis execution failed:', e);
      }
    }, 40);
  } catch (err) {
    console.warn('speakHumanText error:', err);
  }
};

/**
 * React Chip Component to let users pick their preferred human voice on the fly.
 */
export const VoiceSelectorChip = () => {
  const [voices, setVoices] = useState([]);
  const [activeURI, setActiveURI] = useState(selectedVoiceURI);

  useEffect(() => {
    const update = () => {
      const avail = getAvailableVoices();
      setVoices(avail);
      const current = getSelectedVoice();
      if (current) setActiveURI(current.voiceURI);
    };

    update();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = update;
    }
  }, []);

  const handleChange = (e) => {
    const uri = e.target.value;
    setActiveURI(uri);
    setPreferredVoice(uri);
    speakHumanText("Hello! This is how my voice sounds for your exercises.");
  };

  if (voices.length === 0) return null;

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(255, 255, 255, 0.12)', padding: '4px 10px', borderRadius: '20px', border: '1px solid rgba(255, 255, 255, 0.25)', fontSize: '0.8rem', color: '#fff' }}>
      <span>🎙️ Voice:</span>
      <select 
        value={activeURI} 
        onChange={handleChange}
        style={{ background: 'transparent', color: '#fff', border: 'none', outline: 'none', fontWeight: 'bold', cursor: 'pointer', maxWidth: '140px' }}
      >
        {voices.slice(0, 6).map((v) => (
          <option key={v.voiceURI} value={v.voiceURI} style={{ background: '#1e1b4b', color: '#fff' }}>
            {v.name.replace('Microsoft ', '').replace('Google ', '').replace(' (United States)', '').replace(' Online (Natural)', ' 🌟')}
          </option>
        ))}
      </select>
    </div>
  );
};

export default speakHumanText;


