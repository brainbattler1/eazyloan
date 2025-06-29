/*
  # FULL AUTH TABLES RESET SCRIPT
  This script will:
  1. Drop all existing auth/account tables and functions
  2. Recreate all tables with the current schema
  3. Setup triggers, functions, and permissions
  4. Enable RLS policies
  5. Grant permissions
*/

-- ========== DROP EXISTING TABLES & FUNCTIONS ==========
DROP TRIGGER IF EXISTS handle_new_user ON auth.users;
DROP TRIGGER IF EXISTS create_referral_code_trigger ON auth.users;
DROP TRIGGER IF EXISTS loan_status_notification_trigger ON loan_applications;
DROP TRIGGER IF EXISTS update_updated_at_column ON user_profiles;
DROP TRIGGER IF EXISTS update_updated_at_column ON notification_preferences;

DROP FUNCTION IF EXISTS handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS create_referral_code() CASCADE;
DROP FUNCTION IF EXISTS is_admin(uuid) CASCADE;
DROP FUNCTION IF EXISTS is_super_admin(uuid) CASCADE;
DROP FUNCTION IF EXISTS get_user_role(uuid) CASCADE;
DROP FUNCTION IF EXISTS create_user_profile(uuid, text, text, text) CASCADE;

DROP TABLE IF EXISTS user_mfa_challenges CASCADE;
DROP TABLE IF EXISTS user_mfa_factors CASCADE;
DROP TABLE IF EXISTS referral_codes CASCADE;
DROP TABLE IF EXISTS referrals CASCADE;
DROP TABLE IF EXISTS notification_preferences CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS system_messages CASCADE;
DROP TABLE IF EXISTS maintenance_mode CASCADE;
DROP TABLE IF EXISTS admin_actions CASCADE;
DROP TABLE IF EXISTS user_roles CASCADE;
DROP TABLE IF EXISTS user_profiles CASCADE;
DROP TABLE IF EXISTS loan_applications CASCADE;

-- ========== CREATE TABLES ==========

CREATE TABLE user_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE NOT NULL,
  first_name text NOT NULL DEFAULT '',
  last_name text NOT NULL DEFAULT '',
  middle_name text,
  username text UNIQUE NOT NULL,
  profile_picture_url text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE NOT NULL,
  role text NOT NULL DEFAULT 'user',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_roles CHECK (role IN ('user', 'admin', 'super_admin'))
);

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

CREATE TABLE referral_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  referral_code text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now(),
  is_active boolean DEFAULT true
);

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

CREATE TABLE maintenance_mode (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  is_enabled boolean DEFAULT false,
  message text,
  enabled_by uuid,
  enabled_at timestamptz DEFAULT now(),
  disabled_at timestamptz
);

-- ========== ENABLE ROW LEVEL SECURITY ==========
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE loan_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_mfa_factors ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_mfa_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_mode ENABLE ROW LEVEL SECURITY;

-- ========== RECREATE create_user_profile FUNCTION ==========
CREATE OR REPLACE FUNCTION create_user_profile(
  profile_user_id uuid,
  profile_first_name text,
  profile_last_name text,
  profile_username text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO user_profiles (user_id, first_name, last_name, username)
  VALUES (profile_user_id, profile_first_name, profile_last_name, profile_username)
  ON CONFLICT (user_id) DO NOTHING;
  INSERT INTO user_roles (user_id, role)
  VALUES (profile_user_id, 'user')
  ON CONFLICT (user_id) DO NOTHING;
  INSERT INTO notification_preferences (user_id)
  VALUES (profile_user_id)
  ON CONFLICT (user_id) DO NOTHING;
  INSERT INTO referral_codes (user_id, referral_code)
  VALUES (profile_user_id, 'REF' || substr(profile_user_id::text, 1, 8) || substr(md5(random()::text), 1, 4))
  ON CONFLICT (user_id) DO NOTHING;
END;
$$;
GRANT EXECUTE ON FUNCTION create_user_profile(uuid, text, text, text) TO authenticated;