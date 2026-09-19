import {
  GoogleSignin,
  isErrorWithCode,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import { env } from '../../config/env';

/**
 * Thrown when the user dismisses the Google sheet. Callers treat it as a no-op,
 * not as an error to show.
 */
export class GoogleSignInCancelled extends Error {
  constructor() {
    super('Google sign-in cancelled');
    this.name = 'GoogleSignInCancelled';
  }
}

/** True when both public OAuth client IDs are present in app.json extra. */
export const isGoogleSignInConfigured = Boolean(env.googleWebClientId && env.googleIosClientId);

let configured = false;

function ensureConfigured() {
  if (configured) return;
  if (!isGoogleSignInConfigured) {
    throw new Error(
      'Google sign-in is not configured. Set googleWebClientId and googleIosClientId in app.json extra.',
    );
  }
  // Public client IDs, safe to ship in the bundle. The web client ID is the audience
  // Supabase verifies in signInWithIdToken; the iOS client ID drives the native sheet.
  GoogleSignin.configure({
    webClientId: env.googleWebClientId,
    iosClientId: env.googleIosClientId,
  });
  configured = true;
}

/**
 * Runs the native Google flow and returns an ID token for Supabase.
 * Throws GoogleSignInCancelled when the user dismisses the sheet.
 */
export async function getGoogleIdToken(): Promise<string> {
  ensureConfigured();
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

  try {
    const response = await GoogleSignin.signIn();
    if (response.type !== 'success') {
      throw new GoogleSignInCancelled();
    }
    const idToken = response.data.idToken;
    if (!idToken) {
      throw new Error('Google did not return an ID token');
    }
    return idToken;
  } catch (err) {
    if (isErrorWithCode(err) && err.code === statusCodes.SIGN_IN_CANCELLED) {
      throw new GoogleSignInCancelled();
    }
    throw err;
  }
}
