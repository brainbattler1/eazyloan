import React, { useState, useEffect, useMemo, lazy, Suspense } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../utils/supabase';
import NotificationCenter from './NotificationCenter';
import NotificationPreferences from './NotificationPreferences';

// Lazy load heavy components for better performance
const PaymentCenter = lazy(() => import('./PaymentCenter'));
const ExpertSupport = lazy(() => import('./ExpertSupport'));
const CreditScore = lazy(() => import('./CreditScore'));
const LoanCalculator = lazy(() => import('./LoanCalculator'));
const TwoFactorAuth = lazy(() => import('./TwoFactorAuth'));
const ProfileModal = lazy(() => import('./ProfileModal'));
const LoanApplicationsList = lazy(() => import('./LoanApplicationsList'));
const LoanApplicationForm = lazy(() => import('./LoanApplicationForm'));
const ReferralProgram = lazy(() => import('./ReferralProgram'));

// Loading component for lazy-loaded components
const ComponentLoader = () => (
  <div className="component-loading">
    <div className="loading-spinner"></div>
    <div className="loading-text">Loading...</div>
  </div>
);

const Dashboard = ({ onViewApplications, onAdminPanel, onProfileUpdate }) => {
  const { user, signOut } = useAuth();
  const [stats, setStats] = useState({
    totalApplications: 0,
    pendingApplications: 0,
    approvedApplications: 0,
    totalLoanAmount: 0
  });
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState('user');
  const [userProfile, setUserProfile] = useState(null);
  const [error, setError] = useState(null);
  const [activeSection, setActiveSection] = useState('home');
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [showReferralModal, setShowReferralModal] = useState(false);
  const [showNotificationPreferences, setShowNotificationPreferences] = useState(false);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    if (user) {
      // Use requestIdleCallback for better performance
      const scheduleDataFetch = () => {
        if ('requestIdleCallback' in window) {
          requestIdleCallback(() => fetchDashboardData(), { timeout: 2000 });
        } else {
          setTimeout(() => fetchDashboardData(), 50);
        }
      };
      scheduleDataFetch();
    } else {
      setLoading(false);
    }
  }, [user]);

  const toggleSidebar = () => {
    setShowSidebar(!showSidebar);
  };

  const isAdmin = useMemo(() => ['admin', 'super_admin'].includes(userRole), [userRole]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Optimize with single query using joins and RPC functions
      const [roleResult, profileResult, statsResult] = await Promise.allSettled([
        supabase.from('user_roles').select('role').eq('user_id', user.id).single(),
        supabase.from('user_profiles').select('first_name, last_name, username, profile_picture_url').eq('user_id', user.id).single(),
        supabase.rpc('get_user_dashboard_stats', { check_user_id: user.id })
      ]);
      
      let finalUserRole = 'user';
      if (roleResult.status === 'fulfilled' && roleResult.value.data) {
        finalUserRole = roleResult.value.data.role || 'user';
      }
      
      if (profileResult.status === 'fulfilled' && profileResult.value.data) {
        setUserProfile(profileResult.value.data);
      }
      
      let finalStats = { totalApplications: 0, pendingApplications: 0, approvedApplications: 0, totalLoanAmount: 0 };
      if (statsResult.status === 'fulfilled' && statsResult.value.data) {
        const statsData = statsResult.value.data;
        if (Array.isArray(statsData) && statsData.length > 0) {
          const rawStats = statsData[0];
          finalStats = {
            totalApplications: Number(rawStats.totalapplications || rawStats.totalApplications || 0),
            pendingApplications: Number(rawStats.pendingapplications || rawStats.pendingApplications || 0),
            approvedApplications: Number(rawStats.approvedapplications || rawStats.approvedApplications || 0),
            totalLoanAmount: Number(rawStats.totalloanamount || rawStats.totalLoanAmount || 0)
          };
        }
      } else {
        // Fallback to individual query if RPC function doesn't exist
        const { data: applications } = await supabase
          .from('loan_applications')
          .select('status, amount')
          .eq('user_id', user.id);
        
        if (applications) {
          const pending = applications.filter(app => app.status === 'pending').length;
          const approved = applications.filter(app => app.status === 'approved').length;
          const totalAmount = applications
            .filter(app => app.status === 'approved')
            .reduce((sum, app) => sum + parseFloat(app.amount || 0), 0);
          finalStats = {
            totalApplications: applications.length,
            pendingApplications: pending,
            approvedApplications: approved,
            totalLoanAmount: totalAmount
          };
        }
      }
      
      setUserRole(finalUserRole);
      setStats(finalStats);
    } catch (error) {
      setError(error.message || 'Failed to load dashboard data');
      setUserRole('user');
      setStats({ totalApplications: 0, pendingApplications: 0, approvedApplications: 0, totalLoanAmount: 0 });
    } finally {
      setLoading(false);
    }
  };

  const getProfileInitials = () => {
    if (userProfile) {
      const firstName = userProfile.first_name || '';
      const lastName = userProfile.last_name || '';
      if (firstName && lastName) {
        return (firstName.charAt(0) + lastName.charAt(0)).toUpperCase();
      }
    }
    return user?.email?.charAt(0)?.toUpperCase() || 'U';
  };

  const handleSignOut = async () => {
    try {
      console.log('🔄 Dashboard: Initiating sign out...');
      const result = await signOut();
      
      if (result?.error) {
        console.warn('⚠️ Sign out completed with warning:', result.error);
      } else {
        console.log('✅ Dashboard: Sign out completed successfully');
      }
      
      // Force page reload to ensure clean state
      setTimeout(() => {
        window.location.href = '/';
      }, 100);
      
    } catch (error) {
      console.error('❌ Dashboard sign out error:', error);
      // Still try to redirect even if there's an error
      window.location.href = '/';
    }
  };

  const quickActions = [
    { id: 'apply', icon: '🚀', title: 'Apply Now', subtitle: 'Quick loan application', color: 'from-blue-500 to-purple-600' },
    { id: 'calculator', icon: '🧮', title: 'Calculator', subtitle: 'Estimate payments', color: 'from-green-500 to-teal-600' },
    { id: 'support', icon: '💬', title: 'Support', subtitle: 'Get help instantly', color: 'from-orange-500 to-red-600' },
    { id: 'credit', icon: '📊', title: 'Credit Score', subtitle: 'Check your score', color: 'from-purple-500 to-pink-600' }
  ];

  const contactOptions = [
    { id: 'whatsapp', icon: '💬', title: 'WhatsApp', number: '+18723298624', color: 'from-green-400 to-green-600' },
    { id: 'phone', icon: '📞', title: 'Call Support', number: '+254794105975', color: 'from-blue-400 to-blue-600' }
  ];

  const renderHomeContent = () => (
    <div className="home-content">
      {/* Hero Section */}
      <div className="hero-section">
        <div className="hero-content">
          <h1 className="hero-title">
            Welcome{userProfile?.first_name ? `, ${userProfile.first_name}` : ''}! 👋
          </h1>
          <p className="hero-subtitle">Your financial journey starts here</p>
        </div>
        <div className="hero-avatar" onClick={() => setShowProfileModal(true)}>
          {userProfile?.profile_picture_url ? (
            <img src={userProfile.profile_picture_url} alt="Profile" />
          ) : (
            <span className="avatar-initials">{getProfileInitials()}</span>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="stats-section">
        <h2 className="section-title">Your Overview</h2>
        <div className="stats-grid">
          <div className="stat-card stat-primary">
            <div className="stat-icon">📋</div>
            <div className="stat-content">
              <div className="stat-value">{stats.totalApplications}</div>
              <div className="stat-label">Total Applications</div>
            </div>
          </div>
          <div className="stat-card stat-warning">
            <div className="stat-icon">⏳</div>
            <div className="stat-content">
              <div className="stat-value">{stats.pendingApplications}</div>
              <div className="stat-label">Pending</div>
            </div>
          </div>
          <div className="stat-card stat-success">
            <div className="stat-icon">✅</div>
            <div className="stat-content">
              <div className="stat-value">{stats.approvedApplications}</div>
              <div className="stat-label">Approved</div>
            </div>
          </div>
          <div className="stat-card stat-info">
            <div className="stat-icon">💰</div>
            <div className="stat-content">
              <div className="stat-value">${(stats.totalLoanAmount || 0).toLocaleString()}</div>
              <div className="stat-label">Total Amount</div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="actions-section">
        <h2 className="section-title">Quick Actions</h2>
        <div className="actions-grid">
          {quickActions.map(action => (
            <div 
              key={action.id} 
              className={`action-card bg-gradient-to-br ${action.color}`}
              onClick={() => setActiveSection(action.id)}
            >
              <div className="action-icon">{action.icon}</div>
              <div className="action-content">
                <div className="action-title">{action.title}</div>
                <div className="action-subtitle">{action.subtitle}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Contact Section */}
      <div className="contact-section">
        <h2 className="section-title">Need Help?</h2>
        <div className="contact-grid">
          {contactOptions.map(contact => (
            <div 
              key={contact.id}
              className={`contact-card bg-gradient-to-br ${contact.color}`}
              onClick={() => {
                if (contact.id === 'whatsapp') {
                  window.open(`https://wa.me/${contact.number}`, '_blank');
                } else {
                  window.location.href = `tel:${contact.number}`;
                }
              }}
            >
              <div className="contact-icon">{contact.icon}</div>
              <div className="contact-title">{contact.title}</div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Notification Preferences Modal */}
      {showNotificationPreferences && (
        <NotificationPreferences 
          onClose={() => setShowNotificationPreferences(false)}
        />
      )}
    </div>
  );

  const renderContent = () => {
    switch (activeSection) {
      case 'home':
        return renderHomeContent();
      case 'apply':
        const hasPendingApplication = stats.pendingApplications > 0;
        return (
          <div className="section-content">
            {hasPendingApplication ? (
              <div className="pending-warning">
                <div className="warning-icon">⏳</div>
                <h3>Application in Progress</h3>
                <p>You have a pending application. Please wait for processing.</p>
                <button 
                  className="btn btn-secondary" 
                  onClick={() => setActiveSection('applications')}
                >
                  View Applications
                </button>
              </div>
            ) : (
              <Suspense fallback={<ComponentLoader />}>
                <LoanApplicationForm 
                  onClose={() => {
                    setActiveSection('home');
                    fetchDashboardData();
                  }}
                />
              </Suspense>
            )}
          </div>
        );
      case 'applications':
        return (
          <Suspense fallback={<ComponentLoader />}>
            <LoanApplicationsList onBack={() => setActiveSection('home')} />
          </Suspense>
        );
      case 'payments':
        return (
          <Suspense fallback={<ComponentLoader />}>
            <PaymentCenter onClose={() => setActiveSection('home')} />
          </Suspense>
        );
      case 'support':
        return (
          <Suspense fallback={<ComponentLoader />}>
            <ExpertSupport onClose={() => setActiveSection('home')} />
          </Suspense>
        );
      case 'credit':
        return (
          <Suspense fallback={<ComponentLoader />}>
            <CreditScore onClose={() => setActiveSection('home')} />
          </Suspense>
        );
      case 'calculator':
        return (
          <Suspense fallback={<ComponentLoader />}>
            <LoanCalculator onClose={() => setActiveSection('home')} />
          </Suspense>
        );
      case '2fa':
        return (
          <Suspense fallback={<ComponentLoader />}>
            <TwoFactorAuth onClose={() => setActiveSection('home')} />
          </Suspense>
        );
      case 'referral':
        return (
          <div className="section-content">
            <div className="referral-panel">
              <h2>🎁 Referral Program</h2>
              <p>Invite friends and earn rewards for every successful referral!</p>
              <button className="btn btn-primary" onClick={() => setShowReferralModal(true)}>Open Referral Program</button>
            </div>
          </div>
        );
      case 'admin':
        return isAdmin ? (
          <div className="section-content">
            <div className="admin-panel">
              <h2>Admin Panel</h2>
              <p>Access administrative functions and manage the system.</p>
              <button className="btn btn-primary" onClick={onAdminPanel}>Open Admin Panel</button>
            </div>
          </div>
        ) : null;
      default:
        return renderHomeContent();
    }
  };

  const bottomNavItems = [
    { id: 'home', icon: '🏠', label: 'Home' },
    { id: 'applications', icon: '📋', label: 'Apps' },
    { id: 'apply', icon: '🚀', label: 'Apply' },
    { id: 'payments', icon: '💳', label: 'Pay' },
    { id: 'referral', icon: '🎁', label: 'Referral' },
    ...(isAdmin ? [{ id: 'admin', icon: '🛡️', label: 'Admin' }] : [{ id: '2fa', icon: '🔒', label: '2FA' }])
  ];

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="loading-screen">
          <div className="loading-spinner"></div>
          <div className="loading-text">Loading your dashboard...</div>
        </div>
        <style>{styles}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-container">
        <div className="error-screen">
          <div className="error-icon">⚠️</div>
          <div className="error-text">Dashboard Error: {error}</div>
          <button className="btn btn-primary" onClick={fetchDashboardData}>Retry</button>
        </div>
        <style>{styles}</style>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      {/* Header */}
       <header className="header">
         <div className="header-content">
           <div className="header-top">
              <button className={`hamburger-menu ${showSidebar ? 'open' : ''}`} onClick={toggleSidebar}>
                <span></span>
                <span></span>
                <span></span>
              </button>
              <div className="header-actions">
                <NotificationCenter />
                <button 
                  className="btn btn-ghost notification-settings-btn"
                  onClick={() => setShowNotificationPreferences(true)}
                  title="Notification Settings"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1 1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.79a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                </button>
                <button className="btn btn-outline sign-out-btn" onClick={handleSignOut}>
                  Sign Out
                </button>
              </div>
            </div>
            <div className="header-center">
              <div className="logo">
                <span className="logo-text">EazyLoan</span>
              </div>
              <div className="user-info">
                <span className="user-email">{user?.email}</span>
                {isAdmin && (
                  <span className="user-role-text">
                    {userRole === 'super_admin' ? '👑 Super Admin' : '🛡️ Admin'}
                  </span>
                )}
              </div>
            </div>
         </div>
       </header>

      {/* Main Content */}
      <main className="main-content">
        {renderContent()}
      </main>

      {/* Left Sidebar */}
      {showSidebar && <div className="sidebar-overlay" onClick={toggleSidebar}></div>}
      <nav className={`left-sidebar ${showSidebar ? 'open' : ''}`}>
        <div className="sidebar-header">
          <h3>Navigation</h3>
          <button className="close-sidebar" onClick={toggleSidebar}>×</button>
        </div>
        <div className="sidebar-content">
          {bottomNavItems.map(item => (
            <button
              key={item.id}
              className={`sidebar-item ${activeSection === item.id ? 'active' : ''}`}
              onClick={() => {
                setActiveSection(item.id);
                setShowSidebar(false);
              }}
            >
              <span className="sidebar-icon">{item.icon}</span>
              <span className="sidebar-label">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Profile Modal */}
      {showProfileModal && (
        <Suspense fallback={<ComponentLoader />}>
          <ProfileModal 
            isOpen={showProfileModal} 
            onClose={() => setShowProfileModal(false)} 
          />
        </Suspense>
      )}

      {/* Referral Program Modal */}
      {showReferralModal && (
        <div className="modal-overlay" onClick={() => setShowReferralModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <Suspense fallback={<ComponentLoader />}>
              <ReferralProgram onClose={() => setShowReferralModal(false)} />
            </Suspense>
          </div>
        </div>
      )}

      <style>{styles}</style>
    </div>
  );
};

const styles = `
  .dashboard-container {
    min-height: 100vh;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    position: relative;
    overflow-x: hidden;
    will-change: transform; /* Optimize for animations */
  }

  .loading-screen, .error-screen, .component-loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    padding: 2rem;
    text-align: center;
  }
  
  .component-loading {
    min-height: 200px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    backdrop-filter: blur(5px);
  }

  .loading-spinner {
    width: 50px;
    height: 50px;
    border: 4px solid rgba(255, 255, 255, 0.3);
    border-top: 4px solid white;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 1rem;
    contain: strict; /* Improve performance */
  }

  .loading-text, .error-text {
    color: white;
    font-size: 1.1rem;
    font-weight: 500;
  }

  .error-icon {
    font-size: 3rem;
    margin-bottom: 1rem;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  
  /* Add content-visibility for better rendering performance */
  .main-content {
    content-visibility: auto;
    contain-intrinsic-size: 1px 5000px; /* Estimate size */
  }

  .header {
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(20px);
    border-bottom: 1px solid rgba(255, 255, 255, 0.2);
    position: sticky;
    top: 0;
    z-index: 100;
  }

  .header-content {
    display: flex;
    flex-direction: column;
    padding: 1rem 1.5rem;
    max-width: 1200px;
    margin: 0 auto;
    gap: 1rem;
  }

  .header-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
  }

  .header-actions {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .notification-settings-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    border-radius: 10px;
    background: rgba(255, 255, 255, 0.1);
    border: 2px solid rgba(255, 255, 255, 0.2);
    color: white;
    cursor: pointer;
    transition: all 0.3s ease;
    backdrop-filter: blur(10px);
  }

  .notification-settings-btn:hover {
    background: rgba(102, 126, 234, 0.2);
    border-color: rgba(102, 126, 234, 0.4);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.2);
  }

  .header-center {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
  }

  .hamburger-menu {
    display: flex;
    flex-direction: column;
    justify-content: space-around;
    width: 36px;
    height: 26px;
    background: rgba(255, 255, 255, 0.1);
    border: 2px solid rgba(255, 255, 255, 0.2);
    border-radius: 10px;
    cursor: pointer;
    padding: 6px;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    backdrop-filter: blur(10px);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  .hamburger-menu:hover {
    background: rgba(102, 126, 234, 0.2);
    border-color: rgba(102, 126, 234, 0.4);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.2);
  }

  .hamburger-menu:active {
    transform: translateY(0);
    box-shadow: 0 2px 6px rgba(102, 126, 234, 0.3);
  }

  .hamburger-menu span {
    width: 100%;
    height: 2.5px;
    background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
    border-radius: 2px;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
  }

  .hamburger-menu:hover span {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    box-shadow: 0 2px 4px rgba(102, 126, 234, 0.3);
  }

  .hamburger-menu span:nth-child(1) {
    transform-origin: top left;
  }

  .hamburger-menu span:nth-child(2) {
    transform-origin: center;
  }

  .hamburger-menu span:nth-child(3) {
    transform-origin: bottom left;
  }

  .hamburger-menu.open {
    background: rgba(239, 68, 68, 0.2);
    border-color: rgba(239, 68, 68, 0.4);
  }

  .hamburger-menu.open span {
    background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
  }

  .hamburger-menu.open span:nth-child(1) {
    transform: rotate(45deg) translate(3px, 3px);
  }

  .hamburger-menu.open span:nth-child(2) {
    opacity: 0;
    transform: scaleX(0);
  }

  .hamburger-menu.open span:nth-child(3) {
    transform: rotate(-45deg) translate(3px, -3px);
  }

  .hamburger-menu.open:hover {
    background: rgba(239, 68, 68, 0.3);
    border-color: rgba(239, 68, 68, 0.5);
    box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
  }

  .sign-out-btn {
    font-size: 0.875rem;
    padding: 0.5rem 1rem;
  }

  .logo-text {
    font-size: 2rem;
    font-weight: 800;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    margin-bottom: 0.25rem;
  }

  .user-info {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
  }

  .user-email {
    font-size: 1rem;
    color: #0f172a;
    font-weight: 600;
    background: rgba(255, 255, 255, 0.9);
    padding: 0.25rem 0.5rem;
    border-radius: 6px;
    border: 1px solid rgba(0, 0, 0, 0.1);
  }

  .user-role {
    font-size: 1.2rem;
    color: #1e293b;
  }

  .user-role-text {
    font-size: 0.8rem;
    color: #667eea;
    font-weight: 600;
    background: rgba(102, 126, 234, 0.1);
    padding: 0.2rem 0.5rem;
    border-radius: 12px;
    border: 1px solid rgba(102, 126, 234, 0.2);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .main-content {
    padding: 0 0 100px 0;
    max-width: 1200px;
    margin: 0 auto;
  }

  .home-content {
    padding: 1.5rem;
  }

  .section-content {
    padding: 1.5rem;
  }

  .hero-section {
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(20px);
    border-radius: 20px;
    padding: 2rem;
    margin-bottom: 2rem;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
  }

  .hero-title {
    font-size: 1.8rem;
    font-weight: 700;
    color: #1e293b;
    margin: 0 0 0.5rem 0;
  }

  .hero-subtitle {
    color: #64748b;
    font-size: 1rem;
    margin: 0;
  }

  .hero-avatar {
    width: 60px;
    height: 60px;
    border-radius: 50%;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: transform 0.2s ease;
    box-shadow: 0 4px 20px rgba(102, 126, 234, 0.3);
  }

  .hero-avatar:hover {
    transform: scale(1.05);
  }

  .hero-avatar img {
    width: 100%;
    height: 100%;
    border-radius: 50%;
    object-fit: cover;
  }

  .avatar-initials {
    color: white;
    font-weight: 700;
    font-size: 1.2rem;
  }

  .section-title {
    font-size: 1.3rem;
    font-weight: 700;
    color: white;
    margin: 0 0 1rem 0;
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }

  .stats-section {
    margin-bottom: 2rem;
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 1rem;
  }

  .stat-card {
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(20px);
    border-radius: 16px;
    padding: 1.5rem;
    display: flex;
    align-items: center;
    gap: 1rem;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
    transition: transform 0.2s ease;
  }

  .stat-card:hover {
    transform: translateY(-2px);
  }

  .stat-icon {
    font-size: 2rem;
    opacity: 0.8;
  }

  .stat-value {
    font-size: 1.5rem;
    font-weight: 700;
    color: #1e293b;
    margin: 0;
  }

  .stat-label {
    font-size: 0.8rem;
    color: #64748b;
    font-weight: 500;
    margin: 0;
  }

  .actions-section {
    margin-bottom: 2rem;
  }

  .actions-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    gap: 1rem;
  }

  .action-card {
    border-radius: 16px;
    padding: 1.5rem;
    color: white;
    cursor: pointer;
    transition: all 0.2s ease;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 0.5rem;
  }

  .action-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 30px rgba(0, 0, 0, 0.2);
  }

  .action-icon {
    font-size: 2rem;
    margin-bottom: 0.5rem;
  }

  .action-title {
    font-weight: 700;
    font-size: 1rem;
  }

  .action-subtitle {
    font-size: 0.8rem;
    opacity: 0.9;
  }

  .contact-section {
    margin-bottom: 2rem;
  }

  .contact-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    gap: 1rem;
  }

  .contact-card {
    border-radius: 16px;
    padding: 1.5rem;
    color: white;
    cursor: pointer;
    transition: all 0.2s ease;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 0.5rem;
  }

  .contact-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 30px rgba(0, 0, 0, 0.2);
  }

  .contact-icon {
    font-size: 2rem;
  }

  .contact-title {
    font-weight: 600;
    font-size: 0.9rem;
  }

  .sidebar-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    z-index: 150;
    backdrop-filter: blur(4px);
  }

  .left-sidebar {
    position: fixed;
    top: 0;
    left: 0;
    height: 100vh;
    width: 280px;
    background: rgba(255, 255, 255, 0.98);
    backdrop-filter: blur(20px);
    border-right: 1px solid rgba(255, 255, 255, 0.2);
    z-index: 200;
    transform: translateX(-100%);
    transition: transform 0.3s ease;
    display: flex;
    flex-direction: column;
    box-shadow: 2px 0 20px rgba(0, 0, 0, 0.1);
  }

  .left-sidebar.open {
    transform: translateX(0);
  }

  .sidebar-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.5rem 1.5rem 1rem;
    border-bottom: 1px solid rgba(0, 0, 0, 0.1);
  }

  .sidebar-header h3 {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 700;
    color: #1e293b;
  }

  .close-sidebar {
    background: none;
    border: none;
    font-size: 1.5rem;
    cursor: pointer;
    color: #64748b;
    padding: 0.25rem;
    border-radius: 4px;
    transition: all 0.2s ease;
  }

  .close-sidebar:hover {
    background: rgba(0, 0, 0, 0.1);
    color: #1e293b;
  }

  .sidebar-content {
    flex: 1;
    padding: 1rem 0;
    overflow-y: auto;
  }

  .sidebar-item {
    display: flex;
    align-items: center;
    gap: 1rem;
    background: none;
    border: none;
    padding: 1rem 1.5rem;
    cursor: pointer;
    transition: all 0.2s ease;
    width: 100%;
    text-align: left;
    border-radius: 0;
  }

  .sidebar-item:hover {
    background: rgba(102, 126, 234, 0.1);
  }

  .sidebar-item.active {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
  }

  .sidebar-icon {
    font-size: 1.25rem;
    min-width: 24px;
    text-align: center;
  }

  .sidebar-label {
    font-size: 0.95rem;
    font-weight: 600;
  }

  .sidebar-item.active .sidebar-icon,
  .sidebar-item.active .sidebar-label {
    color: white;
  }

  .btn {
    padding: 0.75rem 1.5rem;
    border-radius: 12px;
    border: none;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    font-size: 0.9rem;
  }

  .btn-primary {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
  }

  .btn-primary:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
  }

  .btn-secondary {
    background: rgba(255, 255, 255, 0.9);
    color: #1e293b;
    border: 1px solid rgba(0, 0, 0, 0.1);
  }

  .btn-secondary:hover {
    background: white;
    transform: translateY(-1px);
  }

  .btn-outline {
    background: transparent;
    color: #dc2626;
    border: 1px solid #dc2626;
  }

  .btn-outline:hover {
    background: #dc2626;
    color: white;
  }

  .pending-warning {
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(20px);
    border-radius: 16px;
    padding: 2rem;
    text-align: center;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  }

  .warning-icon {
    font-size: 3rem;
    margin-bottom: 1rem;
  }

  .pending-warning h3 {
    color: #1e293b;
    margin: 0 0 1rem 0;
  }

  .pending-warning p {
    color: #64748b;
    margin: 0 0 1.5rem 0;
  }

  .admin-panel {
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(20px);
    border-radius: 16px;
    padding: 2rem;
    text-align: center;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  }

  .admin-panel h2 {
    color: #1e293b;
    margin: 0 0 1rem 0;
  }

  .admin-panel p {
    color: #64748b;
    margin: 0 0 1.5rem 0;
  }

  /* Mobile Optimizations */
  @media (max-width: 768px) {
    .header-content {
      padding: 0.75rem 1rem;
      gap: 0.75rem;
    }

    .hamburger-menu {
      width: 30px;
      height: 22px;
      padding: 4px;
    }

    .hamburger-menu span {
      height: 2px;
    }

    .hamburger-menu.open span:nth-child(1) {
      transform: rotate(45deg) translate(2px, 2px);
    }

    .hamburger-menu.open span:nth-child(3) {
      transform: rotate(-45deg) translate(2px, -2px);
    }

    .logo-text {
      font-size: 1.5rem;
    }

    .sign-out-btn {
      font-size: 0.75rem;
      padding: 0.4rem 0.8rem;
    }

    .user-email {
      font-size: 0.85rem;
      padding: 0.2rem 0.4rem;
    }

    .user-role-text {
      font-size: 0.7rem;
      padding: 0.15rem 0.3rem;
    }

    .left-sidebar {
      width: 100vw;
    }

    .sidebar-header {
      padding: 1rem;
    }

    .sidebar-item {
      padding: 0.875rem 1rem;
    }

    .sidebar-icon {
      font-size: 1.1rem;
    }

    .sidebar-label {
      font-size: 0.9rem;
    }

    .hero-section {
      padding: 1.5rem;
    }

    .hero-title {
      font-size: 1.5rem;
    }

    .stats-grid {
      grid-template-columns: repeat(2, 1fr);
    }

    .actions-grid {
      grid-template-columns: repeat(2, 1fr);
    }

    .home-content {
      padding: 1rem;
    }

    .section-content {
      padding: 1rem;
    }
  }

  @media (max-width: 480px) {
    .stats-grid {
      grid-template-columns: 1fr;
    }

    .hero-section {
      flex-direction: column;
      text-align: center;
      gap: 1rem;
    }

    .hero-avatar {
      order: -1;
    }
  }

  /* Modal Styles */
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 20px;
    backdrop-filter: blur(5px);
  }

  .modal-content {
    background: white;
    border-radius: 20px;
    max-width: 95vw;
    max-height: 95vh;
    overflow-y: auto;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    animation: modalSlideIn 0.3s ease-out;
  }

  @keyframes modalSlideIn {
    from {
      opacity: 0;
      transform: scale(0.9) translateY(20px);
    }
    to {
      opacity: 1;
      transform: scale(1) translateY(0);
    }
  }

  @media (max-width: 768px) {
    .modal-overlay {
      padding: 10px;
    }

    .modal-content {
      max-width: 100vw;
      max-height: 100vh;
      border-radius: 15px;
    }
  }
`;

export default Dashboard;