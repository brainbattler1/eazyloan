# Fix for "Database error saving new user"

## Problem
The application is experiencing a "Database error saving new user" because there's no automatic trigger to create user profiles and roles when new users sign up through Supabase Auth.

## Solution
You need to add a database trigger that automatically creates user profiles and roles when new users register.

## Method 1: Using Supabase Dashboard (Recommended)

1. Go to your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Create a new query and paste the following SQL:

```sql
-- Function to handle new user creation
CRETE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Create user profile with default values
  INSERT INTO public.user_profiles (
    user_id,
    first_name,
    last_name,
    username
  ) VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'first_name', 'User'),
    COALESCE(NEW.raw_user_meta_data->>'last_name', 'Name'),
    COALESCE(NEW.raw_user_meta_data->>'username', SPLIT_PART(NEW.email, '@', 1))
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
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION handle_new_user() TO authenticated;
GRANT EXECUTE ON FUNCTION handle_new_user() TO anon;
```

4. Click **Run** to execute the SQL
5. You should see a success message

## Method 2: Alternative Simple Fix

If the trigger approach doesn't work, you can modify the signup process to handle profile creation in the application code:

1. Update the `signUp` function in `AuthContext.jsx` to create the profile after successful signup
2. Add error handling for profile creation

## Testing

After applying the fix:

1. Try registering a new user
2. The signup should now work without the database error
3. Check the `user_profiles` and `user_roles` tables to confirm the records are created

## What This Fix Does

- **Automatically creates user profile**: When a new user signs up, a profile record is created in `user_profiles`
- **Assigns default role**: New users get the 'user' role in `user_roles`
- **Handles errors gracefully**: If profile creation fails, it doesn't break the user signup
- **Uses metadata**: Extracts name information from signup metadata if available

## Verification

To verify the fix is working:

1. Go to Supabase Dashboard > Authentication > Users
2. Try creating a test user
3. Check that corresponding records appear in:
   - `user_profiles` table
   - `user_roles` table

The "Database error saving new user" should now be resolved!