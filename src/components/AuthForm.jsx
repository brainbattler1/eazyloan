import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../utils/supabase';
import '../App.css';

const AuthForm = () => {
  const [mode, setMode] = useState('signin'); // 'signin' or 'signup'
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const { signIn, signUp } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');

  const handlePasswordReset = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(resetEmail)) {
        setError('Please enter a valid email address.');
        setLoading(false);
        return;
      }

      // Check if user exists in the database
      const { data: userExists, error: checkError } = await supabase
        .rpc('check_user_exists_by_email', { user_email: resetEmail });

      if (checkError) {
        console.error('Error checking user existence:', checkError);
        setError('Error checking email. Please try again.');
        setLoading(false);
        return;
      }

      if (!userExists) {
        setError('No account found with this email address.');
        setLoading(false);
        return;
      }

      // Send password reset email only if user exists
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        throw error;
      }

      setSuccess('Password reset email sent! Please check your inbox.');
      setResetEmail('');
    } catch (error) {
      console.error('Password reset error:', error);
      setError(error.message || 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError('');
    setSuccess('');
  };

  const validate = () => {
    if (!form.email || !form.password) return 'Please fill in all required fields.';
    if (mode === 'signup') {
      if (!form.firstName || !form.lastName || !form.username || !form.confirmPassword)
        return 'Please fill in all required fields.';
      if (form.password !== form.confirmPassword)
        return 'Passwords do not match.';
      if (form.password.length < 6)
        return 'Password must be at least 6 characters.';
      if (form.username.length < 3)
        return 'Username must be at least 3 characters.';
    }
    return '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    const err = validate();
    if (err) {
      setError(err);
      setLoading(false);
      return;
    }
    try {
      if (mode === 'signup') {
        console.log('🔄 Starting sign-up process...');
        console.log('📧 Email:', form.email);
        console.log('🔑 Password length:', form.password.length);
        
        const { data, error } = await signUp(form.email, form.password);
        
        console.log('📊 Sign-up response:', { data, error });
        
        if (error) {
          console.error('❌ Sign-up error:', error);
          setError(error.message || 'Failed to create account. Please try again.');
        } else if (data.user) {
          console.log('✅ User created successfully, creating profile...');
          try {
            await createUserProfile(data.user.id);
            setError('');
            setSuccess('Account created successfully! Please check your email to verify your account.');
            setForm({ firstName: '', lastName: '', username: '', email: '', password: '', confirmPassword: '' });
          } catch (profileError) {
            console.error('❌ Profile creation failed:', profileError);
            setError('Account created but profile setup failed. Please contact support.');
          }
        } else {
          console.warn('⚠️ No user data returned from sign-up');
          setError('Account creation failed. Please try again.');
        }
      } else {
        console.log('🔄 Starting sign-in process...');
        const { error } = await signIn(form.email, form.password);
        if (error) {
          console.error('❌ Sign-in error:', error);
          setError(error.message || 'Failed to sign in. Please try again.');
        } else {
          console.log('✅ Sign-in successful');
          setSuccess('Signed in successfully!');
          setForm({ firstName: '', lastName: '', username: '', email: '', password: '', confirmPassword: '' });
        }
      }
    } catch (err) {
      console.error('❌ Unexpected error:', err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const createUserProfile = async (userId) => {
    try {
      console.log('🔄 Creating user profile for:', userId);
      
      // First, check if the user already has a profile
      console.log('🔍 Checking for existing profile...');
      const { data: existingProfile, error: checkError } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('user_id', userId)
        .single();
      
      if (checkError && checkError.code !== 'PGRST116') {
        console.error('❌ Profile check error:', checkError);
      }
      
      // If profile already exists, don't try to create a new one
      if (existingProfile) {
        console.log('✅ User profile already exists, skipping creation');
        return;
      }
      
      console.log('🔄 Creating new profile with data:', {
        profile_user_id: userId,
        profile_first_name: form.firstName.trim(),
        profile_last_name: form.lastName.trim().split(' ').slice(-1).join(''),
        profile_username: form.username.trim().toLowerCase()
      });
      
      // Create profile using RPC function to bypass RLS
      const { error } = await supabase
        .rpc('create_user_profile', {
          profile_user_id: userId,
          profile_first_name: form.firstName.trim(),
          profile_last_name: form.lastName.trim().split(' ').slice(-1).join(''),
          profile_username: form.username.trim().toLowerCase()
        });

      if (error) {
        console.error('❌ Profile creation error:', error);
        throw error;
      }

      console.log('✅ User profile created successfully');
      
      // Handle referral code if present
      const referralCode = localStorage.getItem('referralCode');
      if (referralCode) {
        console.log('🎁 Processing referral code:', referralCode);
        try {
          const { error: referralError } = await supabase
            .rpc('process_referral_signup', {
              referred_user_id: userId,
              referral_code_param: referralCode
            });
          
          if (referralError) {
            console.error('❌ Referral processing error:', referralError);
            // Don't throw error here as profile creation was successful
          } else {
            console.log('✅ Referral processed successfully');
          }
          
          // Clear referral code from localStorage
          localStorage.removeItem('referralCode');
        } catch (referralError) {
          console.error('❌ Failed to process referral:', referralError);
          // Don't throw error here as profile creation was successful
        }
      }
    } catch (error) {
      console.error('❌ Failed to create user profile:', error);
      throw error;
    }
  };

  return (
    <div className="auth-container">
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(5deg); }
        }
        
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
        
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        
        .auth-container {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%);
          background-size: 400% 400%;
          animation: gradientShift 15s ease infinite;
          position: relative;
          overflow: hidden;
        }
        
        @keyframes gradientShift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        
        .auth-container::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="grain" width="100" height="100" patternUnits="userSpaceOnUse"><circle cx="50" cy="50" r="1" fill="%23ffffff" opacity="0.1"/></pattern></defs><rect width="100" height="100" fill="url(%23grain)"/></svg>') repeat;
          pointer-events: none;
        }
        
        .floating-shapes {
          position: absolute;
          width: 100%;
          height: 100%;
          overflow: hidden;
          pointer-events: none;
        }
        
        .floating-shape {
          position: absolute;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 50%;
          animation: float 6s ease-in-out infinite;
        }
        
        .floating-shape:nth-child(1) {
          width: 80px;
          height: 80px;
          top: 20%;
          left: 10%;
          animation-delay: 0s;
        }
        
        .floating-shape:nth-child(2) {
          width: 120px;
          height: 120px;
          top: 60%;
          right: 10%;
          animation-delay: 2s;
        }
        
        .floating-shape:nth-child(3) {
          width: 60px;
          height: 60px;
          bottom: 20%;
          left: 20%;
          animation-delay: 4s;
        }
        
        .auth-card {
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(20px);
          border-radius: 24px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(255, 255, 255, 0.2);
          max-width: 420px;
          width: 100%;
          padding: 3rem 2rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          animation: fadeInUp 0.8s ease-out;
          position: relative;
          overflow: hidden;
        }
        
        .auth-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 2px;
          background: linear-gradient(90deg, transparent, rgba(102, 126, 234, 0.6), transparent);
          animation: shimmer 2s infinite;
        }
        
        .logo-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          margin-bottom: 2rem;
          animation: slideIn 0.8s ease-out 0.2s both;
        }
        
        .logo-icon {
          margin-bottom: 12px;
          filter: drop-shadow(0 4px 20px rgba(37, 99, 235, 0.3));
          transition: transform 0.3s ease;
        }
        
        .logo-icon:hover {
          transform: scale(1.1) rotate(5deg);
        }
        
        .logo-text {
          font-weight: 800;
          font-size: 1.75rem;
          background: linear-gradient(135deg, #2563eb 0%, #7c3aed 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          letter-spacing: -0.02em;
          margin-bottom: 4px;
        }
        
        .mode-toggle {
          display: flex;
          width: 100%;
          margin-bottom: 2.5rem;
          background: rgba(37, 99, 235, 0.1);
          border-radius: 12px;
          padding: 4px;
          animation: slideIn 0.8s ease-out 0.4s both;
        }
        
        .mode-btn {
          flex: 1;
          padding: 12px 0;
          border: none;
          background: transparent;
          color: #2563eb;
          font-weight: 700;
          border-radius: 8px;
          cursor: pointer;
          font-size: 1.1rem;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          overflow: hidden;
        }
        
        .mode-btn.active {
          background: linear-gradient(135deg, #2563eb 0%, #3b82f6 100%);
          color: white;
          box-shadow: 0 4px 15px rgba(37, 99, 235, 0.3);
          transform: translateY(-1px);
        }
        
        .mode-btn:hover:not(.active) {
          background: rgba(37, 99, 235, 0.1);
          transform: translateY(-1px);
        }
        
        .auth-title {
          font-weight: 800;
          background: linear-gradient(135deg, #1e293b 0%, #475569 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          margin-bottom: 2rem;
          font-size: 1.75rem;
          letter-spacing: -0.02em;
          animation: slideIn 0.8s ease-out 0.6s both;
        }
        
        .auth-form {
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          animation: slideIn 0.8s ease-out 0.8s both;
        }
        
        .input-group {
          display: flex;
          flex-direction: column;
          position: relative;
        }
        
        .input-label {
          font-weight: 600;
          margin-bottom: 8px;
          color: #374151;
          font-size: 1rem;
          transition: color 0.3s ease;
        }
        
        .input-field {
          padding: 16px 20px;
          border-radius: 12px;
          border: 2px solid #e5e7eb;
          font-size: 1.1rem;
          outline: none;
          background: rgba(248, 250, 252, 0.8);
          backdrop-filter: blur(10px);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
        }
        
        .input-field:focus {
          border-color: #2563eb;
          background: rgba(255, 255, 255, 0.9);
          box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.1), 0 4px 20px rgba(37, 99, 235, 0.1);
          transform: translateY(-2px);
        }
        
        .input-field:hover:not(:focus) {
          border-color: #9ca3af;
          transform: translateY(-1px);
        }
        
        .input-eye-container {
          position: relative;
        }
        
        .input-eye-btn {
          position: absolute;
          right: 16px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          cursor: pointer;
          font-size: 1.3rem;
          color: #64748b;
          padding: 4px;
          border-radius: 6px;
          transition: all 0.3s ease;
        }
        
        .input-eye-btn:hover {
          background: rgba(37, 99, 235, 0.1);
          color: #2563eb;
          transform: translateY(-50%) scale(1.1);
        }
        
        .input-eye-btn:active {
          transform: translateY(-50%) scale(0.95);
        }
        
        .error-message {
          color: #ef4444;
          background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
          border: 1px solid #fecaca;
          border-radius: 12px;
          padding: 16px;
          font-weight: 600;
          font-size: 1rem;
          text-align: center;
          animation: slideIn 0.3s ease-out;
        }
        
        .success-message {
          color: #22c55e;
          background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
          border: 1px solid #bbf7d0;
          border-radius: 12px;
          padding: 16px;
          font-weight: 600;
          font-size: 1rem;
          text-align: center;
          animation: slideIn 0.3s ease-out;
        }
        
        .submit-btn {
          background: linear-gradient(135deg, #2563eb 0%, #3b82f6 100%);
          color: white;
          border: none;
          border-radius: 12px;
          padding: 16px 0;
          font-weight: 700;
          font-size: 1.1rem;
          margin-top: 8px;
          cursor: pointer;
          box-shadow: 0 4px 20px rgba(37, 99, 235, 0.3);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          overflow: hidden;
        }
        
        .submit-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 30px rgba(37, 99, 235, 0.4);
        }
        
        .submit-btn:active:not(:disabled) {
          transform: translateY(0);
        }
        
        .submit-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
          transform: none;
        }
        
        .submit-btn::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
          transition: left 0.5s;
        }
        
        .submit-btn:hover::before {
          left: 100%;
        }
        
        .forgot-password {
          text-align: center;
          margin-top: 1.5rem;
        }
        
        .forgot-password-btn {
          background: none;
          border: none;
          color: #2563eb;
          text-decoration: none;
          cursor: pointer;
          font-size: 1rem;
          font-weight: 600;
          padding: 8px 16px;
          border-radius: 8px;
          transition: all 0.3s ease;
        }
        
        .forgot-password-btn:hover {
          background: rgba(37, 99, 235, 0.1);
          transform: translateY(-1px);
        }
        
        @media (max-width: 480px) {
          .auth-card {
            margin: 1rem;
            padding: 2rem 1.5rem;
          }
          
          .logo-text {
            font-size: 1.5rem;
          }
          
          .auth-title {
            font-size: 1.5rem;
          }
        }
      `}</style>
      
      {/* Floating Background Shapes */}
      <div className="floating-shapes">
        <div className="floating-shape"></div>
        <div className="floating-shape"></div>
        <div className="floating-shape"></div>
      </div>
      <div className="auth-card">
        {/* Eazy Loan Logo */}
        <div className="logo-container">
          <svg className="logo-icon" width="60" height="60" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="30" cy="30" r="28" fill="#2563eb" />
            <path d="M20 32l8 8 14-16" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="44" cy="16" r="5" fill="#22c55e" stroke="#fff" strokeWidth="2" />
            </svg>
          <h1 className="logo-text">EazyLoan</h1>
          </div>
        {/* Toggle */}
        {mode !== 'reset' && (
          <div className="mode-toggle">
            <button
              type="button"
              onClick={() => setMode('signin')}
              className={`mode-btn ${mode === 'signin' ? 'active' : ''}`}
            >Sign In</button>
            <button
              type="button"
              onClick={() => setMode('signup')}
              className={`mode-btn ${mode === 'signup' ? 'active' : ''}`}
            >Sign Up</button>
          </div>
        )}
        <h2 className="auth-title">
          {mode === 'signin' ? 'Welcome Back' : mode === 'signup' ? 'Create Account' : 'Reset Password'}
        </h2>
        {mode === 'reset' ? (
          <form onSubmit={handlePasswordReset} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <label htmlFor="resetEmail" style={{ fontWeight: 600, marginBottom: 4, color: '#334155', fontSize: '0.98rem' }}>Email Address</label>
              <input
                id="resetEmail"
                type="email"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                placeholder="Enter your email address"
                required
                style={{ padding: '0.9rem', borderRadius: '0.7rem', border: '1.5px solid #e5e7eb', fontSize: '1.05rem', outline: 'none', background: '#f8fafc' }}
                autoComplete="email"
              />
            </div>
            <div style={{ fontSize: '0.9rem', color: '#64748b', textAlign: 'center', marginTop: '0.5rem' }}>
              Enter your email address and we'll send you a link to reset your password.
            </div>
            {error && <div style={{ color: '#ef4444', background: '#fef2f2', borderRadius: 8, padding: '0.7rem', fontWeight: 600, fontSize: '0.98rem', textAlign: 'center' }}>{error}</div>}
            {success && <div style={{ color: '#22c55e', background: '#f0fdf4', borderRadius: 8, padding: '0.7rem', fontWeight: 600, fontSize: '0.98rem', textAlign: 'center' }}>{success}</div>}
            <button type="submit" disabled={loading} style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: '0.7rem', padding: '1rem 0', fontWeight: 700, fontSize: '1.08rem', marginTop: '0.5rem', cursor: loading ? 'not-allowed' : 'pointer', boxShadow: '0 2px 8px 0 rgba(37,99,235,0.10)' }}>
              {loading ? 'Sending...' : 'Send Reset Email'}
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('signin');
                setError('');
                setSuccess('');
                setResetEmail('');
              }}
              style={{ background: 'transparent', color: '#2563eb', border: '1px solid #2563eb', borderRadius: '0.7rem', padding: '0.8rem 0', fontWeight: 600, fontSize: '1rem', cursor: 'pointer', marginTop: '0.5rem' }}
            >
              Back to Sign In
            </button>
          </form>
        ) : (
          <form onSubmit={handleSubmit} className="auth-form">
          {mode === 'signup' && (
            <>
              <div className="input-group">
                <label htmlFor="firstName" className="input-label">First Name</label>
                <input
                  id="firstName"
                  name="firstName"
                  type="text"
                  value={form.firstName}
                  onChange={handleChange}
                  placeholder="First name"
                  className="input-field"
                  autoComplete="given-name"
                />
              </div>
              <div className="input-group">
                <label htmlFor="lastName" className="input-label">Last Name</label>
                <input
                  id="lastName"
                  name="lastName"
                  type="text"
                  value={form.lastName}
                  onChange={handleChange}
                  placeholder="Last name"
                  className="input-field"
                  autoComplete="family-name"
                />
              </div>
              <div className="input-group">
                <label htmlFor="username" className="input-label">Username</label>
                <input
                  id="username"
                  name="username"
                  type="text"
                  value={form.username}
                  onChange={handleChange}
                  placeholder="Username"
                  className="input-field"
                  autoComplete="username"
                />
                </div>
              </>
            )}
          <div className="input-group">
            <label htmlFor="email" className="input-label">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              placeholder="you@email.com"
              className="input-field"
              autoComplete="email"
            />
          </div>
          <div className="input-group">
            <label htmlFor="password" className="input-label">Password</label>
            <div className="input-eye-container">
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={handleChange}
                placeholder="Password"
                className="input-field"
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              />
              <button type="button" className="input-eye-btn" tabIndex={-1} aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword(v => !v)}>{showPassword ? '🙈' : '👁️'}</button>
            </div>
          </div>
          {mode === 'signup' && (
            <div className="input-group">
              <label htmlFor="confirmPassword" className="input-label">Confirm Password</label>
              <div className="input-eye-container">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={form.confirmPassword}
                  onChange={handleChange}
                  placeholder="Confirm password"
                  className="input-field"
                  autoComplete="new-password"
                />
                <button type="button" className="input-eye-btn" tabIndex={-1} aria-label={showConfirmPassword ? 'Hide password' : 'Show password'} onClick={() => setShowConfirmPassword(v => !v)}>{showConfirmPassword ? '🙈' : '👁️'}</button>
              </div>
            </div>
          )}
          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message">{success}</div>}
            <button type="submit" disabled={loading} className="submit-btn">
              {loading ? (mode === 'signin' ? 'Signing In...' : 'Creating...') : (mode === 'signin' ? 'Sign In' : 'Sign Up')}
            </button>
            {mode === 'signin' && (
              <div className="forgot-password">
                <button
                  type="button"
                  onClick={() => {
                    setMode('reset');
                    setError('');
                    setSuccess('');
                  }}
                  className="forgot-password-btn"
                >
                  Forgot your password?
                </button>
              </div>
            )}
          </form>
        )}
      </div>
    </div>
  );
};

export default AuthForm;