import { create } from 'zustand';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../../../services/supabase/client';
import { GoogleSignInCancelled, getGoogleIdToken } from '../../../services/auth/google';

type AuthStatus = 'loading' | 'signedIn' | 'signedOut';

/** Turns Supabase's server messages into something a person can act on. */
function friendlyAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('rate limit')) return 'Too many codes sent. Wait a few minutes and try again.';
  if (m.includes('expired') || m.includes('invalid')) return 'That code is wrong or has expired. Request a new one.';
  if (m.includes('network')) return 'No connection. Check your network and try again.';
  return message;
}

type AuthStore = {
  status: AuthStatus;
  session: Session | null;
  /** True once the initial session restore + auth listener are wired up. Guards against double-init. */
  initialized: boolean;
  initialize: () => void;
  /** Emails a 6-digit code. Creates the account on first use, so this is sign-in and sign-up. */
  requestEmailCode: (email: string) => Promise<{ error: string | null }>;
  /** Exchanges the emailed code for a session. The session listener flips status to signedIn. */
  verifyEmailCode: (email: string, code: string) => Promise<{ error: string | null }>;
  /** Native Google sheet, then Supabase signInWithIdToken. A dismissed sheet resolves with error null. */
  signInWithGoogle: () => Promise<{ error: string | null }>;
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

  requestEmailCode: async (email) => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    });
    return { error: error ? friendlyAuthError(error.message) : null };
  },

  verifyEmailCode: async (email, code) => {
    const { error } = await supabase.auth.verifyOtp({ email, token: code, type: 'email' });
    return { error: error ? friendlyAuthError(error.message) : null };
  },

  signInWithGoogle: async () => {
    let idToken: string;
    try {
      idToken = await getGoogleIdToken();
    } catch (err) {
      if (err instanceof GoogleSignInCancelled) return { error: null };
      return { error: err instanceof Error ? err.message : 'Google sign-in failed' };
    }
    const { error } = await supabase.auth.signInWithIdToken({ provider: 'google', token: idToken });
    return { error: error?.message ?? null };
  },

  signOut: async () => {
    await supabase.auth.signOut();
  },
}));
