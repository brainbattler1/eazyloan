const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Direct PostgreSQL connection string
const connectionString = 'postgresql://postgres:M1247N3117k#@db.cohkmipkklczqbnnnzrk.supabase.co:5432/postgres';

// Create PostgreSQL client
const client = new Client({
  connectionString: connectionString,
  ssl: {
    rejectUnauthorized: false
  }
});

async function applyFunctionsDirect() {
  try {
    console.log('🔄 Connecting to PostgreSQL database directly...');
    
    // Connect to the database
    await client.connect();
    console.log('✅ Connected to PostgreSQL database');
    
    // Read the SQL file with the missing functions
    const sqlFile = path.join(__dirname, 'manual_trigger_fix.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');
    
    console.log('📄 SQL content loaded, executing...');
    console.log('---');
    console.log(sql);
    console.log('---');
    
    // Execute the SQL
    const result = await client.query(sql);
    console.log('✅ Functions applied successfully!');
    console.log('📊 Result:', result);
    
  } catch (error) {
    console.error('❌ Error applying functions:', error);
    
    // If there's an error, show the SQL that needs to be executed manually
    console.log('\n📝 If the above failed, please manually execute this SQL in Supabase SQL Editor:');
    console.log('---');
    const sqlFile = path.join(__dirname, 'manual_trigger_fix.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');
    console.log(sql);
    console.log('---');
    
  } finally {
    // Close the connection
    await client.end();
    console.log('🔌 Database connection closed');
  }
}

// Run the function
applyFunctionsDirect(); 