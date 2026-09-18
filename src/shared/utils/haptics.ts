/**
 * Guarded lazy require — expo-haptics is native, and the currently-running build
 * (like every native module added this session) won't have it compiled in until
 * the next EAS build. A guarded require keeps this a silent no-op until then
 * instead of crashing app boot, matching the pattern used for OneSignal.
 */
function getHaptics(): typeof import('expo-haptics') | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('expo-haptics');
  } catch {
    return null;
  }
}

export function hapticSelection() {
  const haptics = getHaptics();
  haptics?.selectionAsync().catch(() => undefined);
}

export function hapticError() {
  const haptics = getHaptics();
  haptics?.notificationAsync(haptics.NotificationFeedbackType.Error).catch(() => undefined);
}

export function hapticSuccess() {
  const haptics = getHaptics();
  haptics?.notificationAsync(haptics.NotificationFeedbackType.Success).catch(() => undefined);
}
