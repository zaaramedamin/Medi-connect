import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { UserRole } from '@/types';

interface AuthState {
  user: User | null;
  session: Session | null;
  role: UserRole | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, name: string, role: UserRole) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  setSession: (session: Session | null) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      session: null,
      role: null,
      loading: true,

      setSession: (session) => {
        const role = (session?.user.user_metadata?.role as UserRole) ?? null;
        set({ session, user: session?.user ?? null, role, loading: false });
      },

      signIn: async (email, password) => {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) return { error: error.message };
        const role = (data.user?.user_metadata?.role as UserRole) ?? 'patient';
        set({ user: data.user, session: data.session, role, loading: false });
        return { error: null };
      },

      signUp: async (email, password, name, role) => {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { name, role } },
        });
        if (error) return { error: error.message };
        set({ user: data.user, session: data.session, role, loading: false });
        return { error: null };
      },

      signOut: async () => {
        await supabase.auth.signOut();
        set({ user: null, session: null, role: null, loading: false });
      },
    }),
    {
      name: 'medi-connect-auth',
      partialize: (state) => ({ role: state.role }),
    }
  )
);
