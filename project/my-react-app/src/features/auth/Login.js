import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import "./Login.css";
import { useAuth } from "./AuthContext";

const Login = () => {
  const [role, setRole] = useState("patient");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [loading, setLoading] = useState(false);
  
  const { login, currentUser, loginAsDemoDoctor, loginAsDemoPatient } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (location.state?.message) {
      setSuccessMsg(location.state.message);
    }
  }, [location]);

  useEffect(() => {
    if (currentUser) {
      if (currentUser.role === 'doctor') {
        navigate("/doctor/dashboard", { replace: true });
      } else {
        navigate("/dashboard", { replace: true });
      }
    }
  }, [currentUser, navigate]);

  const handleEmailChange = (e) => {
    const val = e.target.value;
    setEmail(val);
    const trimmed = val.toLowerCase().trim();
    if (trimmed) {
      const savedRole = localStorage.getItem(`cognilex_user_role_${trimmed}`);
      if (savedRole === 'doctor' || savedRole === 'patient') {
        setRole(savedRole);
      } else if (trimmed.includes('doctor') || trimmed.startsWith('dr.') || trimmed.includes('clinician') || trimmed === 'dr.mitchell@cognilex.ai') {
        setRole('doctor');
      }
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccessMsg("");

    try {
      const emailKey = email.toLowerCase().trim();
      const rememberedRole = localStorage.getItem(`cognilex_user_role_${emailKey}`);
      const effectiveRole = rememberedRole || role || 'patient';

      const userCred = await login(email, password, effectiveRole);
      const uidRole = localStorage.getItem(`cognilex_user_role_${userCred.user.uid}`);
      const finalRole = uidRole || effectiveRole;

      if (finalRole === 'doctor') {
        navigate("/doctor/dashboard");
      } else {
        navigate("/dashboard");
      }
    } catch (err) {
      console.error("Firebase Login Error:", err);
      let message = "Login failed. Please check your credentials.";
      if (err.code === "auth/invalid-credential" || err.code === "auth/user-not-found" || err.code === "auth/wrong-password") {
        message = "Incorrect email or password. Please try again.";
      } else if (err.code === "auth/too-many-requests") {
        message = "Access blocked due to many failed attempts. Please try again later.";
      } else if (err.code === "auth/invalid-email") {
        message = "Please enter a valid email address.";
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <Link to="/" className="auth-brand-badge">
          <div className="nav-logo-icon">L</div>
          <h2>Cognilex {role === 'doctor' ? 'Clinical Suite 🩺' : 'Kids 🎈'}</h2>
        </Link>
        <h3>{role === 'doctor' ? 'Clinician & Doctor Sign In' : 'Patient & Learner Sign In'}</h3>
        <p>
          {role === 'doctor' 
            ? 'Access your pediatric dyslexia caseload, patient files & oral reports.' 
            : 'Access your diagnostic sessions and personalized therapy progress.'}
        </p>

        {/* ── ROLE SELECTION TABS (PATIENT VS DOCTOR) ── */}
        <div className="auth-role-tabs">
          <button
            type="button"
            className={`auth-role-tab ${role === 'patient' ? 'active-patient' : ''}`}
            onClick={() => setRole('patient')}
          >
            <span className="role-emoji">🧒</span>
            <div className="role-tab-text">
              <strong>Patient / Child</strong>
              <small>Tests & Games</small>
            </div>
          </button>
          <button
            type="button"
            className={`auth-role-tab ${role === 'doctor' ? 'active-doctor' : ''}`}
            onClick={() => setRole('doctor')}
          >
            <span className="role-emoji">🩺</span>
            <div className="role-tab-text">
              <strong>Doctor / Clinician</strong>
              <small>Patient Files & Reports</small>
            </div>
          </button>
        </div>

        {successMsg && <div className="badge badge-low" style={{ display: 'block', padding: '0.75rem', marginBottom: '1.25rem', fontSize: '0.85rem' }}>{successMsg}</div>}
        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleLogin} className="auth-form">
          <div className="form-group">
            <label>{role === 'doctor' ? 'Clinical Email Address' : 'Email Address'}</label>
            <input 
              type="email" 
              placeholder={role === 'doctor' ? 'dr.mitchell@clinic.com' : 'learner@example.com'} 
              value={email}
              onChange={handleEmailChange}
              required 
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input 
              type="password" 
              placeholder="••••••••" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required 
            />
          </div>
          <div className="form-footer">
            <label className="remember-me">
              <input 
                type="checkbox" 
                checked={rememberMe} 
                onChange={(e) => setRememberMe(e.target.checked)} 
              /> Remember me
            </label>
            <a href="#" className="forgot-password" onClick={(e) => e.preventDefault()}>Forgot Password?</a>
          </div>
          <button type="submit" className={`btn-auth ${role === 'doctor' ? 'btn-doctor' : ''}`} disabled={loading}>
            {loading ? "Signing in..." : role === 'doctor' ? "🩺 Sign In to Doctor Dashboard" : "🚀 Sign In to Patient Dashboard"}
          </button>
        </form>

        {/* ── QUICK 1-CLICK DEMO LOGIN BUTTONS ── */}
        <div className="auth-quick-demos">
          <div className="quick-demo-divider">
            <span>OR INSTANT DEMO LOGIN</span>
          </div>
          <div className="quick-demo-buttons">
            <button
              type="button"
              className="quick-demo-btn doctor"
              onClick={() => {
                loginAsDemoDoctor();
                navigate("/doctor/dashboard");
              }}
            >
              🩺 Quick Login as Doctor (Dr. Sarah Mitchell)
            </button>
            <button
              type="button"
              className="quick-demo-btn patient"
              onClick={() => {
                loginAsDemoPatient();
                navigate("/dashboard");
              }}
            >
              🧒 Quick Login as Patient (Alex Johnson)
            </button>
          </div>
        </div>

        <p className="auth-switch">
          Don't have an account? <Link to="/signup">Create account</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
