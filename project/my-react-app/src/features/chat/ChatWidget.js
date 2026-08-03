import React, { useState, useEffect, useRef } from 'react';
import './ChatWidget.css';

const API_BASE_URL = "http://localhost:5000";

const quickPrompts = [
  "💡 How does Bionic Reader work?",
  "🧩 What is Phoneme Matching?",
  "📖 Tips for reading fluency",
  "🏆 Explain Orton-Gillingham"
];

const ChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'ai',
      text: "👋 Hi there! I'm **LexiAI**, your Dyslexia Clinical Specialist & Assistant. Powered live by **Gemini AI Engine**. How can I help you today?"
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

      if (data.error) {
        setMessages(prev => [...prev, {
          id: Date.now() + 1,
          sender: 'ai',
          text: `⚠️ **AI Service Notice**: ${data.error}`
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
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        sender: 'ai',
        text: "⚠️ Couldn't reach LexiAI Flask server on port 5000. Please make sure the Python backend is running."
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
                <small>✨ Powered by Gemini AI Engine</small>
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
