import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react({
      // Enable Fast Refresh for better development experience
      fastRefresh: true,
      // Optimize JSX runtime
      jsxRuntime: 'automatic'
    })
  ],
  optimizeDeps: {
    include: [
      '@supabase/supabase-js',
      'react',
      'react-dom',
      'react-router-dom'
    ],
    // Force pre-bundling of these dependencies
    force: true
  },
  build: {
    // Enable code splitting for better performance
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          supabase: ['@supabase/supabase-js'],
          router: ['react-router-dom']
        }
      }
    },
    // Optimize chunk size
    chunkSizeWarningLimit: 1000,
    // Enable source maps for better debugging
    sourcemap: true
  },
  server: {
    host: true,
    port: 5173,
    strictPort: true,
    hmr: {
      port: 5173,
      // Optimize HMR performance
      overlay: true
    },
    cors: true,
    watch: {
      ignored: [
        '**/node_modules/**', 
        '**/.git/**',
        '**/dist/**',
        '**/coverage/**'
      ],
      // Use polling for better file watching on Windows
      usePolling: process.platform === 'win32'
    },
    // Enable caching for faster rebuilds
    fs: {
      cachedChecks: false
    }
  },
  // Enable esbuild for faster builds
  esbuild: {
    target: 'es2020',
    logOverride: { 'this-is-undefined-in-esm': 'silent' }
  },
  // Resolve configuration for better module resolution
  resolve: {
    alias: {
      '@': '/src'
    }
  }
})