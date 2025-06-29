import { createClient } from '@supabase/supabase-js';

// Use environment variables or fallback to development values
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key';

console.log('🔄 Initializing Supabase client...');
console.log('URL:', supabaseUrl !== 'https://your-project.supabase.co' ? '✅ Set' : '⚠️ Using fallback');
console.log('Key:', supabaseAnonKey !== 'your-anon-key' ? '✅ Set' : '⚠️ Using fallback');

// Check if we're using fallback values
const isUsingFallback = supabaseUrl === 'https://your-project.supabase.co' || supabaseAnonKey === 'your-anon-key';

if (isUsingFallback) {
  console.warn('⚠️ Using fallback Supabase configuration. For full functionality, please set up your .env file.');
  
  // Show user-friendly warning instead of error
  if (typeof window !== 'undefined') {
    const existingWarning = document.getElementById('supabase-warning');
    if (!existingWarning) {
      const warningDiv = document.createElement('div');
      warningDiv.id = 'supabase-warning';
      warningDiv.style.cssText = `
        position: fixed;
        top: 20px;
        left: 20px;
        right: 20px;
        z-index: 1000;
        padding: 1rem;
        background: #fef3c7;
        border: 1px solid #f59e0b;
        border-radius: 8px;
        font-family: system-ui, sans-serif;
        font-size: 0.875rem;
        color: #92400e;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      `;
      warningDiv.innerHTML = `
        <strong>⚠️ Development Mode:</strong> Using fallback Supabase configuration. 
        Some features may not work. To enable full functionality, create a <code>.env</code> file with your Supabase credentials.
        <button onclick="this.parentElement.remove()" style="
          float: right;
          background: #f59e0b;
          color: white;
          border: none;
          border-radius: 4px;
          padding: 0.25rem 0.5rem;
          cursor: pointer;
          font-size: 0.75rem;
        ">×</button>
      `;
      document.body.appendChild(warningDiv);
    }
  }
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