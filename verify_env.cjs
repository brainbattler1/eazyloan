// Simple environment verification script
const fs = require('fs');
const path = require('path');

// Read .env file
const envPath = path.join(__dirname, '.env');
const envContent = fs.readFileSync(envPath, 'utf8');

console.log('=== Environment Variables Check ===');
console.log('✅ .env file found');

// Parse environment variables
const envVars = {};
envContent.split('\n').forEach(line => {
  const [key, value] = line.split('=');
  if (key && value) {
    envVars[key.trim()] = value.trim();
  }
});

// Check required variables
const requiredVars = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY', 'SUPABASE_DB_URL'];
let allPresent = true;

requiredVars.forEach(varName => {
  if (envVars[varName]) {
    console.log(`✅ ${varName}: ${varName === 'VITE_SUPABASE_ANON_KEY' ? '[HIDDEN]' : envVars[varName]}`);
  } else {
    console.log(`❌ ${varName}: Missing`);
    allPresent = false;
  }
});

// Validate URL format
if (envVars.VITE_SUPABASE_URL) {
  const url = envVars.VITE_SUPABASE_URL;
  if (url.startsWith('https://') && url.includes('.supabase.co')) {
    console.log('✅ Supabase URL format is valid');
    
    // Extract project reference
    const projectRef = url.replace('https://', '').replace('.supabase.co', '');
    console.log(`📋 Project Reference: ${projectRef}`);
  } else {
    console.log('❌ Supabase URL format is invalid');
    allPresent = false;
  }
}

// Check supabase config
const configPath = path.join(__dirname, 'supabase', 'config.toml');
if (fs.existsSync(configPath)) {
  console.log('✅ Supabase config.toml found');
  const configContent = fs.readFileSync(configPath, 'utf8');
  const projectIdMatch = configContent.match(/project_id = "([^"]+)"/);
  if (projectIdMatch) {
    console.log(`📋 Local Project ID: ${projectIdMatch[1]}`);
  }
} else {
  console.log('❌ Supabase config.toml not found');
}

// Check migrations
const migrationsPath = path.join(__dirname, 'supabase', 'migrations');
if (fs.existsSync(migrationsPath)) {
  const migrations = fs.readdirSync(migrationsPath).filter(f => f.endsWith('.sql'));
  console.log(`✅ Found ${migrations.length} migration files:`);
  migrations.forEach(migration => {
    console.log(`   - ${migration}`);
  });
} else {
  console.log('❌ Migrations directory not found');
}

console.log('\n=== Summary ===');
if (allPresent) {
  console.log('✅ All environment variables are properly configured');
  console.log('✅ Project appears to be correctly linked to Supabase');
  console.log('\n🔧 If you\'re still experiencing connection issues:');
  console.log('   1. Check your internet connection');
  console.log('   2. Verify the Supabase project is active in the dashboard');
  console.log('   3. Try restarting the development server');
} else {
  console.log('❌ Some configuration issues found - please fix the missing variables');
}