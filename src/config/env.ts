import Constants from 'expo-constants';

type Extra = {
  revenueCatApiKeyIos?: string;
  revenueCatApiKeyAndroid?: string;
};

const extra = (Constants.expoConfig?.extra ?? {}) as Extra;

export const env = {
  revenueCatApiKeyIos: extra.revenueCatApiKeyIos ?? '',
  revenueCatApiKeyAndroid: extra.revenueCatApiKeyAndroid ?? '',
  // EXPO_PUBLIC_ vars are inlined from .env at bundle time — see .env.example.
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
  oneSignalAppId: process.env.EXPO_PUBLIC_ONESIGNAL_APP_ID ?? '',
};
