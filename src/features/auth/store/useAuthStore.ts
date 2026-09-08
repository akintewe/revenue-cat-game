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

  signOut: async () => {
    await supabase.auth.signOut();
  },
}));
