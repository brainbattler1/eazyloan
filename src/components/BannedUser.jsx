import React from 'react';
import './BannedUser.css';

const BannedUser = ({ onSignOut }) => {
  return (
    <div className="banned-user-container">
      <div className="banned-user-content">
        <div className="banned-icon">🚫</div>
        <h1 className="banned-title">Account Suspended</h1>
        <p className="banned-message">
          Your account has been suspended and you no longer have access to this platform.
          If you believe this is an error, please contact our support team.
        </p>
        <div className="banned-actions">
          <button 
            onClick={onSignOut}
            className="btn-sign-out"
          >
            Sign Out
          </button>
          <a 
            href="mailto:support@eazy-loans.com" 
            className="btn-contact-support"
          >
            Contact Support
          </a>
        </div>
        <div className="banned-footer">
          <p>Thank you for your understanding.</p>
        </div>
      </div>
    </div>
  );
};

export default BannedUser;