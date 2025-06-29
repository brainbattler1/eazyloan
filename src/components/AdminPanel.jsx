import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';
import './AdminPanel.css';

const AdminPanel = ({ onBack }) => {
  const [activeSection, setActiveSection] = useState('overview');
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({});
  const [loans, setLoans] = useState([]);
  const [users, setUsers] = useState([]);
  const [userRoles, setUserRoles] = useState({});
  const [tickets, setTickets] = useState([]);
  const [actions, setActions] = useState([]);
  const [successMessage, setSuccessMessage] = useState('');
  const [maintenanceMode, setMaintenanceMode] = useState({
    is_enabled: false,
    message: 'The application is currently under maintenance. Please check back later.',
    enabled_at: null
  });
  const [maintenanceMessage, setMaintenanceMessage] = useState('');
  const [maintenanceLoading, setMaintenanceLoading] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState(null);

  useEffect(() => {
    loadData();
    checkCurrentUserRole();
  }, []);

  const checkCurrentUserRole = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .single();
        
        setCurrentUserRole(roleData?.role || null);
        
        // If user doesn't have super_admin role, assign it
        if (!roleData || roleData.role !== 'super_admin') {
          await assignSuperAdminRole(user.id);
        }
      }
    } catch (error) {
      console.error('Error checking user role:', error);
    }
  };

  const assignSuperAdminRole = async (userId) => {
    try {
      const { error } = await supabase
        .from('user_roles')
        .upsert({
          user_id: userId,
          role: 'super_admin',
          assigned_at: new Date().toISOString(),
          assigned_by: userId
        });
      
      if (error) {
        console.error('Error assigning super_admin role:', error);
      } else {
        setCurrentUserRole('super_admin');
        showSuccessMessage('✅ Super admin privileges granted');
      }
    } catch (error) {
      console.error('Error assigning super_admin role:', error);
    }
  };

  // Auto-dismiss success message after 3 seconds
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  const showSuccessMessage = (message) => {
    setSuccessMessage(message);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      // Load all data in parallel
      const [loansData, usersData, authUsersData, userRolesData, ticketsData, actionsData, maintenanceData] = await Promise.all([
        supabase.from('loan_applications').select('*').order('created_at', { ascending: false }),
        supabase.from('user_profiles').select('*').order('created_at', { ascending: false }),
        supabase.from('auth.users').select('id, email, last_sign_in_at, created_at').order('created_at', { ascending: false }),
        supabase.from('user_roles').select('*'),
        supabase.from('support_tickets').select('*').order('created_at', { ascending: false }),
        supabase.from('admin_actions').select('*').order('created_at', { ascending: false }),
        supabase.rpc('get_maintenance_status')
      ]);

      setLoans(loansData.data || []);
      
      // Merge user_profiles with auth.users data to get complete user information
      const mergedUsers = (usersData.data || []).map(profile => {
        const authUser = (authUsersData.data || []).find(auth => auth.id === profile.user_id);
        return {
          ...profile,
          email: authUser?.email || profile.email,
          last_sign_in_at: authUser?.last_sign_in_at,
          auth_created_at: authUser?.created_at
        };
      });
      
      setUsers(mergedUsers);
      setTickets(ticketsData.data || []);
      setActions(actionsData.data || []);
      
      // Set maintenance mode data
      if (maintenanceData.data && maintenanceData.data.length > 0) {
        const maintenance = maintenanceData.data[0];
        setMaintenanceMode(maintenance);
        setMaintenanceMessage(maintenance.message || '');
      }

      // Create a map of user roles
      const rolesMap = {};
      if (userRolesData.data) {
        userRolesData.data.forEach(role => {
          rolesMap[role.user_id] = role.role;
        });
      }
      setUserRoles(rolesMap);

      // Calculate stats
      setStats({
        totalLoans: loansData.data?.length || 0,
        pendingLoans: loansData.data?.filter(l => l.status === 'pending').length || 0,
        totalUsers: usersData.data?.length || 0,
        totalTickets: ticketsData.data?.length || 0,
        openTickets: ticketsData.data?.filter(t => t.status === 'open').length || 0
      });
    } catch (error) {
      console.error('Error loading admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLoanAction = async (loanId, action) => {
    try {
      const newStatus = action === 'approve' ? 'approved' : 'rejected';
      await supabase
        .from('loan_applications')
        .update({ status: newStatus })
        .eq('id', loanId);
      
      // Log admin action
      await supabase.rpc('log_admin_action', {
        action_type: action === 'approve' ? 'loan_approval' : 'loan_rejection',
        target_type: 'loan_application',
        target_id: loanId
      });

      await loadData(); // Refresh data
      
      // Show success message
      const actionText = action === 'approve' ? 'approved' : 'rejected';
      showSuccessMessage(`✅ Loan successfully ${actionText}!`);
    } catch (error) {
      console.error('Error updating loan:', error);
      showSuccessMessage('❌ Failed to update loan status');
    }
  };

  const handleRoleAssignment = async (userId, newRole) => {
    try {
      // Check if user already has a role
      const existingRole = userRoles[userId];
      
      if (existingRole) {
        // Update existing role
        await supabase
          .from('user_roles')
          .update({ role: newRole })
          .eq('user_id', userId);
      } else {
        // Insert new role
        await supabase
          .from('user_roles')
          .insert({ user_id: userId, role: newRole });
      }

      // Log admin action
      await supabase.rpc('log_admin_action', {
        action_type: 'role_assignment',
        target_type: 'user',
        target_id: userId,
        details: { new_role: newRole, previous_role: existingRole || 'none' }
      });

      await loadData(); // Refresh data
      
      // Show success message
      showSuccessMessage(`👤 Role successfully assigned! User is now ${newRole}`);
    } catch (error) {
      console.error('Error assigning role:', error);
      showSuccessMessage('❌ Failed to assign role');
    }
  };

  const handleUserBan = async (userId, shouldBan) => {
    try {
      const actionType = shouldBan ? 'user_deactivation' : 'user_activation';
      const statusText = shouldBan ? 'banned' : 'unbanned';
      
      // Update user active status
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({ is_active: !shouldBan })
        .eq('user_id', userId);

      if (updateError) {
        throw updateError;
      }

      // Log admin action
      const { error: logError } = await supabase.rpc('log_admin_action', {
        action_type: actionType,
        target_type: 'user',
        target_id: userId,
        details: { is_active: !shouldBan, action: statusText }
      });

      if (logError) {
        console.warn('Failed to log admin action:', logError);
      }

      // Update local state immediately for better UX
      setUsers(prevUsers => 
        prevUsers.map(user => 
          user.user_id === userId 
            ? { ...user, is_active: !shouldBan }
            : user
        )
      );
      
      // Show success message
      showSuccessMessage(`${shouldBan ? '🚫' : '✅'} User successfully ${statusText}!`);
      
      // Refresh data to ensure consistency
      await loadData();
    } catch (error) {
      console.error('Error updating user status:', error);
      showSuccessMessage(`❌ Failed to ${shouldBan ? 'ban' : 'unban'} user: ${error.message}`);
    }
  };

  const handleUserDeletion = async (userId, userEmail) => {
    // Check if current user has super_admin role
    if (currentUserRole !== 'super_admin') {
      showSuccessMessage('❌ Super admin privileges required for user deletion');
      // Try to assign super_admin role
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await assignSuperAdminRole(user.id);
        showSuccessMessage('🔄 Super admin role assigned. Please try deletion again.');
      }
      return;
    }

    // Show confirmation dialog
    const confirmMessage = `⚠️ PERMANENT DELETION WARNING\n\nThis will permanently delete ALL data for user: ${userEmail}\n\nThis includes:\n• User profile and account\n• All loan applications\n• Support tickets\n• Notifications\n• All associated data\n\nThis action CANNOT be undone!\n\nType 'DELETE' to confirm:`;
    
    const confirmation = prompt(confirmMessage);
    
    if (confirmation !== 'DELETE') {
      showSuccessMessage('❌ User deletion cancelled');
      return;
    }

    try {
      setLoading(true);
      
      // Get user data summary before deletion
      const { data: summary, error: summaryError } = await supabase.rpc('get_user_data_summary', {
        target_user_id: userId
      });

      if (summaryError) {
        const errorMsg = summaryError.message || 'Unknown error';
        if (errorMsg.includes('function "get_user_data_summary" does not exist')) {
          throw new Error('Database function not found. Please ensure migrations are applied.');
        } else {
          throw new Error(`Failed to get user data summary: ${errorMsg}`);
        }
      }

      // Perform permanent deletion
      const { data: result, error: deleteError } = await supabase.rpc('delete_user_permanently', {
        target_user_id: userId
      });

      if (deleteError) {
        const errorMsg = deleteError.message || 'Unknown error';
        if (errorMsg.includes('function "delete_user_permanently" does not exist')) {
          throw new Error('Database function not found. Please ensure migrations are applied.');
        } else if (errorMsg.includes('Access denied')) {
          throw new Error('Access denied - super admin privileges required');
        } else {
          throw new Error(`Failed to delete user: ${errorMsg}`);
        }
      }

      // Show success message with summary
      const summaryText = summary && summary.length > 0 ? summary[0] : {};
      showSuccessMessage(
        `🗑️ User permanently deleted!\n` +
        `Removed: ${summaryText.profile_count || 0} profile(s), ` +
        `${summaryText.loan_count || 0} loan(s), ` +
        `${summaryText.ticket_count || 0} ticket(s), ` +
        `${summaryText.notification_count || 0} notification(s)`
      );
      
      // Refresh data to remove deleted user from UI
      await loadData();
    } catch (error) {
      console.error('Error deleting user:', error);
      showSuccessMessage(`❌ Failed to delete user: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleTicketUpdate = async (ticketId, newStatus) => {
    try {
      await supabase
        .from('support_tickets')
        .update({ status: newStatus })
        .eq('id', ticketId);
      
      await supabase.rpc('log_admin_action', {
        action_type: 'status_update',
        target_type: 'support_ticket',
        target_id: ticketId,
        details: { new_status: newStatus }
      });

      await loadData();
      showSuccessMessage(`🎫 Ticket status updated to ${newStatus}!`);
    } catch (error) {
      console.error('Error updating ticket:', error);
      showSuccessMessage('❌ Failed to update ticket status');
    }
  };

  const handleMaintenanceToggle = async (enable) => {
    setMaintenanceLoading(true);
    try {
      const { data: currentUser } = await supabase.auth.getUser();
      
      if (!currentUser?.user) {
        throw new Error('User not authenticated');
      }

      const { data, error } = await supabase.rpc('toggle_maintenance_mode', {
        enable_maintenance: enable,
        maintenance_message: maintenanceMessage || null,
        admin_user_id: currentUser.user.id
      });

      if (error) {
        throw error;
      }

      // Update local state
      setMaintenanceMode(prev => ({
        ...prev,
        is_enabled: enable,
        message: maintenanceMessage || prev.message,
        enabled_at: enable ? new Date().toISOString() : prev.enabled_at
      }));

      // Log admin action
      await supabase.rpc('log_admin_action', {
        action_type: enable ? 'maintenance_enabled' : 'maintenance_disabled',
        target_type: 'system',
        target_id: null,
        details: { 
          maintenance_enabled: enable,
          message: maintenanceMessage || null
        }
      });

      showSuccessMessage(
        enable 
          ? '🔧 Maintenance mode enabled! Regular users will see the maintenance page.'
          : '✅ Maintenance mode disabled! Application is now accessible to all users.'
      );
      
      // Refresh data to get updated maintenance status
      await loadData();
    } catch (error) {
      console.error('Error toggling maintenance mode:', error);
      showSuccessMessage(`❌ Failed to ${enable ? 'enable' : 'disable'} maintenance mode: ${error.message}`);
    } finally {
      setMaintenanceLoading(false);
    }
  };

  const getRoleColor = (role) => {
    switch (role?.toLowerCase()) {
      case 'super_admin': return '#dc2626';
      case 'admin': return '#2563eb';
      case 'user': return '#059669';
      default: return '#6b7280';
    }
  };

  const renderOverview = () => (
    <div className="admin-section">
      <h2>📊 Dashboard Overview</h2>
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">💰</div>
          <div className="stat-content">
            <div className="stat-number">{stats.totalLoans}</div>
            <div className="stat-label">Total Loans</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">⏳</div>
          <div className="stat-content">
            <div className="stat-number">{stats.pendingLoans}</div>
            <div className="stat-label">Pending Loans</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">👥</div>
          <div className="stat-content">
            <div className="stat-number">{stats.totalUsers}</div>
            <div className="stat-label">Total Users</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🎫</div>
          <div className="stat-content">
            <div className="stat-number">{stats.openTickets}</div>
            <div className="stat-label">Open Tickets</div>
          </div>
        </div>
      </div>

      <div className="recent-actions">
        <h3>🕒 Recent Admin Actions</h3>
        <div className="actions-list">
          {actions.slice(0, 5).map(action => (
            <div key={action.id} className="action-item">
              <div className="action-icon">
                {action.action_type === 'loan_approval' && '✅'}
                {action.action_type === 'loan_rejection' && '❌'}
                {action.action_type === 'status_update' && '🔄'}
                {action.action_type === 'role_assignment' && '👤'}
              </div>
              <div className="action-details">
                <div className="action-type">{action.action_type.replace('_', ' ')}</div>
                <div className="action-time">
                  {new Date(action.created_at).toLocaleDateString()}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderLoans = () => (
    <div className="admin-section">
      <h2>💰 Loan Management</h2>
      {loading ? (
        <div className="loading">Loading loans...</div>
      ) : loans.length === 0 ? (
        <div className="empty-state">No loan applications found</div>
      ) : (
        <div className="loans-list">
          {loans.map(loan => (
            <div key={loan.id} className="loan-card">
              <div className="loan-header">
                <div className="loan-amount">${(loan.amount || 0).toLocaleString()}</div>
                <div className={`loan-status ${loan.status}`}>
                  {loan.status}
                </div>
              </div>
              <div className="loan-details">
                <div className="loan-applicant">{loan.user_name || loan.user_email}</div>
                <div className="loan-purpose">{loan.purpose}</div>
                <div className="loan-date">
                  Applied: {new Date(loan.created_at).toLocaleDateString()}
                </div>
              </div>
              {loan.status === 'pending' && (
                <div className="loan-actions">
                  <button 
                    onClick={() => handleLoanAction(loan.id, 'approve')}
                    className="btn-approve"
                  >
                    ✅ Approve
                  </button>
                  <button 
                    onClick={() => handleLoanAction(loan.id, 'reject')}
                    className="btn-reject"
                  >
                    ❌ Reject
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderUsers = () => (
    <div className="admin-section">
      <div className="section-header">
        <h2>👥 User Management</h2>
        <div className="user-stats">
          <span className="stat-item">
            <span className="stat-number">{users.filter(u => u.is_active !== false).length}</span>
            <span className="stat-label">Active Users</span>
          </span>
          <span className="stat-item">
            <span className="stat-number">{users.filter(u => u.is_active === false).length}</span>
            <span className="stat-label">Banned Users</span>
          </span>
        </div>
      </div>
      
      {loading ? (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading users...</p>
        </div>
      ) : users.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">👥</div>
          <h3>No Users Found</h3>
          <p>No users have registered yet.</p>
        </div>
      ) : (
        <div className="users-grid">
          {users.map(user => (
            <div key={user.id} className={`user-management-card ${user.is_active === false ? 'banned-user' : 'active-user'}`}>
              {/* User Header */}
              <div className="user-card-header">
                <div className="user-avatar-large">
                  <span className="avatar-text">
                    {user.first_name?.[0] || 'U'}{user.last_name?.[0] || ''}
                  </span>
                  <div className={`status-indicator ${user.is_active !== false ? 'online' : 'banned'}`}></div>
                </div>
                <div className="user-basic-info">
                  <h3 className="user-display-name">
                    {user.first_name} {user.last_name}
                  </h3>
                  <p className="user-handle">@{user.username}</p>
                  <div className={`user-status-badge ${user.is_active !== false ? 'status-active' : 'status-banned'}`}>
                    {user.is_active !== false ? (
                      <><span className="status-dot"></span> Active</>
                    ) : (
                      <><span className="status-dot"></span> Banned</>
                    )}
                  </div>
                </div>
              </div>

              {/* User Details */}
              <div className="user-card-body">
                <div className="user-detail-row">
                  <span className="detail-label">📧 Email:</span>
                  <span className="detail-value">{user.email}</span>
                </div>
                <div className="user-detail-row">
                  <span className="detail-label">📅 Joined:</span>
                  <span className="detail-value">{new Date(user.created_at).toLocaleDateString()}</span>
                </div>
                <div className="user-detail-row">
                  <span className="detail-label">🕐 Last Login:</span>
                  <span className="detail-value">
                    {user.last_sign_in_at 
                      ? new Date(user.last_sign_in_at).toLocaleString()
                      : 'Never logged in'
                    }
                  </span>
                </div>
                <div className="user-detail-row">
                  <span className="detail-label">🎭 Role:</span>
                  <div className="role-management">
                    <span 
                      className="current-role-badge"
                      style={{ backgroundColor: getRoleColor(userRoles[user.user_id]) }}
                    >
                      {userRoles[user.user_id] || 'user'}
                    </span>
                    <select
                      value={userRoles[user.user_id] || 'user'}
                      onChange={(e) => handleRoleAssignment(user.user_id, e.target.value)}
                      className="role-selector"
                      disabled={user.is_active === false}
                    >
                      <option value="user">User</option>
                      <option value="admin">Admin</option>
                      <option value="super_admin">Super Admin</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="user-card-actions">
                {user.is_active !== false ? (
                  <button 
                    onClick={() => handleUserBan(user.user_id, true)}
                    className="action-btn ban-btn"
                    title="Ban this user from accessing the platform"
                  >
                    <span className="btn-icon">🚫</span>
                    <span className="btn-text">Ban User</span>
                  </button>
                ) : (
                  <button 
                    onClick={() => handleUserBan(user.user_id, false)}
                    className="action-btn unban-btn"
                    title="Restore user access to the platform"
                  >
                    <span className="btn-icon">✅</span>
                    <span className="btn-text">Unban User</span>
                  </button>
                )}
                <button className="action-btn secondary-btn" title="View user details">
                  <span className="btn-icon">👁️</span>
                  <span className="btn-text">View Details</span>
                </button>
                <button 
                  onClick={() => handleUserDeletion(user.user_id, user.email)}
                  className="action-btn delete-btn"
                  title="Permanently delete all user data - This action cannot be undone!"
                >
                  <span className="btn-icon">🗑️</span>
                  <span className="btn-text">Delete User</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderTickets = () => (
    <div className="admin-section">
      <h2>🎫 Support Tickets</h2>
      {loading ? (
        <div className="loading">Loading tickets...</div>
      ) : tickets.length === 0 ? (
        <div className="empty-state">No support tickets found</div>
      ) : (
        <div className="tickets-list">
          {tickets.map(ticket => (
            <div key={ticket.id} className="ticket-card">
              <div className="ticket-header">
                <div className="ticket-subject">{ticket.subject}</div>
                <div className={`ticket-status ${ticket.status}`}>
                  {ticket.status}
                </div>
              </div>
              <div className="ticket-details">
                <div className="ticket-user">{ticket.user_email}</div>
                <div className="ticket-message">{ticket.message}</div>
                <div className="ticket-date">
                  {new Date(ticket.created_at).toLocaleDateString()}
                </div>
              </div>
              {ticket.status === 'open' && (
                <div className="ticket-actions">
                  <button 
                    onClick={() => handleTicketUpdate(ticket.id, 'in_progress')}
                    className="btn-progress"
                  >
                    🔄 In Progress
                  </button>
                  <button 
                    onClick={() => handleTicketUpdate(ticket.id, 'resolved')}
                    className="btn-resolve"
                  >
                    ✅ Resolve
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderMaintenance = () => (
    <div className="admin-section">
      <h2>🔧 Maintenance Mode</h2>
      
      <div className="maintenance-status">
        <div className={`status-indicator ${maintenanceMode.is_enabled ? 'maintenance-active' : 'maintenance-inactive'}`}>
          <div className="status-icon">
            {maintenanceMode.is_enabled ? '🔧' : '✅'}
          </div>
          <div className="status-content">
            <div className="status-title">
              {maintenanceMode.is_enabled ? 'Maintenance Mode Active' : 'Application Online'}
            </div>
            <div className="status-description">
              {maintenanceMode.is_enabled 
                ? 'Regular users cannot access the application'
                : 'All users can access the application normally'
              }
            </div>
            {maintenanceMode.is_enabled && maintenanceMode.enabled_at && (
              <div className="status-time">
                Enabled: {maintenanceMode.enabled_at ? new Date(maintenanceMode.enabled_at).toLocaleString() : 'Unknown'}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="maintenance-controls">
        <div className="control-group">
          <label htmlFor="maintenance-message" className="control-label">
            📝 Maintenance Message
          </label>
          <textarea
            id="maintenance-message"
            value={maintenanceMessage}
            onChange={(e) => setMaintenanceMessage(e.target.value)}
            placeholder="Enter a custom message to display to users during maintenance..."
            className="maintenance-textarea"
            rows={3}
            disabled={maintenanceLoading}
          />
          <div className="textarea-hint">
            This message will be displayed to users when maintenance mode is active.
          </div>
        </div>

        <div className="maintenance-actions">
          {!maintenanceMode.is_enabled ? (
            <button
              onClick={() => handleMaintenanceToggle(true)}
              disabled={maintenanceLoading}
              className="btn-enable-maintenance"
            >
              {maintenanceLoading ? (
                <>
                  <span className="loading-spinner-small"></span>
                  <span>Enabling...</span>
                </>
              ) : (
                <>
                  <span className="btn-icon">🔧</span>
                  <span>Enable Maintenance Mode</span>
                </>
              )}
            </button>
          ) : (
            <button
              onClick={() => handleMaintenanceToggle(false)}
              disabled={maintenanceLoading}
              className="btn-disable-maintenance"
            >
              {maintenanceLoading ? (
                <>
                  <span className="loading-spinner-small"></span>
                  <span>Disabling...</span>
                </>
              ) : (
                <>
                  <span className="btn-icon">✅</span>
                  <span>Disable Maintenance Mode</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      <div className="maintenance-info">
        <div className="info-card">
          <div className="info-icon">ℹ️</div>
          <div className="info-content">
            <h4>How Maintenance Mode Works</h4>
            <ul>
              <li><strong>Super Admins:</strong> Can always access the application</li>
              <li><strong>Regular Users:</strong> Will see the maintenance page</li>
              <li><strong>Admins:</strong> Can access but should use caution</li>
              <li><strong>Duration:</strong> No automatic timeout - manually disable when ready</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeSection) {
      case 'overview': return renderOverview();
      case 'loans': return renderLoans();
      case 'users': return renderUsers();
      case 'tickets': return renderTickets();
      case 'maintenance': return renderMaintenance();
      default: return renderOverview();
    }
  };

  return (
    <div className="admin-panel">
      {/* Success Message Notification */}
      {successMessage && (
        <div className="success-notification">
          <div className="success-content">
            <span className="success-icon">
              {successMessage.includes('✅') ? '✅' : '❌'}
            </span>
            <span className="success-text">{successMessage}</span>
            <button 
              onClick={() => setSuccessMessage('')}
              className="success-close"
            >
              ×
            </button>
          </div>
        </div>
      )}

      <div className="admin-header">
        <button onClick={onBack} className="back-btn">← Back</button>
        <div className="admin-title-section">
          <h1>Admin Panel</h1>
          <div className="admin-role-badge">
            <span className={`role-indicator ${currentUserRole === 'super_admin' ? 'super-admin' : 'regular'}`}>
              {currentUserRole === 'super_admin' ? '🔑 Super Admin' : '👤 ' + (currentUserRole || 'User')}
            </span>
          </div>
        </div>
      </div>

      <div className="admin-nav">
        <button 
          className={`nav-btn ${activeSection === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveSection('overview')}
        >
          📊 Overview
        </button>
        <button 
          className={`nav-btn ${activeSection === 'loans' ? 'active' : ''}`}
          onClick={() => setActiveSection('loans')}
        >
          💰 Loans
        </button>
        <button 
          className={`nav-btn ${activeSection === 'users' ? 'active' : ''}`}
          onClick={() => setActiveSection('users')}
        >
          👥 Users
        </button>
        <button 
          className={`nav-btn ${activeSection === 'tickets' ? 'active' : ''}`}
          onClick={() => setActiveSection('tickets')}
        >
          🎫 Tickets
        </button>
        <button 
          className={`nav-btn ${activeSection === 'maintenance' ? 'active' : ''}`}
          onClick={() => setActiveSection('maintenance')}
        >
          🔧 Maintenance
        </button>
      </div>

      <div className="admin-content">
        {renderContent()}
      </div>
    </div>
  );
};

export default AdminPanel;