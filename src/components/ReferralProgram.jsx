import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../utils/supabase';
import './ReferralProgram.css';

const ReferralProgram = ({ onClose }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [referralStats, setReferralStats] = useState({
    referral_code: '',
    total_referrals: 0,
    pending_referrals: 0,
    completed_referrals: 0,
    total_rewards: 0
  });
  const [referralHistory, setReferralHistory] = useState([]);
  const [copySuccess, setCopySuccess] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (user) {
      testDatabaseConnection();
    }
  }, [user]);

  const testDatabaseConnection = async () => {
    try {
      // Test basic Supabase connection
      const { data, error } = await supabase.from('referral_codes').select('count').limit(1);
      if (error) {
        console.warn('Database connection test failed:', error);
        setError(`Database connection failed: ${error.message}`);
        setLoading(false);
        return;
      }
      
      // If connection is good, fetch referral data
      fetchReferralData();
    } catch (error) {
      console.error('Connection test error:', error);
      setError('Unable to connect to database. Please check your internet connection.');
      setLoading(false);
    }
  };

  const fetchReferralData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get referral stats
      const { data: statsData, error: statsError } = await supabase
        .rpc('get_user_referral_stats', { check_user_id: user.id });

      if (statsError) throw statsError;

      if (statsData && statsData.length > 0) {
        setReferralStats(statsData[0]);
      }

      // Get referral history
      const { data: historyData, error: historyError } = await supabase
        .from('referrals')
        .select(`
          id,
          status,
          reward_amount,
          reward_given,
          created_at,
          completed_at,
          referred_id
        `)
        .eq('referrer_id', user.id)
        .order('created_at', { ascending: false });

      // Get user profiles for referred users separately
      if (historyData && historyData.length > 0) {
        const referredIds = historyData.map(r => r.referred_id);
        const { data: profilesData } = await supabase
          .from('user_profiles')
          .select('user_id, first_name, last_name, username')
          .in('user_id', referredIds);
        
        // Merge profile data with referral history
        const profileMap = new Map(profilesData?.map(p => [p.user_id, p]) || []);
        historyData.forEach(referral => {
          const profile = profileMap.get(referral.referred_id);
          referral.user_profiles = profile || null;
        });
      }

      if (historyError) throw historyError;

      setReferralHistory(historyData || []);
    } catch (error) {
      console.error('Error fetching referral data:', error);
      
      // Provide more specific error messages
      let errorMessage = 'Failed to load referral data';
      
      if (error.message?.includes('function get_user_referral_stats')) {
        errorMessage = 'Referral system not properly initialized. Please contact support.';
      } else if (error.message?.includes('relation "referral_codes" does not exist')) {
        errorMessage = 'Referral database tables not found. Please run database migrations.';
      } else if (error.message?.includes('relation "user_profiles" does not exist')) {
        errorMessage = 'User profiles table not found. Please run database migrations.';
      } else if (error.message?.includes('JWT')) {
        errorMessage = 'Authentication error. Please log in again.';
      } else if (error.message?.includes('permission denied')) {
        errorMessage = 'Permission denied. Please check your account status.';
      } else if (error.message) {
        errorMessage = `Error: ${error.message}`;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const getReferralLink = () => {
    // Use environment variable for deployed domain, fallback to current origin for development
    const baseUrl = import.meta.env.VITE_APP_DOMAIN || window.location.origin;
    // Ensure we have a valid referral code
    if (!referralStats?.referral_code) {
      console.warn('No referral code available');
      return `${baseUrl}/?ref=`;
    }
    return `${baseUrl}/?ref=${referralStats.referral_code}`;
  };

  const copyReferralLink = async () => {
    try {
      await navigator.clipboard.writeText(getReferralLink());
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (error) {
      console.error('Failed to copy link:', error);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = getReferralLink();
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  };

  const shareReferralLink = async (platform) => {
    const link = getReferralLink();
    const message = `Join me on EazyLoans and get started with your loan application! Use my referral link: ${link}`;

    switch (platform) {
      case 'whatsapp':
        window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
        break;
      case 'telegram':
        window.open(`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent('Join me on EazyLoans!')}`, '_blank');
        break;
      case 'twitter':
        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(message)}`, '_blank');
        break;
      case 'facebook':
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}`, '_blank');
        break;
      case 'email':
        window.open(`mailto:?subject=${encodeURIComponent('Join EazyLoans!')}&body=${encodeURIComponent(message)}`, '_blank');
        break;
      default:
        copyReferralLink();
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: { text: 'Pending', class: 'status-pending', icon: '⏳' },
      completed: { text: 'Completed', class: 'status-completed', icon: '✅' },
      cancelled: { text: 'Cancelled', class: 'status-cancelled', icon: '❌' }
    };
    return badges[status] || badges.pending;
  };

  if (loading) {
    return (
      <div className="referral-program">
        <div className="referral-header">
          <h2>🎁 Referral Program</h2>
          <button onClick={onClose} className="close-btn">×</button>
        </div>
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading referral data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="referral-program">
        <div className="referral-header">
          <h2>🎁 Referral Program</h2>
          <button onClick={onClose} className="close-btn">×</button>
        </div>
        <div className="error-container">
          <div className="error-icon">⚠️</div>
          <h3>Error Loading Referral Data</h3>
          <p>{error}</p>
          <button onClick={fetchReferralData} className="retry-btn">
            🔄 Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="referral-program">
      <div className="referral-header">
        <h2>🎁 Referral Program</h2>
        <button onClick={onClose} className="close-btn">×</button>
      </div>

      {/* Referral Stats */}
      <div className="referral-stats">
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">👥</div>
            <div className="stat-content">
              <div className="stat-number">{referralStats.total_referrals}</div>
              <div className="stat-label">Total Referrals</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">⏳</div>
            <div className="stat-content">
              <div className="stat-number">{referralStats.pending_referrals}</div>
              <div className="stat-label">Pending</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">✅</div>
            <div className="stat-content">
              <div className="stat-number">{referralStats.completed_referrals}</div>
              <div className="stat-label">Completed</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">💰</div>
            <div className="stat-content">
              <div className="stat-number">${(referralStats.total_rewards || 0).toLocaleString()}</div>
              <div className="stat-label">Total Rewards</div>
            </div>
          </div>
        </div>
      </div>

      {/* Referral Link Section */}
      <div className="referral-link-section">
        <h3>📎 Your Referral Link</h3>
        <div className="referral-link-container">
          <div className="referral-code-display">
            <span className="code-label">Your Code:</span>
            <span className="referral-code">{referralStats.referral_code}</span>
          </div>
          <div className="link-input-container">
            <input
              type="text"
              value={getReferralLink()}
              readOnly
              className="referral-link-input"
            />
            <button
              onClick={copyReferralLink}
              className={`copy-btn ${copySuccess ? 'copied' : ''}`}
            >
              {copySuccess ? '✅ Copied!' : '📋 Copy'}
            </button>
          </div>
        </div>

        {/* Share Buttons */}
        <div className="share-section">
          <h4>📢 Share Your Link</h4>
          <div className="share-buttons">
            <button onClick={() => shareReferralLink('whatsapp')} className="share-btn whatsapp">
              📱 WhatsApp
            </button>
            <button onClick={() => shareReferralLink('telegram')} className="share-btn telegram">
              ✈️ Telegram
            </button>
            <button onClick={() => shareReferralLink('twitter')} className="share-btn twitter">
              🐦 Twitter
            </button>
            <button onClick={() => shareReferralLink('facebook')} className="share-btn facebook">
              📘 Facebook
            </button>
            <button onClick={() => shareReferralLink('email')} className="share-btn email">
              📧 Email
            </button>
          </div>
        </div>
      </div>

      {/* How It Works */}
      <div className="how-it-works">
        <h3>🎯 How It Works</h3>
        <div className="steps">
          <div className="step">
            <div className="step-number">1</div>
            <div className="step-content">
              <h4>Share Your Link</h4>
              <p>Send your unique referral link to friends and family</p>
            </div>
          </div>
          <div className="step">
            <div className="step-number">2</div>
            <div className="step-content">
              <h4>They Sign Up</h4>
              <p>When someone clicks your link and creates an account</p>
            </div>
          </div>
          <div className="step">
            <div className="step-number">3</div>
            <div className="step-content">
              <h4>Earn Rewards</h4>
              <p>Get $10 for each successful referral</p>
            </div>
          </div>
        </div>
      </div>

      {/* Referral History */}
      {referralHistory.length > 0 && (
        <div className="referral-history">
          <h3>📋 Referral History</h3>
          <div className="history-list">
            {referralHistory.map((referral) => {
              const badge = getStatusBadge(referral.status);
              const referredUser = referral.user_profiles;
              const userName = referredUser 
                ? `${referredUser.first_name || ''} ${referredUser.last_name || ''}`.trim() || referredUser.username
                : 'Unknown User';

              return (
                <div key={referral.id} className="history-item">
                  <div className="history-user">
                    <div className="user-avatar">
                      {userName.charAt(0).toUpperCase()}
                    </div>
                    <div className="user-info">
                      <div className="user-name">{userName}</div>
                      <div className="referral-date">
                        {new Date(referral.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <div className="history-status">
                    <span className={`status-badge ${badge.class}`}>
                      {badge.icon} {badge.text}
                    </span>
                    {referral.reward_given && (
                      <div className="reward-amount">
                        +${(referral.reward_amount || 0).toLocaleString()}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {referralHistory.length === 0 && (
        <div className="empty-history">
          <div className="empty-icon">👥</div>
          <h3>No Referrals Yet</h3>
          <p>Start sharing your referral link to earn rewards!</p>
        </div>
      )}
    </div>
  );
};

export default ReferralProgram;