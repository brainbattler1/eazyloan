import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../utils/supabase';
import LoanApplicationsList from '../components/LoanApplicationsList';
import Dashboard from '../components/Dashboard';
import AdminPanel from '../components/AdminPanel';
import ProfileModal from '../components/ProfileModal';
import BannedUser from '../components/BannedUser';
import MaintenanceMode from '../components/MaintenanceMode';

export default function MainApp() {
  const { user, isBanned, signOut } = useAuth();
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [currentView, setCurrentView] = useState('dashboard');
  const [userProfile, setUserProfile] = useState(null);
  const [userRole, setUserRole] = useState('user');
  const [roleLoading, setRoleLoading] = useState(true);
  const [appError, setAppError] = useState(null);
  const [maintenanceMode, setMaintenanceMode] = useState(null);
  const [maintenanceLoading, setMaintenanceLoading] = useState(true);

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
    let timeoutId;
    
    const fetchUserRole = async () => {
      if (!user) {
        setUserRole('user');
        setRoleLoading(false);
        return;
      }

      try {
        setRoleLoading(true);
        console.log('🔄 Fetching user role for:', user.id);
        
        // Set a timeout to prevent endless role loading
        timeoutId = setTimeout(() => {
          console.warn('⚠️ Role fetch timeout, using default role');
          setUserRole('user');
          setRoleLoading(false);
        }, 5000); // 5 second timeout
        
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
        
        clearTimeout(timeoutId);
      } catch (error) {
        console.warn('⚠️ Role function unavailable, using default:', error);
        setUserRole('user');
        clearTimeout(timeoutId);
      } finally {
        setRoleLoading(false);
      }
    };

    fetchUserRole();
    
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [user]);

  // Check maintenance mode status
  useEffect(() => {
    const checkMaintenanceMode = async () => {
      try {
        setMaintenanceLoading(true);
        const { data, error } = await supabase.rpc('get_maintenance_status');
        
        if (error) {
          console.warn('⚠️ Could not check maintenance status:', error);
          setMaintenanceMode(null);
        } else if (data && data.length > 0) {
          setMaintenanceMode(data[0]);
        } else {
          setMaintenanceMode({ is_enabled: false });
        }
      } catch (error) {
        console.warn('⚠️ Maintenance check failed:', error);
        setMaintenanceMode(null);
      } finally {
        setMaintenanceLoading(false);
      }
    };

    // Only check maintenance mode if user is authenticated
    if (user && !roleLoading) {
      checkMaintenanceMode();
    } else if (!user) {
      setMaintenanceLoading(false);
      setMaintenanceMode(null);
    }
  }, [user, roleLoading]);

  // Check if user has admin privileges
  const isAdmin = ['admin', 'super_admin'].includes(userRole);
  const isSuperAdmin = userRole === 'super_admin';
  
  // Check if maintenance mode should block this user
  const shouldShowMaintenance = maintenanceMode?.is_enabled && !isSuperAdmin;

  const handleSignOut = async () => {
    try {
      console.log('🔄 MainApp: Initiating sign out...');
      const result = await signOut();
      
      if (result?.error) {
        console.warn('⚠️ Sign out completed with warning:', result.error);
      } else {
        console.log('✅ MainApp: Sign out completed successfully');
      }
      
      // Reset local state
      setCurrentView('dashboard');
      setUserRole('user');
      setAppError(null);
      
      // Force page reload to ensure clean state
      setTimeout(() => {
        window.location.href = '/';
      }, 100);
      
    } catch (error) {
      console.error('❌ MainApp sign out error:', error);
      // Still try to redirect and reset state even if there's an error
      setCurrentView('dashboard');
      setUserRole('user');
      setAppError(null);
      window.location.href = '/';
    }
  };

  const handleProfileUpdate = () => {
    setShowProfileModal(true);
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
                onViewApplications={() => setCurrentView('applications')}
                onAdminPanel={() => setCurrentView('admin')}
                onProfileUpdate={handleProfileUpdate}
              />
            );
          }
        case 'dashboard':
        default:
          return (
            <Dashboard 
              onViewApplications={() => setCurrentView('applications')}
              onAdminPanel={() => setCurrentView('admin')}
              onProfileUpdate={handleProfileUpdate}
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

  // Show loading during role or maintenance loading
  if (roleLoading || maintenanceLoading) {
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
              {roleLoading ? 'Loading user permissions...' : 'Checking system status...'}
            </p>
            <button 
              onClick={() => {
                console.log('🔄 Manual loading override triggered');
                setRoleLoading(false);
                setUserRole('user');
              }}
              style={{
                marginTop: '1rem',
                padding: '0.5rem 1rem',
                background: '#6b7280',
                color: 'white',
                border: 'none',
                borderRadius: '0.25rem',
                cursor: 'pointer',
                fontSize: '0.875rem'
              }}
            >
              Skip Loading
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show banned user page if user is banned
  if (isBanned) {
    return (
      <div className="app">
        <BannedUser onSignOut={signOut} />
      </div>
    );
  }

  // Show maintenance mode if enabled and user is not super admin
  if (shouldShowMaintenance) {
    return (
      <div className="app">
        <MaintenanceMode 
          message={maintenanceMode.message}
          onSignOut={handleSignOut}
        />
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
      <ProfileModal 
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
      />
    </div>
  );
}