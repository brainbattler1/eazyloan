import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../utils/supabase';

const TwoFactorAuth = ({ onClose }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [factors, setFactors] = useState([]);
  const [showSetup, setShowSetup] = useState(false);
  const [setupStep, setSetupStep] = useState(1);
  const [factorType, setFactorType] = useState('totp');
  const [friendlyName, setFriendlyName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [factorData, setFactorData] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (user) {
      fetchFactors();
    }
  }, [user]);

  const fetchFactors = async () => {
    try {
      setLoading(true);
      setError('');
      
      const { data, error } = await supabase.rpc('list_mfa_factors');
      
      if (error) throw error;
      setFactors(data || []);
    } catch (error) {
      console.error('Error fetching MFA factors:', error);
      setError('Failed to load your authentication factors. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const startSetup = () => {
    setShowSetup(true);
    setSetupStep(1);
    setFactorType('totp');
    setFriendlyName('');
    setPhoneNumber('');
    setVerificationCode('');
    setFactorData(null);
    setError('');
    setSuccess('');
  };

  const cancelSetup = () => {
    setShowSetup(false);
    setFactorData(null);
  };

  const handleCreateFactor = async () => {
    try {
      setLoading(true);
      setError('');
      
      if (!friendlyName) {
        setError('Please provide a name for this authentication method');
        setLoading(false);
        return;
      }
      
      if (factorType === 'sms' && !phoneNumber) {
        setError('Please provide a phone number');
        setLoading(false);
        return;
      }
      
      const { data, error } = await supabase.rpc('create_mfa_factor', {
        p_friendly_name: friendlyName,
        p_factor_type: factorType,
        p_issuer: 'EazyLoan',
        p_phone: factorType === 'sms' ? phoneNumber : null
      });
      
      if (error) throw error;
      
      setFactorData(data);
      setSetupStep(2);
    } catch (error) {
      console.error('Error creating MFA factor:', error);
      setError('Failed to set up two-factor authentication. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyFactor = async () => {
    try {
      setLoading(true);
      setError('');
      
      if (!verificationCode) {
        setError('Please enter the verification code');
        setLoading(false);
        return;
      }
      
      const { data, error } = await supabase.rpc('verify_mfa_factor', {
        p_factor_id: factorData.factor_id,
        p_code: verificationCode
      });
      
      if (error) throw error;
      
      if (data) {
        setSuccess('Two-factor authentication has been successfully set up!');
        setSetupStep(3);
        await fetchFactors();
      } else {
        setError('Invalid verification code. Please try again.');
      }
    } catch (error) {
      console.error('Error verifying MFA factor:', error);
      setError('Failed to verify the code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDisableFactor = async (factorId) => {
    try {
      setLoading(true);
      setError('');
      
      const { data, error } = await supabase.rpc('disable_mfa_factor', {
        p_factor_id: factorId
      });
      
      if (error) throw error;
      
      if (data) {
        setSuccess('Two-factor authentication has been disabled.');
        await fetchFactors();
      } else {
        setError('Failed to disable two-factor authentication.');
      }
    } catch (error) {
      console.error('Error disabling MFA factor:', error);
      setError('Failed to disable two-factor authentication. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getFactorTypeLabel = (type) => {
    switch (type) {
      case 'totp': return 'Authenticator App';
      case 'sms': return 'SMS';
      default: return type;
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'verified': return 'Active';
      case 'unverified': return 'Setup Incomplete';
      case 'disabled': return 'Disabled';
      default: return status;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'verified': return '#10b981';
      case 'unverified': return '#f59e0b';
      case 'disabled': return '#6b7280';
      default: return '#6b7280';
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="two-factor-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>🔒 Two-Factor Authentication</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="modal-content">
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}
          
          {success && (
            <div className="success-message">
              {success}
            </div>
          )}

          {!showSetup ? (
            <div className="factors-list-container">
              <div className="factors-header">
                <h3>Your Authentication Methods</h3>
                <p>Two-factor authentication adds an extra layer of security to your account.</p>
              </div>

              {loading ? (
                <div className="loading-spinner-container">
                  <div className="loading-spinner"></div>
                  <p>Loading your authentication methods...</p>
                </div>
              ) : (
                <>
                  {factors.length === 0 ? (
                    <div className="no-factors">
                      <div className="no-factors-icon">🔐</div>
                      <h4>No Authentication Methods Set Up</h4>
                      <p>Add two-factor authentication to increase your account security.</p>
                    </div>
                  ) : (
                    <div className="factors-list">
                      {factors.map((factor) => (
                        <div key={factor.id} className="factor-item">
                          <div className="factor-info">
                            <div className="factor-icon">
                              {factor.factor_type === 'totp' ? '📱' : '📱'}
                            </div>
                            <div className="factor-details">
                              <h4>{factor.friendly_name}</h4>
                              <div className="factor-meta">
                                <span className="factor-type">{getFactorTypeLabel(factor.factor_type)}</span>
                                <span className="factor-status" style={{ color: getStatusColor(factor.status) }}>
                                  {getStatusLabel(factor.status)}
                                </span>
                              </div>
                            </div>
                          </div>
                          {factor.status === 'verified' && (
                            <button 
                              className="disable-factor-btn"
                              onClick={() => handleDisableFactor(factor.id)}
                              disabled={loading}
                            >
                              Disable
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  <button 
                    className="setup-2fa-btn"
                    onClick={startSetup}
                    disabled={loading}
                  >
                    {factors.length === 0 ? 'Set Up Two-Factor Authentication' : 'Add Another Method'}
                  </button>
                </>
              )}
            </div>
          ) : (
            <div className="setup-container">
              {setupStep === 1 && (
                <div className="setup-step">
                  <h3>Step 1: Choose Authentication Method</h3>
                  
                  <div className="form-group">
                    <label>Name this method</label>
                    <input
                      type="text"
                      value={friendlyName}
                      onChange={(e) => setFriendlyName(e.target.value)}
                      placeholder="e.g., My Phone, Work Phone"
                      required
                    />
                  </div>
                  
                  <div className="form-group">
                    <label>Authentication type</label>
                    <div className="factor-type-options">
                      <div 
                        className={`factor-type-option ${factorType === 'totp' ? 'selected' : ''}`}
                        onClick={() => setFactorType('totp')}
                      >
                        <div className="option-icon">📱</div>
                        <div className="option-info">
                          <h4>Authenticator App</h4>
                          <p>Use Google Authenticator, Authy, or similar apps</p>
                        </div>
                      </div>
                      
                      <div 
                        className={`factor-type-option ${factorType === 'sms' ? 'selected' : ''}`}
                        onClick={() => setFactorType('sms')}
                      >
                        <div className="option-icon">💬</div>
                        <div className="option-info">
                          <h4>SMS</h4>
                          <p>Receive verification codes via text message</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {factorType === 'sms' && (
                    <div className="form-group">
                      <label>Phone Number</label>
                      <input
                        type="tel"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        placeholder="+1234567890"
                        required
                      />
                      <small>Include country code (e.g., +1 for US)</small>
                    </div>
                  )}
                  
                  <div className="setup-actions">
                    <button 
                      className="cancel-btn"
                      onClick={cancelSetup}
                      disabled={loading}
                    >
                      Cancel
                    </button>
                    <button 
                      className="continue-btn"
                      onClick={handleCreateFactor}
                      disabled={loading || (factorType === 'sms' && !phoneNumber) || !friendlyName}
                    >
                      {loading ? 'Processing...' : 'Continue'}
                    </button>
                  </div>
                </div>
              )}
              
              {setupStep === 2 && factorData && (
                <div className="setup-step">
                  <h3>Step 2: Verify {factorType === 'totp' ? 'Authenticator App' : 'Phone Number'}</h3>
                  
                  {factorType === 'totp' && (
                    <div className="totp-setup">
                      <div className="qr-code-container">
                        <img 
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(factorData.qr_code)}`}
                          alt="QR Code"
                          className="qr-code"
                        />
                      </div>
                      
                      <div className="manual-entry">
                        <p>If you can't scan the QR code, enter this code manually:</p>
                        <div className="secret-key">{factorData.secret}</div>
                      </div>
                      
                      <ol className="setup-instructions">
                        <li>Open your authenticator app</li>
                        <li>Add a new account by scanning the QR code or entering the secret key</li>
                        <li>Enter the 6-digit code from your app below</li>
                      </ol>
                    </div>
                  )}
                  
                  {factorType === 'sms' && (
                    <div className="sms-setup">
                      <p>We've sent a verification code to your phone number:</p>
                      <div className="phone-display">{factorData.phone}</div>
                      <p>Enter the 6-digit code from the SMS below:</p>
                    </div>
                  )}
                  
                  <div className="form-group">
                    <label>Verification Code</label>
                    <input
                      type="text"
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').substring(0, 6))}
                      placeholder="123456"
                      maxLength={6}
                      pattern="[0-9]*"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      required
                    />
                  </div>
                  
                  <div className="setup-actions">
                    <button 
                      className="cancel-btn"
                      onClick={cancelSetup}
                      disabled={loading}
                    >
                      Cancel
                    </button>
                    <button 
                      className="verify-btn"
                      onClick={handleVerifyFactor}
                      disabled={loading || verificationCode.length !== 6}
                    >
                      {loading ? 'Verifying...' : 'Verify'}
                    </button>
                  </div>
                </div>
              )}
              
              {setupStep === 3 && (
                <div className="setup-step">
                  <div className="setup-success">
                    <div className="success-icon">✅</div>
                    <h3>Two-Factor Authentication Enabled</h3>
                    <p>Your account is now more secure. You'll be asked for a verification code when signing in.</p>
                    
                    <div className="recovery-info">
                      <h4>Important: Save Your Recovery Codes</h4>
                      <p>If you lose access to your authentication device, you'll need these codes to sign in.</p>
                      
                      <div className="recovery-codes">
                        <code>ABCD-1234-EFGH-5678</code>
                        <code>IJKL-9012-MNOP-3456</code>
                        <code>QRST-7890-UVWX-1234</code>
                      </div>
                      
                      <button className="download-codes-btn">
                        Download Recovery Codes
                      </button>
                    </div>
                    
                    <button 
                      className="done-btn"
                      onClick={() => setShowSetup(false)}
                    >
                      Done
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <style>{`
        .two-factor-modal {
          background: white;
          border-radius: 24px;
          max-width: 600px;
          width: 90vw;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 25px 50px -12px rgb(0 0 0 / 0.25);
          border: 1px solid #e2e8f0;
        }

        .modal-content {
          padding: 2rem;
        }

        .factors-header {
          text-align: center;
          margin-bottom: 2rem;
        }

        .factors-header h3 {
          color: #374151;
          margin-bottom: 0.5rem;
        }

        .factors-header p {
          color: #6b7280;
        }

        .loading-spinner-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 2rem;
        }

        .loading-spinner {
          width: 40px;
          height: 40px;
          border: 3px solid #e5e7eb;
          border-top: 3px solid #3b82f6;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 1rem;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .no-factors {
          text-align: center;
          padding: 2rem;
          background: #f9fafb;
          border-radius: 12px;
          border: 1px dashed #d1d5db;
        }

        .no-factors-icon {
          font-size: 3rem;
          margin-bottom: 1rem;
          opacity: 0.7;
        }

        .no-factors h4 {
          color: #374151;
          margin-bottom: 0.5rem;
        }

        .no-factors p {
          color: #6b7280;
          margin-bottom: 0;
        }

        .factors-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          margin-bottom: 2rem;
        }

        .factor-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem;
          background: #f9fafb;
          border-radius: 12px;
          border: 1px solid #e5e7eb;
        }

        .factor-info {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .factor-icon {
          font-size: 1.5rem;
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #e0f2fe;
          border-radius: 50%;
          color: #0284c7;
        }

        .factor-details h4 {
          margin: 0 0 0.25rem 0;
          color: #374151;
        }

        .factor-meta {
          display: flex;
          gap: 1rem;
          font-size: 0.875rem;
        }

        .factor-type {
          color: #6b7280;
        }

        .disable-factor-btn {
          background: #f3f4f6;
          color: #ef4444;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          padding: 0.5rem 1rem;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .disable-factor-btn:hover {
          background: #fee2e2;
          border-color: #fecaca;
        }

        .setup-2fa-btn {
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
          color: white;
          border: none;
          border-radius: 12px;
          padding: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          width: 100%;
          margin-top: 1rem;
        }

        .setup-2fa-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1);
        }

        .setup-2fa-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .setup-step h3 {
          text-align: center;
          color: #374151;
          margin-bottom: 1.5rem;
        }

        .form-group {
          margin-bottom: 1.5rem;
        }

        .form-group label {
          display: block;
          font-weight: 600;
          color: #374151;
          margin-bottom: 0.5rem;
          font-size: 0.875rem;
        }

        .form-group input {
          width: 100%;
          padding: 0.75rem 1rem;
          border: 2px solid #e5e7eb;
          border-radius: 8px;
          font-size: 1rem;
          transition: all 0.2s ease;
        }

        .form-group input:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .form-group small {
          display: block;
          color: #6b7280;
          font-size: 0.75rem;
          margin-top: 0.25rem;
        }

        .factor-type-options {
          display: flex;
          gap: 1rem;
          margin-bottom: 1rem;
        }

        .factor-type-option {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 1.5rem 1rem;
          background: #f9fafb;
          border: 2px solid #e5e7eb;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .factor-type-option:hover {
          background: #f3f4f6;
          transform: translateY(-2px);
        }

        .factor-type-option.selected {
          background: #eff6ff;
          border-color: #3b82f6;
        }

        .option-icon {
          font-size: 2rem;
          margin-bottom: 1rem;
        }

        .option-info {
          text-align: center;
        }

        .option-info h4 {
          margin: 0 0 0.5rem 0;
          color: #374151;
        }

        .option-info p {
          margin: 0;
          color: #6b7280;
          font-size: 0.875rem;
        }

        .setup-actions {
          display: flex;
          gap: 1rem;
          margin-top: 2rem;
        }

        .cancel-btn {
          flex: 1;
          background: #f3f4f6;
          color: #6b7280;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          padding: 0.75rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .cancel-btn:hover:not(:disabled) {
          background: #e5e7eb;
        }

        .continue-btn, .verify-btn, .done-btn {
          flex: 1;
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
          color: white;
          border: none;
          border-radius: 8px;
          padding: 0.75rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .continue-btn:hover:not(:disabled),
        .verify-btn:hover:not(:disabled),
        .done-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
        }

        .continue-btn:disabled,
        .verify-btn:disabled,
        .done-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .totp-setup {
          display: flex;
          flex-direction: column;
          align-items: center;
          margin-bottom: 2rem;
        }

        .qr-code-container {
          background: white;
          padding: 1rem;
          border-radius: 12px;
          border: 1px solid #e5e7eb;
          margin-bottom: 1.5rem;
        }

        .qr-code {
          width: 200px;
          height: 200px;
        }

        .manual-entry {
          text-align: center;
          margin-bottom: 1.5rem;
        }

        .manual-entry p {
          margin-bottom: 0.5rem;
          color: #6b7280;
        }

        .secret-key {
          font-family: monospace;
          background: #f3f4f6;
          padding: 0.5rem 1rem;
          border-radius: 6px;
          font-size: 1.125rem;
          letter-spacing: 0.05em;
          color: #374151;
          user-select: all;
        }

        .setup-instructions {
          align-self: flex-start;
          color: #6b7280;
          padding-left: 1.5rem;
          margin-bottom: 0;
        }

        .setup-instructions li {
          margin-bottom: 0.5rem;
        }

        .sms-setup {
          text-align: center;
          margin-bottom: 2rem;
        }

        .sms-setup p {
          color: #6b7280;
          margin-bottom: 0.5rem;
        }

        .phone-display {
          font-size: 1.25rem;
          font-weight: 600;
          color: #374151;
          margin-bottom: 1.5rem;
        }

        .setup-success {
          text-align: center;
        }

        .success-icon {
          font-size: 4rem;
          color: #10b981;
          margin-bottom: 1rem;
        }

        .setup-success h3 {
          color: #10b981;
        }

        .setup-success p {
          color: #6b7280;
          margin-bottom: 2rem;
        }

        .recovery-info {
          background: #fffbeb;
          border: 1px solid #fcd34d;
          border-radius: 12px;
          padding: 1.5rem;
          margin-bottom: 2rem;
          text-align: left;
        }

        .recovery-info h4 {
          color: #92400e;
          margin-bottom: 0.5rem;
        }

        .recovery-info p {
          color: #92400e;
          margin-bottom: 1rem;
        }

        .recovery-codes {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          margin-bottom: 1.5rem;
        }

        .recovery-codes code {
          font-family: monospace;
          background: white;
          padding: 0.5rem;
          border-radius: 6px;
          border: 1px solid #fcd34d;
          font-size: 1rem;
          letter-spacing: 0.1em;
          color: #92400e;
          text-align: center;
          user-select: all;
        }

        .download-codes-btn {
          background: #f59e0b;
          color: white;
          border: none;
          border-radius: 8px;
          padding: 0.75rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          width: 100%;
        }

        .download-codes-btn:hover {
          background: #d97706;
        }

        .done-btn {
          width: 100%;
        }

        .error-message {
          background: #fee2e2;
          border: 1px solid #fecaca;
          color: #b91c1c;
          padding: 1rem;
          border-radius: 8px;
          margin-bottom: 1.5rem;
        }

        .success-message {
          background: #d1fae5;
          border: 1px solid #a7f3d0;
          color: #065f46;
          padding: 1rem;
          border-radius: 8px;
          margin-bottom: 1.5rem;
        }

        @media (max-width: 640px) {
          .factor-type-options {
            flex-direction: column;
          }
          
          .setup-actions {
            flex-direction: column;
          }
          
          .qr-code {
            width: 150px;
            height: 150px;
          }
        }
      `}</style>
    </div>
  );
};

export default TwoFactorAuth;