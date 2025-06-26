import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../utils/supabase';

const PaymentCenter = ({ onClose }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [payments, setPayments] = useState([]);
  const [paymentSummary, setPaymentSummary] = useState(null);
  const [paymentSchedules, setPaymentSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newPayment, setNewPayment] = useState({
    amount: '',
    paymentMethod: 'mpesa',
    mpesaNumber: '',
    notes: ''
  });

  useEffect(() => {
    if (user) {
      fetchPaymentData();
    }
  }, [user]);

  const fetchPaymentData = async () => {
    try {
      setLoading(true);
      
      // Fetch payment summary
      const { data: summaryData, error: summaryError } = await supabase
        .rpc('get_user_payment_summary', { check_user_id: user.id });

      if (summaryError) throw summaryError;
      setPaymentSummary(summaryData?.[0] || {});

      // Fetch payment history
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('payments')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (paymentsError) throw paymentsError;
      setPayments(paymentsData || []);

      // Fetch payment schedules
      const { data: schedulesData, error: schedulesError } = await supabase
        .from('payment_schedules')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true);

      if (schedulesError) throw schedulesError;
      setPaymentSchedules(schedulesData || []);

    } catch (error) {
      console.error('Error fetching payment data:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleMakePayment = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      
      // Create payment record
      const { data, error } = await supabase
        .from('payments')
        .insert([{
          user_id: user.id,
          amount: parseFloat(newPayment.amount),
          payment_method: newPayment.paymentMethod,
          status: 'pending',
          notes: newPayment.notes,
          metadata: {
            mpesa_number: newPayment.mpesaNumber
          }
        }])
        .select()
        .single();

      if (error) throw error;

      // In a real implementation, you would integrate with M-Pesa API here
      alert('Payment initiated successfully! You will receive an M-Pesa prompt shortly.');
      
      setNewPayment({
        amount: '',
        paymentMethod: 'mpesa',
        mpesaNumber: '',
        notes: ''
      });
      
      await fetchPaymentData();
      
    } catch (error) {
      console.error('Error making payment:', error);
      alert('Error initiating payment: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed': return '✅';
      case 'pending': return '⏳';
      case 'failed': return '❌';
      case 'cancelled': return '🚫';
      default: return '📄';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return '#10b981';
      case 'pending': return '#f59e0b';
      case 'failed': return '#ef4444';
      case 'cancelled': return '#6b7280';
      default: return '#6b7280';
    }
  };

  if (loading && !paymentSummary) {
    return (
      <div className="modal-overlay">
        <div className="modal-content">
          <div className="loading-center">
            <div className="loading-spinner"></div>
            <p>Loading payment center...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="payment-center-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>💳 Payment Center</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="payment-tabs">
          <button 
            className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            📊 Overview
          </button>
          <button 
            className={`tab ${activeTab === 'make-payment' ? 'active' : ''}`}
            onClick={() => setActiveTab('make-payment')}
          >
            💰 Make Payment
          </button>
          <button 
            className={`tab ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            📋 History
          </button>
          <button 
            className={`tab ${activeTab === 'schedule' ? 'active' : ''}`}
            onClick={() => setActiveTab('schedule')}
          >
            📅 Schedule
          </button>
        </div>

        <div className="tab-content">
          {activeTab === 'overview' && (
            <div className="overview-tab">
              <div className="payment-summary-grid">
                <div className="summary-card">
                  <div className="card-header">
                    <h3>Total Payments</h3>
                    <span className="card-icon">💰</span>
                  </div>
                  <div className="card-value">{formatCurrency(paymentSummary?.total_payments)}</div>
                  <div className="card-subtitle">All time payments</div>
                </div>

                <div className="summary-card">
                  <div className="card-header">
                    <h3>Completed</h3>
                    <span className="card-icon">✅</span>
                  </div>
                  <div className="card-value">{paymentSummary?.completed_payments || 0}</div>
                  <div className="card-subtitle">Successful payments</div>
                </div>

                <div className="summary-card">
                  <div className="card-header">
                    <h3>Pending</h3>
                    <span className="card-icon">⏳</span>
                  </div>
                  <div className="card-value">{paymentSummary?.pending_payments || 0}</div>
                  <div className="card-subtitle">Awaiting processing</div>
                </div>

                <div className="summary-card">
                  <div className="card-header">
                    <h3>Overdue</h3>
                    <span className="card-icon">⚠️</span>
                  </div>
                  <div className="card-value">{paymentSummary?.overdue_payments || 0}</div>
                  <div className="card-subtitle">Past due date</div>
                </div>
              </div>

              {paymentSummary?.next_payment_date && (
                <div className="next-payment-card">
                  <h3>📅 Next Payment Due</h3>
                  <div className="next-payment-details">
                    <div className="payment-amount">
                      {formatCurrency(paymentSummary.next_payment_amount)}
                    </div>
                    <div className="payment-date">
                      Due: {formatDate(paymentSummary.next_payment_date)}
                    </div>
                  </div>
                  <button 
                    className="pay-now-btn"
                    onClick={() => setActiveTab('make-payment')}
                  >
                    Pay Now
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'make-payment' && (
            <div className="make-payment-tab">
              <form onSubmit={handleMakePayment} className="payment-form">
                <div className="form-group">
                  <label>Payment Amount (KES)</label>
                  <input
                    type="number"
                    value={newPayment.amount}
                    onChange={(e) => setNewPayment(prev => ({
                      ...prev,
                      amount: e.target.value
                    }))}
                    placeholder="Enter amount"
                    min="1"
                    step="0.01"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Payment Method</label>
                  <select
                    value={newPayment.paymentMethod}
                    onChange={(e) => setNewPayment(prev => ({
                      ...prev,
                      paymentMethod: e.target.value
                    }))}
                  >
                    <option value="mpesa">M-Pesa</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="card">Debit/Credit Card</option>
                  </select>
                </div>

                {newPayment.paymentMethod === 'mpesa' && (
                  <div className="form-group">
                    <label>M-Pesa Number</label>
                    <input
                      type="tel"
                      value={newPayment.mpesaNumber}
                      onChange={(e) => setNewPayment(prev => ({
                        ...prev,
                        mpesaNumber: e.target.value
                      }))}
                      placeholder="0712345678"
                      pattern="[0-9]{10}"
                      required
                    />
                  </div>
                )}

                <div className="form-group">
                  <label>Notes (Optional)</label>
                  <textarea
                    value={newPayment.notes}
                    onChange={(e) => setNewPayment(prev => ({
                      ...prev,
                      notes: e.target.value
                    }))}
                    placeholder="Payment notes..."
                    rows="3"
                  />
                </div>

                <button type="submit" className="submit-payment-btn" disabled={loading}>
                  {loading ? 'Processing...' : 'Make Payment'}
                </button>
              </form>

              <div className="payment-info">
                <h4>💡 Payment Information</h4>
                <ul>
                  <li>M-Pesa payments are processed instantly</li>
                  <li>Bank transfers may take 1-2 business days</li>
                  <li>You'll receive a confirmation SMS/email</li>
                  <li>Contact support for payment issues</li>
                </ul>
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="history-tab">
              <div className="payments-list">
                {payments.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-icon">💳</div>
                    <h3>No Payment History</h3>
                    <p>You haven't made any payments yet.</p>
                  </div>
                ) : (
                  payments.map((payment) => (
                    <div key={payment.id} className="payment-item">
                      <div className="payment-info">
                        <div className="payment-header">
                          <span className="payment-status" style={{ color: getStatusColor(payment.status) }}>
                            {getStatusIcon(payment.status)} {payment.status.toUpperCase()}
                          </span>
                          <span className="payment-date">{formatDate(payment.created_at)}</span>
                        </div>
                        <div className="payment-details">
                          <div className="payment-amount">{formatCurrency(payment.amount)}</div>
                          <div className="payment-method">via {payment.payment_method.replace('_', ' ').toUpperCase()}</div>
                        </div>
                        {payment.notes && (
                          <div className="payment-notes">{payment.notes}</div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'schedule' && (
            <div className="schedule-tab">
              <div className="schedule-info">
                <h3>📅 Payment Schedules</h3>
                <p>Set up automatic payments to never miss a due date.</p>
              </div>

              {paymentSchedules.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">📅</div>
                  <h3>No Payment Schedules</h3>
                  <p>Set up automatic payments for convenience.</p>
                  <button className="setup-schedule-btn">
                    Set Up Auto-Pay
                  </button>
                </div>
              ) : (
                <div className="schedules-list">
                  {paymentSchedules.map((schedule) => (
                    <div key={schedule.id} className="schedule-item">
                      <div className="schedule-details">
                        <h4>{formatCurrency(schedule.amount)} - {schedule.schedule_type}</h4>
                        <p>Next payment: {formatDate(schedule.next_payment_date)}</p>
                        <p>Auto-debit: {schedule.auto_debit ? 'Enabled' : 'Disabled'}</p>
                      </div>
                      <div className="schedule-actions">
                        <button className="edit-schedule-btn">Edit</button>
                        <button className="pause-schedule-btn">Pause</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <style>{`
        .payment-center-modal {
          background: white;
          border-radius: 24px;
          max-width: 900px;
          width: 90vw;
          max-height: 90vh;
          overflow: hidden;
          box-shadow: 0 25px 50px -12px rgb(0 0 0 / 0.25);
          border: 1px solid #e2e8f0;
        }

        .payment-tabs {
          display: flex;
          background: #f8fafc;
          border-bottom: 1px solid #e2e8f0;
          padding: 0.5rem;
        }

        .tab {
          flex: 1;
          background: none;
          border: none;
          padding: 1rem;
          font-weight: 600;
          color: #64748b;
          cursor: pointer;
          transition: all 0.2s ease;
          border-radius: 12px;
          font-size: 0.9rem;
        }

        .tab:hover {
          background: rgba(59, 130, 246, 0.1);
          color: #3b82f6;
        }

        .tab.active {
          background: white;
          color: #3b82f6;
          box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
        }

        .tab-content {
          padding: 2rem;
          max-height: 60vh;
          overflow-y: auto;
        }

        .payment-summary-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1.5rem;
          margin-bottom: 2rem;
        }

        .summary-card {
          background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          padding: 1.5rem;
          transition: transform 0.2s ease;
        }

        .summary-card:hover {
          transform: translateY(-2px);
        }

        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }

        .card-header h3 {
          font-size: 0.875rem;
          font-weight: 600;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .card-icon {
          font-size: 1.5rem;
        }

        .card-value {
          font-size: 2rem;
          font-weight: 800;
          color: #1e293b;
          margin-bottom: 0.5rem;
        }

        .card-subtitle {
          font-size: 0.875rem;
          color: #64748b;
        }

        .next-payment-card {
          background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
          border: 1px solid #3b82f6;
          border-radius: 16px;
          padding: 2rem;
          text-align: center;
        }

        .next-payment-card h3 {
          color: #1e40af;
          margin-bottom: 1rem;
        }

        .next-payment-details {
          margin-bottom: 1.5rem;
        }

        .payment-amount {
          font-size: 2.5rem;
          font-weight: 800;
          color: #1e40af;
          margin-bottom: 0.5rem;
        }

        .payment-date {
          font-size: 1.125rem;
          color: #1e40af;
          font-weight: 600;
        }

        .pay-now-btn {
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
          color: white;
          border: none;
          border-radius: 12px;
          padding: 1rem 2rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          font-size: 1rem;
        }

        .pay-now-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1);
        }

        .payment-form {
          max-width: 500px;
          margin: 0 auto;
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

        .form-group input,
        .form-group select,
        .form-group textarea {
          width: 100%;
          padding: 1rem;
          border: 2px solid #e5e7eb;
          border-radius: 12px;
          font-size: 1rem;
          transition: all 0.2s ease;
          background: white;
        }

        .form-group input:focus,
        .form-group select:focus,
        .form-group textarea:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .submit-payment-btn {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
          border: none;
          border-radius: 12px;
          padding: 1rem 2rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          width: 100%;
          font-size: 1rem;
          margin-bottom: 2rem;
        }

        .submit-payment-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1);
        }

        .submit-payment-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .payment-info {
          background: #f0f9ff;
          border: 1px solid #bae6fd;
          border-radius: 12px;
          padding: 1.5rem;
        }

        .payment-info h4 {
          color: #1e40af;
          margin-bottom: 1rem;
        }

        .payment-info ul {
          color: #1e40af;
          margin: 0;
          padding-left: 1.5rem;
        }

        .payment-info li {
          margin-bottom: 0.5rem;
        }

        .payments-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .payment-item {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 1.5rem;
          transition: all 0.2s ease;
        }

        .payment-item:hover {
          box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
        }

        .payment-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }

        .payment-status {
          font-weight: 700;
          font-size: 0.875rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .payment-date {
          font-size: 0.875rem;
          color: #64748b;
        }

        .payment-details {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.5rem;
        }

        .payment-amount {
          font-size: 1.25rem;
          font-weight: 700;
          color: #1e293b;
        }

        .payment-method {
          font-size: 0.875rem;
          color: #64748b;
          font-weight: 600;
        }

        .payment-notes {
          font-size: 0.875rem;
          color: #64748b;
          font-style: italic;
        }

        .empty-state {
          text-align: center;
          padding: 3rem 1rem;
        }

        .empty-icon {
          font-size: 4rem;
          margin-bottom: 1rem;
          opacity: 0.5;
        }

        .empty-state h3 {
          color: #374151;
          margin-bottom: 0.5rem;
        }

        .empty-state p {
          color: #6b7280;
          margin-bottom: 2rem;
        }

        .setup-schedule-btn {
          background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
          color: white;
          border: none;
          border-radius: 12px;
          padding: 1rem 2rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .setup-schedule-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1);
        }

        .schedule-info {
          text-align: center;
          margin-bottom: 2rem;
        }

        .schedule-info h3 {
          color: #374151;
          margin-bottom: 0.5rem;
        }

        .schedule-info p {
          color: #6b7280;
        }

        .schedules-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .schedule-item {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 1.5rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .schedule-details h4 {
          color: #374151;
          margin-bottom: 0.5rem;
        }

        .schedule-details p {
          color: #6b7280;
          font-size: 0.875rem;
          margin: 0.25rem 0;
        }

        .schedule-actions {
          display: flex;
          gap: 0.5rem;
        }

        .edit-schedule-btn,
        .pause-schedule-btn {
          padding: 0.5rem 1rem;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          background: white;
          color: #374151;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          font-size: 0.875rem;
        }

        .edit-schedule-btn:hover {
          background: #3b82f6;
          color: white;
          border-color: #3b82f6;
        }

        .pause-schedule-btn:hover {
          background: #f59e0b;
          color: white;
          border-color: #f59e0b;
        }

        .loading-center {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 3rem;
        }

        .loading-spinner {
          width: 48px;
          height: 48px;
          border: 4px solid #e5e7eb;
          border-top: 4px solid #3b82f6;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 1rem;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @media (max-width: 768px) {
          .payment-center-modal {
            width: 95vw;
            max-height: 95vh;
          }

          .payment-summary-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 1rem;
          }

          .tab-content {
            padding: 1rem;
          }

          .payment-details {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.5rem;
          }

          .schedule-item {
            flex-direction: column;
            align-items: flex-start;
            gap: 1rem;
          }

          .schedule-actions {
            width: 100%;
            justify-content: flex-end;
          }
        }
      `}</style>
    </div>
  );
};

export default PaymentCenter;