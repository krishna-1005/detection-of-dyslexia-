import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

const ProtectedRoute = ({ children, allowedRole = null }) => {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: '#0d0b14',
        color: '#a78bfa',
        fontFamily: 'system-ui, sans-serif'
      }}>
        <div style={{
          width: '48px',
          height: '48px',
          border: '4px solid rgba(167, 139, 250, 0.2)',
          borderTop: '4px solid #a78bfa',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
        <p style={{ marginTop: '1rem', fontWeight: 600, letterSpacing: '0.05em' }}>Authenticating Session...</p>
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  // Strict role enforcement:
  // If route is restricted to doctors and current user is not a doctor, redirect to patient dashboard
  if (allowedRole === 'doctor' && currentUser.role !== 'doctor') {
    return <Navigate to="/dashboard" replace />;
  }

  // If route is restricted to patients/clients and current user is a doctor, redirect to doctor dashboard
  if (allowedRole === 'patient' && currentUser.role === 'doctor') {
    return <Navigate to="/doctor/dashboard" replace />;
  }

  return children;
};

export default ProtectedRoute;
