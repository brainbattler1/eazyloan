import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

console.log('🔄 Initializing Supabase client...');
console.log('URL:', supabaseUrl ? '✅ Set' : '❌ Missing');
console.log('Key:', supabaseAnonKey ? '✅ Set' : '❌ Missing');

if (!supabaseUrl || !supabaseAnonKey) {
  const errorMessage = 'Missing Supabase environment variables. Please check your .env file.';
  console.error('❌', errorMessage);
  
  // Show user-friendly error
  if (typeof window !== 'undefined') {
    document.body.innerHTML = `
      <div style="
        padding: 2rem; 
        text-align: center; 
        font-family: system-ui, sans-serif;
        max-width: 600px;
        margin: 2rem auto;
        border: 2px solid #ef4444;
        border-radius: 0.5rem;
        background: #fef2f2;
      ">
        <h1 style="color: #ef4444; margin-bottom: 1rem;">Configuration Error</h1>
        <p style="margin-bottom: 1rem;">The application is missing required Supabase configuration.</p>
        <p style="margin-bottom: 1rem;">Please ensure your <code>.env</code> file contains:</p>
        <pre style="
          background: white; 
          padding: 1rem; 
          border-radius: 0.25rem; 
          text-align: left;
          font-size: 0.875rem;
          border: 1px solid #d1d5db;
        ">VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key</pre>
        <button onclick="window.location.reload()" style="
          padding: 0.5rem 1rem;
          background: #3b82f6;
          color: white;
          border: none;
          border-radius: 0.25rem;
          cursor: pointer;
          font-size: 1rem;
          margin-top: 1rem;
        ">
          Reload After Fixing
        </button>
      </div>
    `;
  }
  
  throw new Error(errorMessage);
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
});

// Test connection on initialization with better error handling
supabase.from('loan_applications').select('count').limit(1)
  .then(({ error }) => {
    if (error) {
      console.warn('⚠️ Supabase connection test failed:', error.message);
      // Don't throw error here, just log it
    } else {
      console.log('✅ Supabase client initialized successfully');
    }
  })
  .catch((error) => {
    console.warn('⚠️ Supabase connection test error:', error.message);
    // Don't throw error here, just log it
  });