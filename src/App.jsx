import React, { useState, useEffect } from 'react';
import { useAuth } from './contexts/AuthContext';
import { supabase } from './utils/supabase';
import AuthForm from './components/AuthForm';
import LoanApplicationForm from './components/LoanApplicationForm';
import LoanApplicationsList from './components/LoanApplicationsList';
import Dashboard from './components/Dashboard';
import AdminPanel from './components/AdminPanel';
import ProfileModal from './components/ProfileModal';
import './App.css';

export default function App() {
  const { user, loading, signOut } = useAuth();
  const [showLoanForm, setShowLoanForm] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [currentView, setCurrentView] = useState('dashboard');
  const [userProfile, setUserProfile] = useState(null);
  const [userRole, setUserRole] = useState('user');
  const [roleLoading, setRoleLoading] = useState(true);
  const [appError, setAppError] = useState(null);

  // Add error boundary for this component
  useEffect(() => {
    const handleError = (event) => {
      console.error('Unhandled error:', event.error);
      setAppError(event.error?.message || 'An unexpected error occurred');
    };

    const handleRejection = (event) => {
      console.error('Unhandled promise rejection:', event.reason);
      setAppError(event.reason?.message || 'An unexpected error occurred');
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, []);

  // Fetch user role when user changes
  useEffect(() => {
    const fetchUserRole = async () => {
      if (!user) {
        setUserRole('user');
        setRoleLoading(false);
        return;
      }

      try {
        setRoleLoading(true);
        console.log('🔄 Fetching user role for:', user.id);
        
        // First check if user_roles table exists and has data
        const { data: roleData, error: roleError } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .single();
        
        if (roleError) {
          if (roleError.code === 'PGRST116') {
            // No role found, user is regular user
            console.log('ℹ️ No role found for user, defaulting to user role');
            setUserRole('user');
          } else {
            console.warn('⚠️ Role fetch error (using default):', roleError);
            setUserRole('user');
          }
        } else {
          const role = roleData?.role || 'user';
          setUserRole(role);
          console.log('✅ User role loaded:', role);
        }
      } catch (error) {
        console.warn('⚠️ Role function unavailable, using default:', error);
        setUserRole('user');
      } finally {
        setRoleLoading(false);
      }
    };

    fetchUserRole();
  }, [user]);

  // Check if user has admin privileges
  const isAdmin = ['admin', 'super_admin'].includes(userRole);

  const handleLoanSuccess = () => {
    setShowLoanForm(false);
    setTimeout(() => {
      setCurrentView('applications');
    }, 100);
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      setCurrentView('dashboard');
      setUserRole('user');
    } catch (error) {
      console.error('Sign out error:', error);
      setAppError('Failed to sign out. Please try again.');
    }
  };

  const renderMainContent = () => {
    try {
      switch (currentView) {
        case 'applications':
          return <LoanApplicationsList onBack={() => setCurrentView('dashboard')} />;
        case 'admin':
          // Only render admin panel if user is actually an admin
          if (isAdmin) {
            return <AdminPanel onBack={() => setCurrentView('dashboard')} />;
          } else {
            // Redirect non-admin users back to dashboard
            setCurrentView('dashboard');
            return (
              <Dashboard 
                onApplyLoan={() => setShowLoanForm(true)} 
                onViewApplications={() => setCurrentView('applications')}
                onAdminPanel={() => setCurrentView('admin')}
                onProfileUpdate={setUserProfile}
              />
            );
          }
        case 'dashboard':
        default:
          return (
            <Dashboard 
              onApplyLoan={() => setShowLoanForm(true)} 
              onViewApplications={() => setCurrentView('applications')}
              onAdminPanel={() => setCurrentView('admin')}
              onProfileUpdate={setUserProfile}
            />
          );
      }
    } catch (error) {
      console.error('Error rendering main content:', error);
      return (
        <div style={{ 
          padding: '2rem', 
          textAlign: 'center',
          background: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '0.5rem',
          margin: '2rem'
        }}>
          <h2 style={{ color: '#ef4444' }}>Content Error</h2>
          <p>There was an error loading this section.</p>
          <button 
            onClick={() => setCurrentView('dashboard')}
            style={{
              padding: '0.5rem 1rem',
              background: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '0.25rem',
              cursor: 'pointer'
            }}
          >
            Return to Dashboard
          </button>
        </div>
      );
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

  // Show app-level error
  if (appError) {
    return (
      <div className="app">
        <div className="auth-container">
          <div className="auth-card">
            <div className="logo-section">
              <div className="logo">
                <svg width="60" height="60" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="30" cy="30" r="30" fill="#ef4444"/>
                  <path d="M30 20v16M30 40h.01" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h1 className="brand-title" style={{ color: '#ef4444' }}>Application Error</h1>
            </div>
            <div style={{ textAlign: 'center', padding: '1rem' }}>
              <p style={{ marginBottom: '1rem' }}>{appError}</p>
              <button 
                onClick={() => {
                  setAppError(null);
                  window.location.reload();
                }}
                style={{
                  padding: '0.5rem 1rem',
                  background: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.25rem',
                  cursor: 'pointer'
                }}
              >
                Reload Application
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show loading during initial auth check or role loading
  if (loading || roleLoading) {
    return (
      <div className="app">
        <div className="auth-container">
          <div className="auth-card">
            <div className="logo-section">
              <div className="logo">
                <svg width="60" height="60" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="30" cy="30" r="30" fill="#4F46E5"/>
                  <path d="M20 25h20v3H20v-3zm0 6h20v3H20v-3zm0 6h15v3H20v-3z" fill="white"/>
                  <circle cx="45" cy="15" r="8" fill="#10B981"/>
                  <path d="M42 15l2 2 4-4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h1 className="brand-title">EazyLoan</h1>
            </div>
            <div className="loading-spinner"></div>
            <p style={{ color: 'var(--text-secondary)', marginTop: 'var(--spacing-md)', textAlign: 'center' }}>
              {loading ? 'Initializing application...' : 'Loading user permissions...'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Show auth form if no user
  if (!user) {
    return (
      <div className="app">
        <AuthForm />
      </div>
    );
  }

  return (
    <div className="app">
      <div className="dashboard">
        <main className="main-content">
          {renderMainContent()}
        </main>
      </div>
      {showLoanForm && (
        <LoanApplicationForm 
          onClose={() => setShowLoanForm(false)}
          onSuccess={handleLoanSuccess}
        />
      )}
      <ProfileModal 
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
      />
    </div>
  );
}