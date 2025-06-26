import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../utils/supabase';

const LoanCalculator = ({ onClose }) => {
  const { user } = useAuth();
  const [calculatorData, setCalculatorData] = useState({
    loanAmount: '',
    interestRate: '12',
    termMonths: '12',
    loanPurpose: 'personal'
  });
  const [calculation, setCalculation] = useState(null);
  const [savedCalculations, setSavedCalculations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [activeTab, setActiveTab] = useState('calculator');

  useEffect(() => {
    if (user && activeTab === 'saved') {
      fetchSavedCalculations();
    }
  }, [user, activeTab]);

  const fetchSavedCalculations = async () => {
    try {
      const { data, error } = await supabase
        .from('loan_calculations')
        .select('*')
        .eq('user_id', user.id)
        .eq('saved', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSavedCalculations(data || []);
    } catch (error) {
      console.error('Error fetching saved calculations:', error);
    }
  };

  const calculateLoan = async () => {
    if (!calculatorData.loanAmount || !calculatorData.interestRate || !calculatorData.termMonths) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .rpc('calculate_loan_payment', {
          principal: parseFloat(calculatorData.loanAmount),
          annual_rate: parseFloat(calculatorData.interestRate),
          term_months: parseInt(calculatorData.termMonths)
        });

      if (error) throw error;

      const result = data[0];
      setCalculation({
        loanAmount: parseFloat(calculatorData.loanAmount),
        interestRate: parseFloat(calculatorData.interestRate),
        termMonths: parseInt(calculatorData.termMonths),
        monthlyPayment: result.monthly_payment,
        totalInterest: result.total_interest,
        totalAmount: result.total_amount,
        loanPurpose: calculatorData.loanPurpose
      });

    } catch (error) {
      console.error('Error calculating loan:', error);
      alert('Error calculating loan: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const saveCalculation = async () => {
    if (!calculation || !user) return;

    try {
      const { error } = await supabase
        .from('loan_calculations')
        .insert([{
          user_id: user.id,
          loan_amount: calculation.loanAmount,
          interest_rate: calculation.interestRate,
          term_months: calculation.termMonths,
          monthly_payment: calculation.monthlyPayment,
          total_interest: calculation.totalInterest,
          total_amount: calculation.totalAmount,
          loan_purpose: calculation.loanPurpose,
          saved: true,
          notes: `Calculation for ${formatCurrency(calculation.loanAmount)} loan`
        }]);

      if (error) throw error;

      // Show success message
      setShowSuccessMessage(true);
      
      // Hide success message after 5 seconds
      setTimeout(() => {
        setShowSuccessMessage(false);
      }, 5000);
      
      if (activeTab === 'saved') {
        fetchSavedCalculations();
      }
    } catch (error) {
      console.error('Error saving calculation:', error);
      alert('Error saving calculation: ' + error.message);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0
    }).format(amount || 0);
  };

  const formatPercentage = (rate) => {
    return `${rate}%`;
  };

  const generateAmortizationSchedule = () => {
    if (!calculation) return [];

    const schedule = [];
    let remainingBalance = calculation.loanAmount;
    const monthlyRate = calculation.interestRate / 100 / 12;
    const monthlyPayment = calculation.monthlyPayment;

    for (let month = 1; month <= calculation.termMonths; month++) {
      const interestPayment = remainingBalance * monthlyRate;
      const principalPayment = monthlyPayment - interestPayment;
      remainingBalance -= principalPayment;

      schedule.push({
        month,
        payment: monthlyPayment,
        principal: principalPayment,
        interest: interestPayment,
        balance: Math.max(0, remainingBalance)
      });
    }

    return schedule;
  };

  const getAffordabilityAdvice = () => {
    if (!calculation) return null;

    const monthlyPayment = calculation.monthlyPayment;
    
    if (monthlyPayment <= 5000) {
      return {
        level: 'excellent',
        color: '#10b981',
        title: 'Excellent Affordability',
        description: 'This loan payment fits comfortably within most budgets.'
      };
    } else if (monthlyPayment <= 15000) {
      return {
        level: 'good',
        color: '#3b82f6',
        title: 'Good Affordability',
        description: 'This payment is manageable for most middle-income earners.'
      };
    } else if (monthlyPayment <= 30000) {
      return {
        level: 'moderate',
        color: '#f59e0b',
        title: 'Moderate Affordability',
        description: 'Ensure this payment fits within your monthly budget.'
      };
    } else {
      return {
        level: 'challenging',
        color: '#ef4444',
        title: 'Challenging Affordability',
        description: 'Consider a longer term or smaller amount to reduce payments.'
      };
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="calculator-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>🎯 Loan Calculator</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        {/* Success Message */}
        {showSuccessMessage && (
          <div className="success-message">
            <div className="success-icon">✅</div>
            <div className="success-content">
              <h4>Calculation Saved!</h4>
              <p>Your loan calculation has been saved successfully</p>
            </div>
            <button 
              className="close-success-btn" 
              onClick={() => setShowSuccessMessage(false)}
            >
              ✕
            </button>
          </div>
        )}

        <div className="calculator-tabs">
          <button 
            className={`tab ${activeTab === 'calculator' ? 'active' : ''}`}
            onClick={() => setActiveTab('calculator')}
          >
            🧮 Calculator
          </button>
          <button 
            className={`tab ${activeTab === 'results' ? 'active' : ''}`}
            onClick={() => setActiveTab('results')}
            disabled={!calculation}
          >
            📊 Results
          </button>
          <button 
            className={`tab ${activeTab === 'saved' ? 'active' : ''}`}
            onClick={() => setActiveTab('saved')}
          >
            💾 Saved
          </button>
        </div>

        <div className="tab-content">
          {activeTab === 'calculator' && (
            <div className="calculator-tab">
              <div className="calculator-form">
                <div className="form-group">
                  <label>Loan Amount (KES)</label>
                  <input
                    type="number"
                    value={calculatorData.loanAmount}
                    onChange={(e) => setCalculatorData(prev => ({
                      ...prev,
                      loanAmount: e.target.value
                    }))}
                    placeholder="100,000"
                    min="1000"
                    step="1000"
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Interest Rate (%)</label>
                    <input
                      type="number"
                      value={calculatorData.interestRate}
                      onChange={(e) => setCalculatorData(prev => ({
                        ...prev,
                        interestRate: e.target.value
                      }))}
                      placeholder="12"
                      min="1"
                      max="50"
                      step="0.1"
                    />
                  </div>

                  <div className="form-group">
                    <label>Term (Months)</label>
                    <select
                      value={calculatorData.termMonths}
                      onChange={(e) => setCalculatorData(prev => ({
                        ...prev,
                        termMonths: e.target.value
                      }))}
                    >
                      <option value="3">3 months</option>
                      <option value="6">6 months</option>
                      <option value="12">12 months</option>
                      <option value="18">18 months</option>
                      <option value="24">24 months</option>
                      <option value="36">36 months</option>
                      <option value="48">48 months</option>
                      <option value="60">60 months</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label>Loan Purpose</label>
                  <select
                    value={calculatorData.loanPurpose}
                    onChange={(e) => setCalculatorData(prev => ({
                      ...prev,
                      loanPurpose: e.target.value
                    }))}
                  >
                    <option value="personal">Personal</option>
                    <option value="business">Business</option>
                    <option value="education">Education</option>
                    <option value="medical">Medical</option>
                    <option value="home_improvement">Home Improvement</option>
                    <option value="debt_consolidation">Debt Consolidation</option>
                    <option value="emergency">Emergency</option>
                  </select>
                </div>

                <button 
                  className="calculate-btn"
                  onClick={calculateLoan}
                  disabled={loading}
                >
                  {loading ? 'Calculating...' : '🧮 Calculate Loan'}
                </button>
              </div>

              {calculation && (
                <div className="quick-results">
                  <h3>Quick Results</h3>
                  <div className="results-grid">
                    <div className="result-item">
                      <div className="result-label">Monthly Payment</div>
                      <div className="result-value">{formatCurrency(calculation.monthlyPayment)}</div>
                    </div>
                    <div className="result-item">
                      <div className="result-label">Total Interest</div>
                      <div className="result-value">{formatCurrency(calculation.totalInterest)}</div>
                    </div>
                    <div className="result-item">
                      <div className="result-label">Total Amount</div>
                      <div className="result-value">{formatCurrency(calculation.totalAmount)}</div>
                    </div>
                  </div>
                  <button className="view-details-btn" onClick={() => setActiveTab('results')}>
                    View Detailed Results
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'results' && calculation && (
            <div className="results-tab">
              <div className="results-summary">
                <h3>Loan Summary</h3>
                <div className="summary-grid">
                  <div className="summary-item">
                    <div className="summary-label">Loan Amount</div>
                    <div className="summary-value">{formatCurrency(calculation.loanAmount)}</div>
                  </div>
                  <div className="summary-item">
                    <div className="summary-label">Interest Rate</div>
                    <div className="summary-value">{formatPercentage(calculation.interestRate)}</div>
                  </div>
                  <div className="summary-item">
                    <div className="summary-label">Term</div>
                    <div className="summary-value">{calculation.termMonths} months</div>
                  </div>
                  <div className="summary-item">
                    <div className="summary-label">Monthly Payment</div>
                    <div className="summary-value primary">{formatCurrency(calculation.monthlyPayment)}</div>
                  </div>
                  <div className="summary-item">
                    <div className="summary-label">Total Interest</div>
                    <div className="summary-value">{formatCurrency(calculation.totalInterest)}</div>
                  </div>
                  <div className="summary-item">
                    <div className="summary-label">Total Amount</div>
                    <div className="summary-value">{formatCurrency(calculation.totalAmount)}</div>
                  </div>
                </div>
              </div>

              {/* Affordability Assessment */}
              {(() => {
                const advice = getAffordabilityAdvice();
                return advice ? (
                  <div className="affordability-card" style={{ borderColor: advice.color }}>
                    <div className="affordability-header">
                      <h4 style={{ color: advice.color }}>{advice.title}</h4>
                    </div>
                    <p>{advice.description}</p>
                  </div>
                ) : null;
              })()}

              {/* Payment Breakdown Chart */}
              <div className="payment-breakdown">
                <h4>Payment Breakdown</h4>
                <div className="breakdown-chart">
                  <div className="chart-bar">
                    <div 
                      className="principal-portion"
                      style={{ 
                        width: `${(calculation.loanAmount / calculation.totalAmount) * 100}%`
                      }}
                    >
                      Principal
                    </div>
                    <div 
                      className="interest-portion"
                      style={{ 
                        width: `${(calculation.totalInterest / calculation.totalAmount) * 100}%`
                      }}
                    >
                      Interest
                    </div>
                  </div>
                  <div className="chart-legend">
                    <div className="legend-item">
                      <div className="legend-color principal"></div>
                      <span>Principal: {formatCurrency(calculation.loanAmount)}</span>
                    </div>
                    <div className="legend-item">
                      <div className="legend-color interest"></div>
                      <span>Interest: {formatCurrency(calculation.totalInterest)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Amortization Schedule */}
              <div className="amortization-schedule">
                <h4>Payment Schedule (First 12 Months)</h4>
                <div className="schedule-table">
                  <div className="schedule-header">
                    <div>Month</div>
                    <div>Payment</div>
                    <div>Principal</div>
                    <div>Interest</div>
                    <div>Balance</div>
                  </div>
                  {generateAmortizationSchedule().slice(0, 12).map((payment) => (
                    <div key={payment.month} className="schedule-row">
                      <div>{payment.month}</div>
                      <div>{formatCurrency(payment.payment)}</div>
                      <div>{formatCurrency(payment.principal)}</div>
                      <div>{formatCurrency(payment.interest)}</div>
                      <div>{formatCurrency(payment.balance)}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="results-actions">
                <button className="save-btn" onClick={saveCalculation}>
                  💾 Save Calculation
                </button>
                <button className="new-calc-btn" onClick={() => setActiveTab('calculator')}>
                  🧮 New Calculation
                </button>
              </div>
            </div>
          )}

          {activeTab === 'saved' && (
            <div className="saved-tab">
              <div className="saved-header">
                <h3>💾 Saved Calculations</h3>
                <p>Your previously saved loan calculations</p>
              </div>

              {savedCalculations.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">💾</div>
                  <h3>No Saved Calculations</h3>
                  <p>Save your loan calculations to compare different scenarios.</p>
                  <button className="new-calc-btn" onClick={() => setActiveTab('calculator')}>
                    🧮 Start Calculating
                  </button>
                </div>
              ) : (
                <div className="saved-list">
                  {savedCalculations.map((calc) => (
                    <div key={calc.id} className="saved-item">
                      <div className="saved-header">
                        <h4>{formatCurrency(calc.loan_amount)} Loan</h4>
                        <span className="saved-date">
                          {new Date(calc.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="saved-details">
                        <div className="detail-row">
                          <span>Monthly Payment:</span>
                          <strong>{formatCurrency(calc.monthly_payment)}</strong>
                        </div>
                        <div className="detail-row">
                          <span>Term:</span>
                          <span>{calc.term_months} months</span>
                        </div>
                        <div className="detail-row">
                          <span>Interest Rate:</span>
                          <span>{formatPercentage(calc.interest_rate)}</span>
                        </div>
                        <div className="detail-row">
                          <span>Total Interest:</span>
                          <span>{formatCurrency(calc.total_interest)}</span>
                        </div>
                      </div>
                      <div className="saved-actions">
                        <button 
                          className="load-btn"
                          onClick={() => {
                            setCalculatorData({
                              loanAmount: calc.loan_amount.toString(),
                              interestRate: calc.interest_rate.toString(),
                              termMonths: calc.term_months.toString(),
                              loanPurpose: calc.loan_purpose || 'personal'
                            });
                            setCalculation({
                              loanAmount: calc.loan_amount,
                              interestRate: calc.interest_rate,
                              termMonths: calc.term_months,
                              monthlyPayment: calc.monthly_payment,
                              totalInterest: calc.total_interest,
                              totalAmount: calc.total_amount,
                              loanPurpose: calc.loan_purpose
                            });
                            setActiveTab('results');
                          }}
                        >
                          📊 View Details
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <style>{`
          .calculator-modal {
            background: white;
            border-radius: 24px;
            max-width: 900px;
            width: 90vw;
            max-height: 90vh;
            overflow: hidden;
            box-shadow: 0 25px 50px -12px rgb(0 0 0 / 0.25);
            border: 1px solid #e2e8f0;
          }

          .calculator-tabs {
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

          .tab:hover:not(:disabled) {
            background: rgba(59, 130, 246, 0.1);
            color: #3b82f6;
          }

          .tab.active {
            background: white;
            color: #3b82f6;
            box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
          }

          .tab:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }

          .tab-content {
            padding: 2rem;
            max-height: 60vh;
            overflow-y: auto;
          }

          .calculator-form {
            max-width: 500px;
            margin: 0 auto;
          }

          .form-group {
            margin-bottom: 1.5rem;
          }

          .form-row {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 1rem;
          }

          .form-group label {
            display: block;
            font-weight: 600;
            color: #374151;
            margin-bottom: 0.5rem;
            font-size: 0.875rem;
          }

          .form-group input,
          .form-group select {
            width: 100%;
            padding: 1rem;
            border: 2px solid #e5e7eb;
            border-radius: 12px;
            font-size: 1rem;
            transition: all 0.2s ease;
            background: white;
          }

          .form-group input:focus,
          .form-group select:focus {
            outline: none;
            border-color: #3b82f6;
            box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
          }

          .calculate-btn {
            background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
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

          .calculate-btn:hover:not(:disabled) {
            transform: translateY(-2px);
            box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1);
          }

          .calculate-btn:disabled {
            opacity: 0.6;
            cursor: not-allowed;
          }

          .quick-results {
            background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
            border: 1px solid #bae6fd;
            border-radius: 16px;
            padding: 2rem;
            text-align: center;
          }

          .quick-results h3 {
            color: #1e40af;
            margin-bottom: 1.5rem;
          }

          .results-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 1rem;
            margin-bottom: 1.5rem;
          }

          .result-item {
            background: white;
            border-radius: 12px;
            padding: 1rem;
            border: 1px solid #bae6fd;
          }

          .result-label {
            font-size: 0.875rem;
            color: #64748b;
            margin-bottom: 0.5rem;
            font-weight: 600;
          }

          .result-value {
            font-size: 1.25rem;
            font-weight: 700;
            color: #1e40af;
          }

          .view-details-btn {
            background: linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%);
            color: white;
            border: none;
            border-radius: 12px;
            padding: 0.75rem 1.5rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s ease;
          }

          .view-details-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1);
          }

          .results-summary {
            margin-bottom: 2rem;
          }

          .results-summary h3 {
            color: #374151;
            margin-bottom: 1.5rem;
            text-align: center;
          }

          .summary-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 1rem;
            margin-bottom: 2rem;
          }

          .summary-item {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 1.5rem;
            text-align: center;
          }

          .summary-label {
            font-size: 0.875rem;
            color: #64748b;
            margin-bottom: 0.5rem;
            font-weight: 600;
          }

          .summary-value {
            font-size: 1.25rem;
            font-weight: 700;
            color: #1e293b;
          }

          .summary-value.primary {
            color: #3b82f6;
            font-size: 1.5rem;
          }

          .affordability-card {
            background: #f8fafc;
            border: 2px solid;
            border-radius: 12px;
            padding: 1.5rem;
            margin-bottom: 2rem;
          }

          .affordability-header h4 {
            margin-bottom: 0.5rem;
            font-size: 1.125rem;
          }

          .affordability-card p {
            margin: 0;
            color: #64748b;
            line-height: 1.6;
          }

          .payment-breakdown {
            margin-bottom: 2rem;
          }

          .payment-breakdown h4 {
            color: #374151;
            margin-bottom: 1rem;
          }

          .breakdown-chart {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 1.5rem;
          }

          .chart-bar {
            display: flex;
            height: 40px;
            border-radius: 8px;
            overflow: hidden;
            margin-bottom: 1rem;
          }

          .principal-portion {
            background: #3b82f6;
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 600;
            font-size: 0.875rem;
          }

          .interest-portion {
            background: #f59e0b;
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 600;
            font-size: 0.875rem;
          }

          .chart-legend {
            display: flex;
            gap: 2rem;
            justify-content: center;
          }

          .legend-item {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            font-size: 0.875rem;
            color: #64748b;
          }

          .legend-color {
            width: 16px;
            height: 16px;
            border-radius: 4px;
          }

          .legend-color.principal {
            background: #3b82f6;
          }

          .legend-color.interest {
            background: #f59e0b;
          }

          .amortization-schedule {
            margin-bottom: 2rem;
          }

          .amortization-schedule h4 {
            color: #374151;
            margin-bottom: 1rem;
          }

          .schedule-table {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            overflow: hidden;
          }

          .schedule-header {
            display: grid;
            grid-template-columns: repeat(5, 1fr);
            background: #e2e8f0;
            padding: 1rem;
            font-weight: 700;
            color: #374151;
            font-size: 0.875rem;
          }

          .schedule-row {
            display: grid;
            grid-template-columns: repeat(5, 1fr);
            padding: 0.75rem 1rem;
            border-bottom: 1px solid #e2e8f0;
            font-size: 0.875rem;
            color: #64748b;
          }

          .schedule-row:last-child {
            border-bottom: none;
          }

          .results-actions {
            display: flex;
            gap: 1rem;
            justify-content: center;
          }

          .save-btn,
          .new-calc-btn {
            padding: 1rem 2rem;
            border: none;
            border-radius: 12px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s ease;
            font-size: 1rem;
          }

          .save-btn {
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            color: white;
          }

          .new-calc-btn {
            background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
            color: white;
          }

          .save-btn:hover,
          .new-calc-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1);
          }

          .saved-header {
            text-align: center;
            margin-bottom: 2rem;
          }

          .saved-header h3 {
            color: #374151;
            margin-bottom: 0.5rem;
          }

          .saved-header p {
            color: #6b7280;
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

          .saved-list {
            display: flex;
            flex-direction: column;
            gap: 1rem;
          }

          .saved-item {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 1.5rem;
          }

          .saved-item .saved-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 1rem;
            text-align: left;
          }

          .saved-item h4 {
            color: #374151;
            margin: 0;
          }

          .saved-date {
            font-size: 0.875rem;
            color: #64748b;
          }

          .saved-details {
            display: grid;
            gap: 0.5rem;
            margin-bottom: 1rem;
          }

          .detail-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 0.875rem;
          }

          .detail-row span:first-child {
            color: #64748b;
          }

          .detail-row strong {
            color: #3b82f6;
            font-weight: 700;
          }

          .saved-actions {
            display: flex;
            justify-content: flex-end;
          }

          .load-btn {
            background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
            color: white;
            border: none;
            border-radius: 8px;
            padding: 0.5rem 1rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s ease;
            font-size: 0.875rem;
          }

          .load-btn:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
          }

          @media (max-width: 768px) {
            .calculator-modal {
              width: 95vw;
              max-height: 95vh;
            }

            .tab-content {
              padding: 1rem;
            }

            .form-row {
              grid-template-columns: 1fr;
            }

            .results-grid,
            .summary-grid {
              grid-template-columns: 1fr;
            }

            .chart-legend {
              flex-direction: column;
              align-items: center;
              gap: 1rem;
            }

            .schedule-header,
            .schedule-row {
              grid-template-columns: repeat(3, 1fr);
              font-size: 0.75rem;
            }

            .schedule-header div:nth-child(3),
            .schedule-header div:nth-child(4),
            .schedule-row div:nth-child(3),
            .schedule-row div:nth-child(4) {
              display: none;
            }

            .results-actions {
              flex-direction: column;
            }

            .saved-item .saved-header {
              flex-direction: column;
              align-items: flex-start;
              gap: 0.5rem;
            }
          }
        `}</style>
      </div>
    </div>
  );
};

export default LoanCalculator;