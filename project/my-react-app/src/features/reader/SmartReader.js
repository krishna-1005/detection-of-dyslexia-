import React, { useState, useRef } from 'react';
import Navbar from '../dashboard/Navbar';
import Sidebar from '../dashboard/Sidebar';
import FocusRuler from './FocusRuler';
import './SmartReader.css';
import { useAuth } from '../auth/AuthContext';
import { fetchWithAuth } from '../../services/api';

const SmartReader = () => {
    const { currentUser } = useAuth();
    const user = currentUser;
    const [text, setText] = useState("");
    const [simplifiedText, setSimplifiedText] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [viewMode, setViewMode] = useState("original");
    const [settings, setSettings] = useState({
        fontSize: 20,
        lineHeight: 1.8,
        letterSpacing: 2,
        fontFamily: "'Lexend', sans-serif",
        bionicMode: false,
        showRuler: false
    });
    const [isReading, setIsReading] = useState(false);
    const [currentWordIndex, setCurrentWordIndex] = useState(-1);
    const readingAreaRef = useRef(null);

    const handleSimplify = async () => {
        if (!text.trim()) return;
        setIsLoading(true);
        try {
            const response = await fetchWithAuth("/api/simplify", {
                method: "POST",
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
        if (!content) return <p className="placeholder-text">Enter or paste complex text into the input section above to begin transformation...</p>;

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
            <div className="dashboard-layout" style={{ display: 'flex' }}>
                <Sidebar />
                <main className="main-content reader-main" style={{ flex: 1, padding: '2.5rem' }}>
                    <header className="reader-header" style={{ marginBottom: '2rem' }}>
                        <div className="title-area">
                            <span className="badge badge-info" style={{ marginBottom: '0.4rem' }}>✨ AI Reading Accessibility Suite</span>
                            <h1 style={{ fontSize: '1.9rem', fontWeight: 800 }}>Smart AI Reader & Simplifier</h1>
                            <p style={{ color: 'var(--lf-text-muted)', fontSize: '0.9rem', marginTop: '0.2rem' }}>
                                Transform dense, complex paragraphs into high-readability dyslexia-friendly formats.
                            </p>
                        </div>
                        <div className="header-actions">
                            <button 
                                className={`mode-btn ${viewMode === 'original' ? 'active' : ''}`}
                                onClick={() => setViewMode('original')}
                            >
                                📄 Original Text
                            </button>
                            <button 
                                className={`mode-btn ${viewMode === 'simplified' ? 'active' : ''}`}
                                onClick={() => setViewMode('simplified')}
                                disabled={!simplifiedText}
                            >
                                ✨ AI Simplified Text
                            </button>
                        </div>
                    </header>

                    <div className="reader-grid">
                        <section className="input-section medical-card">
                            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem' }}>Source Content Input</h3>
                            <textarea 
                                value={text}
                                onChange={(e) => setText(e.target.value)}
                                placeholder="Paste articles, textbook chapters, or complex clinical documents here..."
                                className="reader-textarea"
                            />
                            <div className="input-actions" style={{ marginTop: '1.25rem' }}>
                                <button className="btn-gradient" onClick={handleSimplify} disabled={isLoading || !text.trim()}>
                                    {isLoading ? "✨ SIMPLIFYING WITH AI..." : "✨ AI SIMPLIFY TEXT"}
                                </button>
                                <button className="btn-secondary" onClick={() => { setText(""); setSimplifiedText(""); }}>
                                    Clear Text
                                </button>
                            </div>
                        </section>

                        <section className="controls-section medical-card">
                            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1.25rem' }}>Reader Toolbar</h3>
                            
                            <div className="control-group">
                                <label className="medical-label">Audio Assist</label>
                                <button className={`read-btn ${isReading ? 'reading' : ''}`} onClick={handleReadAloud}>
                                    {isReading ? "⏹ Stop Speech" : "🔊 Read Aloud with Speech"}
                                </button>
                            </div>

                            <div className="control-group">
                                <label className="medical-label">Visual Assist Tools</label>
                                <div className="toggle-item">
                                    <span>Focus Line Ruler</span>
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
                                <label className="medical-label">Typography Controls</label>
                                <div className="range-item">
                                    <span>Size ({settings.fontSize}px)</span>
                                    <input type="range" min="16" max="32" value={settings.fontSize} onChange={(e) => setSettings({...settings, fontSize: e.target.value})} />
                                </div>
                                <div className="range-item">
                                    <span>Spacing</span>
                                    <input type="range" min="1" max="10" value={settings.letterSpacing} onChange={(e) => setSettings({...settings, letterSpacing: e.target.value})} />
                                </div>
                            </div>
                            
                            <div className="control-group">
                                <label className="medical-label">Typeface Selection</label>
                                <select 
                                    value={settings.fontFamily} 
                                    onChange={(e) => setSettings({...settings, fontFamily: e.target.value})}
                                    className="font-select"
                                >
                                    <option value="'Lexend', sans-serif">Lexend Clinical (Recommended)</option>
                                    <option value="'Plus Jakarta Sans', sans-serif">Plus Jakarta Sans</option>
                                    <option value="'Comic Sans MS', cursive">Dyslexia-Friendly Weighted</option>
                                    <option value="monospace">Monospace</option>
                                </select>
                            </div>
                        </section>

                        <section className="display-section medical-card">
                            <div className="display-header">
                                <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>Transformed Reading Canvas</h3>
                                {viewMode === 'simplified' && <span className="badge badge-low">✨ AI SIMPLIFIED</span>}
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
