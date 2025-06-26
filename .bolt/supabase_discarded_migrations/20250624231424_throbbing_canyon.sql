-- Clean Database Migration - Remove Notification System
-- This migration removes all notification-related tables and functions

-- Drop notification-related tables
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS system_messages CASCADE;
DROP TABLE IF EXISTS notification_preferences CASCADE;

-- Drop notification-related functions
DROP FUNCTION IF EXISTS get_user_notifications(uuid, boolean, integer) CASCADE;
DROP FUNCTION IF EXISTS get_active_system_messages(text) CASCADE;
DROP FUNCTION IF EXISTS create_notification(uuid, text, text, text, text, text, text, timestamptz, jsonb) CASCADE;
DROP FUNCTION IF EXISTS create_system_message(text, text, text, text, text, timestamptz, jsonb) CASCADE;
DROP FUNCTION IF EXISTS mark_notification_read(uuid) CASCADE;
DROP FUNCTION IF EXISTS mark_all_notifications_read(uuid) CASCADE;
DROP FUNCTION IF EXISTS send_bulk_notification(uuid[], text, text, text, text, text, text, timestamptz) CASCADE;
DROP FUNCTION IF EXISTS verify_notification_system() CASCADE;
DROP FUNCTION IF EXISTS create_loan_status_notification() CASCADE;

-- Drop notification-related triggers
DROP TRIGGER IF EXISTS loan_status_notification_trigger ON loan_applications;

-- Create user_roles table if it doesn't exist
CREATE TABLE IF NOT EXISTS user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'user',
  assigned_by uuid REFERENCES auth.users(id),
  assigned_at timestamptz DEFAULT now(),
  UNIQUE(user_id),
  CONSTRAINT valid_roles CHECK (role = ANY (ARRAY['user'::text, 'admin'::text, 'super_admin'::text]))
);

-- Create admin_actions table for audit logging
CREATE TABLE IF NOT EXISTS admin_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type text NOT NULL,
  target_type text NOT NULL,
  target_id uuid,
  details jsonb,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT valid_action_types CHECK (action_type = ANY (ARRAY['status_update'::text, 'role_assignment'::text, 'user_creation'::text, 'loan_approval'::text, 'loan_rejection'::text, 'system_config'::text])),
  CONSTRAINT valid_target_types CHECK (target_type = ANY (ARRAY['loan_application'::text, 'user'::text, 'system'::text, 'role'::text]))
);

-- Enable RLS
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_actions ENABLE ROW LEVEL SECURITY;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role);
CREATE INDEX IF NOT EXISTS idx_admin_actions_admin_id ON admin_actions(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_actions_created_at ON admin_actions(created_at);
CREATE INDEX IF NOT EXISTS idx_admin_actions_action_type ON admin_actions(action_type);
CREATE INDEX IF NOT EXISTS idx_admin_actions_target_id ON admin_actions(target_id);

-- Create function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin(check_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = check_user_id 
    AND role IN ('admin', 'super_admin')
  );
END;
$$;

-- Create function to check if user is super admin
CREATE OR REPLACE FUNCTION is_super_admin(check_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = check_user_id 
    AND role = 'super_admin'
  );
END;
$$;

-- Create function to get user role
CREATE OR REPLACE FUNCTION get_user_role(check_user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_role text;
BEGIN
  SELECT role INTO user_role
  FROM user_roles 
  WHERE user_id = check_user_id;
  
  RETURN COALESCE(user_role, 'user');
END;
$$;

-- RLS Policies for user_roles
CREATE POLICY "Super admins can insert roles"
  ON user_roles
  FOR INSERT
  TO authenticated
  WITH CHECK (is_super_admin(auth.uid()));

CREATE POLICY "Super admins can update roles"
  ON user_roles
  FOR UPDATE
  TO authenticated
  USING (is_super_admin(auth.uid()));

CREATE POLICY "Admins can view all roles"
  ON user_roles
  FOR SELECT
  TO authenticated
  USING (is_admin(auth.uid()));

CREATE POLICY "Users can view their own role"
  ON user_roles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for admin_actions
CREATE POLICY "Admins can view admin actions"
  ON admin_actions
  FOR SELECT
  TO authenticated
  USING (is_admin(auth.uid()));

CREATE POLICY "Admins can log actions"
  ON admin_actions
  FOR INSERT
  TO authenticated
  WITH CHECK (is_admin(auth.uid()));

-- Update loan_applications policies for admin access
CREATE POLICY "Admins can view all loan applications"
  ON loan_applications
  FOR SELECT
  TO authenticated
  USING (is_admin(auth.uid()));

CREATE POLICY "Admins can update loan applications"
  ON loan_applications
  FOR UPDATE
  TO authenticated
  USING (is_admin(auth.uid()));

-- Create view for admin dashboard statistics
CREATE OR REPLACE VIEW admin_stats AS
SELECT 
  (SELECT COUNT(*) FROM loan_applications) as total_applications,
  (SELECT COUNT(*) FROM loan_applications WHERE status = 'pending') as pending_applications,
  (SELECT COUNT(*) FROM loan_applications WHERE status = 'approved') as approved_applications,
  (SELECT COUNT(*) FROM loan_applications WHERE status = 'rejected') as rejected_applications,
  (SELECT COUNT(*) FROM user_profiles) as total_users,
  (SELECT COUNT(*) FROM user_roles WHERE role IN ('admin', 'super_admin')) as admin_users,
  (SELECT COALESCE(SUM(amount), 0) FROM loan_applications WHERE status = 'approved') as total_approved_amount,
  (SELECT COALESCE(AVG(amount), 0) FROM loan_applications WHERE status = 'approved') as avg_loan_amount;

-- Grant access to admin stats view
GRANT SELECT ON admin_stats TO authenticated;

-- Function to log admin actions
CREATE OR REPLACE FUNCTION log_admin_action(
  action_type text,
  target_type text,
  target_id uuid DEFAULT NULL,
  details jsonb DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO admin_actions (admin_id, action_type, target_type, target_id, details)
  VALUES (auth.uid(), action_type, target_type, target_id, details);
END;
$$;

-- Function to test database connection
CREATE OR REPLACE FUNCTION test_db_connection()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN 'Database connection successful at ' || now()::text;
END;
$$;