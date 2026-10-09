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
        fontFamily: "'OpenDyslexic', 'Lexend', sans-serif",
        contrastMode: "default", // default | dark | sepia | highcontrast
        bionicMode: false,
        showRuler: false
    });
    const [isReading, setIsReading] = useState(false);
    const [currentWordIndex, setCurrentWordIndex] = useState(-1);
    const readingAreaRef = useRef(null);
    const fileInputRef = useRef(null);

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setIsLoading(true);
        const formData = new FormData();
        formData.append("file", file);
        try {
            const response = await fetchWithAuth("/api/upload", {
                method: "POST",
                body: formData,
            });
            const data = await response.json();
            if (response.ok && data.text) {
                setText(data.text);
                setViewMode("original");
            } else {
                alert(data.error || "Failed to parse document.");
            }
        } catch (err) {
            alert("Error uploading document.");
        } finally {
            setIsLoading(false);
            e.target.value = "";
        }
    };

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

    const getContrastStyles = () => {
        switch (settings.contrastMode) {
            case "dark":
                return { background: "#0f172a", color: "#f8fafc", border: "1px solid #334155" };
            case "sepia":
                return { background: "#fef3c7", color: "#78350f", border: "1px solid #fde68a" };
            case "highcontrast":
                return { background: "#000000", color: "#ffff00", border: "2px solid #ffff00" };
            default:
                return { background: "#ffffff", color: "#0f172a", border: "1px solid #e2e8f0" };
        }
    };

    const renderText = () => {
        const content = viewMode === "original" ? text : simplifiedText;
        if (!content) return <p className="placeholder-text">Enter text or upload a document (.pdf, .docx, .txt) above to transform...</p>;

        const words = content.split(/\s+/);

        return (
            <div 
                className={`reading-content ${settings.bionicMode ? 'bionic' : ''}`}
                style={{
                    fontSize: `${settings.fontSize}px`,
                    lineHeight: settings.lineHeight,
                    letterSpacing: `${settings.letterSpacing}px`,
                    fontFamily: settings.fontFamily,
                    ...getContrastStyles(),
                    padding: "1.5rem",
                    borderRadius: "12px"
                }}
            >
                {words.map((word, i) => {
                    // Bold initial 30%-50% (approx 40%) of the word for Bionic Reading fixation point
                    const fixLen = Math.max(1, Math.ceil(word.length * 0.4));
                    return (
                        <span 
                            key={i} 
                            className={`reader-word ${currentWordIndex === i ? 'highlight' : ''}`}
                        >
                            {settings.bionicMode ? (
                                <>
                                    <strong style={{ fontWeight: 900, color: settings.contrastMode === "highcontrast" ? "#00ffff" : "inherit" }}>
                                        {word.substring(0, fixLen)}
                                    </strong>
                                    {word.substring(fixLen)}
                                </>
                            ) : word}
                            {' '}
                        </span>
                    );
                })}
            </div>
        );
    };

    return (
        <div className="page-container kids-page-bg smart-reader-page" style={{ minHeight: '100vh', background: 'radial-gradient(circle at 10% 20%, rgba(255, 242, 210, 0.5) 0%, rgba(224, 247, 250, 0.5) 50%, rgba(243, 229, 245, 0.5) 100%)' }}>
            <Navbar user={user} />
            <div className="dashboard-layout" style={{ display: 'flex' }}>
                <Sidebar />
                <main className="main-content reader-main" style={{ flex: 1, padding: '2.5rem' }}>
                    <header className="reader-header" style={{ marginBottom: '2rem' }}>
                        <div className="title-area">
                            <span className="title-kids-badge" style={{ fontSize: '0.85rem', padding: '4px 12px', marginBottom: '0.4rem', display: 'inline-block' }}>✨ AI Story Accessibility 🎈</span>
                            <h1 style={{ fontSize: '2.2rem', fontWeight: 900, color: '#2f3542', margin: 0, fontFamily: 'var(--kids-font-display, "Fredoka", sans-serif)' }}>
                                📖 Smart AI Story Reader & Bionic Accessibility 🎈
                            </h1>
                            <p style={{ color: '#57606f', fontSize: '0.95rem', marginTop: '0.4rem', fontWeight: 600 }}>
                                Transform complex documents with Bionic Reading fixation bolds, OpenDyslexic font, contrast modes, and line rulers!
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
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>Source Content Input</h3>
                                <button className="btn-secondary" style={{ fontSize: '0.82rem', padding: '4px 12px' }} onClick={() => fileInputRef.current?.click()}>
                                    📄 Upload File (.pdf, .docx, .txt)
                                </button>
                                <input type="file" ref={fileInputRef} style={{ display: 'none' }} accept=".pdf,.docx,.txt" onChange={handleFileUpload} />
                            </div>
                            <textarea 
                                value={text}
                                onChange={(e) => setText(e.target.value)}
                                placeholder="Paste text or upload document files (.pdf, .docx, .txt) here to transform..."
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
                            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1.25rem' }}>Reader Accessibility Toolbar</h3>
                            
                            <div className="control-group">
                                <label className="medical-label">Audio Assist</label>
                                <button className={`read-btn ${isReading ? 'reading' : ''}`} onClick={handleReadAloud}>
                                    {isReading ? "⏹ Stop Speech" : "🔊 Read Aloud with Speech"}
                                </button>
                            </div>

                            <div className="control-group">
                                <label className="medical-label">Visual Scaffolding Tools</label>
                                <div className="toggle-item">
                                    <span>Focus Line Ruler</span>
                                    <input 
                                        type="checkbox" 
                                        checked={settings.showRuler} 
                                        onChange={(e) => setSettings({...settings, showRuler: e.target.checked})} 
                                    />
                                </div>
                                <div className="toggle-item">
                                    <span>Bionic Fixation (30-50%)</span>
                                    <input 
                                        type="checkbox" 
                                        checked={settings.bionicMode} 
                                        onChange={(e) => setSettings({...settings, bionicMode: e.target.checked})} 
                                    />
                                </div>
                            </div>

                            <div className="control-group">
                                <label className="medical-label">Contrast Mode</label>
                                <select 
                                    value={settings.contrastMode} 
                                    onChange={(e) => setSettings({...settings, contrastMode: e.target.value})}
                                    className="font-select"
                                >
                                    <option value="default">Default Slate / Light</option>
                                    <option value="dark">Dark Mode (Low Strain)</option>
                                    <option value="sepia">Warm Cream / Sepia Tint</option>
                                    <option value="highcontrast">High Contrast (Yellow / Black)</option>
                                </select>
                            </div>

                            <div className="control-group">
                                <label className="medical-label">Typography Controls</label>
                                <div className="range-item">
                                    <span>Size ({settings.fontSize}px)</span>
                                    <input type="range" min="16" max="36" value={settings.fontSize} onChange={(e) => setSettings({...settings, fontSize: e.target.value})} />
                                </div>
                                <div className="range-item">
                                    <span>Letter Spacing</span>
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
                                    <option value="'OpenDyslexic', 'Lexend', sans-serif">OpenDyslexic (Heavy-Bottomed)</option>
                                    <option value="'Lexend', sans-serif">Lexend Clinical</option>
                                    <option value="'Plus Jakarta Sans', sans-serif">Plus Jakarta Sans</option>
                                    <option value="'Comic Sans MS', cursive">Weighted Casual</option>
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
