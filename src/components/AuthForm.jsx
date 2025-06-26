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
        const { data, error } = await signUp(form.email, form.password);
      if (error) {
          setError(error.message);
        } else if (data.user) {
          try {
            await createUserProfile(data.user.id);
            setError('');
            setSuccess('Account created successfully! Please check your email to verify your account.');
            setForm({ firstName: '', lastName: '', username: '', email: '', password: '', confirmPassword: '' });
          } catch (profileError) {
            setError('Account created but profile setup failed. Please contact support.');
          }
        }
      } else {
        const { error } = await signIn(form.email, form.password);
        if (error) {
          setError(error.message);
        } else {
          setSuccess('Signed in successfully!');
          setForm({ firstName: '', lastName: '', username: '', email: '', password: '', confirmPassword: '' });
        }
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const createUserProfile = async (userId) => {
    try {
      // First, check if the user already has a profile
      const { data: existingProfile, error: checkError } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('user_id', userId)
        .single();
      
      if (checkError && checkError.code !== 'PGRST116') {
        console.error('Profile check error:', checkError);
      }
      
      // If profile already exists, don't try to create a new one
      if (existingProfile) {
        console.log('User profile already exists, skipping creation');
        return;
      }
      
      // Create profile using RPC function to bypass RLS
      const { error } = await supabase
        .rpc('create_user_profile', {
          profile_user_id: userId,
          profile_first_name: form.firstName.trim(),
          profile_last_name: form.lastName.trim().split(' ').slice(-1).join(''),
          profile_username: form.username.trim().toLowerCase()
        });

      if (error) {
        console.error('Profile creation error:', error);
        throw error;
      }

      console.log('✅ User profile created successfully');
    } catch (error) {
      console.error('❌ Failed to create user profile:', error);
      throw error;
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(120deg, #f0f4ff 0%, #dbeafe 100%)' }}>
      {/* Responsive style for stacking name fields on mobile */}
      <style>{`
        @media (max-width: 600px) {
          .auth-names-row { flex-direction: column !important; gap: 0.7rem !important; }
        }
        .input-eye-container { position: relative; }
        .input-eye-btn {
          position: absolute;
          right: 0.7rem;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          cursor: pointer;
          font-size: 1.2rem;
          color: #64748b;
          padding: 0 0.2rem;
        }
        .input-eye-btn:active { color: #2563eb; }
      `}</style>
      <div style={{ background: '#fff', borderRadius: '1.5rem', boxShadow: '0 4px 24px rgba(0,0,0,0.07)', maxWidth: 380, width: '100%', padding: '2.2rem 1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        {/* Eazy Loan Logo */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '1.2rem', marginTop: '-0.5rem' }}>
          <svg width="60" height="60" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginBottom: 8, filter: 'drop-shadow(0 2px 8px rgba(37,99,235,0.10))' }}>
            <circle cx="30" cy="30" r="28" fill="#2563eb" />
            <path d="M20 32l8 8 14-16" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="44" cy="16" r="5" fill="#22c55e" stroke="#fff" strokeWidth="2" />
            </svg>
          <span style={{ fontWeight: 800, fontSize: '1.45rem', color: '#2563eb', letterSpacing: '-0.01em', marginBottom: 2 }}>EazyLoan</span>
          </div>
        {/* Toggle */}
        <div style={{ display: 'flex', width: '100%', marginBottom: '2rem' }}>
          <button
            onClick={() => setMode('signin')}
            style={{ flex: 1, padding: '0.7rem 0', border: 'none', background: mode === 'signin' ? '#2563eb' : 'transparent', color: mode === 'signin' ? '#fff' : '#2563eb', fontWeight: 700, borderRadius: '0.7rem 0 0 0.7rem', cursor: 'pointer', fontSize: '1.08rem', transition: 'background 0.2s, color 0.2s' }}
          >Sign In</button>
          <button
            onClick={() => setMode('signup')}
            style={{ flex: 1, padding: '0.7rem 0', border: 'none', background: mode === 'signup' ? '#2563eb' : 'transparent', color: mode === 'signup' ? '#fff' : '#2563eb', fontWeight: 700, borderRadius: '0 0.7rem 0.7rem 0', cursor: 'pointer', fontSize: '1.08rem', transition: 'background 0.2s, color 0.2s' }}
          >Sign Up</button>
        </div>
        <h2 style={{ fontWeight: 800, color: '#2563eb', marginBottom: '1.2rem', fontSize: '1.5rem', letterSpacing: '-0.01em' }}>{mode === 'signin' ? 'Welcome Back' : 'Create Account'}</h2>
        <form onSubmit={handleSubmit} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
          {mode === 'signup' && (
            <>
              <div className="auth-names-row" style={{ display: 'flex', gap: '0.7rem' }}>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <label htmlFor="firstName" style={{ fontWeight: 600, marginBottom: 4, color: '#334155', fontSize: '0.98rem' }}>First Name</label>
                    <input
                      id="firstName"
                      name="firstName"
                    type="text"
                    value={form.firstName}
                      onChange={handleChange}
                    placeholder="First name"
                    style={{ padding: '0.9rem', borderRadius: '0.7rem', border: '1.5px solid #e5e7eb', fontSize: '1.05rem', outline: 'none', background: '#f8fafc' }}
                      autoComplete="given-name"
                    />
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <label htmlFor="lastName" style={{ fontWeight: 600, marginBottom: 4, color: '#334155', fontSize: '0.98rem' }}>Last Name</label>
                  <input
                    id="lastName"
                    name="lastName"
                    type="text"
                    value={form.lastName}
                    onChange={handleChange}
                    placeholder="Last name"
                    style={{ padding: '0.9rem', borderRadius: '0.7rem', border: '1.5px solid #e5e7eb', fontSize: '1.05rem', outline: 'none', background: '#f8fafc' }}
                    autoComplete="family-name"
                  />
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <label htmlFor="username" style={{ fontWeight: 600, marginBottom: 4, color: '#334155', fontSize: '0.98rem' }}>Username</label>
                <input
                  id="username"
                  name="username"
                  type="text"
                  value={form.username}
                  onChange={handleChange}
                  placeholder="Username"
                  style={{ padding: '0.9rem', borderRadius: '0.7rem', border: '1.5px solid #e5e7eb', fontSize: '1.05rem', outline: 'none', background: '#f8fafc' }}
                  autoComplete="username"
                />
                </div>
              </>
            )}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <label htmlFor="email" style={{ fontWeight: 600, marginBottom: 4, color: '#334155', fontSize: '0.98rem' }}>Email</label>
            <input
              id="email"
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              placeholder="you@email.com"
              style={{ padding: '0.9rem', borderRadius: '0.7rem', border: '1.5px solid #e5e7eb', fontSize: '1.05rem', outline: 'none', background: '#f8fafc' }}
              autoComplete="email"
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <label htmlFor="password" style={{ fontWeight: 600, marginBottom: 4, color: '#334155', fontSize: '0.98rem' }}>Password</label>
            <div className="input-eye-container">
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={handleChange}
                placeholder="Password"
                style={{ padding: '0.9rem', borderRadius: '0.7rem', border: '1.5px solid #e5e7eb', fontSize: '1.05rem', outline: 'none', background: '#f8fafc', width: '100%' }}
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              />
              <button type="button" className="input-eye-btn" tabIndex={-1} aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword(v => !v)}>{showPassword ? '🙈' : '👁️'}</button>
            </div>
          </div>
          {mode === 'signup' && (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <label htmlFor="confirmPassword" style={{ fontWeight: 600, marginBottom: 4, color: '#334155', fontSize: '0.98rem' }}>Confirm Password</label>
              <div className="input-eye-container">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={form.confirmPassword}
                  onChange={handleChange}
                  placeholder="Confirm password"
                  style={{ padding: '0.9rem', borderRadius: '0.7rem', border: '1.5px solid #e5e7eb', fontSize: '1.05rem', outline: 'none', background: '#f8fafc', width: '100%' }}
                  autoComplete="new-password"
                />
                <button type="button" className="input-eye-btn" tabIndex={-1} aria-label={showConfirmPassword ? 'Hide password' : 'Show password'} onClick={() => setShowConfirmPassword(v => !v)}>{showConfirmPassword ? '🙈' : '👁️'}</button>
              </div>
            </div>
          )}
          {error && <div style={{ color: '#ef4444', background: '#fef2f2', borderRadius: 8, padding: '0.7rem', fontWeight: 600, fontSize: '0.98rem', textAlign: 'center' }}>{error}</div>}
          {success && <div style={{ color: '#22c55e', background: '#f0fdf4', borderRadius: 8, padding: '0.7rem', fontWeight: 600, fontSize: '0.98rem', textAlign: 'center' }}>{success}</div>}
          <button type="submit" disabled={loading} style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: '0.7rem', padding: '1rem 0', fontWeight: 700, fontSize: '1.08rem', marginTop: '0.5rem', cursor: loading ? 'not-allowed' : 'pointer', boxShadow: '0 2px 8px 0 rgba(37,99,235,0.10)' }}>
            {loading ? (mode === 'signin' ? 'Signing In...' : 'Creating...') : (mode === 'signin' ? 'Sign In' : 'Sign Up')}
            </button>
          </form>
      </div>
    </div>
  );
};

export default AuthForm;