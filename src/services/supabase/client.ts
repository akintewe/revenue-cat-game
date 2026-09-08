import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { env } from '../../config/env';

export const isSupabaseConfigured = Boolean(env.supabaseUrl && env.supabaseAnonKey);

if (!isSupabaseConfigured) {
  console.warn(
    '[supabase] Missing supabaseUrl/supabaseAnonKey in app.json extra — auth and catalog search will fail until they are set.',
  );
}

// createClient throws synchronously on an empty key, so fall back to a placeholder
// that keeps the app bootable — real calls will fail with a clear "Invalid API key"
// error instead of crashing on launch.
export const supabase = createClient(env.supabaseUrl || 'https://placeholder.supabase.co', env.supabaseAnonKey || 'placeholder-anon-key', {
  auth: {
    storage: AsyncStorage,
    persistSession: true,
    autoRefreshToken: true,
    // Required on React Native — there is no URL to parse a session out of.
    detectSessionInUrl: false,
  },
});
