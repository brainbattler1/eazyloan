/*
  # Complete Database Reset and Fix

  This migration completely resets and fixes all database issues:
  
  1. Database Structure
     - Clean up all existing functions and policies
     - Recreate tables with proper structure
     - Add all necessary constraints and indexes
  
  2. Security & RLS
     - Proper Row Level Security policies
     - Safe function definitions
     - Admin role management
  
  3. Performance
     - Optimized indexes
     - Efficient queries
     - Proper data types
*/

-- =====================================================
-- STEP 1: COMPLETE CLEANUP
-- =====================================================

-- Drop all existing policies first
DROP POLICY IF EXISTS "Admins can view all roles" ON user_roles;
DROP POLICY IF EXISTS "Super admins can view all roles" ON user_roles;
DROP POLICY IF EXISTS "Super admins can assign roles" ON user_roles;
DROP POLICY IF EXISTS "Super admins can update roles" ON user_roles;
DROP POLICY IF EXISTS "Users can view their own role" ON user_roles;
DROP POLICY IF EXISTS "Admins can view admin actions" ON admin_actions;
DROP POLICY IF EXISTS "Admins can log actions" ON admin_actions;
DROP POLICY IF EXISTS "Admins can view all loan applications" ON loan_applications;
DROP POLICY IF EXISTS "Admins can update loan applications" ON loan_applications;
DROP POLICY IF EXISTS "Users can view their own loan applications" ON loan_applications;
DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;

-- Drop all functions with CASCADE to handle dependencies
DROP FUNCTION IF EXISTS get_user_role(uuid) CASCADE;
DROP FUNCTION IF EXISTS is_admin(uuid) CASCADE;
DROP FUNCTION IF EXISTS is_super_admin(uuid) CASCADE;
DROP FUNCTION IF EXISTS get_user_loan_stats(uuid) CASCADE;
DROP FUNCTION IF EXISTS get_admin_stats() CASCADE;
DROP FUNCTION IF EXISTS get_simple_admin_stats() CASCADE;
DROP FUNCTION IF EXISTS log_admin_action(text, text, uuid, jsonb) CASCADE;
DROP FUNCTION IF EXISTS get_user_full_name(uuid) CASCADE;
DROP FUNCTION IF EXISTS is_username_available(text) CASCADE;
DROP FUNCTION IF EXISTS test_db_connection() CASCADE;

-- Drop views
DROP VIEW IF EXISTS admin_stats CASCADE;

-- =====================================================
-- STEP 2: RECREATE TABLES WITH PROPER STRUCTURE
-- =====================================================

-- User Roles Table
CREATE TABLE IF NOT EXISTS user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE NOT NULL,
  role text NOT NULL DEFAULT 'user',
  assigned_by uuid,
  assigned_at timestamptz DEFAULT now(),
  CONSTRAINT valid_roles CHECK (role IN ('user', 'admin', 'super_admin'))
);

-- User Profiles Table
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE NOT NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  middle_name text,
  username text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Admin Actions Table
CREATE TABLE IF NOT EXISTS admin_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid,
  action_type text NOT NULL,
  target_type text NOT NULL,
  target_id uuid,
  details jsonb,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT valid_action_types CHECK (action_type IN ('status_update', 'role_assignment', 'user_creation', 'loan_approval', 'loan_rejection', 'system_config')),
  CONSTRAINT valid_target_types CHECK (target_type IN ('loan_application', 'user', 'system', 'role'))
);

-- Enable RLS on all tables
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_actions ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- STEP 3: CREATE SAFE, SIMPLE FUNCTIONS
-- =====================================================

-- Simple function to get user role (returns 'user' by default)
CREATE OR REPLACE FUNCTION get_user_role(check_user_id uuid)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT COALESCE(
    (SELECT role FROM user_roles WHERE user_id = check_user_id LIMIT 1),
    'user'::text
  );
$$;

-- Simple function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin(check_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = check_user_id 
    AND role IN ('admin', 'super_admin')
  );
$$;

-- Simple function to check if user is super admin
CREATE OR REPLACE FUNCTION is_super_admin(check_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = check_user_id 
    AND role = 'super_admin'
  );
$$;

-- Function to check username availability
CREATE OR REPLACE FUNCTION is_username_available(username_to_check text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE LOWER(username) = LOWER(username_to_check)
  );
$$;

-- Function to get user's full name
CREATE OR REPLACE FUNCTION get_user_full_name(check_user_id uuid)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT COALESCE(
    (SELECT 
      CASE 
        WHEN middle_name IS NOT NULL AND middle_name != '' 
        THEN first_name || ' ' || middle_name || ' ' || last_name
        ELSE first_name || ' ' || last_name
      END
     FROM user_profiles 
     WHERE user_id = check_user_id 
     LIMIT 1),
    'Unknown User'::text
  );
$$;

-- Function to get user loan statistics
CREATE OR REPLACE FUNCTION get_user_loan_stats(check_user_id uuid)
RETURNS TABLE (
  total_applications bigint,
  pending_applications bigint,
  approved_applications bigint,
  rejected_applications bigint,
  total_loan_amount numeric
)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT 
    COUNT(*)::bigint,
    COUNT(*) FILTER (WHERE status = 'pending')::bigint,
    COUNT(*) FILTER (WHERE status = 'approved')::bigint,
    COUNT(*) FILTER (WHERE status = 'rejected')::bigint,
    COALESCE(SUM(amount) FILTER (WHERE status = 'approved'), 0)
  FROM loan_applications 
  WHERE user_id = check_user_id;
$$;

-- Function to log admin actions
CREATE OR REPLACE FUNCTION log_admin_action(
  action_type text,
  target_type text,
  target_id uuid DEFAULT NULL,
  details jsonb DEFAULT NULL
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  INSERT INTO admin_actions (admin_id, action_type, target_type, target_id, details)
  VALUES (auth.uid(), action_type, target_type, target_id, details);
$$;

-- Simple database connection test
CREATE OR REPLACE FUNCTION test_db_connection()
RETURNS text
LANGUAGE sql
AS $$
  SELECT 'Database connection successful - ' || now()::text;
$$;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- =====================================================
-- STEP 4: CREATE TRIGGERS
-- =====================================================

-- Trigger for user_profiles updated_at
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- STEP 5: CREATE COMPREHENSIVE RLS POLICIES
-- =====================================================

-- User Roles Policies
CREATE POLICY "Users can view their own role"
  ON user_roles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
  ON user_roles
  FOR SELECT
  TO authenticated
  USING (is_admin(auth.uid()));

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

-- User Profiles Policies
CREATE POLICY "Users can view their own profile"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
  ON user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (is_admin(auth.uid()));

-- Admin Actions Policies
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

-- Loan Applications Policies (ensure they exist)
DO $$
BEGIN
  -- Check if the policy exists before creating
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'loan_applications' 
    AND policyname = 'Users can view their own loan applications'
  ) THEN
    CREATE POLICY "Users can view their own loan applications"
      ON loan_applications
      FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'loan_applications' 
    AND policyname = 'Users can insert their own loan applications'
  ) THEN
    CREATE POLICY "Users can insert their own loan applications"
      ON loan_applications
      FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'loan_applications' 
    AND policyname = 'Admins can view all loan applications'
  ) THEN
    CREATE POLICY "Admins can view all loan applications"
      ON loan_applications
      FOR SELECT
      TO authenticated
      USING (is_admin(auth.uid()));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'loan_applications' 
    AND policyname = 'Admins can update loan applications'
  ) THEN
    CREATE POLICY "Admins can update loan applications"
      ON loan_applications
      FOR UPDATE
      TO authenticated
      USING (is_admin(auth.uid()));
  END IF;
END $$;

-- =====================================================
-- STEP 6: CREATE INDEXES FOR PERFORMANCE
-- =====================================================

-- User Roles Indexes
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role);

-- User Profiles Indexes
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_username ON user_profiles(username);

-- Admin Actions Indexes
CREATE INDEX IF NOT EXISTS idx_admin_actions_admin_id ON admin_actions(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_actions_created_at ON admin_actions(created_at);

-- Loan Applications Indexes (if they don't exist)
CREATE INDEX IF NOT EXISTS idx_loan_applications_user_id ON loan_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_loan_applications_status ON loan_applications(status);
CREATE INDEX IF NOT EXISTS idx_loan_applications_created_at ON loan_applications(created_at);

-- =====================================================
-- STEP 7: GRANT PERMISSIONS
-- =====================================================

-- Grant table permissions
GRANT SELECT, INSERT, UPDATE ON user_roles TO authenticated;
GRANT SELECT, INSERT, UPDATE ON user_profiles TO authenticated;
GRANT SELECT, INSERT ON admin_actions TO authenticated;

-- Grant function permissions
GRANT EXECUTE ON FUNCTION get_user_role(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION is_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION is_super_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION is_username_available(text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_full_name(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_loan_stats(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION log_admin_action(text, text, uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION test_db_connection() TO authenticated;

-- =====================================================
-- STEP 8: CREATE ADMIN STATS VIEW
-- =====================================================

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

-- Grant access to the view
GRANT SELECT ON admin_stats TO authenticated;

-- =====================================================
-- STEP 9: INSERT DEFAULT DATA (IF NEEDED)
-- =====================================================

-- Create a default super admin role for the first user (optional)
-- This can be uncommented and modified with a real user ID if needed
-- INSERT INTO user_roles (user_id, role, assigned_at) 
-- VALUES ('your-user-id-here', 'super_admin', now())
-- ON CONFLICT (user_id) DO NOTHING;

-- =====================================================
-- VERIFICATION
-- =====================================================

-- Test that everything works
DO $$
BEGIN
  -- Test basic functions
  PERFORM test_db_connection();
  PERFORM get_user_role('00000000-0000-0000-0000-000000000000');
  PERFORM is_admin('00000000-0000-0000-0000-000000000000');
  
  RAISE NOTICE 'Database migration completed successfully!';
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Migration failed: %', SQLERRM;
END $$;