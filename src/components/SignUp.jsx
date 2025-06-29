import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../utils/supabase';
import '../App.css';

const SignUp = () => {
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
  const { signUp } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError('');
    setSuccess('');
  };

  const validate = () => {
    if (!form.firstName || !form.lastName || !form.username || !form.email || !form.password || !form.confirmPassword) {
      return 'Please fill in all required fields.';
    }
    if (form.password !== form.confirmPassword) {
      return 'Passwords do not match.';
    }
    if (form.password.length < 6) {
      return 'Password must be at least 6 characters.';
    }
    if (form.username.length < 3) {
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
        
        .auth-title {
          font-size: 1.75rem;
          font-weight: 700;
          color: #1e293b;
          margin-bottom: 2rem;
          text-align: center;
        }
        
        .auth-form {
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }
        
        .input-group {
          display: flex;
          flex-direction: column;
        }
        
        .input-label {
          font-weight: 600;
          margin-bottom: 6px;
          color: #334155;
          font-size: 0.95rem;
        }
        
        .input-field {
          padding: 0.875rem;
          border-radius: 0.75rem;
          border: 1.5px solid #e5e7eb;
          font-size: 1rem;
          outline: none;
          background: #f8fafc;
          transition: all 0.2s ease;
        }
        
        .input-field:focus {
          border-color: #2563eb;
          background: #fff;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
        }
        
        .input-eye-container {
          position: relative;
        }
        
        .input-eye-btn {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          cursor: pointer;
          font-size: 1.1rem;
          padding: 4px;
          border-radius: 4px;
          transition: background-color 0.2s ease;
        }
        
        .input-eye-btn:hover {
          background-color: rgba(0, 0, 0, 0.05);
        }
        
        .submit-btn {
          background: #2563eb;
          color: #fff;
          border: none;
          border-radius: 0.75rem;
          padding: 1rem 0;
          font-weight: 700;
          font-size: 1.05rem;
          margin-top: 0.5rem;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 2px 8px 0 rgba(37,99,235,0.15);
        }
        
        .submit-btn:hover:not(:disabled) {
          background: #1d4ed8;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px 0 rgba(37,99,235,0.25);
        }
        
        .submit-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }
        
        .error-message {
          color: #ef4444;
          background: #fef2f2;
          border-radius: 8px;
          padding: 0.75rem;
          font-weight: 600;
          font-size: 0.95rem;
          text-align: center;
        }
        
        .success-message {
          color: #22c55e;
          background: #f0fdf4;
          border-radius: 8px;
          padding: 0.75rem;
          font-weight: 600;
          font-size: 0.95rem;
          text-align: center;
        }
        
        .switch-mode {
          text-align: center;
          margin-top: 1.5rem;
          padding-top: 1.5rem;
          border-top: 1px solid #e5e7eb;
        }
        
        .switch-mode-text {
          color: #64748b;
          margin-bottom: 0.5rem;
        }
        
        .switch-mode-btn {
          background: none;
          border: 1px solid #2563eb;
          color: #2563eb;
          cursor: pointer;
          font-weight: 600;
          padding: 8px 16px;
          border-radius: 8px;
          transition: all 0.3s ease;
        }
        
        .switch-mode-btn:hover {
          background: #2563eb;
          color: white;
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
        {/* EazyLoan Logo */}
        <div className="logo-container">
          <svg className="logo-icon" width="60" height="60" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="30" cy="30" r="28" fill="#2563eb" />
            <path d="M20 32l8 8 14-16" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="44" cy="16" r="5" fill="#22c55e" stroke="#fff" strokeWidth="2" />
          </svg>
          <h1 className="logo-text">EazyLoan</h1>
        </div>
        
        <h2 className="auth-title">Create Account</h2>
        
        <form onSubmit={handleSubmit} className="auth-form">
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
                autoComplete="new-password"
              />
              <button 
                type="button" 
                className="input-eye-btn" 
                tabIndex={-1} 
                aria-label={showPassword ? 'Hide password' : 'Show password'} 
                onClick={() => setShowPassword(v => !v)}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </div>
          
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
              <button 
                type="button" 
                className="input-eye-btn" 
                tabIndex={-1} 
                aria-label={showConfirmPassword ? 'Hide password' : 'Show password'} 
                onClick={() => setShowConfirmPassword(v => !v)}
              >
                {showConfirmPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </div>
          
          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message">{success}</div>}
          
          <button type="submit" disabled={loading} className="submit-btn">
            {loading ? 'Creating...' : 'Sign Up'}
          </button>
        </form>
        
        <div className="switch-mode">
          <div className="switch-mode-text">Already have an account?</div>
          <button
            type="button"
            onClick={() => window.location.href = '/login'}
            className="switch-mode-btn"
          >
            Sign In
          </button>
        </div>
      </div>
    </div>
  );
};

export default SignUp;