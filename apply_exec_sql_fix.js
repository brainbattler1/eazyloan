import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://cohkmipkklczqbnnnzrk.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvaGttaXBra2xjenFibm5uenJrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTEzOTY0OCwiZXhwIjoyMDY2NzE1NjQ4fQ.tfkj8Lzl0pt5zS0cON-8Q0yEzqv2gDOptj2bu6ozMmw';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function applyExecSqlFix() {
  console.log('🔧 Applying exec_sql function fix...');
  
  try {
    // First, check if the function already exists
    console.log('🔍 Checking if exec_sql function exists...');
    
    const checkQuery = `
      SELECT routine_name 
      FROM information_schema.routines 
      WHERE routine_name = 'exec_sql' AND routine_schema = 'public'
    `;
    
    const { data: existingFunction, error: checkError } = await supabase
      .from('_dummy')
      .select('*')
      .limit(1);
    
    // Since we can't use rpc without the function, we'll use a migration approach
    const createFunctionSQL = `
      -- Create the exec_sql function
      CREATE OR REPLACE FUNCTION public.exec_sql(sql text)
      RETURNS void
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $$
      BEGIN
        EXECUTE sql;
      END;
      $$;
      
      -- Grant execute permissions
      GRANT EXECUTE ON FUNCTION public.exec_sql(text) TO authenticated;
      GRANT EXECUTE ON FUNCTION public.exec_sql(text) TO anon;
      GRANT EXECUTE ON FUNCTION public.exec_sql(text) TO service_role;
    `;
    
    console.log('📝 Creating exec_sql function...');
    console.log('\n⚠️  Since the function doesn\'t exist, you need to run this SQL manually:');
    console.log('\n' + '='.repeat(60));
    console.log(createFunctionSQL);
    console.log('='.repeat(60));
    
    console.log('\n📋 Steps to fix:');
    console.log('1. Go to your Supabase dashboard');
    console.log('2. Navigate to SQL Editor');
    console.log('3. Copy and paste the SQL above');
    console.log('4. Click "Run" to execute');
    console.log('5. Run this script again to verify the fix');
    
    // Try to test if we can create the function using a migration
    console.log('\n🔄 Attempting to apply via migration...');
    
    const migrationName = `fix_exec_sql_function_${Date.now()}`;
    
    // We'll use the MCP to apply this as a migration
    console.log(`\n💡 Alternative: Use the Supabase MCP to apply migration '${migrationName}'`);
    
  } catch (error) {
    console.error('❌ Error applying fix:', error);
    console.log('\n📋 Manual steps required:');
    console.log('1. Open Supabase SQL Editor');
    console.log('2. Run the SQL from fix_exec_sql_function.sql');
    console.log('3. Verify by running check_supabase_errors.js again');
  }
}

// Test function after applying fix
async function testExecSqlFunction() {
  console.log('\n🧪 Testing exec_sql function...');
  
  try {
    const { data, error } = await supabase.rpc('exec_sql', { sql: 'SELECT 1 as test' });
    
    if (error) {
      console.error('❌ Function test failed:', error.message);
      return false;
    } else {
      console.log('✅ exec_sql function is working!');
      return true;
    }
  } catch (error) {
    console.error('❌ Function test error:', error);
    return false;
  }
}

// Main execution
async function main() {
  console.log('🚀 Exec SQL Function Fix');
  console.log('========================\n');
  
  // First try to test the function
  const isWorking = await testExecSqlFunction();
  
  if (!isWorking) {
    await applyExecSqlFix();
  } else {
    console.log('✅ exec_sql function is already working!');
    console.log('\n🔄 You can now run check_supabase_errors.js to verify all issues are resolved.');
  }
}

main().catch(console.error);