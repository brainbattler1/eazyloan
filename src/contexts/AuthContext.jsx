import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';

const AuthContext = createContext({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isBanned, setIsBanned] = useState(false);

  // Function to check user profile and ban status
  const checkUserProfile = async (authUser) => {
    if (!authUser) {
      setUserProfile(null);
      setIsBanned(false);
      return null;
    }

    try {
      // Add timeout to profile check
      const profilePromise = supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', authUser.id)
        .single();
      
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Profile check timeout')), 5000)
      );
      
      const { data: profile, error } = await Promise.race([profilePromise, timeoutPromise]);

      if (error) {
        console.error('❌ Error fetching user profile:', error);
        setUserProfile(null);
        setIsBanned(false);
        return null;
      }

      setUserProfile(profile);
      const banned = profile?.is_active === false;
      setIsBanned(banned);

      // Don't auto-sign out banned users - let them see the banned page
      if (banned) {
        console.log('🚫 User is banned, showing banned page...');
      }

      return profile;
    } catch (error) {
      console.error('❌ Error checking user profile:', error);
      setUserProfile(null);
      setIsBanned(false);
      return null;
    }
  };

  useEffect(() => {
    let mounted = true;
    let timeoutId;

    const initializeAuth = async () => {
      try {
        console.log('🔄 Initializing authentication...');
        
        // Set a timeout to prevent endless loading
        timeoutId = setTimeout(() => {
          if (mounted) {
            console.warn('⚠️ Auth initialization timeout, proceeding without auth');
            setUser(null);
            setUserProfile(null);
            setIsBanned(false);
            setLoading(false);
          }
        }, 10000); // 10 second timeout
        
        // Get initial session
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('❌ Session error:', error);
        } else {
          console.log('✅ Session loaded:', session ? 'User found' : 'No user');
        }
        
        if (mounted) {
          const authUser = session?.user ?? null;
          setUser(authUser);
          
          // Check user profile and ban status
          if (authUser) {
            await checkUserProfile(authUser);
          }
          
          clearTimeout(timeoutId);
          setLoading(false);
        }
      } catch (error) {
        console.error('❌ Auth initialization error:', error);
        if (mounted) {
          setUser(null);
          setUserProfile(null);
          setIsBanned(false);
          clearTimeout(timeoutId);
          setLoading(false);
        }
      }
    };

    initializeAuth();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔄 Auth state changed:', event, session ? 'User present' : 'No user');
      
      if (mounted) {
        const authUser = session?.user ?? null;
        setUser(authUser);
        
        // Check user profile and ban status on auth change
        if (authUser) {
          await checkUserProfile(authUser);
        } else {
          setUserProfile(null);
          setIsBanned(false);
        }
        
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email, password) => {
    try {
      console.log('🔄 Signing in user...');
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        console.error('❌ Sign in error:', error);
      } else {
        console.log('✅ Sign in successful');
      }
      
      return { data, error };
    } catch (error) {
      console.error('❌ Sign in exception:', error);
      return { data: null, error };
    }
  };

  const signUp = async (email, password) => {
    try {
      console.log('🔄 Signing up user...');
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: 'https://eazy-loans.com'
        }
      });
      
      if (error) {
        console.error('❌ Sign up error:', error);
      } else {
        console.log('✅ Sign up successful');
      }
      
      return { data, error };
    } catch (error) {
      console.error('❌ Sign up exception:', error);
      return { data: null, error };
    }
  };

  const signOut = async () => {
    try {
      console.log('🔄 Signing out user...');
      
      // Clear local state immediately to prevent hanging
      setUser(null);
      setUserProfile(null);
      setIsBanned(false);
      setLoading(false);
      
      // Add timeout to prevent hanging
      const signOutPromise = supabase.auth.signOut();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Sign out timeout')), 5000)
      );
      
      const { error } = await Promise.race([signOutPromise, timeoutPromise]);
      
      if (error) {
        console.error('❌ Sign out error:', error);
        // Even if there's an error, we've already cleared local state
        return { error: null }; // Return success since local state is cleared
      } else {
        console.log('✅ Sign out successful');
      }
      
      return { error: null };
    } catch (error) {
      console.error('❌ Sign out exception:', error);
      // Local state is already cleared, so return success
      return { error: null };
    }
  };

  const value = {
    user,
    userProfile,
    loading,
    isBanned,
    signIn,
    signUp,
    signOut,
    checkUserProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};