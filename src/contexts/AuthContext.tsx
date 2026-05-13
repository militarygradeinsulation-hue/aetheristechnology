import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName?: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const syncProfile = async (user: User) => {
  const { error } = await supabase.from('profiles').upsert(
    {
      id: user.id,
      full_name: user.user_metadata?.full_name || user.user_metadata?.name || null,
      email: user.email,
    },
    { onConflict: 'id' }
  );

  if (error) {
    console.error('Profile sync failed', error);
  }
};

// Read the persisted Supabase session synchronously from localStorage so we
// can render the correct UI on first paint instead of flashing a loader while
// supabase.auth.getSession() does its async network round-trip.
const readCachedSession = (): Session | null => {
  if (typeof window === 'undefined') return null;
  try {
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (!k || !k.startsWith('sb-') || !k.endsWith('-auth-token')) continue;
      const raw = window.localStorage.getItem(k);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      const s: Session | null = parsed?.currentSession ?? parsed ?? null;
      if (s?.access_token) {
        const expMs = (s.expires_at ?? 0) * 1000;
        if (!expMs || expMs > Date.now()) return s;
      }
    }
  } catch {
    /* ignore — fall back to network */
  }
  return null;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const cached = typeof window !== 'undefined' ? readCachedSession() : null;
  const [user, setUser] = useState<User | null>(cached?.user ?? null);
  const [session, setSession] = useState<Session | null>(cached);
  // If we have a cached session, render immediately and only flip loading
  // when the live check returns. Otherwise show loader as before.
  const [loading, setLoading] = useState(!cached);

  useEffect(() => {
    const applySession = (session: Session | null) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      applySession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      applySession(session);

      if (event === 'SIGNED_IN' && session?.user) {
        void syncProfile(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, fullName?: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: window.location.origin,
      },
    });
    if (error) throw error;
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signInWithGoogle = async () => {
    const result = await lovable.auth.signInWithOAuth('google', {
      redirect_uri: window.location.origin,
    });
    if (result?.error) throw result.error;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) throw error;
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signUp, signIn, signInWithGoogle, signOut, resetPassword }}>
      {children}
    </AuthContext.Provider>
  );
};

const noopAuth: AuthContextType = {
  user: null,
  session: null,
  loading: false,
  signUp: async () => { throw new Error('Auth not available'); },
  signIn: async () => { throw new Error('Auth not available'); },
  signInWithGoogle: async () => { throw new Error('Auth not available'); },
  signOut: async () => { throw new Error('Auth not available'); },
  resetPassword: async () => { throw new Error('Auth not available'); },
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  return context ?? noopAuth;
};
