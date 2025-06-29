import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useSearchParams } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import SignIn from './components/SignIn';
import SignUp from './components/SignUp';
import ConfirmPage from './pages/ConfirmPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import MainApp from './pages/MainApp';
import BannedUser from './components/BannedUser';
import ReferralSignup from './components/ReferralSignup';
import ReferralTest from './components/ReferralTest';
import './App.css';

// Component to handle the root route logic
const RootRoute = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const referralCode = searchParams.get('ref');
  
  // If user is logged in, go to main app
  if (user) {
    return <MainApp />;
  }
  
  // If there's a referral code, show referral signup
  if (referralCode) {
    return <ReferralSignup />;
  }
  
  // Otherwise show normal sign in form
  return (
    <div className="app">
      <SignIn />
    </div>
  );
};

export default function App() {
  const { user, loading, isBanned, signOut } = useAuth();

  // Show loading during initial auth check
  if (loading) {
    return (
      <div className="app">
        <div className="auth-container">
          <div className="auth-card">
            <div className="logo-section">
              <div className="logo">
                <svg width="60" height="60" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="30" cy="30" r="30" fill="#4F46E5"/>
                  <path d="M20 25h20v3H20v-3zm0 6h20v3H20v-3zm0 6h15v3H20v-3z" fill="white"/>
                  <circle cx="45" cy="15" r="8" fill="#10B981"/>
                  <path d="M42 15l2 2 4-4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h1 className="brand-title">EazyLoan</h1>
            </div>
            <div className="loading-spinner"></div>
            <p style={{ color: 'var(--text-secondary)', marginTop: 'var(--spacing-md)', textAlign: 'center' }}>
              Initializing application...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Show banned user page if user is banned
  if (user && isBanned) {
    return (
      <div className="app">
        <BannedUser onSignOut={signOut} />
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<RootRoute />} />
        <Route path="/signup" element={user ? <Navigate to="/" replace /> : <div className="app"><SignUp /></div>} />
        <Route path="/login" element={user ? <Navigate to="/" replace /> : <div className="app"><SignIn /></div>} />
        <Route path="/confirm" element={<ConfirmPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/test-referral" element={<div className="app"><ReferralTest /></div>} />
        
        {/* Protected routes */}
        <Route 
          path="/dashboard" 
          element={user ? <MainApp /> : <Navigate to="/" replace />} 
        />
        
        {/* Catch all route */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}