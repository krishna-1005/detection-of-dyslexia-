import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./Login.css";
import { useAuth } from "./AuthContext";

const Signup = () => {
  const [role, setRole] = useState("patient");
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
  const { signup } = useAuth();
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

  return (
    <div className="auth-container">
      <div className="auth-card">
        <Link to="/" className="auth-brand-badge">
          <div className="nav-logo-icon">L</div>
          <h2>Cognilex {role === 'doctor' ? 'Clinical Suite 🩺' : 'Kids 🎈'}</h2>
        </Link>
        <h3>{role === 'doctor' ? 'Create Doctor / Clinician Account' : 'Create Patient / Learner Account'}</h3>
        <p>Join for personalized cognitive diagnostics, oral reading analysis, and therapy.</p>

        {/* ── ROLE SELECTION TABS ── */}
        <div className="auth-role-tabs">
          <button
            type="button"
            className={`auth-role-tab ${role === 'patient' ? 'active-patient' : ''}`}
            onClick={() => setRole('patient')}
          >
            <span className="role-emoji">🧒</span>
            <div className="role-tab-text">
              <strong>Patient / Child</strong>
              <small>Assessment & Games</small>
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
              <small>Caseload & Reports</small>
            </div>
          </button>
        </div>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSignup} className="auth-form">
          <div className="form-group">
            <label>{role === 'doctor' ? 'Doctor Full Name & Title' : 'Full Name'}</label>
            <input 
              type="text" 
              placeholder={role === 'doctor' ? 'Dr. Sarah Mitchell, MD' : 'Alex Johnson'} 
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              required 
            />
          </div>

          {role === 'doctor' && (
            <>
              <div className="form-group">
                <label>Clinical Specialization / Department</label>
                <input 
                  type="text" 
                  placeholder="e.g. Pediatric Neurologist & SLP" 
                  value={formData.specialization}
                  onChange={(e) => setFormData({...formData, specialization: e.target.value})}
                  required 
                />
              </div>
              <div className="form-group">
                <label>Hospital / Clinic Name</label>
                <input 
                  type="text" 
                  placeholder="e.g. Children's Neurodevelopmental Clinic" 
                  value={formData.hospital}
                  onChange={(e) => setFormData({...formData, hospital: e.target.value})}
                  required 
                />
              </div>
              <div className="form-group">
                <label>Medical License / Registration ID</label>
                <input 
                  type="text" 
                  placeholder="e.g. LIC-NY-84920" 
                  value={formData.licenseId}
                  onChange={(e) => setFormData({...formData, licenseId: e.target.value})}
                />
              </div>
            </>
          )}

          <div className="form-group">
            <label>{role === 'doctor' ? 'Professional Email Address' : 'Email Address'}</label>
            <input 
              type="email" 
              placeholder={role === 'doctor' ? 'dr.name@clinic.com' : 'learner@example.com'} 
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              required 
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input 
              type="password" 
              placeholder="••••••••" 
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
              required 
            />
          </div>
          <div className="form-group">
            <label>Confirm Password</label>
            <input 
              type="password" 
              placeholder="••••••••" 
              value={formData.confirmPassword}
              onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
              required 
            />
          </div>
          <button type="submit" className={`btn-auth ${role === 'doctor' ? 'btn-doctor' : ''}`} disabled={loading}>
            {loading ? "Creating account..." : role === 'doctor' ? "🩺 Register Doctor Profile" : "🚀 Create Patient Account"}
          </button>
        </form>

        <p className="auth-switch">
          Already have an account? <Link to="/login">Sign in here</Link>
        </p>
      </div>
    </div>
  );
};

export default Signup;
