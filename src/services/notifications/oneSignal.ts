import type { OneSignal as OneSignalType } from 'react-native-onesignal';
import { env } from '../../config/env';

let initialized = false;
let oneSignal: typeof OneSignalType | null = null;

/**
 * Lazily requires the native module instead of a static import. The package resolves
 * its TurboModule the moment it's required, which throws on any build made before this
 * was wired in (every already-shipped TestFlight/simulator install, until the next EAS
 * build). A static top-level import would crash the whole app before anything renders;
 * a guarded require() at call time keeps that failure local to push notifications.
 */
function getOneSignal(): typeof OneSignalType | null {
  if (oneSignal) return oneSignal;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    oneSignal = require('react-native-onesignal').OneSignal;
    return oneSignal;
  } catch (err) {
    console.warn('[OneSignal] native module not present in this build', err);
    return null;
  }
}

/** Starts the OneSignal SDK and prompts for push permission. Call once at app boot. */
export function initOneSignal() {
  if (initialized) return;
  if (!env.oneSignalAppId) {
    console.warn('[OneSignal] Missing EXPO_PUBLIC_ONESIGNAL_APP_ID');
    return;
  }
  const sdk = getOneSignal();
  if (!sdk) return;
  try {
    sdk.initialize(env.oneSignalAppId);
    sdk.Notifications.requestPermission(true);
    initialized = true;
  } catch (err) {
    console.warn('[OneSignal] init failed', err);
  }
}

/** Links this device to the signed-in user so the backend can target them by id. */
export function identifyOneSignalUser(userId: string) {
  if (!initialized || !oneSignal) return;
  try {
    oneSignal.login(userId);
  } catch (err) {
    console.warn('[OneSignal] login failed', err);
  }
}

/** Unlinks the device on sign-out so a shared device doesn't keep a stale identity. */
export function clearOneSignalUser() {
  if (!initialized || !oneSignal) return;
  try {
    oneSignal.logout();
  } catch (err) {
    console.warn('[OneSignal] logout failed', err);
  }
}
