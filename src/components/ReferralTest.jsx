import React, { useState, useEffect } from 'react';
import { generateTestReferralCode, createTestReferralUrl, extractReferralCode } from '../utils/referralUtils';
import './ReferralTest.css';

const ReferralTest = () => {
  const [testUrl, setTestUrl] = useState('');
  const [currentRef, setCurrentRef] = useState('');
  const [testResults, setTestResults] = useState([]);

  useEffect(() => {
    // Check if there's a referral code in current URL
    const refCode = extractReferralCode();
    setCurrentRef(refCode || 'None');
  }, []);

  const generateTestUrl = () => {
    const url = createTestReferralUrl();
    setTestUrl(url);
    addTestResult('Generated test URL', url, 'success');
  };

  const testUrlNavigation = () => {
    if (testUrl) {
      window.open(testUrl, '_blank');
      addTestResult('Opened test URL', testUrl, 'info');
    }
  };

  const testDomainConfiguration = () => {
    const envDomain = import.meta.env.VITE_APP_DOMAIN;
    const currentOrigin = window.location.origin;
    
    addTestResult('Environment Domain', envDomain || 'Not set', envDomain ? 'success' : 'warning');
    addTestResult('Current Origin', currentOrigin, 'info');
    
    if (envDomain === 'https://eazy-loans.com') {
      addTestResult('Domain Configuration', 'Correctly set to eazy-loans.com', 'success');
    } else {
      addTestResult('Domain Configuration', 'Not set to eazy-loans.com', 'warning');
    }
  };

  const addTestResult = (test, result, type) => {
    const timestamp = new Date().toLocaleTimeString();
    setTestResults(prev => [...prev, { test, result, type, timestamp }]);
  };

  const clearResults = () => {
    setTestResults([]);
  };

  return (
    <div className="referral-test">
      <div className="test-header">
        <h2>🧪 Referral System Test</h2>
        <p>Test and verify the referral system functionality</p>
      </div>

      <div className="test-section">
        <h3>Current Status</h3>
        <div className="status-grid">
          <div className="status-item">
            <label>Current Referral Code:</label>
            <span className={currentRef === 'None' ? 'no-ref' : 'has-ref'}>
              {currentRef}
            </span>
          </div>
          <div className="status-item">
            <label>Environment Domain:</label>
            <span>{import.meta.env.VITE_APP_DOMAIN || 'Not set'}</span>
          </div>
        </div>
      </div>

      <div className="test-section">
        <h3>Test Actions</h3>
        <div className="test-buttons">
          <button onClick={generateTestUrl} className="test-btn primary">
            Generate Test URL
          </button>
          <button 
            onClick={testUrlNavigation} 
            className="test-btn secondary"
            disabled={!testUrl}
          >
            Open Test URL
          </button>
          <button onClick={testDomainConfiguration} className="test-btn info">
            Check Domain Config
          </button>
          <button onClick={clearResults} className="test-btn danger">
            Clear Results
          </button>
        </div>
      </div>

      {testUrl && (
        <div className="test-section">
          <h3>Generated Test URL</h3>
          <div className="url-display">
            <input 
              type="text" 
              value={testUrl} 
              readOnly 
              className="url-input"
            />
            <button 
              onClick={() => navigator.clipboard.writeText(testUrl)}
              className="copy-btn"
            >
              📋 Copy
            </button>
          </div>
        </div>
      )}

      <div className="test-section">
        <h3>Test Results</h3>
        <div className="results-container">
          {testResults.length === 0 ? (
            <p className="no-results">No test results yet. Run some tests above!</p>
          ) : (
            <div className="results-list">
              {testResults.map((result, index) => (
                <div key={index} className={`result-item ${result.type}`}>
                  <div className="result-header">
                    <span className="result-test">{result.test}</span>
                    <span className="result-time">{result.timestamp}</span>
                  </div>
                  <div className="result-value">{result.result}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="test-section">
        <h3>Instructions</h3>
        <ol className="instructions">
          <li>Click "Generate Test URL" to create a test referral link</li>
          <li>Click "Open Test URL" to test the referral flow in a new tab</li>
          <li>Check that the ReferralSignup component shows correctly</li>
          <li>Verify the domain is set to "eazy-loans.com"</li>
          <li>Test the complete signup flow with referral tracking</li>
        </ol>
      </div>
    </div>
  );
};

export default ReferralTest;