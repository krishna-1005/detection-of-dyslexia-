import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "./component/Home";
import DetectPage from "./component/Detectpage.js";
import Dashboard from "./component/Dashboard";
import SmartReader from "./component/SmartReader";
import TherapyPage from "./component/TherapyPage";
import UserReport from "./component/UserReport";
import Login from "./component/Login";
import Signup from "./component/Signup";
import GuideMe from "./component/GuideMe";
import { AuthProvider } from "./component/AuthContext";
import ProtectedRoute from "./component/ProtectedRoute";
import "./App.css";

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            
            {/* Protected Routes requiring Authentication */}
            <Route path="/detect" element={<ProtectedRoute><DetectPage /></ProtectedRoute>} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/reader" element={<ProtectedRoute><SmartReader /></ProtectedRoute>} />
            <Route path="/therapy/:type" element={<ProtectedRoute><TherapyPage /></ProtectedRoute>} />
            <Route path="/analysis" element={<ProtectedRoute><UserReport /></ProtectedRoute>} />
          </Routes>
          <GuideMe />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
