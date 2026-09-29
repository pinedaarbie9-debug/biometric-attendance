import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { Student } from '../types';

interface AuthContextValue {
  session: Session | null;
  profile: Student | null;
  loading: boolean;
  isAdmin: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null; role?: string }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadProfile(userId: string) {
    console.log('🔍 Loading profile for user:', userId);
    
    // Use maybeSingle() to avoid error if no row exists
    const { data, error } = await supabase
      .from('students')
      .select('*, department:departments(*)')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.error('❌ Failed to load profile:', error);
      setProfile(null);
      return null;
    }

    if (!data) {
      console.warn('⚠️ No profile found in students table for user:', userId);
      setProfile(null);
      return null;
    }

    console.log('✅ Profile loaded:', data);
    console.log('👤 Role:', data.role);
    setProfile(data as Student);
    return data as Student;
  }

  useEffect(() => {
    let mounted = true;

    // Initial session load
    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      if (data.session?.user) {
        await loadProfile(data.session.user.id);
      }
      setLoading(false);
    });

    // Listen for auth changes
    const { data: listener } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        if (!mounted) return;
        setSession(newSession);
        if (newSession?.user) {
          await loadProfile(newSession.user.id);
        } else {
          setProfile(null);
        }
        setLoading(false);
      }
    );

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  async function signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };

    // Note: onAuthStateChange will handle loading the profile
    // But we return role immediately for the login redirect logic
    if (data.user) {
      const loadedProfile = await loadProfile(data.user.id);
      return { error: null, role: loadedProfile?.role };
    }

    return { error: null };
  }

  async function signOut() {
    await supabase.auth.signOut();
    setProfile(null);
    setSession(null);
  }

  async function refreshProfile() {
    if (session?.user) {
      await loadProfile(session.user.id);
    }
  }

  const value: AuthContextValue = {
    session,
    profile,
    loading,
    isAdmin: profile?.role === 'admin',
    signIn,
    signOut,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}