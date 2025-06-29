// Script to apply the user creation trigger migration to Supabase
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://mcrprryvezyngslphjwx.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // You'll need to set this

if (!supabaseServiceKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY environment variable is required');
  console.log('Please get your service role key from Supabase Dashboard > Settings > API');
  process.exit(1);
}

// Create Supabase client with service role key
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigration() {
  try {
    console.log('🔄 Reading migration file...');
    
    const migrationPath = path.join(process.cwd(), 'manual_trigger_fix.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('🔄 Applying migration to Supabase...');
    
    // Execute the SQL directly using pg connection
    const { Pool } = await import('pg');
    const connectionString = `postgresql://postgres.mcrprryvezyngslphjwx:${process.env.SUPABASE_DB_PASSWORD || 'your-db-password'}@aws-0-us-west-1.pooler.supabase.com:6543/postgres`;
    
    const pool = new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false }
    });
    
    const client = await pool.connect();
    
    try {
      await client.query(migrationSQL);
      console.log('✅ Migration applied successfully!');
      console.log('✅ User creation trigger is now active');
    } finally {
      client.release();
      await pool.end();
    }
    
  } catch (error) {
    console.error('❌ Error applying migration:', error.message);
    
    // Fallback: Try to apply the trigger manually using individual queries
    console.log('🔄 Trying alternative approach...');
    
    try {
      // Drop existing trigger and function
      await supabase.rpc('exec', { sql: 'DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;' });
      await supabase.rpc('exec', { sql: 'DROP FUNCTION IF EXISTS handle_new_user();' });
      
      console.log('✅ Cleaned up existing trigger and function');
      console.log('⚠️  Please apply the new trigger manually in Supabase Dashboard > SQL Editor');
      
    } catch (fallbackError) {
      console.error('❌ Fallback also failed:', fallbackError.message);
      console.log('📋 Please apply this SQL manually in Supabase Dashboard:');
      console.log('\n' + fs.readFileSync(path.join(process.cwd(), 'supabase', 'migrations', '20250129000002_update_user_creation_trigger.sql'), 'utf8'));
    }
  }
}

applyMigration();