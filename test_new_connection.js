import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

console.log('🔗 Testing Supabase connection...');
console.log('📍 URL:', supabaseUrl);
console.log('🔑 Key:', supabaseKey.substring(0, 20) + '...');

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  try {
    // Test basic connection
    console.log('\n🧪 Testing basic connection...');
    const { data, error } = await supabase.from('user_profiles').select('count').limit(1);
    
    if (error) {
      console.error('❌ Connection failed:', error.message);
      return false;
    }
    
    console.log('✅ Basic connection successful!');
    
    // Test auth
    console.log('\n🔐 Testing auth service...');
    const { data: authData, error: authError } = await supabase.auth.getSession();
    
    if (authError) {
      console.error('❌ Auth test failed:', authError.message);
      return false;
    }
    
    console.log('✅ Auth service accessible!');
    
    // Test database schema
    console.log('\n📊 Testing database schema...');
    const { data: tables, error: schemaError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .limit(5);
    
    if (schemaError) {
      console.log('⚠️  Schema test failed (this might be normal):', schemaError.message);
    } else {
      console.log('✅ Database schema accessible!');
      console.log('📋 Found tables:', tables?.map(t => t.table_name).join(', '));
    }
    
    return true;
    
  } catch (err) {
    console.error('❌ Unexpected error:', err.message);
    return false;
  }
}

testConnection().then(success => {
  if (success) {
    console.log('\n🎉 Supabase connection test completed successfully!');
    console.log('✅ Your application should now be able to connect to Supabase.');
  } else {
    console.log('\n❌ Connection test failed. Please check your credentials and try again.');
  }
  process.exit(success ? 0 : 1);
});