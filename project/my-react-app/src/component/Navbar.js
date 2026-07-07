import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import './Navbar.css';

const Navbar = ({ user, showDropdown, setShowDropdown }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    localStorage.removeItem("lexiflow_user");
    localStorage.removeItem("lexiflow_token");
    navigate("/");
  };

  return (
    <nav className="navbar">
      <Link to="/" className="nav-brand">
        <div className="nav-logo-icon">L</div>
        <h2>LexiFlow Clinical</h2>
      </Link>
      
      <div className="nav-links">
        <Link to="/dashboard" className={`nav-item ${location.pathname === '/dashboard' ? 'active' : ''}`}>Dashboard</Link>
        <Link to="/detect" className={`nav-item ${location.pathname === '/detect' ? 'active' : ''}`}>Diagnostic Engine</Link>
        <a href="#" className="nav-item">Linguistic Library</a>
        <a href="#" className="nav-item">Support</a>
      </div>

      <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
        <div className="user-profile-nav" onClick={() => setShowDropdown && setShowDropdown(!showDropdown)}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--lf-gradient-primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.85rem' }}>
            {user?.name?.charAt(0) || "G"}
          </div>
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--lf-text-primary)' }}>{user?.name || "Clinician"}</span>
          <span style={{ fontSize: '0.7rem', color: 'var(--lf-text-muted)' }}>{showDropdown ? '▲' : '▼'}</span>
          
          {showDropdown && (
            <div style={{ 
              position: 'absolute', top: '55px', right: '0', width: '200px', 
              background: 'rgba(26, 21, 40, 0.95)', 
              backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid var(--lf-border)', borderRadius: '14px', 
              boxShadow: 'var(--lf-shadow-lg)', padding: '0.5rem', zIndex: 1001 
            }}>
              <button style={{ width: '100%', padding: '0.75rem', textAlign: 'left', border: 'none', background: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem', color: 'var(--lf-text-secondary)', transition: 'background 0.2s' }} 
                onMouseEnter={e => e.target.style.background = 'rgba(255,255,255,0.06)'}
                onMouseLeave={e => e.target.style.background = 'none'}
              >👤 Profile Settings</button>
              <button onClick={handleLogout} style={{ width: '100%', padding: '0.75rem', textAlign: 'left', border: 'none', background: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem', color: '#f43f5e', transition: 'background 0.2s' }}
                onMouseEnter={e => e.target.style.background = 'rgba(244,63,94,0.08)'}
                onMouseLeave={e => e.target.style.background = 'none'}
              >🚪 Sign Out</button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
