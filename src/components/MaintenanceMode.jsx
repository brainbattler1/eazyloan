import React from 'react';
import './MaintenanceMode.css';

const MaintenanceMode = ({ message, onSignOut }) => {
  return (
    <div className="maintenance-container">
      <div className="maintenance-content">
        <div className="maintenance-icon">
          <svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="60" cy="60" r="60" fill="#f59e0b" fillOpacity="0.1"/>
            <circle cx="60" cy="60" r="45" fill="#f59e0b" fillOpacity="0.2"/>
            <circle cx="60" cy="60" r="30" fill="#f59e0b"/>
            <path d="M50 50h20v4H50v-4zm0 8h20v4H50v-4zm0 8h15v4H50v-4z" fill="white"/>
            <path d="M45 35l30 15-30 15V35z" fill="white"/>
          </svg>
        </div>
        
        <div className="maintenance-header">
          <h1>🔧 Under Maintenance</h1>
          <p className="maintenance-subtitle">We're making improvements to serve you better</p>
        </div>
        
        <div className="maintenance-message">
          <p>{message || 'The application is currently under maintenance. Please check back later.'}</p>
        </div>
        
        <div className="maintenance-details">
          <div className="detail-item">
            <span className="detail-icon">⏰</span>
            <span className="detail-text">Estimated downtime: Minimal</span>
          </div>
          <div className="detail-item">
            <span className="detail-icon">🔄</span>
            <span className="detail-text">Status: In Progress</span>
          </div>
          <div className="detail-item">
            <span className="detail-icon">📧</span>
            <span className="detail-text">Contact: support@eazyloan.com</span>
          </div>
        </div>
        
        <div className="maintenance-actions">
          <button 
            onClick={() => window.location.reload()}
            className="refresh-btn"
          >
            <span className="btn-icon">🔄</span>
            <span className="btn-text">Refresh Page</span>
          </button>
          
          {onSignOut && (
            <button 
              onClick={onSignOut}
              className="signout-btn"
            >
              <span className="btn-icon">🚪</span>
              <span className="btn-text">Sign Out</span>
            </button>
          )}
        </div>
        
        <div className="maintenance-footer">
          <div className="brand-info">
            <div className="brand-logo">
              <svg width="40" height="40" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="30" cy="30" r="30" fill="#4F46E5"/>
                <path d="M20 25h20v3H20v-3zm0 6h20v3H20v-3zm0 6h15v3H20v-3z" fill="white"/>
                <circle cx="45" cy="15" r="8" fill="#10B981"/>
                <path d="M42 15l2 2 4-4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className="brand-name">EazyLoan</span>
          </div>
          <p className="footer-text">Thank you for your patience while we improve our services.</p>
        </div>
      </div>
      
      {/* Animated background elements */}
      <div className="maintenance-bg">
        <div className="floating-element element-1">🔧</div>
        <div className="floating-element element-2">⚙️</div>
        <div className="floating-element element-3">🛠️</div>
        <div className="floating-element element-4">🔩</div>
        <div className="floating-element element-5">⚡</div>
      </div>
    </div>
  );
};

export default MaintenanceMode;