import React, { useState, useRef, useEffect } from 'react';
import './VideoPractice.css';

const VideoPractice = ({ onComplete }) => {
  const [stream, setStream] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [sessionTime, setSessionTime] = useState(0);
  const [currentTextIndex, setCurrentTextIndex] = useState(0);
  const [transcript, setTranscript] = useState('');
  const [feedback, setFeedback] = useState({ text: 'Waiting to start...', type: 'neutral' });
  const videoRef = useRef(null);
  const recognitionRef = useRef(null);

  const practiceSentences = [
    "The sun is bright and warm today.",
    "I like to read books about space.",
    "Learning new things makes me happy.",
    "Practice helps me get better every day."
  ];

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event) => {
        let currentTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript;
        }
        setTranscript(currentTranscript);
        checkAccuracy(currentTranscript, practiceSentences[currentTextIndex]);
      };

      recognition.onend = () => {
        if (isRecording) recognition.start();
      };

      recognitionRef.current = recognition;
    } else {
      console.warn("Speech Recognition not supported in this browser.");
    }
  }, [currentTextIndex, isRecording]);

  const checkAccuracy = (heard, target) => {
    const heardClean = heard.toLowerCase().replace(/[^\w\s]/g, '');
    const targetClean = target.toLowerCase().replace(/[^\w\s]/g, '');
    
    if (heardClean.includes(targetClean)) {
      setFeedback({ text: 'Perfect! You read it correctly.', type: 'success' });
    } else if (heardClean.length > 5) {
      setFeedback({ text: 'I hear you... keep reading.', type: 'progress' });
    }
  };

  useEffect(() => {
    if (isRecording && recognitionRef.current) {
      try {
        recognitionRef.current.start();
        setFeedback({ text: 'Listening...', type: 'progress' });
      } catch (e) {}
    } else if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  }, [isRecording]);

  useEffect(() => {
    let timer;
    if (isRecording) {
      timer = setInterval(() => {
        setSessionTime(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isRecording]);

  useEffect(() => {
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setStream(mediaStream);
    } catch (err) {
      alert("Please allow camera access for live practice.");
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsRecording(false);
    if (recognitionRef.current) recognitionRef.current.stop();

    const history = JSON.parse(localStorage.getItem('lexiflow_exercise_history') || '{}');
    const prevStats = history['video'] || { pb: '--', sessions: 0, accuracy: '100%', level: 'Completed' };
    history['video'] = {
      pb: '100%',
      sessions: (prevStats.sessions || 0) + 1,
      accuracy: '100%',
      level: 'Completed'
    };
    localStorage.setItem('lexiflow_exercise_history', JSON.stringify(history));

    onComplete();
  };

  const formatTime = (s) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleNext = () => {
    if (currentTextIndex < practiceSentences.length - 1) {
      setCurrentTextIndex(currentTextIndex + 1);
      setTranscript('');
      setFeedback({ text: 'Next sentence ready...', type: 'neutral' });
    } else {
      setIsRecording(false);
      alert("Session Complete! Great work on your practice.");
      stopCamera();
    }
  };

  return (
    <div className="exercise-session live-practice">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h3>Live Practice Session</h3>
        {isRecording && <div className="recording-indicator">● REC {formatTime(sessionTime)}</div>}
      </div>
      
      <p className="exercise-desc">
        Position yourself clearly in the frame. Read the sentences aloud to practice your eye-tracking and pronunciation.
      </p>

      <div className="live-practice-grid">
        {/* Webcam Feed */}
        <div className="webcam-container">
          {!stream ? (
            <div className="camera-setup">
              <span style={{ fontSize: '3rem' }}>📷</span>
              <button className="btn-run" onClick={startCamera}>Activate Camera</button>
            </div>
          ) : (
            <>
              <video ref={videoRef} autoPlay muted playsInline className="webcam-feed" />
              <div className="live-transcript-overlay">
                <div className={`feedback-badge ${feedback.type}`}>
                  {feedback.text}
                </div>
                {transcript && <p className="live-text">"{transcript}"</p>}
              </div>
            </>
          )}
        </div>

        {/* Practice Material */}
        <div className="practice-material">
          <div className="sentence-card">
            <small style={{ color: 'var(--text-sub)', fontWeight: 700 }}>SENTENCE {currentTextIndex + 1}/{practiceSentences.length}</small>
            <p className="big-sentence">{practiceSentences[currentTextIndex]}</p>
          </div>
          
          <div className="practice-nav">
            <button 
              disabled={currentTextIndex === 0} 
              onClick={() => {
                setCurrentTextIndex(currentTextIndex - 1);
                setTranscript('');
              }}
            >
              Previous
            </button>
            <button 
              className="btn-primary"
              onClick={handleNext}
            >
              {currentTextIndex === practiceSentences.length - 1 ? "Finish Session" : "Next Sentence"}
            </button>
          </div>
        </div>
      </div>

      <div className="live-controls">
        {stream && (
          <button 
            className={`record-toggle ${isRecording ? 'active' : ''}`}
            onClick={() => setIsRecording(!isRecording)}
          >
            {isRecording ? "⏹ Stop Recording" : "⏺ Start Recording"}
          </button>
        )}
        <button className="btn-text" onClick={stopCamera}>Cancel Session</button>
      </div>
    </div>
  );
};

export default VideoPractice;
