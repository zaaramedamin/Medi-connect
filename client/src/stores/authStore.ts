import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { UserRole } from '@/types';

// Role comes from app_metadata, which only the server (service-role key) can
// write — the same field the API trusts (server/src/middleware/auth.ts). Reading
// it from user_metadata would let the UI show an admin surface to anyone who set
// the field on themselves; the API would still reject them, but the UI shouldn't
// invite the attempt. Absent = patient.
function roleFromUser(user: User | null | undefined): UserRole | null {
  const role = user?.app_metadata?.role;
  if (role === 'admin' || role === 'doctor') return role;
  return user ? 'patient' : null;
}

interface AuthState {
  user: User | null;
  session: Session | null;
  role: UserRole | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, name: string) => Promise<{ error: string | null }>;
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
        set({ session, user: session?.user ?? null, role: roleFromUser(session?.user), loading: false });
      },

      signIn: async (email, password) => {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) return { error: error.message };
        set({ user: data.user, session: data.session, role: roleFromUser(data.user), loading: false });
        return { error: null };
      },

      signUp: async (email, password, name) => {
        // No role is sent: the server assigns it (app_metadata), and a new
        // account is always a patient. Only the display name goes in metadata.
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { name } },
        });
        if (error) return { error: error.message };
        set({ user: data.user, session: data.session, role: roleFromUser(data.user) ?? 'patient', loading: false });
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
