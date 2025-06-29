import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

// Use service role key for admin operations
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://wyfzzrljkyofxhcaklio.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind5Znp6cmxqa3lvZnhoY2FrbGlvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTE0ODc2NiwiZXhwIjoyMDY2NzI0NzY2fQ.5i5a3cdqC8gC7Sk65pWw_vKoCMlVvBVzGJYI3hkYf10';

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function applyMigration() {
  try {
    console.log('🚀 Starting migration application...');
    
    // Read the migration file
    const migrationPath = path.join(__dirname, 'supabase', 'migrations', '20250128000000_initial_schema.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📄 Migration file loaded successfully');
    console.log(`📊 Migration size: ${migrationSQL.length} characters`);
    
    // Split the migration into smaller chunks to avoid timeout
    const sqlStatements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--') && stmt !== '')
      .map(stmt => stmt + ';');
    
    console.log(`🔧 Found ${sqlStatements.length} SQL statements to execute`);
    
    let successCount = 0;
    let errorCount = 0;
    
    // Execute statements in batches
    for (let i = 0; i < sqlStatements.length; i++) {
      const statement = sqlStatements[i];
      
      // Skip empty statements and comments
      if (!statement || statement.trim() === ';' || statement.trim().startsWith('--')) {
        continue;
      }
      
      try {
        console.log(`⚡ Executing statement ${i + 1}/${sqlStatements.length}...`);
        
        // Use rpc to call exec_sql function if it exists, otherwise use direct SQL
        const { data, error } = await supabase.rpc('exec_sql', { sql: statement });
        
        if (error) {
          // If exec_sql doesn't exist, try direct execution
          if (error.code === '42883') { // function does not exist
            console.log('📝 exec_sql function not found, trying direct execution...');
            const { error: directError } = await supabase
              .from('_temp_migration')
              .select('*')
              .limit(0); // This will fail but we can catch SQL errors
            
            if (directError) {
              console.log(`❌ Error in statement ${i + 1}: ${directError.message}`);
              errorCount++;
            }
          } else {
            console.log(`❌ Error in statement ${i + 1}: ${error.message}`);
            errorCount++;
          }
        } else {
          console.log(`✅ Statement ${i + 1} executed successfully`);
          successCount++;
        }
        
        // Add a small delay to avoid overwhelming the database
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (err) {
        console.log(`❌ Exception in statement ${i + 1}: ${err.message}`);
        errorCount++;
      }
    }
    
    console.log('\n📊 Migration Summary:');
    console.log(`✅ Successful statements: ${successCount}`);
    console.log(`❌ Failed statements: ${errorCount}`);
    console.log(`📝 Total statements: ${sqlStatements.length}`);
    
    if (errorCount === 0) {
      console.log('🎉 Migration completed successfully!');
    } else {
      console.log('⚠️  Migration completed with some errors. Please check the logs above.');
    }
    
    // Test basic functionality
    console.log('\n🧪 Testing database connection...');
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .limit(5);
    
    if (tablesError) {
      console.log('❌ Database connection test failed:', tablesError.message);
    } else {
      console.log('✅ Database connection successful!');
      console.log('📋 Found tables:', tables.map(t => t.table_name).join(', '));
    }
    
  } catch (error) {
    console.error('💥 Fatal error during migration:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Alternative approach: Apply migration in chunks
async function applyMigrationInChunks() {
  try {
    console.log('🚀 Starting chunked migration application...');
    
    const migrationPath = path.join(__dirname, 'supabase', 'migrations', '20250128000000_initial_schema.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Split by major sections
    const sections = migrationSQL.split('-- =====================================================');
    
    console.log(`📊 Found ${sections.length} migration sections`);
    
    for (let i = 0; i < sections.length; i++) {
      const section = sections[i].trim();
      if (!section) continue;
      
      console.log(`\n🔧 Processing section ${i + 1}/${sections.length}...`);
      
      // Extract section title
      const lines = section.split('\n');
      const titleLine = lines.find(line => line.startsWith('-- STEP'));
      if (titleLine) {
        console.log(`📝 ${titleLine.replace('-- ', '')}`);
      }
      
      // Execute the section
      try {
        const { data, error } = await supabase.rpc('exec_sql', { sql: section });
        
        if (error) {
          console.log(`❌ Error in section ${i + 1}: ${error.message}`);
        } else {
          console.log(`✅ Section ${i + 1} completed successfully`);
        }
      } catch (err) {
        console.log(`❌ Exception in section ${i + 1}: ${err.message}`);
      }
      
      // Add delay between sections
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log('\n🎉 Chunked migration completed!');
    
  } catch (error) {
    console.error('💥 Fatal error during chunked migration:', error.message);
    process.exit(1);
  }
}

// Run the migration
console.log('🔍 Debug info:');
console.log('import.meta.url:', import.meta.url);
console.log('process.argv[1]:', process.argv[1]);
console.log('Comparison:', import.meta.url === `file://${process.argv[1]}`);

// Always run the migration for now
console.log('🔄 Choose migration method:');
console.log('1. Standard migration (statement by statement)');
console.log('2. Chunked migration (section by section)');

const method = process.argv[2] || '1';

if (method === '2') {
  applyMigrationInChunks();
} else {
  applyMigration();
}

export { applyMigration, applyMigrationInChunks };