import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../utils/supabase';

const ExpertSupport = ({ onClose }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('create');
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [newTicket, setNewTicket] = useState({
    subject: '',
    description: '',
    category: 'general',
    priority: 'medium'
  });

  useEffect(() => {
    if (user && activeTab === 'tickets') {
      fetchTickets();
    }
  }, [user, activeTab]);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('support_tickets')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTickets(data || []);
    } catch (error) {
      console.error('Error fetching tickets:', error);
    } finally {
      setLoading(false);
    }
  };

  const createTicket = async (e) => {
    e.preventDefault();
    
    if (!newTicket.subject.trim() || !newTicket.description.trim()) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .rpc('create_support_ticket', {
          ticket_subject: newTicket.subject.trim(),
          ticket_description: newTicket.description.trim(),
          ticket_category: newTicket.category,
          ticket_priority: newTicket.priority
        });

      if (error) throw error;

      // Show success message
      setShowSuccessMessage(true);
      
      // Hide success message after 5 seconds
      setTimeout(() => {
        setShowSuccessMessage(false);
      }, 5000);
      
      setNewTicket({
        subject: '',
        description: '',
        category: 'general',
        priority: 'medium'
      });
      
      setActiveTab('tickets');
      
    } catch (error) {
      console.error('Error creating ticket:', error);
      alert('Error creating ticket: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'open': return '#3b82f6';
      case 'in_progress': return '#f59e0b';
      case 'waiting_customer': return '#8b5cf6';
      case 'resolved': return '#10b981';
      case 'closed': return '#6b7280';
      default: return '#6b7280';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'open': return '🆕';
      case 'in_progress': return '🔄';
      case 'waiting_customer': return '⏳';
      case 'resolved': return '✅';
      case 'closed': return '🔒';
      default: return '📄';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent': return '#ef4444';
      case 'high': return '#f59e0b';
      case 'medium': return '#3b82f6';
      case 'low': return '#10b981';
      default: return '#6b7280';
    }
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'general': return '💬';
      case 'loan_application': return '📋';
      case 'payments': return '💳';
      case 'technical': return '🔧';
      case 'account': return '👤';
      case 'complaint': return '⚠️';
      default: return '📄';
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="dash-support-content">
      <div className="support-header">
        <h2>📞 Expert Support</h2>
        {onClose && (
          <button className="close-btn" onClick={onClose}>✕</button>
        )}
      </div>

      {/* Success Message */}
      {showSuccessMessage && (
        <div className="success-message">
          <div className="success-icon">✅</div>
          <div className="success-content">
            <h4>Ticket Submitted Successfully!</h4>
            <p>Contact support will assist within 24 hrs</p>
          </div>
          <button 
            className="close-success-btn" 
            onClick={() => setShowSuccessMessage(false)}
          >
            ✕
          </button>
        </div>
      )}

      <div className="support-tabs">
        <button 
          className={`tab ${activeTab === 'create' ? 'active' : ''}`}
          onClick={() => setActiveTab('create')}
        >
          ✉️ Create Ticket
        </button>
        <button 
          className={`tab ${activeTab === 'tickets' ? 'active' : ''}`}
          onClick={() => setActiveTab('tickets')}
        >
          📋 My Tickets
        </button>
        <button 
          className={`tab ${activeTab === 'faq' ? 'active' : ''}`}
          onClick={() => setActiveTab('faq')}
        >
          ❓ FAQ
        </button>
      </div>

      <div className="tab-content">
        {activeTab === 'create' && (
          <div className="create-ticket-tab">
            <div className="support-intro">
              <h3>🎯 Get Expert Help</h3>
              <p>Our financial experts are here to help you with any questions or concerns. We typically respond within 24 hours.</p>
            </div>

            <form onSubmit={createTicket} className="ticket-form">
              <div className="form-group">
                <label>Subject *</label>
                <input
                  type="text"
                  value={newTicket.subject}
                  onChange={(e) => setNewTicket({...newTicket, subject: e.target.value})}
                  placeholder="Brief description of your issue"
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Category</label>
                  <select
                    value={newTicket.category}
                    onChange={(e) => setNewTicket({...newTicket, category: e.target.value})}
                  >
                    <option value="general">General Inquiry</option>
                    <option value="loan_application">Loan Application</option>
                    <option value="payments">Payments</option>
                    <option value="technical">Technical Issue</option>
                    <option value="account">Account Issue</option>
                    <option value="complaint">Complaint</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Priority</label>
                  <select
                    value={newTicket.priority}
                    onChange={(e) => setNewTicket({...newTicket, priority: e.target.value})}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Description *</label>
                <textarea
                  value={newTicket.description}
                  onChange={(e) => setNewTicket({...newTicket, description: e.target.value})}
                  placeholder="Please provide detailed information about your issue..."
                  rows={6}
                  required
                />
              </div>

              <button 
                type="submit" 
                className="submit-ticket-btn"
                disabled={loading}
              >
                {loading ? 'Submitting...' : 'Submit Ticket'}
              </button>
            </form>
          </div>
        )}

        {activeTab === 'tickets' && (
          <div className="tickets-tab">
            <div className="tickets-header">
              <h3>My Support Tickets</h3>
              <button 
                className="refresh-btn"
                onClick={fetchTickets}
                disabled={loading}
              >
                🔄 Refresh
              </button>
            </div>

            {loading ? (
              <div className="loading-state">
                <div className="loading-spinner"></div>
                <p>Loading tickets...</p>
              </div>
            ) : tickets.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📭</div>
                <h4>No tickets yet</h4>
                <p>You haven't created any support tickets yet.</p>
                <button 
                  className="card-btn"
                  onClick={() => setActiveTab('create')}
                >
                  Create Your First Ticket
                </button>
              </div>
            ) : (
              <div className="tickets-list">
                {tickets.map((ticket) => (
                  <div key={ticket.id} className="ticket-card">
                    <div className="ticket-header">
                      <div className="ticket-info">
                        <div className="ticket-subject">
                          {getCategoryIcon(ticket.category)} {ticket.subject}
                        </div>
                        <div className="ticket-meta">
                          <span className="ticket-date">{formatDate(ticket.created_at)}</span>
                          <span className="ticket-id">#{ticket.id}</span>
                        </div>
                      </div>
                      <div className="ticket-status">
                        <span 
                          className="status-badge"
                          style={{ backgroundColor: getStatusColor(ticket.status) }}
                        >
                          {getStatusIcon(ticket.status)} {ticket.status.replace('_', ' ')}
                        </span>
                        <span 
                          className="priority-badge"
                          style={{ backgroundColor: getPriorityColor(ticket.priority) }}
                        >
                          {ticket.priority}
                        </span>
                      </div>
                    </div>
                    <div className="ticket-description">
                      {ticket.description}
                    </div>
                    {ticket.admin_response && (
                      <div className="admin-response">
                        <div className="response-header">
                          <span className="response-label">Admin Response:</span>
                          <span className="response-date">{formatDate(ticket.updated_at)}</span>
                        </div>
                        <div className="response-content">
                          {ticket.admin_response}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'faq' && (
          <div className="faq-tab">
            <div className="faq-header">
              <h3>Frequently Asked Questions</h3>
              <p>Find quick answers to common questions</p>
            </div>

            <div className="faq-list">
              <div className="faq-item">
                <div className="faq-question">
                  <span className="faq-icon">❓</span>
                  <h4>How long does loan approval take?</h4>
                </div>
                <div className="faq-answer">
                  <p>Loan applications are typically reviewed within 24-48 hours. You'll receive an email notification once your application has been processed.</p>
                </div>
              </div>

              <div className="faq-item">
                <div className="faq-question">
                  <span className="faq-icon">❓</span>
                  <h4>What documents do I need to apply?</h4>
                </div>
                <div className="faq-answer">
                  <p>You'll need a valid ID card, proof of income, and basic personal information. Additional documents may be requested based on your specific situation.</p>
                </div>
              </div>

              <div className="faq-item">
                <div className="faq-question">
                  <span className="faq-icon">❓</span>
                  <h4>How do I make loan payments?</h4>
                </div>
                <div className="faq-answer">
                  <p>Payments can be made through M-Pesa, bank transfer, or at our physical locations. You'll receive payment instructions once your loan is approved.</p>
                </div>
              </div>

              <div className="faq-item">
                <div className="faq-question">
                  <span className="faq-icon">❓</span>
                  <h4>What are the interest rates?</h4>
                </div>
                <div className="faq-answer">
                  <p>Interest rates vary based on loan amount, term, and your credit profile. Use our loan calculator to estimate your monthly payments.</p>
                </div>
              </div>

              <div className="faq-item">
                <div className="faq-question">
                  <span className="faq-icon">❓</span>
                  <h4>Can I apply for multiple loans?</h4>
                </div>
                <div className="faq-answer">
                  <p>You can only have one active loan application at a time. Once your current application is processed, you can apply for additional loans if needed.</p>
                </div>
              </div>
            </div>

            <div className="support-info">
              <h4>Still need help?</h4>
              <p>If you couldn't find the answer you're looking for, our support team is here to help:</p>
              <ul>
                <li>📧 Email: support@boltfinance.com</li>
                <li>📞 Phone: <a href="tel:+254794105975" className="support-link">+254 794 105 975</a></li>
                <li>💬 WhatsApp: <a href="https://wa.me/18723298624" target="_blank" rel="noopener noreferrer" className="support-link whatsapp-link">+1 872 329 8624</a></li>
                <li>⏰ Response Time: Within 24 hours</li>
              </ul>
              <div className="support-actions">
                <a 
                  href="https://wa.me/18723298624" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="whatsapp-btn"
                >
                  💬 Chat on WhatsApp
                </a>
                <a 
                  href="tel:+254794105975" 
                  className="phone-btn"
                >
                  📞 Call Support
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExpertSupport;