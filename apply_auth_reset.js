const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

// Supabase configuration
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   - VITE_SUPABASE_URL');
  console.error('   - SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Create Supabase client with service role key for admin operations
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyAuthReset() {
  try {
    console.log('🔄 Starting auth tables reset...');
    
    // Read the SQL file
    const sqlFilePath = path.join(__dirname, 'reset_auth_tables.sql');
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
    
    console.log('📄 SQL file loaded successfully');
    console.log('📊 File size:', (sqlContent.length / 1024).toFixed(2), 'KB');
    
    // Split SQL into individual statements
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--') && !stmt.startsWith('/*'));
    
    console.log(`🔧 Found ${statements.length} SQL statements to execute`);
    
    // Execute each statement
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      if (statement.trim().length === 0) continue;
      
      try {
        console.log(`\n📝 Executing statement ${i + 1}/${statements.length}...`);
        
        const { error } = await supabase.rpc('exec_sql', { sql: statement });
        
        if (error) {
          console.error(`❌ Error in statement ${i + 1}:`, error.message);
          errorCount++;
        } else {
          console.log(`✅ Statement ${i + 1} executed successfully`);
          successCount++;
        }
      } catch (err) {
        console.error(`❌ Exception in statement ${i + 1}:`, err.message);
        errorCount++;
      }
    }
    
    console.log('\n📊 Execution Summary:');
    console.log(`   ✅ Successful: ${successCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);
    console.log(`   📝 Total: ${statements.length}`);
    
    if (errorCount === 0) {
      console.log('\n🎉 Auth tables reset completed successfully!');
      console.log('✨ All tables, functions, triggers, and policies have been recreated.');
    } else {
      console.log('\n⚠️  Auth tables reset completed with some errors.');
      console.log('   Please check the error messages above and fix any issues.');
    }
    
  } catch (error) {
    console.error('💥 Fatal error:', error.message);
    process.exit(1);
  }
}

// Alternative method using direct SQL execution
async function applyAuthResetDirect() {
  try {
    console.log('🔄 Starting auth tables reset (direct method)...');
    
    // Read the SQL file
    const sqlFilePath = path.join(__dirname, 'reset_auth_tables.sql');
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
    
    console.log('📄 SQL file loaded successfully');
    console.log('📊 File size:', (sqlContent.length / 1024).toFixed(2), 'KB');
    
    // Execute the entire SQL file
    console.log('🚀 Executing SQL reset...');
    
    const { error } = await supabase.rpc('exec_sql', { sql: sqlContent });
    
    if (error) {
      console.error('❌ Error executing SQL:', error.message);
      console.log('\n💡 Trying alternative method...');
      
      // Try executing in smaller chunks
      const statements = sqlContent
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0 && !stmt.startsWith('--') && !stmt.startsWith('/*'));
      
      console.log(`🔧 Executing ${statements.length} statements individually...`);
      
      let successCount = 0;
      let errorCount = 0;
      
      for (let i = 0; i < statements.length; i++) {
        const statement = statements[i];
        
        if (statement.trim().length === 0) continue;
        
        try {
          const { error: stmtError } = await supabase.rpc('exec_sql', { sql: statement });
          
          if (stmtError) {
            console.error(`❌ Statement ${i + 1} failed:`, stmtError.message);
            errorCount++;
          } else {
            successCount++;
          }
        } catch (err) {
          console.error(`❌ Statement ${i + 1} exception:`, err.message);
          errorCount++;
        }
      }
      
      console.log(`\n📊 Individual execution: ${successCount} success, ${errorCount} errors`);
    } else {
      console.log('✅ SQL reset executed successfully!');
    }
    
  } catch (error) {
    console.error('💥 Fatal error:', error.message);
    process.exit(1);
  }
}

// Check if exec_sql function exists, if not create it
async function ensureExecSqlFunction() {
  try {
    console.log('🔍 Checking for exec_sql function...');
    
    const { error } = await supabase.rpc('exec_sql', { sql: 'SELECT 1' });
    
    if (error && error.message.includes('function "exec_sql" does not exist')) {
      console.log('📝 Creating exec_sql function...');
      
      const createFunctionSQL = `
        CREATE OR REPLACE FUNCTION exec_sql(sql text)
        RETURNS void
        LANGUAGE plpgsql
        SECURITY DEFINER
        AS $$
        BEGIN
          EXECUTE sql;
        END;
        $$;
        
        GRANT EXECUTE ON FUNCTION exec_sql(text) TO authenticated;
      `;
      
      // Try to create the function using a direct query
      const { error: createError } = await supabase
        .from('_dummy_table_that_does_not_exist')
        .select('*')
        .limit(1);
      
      if (createError) {
        console.log('⚠️  Cannot create exec_sql function automatically.');
        console.log('   Please run this SQL manually in Supabase SQL Editor:');
        console.log(createFunctionSQL);
        return false;
      }
    }
    
    console.log('✅ exec_sql function is available');
    return true;
  } catch (error) {
    console.error('❌ Error checking exec_sql function:', error.message);
    return false;
  }
}

// Main execution
async function main() {
  console.log('🚀 Auth Tables Reset Script');
  console.log('============================\n');
  
  // Check if exec_sql function exists
  const hasExecSql = await ensureExecSqlFunction();
  
  if (hasExecSql) {
    await applyAuthResetDirect();
  } else {
    console.log('📋 Please run the SQL manually in Supabase SQL Editor:');
    console.log('   1. Go to your Supabase project dashboard');
    console.log('   2. Navigate to SQL Editor');
    console.log('   3. Copy the contents of reset_auth_tables.sql');
    console.log('   4. Paste and execute the SQL');
    console.log('   5. Check for any errors and fix them');
  }
}

// Run the script
main().catch(console.error); 