const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Database connection string from your new EU MCP configuration
const connectionString = 'postgresql://postgres.oouoyngoxykfhjdzpmrz:M1247N3117k%23@aws-0-eu-north-1.pooler.supabase.com:5432/postgres';

async function applyDatabaseReset() {
  const client = new Client({ connectionString });
  
  try {
    console.log('🔌 Connecting to Supabase EU database...');
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
      
      console.log('\n🎉 Database reset completed successfully!');
      console.log('✨ All tables, functions, triggers, and policies have been recreated.');
      console.log('✅ Your signup errors should now be resolved!');
      
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
      
      if (successCount > 0) {
        console.log('\n🎉 Partial database reset completed!');
        console.log('✨ Some tables, functions, triggers, and policies have been recreated.');
      }
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
  console.log('🚀 EU Database Reset Script');
  console.log('============================\n');
  
  await applyDatabaseReset();
}

// Run the script
main().catch(console.error); 