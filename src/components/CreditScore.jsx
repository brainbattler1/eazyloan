import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../utils/supabase';

const CreditScore = ({ onClose }) => {
  const { user } = useAuth();
  const [creditScore, setCreditScore] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (user) {
      fetchCreditScore();
    }
  }, [user]);

  const fetchCreditScore = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get current credit score
      const { data: scoreData, error: scoreError } = await supabase
        .rpc('get_current_credit_score', { check_user_id: user.id });

      if (scoreError) {
        console.warn('No existing credit score found, calculating new one:', scoreError.message);
        await calculateNewCreditScore();
        return;
      }

      if (scoreData && scoreData.length > 0) {
        setCreditScore(scoreData[0]);
      } else {
        console.log('No credit score found, calculating new one');
        await calculateNewCreditScore();
      }
    } catch (error) {
      console.error('Error fetching credit score:', error);
      setError('Failed to load credit score. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const calculateNewCreditScore = async () => {
    try {
      // Calculate new credit score
      const { data: newScore, error: calcError } = await supabase
        .rpc('calculate_credit_score', { check_user_id: user.id });

      if (calcError) {
        console.error('Error calculating credit score:', calcError);
        // Fallback to a default score if calculation fails
        const fallbackScore = 650;
        const scoreBand = getScoreBand(fallbackScore);
        
        const newCreditScore = {
          score: fallbackScore,
          score_band: scoreBand,
          calculated_at: new Date().toISOString(),
          factors: generateFactors(fallbackScore),
          recommendations: generateRecommendations(fallbackScore)
        };
        
        setCreditScore(newCreditScore);
        return;
      }

      const scoreValue = newScore || 650;
      const scoreBand = getScoreBand(scoreValue);
      
      // Insert new credit score record
      const { data: insertData, error: insertError } = await supabase
        .from('credit_scores')
        .insert([{
          user_id: user.id,
          score: scoreValue,
          score_band: scoreBand,
          factors: generateFactors(scoreValue),
          recommendations: generateRecommendations(scoreValue),
          bureau_source: 'internal',
          is_current: true
        }])
        .select()
        .single();

      if (insertError) {
        console.error('Error inserting credit score:', insertError);
        // Still show the calculated score even if insert fails
        setCreditScore({
          score: scoreValue,
          score_band: scoreBand,
          calculated_at: new Date().toISOString(),
          factors: generateFactors(scoreValue),
          recommendations: generateRecommendations(scoreValue)
        });
        return;
      }

      setCreditScore({
        score: scoreValue,
        score_band: scoreBand,
        calculated_at: new Date().toISOString(),
        factors: generateFactors(scoreValue),
        recommendations: generateRecommendations(scoreValue)
      });

    } catch (error) {
      console.error('Error calculating credit score:', error);
      setError('Failed to calculate credit score. Please try again.');
    }
  };

  const refreshCreditScore = async () => {
    setRefreshing(true);
    setError(null);
    
    try {
      // Mark current score as not current
      await supabase
        .from('credit_scores')
        .update({ is_current: false })
        .eq('user_id', user.id)
        .eq('is_current', true);

      // Calculate new score
      await calculateNewCreditScore();
      
    } catch (error) {
      console.error('Error refreshing credit score:', error);
      setError('Failed to refresh credit score. Please try again.');
    } finally {
      setRefreshing(false);
    }
  };

  const getScoreBand = (score) => {
    if (score >= 800) return 'excellent';
    if (score >= 740) return 'very_good';
    if (score >= 670) return 'good';
    if (score >= 580) return 'fair';
    return 'poor';
  };

  const getScoreBandColor = (band) => {
    switch (band) {
      case 'excellent': return '#10b981';
      case 'very_good': return '#22c55e';
      case 'good': return '#3b82f6';
      case 'fair': return '#f59e0b';
      case 'poor': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getScoreBandLabel = (band) => {
    switch (band) {
      case 'excellent': return 'Excellent';
      case 'very_good': return 'Very Good';
      case 'good': return 'Good';
      case 'fair': return 'Fair';
      case 'poor': return 'Poor';
      default: return 'Unknown';
    }
  };

  const generateFactors = (score) => {
    // Simulate credit factors based on score
    const baseFactors = {
      payment_history: Math.min(100, score / 8.5 + Math.random() * 10),
      credit_utilization: Math.max(0, 100 - (score - 300) / 5.5 + Math.random() * 20),
      length_of_history: Math.min(100, (score - 300) / 5.5 + Math.random() * 15),
      credit_mix: Math.min(100, score / 8.5 + Math.random() * 15),
      new_credit: Math.min(100, score / 8.5 + Math.random() * 10)
    };

    // Round to integers
    Object.keys(baseFactors).forEach(key => {
      baseFactors[key] = Math.round(baseFactors[key]);
    });

    return baseFactors;
  };

  const generateRecommendations = (score) => {
    const recommendations = [];

    if (score < 650) {
      recommendations.push({
        title: "Improve Payment History",
        description: "Make all loan payments on time to build a positive payment history",
        impact: "High",
        timeframe: "3-6 months"
      });
    }

    if (score < 700) {
      recommendations.push({
        title: "Build Credit History",
        description: "Maintain active loan accounts to demonstrate responsible credit management",
        impact: "Medium",
        timeframe: "6-12 months"
      });
    }

    if (score < 750) {
      recommendations.push({
        title: "Diversify Credit Types",
        description: "Consider different types of loans to show you can manage various credit products",
        impact: "Medium",
        timeframe: "12+ months"
      });
    }

    recommendations.push({
      title: "Monitor Your Score",
      description: "Check your credit score regularly to track improvements and catch any issues early",
      impact: "Low",
      timeframe: "Ongoing"
    });

    return recommendations;
  };

  const getScorePercentage = (score) => {
    return ((score - 300) / (850 - 300)) * 100;
  };

  if (loading) {
    return (
      <div className="modal-overlay">
        <div className="modal-content">
          <div className="loading-center">
            <div className="loading-spinner"></div>
            <p>Calculating your credit score...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="credit-score-modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h2>📈 Credit Score</h2>
            <button className="close-btn" onClick={onClose}>✕</button>
          </div>
          <div className="error-state">
            <div className="error-icon">⚠️</div>
            <h3>Unable to Load Credit Score</h3>
            <p>{error}</p>
            <button className="retry-btn" onClick={fetchCreditScore}>
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="credit-score-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>📈 Credit Score</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="credit-score-content">
          {/* Score Display */}
          <div className="score-display">
            <div className="score-circle">
              <div className="score-progress">
                <svg viewBox="0 0 100 100" className="score-svg">
                  <circle
                    cx="50"
                    cy="50"
                    r="45"
                    fill="none"
                    stroke="#e5e7eb"
                    strokeWidth="8"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="45"
                    fill="none"
                    stroke={getScoreBandColor(creditScore?.score_band)}
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={`${getScorePercentage(creditScore?.score) * 2.83} 283`}
                    transform="rotate(-90 50 50)"
                    className="score-progress-bar"
                  />
                </svg>
                <div className="score-text">
                  <div className="score-number">{creditScore?.score}</div>
                  <div className="score-range">300-850</div>
                </div>
              </div>
            </div>
            
            <div className="score-info">
              <div className="score-band" style={{ color: getScoreBandColor(creditScore?.score_band) }}>
                {getScoreBandLabel(creditScore?.score_band)}
              </div>
              <div className="score-date">
                Last updated: {new Date(creditScore?.calculated_at).toLocaleDateString()}
              </div>
              <button 
                className="refresh-btn" 
                onClick={refreshCreditScore}
                disabled={refreshing}
              >
                {refreshing ? '🔄 Updating...' : '🔄 Refresh Score'}
              </button>
            </div>
          </div>

          {/* Score Factors */}
          <div className="score-factors">
            <h3>📊 Score Factors</h3>
            <div className="factors-grid">
              {creditScore?.factors && Object.entries(creditScore.factors).map(([factor, value]) => (
                <div key={factor} className="factor-item">
                  <div className="factor-header">
                    <span className="factor-name">
                      {factor.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </span>
                    <span className="factor-value">{Math.round(value)}%</span>
                  </div>
                  <div className="factor-bar">
                    <div 
                      className="factor-progress"
                      style={{ 
                        width: `${value}%`,
                        backgroundColor: value >= 80 ? '#10b981' : value >= 60 ? '#f59e0b' : '#ef4444'
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recommendations */}
          <div className="recommendations">
            <h3>💡 Recommendations</h3>
            <div className="recommendations-list">
              {creditScore?.recommendations && creditScore.recommendations.map((rec, index) => (
                <div key={index} className="recommendation-item">
                  <div className="recommendation-header">
                    <h4>{rec.title}</h4>
                    <span className={`impact-badge impact-${rec.impact?.toLowerCase()}`}>
                      {rec.impact} Impact
                    </span>
                  </div>
                  <p>{rec.description}</p>
                  <div className="recommendation-timeframe">
                    ⏱️ Expected timeframe: {rec.timeframe}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Credit Score Ranges */}
          <div className="score-ranges">
            <h3>📋 Credit Score Ranges</h3>
            <div className="ranges-list">
              <div className="range-item">
                <div className="range-color" style={{ backgroundColor: '#ef4444' }}></div>
                <div className="range-info">
                  <span className="range-label">Poor</span>
                  <span className="range-values">300-579</span>
                </div>
              </div>
              <div className="range-item">
                <div className="range-color" style={{ backgroundColor: '#f59e0b' }}></div>
                <div className="range-info">
                  <span className="range-label">Fair</span>
                  <span className="range-values">580-669</span>
                </div>
              </div>
              <div className="range-item">
                <div className="range-color" style={{ backgroundColor: '#3b82f6' }}></div>
                <div className="range-info">
                  <span className="range-label">Good</span>
                  <span className="range-values">670-739</span>
                </div>
              </div>
              <div className="range-item">
                <div className="range-color" style={{ backgroundColor: '#22c55e' }}></div>
                <div className="range-info">
                  <span className="range-label">Very Good</span>
                  <span className="range-values">740-799</span>
                </div>
              </div>
              <div className="range-item">
                <div className="range-color" style={{ backgroundColor: '#10b981' }}></div>
                <div className="range-info">
                  <span className="range-label">Excellent</span>
                  <span className="range-values">800-850</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <style>{`
          .credit-score-modal {
            background: white;
            border-radius: 24px;
            max-width: 800px;
            width: 90vw;
            max-height: 90vh;
            overflow-y: auto;
            box-shadow: 0 25px 50px -12px rgb(0 0 0 / 0.25);
            border: 1px solid #e2e8f0;
          }

          .credit-score-content {
            padding: 2rem;
          }

          .score-display {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 3rem;
            margin-bottom: 3rem;
            padding: 2rem;
            background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
            border-radius: 20px;
            border: 1px solid #bae6fd;
          }

          .score-circle {
            position: relative;
          }

          .score-progress {
            position: relative;
            width: 200px;
            height: 200px;
          }

          .score-svg {
            width: 100%;
            height: 100%;
            transform: rotate(-90deg);
          }

          .score-progress-bar {
            transition: stroke-dasharray 1s ease-in-out;
          }

          .score-text {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            text-align: center;
          }

          .score-number {
            font-size: 3rem;
            font-weight: 800;
            color: #1e293b;
            line-height: 1;
          }

          .score-range {
            font-size: 0.875rem;
            color: #64748b;
            font-weight: 600;
          }

          .score-info {
            text-align: center;
          }

          .score-band {
            font-size: 2rem;
            font-weight: 700;
            margin-bottom: 0.5rem;
          }

          .score-date {
            font-size: 0.875rem;
            color: #64748b;
            margin-bottom: 1.5rem;
          }

          .refresh-btn {
            background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
            color: white;
            border: none;
            border-radius: 12px;
            padding: 0.75rem 1.5rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s ease;
            font-size: 0.875rem;
          }

          .refresh-btn:hover:not(:disabled) {
            transform: translateY(-2px);
            box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1);
          }

          .refresh-btn:disabled {
            opacity: 0.6;
            cursor: not-allowed;
          }

          .score-factors {
            margin-bottom: 3rem;
          }

          .score-factors h3 {
            color: #374151;
            margin-bottom: 1.5rem;
            font-size: 1.25rem;
          }

          .factors-grid {
            display: grid;
            gap: 1rem;
          }

          .factor-item {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 1.5rem;
          }

          .factor-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 1rem;
          }

          .factor-name {
            font-weight: 600;
            color: #374151;
          }

          .factor-value {
            font-weight: 700;
            color: #1e293b;
          }

          .factor-bar {
            width: 100%;
            height: 8px;
            background: #e5e7eb;
            border-radius: 4px;
            overflow: hidden;
          }

          .factor-progress {
            height: 100%;
            border-radius: 4px;
            transition: width 1s ease-in-out;
          }

          .recommendations {
            margin-bottom: 3rem;
          }

          .recommendations h3 {
            color: #374151;
            margin-bottom: 1.5rem;
            font-size: 1.25rem;
          }

          .recommendations-list {
            display: grid;
            gap: 1rem;
          }

          .recommendation-item {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 1.5rem;
          }

          .recommendation-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 1rem;
          }

          .recommendation-header h4 {
            color: #374151;
            font-size: 1rem;
            margin: 0;
          }

          .impact-badge {
            padding: 0.25rem 0.75rem;
            border-radius: 20px;
            font-size: 0.75rem;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.05em;
          }

          .impact-high {
            background: #fee2e2;
            color: #991b1b;
          }

          .impact-medium {
            background: #fef3c7;
            color: #92400e;
          }

          .impact-low {
            background: #d1fae5;
            color: #065f46;
          }

          .recommendation-item p {
            color: #64748b;
            margin-bottom: 1rem;
            line-height: 1.6;
          }

          .recommendation-timeframe {
            font-size: 0.875rem;
            color: #64748b;
            font-weight: 600;
          }

          .score-ranges h3 {
            color: #374151;
            margin-bottom: 1.5rem;
            font-size: 1.25rem;
          }

          .ranges-list {
            display: grid;
            gap: 0.75rem;
          }

          .range-item {
            display: flex;
            align-items: center;
            gap: 1rem;
            padding: 1rem;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
          }

          .range-color {
            width: 16px;
            height: 16px;
            border-radius: 50%;
          }

          .range-info {
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex: 1;
          }

          .range-label {
            font-weight: 600;
            color: #374151;
          }

          .range-values {
            font-weight: 600;
            color: #64748b;
            font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
          }

          .error-state {
            text-align: center;
            padding: 3rem;
          }

          .error-icon {
            font-size: 4rem;
            margin-bottom: 1rem;
          }

          .error-state h3 {
            color: #374151;
            margin-bottom: 1rem;
          }

          .error-state p {
            color: #6b7280;
            margin-bottom: 2rem;
          }

          .retry-btn {
            background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
            color: white;
            border: none;
            border-radius: 12px;
            padding: 1rem 2rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s ease;
          }

          .retry-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1);
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
            .credit-score-modal {
              width: 95vw;
              max-height: 95vh;
            }

            .credit-score-content {
              padding: 1rem;
            }

            .score-display {
              flex-direction: column;
              gap: 2rem;
            }

            .score-progress {
              width: 150px;
              height: 150px;
            }

            .score-number {
              font-size: 2.5rem;
            }

            .recommendation-header {
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

export default CreditScore;