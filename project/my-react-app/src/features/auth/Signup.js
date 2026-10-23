import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./Login.css";
import { useAuth } from "./AuthContext";

const Signup = () => {
  const [role, setRole] = useState("patient");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    specialization: "Pediatric Neurology & Reading Specialist",
    hospital: "Cognilex Pediatric Neurodevelopmental Clinic",
    licenseId: ""
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { signup, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  const handleSignup = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      return setError("Passwords do not match.");
    }
    if (formData.password.length < 6) {
      return setError("Password must be at least 6 characters.");
    }
    
    setLoading(true);
    setError("");

    try {
      const doctorInfo = role === 'doctor' ? {
        title: formData.specialization,
        hospital: formData.hospital,
        licenseId: formData.licenseId || 'LIC-' + Math.floor(10000 + Math.random() * 90000)
      } : null;

      await signup(formData.email, formData.password, formData.name, role, doctorInfo);
      navigate("/login", { 
        state: { message: `Account created successfully as ${role === 'doctor' ? 'Doctor / Clinician' : 'Patient'}! Please sign in with your credentials.` } 
      });
    } catch (err) {
      console.error("Firebase Signup Error:", err);
      let message = "Signup failed. Please check your inputs and try again.";
      if (err.code === "auth/email-already-in-use") {
        message = "An account with this email address already exists.";
      } else if (err.code === "auth/weak-password") {
        message = "Password must be at least 6 characters long.";
      } else if (err.code === "auth/invalid-email") {
        message = "Please enter a valid email address.";
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    setLoading(true);
    setError("");
    try {
      const selectedRole = role || 'patient';
      await loginWithGoogle(selectedRole);
      if (selectedRole === 'doctor') {
        navigate("/doctor/dashboard");
      } else {
        navigate("/dashboard");
      }
    } catch (err) {
      console.error("Google Sign-Up Error:", err);
      if (err.code !== 'auth/popup-closed-by-user' && err.code !== 'auth/cancelled-popup-request') {
        setError("Google sign-up failed. Please try again.");
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
              ? 'Join our clinical diagnostic network for pediatric neurodevelopment'
              : 'Start your personalized dyslexia screening and fun therapy journey'}
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
            {role === 'doctor' ? 'Create Doctor Profile' : 'Create Patient Account'}
          </h2>
          <p className="auth-subheading">
            {role === 'doctor' 
              ? 'Register as a licensed clinician to evaluate patients and prescribe therapy.'
              : 'Sign up to start screening, gamified therapy, and speech tracking.'}
          </p>

          {error && <div className="auth-error">{error}</div>}

          {/* Google Sign-Up */}
          <button
            type="button"
            className="btn-google-signin"
            onClick={handleGoogleSignup}
            disabled={loading}
          >
            <svg className="google-icon" viewBox="0 0 24 24" width="20" height="20">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            {loading ? 'Connecting...' : 'Sign up with Google'}
          </button>

          <div className="auth-divider">
            <span>or register with email</span>
          </div>

          <form onSubmit={handleSignup} className="auth-form">
            <div className="form-group">
              <label>{role === 'doctor' ? 'Doctor Full Name & Title' : 'Full Name'}</label>
              <div className="input-wrapper">
                <svg className="input-icon" viewBox="0 0 20 20" fill="currentColor" width="18" height="18">
                  <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd"/>
                </svg>
                <input 
                  type="text" 
                  placeholder={role === 'doctor' ? 'Dr. Sarah Mitchell, MD' : 'Alex Johnson'} 
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  required 
                />
              </div>
            </div>

            {role === 'doctor' && (
              <>
                <div className="form-group">
                  <label>Clinical Specialization</label>
                  <div className="input-wrapper">
                    <svg className="input-icon" viewBox="0 0 20 20" fill="currentColor" width="18" height="18">
                      <path fillRule="evenodd" d="M6 6V5a3 3 0 013-3h2a3 3 0 013 3v1h2a2 2 0 012 2v3.57A22.952 22.952 0 0110 13a22.95 22.95 0 01-8-1.43V8a2 2 0 012-2h2zm2-1a1 1 0 011-1h2a1 1 0 011 1v1H8V5zm1 5a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1z" clipRule="evenodd" />
                    </svg>
                    <input 
                      type="text" 
                      placeholder="e.g. Pediatric Neurologist & SLP" 
                      value={formData.specialization}
                      onChange={(e) => setFormData({...formData, specialization: e.target.value})}
                      required 
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Hospital / Clinic</label>
                    <div className="input-wrapper">
                      <svg className="input-icon" viewBox="0 0 20 20" fill="currentColor" width="18" height="18">
                        <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 110 2h-3a1 1 0 01-1-1v-2a1 1 0 00-1-1H9a1 1 0 00-1 1v2a1 1 0 01-1 1H4a1 1 0 110-2V4zm3 1h2v2H7V5zm2 4H7v2h2V9zm2-4h2v2h-2V5zm2 4h-2v2h2V9z" clipRule="evenodd" />
                      </svg>
                      <input 
                        type="text" 
                        placeholder="Children's Hospital" 
                        value={formData.hospital}
                        onChange={(e) => setFormData({...formData, hospital: e.target.value})}
                        required 
                      />
                    </div>
                  </div>
                  <div className="form-group">
                    <label>License ID</label>
                    <div className="input-wrapper">
                      <svg className="input-icon" viewBox="0 0 20 20" fill="currentColor" width="18" height="18">
                        <path fillRule="evenodd" d="M10 2a1 1 0 00-1 1v1a1 1 0 002 0V3a1 1 0 00-1-1zM4 4h3a3 3 0 016 0h3a2 2 0 012 2v9a2 2 0 01-2 2H4a2 2 0 01-2-2V6a2 2 0 012-2zm2.5 7a1.5 1.5 0 100-3 1.5 1.5 0 000 3zm2.45 4a2.5 2.5 0 00-4.9 0h4.9zM12 9a1 1 0 100 2h3a1 1 0 100-2h-3zm1 4a1 1 0 011-1h2a1 1 0 110 2h-2a1 1 0 01-1-1z" clipRule="evenodd" />
                      </svg>
                      <input 
                        type="text" 
                        placeholder="LIC-NY-84920" 
                        value={formData.licenseId}
                        onChange={(e) => setFormData({...formData, licenseId: e.target.value})}
                      />
                    </div>
                  </div>
                </div>
              </>
            )}

            <div className="form-group">
              <label>{role === 'doctor' ? 'Professional Clinical Email' : 'Email Address'}</label>
              <div className="input-wrapper">
                <svg className="input-icon" viewBox="0 0 20 20" fill="currentColor" width="18" height="18">
                  <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z"/>
                  <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z"/>
                </svg>
                <input 
                  type="email" 
                  placeholder={role === 'doctor' ? 'dr.name@clinic.com' : 'learner@example.com'} 
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  required 
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Password</label>
                <div className="input-wrapper">
                  <svg className="input-icon" viewBox="0 0 20 20" fill="currentColor" width="18" height="18">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd"/>
                  </svg>
                  <input 
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••" 
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
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

              <div className="form-group">
                <label>Confirm Password</label>
                <div className="input-wrapper">
                  <svg className="input-icon" viewBox="0 0 20 20" fill="currentColor" width="18" height="18">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd"/>
                  </svg>
                  <input 
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="••••••••" 
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                    required 
                  />
                  <button 
                    type="button" 
                    className="password-toggle"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>
            </div>

            <button type="submit" className={`btn-auth ${role === 'doctor' ? 'btn-doctor' : ''}`} disabled={loading} style={{ marginTop: '0.4rem' }}>
              {loading ? (
                <span className="btn-loading">
                  <span className="spinner" />
                  Creating account...
                </span>
              ) : (
                role === 'doctor' ? '🩺 Register Doctor Profile' : '🚀 Create Patient Account'
              )}
            </button>
          </form>

          <p className="auth-switch">
            Already have an account? <Link to="/login">Sign in here</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Signup;
