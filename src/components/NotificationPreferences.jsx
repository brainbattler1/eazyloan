import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';
import { useAuth } from '../contexts/AuthContext';
import './NotificationPreferences.css';

const NotificationPreferences = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState({
    email_notifications: true,
    push_notifications: true,
    sms_notifications: false,
    loan_updates: true,
    system_announcements: true,
    security_alerts: true,
    marketing: false
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Fetch user preferences
  const fetchPreferences = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw error;
      }
      
      if (data) {
        setPreferences({
          email_notifications: data.email_notifications ?? true,
          push_notifications: data.push_notifications ?? true,
          sms_notifications: data.sms_notifications ?? false,
          loan_updates: data.loan_updates ?? true,
          system_announcements: data.system_announcements ?? true,
          security_alerts: data.security_alerts ?? true,
          marketing: data.marketing ?? false
        });
      }
    } catch (err) {
      console.error('Error fetching notification preferences:', err);
      setMessage({ type: 'error', text: 'Failed to load preferences' });
    } finally {
      setLoading(false);
    }
  };

  // Save preferences
  const savePreferences = async () => {
    if (!user) return;
    
    setSaving(true);
    setMessage({ type: '', text: '' });
    
    try {
      const { error } = await supabase
        .from('notification_preferences')
        .upsert({
          user_id: user.id,
          ...preferences,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });
      
      if (error) throw error;
      
      setMessage({ type: 'success', text: 'Preferences saved successfully!' });
      
      // Clear message after 3 seconds
      setTimeout(() => {
        setMessage({ type: '', text: '' });
      }, 3000);
    } catch (err) {
      console.error('Error saving notification preferences:', err);
      setMessage({ type: 'error', text: 'Failed to save preferences' });
    } finally {
      setSaving(false);
    }
  };

  // Handle preference change
  const handlePreferenceChange = (key, value) => {
    setPreferences(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // Load preferences when component mounts
  useEffect(() => {
    if (isOpen && user) {
      fetchPreferences();
    }
  }, [isOpen, user]);

  if (!isOpen) return null;

  return (
    <div className="notification-preferences-overlay">
      <div className="notification-preferences-modal">
        <div className="modal-header">
          <h2>Notification Preferences</h2>
          <button 
            className="close-btn"
            onClick={onClose}
            aria-label="Close"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path 
                d="M18 6L6 18M6 6l12 12" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>

        <div className="modal-content">
          {loading ? (
            <div className="loading-state">
              <div className="loading-spinner"></div>
              <span>Loading preferences...</span>
            </div>
          ) : (
            <>
              {message.text && (
                <div className={`message ${message.type}`}>
                  {message.text}
                </div>
              )}

              <div className="preferences-section">
                <h3>Delivery Methods</h3>
                <p className="section-description">
                  Choose how you want to receive notifications
                </p>
                
                <div className="preference-item">
                  <div className="preference-info">
                    <label htmlFor="email_notifications">Email Notifications</label>
                    <span className="preference-description">
                      Receive notifications via email
                    </span>
                  </div>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      id="email_notifications"
                      checked={preferences.email_notifications}
                      onChange={(e) => handlePreferenceChange('email_notifications', e.target.checked)}
                    />
                    <span className="slider"></span>
                  </label>
                </div>

                <div className="preference-item">
                  <div className="preference-info">
                    <label htmlFor="push_notifications">Push Notifications</label>
                    <span className="preference-description">
                      Receive browser push notifications
                    </span>
                  </div>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      id="push_notifications"
                      checked={preferences.push_notifications}
                      onChange={(e) => handlePreferenceChange('push_notifications', e.target.checked)}
                    />
                    <span className="slider"></span>
                  </label>
                </div>

                <div className="preference-item">
                  <div className="preference-info">
                    <label htmlFor="sms_notifications">SMS Notifications</label>
                    <span className="preference-description">
                      Receive notifications via text message
                    </span>
                  </div>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      id="sms_notifications"
                      checked={preferences.sms_notifications}
                      onChange={(e) => handlePreferenceChange('sms_notifications', e.target.checked)}
                    />
                    <span className="slider"></span>
                  </label>
                </div>
              </div>

              <div className="preferences-section">
                <h3>Notification Types</h3>
                <p className="section-description">
                  Choose what types of notifications you want to receive
                </p>
                
                <div className="preference-item">
                  <div className="preference-info">
                    <label htmlFor="loan_updates">Loan Updates</label>
                    <span className="preference-description">
                      Status changes, approvals, and loan-related updates
                    </span>
                  </div>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      id="loan_updates"
                      checked={preferences.loan_updates}
                      onChange={(e) => handlePreferenceChange('loan_updates', e.target.checked)}
                    />
                    <span className="slider"></span>
                  </label>
                </div>

                <div className="preference-item">
                  <div className="preference-info">
                    <label htmlFor="system_announcements">System Announcements</label>
                    <span className="preference-description">
                      Important updates and maintenance notifications
                    </span>
                  </div>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      id="system_announcements"
                      checked={preferences.system_announcements}
                      onChange={(e) => handlePreferenceChange('system_announcements', e.target.checked)}
                    />
                    <span className="slider"></span>
                  </label>
                </div>

                <div className="preference-item">
                  <div className="preference-info">
                    <label htmlFor="security_alerts">Security Alerts</label>
                    <span className="preference-description">
                      Login attempts, password changes, and security updates
                    </span>
                  </div>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      id="security_alerts"
                      checked={preferences.security_alerts}
                      onChange={(e) => handlePreferenceChange('security_alerts', e.target.checked)}
                    />
                    <span className="slider"></span>
                  </label>
                </div>

                <div className="preference-item">
                  <div className="preference-info">
                    <label htmlFor="marketing">Marketing & Promotions</label>
                    <span className="preference-description">
                      Special offers, product updates, and promotional content
                    </span>
                  </div>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      id="marketing"
                      checked={preferences.marketing}
                      onChange={(e) => handlePreferenceChange('marketing', e.target.checked)}
                    />
                    <span className="slider"></span>
                  </label>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="modal-footer">
          <button 
            className="cancel-btn"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </button>
          <button 
            className="save-btn"
            onClick={savePreferences}
            disabled={loading || saving}
          >
            {saving ? (
              <>
                <div className="btn-spinner"></div>
                Saving...
              </>
            ) : (
              'Save Preferences'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotificationPreferences;