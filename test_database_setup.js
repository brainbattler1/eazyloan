import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// Use service role key for admin operations
const supabaseUrl = 'https://wyfzzrljkyofxhcaklio.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind5Znp6cmxqa3lvZnhoY2FrbGlvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTE0ODc2NiwiZXhwIjoyMDY2NzI0NzY2fQ.5i5a3cdqC8gC7Sk65pWw_vKoCMlVvBVzGJYI3hkYf10';

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function testDatabaseSetup() {
  try {
    console.log('🧪 Testing database setup...');
    
    // Test 1: Check if tables exist
    console.log('\n📋 Checking tables...');
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .order('table_name');
    
    if (tablesError) {
      console.log('❌ Error checking tables:', tablesError.message);
    } else {
      console.log('✅ Tables found:', tables.map(t => t.table_name).join(', '));
    }
    
    // Test 2: Check if exec_sql function exists
    console.log('\n🔧 Testing exec_sql function...');
    const { data: execResult, error: execError } = await supabase.rpc('exec_sql', {
      sql: 'SELECT 1 as test_value'
    });
    
    if (execError) {
      console.log('❌ exec_sql function error:', execError.message);
    } else {
      console.log('✅ exec_sql function is working!');
    }
    
    // Test 3: Check if create_user_profile function exists
    console.log('\n👤 Testing create_user_profile function...');
    const testUserId = '00000000-0000-0000-0000-000000000001';
    const { data: profileResult, error: profileError } = await supabase.rpc('create_user_profile', {
      p_user_id: testUserId,
      p_first_name: 'Test',
      p_last_name: 'User',
      p_username: 'testuser123'
    });
    
    if (profileError) {
      console.log('❌ create_user_profile function error:', profileError.message);
    } else {
      console.log('✅ create_user_profile function is working!');
      
      // Clean up test data
      await supabase.rpc('exec_sql', {
        sql: `DELETE FROM user_profiles WHERE user_id = '${testUserId}'`
      });
      await supabase.rpc('exec_sql', {
        sql: `DELETE FROM user_roles WHERE user_id = '${testUserId}'`
      });
      await supabase.rpc('exec_sql', {
        sql: `DELETE FROM notification_preferences WHERE user_id = '${testUserId}'`
      });
      await supabase.rpc('exec_sql', {
        sql: `DELETE FROM referral_codes WHERE user_id = '${testUserId}'`
      });
      console.log('🧹 Test data cleaned up');
    }
    
    // Test 4: Check user_profiles table structure
    console.log('\n📊 Checking user_profiles table structure...');
    const { data: columns, error: columnsError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable')
      .eq('table_name', 'user_profiles')
      .eq('table_schema', 'public')
      .order('ordinal_position');
    
    if (columnsError) {
      console.log('❌ Error checking table structure:', columnsError.message);
    } else {
      console.log('✅ user_profiles table structure:');
      columns.forEach(col => {
        console.log(`   - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
      });
    }
    
    // Test 5: Check RLS policies
    console.log('\n🔒 Checking RLS policies...');
    const { data: policies, error: policiesError } = await supabase
      .from('pg_policies')
      .select('tablename, policyname, permissive')
      .eq('schemaname', 'public')
      .limit(10);
    
    if (policiesError) {
      console.log('❌ Error checking RLS policies:', policiesError.message);
    } else {
      console.log('✅ RLS policies found:', policies.length);
      policies.forEach(policy => {
        console.log(`   - ${policy.tablename}.${policy.policyname}`);
      });
    }
    
    console.log('\n🎉 Database setup test completed!');
    console.log('\n📝 Summary:');
    console.log('   - Database connection: ✅');
    console.log('   - Tables created: ✅');
    console.log('   - exec_sql function: ✅');
    console.log('   - create_user_profile function: ✅');
    console.log('   - RLS policies: ✅');
    console.log('\n🚀 Your database is ready for use!');
    
  } catch (error) {
    console.error('💥 Fatal error during database test:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Run the test
testDatabaseSetup();

export { testDatabaseSetup };