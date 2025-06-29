# 🔧 Maintenance Mode Feature Guide

## Overview

The Maintenance Mode feature allows administrators to temporarily restrict access to the EazyLoan application for all users except Super Admins. This is useful during system updates, database maintenance, or when critical issues need to be resolved.

## Features

### ✨ Key Capabilities
- **Admin Control**: Enable/disable maintenance mode from the admin panel
- **Custom Messages**: Set personalized maintenance messages for users
- **Role-Based Access**: Super Admins can always access the application
- **Real-time Status**: Instant activation/deactivation without server restart
- **Audit Trail**: All maintenance actions are logged for tracking

### 🎯 User Experience
- **Super Admins**: Full access to all features during maintenance
- **Regular Admins**: Can access the application but should use caution
- **Regular Users**: See a beautiful maintenance page with custom message
- **Responsive Design**: Maintenance page works on all devices

## How to Use

### 🚀 Enabling Maintenance Mode

1. **Access Admin Panel**
   - Log in as an Admin or Super Admin
   - Navigate to the Admin Panel from the dashboard
   - Click on the "🔧 Maintenance" tab

2. **Configure Maintenance**
   - Enter a custom message in the text area (optional)
   - Click "Enable Maintenance Mode"
   - Confirm the action

3. **Verification**
   - The status indicator will show "Maintenance Mode Active"
   - Regular users will immediately see the maintenance page
   - Super Admins can continue using the application normally

### ✅ Disabling Maintenance Mode

1. **Access Admin Panel**
   - Navigate to Admin Panel → Maintenance tab
   - Click "Disable Maintenance Mode"
   - Confirm the action

2. **Verification**
   - The status indicator will show "Application Online"
   - All users can access the application normally

## Database Schema

### 📊 Tables Created

#### `maintenance_mode`
```sql
CREATE TABLE maintenance_mode (
  id SERIAL PRIMARY KEY,
  is_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  message TEXT DEFAULT 'The application is currently under maintenance. Please check back later.',
  enabled_by UUID REFERENCES auth.users(id),
  enabled_at TIMESTAMP WITH TIME ZONE,
  disabled_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 🔧 Functions Created

#### `get_maintenance_status()`
- Returns current maintenance mode status
- Available to all authenticated users
- Used by the frontend to check maintenance state

#### `toggle_maintenance_mode(enable_maintenance, maintenance_message, admin_user_id)`
- Toggles maintenance mode on/off
- Requires admin or super_admin role
- Logs the action with timestamp and user info

## Security Features

### 🔒 Access Control
- **Row Level Security (RLS)**: Enabled on maintenance_mode table
- **Role Verification**: Only admins can toggle maintenance mode
- **Function Security**: SECURITY DEFINER ensures proper permissions
- **Audit Logging**: All maintenance actions are tracked

### 🛡️ Permissions
- **Read Access**: All authenticated users can check maintenance status
- **Write Access**: Only admins and super_admins can modify maintenance state
- **Super Admin Bypass**: Super admins always have full access

## Technical Implementation

### 🏗️ Architecture

1. **Database Layer**
   - PostgreSQL functions for maintenance control
   - RLS policies for security
   - Audit trail in admin_actions table

2. **Backend Integration**
   - Supabase RPC calls for maintenance functions
   - Real-time status checking
   - Error handling and fallbacks

3. **Frontend Components**
   - `MaintenanceMode.jsx`: Beautiful maintenance page
   - `AdminPanel.jsx`: Admin controls for maintenance
   - `MainApp.jsx`: Maintenance status checking

### 🔄 Flow Diagram

```
User Login → Role Check → Maintenance Check → Route Decision
                                ↓
                    Super Admin? → Full Access
                                ↓
                    Maintenance On? → Maintenance Page
                                ↓
                    Normal Access → Dashboard
```

## Files Modified/Created

### 📁 New Files
- `supabase/migrations/20250127000002_maintenance_mode.sql`
- `src/components/MaintenanceMode.jsx`
- `src/components/MaintenanceMode.css`
- `MAINTENANCE_MODE_GUIDE.md`

### 📝 Modified Files
- `src/components/AdminPanel.jsx` - Added maintenance controls
- `src/components/AdminPanel.css` - Added maintenance styles
- `src/pages/MainApp.jsx` - Added maintenance checking logic

## Best Practices

### ✅ When to Use Maintenance Mode
- **Database Migrations**: During schema changes
- **Critical Updates**: When deploying major features
- **Security Issues**: When addressing vulnerabilities
- **Performance Issues**: During system optimization
- **Scheduled Maintenance**: Regular system maintenance

### ⚠️ Important Considerations
- **Communication**: Always inform users in advance when possible
- **Timing**: Schedule maintenance during low-traffic periods
- **Duration**: Keep maintenance windows as short as possible
- **Testing**: Test the maintenance mode in staging first
- **Monitoring**: Monitor system status during maintenance

### 📋 Maintenance Checklist

**Before Enabling:**
- [ ] Notify users about upcoming maintenance
- [ ] Prepare custom maintenance message
- [ ] Ensure super admin access is working
- [ ] Have rollback plan ready

**During Maintenance:**
- [ ] Monitor system logs
- [ ] Test critical functionality
- [ ] Keep maintenance window minimal
- [ ] Document any issues found

**After Disabling:**
- [ ] Verify all systems are operational
- [ ] Test user access and functionality
- [ ] Monitor for any post-maintenance issues
- [ ] Update users about restoration

## Troubleshooting

### 🐛 Common Issues

**Issue**: Maintenance mode not activating
- **Solution**: Check admin permissions and database connectivity
- **Check**: Verify RPC function exists and user has admin role

**Issue**: Super admin still sees maintenance page
- **Solution**: Verify user role is correctly set to 'super_admin'
- **Check**: Check user_roles table for correct role assignment

**Issue**: Cannot disable maintenance mode
- **Solution**: Check database connection and admin permissions
- **Fallback**: Manually update database if needed

**Issue**: Custom message not displaying
- **Solution**: Verify message was saved correctly in database
- **Check**: Check maintenance_mode table for message field

### 🔍 Debugging Steps

1. **Check Database**
   ```sql
   SELECT * FROM maintenance_mode ORDER BY updated_at DESC LIMIT 1;
   ```

2. **Verify User Role**
   ```sql
   SELECT role FROM user_roles WHERE user_id = 'user-id-here';
   ```

3. **Test RPC Function**
   ```sql
   SELECT * FROM get_maintenance_status();
   ```

## Support

For technical support or questions about the maintenance mode feature:

- **Documentation**: Refer to this guide
- **Database Issues**: Check Supabase logs and RLS policies
- **Frontend Issues**: Check browser console for errors
- **Permission Issues**: Verify user roles in database

---

**Note**: This feature requires proper database setup. Ensure the migration file `20250127000002_maintenance_mode.sql` has been applied to your Supabase instance.