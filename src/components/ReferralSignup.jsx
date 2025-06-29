import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../utils/supabase';
import './ReferralSignup.css';

const ReferralSignup = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [referrerInfo, setReferrerInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const referralCode = searchParams.get('ref');

  useEffect(() => {
    if (referralCode) {
      fetchReferrerInfo();
    } else {
      setLoading(false);
    }
  }, [referralCode]);

  const fetchReferrerInfo = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .rpc('get_referrer_info', { referral_code_param: referralCode });

      if (error) throw error;

      if (data && data.length > 0) {
        setReferrerInfo(data[0]);
      } else {
        setError('Invalid referral code');
      }
    } catch (error) {
      console.error('Error fetching referrer info:', error);
      setError('Failed to load referrer information');
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = () => {
    // Store referral code in localStorage for the signup process
    if (referralCode) {
      localStorage.setItem('referralCode', referralCode);
    }
    navigate('/signup');
  };

  const handleLogin = () => {
    navigate('/login');
  };

  const handleSkip = () => {
    navigate('/');
  };

  if (loading) {
    return (
      <div className="referral-signup-container">
        <div className="referral-signup-card">
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Loading referral information...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !referrerInfo) {
    return (
      <div className="referral-signup-container">
        <div className="referral-signup-card">
          <div className="error-container">
            <div className="error-icon">⚠️</div>
            <h2>Invalid Referral Link</h2>
            <p>{error || 'This referral link is not valid or has expired.'}</p>
            <div className="action-buttons">
              <button onClick={handleSignup} className="signup-btn">
                Sign Up Anyway
              </button>
              <button onClick={handleSkip} className="skip-btn">
                Continue to Home
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const referrerName = referrerInfo.first_name && referrerInfo.last_name
    ? `${referrerInfo.first_name} ${referrerInfo.last_name}`
    : referrerInfo.username || 'A friend';

  return (
    <div className="referral-signup-container">
      <div className="referral-signup-card">
        <div className="referral-header">
          <div className="referral-icon">🎁</div>
          <h1>You've Been Invited!</h1>
          <div className="referrer-info">
            <div className="referrer-avatar">
              {referrerName.charAt(0).toUpperCase()}
            </div>
            <div className="referrer-details">
              <p className="referrer-text">
                <strong>{referrerName}</strong> has invited you to join
              </p>
              <div className="platform-name">
                <span className="logo">💰</span>
                <span className="name">EazyLoans</span>
              </div>
            </div>
          </div>
        </div>

        <div className="benefits-section">
          <h3>🌟 What you'll get:</h3>
          <div className="benefits-list">
            <div className="benefit-item">
              <div className="benefit-icon">⚡</div>
              <div className="benefit-text">
                <strong>Quick Loan Processing</strong>
                <p>Get your loan approved in minutes, not days</p>
              </div>
            </div>
            <div className="benefit-item">
              <div className="benefit-icon">💳</div>
              <div className="benefit-text">
                <strong>Competitive Rates</strong>
                <p>Access to the best loan rates in the market</p>
              </div>
            </div>
            <div className="benefit-item">
              <div className="benefit-icon">🔒</div>
              <div className="benefit-text">
                <strong>Secure & Trusted</strong>
                <p>Your financial data is protected with bank-level security</p>
              </div>
            </div>
            <div className="benefit-item">
              <div className="benefit-icon">📱</div>
              <div className="benefit-text">
                <strong>Easy Application</strong>
                <p>Apply from anywhere with our simple online process</p>
              </div>
            </div>
          </div>
        </div>

        <div className="referral-bonus">
          <div className="bonus-card">
            <div className="bonus-icon">🎉</div>
            <div className="bonus-content">
              <h4>Special Referral Bonus</h4>
              <p>Join through this link and both you and {referrerName.split(' ')[0]} get special benefits!</p>
            </div>
          </div>
        </div>

        <div className="action-section">
          <h3>Ready to get started?</h3>
          <div className="action-buttons">
            <button onClick={handleSignup} className="signup-btn primary">
              🚀 Create Account
            </button>
            <button onClick={handleLogin} className="login-btn">
              📝 Already have an account? Sign In
            </button>
          </div>
          <button onClick={handleSkip} className="skip-btn">
            Maybe later
          </button>
        </div>

        <div className="trust-indicators">
          <div className="trust-item">
            <span className="trust-icon">🏆</span>
            <span className="trust-text">Trusted by 10,000+ users</span>
          </div>
          <div className="trust-item">
            <span className="trust-icon">⭐</span>
            <span className="trust-text">4.9/5 rating</span>
          </div>
          <div className="trust-item">
            <span className="trust-icon">🔐</span>
            <span className="trust-text">Bank-level security</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReferralSignup;