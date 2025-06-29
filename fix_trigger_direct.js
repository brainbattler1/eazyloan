import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY environment variable is required');
  process.exit(1);
}

// Create Supabase client with service role key
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixTrigger() {
  try {
    console.log('🔄 Creating improved user creation function...');
    
    // Create the improved function
    const functionSQL = `
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
$$ LANGUAGE plpgsql SECURITY DEFINER;`;

    const { error: funcError } = await supabase.rpc('query', { query: functionSQL });
    
    if (funcError) {
      console.error('❌ Failed to create function:', funcError);
      return;
    }
    
    console.log('✅ Function created successfully');
    
    // Create the trigger
    const triggerSQL = `
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();`;
    
    const { error: triggerError } = await supabase.rpc('query', { query: triggerSQL });
    
    if (triggerError) {
      console.error('❌ Failed to create trigger:', triggerError);
      return;
    }
    
    console.log('✅ Trigger created successfully');
    
    // Grant permissions
    const permissionsSQL = `
GRANT EXECUTE ON FUNCTION handle_new_user() TO authenticated;
GRANT EXECUTE ON FUNCTION handle_new_user() TO anon;`;
    
    const { error: permError } = await supabase.rpc('query', { query: permissionsSQL });
    
    if (permError) {
      console.log('⚠️ Warning: Could not grant permissions:', permError);
    } else {
      console.log('✅ Permissions granted successfully');
    }
    
    console.log('🎉 User creation trigger is now active!');
    console.log('🔄 Try creating a new user to test the fix.');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('\n📋 Manual SQL to apply in Supabase Dashboard:');
    console.log(`
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
GRANT EXECUTE ON FUNCTION handle_new_user() TO anon;`);
  }
}

fixTrigger();