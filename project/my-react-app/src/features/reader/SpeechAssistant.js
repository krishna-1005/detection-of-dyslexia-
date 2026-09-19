// eslint-disable-next-line no-unused-vars
let activeUtterance = null;

const SpeechAssistant = {
  speak: (text) => {
    if (!text || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    
    try {
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
      window.speechSynthesis.cancel();

      setTimeout(() => {
        const utterance = new SpeechSynthesisUtterance(text);
        activeUtterance = utterance;
        utterance.lang = "en-US";
        utterance.pitch = 1;
        utterance.rate = 1;
        utterance.onend = () => { activeUtterance = null; };
        utterance.onerror = () => { activeUtterance = null; };
        window.speechSynthesis.speak(utterance);
      }, 40);
    } catch (e) {
      console.warn("SpeechAssistant error:", e);
    }
  },
};

export default SpeechAssistant;

