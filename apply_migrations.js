const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Database connection string
const connectionString = 'postgres://postgres.mcrprryvezyngslphjwx:M1247N3117k%23@aws-0-ca-central-1.pooler.supabase.com:5432/postgres';

// Path to migrations directory
const migrationsDir = path.join(__dirname, 'project', 'supabase', 'migrations');

async function applyMigrations() {
  const client = new Client({ connectionString });
  
  try {
    console.log('🔌 Connecting to Supabase database...');
    await client.connect();
    console.log('✅ Connected successfully!');
    
    // Get all migration files and sort them by timestamp
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort(); // This will sort them chronologically by filename
    
    console.log(`📁 Found ${migrationFiles.length} migration files`);
    
    // Apply each migration
    for (const file of migrationFiles) {
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf8');
      
      console.log(`\n🔄 Applying migration: ${file}`);
      
      try {
        await client.query(sql);
        console.log(`✅ Successfully applied: ${file}`);
      } catch (error) {
        console.error(`❌ Error applying ${file}:`, error.message);
        // Continue with other migrations even if one fails
      }
    }
    
    console.log('\n🎉 All migrations completed!');
    
  } catch (error) {
    console.error('❌ Database connection error:', error.message);
  } finally {
    await client.end();
    console.log('🔌 Database connection closed');
  }
}

// Run the migration
applyMigrations().catch(console.error); 