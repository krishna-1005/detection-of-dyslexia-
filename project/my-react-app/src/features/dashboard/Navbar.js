import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import './Navbar.css';
import { useAuth } from '../auth/AuthContext';

const Navbar = ({ user: propUser, showDropdown, setShowDropdown }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, logout } = useAuth();

  const user = currentUser || propUser;
  const displayName = user?.displayName || user?.name || user?.email?.split('@')[0] || "Clinician";
  const initial = displayName.charAt(0).toUpperCase();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (e) {
      console.error("Logout error:", e);
    }
    navigate("/login");
  };

  return (
    <nav className="navbar">
      <Link to="/" className="nav-brand">
        <div className="nav-logo-icon">L</div>
        <h2>LexiFlow <span className="nav-brand-tag">Clinical</span></h2>
      </Link>
      
      <div className="nav-links">
        <Link to="/dashboard" className={`nav-item ${location.pathname === '/dashboard' ? 'active' : ''}`}>
          <span>📊 Overview</span>
        </Link>
        <Link to="/detect" className={`nav-item ${location.pathname === '/detect' ? 'active' : ''}`}>
          <span>🧬 Diagnostic Engine</span>
        </Link>
        <Link to="/reader" className={`nav-item ${location.pathname === '/reader' ? 'active' : ''}`}>
          <span>✨ Smart Reader</span>
        </Link>
        <Link to="/analysis" className={`nav-item ${location.pathname === '/analysis' ? 'active' : ''}`}>
          <span>📈 Clinical Reports</span>
        </Link>
      </div>

      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
        <div className="user-profile-nav" onClick={() => setShowDropdown && setShowDropdown(!showDropdown)}>
          <div className="user-avatar-badge">
            {initial}
          </div>
          <span className="user-name-text">{displayName}</span>
          <span className="user-dropdown-arrow">{showDropdown ? '▲' : '▼'}</span>
          
          {showDropdown && (
            <div className="navbar-dropdown-menu">
              <div className="dropdown-user-header">
                <strong>{displayName}</strong>
                <small>{user?.email || 'Logged in'}</small>
              </div>
              <div className="dropdown-divider" />
              <button className="dropdown-item" onClick={() => navigate('/dashboard')}>
                📊 Dashboard
              </button>
              <button className="dropdown-item" onClick={() => navigate('/analysis')}>
                📈 Clinical Reports
              </button>
              <div className="dropdown-divider" />
              <button className="dropdown-item logout-item" onClick={handleLogout}>
                🚪 Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
