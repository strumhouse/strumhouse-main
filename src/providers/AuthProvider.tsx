import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import type { AuthProviderProps, AuthContextType, UserProfile } from '../types/AuthTypes';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { userService } from '../lib/database';
import toast from 'react-hot-toast';

function timeoutPromise<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Timeout')), ms);
    promise.then(
      (val) => {
        clearTimeout(timer);
        resolve(val);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserProfile = useCallback(async (userId: string, silent: boolean = false) => {
    try {
      const profile = await userService.getUserById(userId);
      setUserProfile(profile);
      setUser((prev: User | null) => {
        const merged = prev ? { ...prev, ...profile } : profile;
        return merged;
      });
      return profile;
    } catch (error) {
      if (!silent) console.error('Error fetching user profile:', error);
      setUserProfile(null);
      return null;
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setLoading(true);
      try {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          try {
            await timeoutPromise(fetchUserProfile(session.user.id, true), 5000);
          } catch (profileError) {
            console.error('AuthProvider: Error fetching user profile:', profileError);
            setUserProfile(null);
          }
        } else {
          setUserProfile(null);
        }
      } catch (error) {
        console.error('AuthProvider: Error during auth state change:', error);
      } finally {
        setLoading(false);
      }
    });

    // Fire initial session event manually (for SSR/CSR consistency)
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (mounted) {
        setLoading(true);
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          await fetchUserProfile(session.user.id, true);
        } else {
          setUserProfile(null);
        }
        setLoading(false);
      }
    })();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchUserProfile]);

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        toast.error(error.message);
        return false;
      }
      if (data.user) {
        const profile = await fetchUserProfile(data.user.id);
        if (profile) {
          toast.success(`Welcome back, ${profile.name}!`);
          return true;
        } else {
          console.error('User authenticated but profile not found:', data.user.id);
          toast.error('Account setup incomplete. Please contact support.');
          return false;
        }
      }
      return false;
    } catch (error) {
      console.error('Login error:', error);
      toast.error('Login failed. Please try again.');
      return false;
    } finally {
      setLoading(false);
    }
  }, [fetchUserProfile]);

  const signup = useCallback(async (name: string, phone: string, email: string, password: string): Promise<boolean> => {
    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name, phone } }
      });
      if (error) {
        console.error('Signup error:', error);
        toast.error(error.message);
        return false;
      }
      if (data.user) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        try {
          const userProfile = await userService.getUserById(data.user.id);
          if (userProfile) {
            setUserProfile(userProfile);
            toast.success('Account created successfully! You can now log in.');
            return true;
          } else {
            try {
              const { data: profileData, error: profileError } = await supabase
                .from('users')
                .insert({
                  id: data.user.id,
                  email: data.user.email!,
                  name,
                  phone,
                  role: 'user'
                })
                .select()
                .single();
              if (profileError) {
                if (profileError.code === '23505' || profileError.message?.includes('duplicate key')) {
                  const { data: directProfile } = await supabase
                    .from('users')
                    .select('*')
                    .eq('id', data.user.id)
                    .single();
                  if (directProfile) {
                    setUserProfile(directProfile);
                    toast.success('Account created successfully! You can now log in.');
                    return true;
                  }
                }
                toast.error(`Profile creation failed: ${profileError.message}`);
                return false;
              }
              setUserProfile(profileData);
              toast.success('Account created successfully! You can now log in.');
              return true;
            } catch (manualError) {
              toast.error('Account created but profile setup failed. Please contact support.');
              return false;
            }
          }
        } catch (fetchError) {
          toast.error('Account created but profile setup failed. Please contact support.');
          return false;
        }
      }
      return false;
    } catch (error) {
      toast.error('Signup failed. Please try again.');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  // --- NEW FUNCTION: Reset Password ---
  const resetPassword = useCallback(async (email: string): Promise<boolean> => {
    try {
      setLoading(true);
      // Dynamic redirect ensures it works on localhost and production
      const redirectTo = `${window.location.origin}/update-password`;
      
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectTo,
      });

      if (error) {
        toast.error(error.message);
        return false;
      }
      
      toast.success('Password reset link sent to your email!');
      return true;
    } catch (error) {
      console.error('Reset password error:', error);
      toast.error('Failed to send reset link.');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  // --- NEW FUNCTION: Update Password ---
  const updatePassword = useCallback(async (password: string): Promise<boolean> => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        toast.error(error.message);
        return false;
      }

      toast.success('Password updated successfully!');
      return true;
    } catch (error) {
      console.error('Update password error:', error);
      toast.error('Failed to update password.');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      setUser(null);
      setSession(null);
      setUserProfile(null);
      const { error } = await supabase.auth.signOut();
      if (error) {
        throw error;
      }
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch (storageError) {
        console.error('Error clearing storage:', storageError);
      }
      window.location.href = '/';
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Error during logout. Please try again or refresh the page.');
    } finally {
      setLoading(false);
    }
  }, []);

  const value = useMemo<AuthContextType>(() => ({
    user,
    session,
    userProfile,
    isAuthenticated: !!user,
    login,
    signup,
    logout,
    resetPassword, // Added here
    updatePassword, // Added here
    loading,
  }), [user, session, userProfile, login, signup, logout, resetPassword, updatePassword, loading]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
