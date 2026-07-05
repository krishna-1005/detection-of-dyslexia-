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
import "./App.css";

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/detect" element={<DetectPage />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/reader" element={<SmartReader />} />
          <Route path="/therapy/:type" element={<TherapyPage />} />
          <Route path="/analysis" element={<UserReport />} />
        </Routes>
        <GuideMe />
      </div>
    </Router>
  );
}

export default App;
