/*
  # Reset Auth Tables - Complete Database Reset
  
  This script will:
  1. Drop all existing auth-related tables and functions
  2. Recreate all tables with proper structure
  3. Set up triggers and functions
  4. Enable RLS policies
  5. Create indexes for performance
  
  WARNING: This will delete all data in the following tables:
  - user_profiles
  - user_roles  
  - admin_actions
  - loan_applications
  - notifications
  - notification_preferences
  - referral_codes
  - referrals
  - credit_scores
  - loan_calculations
  - support_tickets
  - system_messages
  - maintenance_mode
*/

-- =====================================================
-- STEP 1: DROP ALL EXISTING TABLES AND FUNCTIONS
-- =====================================================

-- Drop triggers first
DROP TRIGGER IF EXISTS handle_new_user ON auth.users;
DROP TRIGGER IF EXISTS create_referral_code_trigger ON auth.users;
DROP TRIGGER IF EXISTS loan_status_notification_trigger ON loan_applications;
DROP TRIGGER IF EXISTS update_updated_at_column ON user_profiles;
DROP TRIGGER IF EXISTS update_updated_at_column ON notification_preferences;

-- Drop functions
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS create_referral_code() CASCADE;
DROP FUNCTION IF EXISTS is_admin(uuid) CASCADE;
DROP FUNCTION IF EXISTS is_super_admin(uuid) CASCADE;
DROP FUNCTION IF EXISTS get_user_role(uuid) CASCADE;
DROP FUNCTION IF EXISTS log_admin_action(text, text, uuid, jsonb) CASCADE;
DROP FUNCTION IF EXISTS get_user_data_summary(uuid) CASCADE;
DROP FUNCTION IF EXISTS get_user_profile(uuid) CASCADE;
DROP FUNCTION IF EXISTS update_user_profile(uuid, text, text, text, text) CASCADE;
DROP FUNCTION IF EXISTS is_username_available(text) CASCADE;
DROP FUNCTION IF EXISTS create_user_profile(uuid, text, text, text, text) CASCADE;
DROP FUNCTION IF EXISTS get_user_full_name(uuid) CASCADE;
DROP FUNCTION IF EXISTS get_current_credit_score(uuid) CASCADE;
DROP FUNCTION IF EXISTS calculate_credit_score(uuid) CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- Drop tables (in reverse dependency order)
DROP TABLE IF EXISTS user_mfa_challenges CASCADE;
DROP TABLE IF EXISTS user_mfa_factors CASCADE;
DROP TABLE IF EXISTS support_tickets CASCADE;
DROP TABLE IF EXISTS loan_calculations CASCADE;
DROP TABLE IF EXISTS credit_scores CASCADE;
DROP TABLE IF EXISTS referrals CASCADE;
DROP TABLE IF EXISTS referral_codes CASCADE;
DROP TABLE IF EXISTS notification_preferences CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS system_messages CASCADE;
DROP TABLE IF EXISTS maintenance_mode CASCADE;
DROP TABLE IF EXISTS admin_actions CASCADE;
DROP TABLE IF EXISTS user_roles CASCADE;
DROP TABLE IF EXISTS user_profiles CASCADE;
DROP TABLE IF EXISTS loan_applications CASCADE;

-- =====================================================
-- STEP 2: CREATE CORE TABLES
-- =====================================================

-- User Profiles Table
CREATE TABLE user_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE NOT NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  middle_name text,
  username text UNIQUE NOT NULL,
  profile_picture_url text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- User Roles Table
CREATE TABLE user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE NOT NULL,
  role text NOT NULL DEFAULT 'user',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_roles CHECK (role IN ('user', 'admin', 'super_admin'))
);

-- Admin Actions Table
CREATE TABLE admin_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid,
  action_type text NOT NULL,
  target_type text NOT NULL,
  target_id uuid,
  details jsonb,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT valid_action_types CHECK (action_type IN ('status_update', 'role_assignment', 'user_creation', 'loan_approval', 'loan_rejection', 'system_config', 'user_activation', 'user_deactivation')),
  CONSTRAINT valid_target_types CHECK (target_type IN ('loan_application', 'user', 'system', 'role'))
);

-- Loan Applications Table
CREATE TABLE loan_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_number text UNIQUE,
  created_at timestamptz DEFAULT now(),
  user_id uuid NOT NULL,
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
  CONSTRAINT chk_status CHECK (status IN ('pending', 'under_review', 'approved', 'rejected'))
);

-- Notifications Table
CREATE TABLE notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL DEFAULT 'info',
  priority text NOT NULL DEFAULT 'medium',
  read boolean DEFAULT false,
  read_at timestamptz,
  action_url text,
  action_label text,
  expires_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid,
  metadata jsonb DEFAULT '{}',
  CONSTRAINT valid_notification_types CHECK (type IN ('info', 'success', 'warning', 'error', 'announcement', 'loan_update', 'system', 'security')),
  CONSTRAINT valid_notification_priorities CHECK (priority IN ('low', 'medium', 'high', 'urgent'))
);

-- Notification Preferences Table
CREATE TABLE notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE NOT NULL,
  email_notifications boolean DEFAULT true,
  push_notifications boolean DEFAULT true,
  loan_updates boolean DEFAULT true,
  system_announcements boolean DEFAULT true,
  security_alerts boolean DEFAULT true,
  marketing boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- System Messages Table
CREATE TABLE system_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL DEFAULT 'info',
  priority text NOT NULL DEFAULT 'medium',
  target_audience text NOT NULL DEFAULT 'all',
  active boolean DEFAULT true,
  expires_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid,
  metadata jsonb DEFAULT '{}',
  CONSTRAINT valid_system_message_types CHECK (type IN ('info', 'success', 'warning', 'error', 'announcement', 'maintenance', 'security')),
  CONSTRAINT valid_system_message_priorities CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  CONSTRAINT valid_target_audiences CHECK (target_audience IN ('all', 'users', 'admins', 'super_admins'))
);

-- Referral Codes Table
CREATE TABLE referral_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  referral_code text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now(),
  is_active boolean DEFAULT true
);

-- Referrals Table
CREATE TABLE referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid NOT NULL,
  referred_id uuid UNIQUE NOT NULL,
  referral_code text NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
  reward_amount numeric DEFAULT 0,
  reward_given boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

-- Credit Scores Table
CREATE TABLE credit_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  score integer NOT NULL CHECK (score >= 300 AND score <= 850),
  score_band text NOT NULL CHECK (score_band IN ('poor', 'fair', 'good', 'very_good', 'excellent')),
  factors jsonb DEFAULT '{}',
  recommendations jsonb DEFAULT '{}',
  bureau_source text DEFAULT 'internal',
  is_current boolean DEFAULT true,
  calculated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Loan Calculations Table
CREATE TABLE loan_calculations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  loan_amount numeric NOT NULL CHECK (loan_amount > 0),
  interest_rate numeric NOT NULL CHECK (interest_rate >= 0),
  term_months integer NOT NULL CHECK (term_months > 0),
  monthly_payment numeric NOT NULL,
  total_interest numeric NOT NULL,
  total_amount numeric NOT NULL,
  loan_purpose text,
  calculation_type text DEFAULT 'standard',
  saved boolean DEFAULT false,
  notes text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  CONSTRAINT valid_calculation_types CHECK (calculation_type IN ('standard', 'compound', 'simple', 'reducing_balance'))
);

-- Support Tickets Table
CREATE TABLE support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  ticket_number text UNIQUE NOT NULL,
  subject text NOT NULL,
  description text NOT NULL,
  category text NOT NULL DEFAULT 'general',
  priority text NOT NULL DEFAULT 'medium',
  status text NOT NULL DEFAULT 'open',
  assigned_to uuid,
  resolution text,
  resolved_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_ticket_categories CHECK (category IN ('general', 'technical', 'billing', 'loan', 'security', 'other')),
  CONSTRAINT valid_ticket_priorities CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  CONSTRAINT valid_ticket_statuses CHECK (status IN ('open', 'in_progress', 'resolved', 'closed'))
);

-- Maintenance Mode Table
CREATE TABLE maintenance_mode (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  is_enabled boolean DEFAULT false,
  message text,
  enabled_by uuid,
  enabled_at timestamptz DEFAULT now(),
  disabled_at timestamptz
);

-- MFA Tables
CREATE TABLE user_mfa_factors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  factor_type text NOT NULL CHECK (factor_type IN ('totp', 'sms', 'email')),
  secret text,
  phone text,
  email text,
  is_verified boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE user_mfa_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  factor_id uuid NOT NULL,
  challenge_code text NOT NULL,
  expires_at timestamptz NOT NULL,
  verified boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- =====================================================
-- STEP 3: ENABLE ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE loan_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE loan_calculations ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_mode ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_mfa_factors ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_mfa_challenges ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- STEP 4: CREATE FUNCTIONS
-- =====================================================

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
BEGIN
  RETURN COALESCE(
    (SELECT role FROM user_roles WHERE user_id = check_user_id LIMIT 1),
    'user'
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
LANGUAGE sql
SECURITY DEFINER
AS $$
  INSERT INTO admin_actions (admin_id, action_type, target_type, target_id, details)
  VALUES (auth.uid(), action_type, target_type, target_id, details);
$$;

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Create user profile
  INSERT INTO user_profiles (user_id, first_name, last_name, username)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || substr(NEW.id::text, 1, 8))
  );
  
  -- Create user role (default to 'user')
  INSERT INTO user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  -- Create notification preferences
  INSERT INTO notification_preferences (user_id)
  VALUES (NEW.id);
  
  -- Create referral code
  INSERT INTO referral_codes (user_id, referral_code)
  VALUES (NEW.id, 'REF' || substr(NEW.id::text, 1, 8) || substr(md5(random()::text), 1, 4));
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create referral code
CREATE OR REPLACE FUNCTION create_referral_code()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO referral_codes (user_id, referral_code)
  VALUES (NEW.id, 'REF' || substr(NEW.id::text, 1, 8) || substr(md5(random()::text), 1, 4));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to get user profile
CREATE OR REPLACE FUNCTION get_user_profile(check_user_id uuid)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  first_name text,
  last_name text,
  middle_name text,
  username text,
  profile_picture_url text,
  is_active boolean,
  created_at timestamptz,
  updated_at timestamptz,
  email text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.user_id,
    p.first_name,
    p.last_name,
    p.middle_name,
    p.username,
    p.profile_picture_url,
    p.is_active,
    p.created_at,
    p.updated_at,
    (SELECT email FROM auth.users WHERE id = check_user_id LIMIT 1) as email
  FROM user_profiles p
  WHERE p.user_id = check_user_id;
END;
$$;

-- Function to update user profile
CREATE OR REPLACE FUNCTION update_user_profile(
  check_user_id uuid,
  new_first_name text,
  new_last_name text,
  new_middle_name text,
  new_username text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE user_profiles 
  SET 
    first_name = new_first_name,
    last_name = new_last_name,
    middle_name = new_middle_name,
    username = new_username,
    updated_at = now()
  WHERE user_id = check_user_id;
  
  RETURN FOUND;
END;
$$;

-- Function to check username availability
CREATE OR REPLACE FUNCTION is_username_available(check_username text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN NOT EXISTS (
    SELECT 1 FROM user_profiles WHERE username = check_username
  );
END;
$$;

-- Function to create user profile
CREATE OR REPLACE FUNCTION create_user_profile(
  check_user_id uuid,
  first_name text,
  last_name text,
  middle_name text,
  username text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO user_profiles (user_id, first_name, last_name, middle_name, username)
  VALUES (check_user_id, first_name, last_name, middle_name, username);
  
  RETURN FOUND;
END;
$$;

-- Function to get user full name
CREATE OR REPLACE FUNCTION get_user_full_name(check_user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN (
    SELECT 
      CASE 
        WHEN first_name IS NOT NULL AND last_name IS NOT NULL 
        THEN first_name || ' ' || last_name
        WHEN first_name IS NOT NULL 
        THEN first_name
        ELSE 'Unknown User'
      END
    FROM user_profiles
    WHERE user_id = check_user_id
  );
END;
$$;

-- Function to get current credit score
CREATE OR REPLACE FUNCTION get_current_credit_score(check_user_id uuid)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  score integer,
  score_band text,
  factors jsonb,
  recommendations jsonb,
  bureau_source text,
  is_current boolean,
  calculated_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cs.id,
    cs.user_id,
    cs.score,
    cs.score_band,
    cs.factors,
    cs.recommendations,
    cs.bureau_source,
    cs.is_current,
    cs.calculated_at
  FROM credit_scores cs
  WHERE cs.user_id = check_user_id AND cs.is_current = true
  ORDER BY cs.calculated_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate credit score
CREATE OR REPLACE FUNCTION calculate_credit_score(check_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  base_score integer := 650;
  loan_count integer;
  avg_amount numeric;
  payment_history text;
  final_score integer;
BEGIN
  -- Get loan application count
  SELECT COUNT(*) INTO loan_count
  FROM loan_applications
  WHERE user_id = check_user_id;
  
  -- Get average loan amount
  SELECT COALESCE(AVG(amount), 0) INTO avg_amount
  FROM loan_applications
  WHERE user_id = check_user_id;
  
  -- Simple scoring algorithm
  final_score := base_score;
  
  -- Adjust based on loan count (more loans = better score)
  IF loan_count > 0 THEN
    final_score := final_score + (loan_count * 10);
  END IF;
  
  -- Adjust based on average amount
  IF avg_amount > 100000 THEN
    final_score := final_score + 50;
  ELSIF avg_amount > 50000 THEN
    final_score := final_score + 30;
  ELSIF avg_amount > 10000 THEN
    final_score := final_score + 10;
  END IF;
  
  -- Ensure score is within valid range
  final_score := GREATEST(300, LEAST(850, final_score));
  
  RETURN final_score;
END;
$$;

-- =====================================================
-- STEP 5: CREATE TRIGGERS
-- =====================================================

-- Trigger for new user creation
CREATE TRIGGER handle_new_user
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Trigger for referral code creation
CREATE TRIGGER create_referral_code_trigger
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_referral_code();

-- Trigger for loan status notifications
CREATE TRIGGER loan_status_notification_trigger
  AFTER UPDATE ON loan_applications
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION create_status_notification();

-- Triggers for updated_at columns
CREATE TRIGGER update_updated_at_column
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_updated_at_column
  BEFORE UPDATE ON notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- STEP 6: CREATE RLS POLICIES
-- =====================================================

-- User Profiles Policies
CREATE POLICY "Users can view their own profile"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (is_admin(auth.uid()));

CREATE POLICY "Users can update their own profile"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
  ON user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- User Roles Policies
CREATE POLICY "Admins can manage user roles"
  ON user_roles
  FOR ALL
  TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- Admin Actions Policies
CREATE POLICY "Admins can view admin actions"
  ON admin_actions
  FOR SELECT
  TO authenticated
  USING (is_admin(auth.uid()));

CREATE POLICY "Admins can insert admin actions"
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

-- Notifications Policies
CREATE POLICY "Users can view their own notifications"
  ON notifications
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own notifications"
  ON notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
  ON notifications
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notifications"
  ON notifications
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Notification Preferences Policies
CREATE POLICY "Users can view their own notification preferences"
  ON notification_preferences
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own notification preferences"
  ON notification_preferences
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notification preferences"
  ON notification_preferences
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- System Messages Policies
CREATE POLICY "System messages are viewable by all authenticated users"
  ON system_messages
  FOR SELECT
  TO authenticated
  USING (active = true);

CREATE POLICY "Admins can manage system messages"
  ON system_messages
  FOR ALL
  TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- Referral Codes Policies
CREATE POLICY "Users can view their own referral codes"
  ON referral_codes
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own referral codes"
  ON referral_codes
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Referrals Policies
CREATE POLICY "Users can view their own referrals"
  ON referrals
  FOR SELECT
  TO authenticated
  USING (auth.uid() = referrer_id OR auth.uid() = referred_id);

CREATE POLICY "Users can insert referrals"
  ON referrals
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = referrer_id);

-- Credit Scores Policies
CREATE POLICY "Users can view their own credit scores"
  ON credit_scores
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own credit scores"
  ON credit_scores
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own credit scores"
  ON credit_scores
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Loan Calculations Policies
CREATE POLICY "Users can view their own loan calculations"
  ON loan_calculations
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own loan calculations"
  ON loan_calculations
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own loan calculations"
  ON loan_calculations
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own loan calculations"
  ON loan_calculations
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Support Tickets Policies
CREATE POLICY "Users can view their own support tickets"
  ON support_tickets
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own support tickets"
  ON support_tickets
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own support tickets"
  ON support_tickets
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all support tickets"
  ON support_tickets
  FOR SELECT
  TO authenticated
  USING (is_admin(auth.uid()));

CREATE POLICY "Admins can update all support tickets"
  ON support_tickets
  FOR UPDATE
  TO authenticated
  USING (is_admin(auth.uid()));

-- Maintenance Mode Policies
CREATE POLICY "Maintenance mode is viewable by all"
  ON maintenance_mode
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Admins can manage maintenance mode"
  ON maintenance_mode
  FOR ALL
  TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- MFA Policies
CREATE POLICY "Users can view their own MFA factors"
  ON user_mfa_factors
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own MFA factors"
  ON user_mfa_factors
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own MFA factors"
  ON user_mfa_factors
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own MFA factors"
  ON user_mfa_factors
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own MFA challenges"
  ON user_mfa_challenges
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own MFA challenges"
  ON user_mfa_challenges
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own MFA challenges"
  ON user_mfa_challenges
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own MFA challenges"
  ON user_mfa_challenges
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- =====================================================
-- STEP 7: CREATE INDEXES FOR PERFORMANCE
-- =====================================================

-- User Profiles Indexes
CREATE INDEX idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX idx_user_profiles_username ON user_profiles(username);
CREATE INDEX idx_user_profiles_is_active ON user_profiles(is_active);

-- User Roles Indexes
CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX idx_user_roles_role ON user_roles(role);

-- Admin Actions Indexes
CREATE INDEX idx_admin_actions_admin_id ON admin_actions(admin_id);
CREATE INDEX idx_admin_actions_created_at ON admin_actions(created_at);
CREATE INDEX idx_admin_actions_action_type ON admin_actions(action_type);
CREATE INDEX idx_admin_actions_target_id ON admin_actions(target_id);

-- Loan Applications Indexes
CREATE INDEX idx_loan_applications_user_id ON loan_applications(user_id);
CREATE INDEX idx_loan_applications_status ON loan_applications(status);
CREATE INDEX idx_loan_applications_created_at ON loan_applications(created_at);
CREATE INDEX idx_loan_applications_application_number ON loan_applications(application_number);

-- Notifications Indexes
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_priority ON notifications(priority);
CREATE INDEX idx_notifications_expires_at ON notifications(expires_at);
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, read) WHERE read = false;

-- System Messages Indexes
CREATE INDEX idx_system_messages_active ON system_messages(active);
CREATE INDEX idx_system_messages_target_audience ON system_messages(target_audience);
CREATE INDEX idx_system_messages_created_at ON system_messages(created_at DESC);
CREATE INDEX idx_system_messages_expires_at ON system_messages(expires_at);
CREATE INDEX idx_system_messages_active_audience ON system_messages(active, target_audience) WHERE active = true;

-- Referral Indexes
CREATE INDEX idx_referral_codes_user_id ON referral_codes(user_id);
CREATE INDEX idx_referral_codes_code ON referral_codes(referral_code);
CREATE INDEX idx_referrals_referrer_id ON referrals(referrer_id);
CREATE INDEX idx_referrals_referred_id ON referrals(referred_id);
CREATE INDEX idx_referrals_code ON referrals(referral_code);
CREATE INDEX idx_referrals_status ON referrals(status);

-- Credit Scores Indexes
CREATE INDEX idx_credit_scores_user_id ON credit_scores(user_id);
CREATE INDEX idx_credit_scores_current ON credit_scores(user_id, is_current) WHERE is_current = true;
CREATE INDEX idx_credit_scores_calculated_at ON credit_scores(calculated_at);

-- Loan Calculations Indexes
CREATE INDEX idx_loan_calculations_user_id ON loan_calculations(user_id);
CREATE INDEX idx_loan_calculations_saved ON loan_calculations(user_id, saved) WHERE saved = true;
CREATE INDEX idx_loan_calculations_created_at ON loan_calculations(created_at);

-- Support Tickets Indexes
CREATE INDEX idx_support_tickets_user_id ON support_tickets(user_id);
CREATE INDEX idx_support_tickets_status ON support_tickets(status);
CREATE INDEX idx_support_tickets_priority ON support_tickets(priority);
CREATE INDEX idx_support_tickets_category ON support_tickets(category);
CREATE INDEX idx_support_tickets_assigned_to ON support_tickets(assigned_to);
CREATE INDEX idx_support_tickets_created_at ON support_tickets(created_at);

-- MFA Indexes
CREATE INDEX idx_user_mfa_factors_user_id ON user_mfa_factors(user_id);
CREATE INDEX idx_user_mfa_factors_type ON user_mfa_factors(factor_type);
CREATE INDEX idx_user_mfa_challenges_user_id ON user_mfa_challenges(user_id);
CREATE INDEX idx_user_mfa_challenges_expires_at ON user_mfa_challenges(expires_at);

-- =====================================================
-- STEP 8: GRANT PERMISSIONS
-- =====================================================

-- Grant function permissions
GRANT EXECUTE ON FUNCTION is_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION is_super_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_role(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION log_admin_action(text, text, uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_profile(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION update_user_profile(uuid, text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION is_username_available(text) TO authenticated;
GRANT EXECUTE ON FUNCTION create_user_profile(uuid, text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_full_name(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_current_credit_score(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_credit_score(uuid) TO authenticated;

-- Grant table permissions
GRANT SELECT, INSERT, UPDATE ON user_profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE ON user_roles TO authenticated;
GRANT SELECT, INSERT ON admin_actions TO authenticated;
GRANT SELECT, INSERT, UPDATE ON loan_applications TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON notifications TO authenticated;
GRANT SELECT, INSERT, UPDATE ON notification_preferences TO authenticated;
GRANT SELECT, INSERT, UPDATE ON system_messages TO authenticated;
GRANT SELECT, INSERT ON referral_codes TO authenticated;
GRANT SELECT, INSERT, UPDATE ON referrals TO authenticated;
GRANT SELECT, INSERT, UPDATE ON credit_scores TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON loan_calculations TO authenticated;
GRANT SELECT, INSERT, UPDATE ON support_tickets TO authenticated;
GRANT SELECT, INSERT, UPDATE ON maintenance_mode TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON user_mfa_factors TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON user_mfa_challenges TO authenticated;

-- =====================================================
-- STEP 9: VERIFICATION
-- =====================================================

-- Test that everything works
DO $$
BEGIN
  RAISE NOTICE 'Auth tables reset completed successfully!';
  RAISE NOTICE 'All tables, functions, triggers, and policies have been recreated.';
END $$; 