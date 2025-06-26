import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../utils/supabase';
import TwoFactorAuth from './TwoFactorAuth';

const ProfileModal = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [showTwoFactorModal, setShowTwoFactorModal] = useState(false);
  
  const [profileData, setProfileData] = useState({
    firstName: '',
    lastName: '',
    middleName: '',
    username: '',
    email: user?.email || '',
    profilePictureUrl: ''
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (isOpen && user) {
      fetchUserProfile();
    }
  }, [isOpen, user]);

  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      
      // Get user profile
      const { data: profileResult, error: profileError } = await supabase
        .rpc('get_user_profile', { check_user_id: user.id });

      if (profileError) {
        console.error('Profile fetch error:', profileError);
        return;
      }

      if (profileResult && profileResult.length > 0) {
        const profile = profileResult[0];
        setProfileData({
          firstName: profile.first_name || '',
          lastName: profile.last_name || '',
          middleName: profile.middle_name || '',
          username: profile.username || '',
          email: user.email || '',
          profilePictureUrl: profile.profile_picture_url || ''
        });
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      setMessage({ type: 'error', text: 'Failed to load profile data' });
    } finally {
      setLoading(false);
    }
  };

  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfileData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear field error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear field error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateProfile = () => {
    const newErrors = {};
    
    if (!profileData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }
    
    if (!profileData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }
    
    if (!profileData.username.trim()) {
      newErrors.username = 'Username is required';
    } else if (profileData.username.trim().length < 3) {
      newErrors.username = 'Username must be at least 3 characters';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validatePassword = () => {
    const newErrors = {};
    
    if (!passwordData.currentPassword) {
      newErrors.currentPassword = 'Current password is required';
    }
    
    if (!passwordData.newPassword) {
      newErrors.newPassword = 'New password is required';
    } else if (passwordData.newPassword.length < 6) {
      newErrors.newPassword = 'Password must be at least 6 characters';
    }
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateProfile()) {
      return;
    }
    
    try {
      setLoading(true);
      setMessage({ type: '', text: '' });
      
      // Update user profile
      const { error } = await supabase
        .rpc('update_user_profile', {
          profile_user_id: user.id,
          profile_first_name: profileData.firstName.trim(),
          profile_last_name: profileData.lastName.trim(),
          profile_middle_name: profileData.middleName.trim() || null,
          profile_username: profileData.username.trim()
        });

      if (error) {
        throw error;
      }

      setMessage({ type: 'success', text: 'Profile updated successfully!' });
      
      // Refresh profile data
      await fetchUserProfile();
      
    } catch (error) {
      console.error('Profile update error:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to update profile' });
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    
    if (!validatePassword()) {
      return;
    }
    
    try {
      setLoading(true);
      setMessage({ type: '', text: '' });
      
      // Update password using Supabase auth
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword
      });

      if (error) {
        throw error;
      }

      setMessage({ type: 'success', text: 'Password updated successfully!' });
      
      // Clear password form
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      
    } catch (error) {
      console.error('Password update error:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to update password' });
    } finally {
      setLoading(false);
    }
  };

  const handleProfilePictureUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setMessage({ type: 'error', text: 'Please select an image file' });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'Image must be less than 5MB' });
      return;
    }

    try {
      setUploading(true);
      setMessage({ type: '', text: '' });

      // Create file path
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/profile.${fileExt}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('profile-pictures')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('profile-pictures')
        .getPublicUrl(fileName);

      // Update profile with new picture URL
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({ 
          profile_picture_url: publicUrl,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (updateError) {
        throw updateError;
      }

      // Update local state
      setProfileData(prev => ({
        ...prev,
        profilePictureUrl: publicUrl
      }));

      setMessage({ type: 'success', text: 'Profile picture updated successfully!' });

    } catch (error) {
      console.error('Profile picture upload error:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to upload profile picture' });
    } finally {
      setUploading(false);
    }
  };

  const getInitials = () => {
    const firstName = profileData.firstName || user?.email?.charAt(0) || 'U';
    const lastName = profileData.lastName || '';
    return (firstName.charAt(0) + lastName.charAt(0)).toUpperCase();
  };

  const openTwoFactorModal = () => {
    setShowTwoFactorModal(true);
  };

  const closeTwoFactorModal = () => {
    setShowTwoFactorModal(false);
  };

  if (!isOpen) return null;

  return (
    <div className="profile-modal-overlay" onClick={onClose}>
      <div className="profile-modal" onClick={(e) => e.stopPropagation()}>
        <div className="profile-modal-header">
          <h2 className="profile-modal-title">
            👤 My Profile
          </h2>
          <button className="profile-close-btn" onClick={onClose}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        <div className="profile-modal-content">
          {/* Profile Picture Section */}
          <div className="profile-picture-section">
            <div className="profile-picture-container">
              <div className="profile-picture">
                {profileData.profilePictureUrl ? (
                  <img src={profileData.profilePictureUrl} alt="Profile" />
                ) : (
                  getInitials()
                )}
                <div className="profile-picture-overlay" onClick={() => document.getElementById('profile-picture-upload').click()}>
                  <div className="upload-icon">📷</div>
                </div>
              </div>
              <input
                type="file"
                id="profile-picture-upload"
                className="profile-picture-upload"
                accept="image/*"
                onChange={handleProfilePictureUpload}
                disabled={uploading}
              />
            </div>
            {uploading && (
              <div className="upload-progress">
                Uploading profile picture...
              </div>
            )}
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', margin: 0 }}>
              Click on your profile picture to change it
            </p>
          </div>

          {/* Message Display */}
          {message.text && (
            <div className={message.type === 'success' ? 'success-message' : 'error-message'}>
              {message.text}
            </div>
          )}

          {/* Tabs */}
          <div className="profile-tabs">
            <button 
              className={`profile-tab ${activeTab === 'profile' ? 'active' : ''}`}
              onClick={() => setActiveTab('profile')}
            >
              📝 Profile Info
            </button>
            <button 
              className={`profile-tab ${activeTab === 'password' ? 'active' : ''}`}
              onClick={() => setActiveTab('password')}
            >
              🔒 Change Password
            </button>
            <button 
              className={`profile-tab ${activeTab === 'security' ? 'active' : ''}`}
              onClick={() => setActiveTab('security')}
            >
              🛡️ Security
            </button>
          </div>

          {/* Tab Content */}
          <div className="profile-tab-content">
            {activeTab === 'profile' && (
              <form onSubmit={handleProfileSubmit} className="profile-form">
                <div className="profile-form-row">
                  <div className="profile-form-group">
                    <label htmlFor="firstName">First Name *</label>
                    <input
                      type="text"
                      id="firstName"
                      name="firstName"
                      value={profileData.firstName}
                      onChange={handleProfileChange}
                      className={errors.firstName ? 'error' : ''}
                      placeholder="John"
                      required
                    />
                    {errors.firstName && (
                      <span className="field-error">{errors.firstName}</span>
                    )}
                  </div>
                  
                  <div className="profile-form-group">
                    <label htmlFor="lastName">Last Name *</label>
                    <input
                      type="text"
                      id="lastName"
                      name="lastName"
                      value={profileData.lastName}
                      onChange={handleProfileChange}
                      className={errors.lastName ? 'error' : ''}
                      placeholder="Doe"
                      required
                    />
                    {errors.lastName && (
                      <span className="field-error">{errors.lastName}</span>
                    )}
                  </div>
                </div>

                <div className="profile-form-group">
                  <label htmlFor="middleName">Middle Name</label>
                  <input
                    type="text"
                    id="middleName"
                    name="middleName"
                    value={profileData.middleName}
                    onChange={handleProfileChange}
                    placeholder="Optional"
                  />
                </div>

                <div className="profile-form-group">
                  <label htmlFor="username">Username *</label>
                  <input
                    type="text"
                    id="username"
                    name="username"
                    value={profileData.username}
                    onChange={handleProfileChange}
                    className={errors.username ? 'error' : ''}
                    placeholder="johndoe123"
                    required
                  />
                  {errors.username && (
                    <span className="field-error">{errors.username}</span>
                  )}
                </div>

                <div className="profile-form-group">
                  <label htmlFor="email">Email Address</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={profileData.email}
                    disabled
                    style={{ 
                      background: 'var(--bg-secondary)', 
                      color: 'var(--text-muted)',
                      cursor: 'not-allowed'
                    }}
                  />
                  <small className="field-hint">Email cannot be changed from here</small>
                </div>

                <div className="profile-form-actions">
                  <button type="button" className="profile-cancel-btn" onClick={onClose}>
                    Cancel
                  </button>
                  <button type="submit" className="profile-save-btn" disabled={loading}>
                    {loading ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            )}

            {activeTab === 'password' && (
              <div>
                <div className="password-change-section">
                  <h4>🔒 Change Your Password</h4>
                  <p style={{ color: '#92400e', fontSize: '0.875rem', margin: 0 }}>
                    Choose a strong password to keep your account secure
                  </p>
                </div>

                <form onSubmit={handlePasswordSubmit} className="profile-form">
                  <div className="profile-form-group">
                    <label htmlFor="currentPassword">Current Password *</label>
                    <input
                      type="password"
                      id="currentPassword"
                      name="currentPassword"
                      value={passwordData.currentPassword}
                      onChange={handlePasswordChange}
                      className={errors.currentPassword ? 'error' : ''}
                      placeholder="Enter current password"
                      required
                    />
                    {errors.currentPassword && (
                      <span className="field-error">{errors.currentPassword}</span>
                    )}
                  </div>

                  <div className="profile-form-group">
                    <label htmlFor="newPassword">New Password *</label>
                    <input
                      type="password"
                      id="newPassword"
                      name="newPassword"
                      value={passwordData.newPassword}
                      onChange={handlePasswordChange}
                      className={errors.newPassword ? 'error' : ''}
                      placeholder="Enter new password"
                      minLength={6}
                      required
                    />
                    {errors.newPassword && (
                      <span className="field-error">{errors.newPassword}</span>
                    )}
                    <small className="field-hint">Minimum 6 characters</small>
                  </div>

                  <div className="profile-form-group">
                    <label htmlFor="confirmPassword">Confirm New Password *</label>
                    <input
                      type="password"
                      id="confirmPassword"
                      name="confirmPassword"
                      value={passwordData.confirmPassword}
                      onChange={handlePasswordChange}
                      className={errors.confirmPassword ? 'error' : ''}
                      placeholder="Confirm new password"
                      minLength={6}
                      required
                    />
                    {errors.confirmPassword && (
                      <span className="field-error">{errors.confirmPassword}</span>
                    )}
                  </div>

                  <div className="profile-form-actions">
                    <button type="button" className="profile-cancel-btn" onClick={onClose}>
                      Cancel
                    </button>
                    <button type="submit" className="profile-save-btn" disabled={loading}>
                      {loading ? 'Updating...' : 'Update Password'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {activeTab === 'security' && (
              <div className="security-tab">
                <div className="security-header">
                  <h4>🛡️ Account Security</h4>
                  <p>Enhance your account security with additional verification methods</p>
                </div>

                <div className="security-options">
                  <div className="security-option">
                    <div className="option-icon">🔐</div>
                    <div className="option-details">
                      <h4>Two-Factor Authentication</h4>
                      <p>Add an extra layer of security to your account by requiring a second verification step when signing in.</p>
                      <button 
                        className="setup-2fa-btn"
                        onClick={openTwoFactorModal}
                      >
                        Manage Two-Factor Authentication
                      </button>
                    </div>
                  </div>

                  <div className="security-option">
                    <div className="option-icon">📱</div>
                    <div className="option-details">
                      <h4>Trusted Devices</h4>
                      <p>Manage the devices that are allowed to access your account without additional verification.</p>
                      <button className="trusted-devices-btn">
                        Manage Trusted Devices
                      </button>
                    </div>
                  </div>

                  <div className="security-option">
                    <div className="option-icon">🔔</div>
                    <div className="option-details">
                      <h4>Security Alerts</h4>
                      <p>Get notified about important security events related to your account.</p>
                      <div className="toggle-container">
                        <label className="toggle">
                          <input type="checkbox" defaultChecked />
                          <span className="toggle-slider"></span>
                        </label>
                        <span>Enable security alerts</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="security-info">
                  <h4>📊 Security Status</h4>
                  <div className="security-status">
                    <div className="status-item">
                      <div className="status-label">Password Strength</div>
                      <div className="status-value">
                        <div className="status-bar">
                          <div className="status-progress" style={{ width: '70%', backgroundColor: '#f59e0b' }}></div>
                        </div>
                        <span>Medium</span>
                      </div>
                    </div>
                    <div className="status-item">
                      <div className="status-label">Two-Factor Authentication</div>
                      <div className="status-value">
                        <span className="status-badge not-enabled">Not Enabled</span>
                      </div>
                    </div>
                    <div className="status-item">
                      <div className="status-label">Last Password Change</div>
                      <div className="status-value">
                        <span>Never</span>
                      </div>
                    </div>
                    <div className="status-item">
                      <div className="status-label">Account Email Verified</div>
                      <div className="status-value">
                        <span className="status-badge enabled">Verified</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {showTwoFactorModal && (
        <TwoFactorAuth onClose={closeTwoFactorModal} />
      )}

      <style>{`
        .profile-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 1rem;
        }

        .profile-modal {
          background: white;
          border-radius: 24px;
          max-width: 600px;
          width: 90vw;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 25px 50px -12px rgb(0 0 0 / 0.25);
          border: 1px solid #e2e8f0;
        }

        .profile-modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1.5rem 2rem;
          border-bottom: 1px solid #e2e8f0;
          background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
        }

        .profile-modal-title {
          font-size: 1.5rem;
          font-weight: 700;
          color: #1e293b;
          margin: 0;
        }

        .profile-close-btn {
          background: #f1f5f9;
          border: 1px solid #e2e8f0;
          color: #64748b;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s ease;
          font-size: 1.25rem;
          line-height: 1;
        }

        .profile-close-btn:hover {
          background: #ef4444;
          color: white;
          border-color: #ef4444;
        }

        .profile-modal-content {
          padding: 2rem;
        }

        .profile-picture-section {
          display: flex;
          flex-direction: column;
          align-items: center;
          margin-bottom: 2rem;
        }

        .profile-picture-container {
          position: relative;
          margin-bottom: 1rem;
        }

        .profile-picture {
          width: 100px;
          height: 100px;
          border-radius: 50%;
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: 700;
          font-size: 2rem;
          position: relative;
          overflow: hidden;
          border: 3px solid white;
          box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
        }

        .profile-picture img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .profile-picture-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          transition: opacity 0.2s ease;
          cursor: pointer;
          border-radius: 50%;
        }

        .profile-picture-container:hover .profile-picture-overlay {
          opacity: 1;
        }

        .upload-icon {
          color: white;
          font-size: 1.5rem;
        }

        .profile-picture-upload {
          display: none;
        }

        .upload-progress {
          margin-top: 0.5rem;
          font-size: 0.875rem;
          color: #3b82f6;
        }

        .profile-tabs {
          display: flex;
          background: #f1f5f9;
          border-radius: 12px;
          padding: 0.25rem;
          margin-bottom: 2rem;
        }

        .profile-tab {
          flex: 1;
          background: none;
          border: none;
          padding: 0.75rem;
          font-weight: 600;
          color: #64748b;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .profile-tab:hover {
          color: #3b82f6;
        }

        .profile-tab.active {
          background: white;
          color: #3b82f6;
          box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);
        }

        .profile-form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }

        .profile-form-group {
          margin-bottom: 1.5rem;
        }

        .profile-form-group label {
          display: block;
          font-weight: 600;
          color: #374151;
          margin-bottom: 0.5rem;
          font-size: 0.875rem;
        }

        .profile-form-group input {
          width: 100%;
          padding: 0.75rem 1rem;
          border: 2px solid #e5e7eb;
          border-radius: 8px;
          font-size: 1rem;
          transition: all 0.2s ease;
        }

        .profile-form-group input:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .profile-form-group input.error {
          border-color: #ef4444;
        }

        .field-error {
          display: block;
          color: #ef4444;
          font-size: 0.75rem;
          margin-top: 0.25rem;
        }

        .field-hint {
          display: block;
          color: #6b7280;
          font-size: 0.75rem;
          margin-top: 0.25rem;
        }

        .profile-form-actions {
          display: flex;
          gap: 1rem;
          margin-top: 2rem;
        }

        .profile-cancel-btn {
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

        .profile-cancel-btn:hover {
          background: #e5e7eb;
        }

        .profile-save-btn {
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

        .profile-save-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
        }

        .profile-save-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .password-change-section {
          margin-bottom: 1.5rem;
        }

        .password-change-section h4 {
          color: #374151;
          margin-bottom: 0.5rem;
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

        /* Security Tab Styles */
        .security-tab {
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }

        .security-header {
          text-align: center;
          margin-bottom: 1rem;
        }

        .security-header h4 {
          color: #374151;
          margin-bottom: 0.5rem;
        }

        .security-header p {
          color: #6b7280;
          margin: 0;
        }

        .security-options {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .security-option {
          display: flex;
          gap: 1.5rem;
          padding: 1.5rem;
          background: #f9fafb;
          border-radius: 12px;
          border: 1px solid #e5e7eb;
        }

        .option-icon {
          font-size: 2rem;
          width: 60px;
          height: 60px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #e0f2fe;
          border-radius: 12px;
          color: #0284c7;
          flex-shrink: 0;
        }

        .option-details {
          flex: 1;
        }

        .option-details h4 {
          color: #374151;
          margin: 0 0 0.5rem 0;
        }

        .option-details p {
          color: #6b7280;
          margin: 0 0 1rem 0;
          font-size: 0.875rem;
        }

        .setup-2fa-btn, .trusted-devices-btn {
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
          color: white;
          border: none;
          border-radius: 8px;
          padding: 0.75rem 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          font-size: 0.875rem;
        }

        .setup-2fa-btn:hover, .trusted-devices-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
        }

        .toggle-container {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .toggle {
          position: relative;
          display: inline-block;
          width: 48px;
          height: 24px;
        }

        .toggle input {
          opacity: 0;
          width: 0;
          height: 0;
        }

        .toggle-slider {
          position: absolute;
          cursor: pointer;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: #e5e7eb;
          transition: .4s;
          border-radius: 24px;
        }

        .toggle-slider:before {
          position: absolute;
          content: "";
          height: 18px;
          width: 18px;
          left: 3px;
          bottom: 3px;
          background-color: white;
          transition: .4s;
          border-radius: 50%;
        }

        .toggle input:checked + .toggle-slider {
          background-color: #3b82f6;
        }

        .toggle input:checked + .toggle-slider:before {
          transform: translateX(24px);
        }

        .security-info {
          background: #f8fafc;
          border-radius: 12px;
          padding: 1.5rem;
          border: 1px solid #e2e8f0;
        }

        .security-info h4 {
          color: #374151;
          margin: 0 0 1rem 0;
        }

        .security-status {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .status-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .status-label {
          font-weight: 500;
          color: #374151;
        }

        .status-value {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .status-bar {
          width: 100px;
          height: 8px;
          background: #e5e7eb;
          border-radius: 4px;
          overflow: hidden;
        }

        .status-progress {
          height: 100%;
          border-radius: 4px;
        }

        .status-badge {
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          font-size: 0.75rem;
          font-weight: 600;
        }

        .status-badge.enabled {
          background: #d1fae5;
          color: #065f46;
        }

        .status-badge.not-enabled {
          background: #fee2e2;
          color: #b91c1c;
        }

        @media (max-width: 640px) {
          .profile-form-row {
            grid-template-columns: 1fr;
          }
          
          .profile-form-actions {
            flex-direction: column;
          }
          
          .security-option {
            flex-direction: column;
            align-items: center;
            text-align: center;
          }
          
          .status-item {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.5rem;
          }
        }
      `}</style>
    </div>
  );
};

export default ProfileModal;