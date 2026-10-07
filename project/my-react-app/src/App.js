import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Home from "./features/home/Home";
import DetectPage from "./features/detection/Detectpage.js";
import Dashboard from "./features/dashboard/Dashboard";
import SmartReader from "./features/reader/SmartReader";
import TherapyPage from "./features/therapy/TherapyPage";
import UserReport from "./features/analytics/UserReport";
import Login from "./features/auth/Login";
import Signup from "./features/auth/Signup";
import QuizPage from "./features/quiz/QuizPage";
import SaccadicPage from "./features/home/SaccadicPage";
import GuideMe from "./features/guideme/GuideMe";
import ChatWidget from "./features/chat/ChatWidget";
import UnifiedBatteryRunner from "./features/assessment/UnifiedBatteryRunner";
import { AuthProvider } from "./features/auth/AuthContext";
import ProtectedRoute from "./features/auth/ProtectedRoute";
import "./App.css";

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/quiz" element={<QuizPage />} />
            <Route path="/simulator" element={<SaccadicPage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            
            {/* Protected Routes requiring Authentication */}
            <Route path="/detect" element={<ProtectedRoute><DetectPage /></ProtectedRoute>} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/learn" element={<Navigate to="/dashboard" replace />} />
            <Route path="/reader" element={<ProtectedRoute><SmartReader /></ProtectedRoute>} />
            <Route path="/therapy/:type" element={<ProtectedRoute><TherapyPage /></ProtectedRoute>} />
            <Route path="/assessment/universal" element={<ProtectedRoute><UnifiedBatteryRunner /></ProtectedRoute>} />
            <Route path="/analysis" element={<ProtectedRoute><UserReport /></ProtectedRoute>} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
          <GuideMe />
          <ChatWidget />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
