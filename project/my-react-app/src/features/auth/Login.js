import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import "./Login.css";
import { useAuth } from "./AuthContext";

const Login = () => {
  const [role, setRole] = useState("patient");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [loading, setLoading] = useState(false);
  
  const { login, loginWithGoogle, currentUser, loginAsDemoDoctor, loginAsDemoPatient } = useAuth();
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
      // Only auto-switch role if the user has a previously-saved role for
      // this email. Do NOT switch based on email-name heuristics (e.g. "dr.")
      // because that silently overrides the tab the user explicitly selected.
      const savedRole = localStorage.getItem(`cognilex_user_role_${trimmed}`);
      if (savedRole === 'doctor' || savedRole === 'patient') {
        setRole(savedRole);
      }
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccessMsg("");

    try {
      // Always use the currently-selected tab role — this is what the user
      // explicitly chose, so it must take priority over any cached role.
      const selectedRole = role || 'patient';

      await login(email, password, selectedRole);

      // Navigate based on the tab the user selected, not a cached value
      if (selectedRole === 'doctor') {
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

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError("");
    setSuccessMsg("");
    try {
      const selectedRole = role || 'patient';
      await loginWithGoogle(selectedRole);
      if (selectedRole === 'doctor') {
        navigate("/doctor/dashboard");
      } else {
        navigate("/dashboard");
      }
    } catch (err) {
      console.error("Google Sign-In Error:", err);
      if (err.code === 'auth/popup-closed-by-user') {
        // User closed the popup, no error needed
      } else if (err.code === 'auth/cancelled-popup-request') {
        // Duplicate popup request, ignore
      } else {
        setError("Google sign-in failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const patientFeatures = [
    { icon: '🧬', text: 'AI-Powered Dyslexia Screening' },
    { icon: '🎮', text: 'Interactive Therapy Games' },
    { icon: '📊', text: 'Real-Time Progress Tracking' },
    { icon: '🎤', text: 'Oral Reading Analysis' },
  ];

  const doctorFeatures = [
    { icon: '📋', text: 'Patient Caseload Management' },
    { icon: '🧠', text: 'Neurological Assessment Tools' },
    { icon: '📈', text: 'Clinical Reports & Analytics' },
    { icon: '💊', text: 'Therapy Prescriptions' },
  ];

  const features = role === 'doctor' ? doctorFeatures : patientFeatures;

  return (
    <div className={`auth-page auth-page-${role}`}>
      {/* ── LEFT BRANDING PANEL ── */}
      <div className={`auth-brand-panel ${role === 'doctor' ? 'brand-doctor' : 'brand-patient'}`}>
        <div className="brand-orb brand-orb-1" />
        <div className="brand-orb brand-orb-2" />
        <div className="brand-orb brand-orb-3" />
        
        <div className="brand-content">
          <Link to="/" className="brand-logo-link">
            <div className="brand-logo-circle">{role === 'doctor' ? '🩺' : '🌈'}</div>
            <h1 className="brand-title">Cognilex</h1>
          </Link>
          <p className="brand-tagline">
            {role === 'doctor' 
              ? 'Advanced Clinical Suite for Pediatric Dyslexia Diagnostics'
              : 'Smart Dyslexia Detection & Personalized Learning Therapy'}
          </p>

          <div className="brand-features">
            {features.map((f, i) => (
              <div className="brand-feature-item" key={i} style={{ animationDelay: `${i * 0.1}s` }}>
                <span className="brand-feature-icon">{f.icon}</span>
                <span className="brand-feature-text">{f.text}</span>
              </div>
            ))}
          </div>

          <div className="brand-trust-bar">
            <span>🔒 HIPAA Compliant</span>
            <span className="trust-dot">·</span>
            <span>🛡️ AES-256 Encrypted</span>
            <span className="trust-dot">·</span>
            <span>✅ Verified</span>
          </div>
        </div>
      </div>

      {/* ── RIGHT FORM PANEL ── */}
      <div className="auth-form-panel">
        <div className="auth-form-inner">
          <div className="auth-header-top">
            <Link to="/" className="auth-back-link">
              <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
                <path fillRule="evenodd" d="M9.707 14.707a1 1 0 01-1.414 0l-5-5a1 1 0 010-1.414l5-5a1 1 0 011.414 1.414L6.414 8H17a1 1 0 110 2H6.414l3.293 3.293a1 1 0 010 1.414z" clipRule="evenodd" />
              </svg>
              Back to Home
            </Link>
            <div className="auth-brand-badge-mobile">
              <span>{role === 'doctor' ? '🩺' : '🌈'} Cognilex</span>
            </div>
          </div>

          {/* Role Tabs */}
          <div className="auth-role-tabs">
            <button
              type="button"
              className={`auth-role-tab ${role === 'patient' ? 'active' : ''}`}
              onClick={() => setRole('patient')}
            >
              <span className="role-emoji">🧒</span>
              <span className="role-label">Patient / Child</span>
            </button>
            <button
              type="button"
              className={`auth-role-tab ${role === 'doctor' ? 'active' : ''}`}
              onClick={() => setRole('doctor')}
            >
              <span className="role-emoji">🩺</span>
              <span className="role-label">Doctor / Clinician</span>
            </button>
            <div className={`role-tab-indicator ${role === 'doctor' ? 'indicator-right' : ''}`} />
          </div>

          <h2 className="auth-heading">
            {role === 'doctor' ? 'Welcome Back, Doctor' : 'Welcome Back'}
          </h2>
          <p className="auth-subheading">
            {role === 'doctor' 
              ? 'Sign in to access your clinical dashboard and patient records.'
              : 'Sign in to continue your learning journey and therapy sessions.'}
          </p>

          {successMsg && <div className="auth-success-msg">{successMsg}</div>}
          {error && <div className="auth-error">{error}</div>}

          {/* Google Sign-In — top position like modern apps */}
          <button
            type="button"
            className="btn-google-signin"
            onClick={handleGoogleLogin}
            disabled={loading}
          >
            <svg className="google-icon" viewBox="0 0 24 24" width="20" height="20">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            {loading ? 'Connecting...' : 'Continue with Google'}
          </button>

          <div className="auth-divider">
            <span>or sign in with email</span>
          </div>

          {/* Email/Password Form */}
          <form onSubmit={handleLogin} className="auth-form">
            <div className="form-group">
              <label>{role === 'doctor' ? 'Clinical Email' : 'Email Address'}</label>
              <div className="input-wrapper">
                <svg className="input-icon" viewBox="0 0 20 20" fill="currentColor" width="18" height="18">
                  <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z"/>
                  <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z"/>
                </svg>
                <input 
                  type="email" 
                  placeholder={role === 'doctor' ? 'dr.mitchell@clinic.com' : 'learner@example.com'} 
                  value={email}
                  onChange={handleEmailChange}
                  required 
                />
              </div>
            </div>
            <div className="form-group">
              <label>Password</label>
              <div className="input-wrapper">
                <svg className="input-icon" viewBox="0 0 20 20" fill="currentColor" width="18" height="18">
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd"/>
                </svg>
                <input 
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required 
                />
                <button 
                  type="button" 
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            <div className="form-footer">
              <label className="remember-me">
                <input 
                  type="checkbox" 
                  checked={rememberMe} 
                  onChange={(e) => setRememberMe(e.target.checked)} 
                />
                Remember me
              </label>
              <a href="#" className="forgot-password" onClick={(e) => e.preventDefault()}>Forgot Password?</a>
            </div>

            <button type="submit" className={`btn-auth ${role === 'doctor' ? 'btn-doctor' : ''}`} disabled={loading}>
              {loading ? (
                <span className="btn-loading">
                  <span className="spinner" />
                  Signing in...
                </span>
              ) : (
                role === 'doctor' ? '🩺 Sign In to Doctor Dashboard' : '🚀 Sign In to Patient Dashboard'
              )}
            </button>
          </form>

          {/* Demo Quick Login */}
          <div className="auth-demo-section">
            <div className="demo-divider"><span>Try a Demo</span></div>
            <div className="demo-buttons">
              <button
                type="button"
                className="demo-btn demo-doctor"
                onClick={() => { loginAsDemoDoctor(); navigate("/doctor/dashboard"); }}
              >
                <span className="demo-avatar">👩‍⚕️</span>
                <div className="demo-info">
                  <strong>Dr. Sarah Mitchell</strong>
                  <small>Pediatric Neurologist</small>
                </div>
                <span className="demo-arrow">→</span>
              </button>
              <button
                type="button"
                className="demo-btn demo-patient"
                onClick={() => { loginAsDemoPatient(); navigate("/dashboard"); }}
              >
                <span className="demo-avatar">👦</span>
                <div className="demo-info">
                  <strong>Alex Johnson</strong>
                  <small>Student, Grade 3</small>
                </div>
                <span className="demo-arrow">→</span>
              </button>
            </div>
          </div>

          <p className="auth-switch">
            Don't have an account? <Link to="/signup">Create account</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
