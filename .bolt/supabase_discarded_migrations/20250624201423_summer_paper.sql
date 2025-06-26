/*
  # Profile Pictures and Enhanced User Profiles

  1. Database Changes
    - Add profile_picture_url column to user_profiles table
    - Create storage bucket for profile pictures
    - Set up storage policies for secure file access
    - Create enhanced profile management functions

  2. Security
    - RLS policies for profile picture access
    - User-specific storage permissions
    - Secure profile update functions

  3. Functions
    - get_user_profile: Retrieve complete profile with picture
    - update_profile_picture: Update profile picture URL
    - update_user_profile: Enhanced profile updates with picture support
*/

-- Add profile picture URL column to user_profiles if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' 
    AND column_name = 'profile_picture_url'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN profile_picture_url text;
  END IF;
END $$;

-- Create storage bucket for profile pictures
INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-pictures', 'profile-pictures', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for profile pictures using proper Supabase syntax
CREATE POLICY "Users can upload their own profile pictures"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'profile-pictures' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update their own profile pictures"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'profile-pictures' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Profile pictures are publicly viewable"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'profile-pictures');

CREATE POLICY "Users can delete their own profile pictures"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'profile-pictures' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Enhanced function to get user profile with profile picture
CREATE OR REPLACE FUNCTION get_user_profile(check_user_id uuid)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  first_name text,
  last_name text,
  middle_name text,
  username text,
  full_name text,
  profile_picture_url text,
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
    p.profile_picture_url,
    p.created_at,
    p.updated_at
  FROM user_profiles p
  WHERE p.user_id = check_user_id;
$$;

-- Function to update profile picture URL
CREATE OR REPLACE FUNCTION update_profile_picture(
  profile_user_id uuid,
  picture_url text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if user owns this profile
  IF NOT EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE user_id = profile_user_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  
  -- Update the profile picture URL
  UPDATE user_profiles SET
    profile_picture_url = picture_url,
    updated_at = now()
  WHERE user_id = profile_user_id;
  
  RETURN FOUND;
END;
$$;

-- Enhanced update_user_profile function to handle profile pictures
CREATE OR REPLACE FUNCTION update_user_profile(
  profile_user_id uuid,
  profile_first_name text DEFAULT NULL,
  profile_last_name text DEFAULT NULL,
  profile_middle_name text DEFAULT NULL,
  profile_username text DEFAULT NULL,
  picture_url text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_username text;
BEGIN
  -- Check if user owns this profile
  IF NOT EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE user_id = profile_user_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  
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
    profile_picture_url = COALESCE(picture_url, profile_picture_url),
    updated_at = now()
  WHERE user_id = profile_user_id;
  
  RETURN FOUND;
END;
$$;

-- Function to get user initials for avatar display
CREATE OR REPLACE FUNCTION get_user_initials(check_user_id uuid)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT 
    CASE 
      WHEN p.first_name IS NOT NULL AND p.last_name IS NOT NULL 
      THEN UPPER(LEFT(p.first_name, 1) || LEFT(p.last_name, 1))
      WHEN p.first_name IS NOT NULL 
      THEN UPPER(LEFT(p.first_name, 2))
      ELSE 'U'
    END
  FROM user_profiles p
  WHERE p.user_id = check_user_id;
$$;

-- Grant permissions for new functions
GRANT EXECUTE ON FUNCTION update_profile_picture(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_profile(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION update_user_profile(uuid, text, text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_initials(uuid) TO authenticated;

-- Create index for profile picture URLs for better performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_picture_url ON user_profiles(profile_picture_url);

-- Update RLS policies for user_profiles to include profile picture access
DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;
CREATE POLICY "Users can update their own profile"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);