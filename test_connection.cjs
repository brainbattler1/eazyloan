const { createClient } = require('@supabase/supabase-js');

// Supabase configuration with the provided anon key
const supabaseUrl = 'https://cohkmipkklczqbnnnzrk.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvaGttaXBra2xjenFibm5uenJrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTExMzk2NDgsImV4cCI6MjA2NjcxNTY0OH0.u4Q1dKQzVbbrfbxEB86V1CIA95C6ixDJ9Tqdf8yS064';

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testConnection() {
  try {
    console.log('🔄 Testing Supabase connection...');
    console.log('URL:', supabaseUrl);
    console.log('Key:', supabaseAnonKey.substring(0, 50) + '...');
    
    // Test basic connection
    const { data, error } = await supabase.from('user_profiles').select('count').limit(1);
    
    if (error) {
      console.error('❌ Connection test failed:', error.message);
      return;
    }
    
    console.log('✅ Supabase connection successful!');
    console.log('📊 Response:', data);
    
    // Test if the missing functions exist
    console.log('\n🔄 Testing missing functions...');
    
    // Test check_user_exists_by_email function
    try {
      const { data: funcTest, error: funcError } = await supabase.rpc('check_user_exists_by_email', { 
        user_email: 'test@example.com' 
      });
      
      if (funcError) {
        console.log('⚠️ check_user_exists_by_email function missing:', funcError.message);
      } else {
        console.log('✅ check_user_exists_by_email function exists');
      }
    } catch (e) {
      console.log('⚠️ check_user_exists_by_email function missing');
    }
    
    // Test create_user_profile function
    try {
      const { data: funcTest2, error: funcError2 } = await supabase.rpc('create_user_profile', { 
        profile_user_id: '00000000-0000-0000-0000-000000000000',
        profile_first_name: 'test',
        profile_last_name: 'test',
        profile_username: 'test'
      });
      
      if (funcError2) {
        console.log('⚠️ create_user_profile function missing:', funcError2.message);
      } else {
        console.log('✅ create_user_profile function exists');
      }
    } catch (e) {
      console.log('⚠️ create_user_profile function missing');
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the test
testConnection(); 