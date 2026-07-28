import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import "./Login.css";
import { useAuth } from "./AuthContext";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [loading, setLoading] = useState(false);
  
  const { login, currentUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (location.state?.message) {
      setSuccessMsg(location.state.message);
    }
  }, [location]);

  useEffect(() => {
    if (currentUser) {
      navigate("/dashboard", { replace: true });
    }
  }, [currentUser, navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccessMsg("");

    try {
      await login(email, password);
      navigate("/dashboard");
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
          <h2>LexiFlow Clinical</h2>
        </Link>
        <h3>Welcome Back</h3>
        <p>Access your diagnostic sessions and therapy progress.</p>

        {successMsg && <div className="badge badge-low" style={{ display: 'block', padding: '0.75rem', marginBottom: '1.25rem', fontSize: '0.85rem' }}>{successMsg}</div>}
        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleLogin} className="auth-form">
          <div className="form-group">
            <label>Email Address</label>
            <input 
              type="email" 
              placeholder="name@example.com" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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
          <button type="submit" className="btn-auth" disabled={loading}>
            {loading ? "Signing in..." : "Sign In to Dashboard"}
          </button>
        </form>

        <p className="auth-switch">
          Don't have an account? <Link to="/signup">Create account</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
