import { Session, User as SupabaseUser } from '@supabase/supabase-js';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

interface AuthContextValue {
  session: Session | null;
  user: SupabaseUser | null;
  loading: boolean;
  isLoading: boolean;
  isAuthenticated: boolean;
  signUp: (email: string, password: string, username: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (
    email: string,
    username: string,
    password: string,
  ) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function logAuthError(
  action: string,
  error: any,
  extra?: Record<string, unknown>,
) {
  console.error(`[auth] ${action} failed`, {
    message: error?.message,
    status: error?.status,
    code: error?.code,
    name: error?.name,
    extra,
    raw: error,
  });
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    supabase.auth
      .getSession()
      .then(({ data: { session: currentSession }, error }) => {
        if (error) {
          logAuthError('getSession', error);
        }

        if (isMounted) {
          setSession(currentSession);
          setLoading(false);
        }
      })
      .catch(error => {
        logAuthError('getSession', error);
        if (isMounted) {
          setLoading(false);
        }
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      setSession(currentSession);
      setLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (
    email: string,
    password: string,
    username: string,
  ): Promise<void> => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username },
      },
    });

    if (error) {
      logAuthError('signUp', error, { email, username });
      throw error;
    }

    if (!data.session) {
      const configError = new Error(
        'Email confirmation is still enabled in Supabase. Disable it in Supabase Dashboard -> Authentication -> Providers -> Email so new accounts sign in immediately.',
      );
      logAuthError('signUp configuration', configError, { email, username });
      throw configError;
    }
  };

  const signIn = async (email: string, password: string): Promise<void> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      logAuthError('signIn', error, { email });
      throw error;
    }
  };

  const signOut = async (): Promise<void> => {
    const { error } = await supabase.auth.signOut();

    if (error) {
      logAuthError('signOut', error);
      throw error;
    }
  };

  const refreshToken = async (): Promise<void> => {
    const { error } = await supabase.auth.refreshSession();

    if (error) {
      logAuthError('refreshSession', error);
      throw error;
    }
  };

  const login = (email: string, password: string) => signIn(email, password);
  const register = (email: string, username: string, password: string) =>
    signUp(email, password, username);
  const logout = () => signOut();

  const value: AuthContextValue = {
    session,
    user: session?.user ?? null,
    loading,
    isLoading: loading,
    isAuthenticated: session !== null,
    signUp,
    signIn,
    signOut,
    login,
    register,
    logout,
    refreshToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}
