import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://cohkmipkklczqbnnnzrk.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvaGttaXBra2xjenFibm5uenJrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTEzOTY0OCwiZXhwIjoyMDY2NzE1NjQ4fQ.tfkj8Lzl0pt5zS0cON-8Q0yEzqv2gDOptj2bu6ozMmw';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function checkForErrors() {
  console.log('🔍 Checking Supabase project for errors...');
  
  try {
    // Check database connection
    console.log('\n📊 Testing database connection...');
    const { data: connectionTest, error: connectionError } = await supabase
      .rpc('exec_sql', { sql: "SELECT table_name FROM information_schema.tables LIMIT 1" });
    
    if (connectionError) {
      console.error('❌ Database connection error:', connectionError);
    } else {
      console.log('✅ Database connection successful');
    }

    // Check for missing tables or schema issues
    console.log('\n🏗️ Checking database schema...');
    const { data: tables, error: tablesError } = await supabase
      .rpc('exec_sql', { sql: "SELECT table_name, table_schema FROM information_schema.tables WHERE table_schema = 'public'" });
    
    if (tablesError) {
      console.error('❌ Schema check error:', tablesError);
    } else {
      console.log('✅ Found tables:', tables.map(t => t.table_name).join(', '));
    }

    // Check for RLS policies
    console.log('\n🔒 Checking Row Level Security policies...');
    const { data: policies, error: policiesError } = await supabase
      .rpc('exec_sql', { sql: "SELECT tablename, policyname, permissive FROM pg_policies LIMIT 10" });
    
    if (policiesError) {
      console.error('❌ RLS policies check error:', policiesError);
    } else {
      console.log(`✅ Found ${policies?.length || 0} RLS policies`);
      if (policies && policies.length > 0) {
        policies.forEach(policy => {
          console.log(`  - ${policy.tablename}: ${policy.policyname}`);
        });
      }
    }

    // Check for functions
    console.log('\n⚙️ Checking database functions...');
    const { data: functions, error: functionsError } = await supabase
      .rpc('exec_sql', { sql: "SELECT routine_name, routine_type FROM information_schema.routines WHERE routine_schema = 'public'" });
    
    if (functionsError) {
      console.error('❌ Functions check error:', functionsError);
    } else {
      console.log(`✅ Found ${functions?.length || 0} custom functions`);
      if (functions && functions.length > 0) {
        functions.forEach(func => {
          console.log(`  - ${func.routine_name} (${func.routine_type})`);
        });
      }
    }

    // Test auth functionality
    console.log('\n🔐 Testing auth functionality...');
    const { data: authTest, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.error('❌ Auth test error:', authError);
    } else {
      console.log(`✅ Auth working - found ${authTest.users?.length || 0} users`);
    }

    // Check for common issues
    console.log('\n🔍 Checking for common issues...');
    
    // Check if create_user_profile function exists
    const { data: profileFunc, error: profileFuncError } = await supabase
      .rpc('exec_sql', { sql: "SELECT routine_name FROM information_schema.routines WHERE routine_name = 'create_user_profile' AND routine_schema = 'public'" });
    
    if (profileFuncError) {
      console.error('❌ Error checking create_user_profile function:', profileFuncError);
    } else if (!profileFunc || profileFunc.length === 0) {
      console.warn('⚠️ create_user_profile function not found - this may cause user registration issues');
    } else {
      console.log('✅ create_user_profile function exists');
    }

    console.log('\n✅ Error check completed!');
    
  } catch (error) {
    console.error('❌ Unexpected error during check:', error);
  }
}

checkForErrors();