/*
  # Fix Database Dependencies

  1. Drop dependent policies first
  2. Drop problematic functions
  3. Recreate clean functions and policies
  4. Ensure proper RLS setup
*/

-- Drop all policies that depend on is_admin function
DROP POLICY IF EXISTS "Admins can view all roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can view admin actions" ON admin_actions;
DROP POLICY IF EXISTS "Admins can log actions" ON admin_actions;
DROP POLICY IF EXISTS "Admins can view all loan applications" ON loan_applications;
DROP POLICY IF EXISTS "Admins can update loan applications" ON loan_applications;
DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;

-- Drop the problematic functions
DROP FUNCTION IF EXISTS is_admin(uuid) CASCADE;
DROP FUNCTION IF EXISTS is_super_admin(uuid) CASCADE;

-- Recreate the admin check functions
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

-- Recreate the policies with proper dependencies
CREATE POLICY "Admins can view all roles"
  ON user_roles
  FOR SELECT
  TO authenticated
  USING (is_admin(auth.uid()));

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

-- Only create profile policy if user_profiles table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_profiles') THEN
    EXECUTE 'CREATE POLICY "Admins can view all profiles"
      ON user_profiles
      FOR SELECT
      TO authenticated
      USING (is_admin(auth.uid()))';
  END IF;
END $$;

-- Ensure all tables have proper RLS enabled
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE loan_applications ENABLE ROW LEVEL SECURITY;

-- Create or update the admin stats view
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

-- Grant proper permissions
GRANT SELECT ON admin_stats TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;