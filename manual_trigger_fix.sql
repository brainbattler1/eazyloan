-- Manual fix for user creation trigger
-- Apply this in Supabase Dashboard > SQL Editor

-- Create improved function to handle new user creation
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  username_value text;
BEGIN
  -- Generate a unique username from email
  username_value := SPLIT_PART(NEW.email, '@', 1);
  
  -- Ensure username is unique by appending random suffix if needed
  WHILE EXISTS (SELECT 1 FROM public.user_profiles WHERE username = username_value) LOOP
    username_value := SPLIT_PART(NEW.email, '@', 1) || '_' || FLOOR(RANDOM() * 10000)::text;
  END LOOP;
  
  -- Create user profile with default values
  INSERT INTO public.user_profiles (
    user_id,
    first_name,
    last_name,
    username
  ) VALUES (
    NEW.id,
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'first_name', ''), 'User'),
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'last_name', ''), 'Name'),
    username_value
  );
  
  -- Create user role with default 'user' role
  INSERT INTO public.user_roles (
    user_id,
    role
  ) VALUES (
    NEW.id,
    'user'
  );
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the user creation
    RAISE LOG 'Error in handle_new_user trigger: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on auth.users table
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION handle_new_user() TO authenticated;
GRANT EXECUTE ON FUNCTION handle_new_user() TO anon;

-- Add comment
COMMENT ON FUNCTION handle_new_user() IS 'Automatically creates user profile and role when a new user signs up - Updated version with proper error handling';