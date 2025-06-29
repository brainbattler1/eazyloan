const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Database connection string from your MCP configuration
const connectionString = 'postgres://postgres.mcrprryvezyngslphjwx:M1247N3117k%23@aws-0-ca-central-1.pooler.supabase.com:5432/postgres';

async function applyDatabaseReset() {
  const client = new Client({ connectionString });
  
  try {
    console.log('🔌 Connecting to Supabase database...');
    await client.connect();
    console.log('✅ Connected successfully!');
    
    // Read the SQL reset file
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
        
        await client.query(statement);
        console.log(`✅ Statement ${i + 1} executed successfully`);
        successCount++;
      } catch (error) {
        console.error(`❌ Error in statement ${i + 1}:`, error.message);
        errorCount++;
      }
    }
    
    console.log('\n📊 Execution Summary:');
    console.log(`   ✅ Successful: ${successCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);
    console.log(`   📝 Total: ${statements.length}`);
    
    if (errorCount === 0) {
      console.log('\n🎉 Database reset completed successfully!');
      console.log('✨ All tables, functions, triggers, and policies have been recreated.');
      
      // Test the connection and basic functionality
      console.log('\n🧪 Testing basic functionality...');
      
      try {
        const testResult = await client.query('SELECT test_db_connection()');
        console.log('✅ Database connection test:', testResult.rows[0].test_db_connection);
      } catch (error) {
        console.log('⚠️  Database connection test failed:', error.message);
      }
      
    } else {
      console.log('\n⚠️  Database reset completed with some errors.');
      console.log('   Please check the error messages above and fix any issues.');
    }
    
  } catch (error) {
    console.error('💥 Fatal error:', error.message);
    process.exit(1);
  } finally {
    await client.end();
    console.log('🔌 Database connection closed');
  }
}

// Alternative method: Execute the entire SQL file at once
async function applyDatabaseResetDirect() {
  const client = new Client({ connectionString });
  
  try {
    console.log('🔌 Connecting to Supabase database...');
    await client.connect();
    console.log('✅ Connected successfully!');
    
    // Read the SQL reset file
    const sqlFilePath = path.join(__dirname, 'reset_auth_tables.sql');
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
    
    console.log('📄 SQL file loaded successfully');
    console.log('📊 File size:', (sqlContent.length / 1024).toFixed(2), 'KB');
    
    // Execute the entire SQL file
    console.log('🚀 Executing SQL reset...');
    
    try {
      await client.query(sqlContent);
      console.log('✅ SQL reset executed successfully!');
      
      // Test the connection and basic functionality
      console.log('\n🧪 Testing basic functionality...');
      
      try {
        const testResult = await client.query('SELECT test_db_connection()');
        console.log('✅ Database connection test:', testResult.rows[0].test_db_connection);
      } catch (error) {
        console.log('⚠️  Database connection test failed:', error.message);
      }
      
    } catch (error) {
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
          const result = await client.query(statement);
          successCount++;
        } catch (err) {
          console.error(`❌ Statement ${i + 1} failed:`, err.message);
          errorCount++;
        }
      }
      
      console.log(`\n📊 Individual execution: ${successCount} success, ${errorCount} errors`);
    }
    
  } catch (error) {
    console.error('💥 Fatal error:', error.message);
    process.exit(1);
  } finally {
    await client.end();
    console.log('🔌 Database connection closed');
  }
}

// Main execution
async function main() {
  console.log('🚀 Direct Database Reset Script');
  console.log('================================\n');
  
  // Try the direct method first, then fallback to individual statements
  await applyDatabaseResetDirect();
}

// Run the script
main().catch(console.error); 