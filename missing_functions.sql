-- Missing Functions for Authentication
-- These functions are referenced in the AuthForm but missing from the database

-- Function to check if a user exists by email
CREATE OR REPLACE FUNCTION check_user_exists_by_email(user_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM auth.users 
    WHERE email = user_email
  );
END;
$$;

-- Function to create user profile (called from AuthForm)
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
  -- Insert user profile
  INSERT INTO user_profiles (user_id, first_name, last_name, username)
  VALUES (profile_user_id, profile_first_name, profile_last_name, profile_username)
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Insert user role (default to 'user')
  INSERT INTO user_roles (user_id, role)
  VALUES (profile_user_id, 'user')
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Insert notification preferences
  INSERT INTO notification_preferences (user_id)
  VALUES (profile_user_id)
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Insert referral code
  INSERT INTO referral_codes (user_id, referral_code)
  VALUES (profile_user_id, 'REF' || substr(profile_user_id::text, 1, 8) || substr(md5(random()::text), 1, 4))
  ON CONFLICT (user_id) DO NOTHING;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION check_user_exists_by_email(text) TO authenticated;
GRANT EXECUTE ON FUNCTION create_user_profile(uuid, text, text, text) TO authenticated; 