const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Database connection string from your EU MCP configuration
const connectionString = 'postgresql://postgres.oouoyngoxykfhjdzpmrz:M1247N3117k%23@aws-0-eu-north-1.pooler.supabase.com:5432/postgres';

async function checkAndApplyMigrations() {
  const client = new Client({ connectionString });
  
  try {
    console.log('🔌 Connecting to Supabase EU database...');
    await client.connect();
    console.log('✅ Connected successfully!');
    
    // First, check if migrations table exists
    console.log('\n📋 Checking if migrations table exists...');
    const tableExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'schema_migrations'
      );
    `);
    
    if (!tableExists.rows[0].exists) {
      console.log('📝 Creating migrations table...');
      await client.query(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
          version VARCHAR(255) PRIMARY KEY,
          applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `);
      console.log('✅ Migrations table created');
    } else {
      console.log('✅ Migrations table already exists');
    }
    
    // Get existing migrations from database
    console.log('\n📊 Checking existing migrations in database...');
    const existingMigrations = await client.query(`
      SELECT version FROM schema_migrations ORDER BY version;
    `);
    
    const appliedVersions = existingMigrations.rows.map(row => row.version);
    console.log('✅ Applied migrations:', appliedVersions);
    
    // Get migration files from disk
    console.log('\n📁 Scanning migration files...');
    const migrationsDir = path.join(__dirname, '..', 'supabase', 'migrations');
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();
    
    console.log('📄 Found migration files:', migrationFiles);
    
    // Find missing migrations
    const missingMigrations = migrationFiles.filter(file => {
      const version = file.replace('.sql', '');
      return !appliedVersions.includes(version);
    });
    
    console.log('\n🔍 Missing migrations:', missingMigrations);
    
    if (missingMigrations.length === 0) {
      console.log('\n🎉 All migrations are already applied!');
      return;
    }
    
    // Apply missing migrations
    console.log(`\n🚀 Applying ${missingMigrations.length} missing migrations...`);
    
    for (const migrationFile of missingMigrations) {
      const version = migrationFile.replace('.sql', '');
      const filePath = path.join(migrationsDir, migrationFile);
      
      console.log(`\n📝 Applying migration: ${migrationFile}`);
      
      try {
        const sqlContent = fs.readFileSync(filePath, 'utf8');
        
        // Start transaction
        await client.query('BEGIN');
        
        // Apply the migration
        await client.query(sqlContent);
        
        // Record the migration
        await client.query(`
          INSERT INTO schema_migrations (version) VALUES ($1)
        `, [version]);
        
        // Commit transaction
        await client.query('COMMIT');
        
        console.log(`✅ Successfully applied: ${migrationFile}`);
        
      } catch (error) {
        // Rollback transaction
        await client.query('ROLLBACK');
        console.error(`❌ Failed to apply ${migrationFile}:`, error.message);
        
        // Continue with other migrations
        continue;
      }
    }
    
    // Final check
    console.log('\n📊 Final migration status:');
    const finalMigrations = await client.query(`
      SELECT version, applied_at FROM schema_migrations ORDER BY version;
    `);
    
    console.log('✅ All applied migrations:');
    finalMigrations.rows.forEach(row => {
      console.log(`   - ${row.version} (applied: ${row.applied_at})`);
    });
    
    console.log('\n🎉 Migration check and apply completed!');
    
  } catch (error) {
    console.error('💥 Error:', error.message);
    process.exit(1);
  } finally {
    await client.end();
    console.log('🔌 Database connection closed');
  }
}

// Main execution
async function main() {
  console.log('🚀 Migration Check and Apply Script');
  console.log('===================================\n');
  
  await checkAndApplyMigrations();
}

// Run the script
main().catch(console.error); 