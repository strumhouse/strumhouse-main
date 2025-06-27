import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import type { AuthProviderProps, AuthContextType, UserProfile } from '../types/AuthTypes';
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
  const [user, setUser] = useState<any>(null);
  const [session, setSession] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserProfile = useCallback(async (userId: string, silent: boolean = false) => {
    try {
      const profile = await userService.getUserById(userId);
      setUserProfile(profile);
      setUser((prev: any) => {
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
      // Simulate INITIAL_SESSION event
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
    login,
    signup,
    logout,
    loading,
  }), [user, session, userProfile, login, signup, logout, loading]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 