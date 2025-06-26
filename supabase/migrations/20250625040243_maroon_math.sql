/*
  # Fix User Profiles RLS Policy

  1. Changes
    - Fix the RLS policy for user_profiles table to allow users to insert their own profiles
    - Add a function to create user profiles that bypasses RLS
  
  2. Security
    - Maintain proper security with RLS
    - Allow users to create their own profiles
    - Ensure admin access is preserved
*/

-- Drop existing policies that might conflict
DROP POLICY IF EXISTS "Users can insert their own profile" ON user_profiles;

-- Create a more permissive policy for inserting profiles
CREATE POLICY "Users can insert their own profile"
  ON user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Create a function to create user profiles that bypasses RLS
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
  IF NOT EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE LOWER(username) = LOWER(trim(profile_username))
  ) THEN
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
  ELSE
    RAISE EXCEPTION 'Username is already taken';
  END IF;
END;
$$;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION create_user_profile(uuid, text, text, text, text) TO authenticated;