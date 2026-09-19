import React from 'react';
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
        science: "Visual tracking issues can cause 'line skipping' or the sensation of letters moving on a page. This is common in many types of dyslexia.",
        benefits: ["Reduces reading fatigue", "Prevents skipping lines", "Improves eye-muscle coordination"],
        instructions: "Follow the highlighted word with your eyes only. Do not move your head. Adjust the speed as you get more comfortable."
    },
    auditory: {
        science: "Auditory processing in dyslexia often involves difficulty distinguishing between fast-changing sounds (like 'B' vs 'P').",
        benefits: ["Sharpens sound discrimination", "Improves listening comprehension", "Strengthens auditory memory"],
        instructions: "Listen carefully to the target sound and choose the word that starts with that sound. Focus on the very first sound you hear."
    },
    video: {
        science: "Live interaction and facial cues help bridge the gap between auditory and visual learning, providing a holistic therapy environment.",
        benefits: ["Real-time feedback", "Social-emotional support", "Multisensory engagement"],
        instructions: "Wait for the clinician to initiate the session. Ensure your camera and microphone are active for the best experience."
    },
    morphology: {
        science: "Morphological awareness involves understanding the internal structure of words (roots, prefixes, suffixes).",
        benefits: ["Expands vocabulary", "Improves reading comprehension", "Aids in decoding complex words"],
        instructions: "Look at the root word and choose the derivative that matches the meaning provided in the instruction."
    },
    naming: {
        science: "Rapid Automated Naming (RAN) measures the speed at which a person can name common objects. It is a key predictor of reading fluency.",
        benefits: ["Increases processing speed", "Improves retrieval of phonological codes", "Boosts overall reading fluency"],
        instructions: "When you start the timer, name each object aloud as fast as possible. Stop the timer when you reach the end."
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

    return (
        <div className="page-container kids-page-bg" style={{ minHeight: '100vh', background: 'radial-gradient(circle at 10% 20%, rgba(255, 242, 210, 0.5) 0%, rgba(224, 247, 250, 0.5) 50%, rgba(243, 229, 245, 0.5) 100%)' }}>
            <Navbar user={user} />
            <div className="dashboard-layout" style={{ display: 'flex' }}>
                <Sidebar />
                <main className="main-content" style={{ flex: 1, padding: '2.5rem' }}>
                    <header className="medical-header" style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <span className="title-kids-badge" style={{ fontSize: '0.85rem', padding: '4px 12px', marginBottom: '0.5rem', display: 'inline-block' }}>🎈 Kids DysTherapy Arcade</span>
                            <h1 style={{ fontSize: '2.2rem', fontWeight: 900, color: '#2f3542', margin: '0.2rem 0 0 0', fontFamily: 'var(--kids-font-display, "Fredoka", sans-serif)' }}>
                                {type === 'phoneme' && '🧩 Phoneme Matching Arcade'}
                                {type === 'morphology' && '🧬 Morphology Builder Arcade'}
                                {type === 'naming' && '⚡ Rapid Naming Safari'}
                                {type === 'visual' && '📖 Visual Tracking Quest'}
                                {type === 'auditory' && '🎧 Auditory Sound Shield'}
                                {type === 'video' && '📹 Live Video Session'}
                                {type === 'kids' && '🎈 Kids DysTherapy Arcade'}
                            </h1>
                        </div>
                        <button 
                            className="kids-logout-btn" 
                            style={{ 
                                background: 'linear-gradient(135deg, #ff4757, #ff6b81)', 
                                border: 'none', 
                                color: '#fff', 
                                boxShadow: '0 5px 0 #d63031',
                                fontSize: '0.95rem',
                                padding: '0.65rem 1.4rem'
                            }} 
                            onClick={() => navigate('/dashboard')}
                        >
                            🚀 Back to Arcade
                        </button>
                    </header>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
                        {/* Interactive Exercise */}
                        <div style={{ width: '100%' }}>
                            <ExerciseSystem type={type} onComplete={() => navigate('/dashboard')} />
                        </div>

                        {/* Clinical Information Panel - Playful Kid Style */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.75rem' }}>
                            <section className="medical-card" style={{ background: '#ffffff', borderRadius: '24px', border: '3px solid #ffeaa7', padding: '1.5rem', boxShadow: '0 8px 20px rgba(0, 0, 0, 0.05)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                                    <span className="title-kids-badge" style={{ background: 'linear-gradient(135deg, #70a1ff, #1e90ff)', fontSize: '0.85rem' }}>🔬 The Science</span>
                                </div>
                                <p style={{ lineHeight: '1.6', color: '#57606f', fontWeight: 600, fontSize: '0.92rem' }}>
                                    {info.science}
                                </p>
                            </section>

                            <section className="medical-card" style={{ background: '#ffffff', borderRadius: '24px', border: '3px solid #74b9ff', padding: '1.5rem', boxShadow: '0 8px 20px rgba(0, 0, 0, 0.05)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                                    <span className="title-kids-badge" style={{ background: 'linear-gradient(135deg, #2ed573, #26de81)', fontSize: '0.85rem' }}>✅ Key Benefits</span>
                                </div>
                                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                                    {info.benefits?.map((b, i) => (
                                        <li key={i} style={{ marginBottom: '0.6rem', display: 'flex', gap: '8px', fontWeight: 700, color: '#57606f', fontSize: '0.9rem' }}>
                                            <span style={{ color: '#2ed573', fontWeight: 900 }}>✓</span> {b}
                                        </li>
                                    ))}
                                </ul>
                            </section>

                            <section className="medical-card" style={{ background: '#ffffff', borderRadius: '24px', border: '3px solid #ff7675', padding: '1.5rem', boxShadow: '0 8px 20px rgba(0, 0, 0, 0.05)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                                    <span className="title-kids-badge" style={{ background: 'linear-gradient(135deg, #ffa801, #ff6b81)', fontSize: '0.85rem' }}>💡 Instructions</span>
                                </div>
                                <p style={{ lineHeight: '1.6', color: '#57606f', fontWeight: 700, fontSize: '0.92rem' }}>
                                    {info.instructions}
                                </p>
                            </section>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
};

export default TherapyPage;
