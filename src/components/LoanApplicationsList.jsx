import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';
import { useAuth } from '../contexts/AuthContext';
import { downloadApplicationPDF, uploadAndMarkPDFGenerated } from '../utils/pdfGenerator';
import './LoanApplicationsList.css';

const LoanApplicationsList = ({ onBack }) => {
  const { user } = useAuth();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    console.log('LoanApplicationsList mounted, user:', user);
    if (user) {
      fetchApplications();
    }
  }, [user]);

  // Auto-dismiss success message after 4 seconds
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => {
        setSuccessMessage('');
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  const showSuccessMessage = (message) => {
    setSuccessMessage(message);
  };

  const fetchApplications = async () => {
    try {
      setLoading(true);
      console.log('Fetching applications for user:', user.id);
      const { data, error } = await supabase
        .from('user_loan_applications')
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

  // Function to show application details in a modal
  const showApplicationDetailsModal = (details, fullData) => {
    // Create modal overlay
    const modalOverlay = document.createElement('div');
    modalOverlay.className = 'modal-overlay';
    modalOverlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.7);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 1000;
      backdrop-filter: blur(5px);
    `;

    // Create modal content
    const modalContent = document.createElement('div');
    modalContent.style.cssText = `
      background: white;
      border-radius: 12px;
      max-width: 600px;
      max-height: 80vh;
      width: 90%;
      overflow-y: auto;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
      position: relative;
    `;

    // Create modal header
    const modalHeader = document.createElement('div');
    modalHeader.style.cssText = `
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 20px;
      border-radius: 12px 12px 0 0;
      position: relative;
    `;
    modalHeader.innerHTML = `
      <h2 style="margin: 0; font-size: 1.5rem; font-weight: 600;">
        📋 Application Details
      </h2>
      <p style="margin: 5px 0 0 0; opacity: 0.9; font-size: 0.9rem;">
        ${fullData.application_number || 'Application Summary'}
      </p>
    `;

    // Create close button
    const closeButton = document.createElement('button');
    closeButton.innerHTML = '×';
    closeButton.style.cssText = `
      position: absolute;
      top: 15px;
      right: 20px;
      background: none;
      border: none;
      color: white;
      font-size: 2rem;
      cursor: pointer;
      padding: 0;
      width: 30px;
      height: 30px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      transition: background-color 0.2s;
    `;
    closeButton.onmouseover = () => closeButton.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
    closeButton.onmouseout = () => closeButton.style.backgroundColor = 'transparent';
    closeButton.onclick = () => document.body.removeChild(modalOverlay);

    // Create modal body
    const modalBody = document.createElement('div');
    modalBody.style.cssText = `
      padding: 25px;
      line-height: 1.6;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;

    // Format details with better styling
    const formattedContent = details.map(line => {
      if (line.includes('📋') || line.includes('👤') || line.includes('💼') || 
          line.includes('💰') || line.includes('👥') || line.includes('📄')) {
        return `<h3 style="color: #667eea; margin: 20px 0 10px 0; font-size: 1.1rem; font-weight: 600; border-bottom: 2px solid #f0f0f0; padding-bottom: 5px;">${line}</h3>`;
      } else if (line.startsWith('Reference')) {
        return `<h4 style="color: #764ba2; margin: 15px 0 5px 0; font-weight: 500;">${line}</h4>`;
      } else if (line.startsWith('  ')) {
        return `<div style="margin-left: 20px; color: #666; font-size: 0.95rem;">${line}</div>`;
      } else if (line.includes(':')) {
        const [label, value] = line.split(':');
        return `<div style="margin: 8px 0; display: flex; justify-content: space-between; align-items: center;"><span style="font-weight: 500; color: #333;">${label}:</span><span style="color: #666; text-align: right; max-width: 60%;">${value}</span></div>`;
      } else {
        return `<div style="margin: 5px 0; color: #666;">${line}</div>`;
      }
    }).join('');

    modalBody.innerHTML = formattedContent;

    // Assemble modal
    modalHeader.appendChild(closeButton);
    modalContent.appendChild(modalHeader);
    modalContent.appendChild(modalBody);
    modalOverlay.appendChild(modalContent);

    // Add click outside to close
    modalOverlay.onclick = (e) => {
      if (e.target === modalOverlay) {
        document.body.removeChild(modalOverlay);
      }
    };

    // Add to DOM
    document.body.appendChild(modalOverlay);

    // Add escape key listener
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        document.body.removeChild(modalOverlay);
        document.removeEventListener('keydown', handleEscape);
      }
    };
    document.addEventListener('keydown', handleEscape);
  };

  const handleViewDetails = async (application) => {
    try {
      console.log('Viewing details for application:', application);
      
      // Get comprehensive application data
      const { data: fullData, error } = await supabase
        .rpc('get_application_summary', { app_id: application.id });
      
      if (error) throw error;
      
      // Format comprehensive details with enhanced information
      const details = [
        `📋 APPLICATION INFORMATION`,
        `Application Number: ${fullData.application_number || 'N/A'}`,
        `Status: ${fullData.status?.toUpperCase() || 'N/A'}`,
        `Applied: ${new Date(fullData.created_at).toLocaleDateString('en-US', { 
          year: 'numeric', month: 'long', day: 'numeric', 
          hour: '2-digit', minute: '2-digit' 
        })}`,
        fullData.approval_date ? `Approved: ${new Date(fullData.approval_date).toLocaleDateString('en-US', { 
          year: 'numeric', month: 'long', day: 'numeric' 
        })}` : '',
        fullData.updated_at ? `Last Updated: ${new Date(fullData.updated_at).toLocaleDateString('en-US', { 
          year: 'numeric', month: 'long', day: 'numeric' 
        })}` : '',
        '',
        `👤 PERSONAL INFORMATION`,
        `Full Name: ${fullData.applicant_name || 'N/A'}`,
        `Email Address: ${fullData.email || 'N/A'}`,
        `National ID: ${fullData.id_number || 'N/A'}`,
        fullData.passport_number ? `Passport Number: ${fullData.passport_number}` : '',
        `Phone Number: ${fullData.phone_number || 'N/A'}`,
        fullData.address ? `Residential Address: ${fullData.address}` : '',
        fullData.date_of_birth ? `Date of Birth: ${new Date(fullData.date_of_birth).toLocaleDateString('en-US', { 
          year: 'numeric', month: 'long', day: 'numeric' 
        })}` : '',
        fullData.gender ? `Gender: ${fullData.gender}` : '',
        '',
        `💼 EMPLOYMENT & FINANCIAL INFORMATION`,
        `Employment Status: ${fullData.employment_status || 'N/A'}`,
        `Work Type: ${fullData.work_type || 'N/A'}`,
        fullData.employer_name ? `Employer: ${fullData.employer_name}` : '',
        fullData.employer_address ? `Employer Address: ${fullData.employer_address}` : '',
        `Monthly Income: ${formatCurrency(fullData.monthly_income || 0, fullData.currency)}`,
        fullData.credit_score ? `Credit Score: ${fullData.credit_score}` : '',
        '',
        `💰 LOAN DETAILS`,
        `Loan Amount: ${formatCurrency(fullData.loan_amount || 0, fullData.currency)}`,
        `Purpose: ${fullData.purpose || 'N/A'}`,
        `Loan Term: ${fullData.term_months || 'N/A'} months`,
        fullData.repayment_days ? `Repayment Period: ${fullData.repayment_days} days` : '',
        fullData.interest_rate ? `Interest Rate: ${fullData.interest_rate}%` : '',
        '',
        `👥 REFERENCES`,
        ...(fullData.references && fullData.references.length > 0 ? 
          fullData.references.map((ref, index) => {
            if (ref.name && ref.name.trim() !== ' ') {
              return [
                `Reference ${index + 1}:`,
                `  Name: ${ref.name}`,
                `  Phone: ${ref.phone || 'N/A'}`,
                `  Relationship: ${ref.relationship || 'N/A'}`,
                ''
              ].join('\n');
            }
            return '';
          }).filter(ref => ref !== '') : ['No references provided']),
        '',
        `📄 DOCUMENTS & FILES`,
        // Check if this is a legacy application
        ...((!fullData.id_card_front_url && !fullData.id_card_back_url && !fullData.passport_url) ? [
          `📋 Legacy application - documents not required at time of submission`
        ] : [
          `ID Card (Front): ${fullData.id_card_front_url ? '✅ Uploaded' : '❌ Not provided'}`,
          `ID Card (Back): ${fullData.id_card_back_url ? '✅ Uploaded' : '❌ Not provided'}`,
          `Passport Photo: ${fullData.passport_url ? '✅ Uploaded' : '❌ Not provided'}`
        ]),
        `Application PDF: ${application.pdf_generated ? '✅ Generated' : '❌ Not generated'}`,
        application.pdf_generated && application.pdf_generated_at ? 
          `PDF Generated: ${new Date(application.pdf_generated_at).toLocaleDateString('en-US', { 
            year: 'numeric', month: 'long', day: 'numeric', 
            hour: '2-digit', minute: '2-digit' 
          })}` : ''
      ].flat().filter(line => line !== '');
       
       // Create and show enhanced modal instead of alert
       showApplicationDetailsModal(details, fullData);
      
    } catch (error) {
      console.error('Error fetching application details:', error);
      // Fallback to basic details
      const basicDetails = [
        `Application Number: ${application.application_number || 'N/A'}`,
        `Applicant: ${application.applicant_name || 'N/A'}`,
        `Amount: ${formatCurrency(application.loan_amount || 0, application.currency)}`,
        `Status: ${application.status?.toUpperCase() || 'N/A'}`,
        `Purpose: ${application.purpose || 'N/A'}`
      ].join('\n');
      
      alert(`Application Details:\n\n${basicDetails}`);
    }
  };

  const handleGeneratePDF = async (application) => {
    try {
      console.log('Generating PDF for application:', application.id);
      
      // Show loading state
      const loadingMessage = 'Generating comprehensive PDF with all application details...';
      
      // Create a temporary loading indicator
      const originalButton = document.querySelector(`[data-app-id="${application.id}"] .generate-btn`);
      if (originalButton) {
        originalButton.disabled = true;
        originalButton.innerHTML = '<span class="action-icon">⏳</span>Generating...';
      }
      
      // Generate and upload PDF
      const pdfUrl = await uploadAndMarkPDFGenerated(application);
      
      // Refresh applications list to show updated PDF status
      await fetchApplications();
      
      showSuccessMessage('📋 PDF generated successfully! You can now download it from the actions menu.');
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF: ' + error.message);
      
      // Reset button state
      const originalButton = document.querySelector(`[data-app-id="${application.id}"] .generate-btn`);
      if (originalButton) {
        originalButton.disabled = false;
        originalButton.innerHTML = '<span class="action-icon">📋</span>Generate PDF';
      }
    }
  };
  
  const handleDownloadPDF = async (application) => {
    try {
      console.log('Downloading PDF for application:', application.id);
      await downloadApplicationPDF(application);
      
      // Show enhanced success message
      showSuccessMessage(`📥 PDF downloaded successfully! Application ${application.application_number || application.id} has been saved to your device.`);
      
    } catch (error) {
      console.error('Error downloading PDF:', error);
      alert('Failed to download PDF: ' + error.message);
    }
  };

  const formatCurrency = (amount, currency = 'KES') => {
    if (currency === 'KES') {
      return new Intl.NumberFormat('en-KE', {
        style: 'currency',
        currency: 'KES'
      }).format(amount);
    }
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

      {/* Success Message Notification */}
      {successMessage && (
        <div className="success-notification">
          <div className="success-icon">
            {successMessage.includes('📋') ? '📋' : successMessage.includes('📥') ? '📥' : '✅'}
          </div>
          <span className="success-text">{successMessage}</span>
          <button 
            className="success-close"
            onClick={() => setSuccessMessage('')}
            aria-label="Close notification"
          >
            ×
          </button>
        </div>
      )}

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
                  {application.application_number || `#${application.id.toString().slice(-8).toUpperCase()}`}
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
                  <span className="amount-value">
                    {formatCurrency(application.loan_amount, application.currency)}
                  </span>
                </div>
                
                <div className="loan-details">
                  <div className="detail-item">
                    <span className="detail-label">Applicant:</span>
                    <span className="detail-value">{application.applicant_name}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Purpose:</span>
                    <span className="detail-value">{application.purpose}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Term:</span>
                    <span className="detail-value">{application.term_months} months</span>
                  </div>
                  {application.repayment_days && (
                    <div className="detail-item">
                      <span className="detail-label">Repayment:</span>
                      <span className="detail-value">{application.repayment_days} days</span>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="card-footer">
                <div className="application-date">
                  Applied on {formatDate(application.created_at)}
                  {application.approval_date && (
                    <span className="approval-date">
                      • Approved on {formatDate(application.approval_date)}
                    </span>
                  )}
                </div>
                
                <div className="application-actions" data-app-id={application.id}>
                  <button 
                    className="action-btn info-btn"
                    onClick={() => handleViewDetails(application)}
                    title="View Application Details"
                  >
                    <span className="action-icon">ℹ️</span>
                    Details
                  </button>
                  
                  {application.pdf_generated && application.pdf_url ? (
                    <button 
                      className="action-btn download-btn"
                      onClick={() => handleDownloadPDF(application)}
                      title="Download Comprehensive PDF"
                    >
                      <span className="action-icon">📄</span>
                      Download PDF
                    </button>
                  ) : (
                    <button 
                      className="action-btn generate-btn"
                      onClick={() => handleGeneratePDF(application)}
                      title="Generate Comprehensive PDF with All Details"
                    >
                      <span className="action-icon">📋</span>
                      Generate PDF
                    </button>
                  )}
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