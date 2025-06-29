import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';
import '../App.css';

const EmailConfirmation = ({ onRedirectToLogin }) => {
  const [status, setStatus] = useState('verifying'); // 'verifying', 'success', 'error'
  const [message, setMessage] = useState('');
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    const handleEmailConfirmation = async () => {
      try {
        // Get the URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('token');
        const type = urlParams.get('type');
        
        if (type === 'signup' && token) {
          // Verify the email confirmation token
          const { data, error } = await supabase.auth.verifyOtp({
            token_hash: token,
            type: 'signup'
          });
          
          if (error) {
            console.error('Email confirmation error:', error);
            setStatus('error');
            setMessage('Email confirmation failed. The link may be expired or invalid.');
          } else {
            console.log('Email confirmed successfully:', data);
            setStatus('success');
            setMessage('Your email has been confirmed successfully! You can now sign in to your account.');
            
            // Start countdown for redirect
            startCountdown();
          }
        } else {
          setStatus('error');
          setMessage('Invalid confirmation link. Please check your email for the correct link.');
        }
      } catch (error) {
        console.error('Confirmation process error:', error);
        setStatus('error');
        setMessage('An unexpected error occurred during email confirmation.');
      }
    };

    handleEmailConfirmation();
  }, []);

  const startCountdown = () => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onRedirectToLogin();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleLoginRedirect = () => {
    onRedirectToLogin();
  };

  return (
    <div className="app">
      <div className="auth-container">
        <div className="auth-card">
          <div className="logo-section">
            <div className="logo">
              <svg width="60" height="60" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
                {status === 'success' ? (
                  <>
                    <circle cx="30" cy="30" r="30" fill="#10B981"/>
                    <path d="M20 30l8 8 16-16" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                  </>
                ) : status === 'error' ? (
                  <>
                    <circle cx="30" cy="30" r="30" fill="#ef4444"/>
                    <path d="M20 20l20 20M40 20l-20 20" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                  </>
                ) : (
                  <>
                    <circle cx="30" cy="30" r="30" fill="#4F46E5"/>
                    <path d="M30 15v20M30 40h.01" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                  </>
                )}
              </svg>
            </div>
            <h1 className="brand-title">EazyLoan</h1>
          </div>

          <div className="auth-content">
            <div className="auth-header">
              <h2 className="auth-title">
                {status === 'verifying' && 'Confirming Your Email'}
                {status === 'success' && 'Email Confirmed!'}
                {status === 'error' && 'Confirmation Failed'}
              </h2>
            </div>

            <div className="confirmation-content" style={{ textAlign: 'center', padding: '2rem 0' }}>
              {status === 'verifying' && (
                <>
                  <div className="loading-spinner" style={{ margin: '0 auto 1rem' }}></div>
                  <p style={{ color: 'var(--text-secondary)' }}>
                    Please wait while we confirm your email address...
                  </p>
                </>
              )}
              
              {status === 'success' && (
                <>
                  <p style={{ color: 'var(--success-600)', marginBottom: '1.5rem', fontSize: '1.1rem' }}>
                    {message}
                  </p>
                  <div style={{ 
                    background: 'var(--success-50)', 
                    border: '1px solid var(--success-200)', 
                    borderRadius: '0.5rem', 
                    padding: '1rem',
                    marginBottom: '1.5rem'
                  }}>
                    <p style={{ color: 'var(--success-700)', margin: 0 }}>
                      Redirecting to login in {countdown} seconds...
                    </p>
                  </div>
                  <button 
                    onClick={handleLoginRedirect}
                    className="auth-button"
                    style={{ width: '100%' }}
                  >
                    Continue to Login
                  </button>
                </>
              )}
              
              {status === 'error' && (
                <>
                  <p style={{ color: 'var(--error-600)', marginBottom: '1.5rem', fontSize: '1.1rem' }}>
                    {message}
                  </p>
                  <div style={{ 
                    background: 'var(--error-50)', 
                    border: '1px solid var(--error-200)', 
                    borderRadius: '0.5rem', 
                    padding: '1rem',
                    marginBottom: '1.5rem'
                  }}>
                    <p style={{ color: 'var(--error-700)', margin: 0 }}>
                      Please try signing up again or contact support if the problem persists.
                    </p>
                  </div>
                  <button 
                    onClick={handleLoginRedirect}
                    className="auth-button"
                    style={{ width: '100%' }}
                  >
                    Go to Login
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmailConfirmation;