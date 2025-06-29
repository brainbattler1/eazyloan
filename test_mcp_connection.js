import { createClient } from '@supabase/supabase-js';

// Test both tokens to see which one works
const supabaseUrl = 'https://cohkmipkklczqbnnnzrk.supabase.co';
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvaGttaXBra2xjenFibm5uenJrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTExMzk2NDgsImV4cCI6MjA2NjcxNTY0OH0.u4Q1dKQzVbbrfbxEB86V1CIA95C6ixDJ9Tqdf8yS064';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvaGttaXBra2xjenFibm5uenJrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTEzOTY0OCwiZXhwIjoyMDY2NzE1NjQ4fQ.tfkj8Lzl0pt5zS0cON-8Q0yEzqv2gDOptj2bu6ozMmw';

async function testConnection() {
  console.log('Testing Supabase connection...');
  
  // Test with anon key
  console.log('\n1. Testing with anon key:');
  try {
    const supabaseAnon = createClient(supabaseUrl, anonKey);
    const { data: users, error } = await supabaseAnon.auth.admin.listUsers();
    if (error) {
      console.log('Anon key error:', error.message);
    } else {
      console.log('Anon key success - found users:', users?.users?.length || 0);
    }
  } catch (err) {
    console.log('Anon key exception:', err.message);
  }
  
  // Test with service role key
  console.log('\n2. Testing with service role key:');
  try {
    const supabaseService = createClient(supabaseUrl, serviceRoleKey);
    const { data: users, error } = await supabaseService.auth.admin.listUsers();
    if (error) {
      console.log('Service role error:', error.message);
    } else {
      console.log('Service role success - found users:', users?.users?.length || 0);
    }
  } catch (err) {
    console.log('Service role exception:', err.message);
  }
  
  // Test basic database connection
  console.log('\n3. Testing database connection:');
  try {
    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const { data, error } = await supabase.from('user_profiles').select('count', { count: 'exact', head: true });
    if (error) {
      console.log('Database error:', error.message);
    } else {
      console.log('Database connection successful');
    }
  } catch (err) {
    console.log('Database exception:', err.message);
  }
}

testConnection().catch(console.error);