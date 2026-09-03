import * as Notifications from 'expo-notifications';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

function reminderId(catalogId: string): string {
  return `release-reminder:${catalogId}`;
}

export async function requestNotificationPermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

/** Schedules a local notification for a game's release date. No-ops if the date has passed. */
export async function scheduleReleaseReminder(
  catalogId: string,
  title: string,
  releaseDateIso: string,
): Promise<void> {
  const fireDate = new Date(`${releaseDateIso}T09:00:00`);
  if (fireDate.getTime() <= Date.now()) return;

  const granted = await requestNotificationPermission();
  if (!granted) return;

  await Notifications.scheduleNotificationAsync({
    identifier: reminderId(catalogId),
    content: {
      title: 'Out today',
      body: `${title} releases today.`,
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: fireDate },
  });
}

export async function cancelReleaseReminder(catalogId: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(reminderId(catalogId));
}
