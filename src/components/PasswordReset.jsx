import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';

const PasswordReset = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);


  useEffect(() => {
    const initializePasswordReset = async () => {
      try {
        // Check if we have the necessary tokens in the URL
        const urlParams = new URLSearchParams(window.location.search);
        const accessToken = urlParams.get('access_token');
        const refreshToken = urlParams.get('refresh_token');
        const type = urlParams.get('type');
        
        if (!accessToken || !refreshToken || type !== 'recovery') {
          setError('Invalid reset link. Please request a new password reset.');
          return;
        }

        // Set the session with the tokens from URL
        const { data, error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken
        });

        if (error) {
          console.error('Session error:', error);
          setError('Invalid or expired reset link. Please request a new password reset.');
        } else if (!data.user) {
          setError('Invalid reset link. Please request a new password reset.');
        } else {
          console.log('Session established successfully for user:', data.user.email);
        }
      } catch (error) {
        console.error('Password reset initialization error:', error);
        setError('Invalid reset link. Please request a new password reset.');
      }
    };

    initializePasswordReset();
  }, []);

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    // Validate passwords
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      setLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) {
        throw error;
      }

      setSuccess('Password updated successfully! Redirecting to sign in...');
      
      // Redirect to sign in after 2 seconds
      setTimeout(() => {
        window.location.href = window.location.origin;
      }, 2000);
    } catch (error) {
      console.error('Password update error:', error);
      setError(error.message || 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(120deg, #f0f4ff 0%, #dbeafe 100%)' }}>
      <style>{`
        .input-eye-container { position: relative; }
        .input-eye-btn {
          position: absolute;
          right: 0.7rem;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          cursor: pointer;
          font-size: 1.2rem;
          color: #64748b;
          padding: 0 0.2rem;
        }
        .input-eye-btn:active { color: #2563eb; }
      `}</style>
      <div style={{ background: '#fff', borderRadius: '1.5rem', boxShadow: '0 4px 24px rgba(0,0,0,0.07)', maxWidth: 380, width: '100%', padding: '2.2rem 1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        {/* Eazy Loan Logo */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '1.2rem', marginTop: '-0.5rem' }}>
          <svg width="60" height="60" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginBottom: 8, filter: 'drop-shadow(0 2px 8px rgba(37,99,235,0.10))' }}>
            <circle cx="30" cy="30" r="28" fill="#2563eb" />
            <path d="M20 32l8 8 14-16" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="44" cy="16" r="5" fill="#22c55e" stroke="#fff" strokeWidth="2" />
          </svg>
          <span style={{ fontWeight: 800, fontSize: '1.45rem', color: '#2563eb', letterSpacing: '-0.01em', marginBottom: 2 }}>EazyLoan</span>
        </div>
        
        <h2 style={{ fontWeight: 800, color: '#2563eb', marginBottom: '1.2rem', fontSize: '1.5rem', letterSpacing: '-0.01em' }}>Reset Your Password</h2>
        
        <form onSubmit={handlePasswordUpdate} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <label htmlFor="password" style={{ fontWeight: 600, marginBottom: 4, color: '#334155', fontSize: '0.98rem' }}>New Password</label>
            <div className="input-eye-container">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter new password"
                required
                style={{ padding: '0.9rem', borderRadius: '0.7rem', border: '1.5px solid #e5e7eb', fontSize: '1.05rem', outline: 'none', background: '#f8fafc', width: '100%' }}
                autoComplete="new-password"
              />
              <button type="button" className="input-eye-btn" tabIndex={-1} aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword(v => !v)}>
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <label htmlFor="confirmPassword" style={{ fontWeight: 600, marginBottom: 4, color: '#334155', fontSize: '0.98rem' }}>Confirm New Password</label>
            <div className="input-eye-container">
              <input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                required
                style={{ padding: '0.9rem', borderRadius: '0.7rem', border: '1.5px solid #e5e7eb', fontSize: '1.05rem', outline: 'none', background: '#f8fafc', width: '100%' }}
                autoComplete="new-password"
              />
              <button type="button" className="input-eye-btn" tabIndex={-1} aria-label={showConfirmPassword ? 'Hide password' : 'Show password'} onClick={() => setShowConfirmPassword(v => !v)}>
                {showConfirmPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </div>
          
          <div style={{ fontSize: '0.9rem', color: '#64748b', textAlign: 'center', marginTop: '0.5rem' }}>
            Password must be at least 6 characters long.
          </div>
          
          {error && <div style={{ color: '#ef4444', background: '#fef2f2', borderRadius: 8, padding: '0.7rem', fontWeight: 600, fontSize: '0.98rem', textAlign: 'center' }}>{error}</div>}
          {success && <div style={{ color: '#22c55e', background: '#f0fdf4', borderRadius: 8, padding: '0.7rem', fontWeight: 600, fontSize: '0.98rem', textAlign: 'center' }}>{success}</div>}
          
          <button type="submit" disabled={loading} style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: '0.7rem', padding: '1rem 0', fontWeight: 700, fontSize: '1.08rem', marginTop: '0.5rem', cursor: loading ? 'not-allowed' : 'pointer', boxShadow: '0 2px 8px 0 rgba(37,99,235,0.10)' }}>
            {loading ? 'Updating Password...' : 'Update Password'}
          </button>
          
          <button
            type="button"
            onClick={() => window.location.href = window.location.origin}
            style={{ background: 'transparent', color: '#2563eb', border: '1px solid #2563eb', borderRadius: '0.7rem', padding: '0.8rem 0', fontWeight: 600, fontSize: '1rem', cursor: 'pointer', marginTop: '0.5rem' }}
          >
            Back to Sign In
          </button>
        </form>
      </div>
    </div>
  );
};

export default PasswordReset;