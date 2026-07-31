import React, { useState } from 'react';
import './SymptomsQuiz.css';

const masterQuestionsPool = [
    { id: 1, text: "Has difficulty reading unfamiliar words and often guesses at them." },
    { id: 2, text: "Pauses, repeats or makes frequent mistakes when reading aloud." },
    { id: 3, text: "Mispronounces (or used to) only certain words (e.g., says 'amunul' for animal)." },
    { id: 4, text: "Struggles to remember the names of letters or their associated sounds." },
    { id: 5, text: "Mixes up letters that look similar (e.g., b/d, p/q, n/u)." },
    { id: 6, text: "Finds it difficult to learn nursery rhymes or play rhyming games." },
    { id: 7, text: "Takes a long time to finish reading or writing tasks compared to peers." },
    { id: 8, text: "Avoids reading activities or expresses frustration when asked to read." },
    { id: 9, text: "Has trouble following multi-step directions given verbally." },
    { id: 10, text: "Displays excellent verbal ability but struggles to translate ideas to paper." },
    { id: 11, text: "Reverses numbers or letters when writing (e.g., writing 15 as 51)." },
    { id: 12, text: "Struggles to organize written thoughts in a logical sequence." },
    { id: 13, text: "Has difficulty remembering sequences like days of the week or months." },
    { id: 14, text: "Finds spelling inconsistent, spelling the same word differently in one text." },
    { id: 15, text: "Complains that letters look blurred or move around on the page." },
    { id: 16, text: "Has trouble distinguishing left from right quickly." },
    { id: 17, text: "Struggles to tell time on an analog clock." },
    { id: 18, text: "Shows high intelligence and curiosity but unexpectedly low reading score." },
    { id: 19, text: "Has difficulty summarizing a story after reading it independently." },
    { id: 20, text: "Tires quickly or gets headache/eye strain while reading continuous text." }
];

const getRandomQuestions = (count = 10) => {
    const shuffled = [...masterQuestionsPool].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
};

const SymptomsQuiz = () => {
    const [questions, setQuestions] = useState(() => getRandomQuestions(10));
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

        const scorePercent = Math.round((score / questions.length) * 100);
        const riskLevel = category.includes("High") ? "High" : category.includes("Moderate") ? "Moderate" : "Low";
        const now = new Date();
        const dateStr = now.toLocaleDateString() + " " + now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        const newEntry = {
          id: Date.now(),
          date: dateStr,
          isoDate: now.toISOString(),
          type: "Symptoms Screening Quiz",
          score: scorePercent,
          riskLevel: riskLevel,
          status: "Completed",
          details: {
            score,
            total: questions.length,
            category,
            recommendations
          }
        };

        const globalHist = JSON.parse(localStorage.getItem("lexiflow_history") || "[]");
        localStorage.setItem("lexiflow_history", JSON.stringify([newEntry, ...globalHist]));

        setResult({ score, category, recommendations });
    };

    const resetQuiz = () => {
        setQuestions(getRandomQuestions(10));
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
