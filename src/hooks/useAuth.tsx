import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

const DEMO_KEY = 'pomoleague.demoMode';

interface AuthValue {
  session: Session | null;
  /** True when exploring without a real account (no Supabase needed). */
  demoMode: boolean;
  /** Authenticated OR in demo mode — i.e. allowed past the auth gate. */
  authed: boolean;
  loading: boolean;
  enterDemo: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthValue>({
  session: null,
  demoMode: false,
  authed: false,
  loading: true,
  enterDemo: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [demoMode, setDemoMode] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([supabase.auth.getSession(), AsyncStorage.getItem(DEMO_KEY)]).then(
      ([{ data }, demo]) => {
        setSession(data.session);
        setDemoMode(demo === '1');
        setLoading(false);
      },
    );

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const enterDemo = async () => {
    await AsyncStorage.setItem(DEMO_KEY, '1');
    setDemoMode(true);
  };

  const signOut = async () => {
    await AsyncStorage.removeItem(DEMO_KEY);
    setDemoMode(false);
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider
      value={{ session, demoMode, authed: !!session || demoMode, loading, enterDemo, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
