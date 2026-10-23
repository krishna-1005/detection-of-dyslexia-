import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import './Navbar.css';
import { useAuth } from '../auth/AuthContext';

const Navbar = ({ user: propUser, showDropdown, setShowDropdown }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  React.useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const user = currentUser || propUser;
  const isDoctor = user?.role === 'doctor';
  const displayName = user?.displayName || user?.name || (isDoctor ? "Dr. Mitchell" : (user?.email?.split('@')[0] || "Learner"));
  const initial = isDoctor ? "🩺" : displayName.charAt(0).toUpperCase();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (e) {
      console.error("Logout error:", e);
    }
    navigate("/login");
  };

  const therapyNavLinks = [
    { path: '/therapy/phoneme', label: 'Phoneme Matching', icon: '🧩' },
    { path: '/therapy/morphology', label: 'Morphology Builder', icon: '🧬' },
    { path: '/therapy/naming', label: 'Rapid Naming', icon: '⚡' },
    { path: '/therapy/visual', label: 'Visual Tracking Practice', icon: '📖' },
    { path: '/therapy/auditory', label: 'Auditory Processing', icon: '🎧' },
  ];

  return (
    <nav className={`navbar ${scrolled ? 'navbar-blue-scrolled' : ''}`}>
      <div className="nav-left-group">
        <button 
          className="mobile-hamburger-btn" 
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle Navigation Menu"
        >
          {mobileMenuOpen ? '✕' : '☰'}
        </button>

        <Link to="/" className="nav-brand" onClick={() => setMobileMenuOpen(false)}>
          <div className="nav-logo-icon kids-logo-rainbow">{isDoctor ? '🩺' : '🌈'}</div>
          <h2>Cognilex <span className={`nav-brand-tag ${isDoctor ? 'title-doctor-badge' : 'title-kids-badge'}`}>{isDoctor ? 'Clinical Suite 🩺' : 'Kids 🎈'}</span></h2>
        </Link>
      </div>
      
      <div className="nav-links">
        {isDoctor ? (
          <>
            <Link to="/doctor/dashboard" className={`nav-item ${location.pathname.startsWith('/doctor') ? 'active' : ''}`}>
              <span>🩺 Doctor Caseload</span>
            </Link>
            <Link to="/reading-test" className={`nav-item ${location.pathname === '/reading-test' ? 'active' : ''}`}>
              <span>🎤 Oral Reading Test</span>
            </Link>
            <Link to="/eye-tracking" className={`nav-item ${location.pathname === '/eye-tracking' ? 'active' : ''}`}>
              <span>👁️ Eye Tracking</span>
            </Link>
            <Link to="/analysis" className={`nav-item ${location.pathname === '/analysis' ? 'active' : ''}`}>
              <span>📈 Clinical Reports</span>
            </Link>
            <Link to="/detect" className={`nav-item ${location.pathname === '/detect' ? 'active' : ''}`}>
              <span>🧬 Diagnostic Engine</span>
            </Link>
          </>
        ) : (
          <>
            <Link to="/dashboard" className={`nav-item ${location.pathname === '/dashboard' ? 'active' : ''}`}>
              <span>📊 Overview</span>
            </Link>
            <Link to="/detect" className={`nav-item ${location.pathname === '/detect' ? 'active' : ''}`}>
              <span>🧬 Diagnostic Engine</span>
            </Link>
            <Link to="/reading-test" className={`nav-item ${location.pathname === '/reading-test' ? 'active' : ''}`}>
              <span>🎤 Reading Test</span>
            </Link>
            <Link to="/eye-tracking" className={`nav-item ${location.pathname === '/eye-tracking' ? 'active' : ''}`}>
              <span>👁️ Eye Tracking</span>
            </Link>
            <Link to="/quiz" className={`nav-item ${location.pathname === '/quiz' ? 'active' : ''}`}>
              <span>📋 Symptoms Quiz</span>
            </Link>
            <Link to="/reader" className={`nav-item ${location.pathname === '/reader' ? 'active' : ''}`}>
              <span>✨ Smart Reader</span>
            </Link>
            <Link to="/analysis" className={`nav-item ${location.pathname === '/analysis' ? 'active' : ''}`}>
              <span>📈 Clinical Reports</span>
            </Link>
          </>
        )}
      </div>

      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
        <div className="user-profile-nav" onClick={() => setShowDropdown && setShowDropdown(!showDropdown)}>
          <div className="user-avatar-badge" style={isDoctor ? { background: '#0f766e', color: '#ffffff', fontSize: '1.1rem' } : {}}>
            {initial}
          </div>
          <span className="user-name-text">{displayName}</span>
          <span className="user-dropdown-arrow">{showDropdown ? '▲' : '▼'}</span>
          
          {showDropdown && (
            <div className="navbar-dropdown-menu">
              <div className="dropdown-user-header">
                <strong>{displayName}</strong>
                <small>{user?.email || (isDoctor ? 'dr.mitchell@cognilex.ai' : 'Logged in')}</small>
                {isDoctor && (
                  <div style={{ marginTop: 4 }}>
                    <span style={{ fontSize: '0.68rem', background: '#ecfdf5', color: '#059669', padding: '2px 6px', borderRadius: 4, fontWeight: 800 }}>
                      ✓ LIC-NY-84920
                    </span>
                  </div>
                )}
              </div>
              <div className="dropdown-divider" />
              
              {isDoctor ? (
                <button className="dropdown-item" onClick={() => { navigate('/doctor/dashboard'); setShowDropdown && setShowDropdown(false); }}>
                  🩺 Doctor Caseload Dashboard
                </button>
              ) : (
                <button className="dropdown-item" onClick={() => { navigate('/dashboard'); setShowDropdown && setShowDropdown(false); }}>
                  📊 Kid Dashboard
                </button>
              )}

              <button className="dropdown-item" onClick={() => { navigate('/analysis'); setShowDropdown && setShowDropdown(false); }}>
                {isDoctor ? '📈 Clinical Reports' : '📈 Progress & Reports'}
              </button>
              <div className="dropdown-divider" />
              <button className="dropdown-item logout-item" onClick={handleLogout}>
                🚪 Sign Out
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Navigation Slide-Down Drawer */}
      {mobileMenuOpen && (
        <div className="mobile-nav-drawer">
          <div className="mobile-drawer-section">
            <small className="mobile-drawer-title">Core Navigation</small>
            {isDoctor ? (
              <Link to="/doctor/dashboard" className={`mobile-drawer-link ${location.pathname.startsWith('/doctor') ? 'active' : ''}`} onClick={() => setMobileMenuOpen(false)}>
                🩺 Doctor Caseload Dashboard
              </Link>
            ) : (
              <Link to="/dashboard" className={`mobile-drawer-link ${location.pathname === '/dashboard' ? 'active' : ''}`} onClick={() => setMobileMenuOpen(false)}>
                📊 Kid Dashboard Overview
              </Link>
            )}
            <Link to="/detect" className={`mobile-drawer-link ${location.pathname === '/detect' ? 'active' : ''}`} onClick={() => setMobileMenuOpen(false)}>
              🧬 Diagnostic Engine
            </Link>
            <Link to="/reading-test" className={`mobile-drawer-link ${location.pathname === '/reading-test' ? 'active' : ''}`} onClick={() => setMobileMenuOpen(false)}>
              🎤 Reading Test
            </Link>
            <Link to="/eye-tracking" className={`mobile-drawer-link ${location.pathname === '/eye-tracking' ? 'active' : ''}`} onClick={() => setMobileMenuOpen(false)}>
              👁️ Eye-Tracking Test
            </Link>
            <Link to="/quiz" className={`mobile-drawer-link ${location.pathname === '/quiz' ? 'active' : ''}`} onClick={() => setMobileMenuOpen(false)}>
              📋 Symptoms Quiz
            </Link>
            <Link to="/reader" className={`mobile-drawer-link ${location.pathname === '/reader' ? 'active' : ''}`} onClick={() => setMobileMenuOpen(false)}>
              ✨ Smart AI Reader
            </Link>
            <Link to="/analysis" className={`mobile-drawer-link ${location.pathname === '/analysis' ? 'active' : ''}`} onClick={() => setMobileMenuOpen(false)}>
              {isDoctor ? '📈 Clinical Reports' : '📈 Progress & Reports'}
            </Link>
          </div>

          <div className="mobile-drawer-divider" />

          <div className="mobile-drawer-section">
            <small className="mobile-drawer-title">Therapy Suite Modules</small>
            {therapyNavLinks.map(t => (
              <Link key={t.path} to={t.path} className={`mobile-drawer-link ${location.pathname === t.path ? 'active' : ''}`} onClick={() => setMobileMenuOpen(false)}>
                <span>{t.icon} {t.label}</span>
              </Link>
            ))}
          </div>

          <div className="mobile-drawer-divider" />

          <div className="mobile-drawer-section">
            <button className="mobile-drawer-btn logout" onClick={handleLogout}>
              🚪 Sign Out ({displayName})
            </button>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
