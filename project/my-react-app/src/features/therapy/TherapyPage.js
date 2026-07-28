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
    }
};

const TherapyPage = () => {
    const { type } = useParams();
    const navigate = useNavigate();
    const { currentUser } = useAuth();
    const user = currentUser;
    const info = therapyInfo[type] || {};

    return (
        <div className="page-container">
            <Navbar user={user} />
            <div className="dashboard-layout" style={{ display: 'flex' }}>
                <Sidebar />
                <main className="main-content" style={{ flex: 1, padding: '2.5rem' }}>
                    <header className="medical-header" style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <span className="badge badge-info" style={{ marginBottom: '0.4rem' }}>🧬 Digital Intervention Suite</span>
                            <h1 style={{ fontSize: '1.9rem', fontWeight: 800 }}>
                                {type === 'phoneme' && '🧩 Phoneme Matching'}
                                {type === 'morphology' && '🧬 Morphology Builder'}
                                {type === 'naming' && '⚡ Rapid Naming (RAN)'}
                                {type === 'visual' && '📖 Visual Tracking'}
                                {type === 'auditory' && '🎧 Auditory Processing'}
                                {type === 'video' && '📹 Live Video Session'}
                            </h1>
                        </div>
                        <button className="btn-secondary" onClick={() => navigate('/dashboard')}>
                            ← Back to Dashboard
                        </button>
                    </header>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                        {/* Interactive Exercise */}
                        <div style={{ width: '100%' }}>
                            <ExerciseSystem type={type} onComplete={() => navigate('/dashboard')} />
                        </div>

                        {/* Clinical Information Panel */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }}>
                            <section className="medical-card">
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                                    <span className="badge badge-info" style={{ fontSize: '0.85rem' }}>🔬 The Science</span>
                                </div>
                                <p style={{ lineHeight: '1.6', color: 'var(--lf-text-secondary)', fontWeight: 500, fontSize: '0.9rem' }}>
                                    {info.science}
                                </p>
                            </section>

                            <section className="medical-card">
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                                    <span className="badge badge-low" style={{ fontSize: '0.85rem' }}>✅ Key Benefits</span>
                                </div>
                                <ul style={{ listStyle: 'none', padding: 0 }}>
                                    {info.benefits?.map((b, i) => (
                                        <li key={i} style={{ marginBottom: '0.6rem', display: 'flex', gap: '8px', fontWeight: 600, color: 'var(--lf-text-secondary)', fontSize: '0.88rem' }}>
                                            <span style={{ color: 'var(--lf-teal)' }}>✓</span> {b}
                                        </li>
                                    ))}
                                </ul>
                            </section>

                            <section className="medical-card" style={{ borderLeft: '4px solid var(--lf-amber)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                                    <span className="badge badge-mod" style={{ fontSize: '0.85rem' }}>💡 Instructions</span>
                                </div>
                                <p style={{ lineHeight: '1.6', color: 'var(--lf-text-secondary)', fontWeight: 600, fontSize: '0.9rem' }}>
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
