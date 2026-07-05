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
        <div className="user-profile-nav" onClick={() => setShowDropdown(!showDropdown)}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--med-blue-primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
            {user?.name?.charAt(0) || "G"}
          </div>
          <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>{user?.name || "Clinician"}</span>
          <span style={{ fontSize: '0.8rem' }}>{showDropdown ? '▲' : '▼'}</span>
          
          {showDropdown && (
            <div style={{ position: 'absolute', top: '55px', right: '2rem', width: '200px', background: 'white', border: '1px solid var(--med-border)', borderRadius: '12px', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', padding: '0.5rem', zIndex: 1001 }}>
              <button style={{ width: '100%', padding: '0.75rem', textAlign: 'left', border: 'none', background: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem' }}>👤 Profile Settings</button>
              <button onClick={handleLogout} style={{ width: '100%', padding: '0.75rem', textAlign: 'left', border: 'none', background: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem', color: '#ef4444' }}>🚪 Sign Out</button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
