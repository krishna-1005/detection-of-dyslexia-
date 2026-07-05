import React, { useState } from 'react';
import './SymptomsQuiz.css';

const questions = [
    { id: 1, text: "Has difficulty reading unfamiliar words and often guesses at them." },
    { id: 2, text: "Pauses, repeats or makes frequent mistakes when reading aloud." },
    { id: 3, text: "Mispronounces (or used to) only certain words (e.g., says 'amunul' for animal)." },
    { id: 4, text: "Struggles to remember the names of letters or their associated sounds." },
    { id: 5, text: "Mixes up letters that look similar (e.g., b/d, p/q, n/u)." },
    { id: 6, text: "Finds it difficult to learn nursery rhymes or play rhyming games." },
    { id: 7, text: "Takes a long time to finish reading or writing tasks compared to peers." },
    { id: 8, text: "Avoids reading activities or expresses frustration when asked to read." },
    { id: 9, text: "Has trouble following multi-step directions given verbally." },
    { id: 10, text: "Displays excellent verbal ability but struggles to translate ideas to paper." }
];

const SymptomsQuiz = () => {
    const [answers, setAnswers] = useState({});
    const [result, setResult] = useState(null);

    const handleAnswer = (id, val) => {
        setAnswers(prev => ({
            ...prev,
            [id]: val
        }));
    };

    const calculateResult = () => {
        const answeredCount = Object.keys(answers).length;
        if (answeredCount < questions.length) {
            alert(`Please answer all questions before finishing. (${answeredCount}/${questions.length})`);
            return;
        }

        const score = Object.values(answers).filter(a => a === "yes").length;
        let category = "";
        let recommendations = [];

        if (score <= 3) {
            category = "Low Indicators";
            recommendations = [
                "Your symptoms suggest a low probability of dyslexia.",
                "Continue monitoring reading habits.",
                "Explore our 'Smart Reader' tool for general reading comfort."
            ];
        } else if (score <= 6) {
            category = "Moderate Indicators";
            recommendations = [
                "You show some common indicators associated with dyslexia.",
                "Try our 'Visual Tracking' therapy sessions to improve eye-focus.",
                "Use 'Bionic Reading' mode for smoother text flow.",
                "Consider a formal diagnostic session using our 'Diagnostic Engine'."
            ];
        } else {
            category = "High Indicators";
            recommendations = [
                "You show several significant indicators of dyslexia.",
                "We recommend using the 'AI Simplifier' to reduce reading fatigue.",
                "Start daily 'Phoneme Matching' exercises to strengthen sound-letter links.",
                "Book a professional assessment and use our 'User Analysis' reports."
            ];
        }

        setResult({ score, category, recommendations });
    };

    const resetQuiz = () => {
        setAnswers({});
        setResult(null);
    };

    if (result) {
        return (
            <div className="quiz-result-card medical-card">
                <div className="result-header">
                    <span className="medical-label">Assessment Result</span>
                    <h2>{result.category}</h2>
                    <div className="score-badge">{result.score} / 10</div>
                </div>
                <div className="result-body">
                    <p>Based on your responses, here are your personalized recommendations:</p>
                    <ul className="recommendation-list">
                        {result.recommendations.map((rec, i) => (
                            <li key={i}>{rec}</li>
                        ))}
                    </ul>
                    <div className="result-actions">
                        <button className="medical-btn-primary" onClick={() => window.location.href='/signup'}>Create Free Account</button>
                        <button className="medical-btn-secondary" onClick={resetQuiz}>Retake Quiz</button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="quiz-list-container">
            <div className="quiz-header-bar">
                <h2>Dyslexia Symptoms Quiz</h2>
                <span className="page-counter">Page 1 of 1</span>
            </div>
            
            <div className="quiz-body-content">
                <p className="instruction-text">Select any statements that describe your child.</p>
                
                <div className="questions-stack">
                    {questions.map((q) => (
                        <div key={q.id} className="quiz-row">
                            <p className="row-text">{q.text}</p>
                            <div className="row-options">
                                <button 
                                    className={`row-btn ${answers[q.id] === 'yes' ? 'selected-yes' : ''}`}
                                    onClick={() => handleAnswer(q.id, 'yes')}
                                >
                                    Yes
                                </button>
                                <button 
                                    className={`row-btn ${answers[q.id] === 'no' ? 'selected-no' : ''}`}
                                    onClick={() => handleAnswer(q.id, 'no')}
                                >
                                    No
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="quiz-footer">
                    <button className="medical-btn-primary finish-btn" onClick={calculateResult}>
                        Finish Assessment
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SymptomsQuiz;
