import AsyncStorage from '@react-native-async-storage/async-storage';
import { refreshAndroidWidgets } from '../android/widgetTaskHandler';
import { WIDGET_SNAPSHOT_KEY } from '../snapshot/types';
import type { CoverRef } from './sharedStore';

export async function writeSnapshot(json: string): Promise<void> {
  await AsyncStorage.setItem(WIDGET_SNAPSHOT_KEY, json);
}

/** Android widgets load cover URLs themselves when they render, so there is nothing to cache. */
export async function cacheCovers(_covers: CoverRef[]): Promise<void> {}

export function reloadWidgets(): void {
  refreshAndroidWidgets().catch((err) => {
    if (__DEV__) console.warn('[widgets] android refresh failed', err);
  });
}
