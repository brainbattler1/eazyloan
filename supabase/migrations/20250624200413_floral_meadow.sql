/*
  # Enhanced User Profiles Migration

  1. New Features
    - Enhanced user profiles with first name, last name, username
    - Username availability checking
    - Improved user profile management
    - Better authentication flow support

  2. Security
    - RLS policies for user profiles
    - Username uniqueness constraints
    - Safe profile creation functions

  3. Functions
    - Username availability checking
    - User profile creation helpers
    - Enhanced user data retrieval
*/

-- =====================================================
-- ENHANCED USER PROFILES SYSTEM
-- =====================================================

-- Ensure user_profiles table has all required fields
DO $$
BEGIN
  -- Add columns if they don't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'first_name') THEN
    ALTER TABLE user_profiles ADD COLUMN first_name text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'last_name') THEN
    ALTER TABLE user_profiles ADD COLUMN last_name text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'middle_name') THEN
    ALTER TABLE user_profiles ADD COLUMN middle_name text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'username') THEN
    ALTER TABLE user_profiles ADD COLUMN username text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'created_at') THEN
    ALTER TABLE user_profiles ADD COLUMN created_at timestamptz DEFAULT now();
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'updated_at') THEN
    ALTER TABLE user_profiles ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;
END $$;

-- Update constraints to make required fields NOT NULL
ALTER TABLE user_profiles 
  ALTER COLUMN first_name SET NOT NULL,
  ALTER COLUMN last_name SET NOT NULL,
  ALTER COLUMN username SET NOT NULL;

-- Add unique constraint on username if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'user_profiles' 
    AND constraint_name = 'user_profiles_username_key'
  ) THEN
    ALTER TABLE user_profiles ADD CONSTRAINT user_profiles_username_key UNIQUE (username);
  END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_username_lower ON user_profiles(LOWER(username));
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);

-- =====================================================
-- ENHANCED FUNCTIONS
-- =====================================================

-- Enhanced function to check username availability (case-insensitive)
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

-- Function to create user profile safely
CREATE OR REPLACE FUNCTION create_user_profile(
  profile_user_id uuid,
  profile_first_name text,
  profile_last_name text,
  profile_username text,
  profile_middle_name text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  profile_id uuid;
BEGIN
  -- Validate inputs
  IF profile_first_name IS NULL OR trim(profile_first_name) = '' THEN
    RAISE EXCEPTION 'First name is required';
  END IF;
  
  IF profile_last_name IS NULL OR trim(profile_last_name) = '' THEN
    RAISE EXCEPTION 'Last name is required';
  END IF;
  
  IF profile_username IS NULL OR trim(profile_username) = '' THEN
    RAISE EXCEPTION 'Username is required';
  END IF;
  
  -- Check if username is available
  IF NOT is_username_available(profile_username) THEN
    RAISE EXCEPTION 'Username is already taken';
  END IF;
  
  -- Insert the profile
  INSERT INTO user_profiles (
    user_id,
    first_name,
    last_name,
    middle_name,
    username,
    created_at,
    updated_at
  ) VALUES (
    profile_user_id,
    trim(profile_first_name),
    trim(profile_last_name),
    CASE WHEN profile_middle_name IS NOT NULL AND trim(profile_middle_name) != '' 
         THEN trim(profile_middle_name) 
         ELSE NULL END,
    LOWER(trim(profile_username)),
    now(),
    now()
  ) RETURNING id INTO profile_id;
  
  RETURN profile_id;
END;
$$;

-- Enhanced function to get user's full name with fallback
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
    (SELECT email FROM auth.users WHERE id = check_user_id LIMIT 1),
    'Unknown User'::text
  );
$$;

-- Function to get user profile with all details
CREATE OR REPLACE FUNCTION get_user_profile(check_user_id uuid)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  first_name text,
  last_name text,
  middle_name text,
  username text,
  full_name text,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT 
    p.id,
    p.user_id,
    p.first_name,
    p.last_name,
    p.middle_name,
    p.username,
    CASE 
      WHEN p.middle_name IS NOT NULL AND p.middle_name != '' 
      THEN p.first_name || ' ' || p.middle_name || ' ' || p.last_name
      ELSE p.first_name || ' ' || p.last_name
    END as full_name,
    p.created_at,
    p.updated_at
  FROM user_profiles p
  WHERE p.user_id = check_user_id;
$$;

-- Function to update user profile
CREATE OR REPLACE FUNCTION update_user_profile(
  profile_user_id uuid,
  profile_first_name text DEFAULT NULL,
  profile_last_name text DEFAULT NULL,
  profile_middle_name text DEFAULT NULL,
  profile_username text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_username text;
BEGIN
  -- Get current username
  SELECT username INTO current_username 
  FROM user_profiles 
  WHERE user_id = profile_user_id;
  
  IF current_username IS NULL THEN
    RAISE EXCEPTION 'User profile not found';
  END IF;
  
  -- Check if new username is available (if provided and different)
  IF profile_username IS NOT NULL 
     AND LOWER(trim(profile_username)) != current_username 
     AND NOT is_username_available(profile_username) THEN
    RAISE EXCEPTION 'Username is already taken';
  END IF;
  
  -- Update the profile
  UPDATE user_profiles SET
    first_name = COALESCE(NULLIF(trim(profile_first_name), ''), first_name),
    last_name = COALESCE(NULLIF(trim(profile_last_name), ''), last_name),
    middle_name = CASE 
      WHEN profile_middle_name IS NOT NULL 
      THEN NULLIF(trim(profile_middle_name), '') 
      ELSE middle_name 
    END,
    username = COALESCE(LOWER(NULLIF(trim(profile_username), '')), username),
    updated_at = now()
  WHERE user_id = profile_user_id;
  
  RETURN FOUND;
END;
$$;

-- =====================================================
-- ENHANCED RLS POLICIES
-- =====================================================

-- Drop existing policies to recreate them
DROP POLICY IF EXISTS "Users can view their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;

-- Recreate policies with better security
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

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

-- Grant function permissions
GRANT EXECUTE ON FUNCTION is_username_available(text) TO authenticated;
GRANT EXECUTE ON FUNCTION create_user_profile(uuid, text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_full_name(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_profile(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION update_user_profile(uuid, text, text, text, text) TO authenticated;

-- Grant table permissions
GRANT SELECT, INSERT, UPDATE ON user_profiles TO authenticated;

-- =====================================================
-- VERIFICATION
-- =====================================================

-- Test that everything works
DO $$
BEGIN
  -- Test username availability function
  PERFORM is_username_available('test_user_123');
  
  -- Test user profile functions
  PERFORM get_user_full_name('00000000-0000-0000-0000-000000000000');
  
  RAISE NOTICE 'Enhanced user profiles migration completed successfully!';
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Enhanced profiles migration failed: %', SQLERRM;
END $$;