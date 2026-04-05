import { Session, User as SupabaseUser } from '@supabase/supabase-js';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { HeroAvatarId } from '../config/heroAvatars';
import { supabase } from '../lib/supabase';
import appStorage from '../services/appStorage';

const ONBOARDING_PENDING_KEY_PREFIX = '@runbound_onboarding_pending:';

interface AuthContextValue {
  session: Session | null;
  user: SupabaseUser | null;
  loading: boolean;
  isLoading: boolean;
  isAuthenticated: boolean;
  needsOnboarding: boolean;
  onboardingLoading: boolean;
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
  completeOnboarding: (heroChoice?: HeroAvatarId | null) => Promise<void>;
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
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [onboardingLoading, setOnboardingLoading] = useState(true);

  const getOnboardingKey = (userId: string) =>
    `${ONBOARDING_PENDING_KEY_PREFIX}${userId}`;

  const loadOnboardingState = useCallback(async (authUser?: SupabaseUser | null) => {
    if (!authUser?.id) {
      setNeedsOnboarding(false);
      setOnboardingLoading(false);
      return;
    }

    setOnboardingLoading(true);

    try {
      const pending = await appStorage.getItem(getOnboardingKey(authUser.id));
      const metadataRequiresOnboarding =
        authUser.user_metadata?.onboarding_completed === false;
      setNeedsOnboarding(pending === 'pending' || metadataRequiresOnboarding);
    } catch (error) {
      logAuthError('loadOnboardingState', error, { userId: authUser.id });
      setNeedsOnboarding(false);
    } finally {
      setOnboardingLoading(false);
    }
  }, []);

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
          loadOnboardingState(currentSession?.user).catch(() => null);
        }
      })
      .catch(error => {
        logAuthError('getSession', error);
        if (isMounted) {
          setLoading(false);
          setOnboardingLoading(false);
        }
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      setSession(currentSession);
      setLoading(false);
      loadOnboardingState(currentSession?.user).catch(() => null);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [loadOnboardingState]);

  const signUp = async (
    email: string,
    password: string,
    username: string,
  ): Promise<void> => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username,
          onboarding_completed: false,
        },
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

    if (data.user?.id) {
      await appStorage.setItem(getOnboardingKey(data.user.id), 'pending');
      setNeedsOnboarding(true);
      setOnboardingLoading(false);
      if (data.session) {
        setSession(data.session);
      }
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

    setNeedsOnboarding(false);
    setOnboardingLoading(false);
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

  const completeOnboarding = async (
    heroChoice?: HeroAvatarId | null,
  ): Promise<void> => {
    if (!session?.user?.id) {
      setNeedsOnboarding(false);
      setOnboardingLoading(false);
      return;
    }

    try {
      if (heroChoice) {
        const { data, error } = await supabase.auth.updateUser({
          data: { superhero: heroChoice, onboarding_completed: true },
        });

        if (error) {
          logAuthError('updateUser superhero', error, {
            userId: session.user.id,
            heroChoice,
          });
          throw error;
        }

        if (data.user && session) {
          setSession({
            ...session,
            user: data.user,
          });
        }
      }

      if (!heroChoice) {
        const { error } = await supabase.auth.updateUser({
          data: { onboarding_completed: true },
        });
        if (error) {
          logAuthError('updateUser onboarding_completed', error, {
            userId: session.user.id,
          });
          throw error;
        }
      }

      await appStorage.removeItem(getOnboardingKey(session.user.id));
      setNeedsOnboarding(false);
    } catch (error) {
      logAuthError('completeOnboarding', error, { userId: session.user.id });
      throw error;
    } finally {
      setOnboardingLoading(false);
    }
  };

  const value: AuthContextValue = {
    session,
    user: session?.user ?? null,
    loading,
    isLoading: loading,
    isAuthenticated: session !== null,
    needsOnboarding,
    onboardingLoading,
    signUp,
    signIn,
    signOut,
    login,
    register,
    logout,
    refreshToken,
    completeOnboarding,
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
