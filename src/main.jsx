import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import React from 'react'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './contexts/AuthContext'

// Add error boundary and better error handling
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('React Error Boundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '2rem',
          textAlign: 'center',
          fontFamily: 'system-ui, sans-serif'
        }}>
          <h1 style={{ color: '#ef4444' }}>Something went wrong</h1>
          <p>The application encountered an error and couldn't load properly.</p>
          <details style={{ marginTop: '1rem', textAlign: 'left' }}>
            <summary>Error Details</summary>
            <pre style={{ 
              background: '#f3f4f6', 
              padding: '1rem', 
              borderRadius: '0.5rem',
              overflow: 'auto',
              fontSize: '0.875rem'
            }}>
              {this.state.error?.toString()}
            </pre>
          </details>
          <button 
            onClick={() => window.location.reload()}
            style={{
              marginTop: '1rem',
              padding: '0.5rem 1rem',
              background: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '0.25rem',
              cursor: 'pointer'
            }}
          >
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Enhanced error handling for the root
try {
  const rootElement = document.getElementById('root');
  
  if (!rootElement) {
    throw new Error('Root element not found. Make sure there is a div with id="root" in your HTML.');
  }

  const root = createRoot(rootElement);
  
  root.render(
    <StrictMode>
      <ErrorBoundary>
        <AuthProvider>
          <App />
        </AuthProvider>
      </ErrorBoundary>
    </StrictMode>
  );

  console.log('✅ React app initialized successfully');

} catch (error) {
  console.error('❌ Failed to initialize React app:', error);
  
  // Fallback error display
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
      <h1 style="color: #ef4444; margin-bottom: 1rem;">Application Failed to Load</h1>
      <p style="margin-bottom: 1rem;">There was an error initializing the React application.</p>
      <details style="text-align: left; margin: 1rem 0;">
        <summary style="cursor: pointer; font-weight: bold;">Error Details</summary>
        <pre style="
          background: white; 
          padding: 1rem; 
          border-radius: 0.25rem; 
          overflow: auto;
          font-size: 0.875rem;
          margin-top: 0.5rem;
        ">${error.toString()}</pre>
      </details>
      <button onclick="window.location.reload()" style="
        padding: 0.5rem 1rem;
        background: #3b82f6;
        color: white;
        border: none;
        border-radius: 0.25rem;
        cursor: pointer;
        font-size: 1rem;
      ">
        Reload Page
      </button>
    </div>
  `;
}