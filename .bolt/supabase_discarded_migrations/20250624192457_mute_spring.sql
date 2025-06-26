/*
  # Admin System Setup

  1. New Tables
    - `user_roles` - Stores user role assignments
    - `admin_actions` - Logs admin actions for audit trail
  
  2. Security
    - Enable RLS on all new tables
    - Add policies for admin access control
    - Create functions for role checking
  
  3. Features
    - Role-based access control (admin, super_admin, user)
    - Audit logging for admin actions
    - Secure role assignment system
*/

-- Create user_roles table
CREATE TABLE IF NOT EXISTS user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'user',
  assigned_by uuid REFERENCES auth.users(id),
  assigned_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- Create admin_actions table for audit logging
CREATE TABLE IF NOT EXISTS admin_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type text NOT NULL,
  target_type text NOT NULL,
  target_id uuid,
  details jsonb,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_actions ENABLE ROW LEVEL SECURITY;

-- Create function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin(user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = is_admin.user_id 
    AND role IN ('admin', 'super_admin')
  );
END;
$$;

-- Create function to check if user is super admin
CREATE OR REPLACE FUNCTION is_super_admin(user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = is_super_admin.user_id 
    AND role = 'super_admin'
  );
END;
$$;

-- Create function to get user role
CREATE OR REPLACE FUNCTION get_user_role(user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_role text;
BEGIN
  SELECT role INTO user_role
  FROM user_roles 
  WHERE user_roles.user_id = get_user_role.user_id;
  
  RETURN COALESCE(user_role, 'user');
END;
$$;

-- RLS Policies for user_roles
CREATE POLICY "Super admins can view all roles"
  ON user_roles
  FOR SELECT
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

CREATE POLICY "Super admins can assign roles"
  ON user_roles
  FOR INSERT
  TO authenticated
  WITH CHECK (is_super_admin(auth.uid()));

CREATE POLICY "Super admins can update roles"
  ON user_roles
  FOR UPDATE
  TO authenticated
  USING (is_super_admin(auth.uid()));

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
  (SELECT COUNT(*) FROM auth.users) as total_users,
  (SELECT COUNT(*) FROM user_roles WHERE role IN ('admin', 'super_admin')) as admin_users,
  (SELECT COALESCE(SUM(amount), 0) FROM loan_applications WHERE status = 'approved') as total_approved_amount,
  (SELECT COALESCE(AVG(amount), 0) FROM loan_applications WHERE status = 'approved') as avg_loan_amount;

-- Grant access to admin stats view
GRANT SELECT ON admin_stats TO authenticated;

-- Create RLS policy for admin stats
CREATE POLICY "Admins can view stats"
  ON admin_stats
  FOR SELECT
  TO authenticated
  USING (is_admin(auth.uid()));

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