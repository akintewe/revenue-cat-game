import { create } from 'zustand';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../../../services/supabase/client';

type AuthStatus = 'loading' | 'signedIn' | 'signedOut';

type AuthStore = {
  status: AuthStatus;
  session: Session | null;
  /** True once the initial session restore + auth listener are wired up. Guards against double-init. */
  initialized: boolean;
  initialize: () => void;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string) => Promise<{ error: string | null }>;
  verifySignupOtp: (email: string, token: string) => Promise<{ error: string | null }>;
  resendSignupOtp: (email: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
};

export const useAuthStore = create<AuthStore>((set, get) => ({
  status: 'loading',
  session: null,
  initialized: false,

  initialize: () => {
    if (get().initialized) return;
    set({ initialized: true });

    supabase.auth.getSession().then(({ data }) => {
      set({ session: data.session, status: data.session ? 'signedIn' : 'signedOut' });
    });

    supabase.auth.onAuthStateChange((_event, session) => {
      set({ session, status: session ? 'signedIn' : 'signedOut' });
    });
  },

  signIn: async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  },

  signUp: async (email, password) => {
    const { error } = await supabase.auth.signUp({ email, password });
    return { error: error?.message ?? null };
  },

  // Supabase's confirm-signup email carries a 6-digit code here (not a link) — verifying
  // it establishes a real session, same as signInWithPassword, and the onAuthStateChange
  // listener above picks it up automatically.
  verifySignupOtp: async (email, token) => {
    const { error } = await supabase.auth.verifyOtp({ email, token, type: 'signup' });
    return { error: error?.message ?? null };
  },

  resendSignupOtp: async (email) => {
    const { error } = await supabase.auth.resend({ type: 'signup', email });
    return { error: error?.message ?? null };
  },

  signOut: async () => {
    await supabase.auth.signOut();
  },
}));
