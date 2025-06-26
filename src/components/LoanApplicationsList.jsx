import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';
import { useAuth } from '../contexts/AuthContext';
import './LoanApplicationsList.css';

const LoanApplicationsList = ({ onBack }) => {
  const { user } = useAuth();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    console.log('LoanApplicationsList mounted, user:', user);
    if (user) {
      fetchApplications();
    }
  }, [user]);

  const fetchApplications = async () => {
    try {
      setLoading(true);
      console.log('Fetching applications for user:', user.id);
      const { data, error } = await supabase
        .from('loan_applications')
        .select('*')
        .eq('user_id', user.id);
      
      console.log('Database response:', { data, error });
      
      // Sort by created_at in descending order (newest first)
      if (data) {
        data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      }

      if (error) throw error;
      setApplications(data || []);
      console.log('Applications set:', data || []);
    } catch (error) {
      console.error('Error fetching applications:', error);
      setError('Failed to load applications');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved':
        return '#10B981';
      case 'rejected':
        return '#EF4444';
      case 'pending':
        return '#F59E0B';
      case 'under_review':
        return '#3B82F6';
      default:
        return '#6B7280';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'approved':
        return '✅';
      case 'rejected':
        return '❌';
      case 'pending':
        return '⏳';
      case 'under_review':
        return '🔍';
      default:
        return '📄';
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  console.log('Component state:', { loading, error, applications, user });

  if (loading) {
    return (
      <div className="applications-container">
        <div className="applications-header">
          <div className="header-top">
            <button className="back-btn" onClick={onBack}>
              <span className="back-icon">←</span>
              Back to Dashboard
            </button>
          </div>
        </div>
        <div className="applications-loading">
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <div className="loading-dots">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
          <h3 className="loading-title">Loading Your Applications</h3>
          <p className="loading-description">Please wait while we fetch your loan applications...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="applications-container">
        <div className="applications-header">
          <div className="header-top">
            <button className="back-btn" onClick={onBack}>
              <span className="back-icon">←</span>
              Back to Dashboard
            </button>
          </div>
        </div>
        <div className="applications-error">
          <div className="error-illustration">
            <div className="error-icon">⚠️</div>
            <div className="error-decoration"></div>
          </div>
          <h3 className="error-title">Unable to Load Applications</h3>
          <p className="error-description">{error}</p>
          <div className="error-action">
            <button className="retry-btn" onClick={fetchApplications}>
              <span className="retry-icon">🔄</span>
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="applications-container">
      <div className="applications-header">
        <div className="header-top">
          <button className="back-btn" onClick={onBack}>
            <span className="back-icon">←</span>
            Back to Dashboard
          </button>
        </div>
        <h2>My Loan Applications</h2>
        <p>Track the status of your loan applications and get updates on your financial journey</p>
      </div>

      {applications.length === 0 ? (
        <div className="applications-empty">
          <div className="empty-illustration">
            <div className="empty-icon">📋</div>
            <div className="empty-decoration"></div>
          </div>
          <h3 className="empty-title">No Applications Yet</h3>
          <p className="empty-description">
            You haven't submitted any loan applications yet. Start your financial journey by applying for your first loan!
          </p>
          <div className="empty-action">
            <button className="apply-now-btn" onClick={onBack}>
              Apply for a Loan
            </button>
          </div>
        </div>
      ) : (
        <div className="applications-grid">
          {applications.map((application) => (
            <div key={application.id} className="application-card">
              <div className="card-header">
                <div className="application-id">
                  Application #{application.id.toString().slice(-8).toUpperCase()}
                </div>
                <div className={`status-badge status-${application.status || 'pending'}`}>
                  <span className="status-icon">{getStatusIcon(application.status || 'pending')}</span>
                  <span className="status-text">
                    {(application.status || 'pending').replace('_', ' ').toUpperCase()}
                  </span>
                </div>
              </div>
              
              <div className="card-body">
                <div className="loan-amount">
                  <span className="amount-label">Loan Amount</span>
                  <span className="amount-value">{formatCurrency(application.amount)}</span>
                </div>
                
                <div className="loan-details">
                  <div className="detail-item">
                    <span className="detail-label">Purpose:</span>
                    <span className="detail-value">{application.purpose}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Term:</span>
                    <span className="detail-value">{application.term_months} months</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Income:</span>
                    <span className="detail-value">{formatCurrency(application.annual_income)}</span>
                  </div>
                </div>
              </div>
              
              <div className="card-footer">
                <div className="application-date">
                  Applied on {formatDate(application.created_at)}
                </div>
                {application.status === 'pending' && (
                  <div className="pending-note">
                    <span className="note-icon">⏱️</span>
                    Review in progress
                  </div>
                )}
              </div>

              {/* Status-specific help messages */}
              {application.status === 'pending' && (
                <div style={{ 
                  margin: '1rem', 
                  padding: '0.75rem', 
                  background: '#fef3c7', 
                  borderRadius: '6px', 
                  border: '1px solid #fbbf24' 
                }}>
                  <p style={{ margin: 0, color: '#92400e', fontSize: '0.8rem' }}>
                    💬 <strong>Application under review.</strong> Questions about the process?
                  </p>
                </div>
              )}

              {application.status === 'approved' && (
                <div style={{ 
                  margin: '1rem', 
                  padding: '0.75rem', 
                  background: '#d1fae5', 
                  borderRadius: '6px', 
                  border: '1px solid #10b981' 
                }}>
                  <p style={{ margin: 0, color: '#065f46', fontSize: '0.8rem' }}>
                    💬 <strong>Congratulations!</strong> Need help with next steps?
                  </p>
                </div>
              )}

              {application.status === 'rejected' && (
                <div style={{ 
                  margin: '1rem', 
                  padding: '0.75rem', 
                  background: '#fee2e2', 
                  borderRadius: '6px', 
                  border: '1px solid #ef4444' 
                }}>
                  <p style={{ margin: 0, color: '#991b1b', fontSize: '0.8rem' }}>
                    💬 <strong>Application not approved.</strong> Chat with us to understand why and explore other options.
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default LoanApplicationsList;