import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../utils/supabase';
import PaymentCenter from './PaymentCenter';
import ExpertSupport from './ExpertSupport';
import CreditScore from './CreditScore';
import LoanCalculator from './LoanCalculator';
import TwoFactorAuth from './TwoFactorAuth';
import ProfileModal from './ProfileModal';
import LoanApplicationsList from './LoanApplicationsList';

const navItems = [
  { key: 'dashboard', label: 'Home', icon: '🏠' },
  { key: 'apply', label: 'Apply', icon: '🚀' },
  { key: 'applications', label: 'My Apps', icon: '📋' },
  { key: 'payments', label: 'Payments', icon: '💳' },
  { key: 'support', label: 'Support', icon: '📞' },
  { key: 'credit', label: 'Credit', icon: '📈' },
  { key: 'calculator', label: 'Calc', icon: '🎯' },
  { key: '2fa', label: '2FA', icon: '🔒' },
];

const contactItems = [
  { key: 'whatsapp', label: 'WhatsApp', icon: '💬', action: 'whatsapp', number: '+18723298624' },
  { key: 'phone', label: 'Call Support', icon: '📞', action: 'phone', number: '+254794105975' },
];

const Dashboard = ({ onApplyLoan, onViewApplications, onAdminPanel, onProfileUpdate }) => {
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
  const [section, setSection] = useState('dashboard');
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (user) fetchDashboardData();
    else setLoading(false);
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      let finalUserRole = 'user';
      try {
        const { data: roleData, error: roleError } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .single();
        if (!roleError && roleData) finalUserRole = roleData.role || 'user';
      } catch {}
      try {
        const { data: profileData } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('user_id', user.id)
          .single();
        if (profileData) {
          setUserProfile(profileData);
          onProfileUpdate?.(profileData);
        }
      } catch {}
      let finalStats = { totalApplications: 0, pendingApplications: 0, approvedApplications: 0, totalLoanAmount: 0 };
      try {
        const { data: directData } = await supabase
          .from('loan_applications')
          .select('*')
          .eq('user_id', user.id);
        if (directData) {
          const applications = directData || [];
          const pending = applications.filter(app => app.status === 'pending').length;
          const approved = applications.filter(app => app.status === 'approved').length;
          const totalAmount = applications.filter(app => app.status === 'approved').reduce((sum, app) => sum + parseFloat(app.amount || 0), 0);
          finalStats = {
            totalApplications: applications.length,
            pendingApplications: pending,
            approvedApplications: approved,
            totalLoanAmount: totalAmount
          };
        }
      } catch {}
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

  const isAdmin = ['admin', 'super_admin'].includes(userRole);
  const nav = [
    ...navItems,
    ...(isAdmin ? [{ key: 'admin', label: 'Admin', icon: '🛡️' }] : []),
    ...contactItems
  ];

  const renderSection = () => {
    if (section === 'dashboard') {
      return (
        <div className="dash-dashboard-content">
          <h1 className="dash-welcome">Welcome{userProfile?.first_name ? `, ${userProfile.first_name}` : ''}!</h1>
          <div className="dash-stats-grid">
            <div className="dash-stat-card dash-stat-apps">
              <div className="dash-stat-label">Total Apps</div>
              <div className="dash-stat-value">{stats.totalApplications}</div>
            </div>
            <div className="dash-stat-card dash-stat-pending">
              <div className="dash-stat-label">Pending</div>
              <div className="dash-stat-value">{stats.pendingApplications}</div>
            </div>
            <div className="dash-stat-card dash-stat-approved">
              <div className="dash-stat-label">Approved</div>
              <div className="dash-stat-value">{stats.approvedApplications}</div>
            </div>
            <div className="dash-stat-card dash-stat-total">
              <div className="dash-stat-label">Total Approved</div>
              <div className="dash-stat-value">{stats.totalLoanAmount}</div>
            </div>
          </div>
        </div>
      );
    }
    if (section === 'apply') {
      const hasPendingApplication = stats.pendingApplications > 0;
      return (
        <div className="dash-apply-content">
          {hasPendingApplication ? (
            <div className="pending-application-warning">
              <div className="warning-icon">⏳</div>
              <h3>Application in Progress</h3>
              <p>You currently have a pending loan application. Please wait for it to be processed before applying for another loan.</p>
              <button 
                className="card-btn secondary" 
                onClick={() => setSection('applications')}
              >
                View My Applications
              </button>
            </div>
          ) : (
            <div className="apply-section">
              <h2>Apply for a Loan</h2>
              <p>Start your loan application process and get the financial support you need.</p>
              <button className="card-btn" onClick={onApplyLoan}>
                Start Loan Application
              </button>
            </div>
          )}
        </div>
      );
    }
    if (section === 'applications') return <LoanApplicationsList onBack={() => setSection('dashboard')} />;
    if (section === 'payments') return <PaymentCenter onClose={() => setSection('dashboard')} />;
    if (section === 'support') return <ExpertSupport onClose={() => setSection('dashboard')} />;
    if (section === 'credit') return <CreditScore onClose={() => setSection('dashboard')} />;
    if (section === 'calculator') return <LoanCalculator onClose={() => setSection('dashboard')} />;
    if (section === '2fa') return <TwoFactorAuth onClose={() => setSection('dashboard')} />;
    if (section === 'admin') return isAdmin ? (
      <div className="dash-admin-content">
        <h2>Admin Panel</h2>
        <p>Access administrative functions and manage the system.</p>
        <button className="card-btn" onClick={onAdminPanel}>Open Admin Panel</button>
      </div>
    ) : null;
    return null;
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
      await signOut();
    } catch (error) {
      alert('Failed to sign out. Please try again.');
    }
  };

  if (loading) {
    return <div className="dash-loading">Loading...</div>;
  }
  if (error) {
    return <div className="dash-error">Dashboard Error: {error}</div>;
  }

  return (
    <div className="dash-root">
      {/* Sidebar */}
      <aside className={`dash-sidebar${sidebarOpen ? ' open' : ''}`}>
        <div className="dash-sidebar-header">
          <span className="dash-sidebar-title">EazyLoan</span>
        </div>
        <nav className="dash-nav">
          {nav.map(item => (
            <button
              key={item.key}
              className={`dash-nav-btn${section === item.key ? ' active' : ''}${item.action ? ' contact-btn' : ''}`}
              data-action={item.action}
              onClick={() => {
                if (item.action === 'whatsapp') {
                  window.open(`https://wa.me/${item.number}`, '_blank');
                  setSidebarOpen(false);
                } else if (item.action === 'phone') {
                  window.location.href = `tel:${item.number}`;
                  setSidebarOpen(false);
                } else {
                  setSection(item.key);
                  setSidebarOpen(false);
                }
              }}
            >
              <span className="dash-nav-icon">{item.icon}</span> {item.label}
            </button>
          ))}
        </nav>
      </aside>
      {/* Sidebar overlay for mobile */}
      {sidebarOpen && <div className="dash-sidebar-overlay" onClick={() => setSidebarOpen(false)} />}
      {/* Main content area */}
      <div className="dash-main">
        {/* Top bar */}
        <header className="dash-topbar">
          <button className="dash-hamburger" onClick={() => setSidebarOpen(true)} aria-label="Open navigation">☰</button>
          <div className="dash-topbar-center">
            <div className="dash-topbar-profile" onClick={() => setShowProfileModal(true)}>
              {userProfile?.profile_picture_url ? (
                <img src={userProfile.profile_picture_url} alt="Profile" />
              ) : (
                <span className="dash-profile-initials">{getProfileInitials()}</span>
              )}
            </div>
          </div>
          <div className="dash-topbar-right">
            <div className="dash-topbar-userinfo">
              <span className="dash-topbar-email">{user?.email}</span>
              {isAdmin && (
                <span className="dash-topbar-role">{userRole === 'super_admin' ? '👑 Super Admin' : '🛡️ Admin'}</span>
              )}
            </div>
            <button className="dash-signout dash-signout-compact" onClick={handleSignOut}>Sign Out</button>
          </div>
        </header>
        <main className="dash-content">
          {renderSection()}
        </main>
        <ProfileModal isOpen={showProfileModal} onClose={() => setShowProfileModal(false)} />
      </div>
      {/* Styles */}
      <style>{`
        .dash-root {
          min-height: 100vh;
          display: flex;
          background: linear-gradient(120deg, #f0f4ff 0%, #dbeafe 100%);
        }
        .dash-sidebar {
          width: 220px;
          background: #fff;
          box-shadow: 2px 0 12px 0 rgba(0,0,0,0.07);
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          padding: 1.2rem 0.7rem;
          z-index: 300;
          position: fixed;
          top: 0;
          left: 0;
          height: 100vh;
          transition: transform 0.25s cubic-bezier(.4,0,.2,1);
          transform: translateX(0);
        }
        .dash-sidebar-header {
          display: flex;
          align-items: center;
          margin-bottom: 32px;
          width: 100%;
        }
        .dash-sidebar-title {
          font-weight: 800;
          font-size: 20px;
          color: #2563eb;
          letter-spacing: 0.5px;
        }
        .dash-nav {
          width: 100%;
        }
        .dash-nav-btn {
          display: flex;
          align-items: center;
          width: 100%;
          background: none;
          border: none;
          color: #334155;
          font-weight: 600;
          font-size: 16px;
          padding: 0.8rem 1.2rem;
          border-radius: 8px;
          margin-bottom: 4px;
          cursor: pointer;
          transition: background 0.18s;
        }
        .dash-nav-btn.active {
          background: #f1f5fd;
          color: #2563eb;
        }
        .dash-nav-btn.contact-btn {
          background: #f1f5fd;
          color: #2563eb;
        }
        .dash-nav-icon {
          font-size: 22px;
          margin-right: 12px;
        }
        .dash-sidebar-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background: rgba(0,0,0,0.18);
          z-index: 200;
        }
        .dash-main {
          flex: 1;
          margin-left: 220px;
          display: flex;
          flex-direction: column;
          min-height: 100vh;
        }
        .dash-topbar {
          display: flex;
          align-items: center;
          background: #fff;
          border-bottom: 1px solid #e5e7eb;
          min-height: 64px;
          padding: 0.7rem 1.2rem;
          position: sticky;
          top: 0;
          z-index: 100;
          justify-content: space-between;
        }
        .dash-hamburger {
          font-size: 28px;
          color: #2563eb;
          background: none;
          border: none;
          margin-right: 12px;
          cursor: pointer;
          display: none;
        }
        .dash-topbar-center {
          flex: 1;
          display: flex;
          justify-content: center;
          align-items: center;
        }
        .dash-topbar-profile {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          overflow: hidden;
          background: #e0e7ef;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 18px;
          color: #2563eb;
          cursor: pointer;
        }
        .dash-topbar-profile img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .dash-profile-initials {
          font-size: 18px;
        }
        .dash-topbar-right {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .dash-topbar-userinfo {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          margin-right: 16px;
        }
        .dash-topbar-email {
          font-size: 14px;
          color: #334155;
          font-weight: 600;
        }
        .dash-topbar-role {
          font-size: 12px;
          color: #f59e0b;
          font-weight: 700;
        }
        .dash-signout {
          background: #ef4444;
          color: #fff;
          border: none;
          border-radius: 8px;
          padding: 0.35rem 0.7rem;
          font-size: 13px;
          margin-left: 6px;
          font-weight: 700;
          cursor: pointer;
        }
        .dash-signout-compact {
          padding: 0.35rem 0.7rem;
          font-size: 13px;
          margin-left: 6px;
        }
        .dash-content {
          flex: 1;
          width: 100%;
          max-width: 600px;
          margin: 0 auto;
          padding: 1.2rem 0.7rem;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .dash-welcome {
          font-weight: 800;
          color: #2563eb;
          font-size: 1.2rem;
          margin-bottom: 8px;
          text-align: center;
        }
        .dash-stats-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          margin-bottom: 18px;
          justify-content: center;
          width: 100%;
        }
        .dash-stat-card {
          border-radius: 10px;
          padding: 12px;
          min-width: 90px;
          flex: 1;
          text-align: center;
          box-sizing: border-box;
        }
        .dash-stat-apps { background: #f1f5fd; }
        .dash-stat-pending { background: #fef9c3; }
        .dash-stat-approved { background: #dcfce7; }
        .dash-stat-total { background: #ede9fe; }
        .dash-stat-label {
          font-weight: 700;
          font-size: 13px;
        }
        .dash-stat-apps .dash-stat-label { color: #2563eb; }
        .dash-stat-pending .dash-stat-label { color: #f59e0b; }
        .dash-stat-approved .dash-stat-label { color: #10b981; }
        .dash-stat-total .dash-stat-label { color: #8b5cf6; }
        .dash-stat-value {
          font-size: 18px;
          font-weight: 800;
        }
        .dash-loading, .dash-error {
          padding: 32px;
          text-align: center;
          color: #2563eb;
          font-weight: 700;
        }
        .dash-error { color: #ef4444; }
        @media (max-width: 900px) {
          .dash-main {
            margin-left: 0;
          }
          .dash-sidebar {
            transform: translateX(-100%);
          }
          .dash-sidebar.open {
            transform: translateX(0);
          }
          .dash-hamburger {
            display: block;
          }
        }
        @media (max-width: 700px) {
          .dash-root {
            flex-direction: column;
          }
          .dash-main {
            margin-left: 0;
          }
          .dash-sidebar {
            width: 80vw;
            min-width: 0;
            max-width: 320px;
            padding: 1.2rem 0.5rem;
          }
          .dash-sidebar-header {
            margin-bottom: 24px;
          }
          .dash-topbar {
            min-height: 56px;
            padding: 0.7rem 0.5rem;
            justify-content: flex-start;
          }
          .dash-topbar-center {
            flex: unset;
            justify-content: flex-start;
            margin-right: 8px;
          }
          .dash-topbar-right {
            gap: 6px;
          }
          .dash-content {
            max-width: 100vw;
            padding: 1rem 0.2rem;
            align-items: stretch;
          }
          .dash-stats-grid {
            flex-direction: column;
            gap: 10px;
            align-items: stretch;
          }
          .dash-stat-card {
            min-width: 0;
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
};

export default Dashboard;