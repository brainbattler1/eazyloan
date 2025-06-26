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

  useEffect(() => {
    loadData();
  }, []);

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
      const [loansData, usersData, userRolesData, ticketsData, actionsData] = await Promise.all([
        supabase.from('loan_applications').select('*').order('created_at', { ascending: false }),
        supabase.from('user_profiles').select('*').order('created_at', { ascending: false }),
        supabase.from('user_roles').select('*'),
        supabase.from('support_tickets').select('*').order('created_at', { ascending: false }),
        supabase.from('admin_actions').select('*').order('created_at', { ascending: false })
      ]);

      setLoans(loansData.data || []);
      setUsers(usersData.data || []);
      setTickets(ticketsData.data || []);
      setActions(actionsData.data || []);

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
                <div className="loan-amount">${loan.amount?.toLocaleString()}</div>
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
      <h2>👥 User Management</h2>
      {loading ? (
        <div className="loading">Loading users...</div>
      ) : users.length === 0 ? (
        <div className="empty-state">No users found</div>
      ) : (
        <div className="users-list">
          {users.map(user => (
            <div key={user.id} className="user-card">
              <div className="user-avatar">
                {user.first_name?.[0]}{user.last_name?.[0]}
              </div>
              <div className="user-info">
                <div className="user-name">
                  {user.first_name} {user.last_name}
                </div>
                <div className="user-username">@{user.username}</div>
                <div className="user-date">
                  Joined: {new Date(user.created_at).toLocaleDateString()}
                </div>
              </div>
              <div className="user-role-section">
                <div className="user-current-role">
                  <span 
                    className="role-badge"
                    style={{ backgroundColor: getRoleColor(userRoles[user.user_id]) }}
                  >
                    {userRoles[user.user_id] || 'user'}
                  </span>
                </div>
                <div className="user-role-actions">
                  <select
                    value={userRoles[user.user_id] || 'user'}
                    onChange={(e) => handleRoleAssignment(user.user_id, e.target.value)}
                    className="role-select"
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                    <option value="super_admin">Super Admin</option>
                  </select>
                </div>
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

  const renderContent = () => {
    switch (activeSection) {
      case 'overview': return renderOverview();
      case 'loans': return renderLoans();
      case 'users': return renderUsers();
      case 'tickets': return renderTickets();
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
        <h1>Admin Panel</h1>
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
      </div>

      <div className="admin-content">
        {renderContent()}
      </div>
    </div>
  );
};

export default AdminPanel; 