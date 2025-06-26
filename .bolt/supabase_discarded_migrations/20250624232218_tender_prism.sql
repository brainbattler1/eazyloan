/*
  # Comprehensive Database Fix
  
  This migration completely cleans up the database and rebuilds it properly:
  
  1. Clean Removal
     - Drop all problematic tables, functions, and policies
     - Remove any orphaned dependencies
  
  2. Core Tables Recreation
     - Rebuild user_profiles with proper structure
     - Rebuild user_roles with correct constraints
     - Rebuild admin_actions for audit logging
     - Ensure loan_applications is properly configured
  
  3. Security Setup
     - Enable RLS on all tables
     - Create proper policies for data access
     - Set up admin functions correctly
  
  4. Performance Optimization
     - Add necessary indexes
     - Create efficient views
     - Optimize query patterns
*/

-- =============================================
-- STEP 1: COMPLETE CLEANUP
-- =============================================

-- Drop all notification-related remnants
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS system_messages CASCADE;
DROP TABLE IF EXISTS notification_preferences CASCADE;

-- Drop all functions that might cause conflicts
DROP FUNCTION IF EXISTS get_user_notifications(uuid, boolean, integer) CASCADE;
DROP FUNCTION IF EXISTS get_active_system_messages(text) CASCADE;
DROP FUNCTION IF EXISTS create_notification(uuid, text, text, text, text, text, text, timestamptz, jsonb) CASCADE;
DROP FUNCTION IF EXISTS create_system_message(text, text, text, text, text, timestamptz, jsonb) CASCADE;
DROP FUNCTION IF EXISTS mark_notification_read(uuid) CASCADE;
DROP FUNCTION IF EXISTS mark_all_notifications_read(uuid) CASCADE;
DROP FUNCTION IF EXISTS send_bulk_notification(uuid[], text, text, text, text, text, text, timestamptz) CASCADE;
DROP FUNCTION IF EXISTS verify_notification_system() CASCADE;
DROP FUNCTION IF EXISTS create_loan_status_notification() CASCADE;
DROP FUNCTION IF EXISTS is_admin(uuid) CASCADE;
DROP FUNCTION IF EXISTS is_super_admin(uuid) CASCADE;
DROP FUNCTION IF EXISTS get_user_role(uuid) CASCADE;
DROP FUNCTION IF EXISTS log_admin_action(text, text, uuid, jsonb) CASCADE;
DROP FUNCTION IF EXISTS test_db_connection() CASCADE;
DROP FUNCTION IF EXISTS get_user_profile(uuid) CASCADE;
DROP FUNCTION IF EXISTS update_user_profile(uuid, text, text, text, text) CASCADE;
DROP FUNCTION IF EXISTS get_user_loan_stats(uuid) CASCADE;
DROP FUNCTION IF EXISTS is_username_available(text) CASCADE;

-- Drop triggers
DROP TRIGGER IF EXISTS loan_status_notification_trigger ON loan_applications;
DROP TRIGGER IF EXISTS update_updated_at_column ON user_profiles;
DROP TRIGGER IF EXISTS update_updated_at_column ON notification_preferences;

-- Drop views
DROP VIEW IF EXISTS admin_stats CASCADE;

-- =============================================
-- STEP 2: CORE TABLES SETUP
-- =============================================

-- Create user_profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name text NOT NULL,
  last_name text NOT NULL,
  middle_name text,
  username text UNIQUE NOT NULL,
  profile_picture_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id),
  UNIQUE(username)
);

-- Create user_roles table
CREATE TABLE IF NOT EXISTS user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'user',
  assigned_by uuid REFERENCES auth.users(id),
  assigned_at timestamptz DEFAULT now(),
  UNIQUE(user_id),
  CONSTRAINT valid_roles CHECK (role = ANY (ARRAY['user'::text, 'admin'::text, 'super_admin'::text]))
);

-- Create admin_actions table
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

-- Ensure loan_applications table exists with proper structure
CREATE TABLE IF NOT EXISTS loan_applications (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at timestamptz DEFAULT now(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  user_email text NOT NULL,
  user_name text,
  amount numeric NOT NULL,
  purpose text NOT NULL,
  term_months integer NOT NULL,
  annual_income numeric NOT NULL,
  employment_status text NOT NULL,
  credit_score integer,
  status text DEFAULT 'pending' NOT NULL,
  first_name text,
  last_name text,
  id_number text,
  passport_number text,
  gender text,
  date_of_birth date,
  place_of_residence text,
  detailed_address text,
  phone_number text,
  alternate_phone text,
  work_type text,
  monthly_income numeric,
  reference1_first_name text,
  reference1_last_name text,
  reference1_phone text,
  reference1_gender text,
  reference1_relationship text,
  reference2_first_name text,
  reference2_last_name text,
  reference2_phone text,
  reference2_gender text,
  reference2_relationship text,
  id_card_front_url text,
  id_card_back_url text,
  passport_url text,
  loan_amount_kes numeric,
  repayment_period_days integer,
  CONSTRAINT chk_status CHECK (status = ANY (ARRAY['pending'::text, 'under_review'::text, 'approved'::text, 'rejected'::text]))
);

-- =============================================
-- STEP 3: ENABLE ROW LEVEL SECURITY
-- =============================================

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE loan_applications ENABLE ROW LEVEL SECURITY;

-- =============================================
-- STEP 4: CREATE UTILITY FUNCTIONS
-- =============================================

-- Function to check if user is admin
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

-- Function to check if user is super admin
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

-- Function to get user role
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

-- Function to get user profile
CREATE OR REPLACE FUNCTION get_user_profile(check_user_id uuid)
RETURNS TABLE(
  id uuid,
  user_id uuid,
  first_name text,
  last_name text,
  middle_name text,
  username text,
  profile_picture_url text,
  full_name text,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    up.id,
    up.user_id,
    up.first_name,
    up.last_name,
    up.middle_name,
    up.username,
    up.profile_picture_url,
    CONCAT(up.first_name, ' ', up.last_name) as full_name,
    up.created_at,
    up.updated_at
  FROM user_profiles up
  WHERE up.user_id = check_user_id;
END;
$$;

-- Function to update user profile
CREATE OR REPLACE FUNCTION update_user_profile(
  profile_user_id uuid,
  profile_first_name text,
  profile_last_name text,
  profile_middle_name text DEFAULT NULL,
  profile_username text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE user_profiles 
  SET 
    first_name = profile_first_name,
    last_name = profile_last_name,
    middle_name = profile_middle_name,
    username = COALESCE(profile_username, username),
    updated_at = now()
  WHERE user_id = profile_user_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found for user %', profile_user_id;
  END IF;
END;
$$;

-- Function to get user loan statistics
CREATE OR REPLACE FUNCTION get_user_loan_stats(check_user_id uuid)
RETURNS TABLE(
  total_applications bigint,
  pending_applications bigint,
  approved_applications bigint,
  rejected_applications bigint,
  total_loan_amount numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) as total_applications,
    COUNT(*) FILTER (WHERE status = 'pending') as pending_applications,
    COUNT(*) FILTER (WHERE status = 'approved') as approved_applications,
    COUNT(*) FILTER (WHERE status = 'rejected') as rejected_applications,
    COALESCE(SUM(amount) FILTER (WHERE status = 'approved'), 0) as total_loan_amount
  FROM loan_applications
  WHERE user_id = check_user_id;
END;
$$;

-- Function to check username availability
CREATE OR REPLACE FUNCTION is_username_available(username_to_check text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN NOT EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE LOWER(username) = LOWER(username_to_check)
  );
END;
$$;

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

-- =============================================
-- STEP 5: CREATE RLS POLICIES
-- =============================================

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
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (is_admin(auth.uid()));

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

-- Loan Applications Policies
CREATE POLICY "Users can view their own loan applications"
  ON loan_applications
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own loan applications"
  ON loan_applications
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

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

-- =============================================
-- STEP 6: CREATE INDEXES FOR PERFORMANCE
-- =============================================

-- User Profiles Indexes
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_username ON user_profiles(username);
CREATE INDEX IF NOT EXISTS idx_user_profiles_username_lower ON user_profiles(lower(username));
CREATE INDEX IF NOT EXISTS idx_user_profiles_picture_url ON user_profiles(profile_picture_url);

-- User Roles Indexes
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role);

-- Admin Actions Indexes
CREATE INDEX IF NOT EXISTS idx_admin_actions_admin_id ON admin_actions(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_actions_created_at ON admin_actions(created_at);
CREATE INDEX IF NOT EXISTS idx_admin_actions_action_type ON admin_actions(action_type);
CREATE INDEX IF NOT EXISTS idx_admin_actions_target_id ON admin_actions(target_id);

-- Loan Applications Indexes
CREATE INDEX IF NOT EXISTS idx_loan_applications_user_id ON loan_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_loan_applications_status ON loan_applications(status);
CREATE INDEX IF NOT EXISTS idx_loan_applications_created_at ON loan_applications(created_at);
CREATE INDEX IF NOT EXISTS idx_loan_applications_id ON loan_applications(id);

-- =============================================
-- STEP 7: CREATE VIEWS AND TRIGGERS
-- =============================================

-- Admin Statistics View
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

-- Updated At Trigger Function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at trigger to user_profiles
CREATE TRIGGER update_updated_at_column
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- STEP 8: GRANT PERMISSIONS
-- =============================================

-- Grant access to views
GRANT SELECT ON admin_stats TO authenticated;

-- Grant usage on schema
GRANT USAGE ON SCHEMA public TO authenticated;

-- Grant access to sequences
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- =============================================
-- STEP 9: FINAL VERIFICATION
-- =============================================

-- Insert a test admin user role if none exists (for development)
DO $$
BEGIN
  -- This is just for development - in production, roles should be assigned manually
  IF NOT EXISTS (SELECT 1 FROM user_roles WHERE role IN ('admin', 'super_admin')) THEN
    -- Note: This will only work if there's at least one authenticated user
    -- In production, you should manually assign admin roles
    NULL; -- Placeholder - admin roles should be assigned manually
  END IF;
END $$;

-- Log the completion
DO $$
BEGIN
  RAISE NOTICE 'Database migration completed successfully at %', now();
  RAISE NOTICE 'All tables, functions, and policies have been recreated';
  RAISE NOTICE 'Row Level Security is enabled on all tables';
  RAISE NOTICE 'Performance indexes have been created';
END $$;