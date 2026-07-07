import React, { useState, useEffect, useRef } from 'react';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import SpeechAssistant from './SpeechAssistant';
import FocusRuler from './FocusRuler';
import './SmartReader.css';

const SmartReader = () => {
    const [text, setText] = useState("");
    const [simplifiedText, setSimplifiedText] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [viewMode, setViewMode] = useState("original"); // original or simplified
    const [settings, setSettings] = useState({
        fontSize: 20,
        lineHeight: 1.8,
        letterSpacing: 2,
        fontFamily: 'system-ui',
        bionicMode: false,
        showRuler: false
    });
    const [isReading, setIsReading] = useState(false);
    const [currentWordIndex, setCurrentWordIndex] = useState(-1);
    
    const user = JSON.parse(localStorage.getItem("lexiflow_user"));
    const readingAreaRef = useRef(null);

    const handleSimplify = async () => {
        if (!text.trim()) return;
        setIsLoading(true);
        try {
            const response = await fetch(`${process.env.REACT_APP_API_URL || "http://localhost:5000"}/api/simplify`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text })
            });
            const data = await response.json();
            if (data.simplified_text) {
                setSimplifiedText(data.simplified_text);
                setViewMode("simplified");
            } else {
                alert("Error simplifying text: " + (data.error || "Unknown error"));
            }
        } catch (error) {
            console.error("Simplification failed:", error);
            alert("Failed to connect to backend.");
        }
        setIsLoading(false);
    };

    const toggleBionic = (txt) => {
        if (!settings.bionicMode) return txt;
        return txt.split(' ').map((word, i) => {
            const half = Math.ceil(word.length / 2);
            const first = word.substring(0, half);
            const second = word.substring(half);
            return <span key={i}><strong>{first}</strong>{second}{' '}</span>;
        });
    };

    const handleReadAloud = () => {
        const contentToRead = viewMode === "original" ? text : simplifiedText;
        if (!contentToRead) return;

        if (isReading) {
            window.speechSynthesis.cancel();
            setIsReading(false);
            setCurrentWordIndex(-1);
            return;
        }

        setIsReading(true);
        const words = contentToRead.split(/\s+/);
        let index = 0;

        const utterance = new SpeechSynthesisUtterance(contentToRead);
        utterance.rate = 0.9;
        
        utterance.onboundary = (event) => {
            if (event.name === 'word') {
                setCurrentWordIndex(index);
                index++;
            }
        };

        utterance.onend = () => {
            setIsReading(false);
            setCurrentWordIndex(-1);
        };

        window.speechSynthesis.speak(utterance);
    };

    const renderText = () => {
        const content = viewMode === "original" ? text : simplifiedText;
        if (!content) return <p className="placeholder-text">Enter or paste text to begin...</p>;

        const words = content.split(/\s+/);

        return (
            <div 
                className={`reading-content ${settings.bionicMode ? 'bionic' : ''}`}
                style={{
                    fontSize: `${settings.fontSize}px`,
                    lineHeight: settings.lineHeight,
                    letterSpacing: `${settings.letterSpacing}px`,
                    fontFamily: settings.fontFamily
                }}
            >
                {words.map((word, i) => (
                    <span 
                        key={i} 
                        className={`reader-word ${currentWordIndex === i ? 'highlight' : ''}`}
                    >
                        {settings.bionicMode ? (
                            <><strong>{word.substring(0, Math.ceil(word.length / 2))}</strong>{word.substring(Math.ceil(word.length / 2))}</>
                        ) : word}
                        {' '}
                    </span>
                ))}
            </div>
        );
    };

    return (
        <div className="page-container smart-reader-page">
            <Navbar user={user} />
            <div className="dashboard-layout">
                <Sidebar />
                <main className="main-content reader-main">
                    <header className="reader-header">
                        <div className="title-area">
                            <span className="medical-label">AI Accessibility Tool</span>
                            <h1>Smart AI Reader</h1>
                            <p>Transform any text into a dyslexia-friendly reading experience.</p>
                        </div>
                        <div className="header-actions">
                            <button 
                                className={`mode-btn ${viewMode === 'original' ? 'active' : ''}`}
                                onClick={() => setViewMode('original')}
                            >
                                Original
                            </button>
                            <button 
                                className={`mode-btn ${viewMode === 'simplified' ? 'active' : ''}`}
                                onClick={() => setViewMode('simplified')}
                                disabled={!simplifiedText}
                            >
                                AI Simplified
                            </button>
                        </div>
                    </header>

                    <div className="reader-grid">
                        <section className="input-section medical-card">
                            <h3>Source Text</h3>
                            <textarea 
                                value={text}
                                onChange={(e) => setText(e.target.value)}
                                placeholder="Paste long articles, complex documents, or any text you find hard to read..."
                                className="reader-textarea"
                            />
                            <div className="input-actions">
                                <button className="medical-btn-primary" onClick={handleSimplify} disabled={isLoading || !text.trim()}>
                                    {isLoading ? "Simplifying..." : "✨ AI Simplify"}
                                </button>
                                <button className="medical-btn-secondary" onClick={() => setText("")}>Clear</button>
                            </div>
                        </section>

                        <section className="controls-section medical-card">
                            <h3>Reading Assistant</h3>
                            <div className="control-group">
                                <label>Audio Assist</label>
                                <button className={`read-btn ${isReading ? 'reading' : ''}`} onClick={handleReadAloud}>
                                    {isReading ? "Stop Reading" : "🔊 Read Aloud"}
                                </button>
                            </div>

                            <div className="control-group">
                                <label>Visual Focus</label>
                                <div className="toggle-item">
                                    <span>Focus Ruler</span>
                                    <input 
                                        type="checkbox" 
                                        checked={settings.showRuler} 
                                        onChange={(e) => setSettings({...settings, showRuler: e.target.checked})} 
                                    />
                                </div>
                                <div className="toggle-item">
                                    <span>Bionic Reading</span>
                                    <input 
                                        type="checkbox" 
                                        checked={settings.bionicMode} 
                                        onChange={(e) => setSettings({...settings, bionicMode: e.target.checked})} 
                                    />
                                </div>
                            </div>

                            <div className="control-group">
                                <label>Typography</label>
                                <div className="range-item">
                                    <span>Size</span>
                                    <input type="range" min="16" max="32" value={settings.fontSize} onChange={(e) => setSettings({...settings, fontSize: e.target.value})} />
                                </div>
                                <div className="range-item">
                                    <span>Spacing</span>
                                    <input type="range" min="1" max="10" value={settings.letterSpacing} onChange={(e) => setSettings({...settings, letterSpacing: e.target.value})} />
                                </div>
                            </div>
                            
                            <div className="control-group">
                                <label>Font Style</label>
                                <select 
                                    value={settings.fontFamily} 
                                    onChange={(e) => setSettings({...settings, fontFamily: e.target.value})}
                                    className="font-select"
                                >
                                    <option value="system-ui">Default</option>
                                    <option value="'Lexend', sans-serif">Lexend (Clear)</option>
                                    <option value="'Comic Sans MS', cursive">Dyslexic Friendly (Weighted)</option>
                                    <option value="monospace">Monospace</option>
                                </select>
                            </div>
                        </section>

                        <section className="display-section medical-card">
                            <div className="display-header">
                                <h3>Reading View</h3>
                                {viewMode === 'simplified' && <span className="ai-badge">AI OPTIMIZED</span>}
                            </div>
                            <div className="reader-viewport" ref={readingAreaRef}>
                                {renderText()}
                                {settings.showRuler && <FocusRuler isActive={true} />}
                            </div>
                        </section>
                    </div>
                </main>
            </div>
        </div>
    );
};

export default SmartReader;
