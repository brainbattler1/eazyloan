const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Database connection string from your EU MCP configuration
const connectionString = 'postgresql://postgres.oouoyngoxykfhjdzpmrz:M1247N3117k%23@aws-0-eu-north-1.pooler.supabase.com:5432/postgres';

async function setupNewDatabase() {
  const client = new Client({ connectionString });
  
  try {
    console.log('🔌 Connecting to new Supabase EU database...');
    await client.connect();
    console.log('✅ Connected successfully!');
    
    // Read the simple auth setup file
    const sqlFilePath = path.join(__dirname, 'simple_auth_reset.sql');
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
    
    console.log('📄 SQL file loaded successfully');
    console.log('📊 File size:', (sqlContent.length / 1024).toFixed(2), 'KB');
    
    // Execute the entire SQL file
    console.log('🚀 Setting up new database...');
    
    try {
      await client.query(sqlContent);
      console.log('✅ Database setup completed successfully!');
      
      // Test the connection and basic functionality
      console.log('\n🧪 Testing basic functionality...');
      
      try {
        const testResult = await client.query('SELECT test_db_connection()');
        console.log('✅ Database connection test:', testResult.rows[0].test_db_connection);
      } catch (error) {
        console.log('⚠️  Database connection test failed:', error.message);
      }
      
      console.log('\n🎉 New database setup completed successfully!');
      console.log('✨ Core tables, functions, triggers, and policies have been created.');
      console.log('✅ User signup should now work properly!');
      
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
        console.log('\n🎉 Partial database setup completed!');
        console.log('✨ Some tables, functions, triggers, and policies have been created.');
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
  console.log('🚀 New Database Setup Script');
  console.log('============================\n');
  
  await setupNewDatabase();
}

// Run the script
main().catch(console.error); 