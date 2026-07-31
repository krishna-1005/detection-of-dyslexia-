import React, { useState, useEffect, useRef } from 'react';
import './ChatWidget.css';

const API_BASE_URL = "http://localhost:5000";

const quickPrompts = [
  "💡 How does Bionic Reader work?",
  "🧩 What is Phoneme Matching?",
  "📖 Tips for reading fluency",
  "🏆 Explain Orton-Gillingham"
];

const getFrontendFallback = (userMessage) => {
  const msg = (userMessage || '').toLowerCase();
  
  if (msg.includes('bionic') || msg.includes('reader') || msg.includes('fixation')) {
    return "✨ **Bionic Reading & Smart Reader Guide**:\n\n• **Bionic Fixation**: Bolds initial letters to create natural visual anchor points.\n• **OpenDyslexic Font**: Heavy-bottomed letter forms prevent letter swapping.\n• **Line Focus**: Highlighting single lines reduces visual crowding.\n\n💡 *Try our Bionic Reader Sandbox on the Home page or launch Smart Reader from the Dashboard!*";
  } else if (msg.includes('phoneme') || msg.includes('sound') || msg.includes('auditory')) {
    return "🧩 **Phoneme & Auditory Processing**:\n\n• **Phonemic Awareness**: The ability to identify individual sounds in spoken words.\n• **Phoneme Matching Therapy**: Connects visual letters with audio cues.\n• **Auditory Drills**: Syllable isolation exercises for decoding accuracy.\n\n💡 *Try our Multisensory Phoneme Sampler deck on the Home page!*";
  } else if (msg.includes('orton') || msg.includes('gillingham') || msg.includes('method') || msg.includes('science')) {
    return "🏆 **Orton-Gillingham Approach**:\n\n• **Multisensory**: Engages visual, auditory, and kinesthetic pathways.\n• **Sequential & Structured**: Teaches phonics rules in explicit steps.\n• **Prescriptive**: Dynamically adjusts difficulty based on learner accuracy.\n\nLexiFlow's 6 therapy modules are 100% OG-aligned.";
  } else if (msg.includes('tip') || msg.includes('fluency') || msg.includes('improve')) {
    return "📖 **5 Proven Reading Fluency Tips**:\n\n1. **Use Bionic Reading Overlays** to speed up visual tracking.\n2. **Combine Speech Audio** with visual reading (multisensory).\n3. **Increase Line & Letter Spacing** to reduce visual clutter.\n4. **Keep Sessions Short** (10-15 minutes daily).\n5. **Use Cream/Dark Background Tints** to ease eye strain.";
  } else if (msg.includes('quiz') || msg.includes('screen') || msg.includes('test')) {
    return "📋 **Dyslexia Symptoms Screening**:\n\n• Takes under 3 minutes to evaluate 10 developmental reading indicators.\n• Questions refresh dynamically for re-testing accuracy.\n• Provides instant clinical metrics and action steps.\n\n🔗 Visit `/quiz` or click 'Start Screening' on the Home page.";
  } else if (msg.includes('therapy') || msg.includes('exercise')) {
    return "🧠 **LexiFlow Therapy Suite**:\n\n• **Phoneme Matching**: Sound-symbol correspondence.\n• **Morphology**: Prefixes & root words.\n• **Rapid Naming**: Automatized naming speed.\n• **Visual Tracking**: Saccadic eye tracking.\n• **Auditory Processing**: Sound discrimination.\n• **Video Practice**: Real-time Azure speech feedback.";
  } else {
    return "👋 **LexiAI Clinical Assistant**:\n\nI'm here to support you with evidence-based dyslexia strategies and LexiFlow reading tools!\n\nAsk me about:\n• **Bionic Reading** & OpenDyslexic fonts\n• **Phoneme Matching** & Auditory Therapy\n• **Orton-Gillingham** principles\n• **Reading Fluency Tips**\n• **LexiFlow Diagnostics & Therapy**";
  }
};

const ChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'ai',
      text: "👋 Hi there! I'm **LexiAI**, your Dyslexia Clinical Specialist & Assistant. How can I help you today with reading strategies, therapy exercises, or platform tools?"
    }
  ]);
  const [inputMsg, setInputMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(1);
  const chatBottomRef = useRef(null);

  useEffect(() => {
    if (isOpen && unreadCount > 0) {
      setUnreadCount(0);
    }
  }, [isOpen, unreadCount]);

  useEffect(() => {
    if (isOpen) {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isLoading]);

  const sendMessage = async (textToSend) => {
    const text = (textToSend || inputMsg).trim();
    if (!text || isLoading) return;

    const userMessage = {
      id: Date.now(),
      sender: 'user',
      text: text
    };

    setMessages(prev => [...prev, userMessage]);
    if (!textToSend) setInputMsg('');
    setIsLoading(true);

    try {
      // Build history payload for Gemini context
      const historyPayload = messages.map(m => ({
        sender: m.sender === 'user' ? 'user' : 'model',
        text: m.text
      }));

      const res = await fetch(`${API_BASE_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history: historyPayload
        })
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        // Friendly local response if API limit or server error occurs
        const fallbackText = getFrontendFallback(text);
        setMessages(prev => [...prev, {
          id: Date.now() + 1,
          sender: 'ai',
          text: fallbackText
        }]);
      } else {
        setMessages(prev => [...prev, {
          id: Date.now() + 1,
          sender: 'ai',
          text: data.reply || "I am ready to assist you further!"
        }]);
      }
    } catch (err) {
      console.error("Chat error:", err);
      const fallbackText = getFrontendFallback(text);
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        sender: 'ai',
        text: fallbackText
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => {
    setMessages([
      {
        id: Date.now(),
        sender: 'ai',
        text: "Conversations reset. How else can LexiAI help you today?"
      }
    ]);
  };

  // Helper to format bold markdown and paragraph linebreaks
  const renderFormattedText = (text) => {
    if (!text) return null;
    return text.split('\n').map((line, idx) => {
      // Simple Markdown bold replacement
      const parts = line.split(/(\*\*.*?\*\*)/g);
      const formattedLine = parts.map((part, pIdx) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={pIdx}>{part.slice(2, -2)}</strong>;
        }
        return part;
      });

      return (
        <React.Fragment key={idx}>
          {formattedLine}
          {idx < text.split('\n').length - 1 && <br />}
        </React.Fragment>
      );
    });
  };

  return (
    <div className="lexi-chat-container">
      {/* Floating Trigger Button */}
      {!isOpen && (
        <button className="lexi-chat-trigger" onClick={() => setIsOpen(true)}>
          <div className="trigger-icon">🤖</div>
          <span className="trigger-label">Ask LexiAI</span>
          {unreadCount > 0 && <span className="unread-dot">{unreadCount}</span>}
        </button>
      )}

      {/* Floating Glassmorphic Chat Window */}
      {isOpen && (
        <div className="lexi-chat-window animate-fadeInUp">
          {/* Header */}
          <div className="chat-header">
            <div className="header-info">
              <div className="bot-avatar">🤖</div>
              <div>
                <h4>LexiAI Clinical Specialist <span className="online-badge">● Online</span></h4>
                <small>✨ Powered by Groq AI Engine & Llama 3</small>
              </div>
            </div>

            <div className="header-actions">
              <button className="icon-action-btn" title="Clear Chat History" onClick={clearChat}>🗑️</button>
              <button className="icon-action-btn" title="Close Chat" onClick={() => setIsOpen(false)}>✕</button>
            </div>
          </div>

          {/* Quick Prompts Carousel */}
          <div className="quick-prompts-bar">
            {quickPrompts.map((prompt, idx) => (
              <button key={idx} className="quick-prompt-chip" onClick={() => sendMessage(prompt.replace(/^[^\s]+\s/, ''))}>
                {prompt}
              </button>
            ))}
          </div>

          {/* Messages Container */}
          <div className="chat-messages-area">
            {messages.map(msg => (
              <div key={msg.id} className={`chat-message-row ${msg.sender}`}>
                {msg.sender === 'ai' && <div className="msg-avatar">🤖</div>}
                <div className="chat-bubble">
                  {renderFormattedText(msg.text)}
                </div>
                {msg.sender === 'user' && <div className="msg-avatar user">👤</div>}
              </div>
            ))}

            {isLoading && (
              <div className="chat-message-row ai">
                <div className="msg-avatar">🤖</div>
                <div className="chat-bubble typing-bubble">
                  <span className="typing-dot"></span>
                  <span className="typing-dot"></span>
                  <span className="typing-dot"></span>
                </div>
              </div>
            )}
            <div ref={chatBottomRef} />
          </div>

          {/* Input Footer */}
          <div className="chat-input-footer">
            <textarea
              className="chat-textarea"
              placeholder="Ask LexiAI anything about dyslexia, reading tips..."
              value={inputMsg}
              onChange={e => setInputMsg(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
            />
            <button 
              className="chat-send-btn" 
              onClick={() => sendMessage()}
              disabled={!inputMsg.trim() || isLoading}
            >
              ➔
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatWidget;
