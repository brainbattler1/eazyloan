/*
  # Fix Dashboard Loading Issue

  1. Database Functions
    - Fix get_user_role function with proper error handling
    - Simplify admin check functions
    - Add fallback mechanisms

  2. Performance
    - Add missing indexes
    - Optimize queries

  3. Security
    - Ensure RLS policies work correctly
    - Add proper permissions
*/

-- Drop existing functions to recreate them properly
DROP FUNCTION IF EXISTS get_user_role(uuid);
DROP FUNCTION IF EXISTS is_admin(uuid);
DROP FUNCTION IF EXISTS is_super_admin(uuid);

-- Create a simple, reliable function to get user role
CREATE OR REPLACE FUNCTION get_user_role(user_id uuid)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT COALESCE(
    (SELECT role FROM user_roles WHERE user_roles.user_id = $1 LIMIT 1),
    'user'
  );
$$;

-- Create a simple function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin(user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = $1 
    AND role IN ('admin', 'super_admin')
  );
$$;

-- Create a simple function to check if user is super admin
CREATE OR REPLACE FUNCTION is_super_admin(user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = $1 
    AND role = 'super_admin'
  );
$$;

-- Create a function that bypasses RLS for getting user stats
CREATE OR REPLACE FUNCTION get_user_loan_stats(user_id uuid)
RETURNS TABLE (
  total_applications bigint,
  pending_applications bigint,
  approved_applications bigint,
  total_loan_amount numeric
)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT 
    COUNT(*)::bigint as total_applications,
    COUNT(*) FILTER (WHERE status = 'pending')::bigint as pending_applications,
    COUNT(*) FILTER (WHERE status = 'approved')::bigint as approved_applications,
    COALESCE(SUM(amount) FILTER (WHERE status = 'approved'), 0) as total_loan_amount
  FROM loan_applications 
  WHERE loan_applications.user_id = $1;
$$;

-- Grant execute permissions on all functions
GRANT EXECUTE ON FUNCTION get_user_role(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION is_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION is_super_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_loan_stats(uuid) TO authenticated;

-- Ensure proper indexes exist for performance
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role);
CREATE INDEX IF NOT EXISTS idx_loan_applications_user_id ON loan_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_loan_applications_status ON loan_applications(status);
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_username ON user_profiles(username);

-- Update RLS policies to be more permissive for user's own data
DROP POLICY IF EXISTS "Users can view their own role" ON user_roles;
CREATE POLICY "Users can view their own role"
  ON user_roles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR is_admin(auth.uid()));

-- Ensure loan applications policies allow users to see their own data
DROP POLICY IF EXISTS "Users can view their own loan applications" ON loan_applications;
CREATE POLICY "Users can view their own loan applications"
  ON loan_applications
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR is_admin(auth.uid()));

-- Create a simple test function to verify database connectivity
CREATE OR REPLACE FUNCTION test_db_connection()
RETURNS text
LANGUAGE sql
AS $$
  SELECT 'Database connection successful'::text;
$$;

GRANT EXECUTE ON FUNCTION test_db_connection() TO authenticated;