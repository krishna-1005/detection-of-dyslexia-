import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Navbar from '../dashboard/Navbar';
import Sidebar from '../dashboard/Sidebar';
import ExerciseSystem from './ExerciseSystem';
import { useAuth } from '../auth/AuthContext';

const therapyInfo = {
    phoneme: {
        science: "Phonological awareness is the foundation of reading. Dyslexic individuals often struggle to 'decode' words into individual sounds (phonemes).",
        benefits: ["Improves sound-letter association", "Enhances spelling accuracy", "Builds decoding speed"],
        instructions: "Listen to the target sound and identify which of the displayed words contains that specific sound. Practice daily for best results."
    },
    visual: {
        science: "Visual and attentional dyslexia indicators include letter reversal confusion (e.g., b vs d, p vs q) and visual word or letter migration (e.g., letters appearing to swap or hop between words). Targeted discrimination mini-games strengthen spatial letter orientation and visual attention without requiring reading fluency or sustained motor coordination.",
        benefits: ["Fixes mirror letter reversal confusion (b vs d, p vs q)", "Reduces word & letter migration errors", "Builds visual attention & spatial decoding stability"],
        instructions: "Play Letter Twins Hunt to spot mirror reversal pairs, and Word Jumble Ninja to catch letter and word order migrations!"
    },
    auditory: {
        science: "Auditory processing in dyslexia often involves difficulty distinguishing between fast-changing acoustic transitions (e.g., initial sounds) and minimal-pair phonetic contrasts (e.g., ba vs pa, da vs ta). Combining Sound Shield (initial sound discrimination) with Copy Cat Echo (player-controlled same/different minimal-pair listening) provides dual, independent auditory diagnostic signals.",
        benefits: ["Sharpens minimal-pair auditory discrimination (ba/pa, da/ta)", "Strengthens initial sound decoding", "Boosts rapid auditory processing speed"],
        instructions: "Play Game 1 (Sound Shield) to match initial word sounds, or Game 2 (Copy Cat Echo) to tap two sounds independently and decide if they are the Same or Different!"
    },
    voice: {
        science: "Live oral reading practice with speech recognition helps bridge the gap between visual decoding and spoken fluency, providing immediate feedback on pronunciation accuracy.",
        benefits: ["Real-time pronunciation feedback", "Builds reading confidence", "Multisensory engagement"],
        instructions: "Ensure your microphone is active. Read each displayed sentence aloud — the speech engine will track your words in real time and flag any mispronounced or skipped words."
    },
    video: {
        science: "Live oral reading practice with speech recognition helps bridge the gap between visual decoding and spoken fluency, providing immediate feedback on pronunciation accuracy.",
        benefits: ["Real-time pronunciation feedback", "Builds reading confidence", "Multisensory engagement"],
        instructions: "Ensure your microphone is active. Read each displayed sentence aloud — the speech engine will track your words in real time and flag any mispronounced or skipped words."
    },
    morphology: {
        science: "Morphological awareness involves understanding the internal structure of words (roots, prefixes, suffixes).",
        benefits: ["Expands vocabulary", "Improves reading comprehension", "Aids in decoding complex words"],
        instructions: "Look at the root word and choose the derivative that matches the meaning provided in the instruction."
    },
    naming: {
        science: "Visual attention and processing speed tasks measure how quickly a child can identify and select a target from among distractors, which correlates with reading fluency.",
        benefits: ["Increases visual processing speed", "Improves selective attention", "Boosts target recognition under time pressure"],
        instructions: "Balloons will float across the sky. Tap or speak the name of the target balloon as fast as you can — avoid the decoys!"
    },
    kids: {
        science: "Multi-level gamified therapy uses animated letter physics, speech synthesis, and reward streaks to fix mirror letter reversals (b/d/p/q) and build phonological confidence in children.",
        benefits: ["Eliminates mirror letter confusion (b vs d)", "Boosts child engagement & motivation", "Unlocks multi-level persistent skill mastery"],
        instructions: "Select your level (Level 1-3), listen to Lexi the Owl, and pop target balloons or sound bubbles to complete each level."
    },
    mario: {
        science: "Side-scrolling platformer games combine motor coordination with phonological decision making to build rapid decoding skills under engaging game dynamics.",
        benefits: ["Enhances hand-eye coordination", "Makes phoneme recognition fun & gamified", "Boosts child engagement with interactive question blocks"],
        instructions: "Use Arrow keys or A/D to run, Space/Up to jump. Hit floating '❓' blocks to unlock phoneme & morpheme questions!"
    }
};

const TherapyPage = () => {
    const { type } = useParams();
    const navigate = useNavigate();
    const { currentUser } = useAuth();
    const user = currentUser;
    const info = therapyInfo[type] || {};
    const [gameStarted, setGameStarted] = useState(false);

    const gameTitle = 
        type === 'phoneme' ? '🧩 Phoneme Matching Arcade' :
        type === 'morphology' ? '🧬 Morphology Builder Arcade' :
        type === 'naming' ? '⚡ Visual Attention Speed' :
        type === 'visual' ? '📖 Visual Tracking Practice' :
        type === 'auditory' ? '🎧 Auditory Processing Suite' :
        (type === 'voice' || type === 'video') ? '🎤 Live Voice Practice' :
        '🎈 Kids DysTherapy Arcade';

    const gameIcon = 
        type === 'phoneme' ? '🧩' :
        type === 'morphology' ? '🧬' :
        type === 'naming' ? '⚡' :
        type === 'visual' ? '📖' :
        type === 'auditory' ? '🎧' :
        '🎈';

    return (
        <div className="page-container kids-page-bg" style={{ minHeight: '100vh', background: 'radial-gradient(circle at 10% 20%, rgba(255, 242, 210, 0.5) 0%, rgba(224, 247, 250, 0.5) 50%, rgba(243, 229, 245, 0.5) 100%)' }}>
            <Navbar user={user} />
            <div className="dashboard-layout" style={{ display: 'flex' }}>
                <Sidebar />
                <main className="main-content" style={{ flex: 1, padding: '0.65rem 1.25rem' }}>
                    {!gameStarted ? (
                        /* ── OPENING / WELCOME INSTRUCTIONS CARD VIEW ── */
                        <>
                            <header className="medical-header" style={{ marginBottom: '0.65rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <span className="title-kids-badge" style={{ fontSize: '0.75rem', padding: '2px 10px', marginBottom: '0.2rem', display: 'inline-block' }}>🎈 Kids DysTherapy Arcade</span>
                                    <h1 style={{ fontSize: '1.4rem', fontWeight: 900, color: '#2f3542', margin: 0, fontFamily: 'var(--kids-font-display, "Fredoka", sans-serif)' }}>
                                        {gameTitle}
                                    </h1>
                                </div>
                                <button 
                                    className="kids-logout-btn" 
                                    style={{ 
                                        background: 'linear-gradient(135deg, #ff4757, #ff6b81)', 
                                        border: 'none', 
                                        color: '#fff', 
                                        boxShadow: '0 4px 0 #d63031',
                                        fontSize: '0.85rem',
                                        padding: '0.45rem 1.1rem'
                                    }} 
                                    onClick={() => navigate('/dashboard')}
                                >
                                    🚀 Back to Arcade
                                </button>
                            </header>

                            <div style={{
                                background: '#ffffff',
                                borderRadius: '20px',
                                padding: '1rem 1.5rem',
                                border: '3px solid #74b9ff',
                                boxShadow: '0 10px 30px rgba(0, 0, 0, 0.06)',
                                maxWidth: '800px',
                                margin: '0 auto',
                                textAlign: 'center'
                            }}>
                                <div style={{ fontSize: '2.2rem', marginBottom: '0.1rem' }}>{gameIcon} 🎈</div>
                                <span className="title-kids-badge" style={{ fontSize: '0.75rem', padding: '3px 12px', marginBottom: '0.25rem', display: 'inline-block' }}>
                                    ✨ GET READY TO PLAY ✨
                                </span>
                                <h2 style={{ fontSize: '1.3rem', fontWeight: 900, color: '#2f3542', margin: '0.1rem 0 0.25rem 0', fontFamily: 'var(--kids-font-display, "Fredoka", sans-serif)' }}>
                                    Welcome to {gameTitle}!
                                </h2>
                                <p style={{ color: '#57606f', fontSize: '0.85rem', lineHeight: '1.35', fontWeight: 600, maxWidth: '620px', margin: '0 auto 0.85rem auto' }}>
                                    Train your brain with fun cognitive drills! Read the instructions below and press start when you are ready.
                                </p>

                                {/* 3 Step Guidance Cards */}
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '0.85rem', textAlign: 'left' }}>
                                    <div style={{ background: '#f8fafc', padding: '0.65rem 0.85rem', borderRadius: '14px', border: '1.5px solid #ffeaa7' }}>
                                        <div style={{ fontSize: '1.2rem', marginBottom: '0.15rem' }}>🔬</div>
                                        <strong style={{ display: 'block', fontSize: '0.82rem', color: '#2f3542', marginBottom: '2px' }}>1. The Science</strong>
                                        <small style={{ color: '#64748b', fontSize: '0.73rem', lineHeight: '1.3', display: 'block', fontWeight: 600 }}>
                                            {info.science || "Build cognitive reading stability through targeted drills."}
                                        </small>
                                    </div>

                                    <div style={{ background: '#f8fafc', padding: '0.65rem 0.85rem', borderRadius: '14px', border: '1.5px solid #74b9ff' }}>
                                        <div style={{ fontSize: '1.2rem', marginBottom: '0.15rem' }}>💡</div>
                                        <strong style={{ display: 'block', fontSize: '0.82rem', color: '#2f3542', marginBottom: '2px' }}>2. How To Play</strong>
                                        <small style={{ color: '#64748b', fontSize: '0.73rem', lineHeight: '1.3', display: 'block', fontWeight: 600 }}>
                                            {info.instructions || "Follow the on-screen prompts and answer correctly."}
                                        </small>
                                    </div>

                                    <div style={{ background: '#f8fafc', padding: '0.65rem 0.85rem', borderRadius: '14px', border: '1.5px solid #ff7675' }}>
                                        <div style={{ fontSize: '1.2rem', marginBottom: '0.15rem' }}>🏆</div>
                                        <strong style={{ display: 'block', fontSize: '0.82rem', color: '#2f3542', marginBottom: '2px' }}>3. Key Benefits</strong>
                                        <small style={{ color: '#64748b', fontSize: '0.73rem', lineHeight: '1.3', display: 'block', fontWeight: 600 }}>
                                            {info.benefits ? info.benefits.join(' • ') : 'Boosts processing speed and decoding accuracy.'}
                                        </small>
                                    </div>
                                </div>

                                {/* OK Start Game Button */}
                                <button
                                    onClick={() => setGameStarted(true)}
                                    style={{
                                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                        color: '#ffffff',
                                        border: 'none',
                                        padding: '0.65rem 2.2rem',
                                        fontSize: '1rem',
                                        fontWeight: 900,
                                        borderRadius: '16px',
                                        cursor: 'pointer',
                                        boxShadow: '0 6px 20px rgba(16, 185, 129, 0.35)',
                                        transition: 'transform 0.15s ease',
                                    }}
                                >
                                    OK, Start Game! 🚀
                                </button>
                            </div>
                        </>
                    ) : (
                        /* ── ACTIVE GAME CANVAS VIEW (ZERO-SCROLL VIEWPORT) ── */
                        <div style={{ width: '100%' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                                <span className="title-kids-badge" style={{ fontSize: '0.75rem', padding: '2px 10px' }}>
                                    🎮 Active Game: {gameTitle}
                                </span>
                                <button 
                                    className="kids-logout-btn" 
                                    style={{ 
                                        background: 'linear-gradient(135deg, #ff4757, #ff6b81)', 
                                        border: 'none', 
                                        color: '#fff', 
                                        boxShadow: '0 3px 0 #d63031',
                                        fontSize: '0.8rem',
                                        padding: '0.35rem 1rem'
                                    }} 
                                    onClick={() => navigate('/dashboard')}
                                >
                                    🚀 Back to Arcade
                                </button>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                {/* Interactive Game Session Canvas */}
                                <div style={{ width: '100%' }}>
                                    <ExerciseSystem type={type} onComplete={() => navigate('/dashboard')} />
                                </div>

                                {/* Clinical Information Panel - Rendered in Collapsible Details Box for Zero-Scroll Viewport */}
                                <details style={{ marginTop: '0.5rem', background: '#ffffff', border: '2px solid #74b9ff', borderRadius: '16px', padding: '0.5rem 1rem', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.04)' }}>
                                    <summary style={{ cursor: 'pointer', fontWeight: 800, color: '#2f3542', fontSize: '0.82rem', userSelect: 'none' }}>
                                        🔬 View Clinical Science & Instructions (Click to expand)
                                    </summary>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginTop: '0.75rem' }}>
                                        <section className="medical-card" style={{ background: '#ffffff', borderRadius: '16px', border: '2px solid #ffeaa7', padding: '1rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                                <span className="title-kids-badge" style={{ background: 'linear-gradient(135deg, #70a1ff, #1e90ff)', fontSize: '0.75rem' }}>🔬 The Science</span>
                                            </div>
                                            <p style={{ lineHeight: '1.4', color: '#57606f', fontWeight: 600, fontSize: '0.8rem', margin: 0 }}>
                                                {info.science}
                                            </p>
                                        </section>

                                        <section className="medical-card" style={{ background: '#ffffff', borderRadius: '16px', border: '2px solid #74b9ff', padding: '1rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                                <span className="title-kids-badge" style={{ background: 'linear-gradient(135deg, #2ed573, #26de81)', fontSize: '0.75rem' }}>✅ Key Benefits</span>
                                            </div>
                                            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                                                {info.benefits?.map((b, i) => (
                                                    <li key={i} style={{ marginBottom: '0.3rem', display: 'flex', gap: '6px', fontWeight: 700, color: '#57606f', fontSize: '0.78rem' }}>
                                                        <span style={{ color: '#2ed573', fontWeight: 900 }}>✓</span> {b}
                                                    </li>
                                                ))}
                                            </ul>
                                        </section>

                                        <section className="medical-card" style={{ background: '#ffffff', borderRadius: '16px', border: '2px solid #ff7675', padding: '1rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                                <span className="title-kids-badge" style={{ background: 'linear-gradient(135deg, #ffa801, #ff6b81)', fontSize: '0.75rem' }}>💡 Instructions</span>
                                            </div>
                                            <p style={{ lineHeight: '1.4', color: '#57606f', fontWeight: 700, fontSize: '0.8rem', margin: 0 }}>
                                                {info.instructions}
                                            </p>
                                        </section>
                                    </div>
                                </details>
                            </div>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
};

export default TherapyPage;
