const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Supabase configuration
const supabaseUrl = 'https://cohkmipkklczqbnnnzrk.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvaGttaXBra2xjenFibm5uenJrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTEzOTY0OCwiZXhwIjoyMDY2NzE1NjQ4fQ.tfkj8Lzl0pt5zS0cON-8Q0yEzqv2gDOptj2bu6ozMmw';

// Create Supabase client with service role key
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMissingFunctions() {
  try {
    console.log('🔄 Applying missing functions to Supabase database...');
    
    // Read the SQL file
    const sqlFile = path.join(__dirname, 'missing_functions.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');
    
    console.log('📄 SQL content loaded, executing...');
    
    // Execute the SQL using rpc
    const { error } = await supabase.rpc('exec_sql', { sql_query: sql });
    
    if (error) {
      console.error('❌ Error applying functions:', error);
      
      // Try alternative approach - execute SQL directly
      console.log('🔄 Trying alternative approach...');
      const { error: directError } = await supabase.from('_exec_sql').select('*').eq('sql', sql);
      
      if (directError) {
        console.error('❌ Direct SQL execution also failed:', directError);
        console.log('📝 Please manually execute the SQL in Supabase SQL Editor:');
        console.log('---');
        console.log(sql);
        console.log('---');
        return;
      }
    }
    
    console.log('✅ Missing functions applied successfully!');
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    console.log('📝 Please manually execute the following SQL in Supabase SQL Editor:');
    
    const sqlFile = path.join(__dirname, 'missing_functions.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');
    console.log('---');
    console.log(sql);
    console.log('---');
  }
}

// Run the function
applyMissingFunctions(); 