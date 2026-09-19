import { ExtensionStorage } from '@bacons/apple-targets';
import { Directory, File, Paths } from 'expo-file-system';
import { APP_GROUP, WIDGET_COVER_DIR, WIDGET_SNAPSHOT_KEY } from '../snapshot/types';
import type { CoverRef } from './sharedStore';

// ExtensionStorage falls back to no-ops when the native module is absent (a dev build made
// before the widget target existed), so none of this can crash an older binary.
const storage = new ExtensionStorage(APP_GROUP);

export async function writeSnapshot(json: string): Promise<void> {
  storage.set(WIDGET_SNAPSHOT_KEY, json);
}

/**
 * The widget extension cannot use the network reliably, so the app downloads each cover into
 * the App Group container. Files that are already there are kept; files no longer referenced
 * are removed. One failed download never blocks the rest.
 */
export async function cacheCovers(covers: CoverRef[]): Promise<void> {
  try {
    const container = Paths.appleSharedContainers[APP_GROUP];
    if (!container) return;
    const dir = new Directory(container, WIDGET_COVER_DIR);
    dir.create({ idempotent: true, intermediates: true });

    const wanted = new Map<string, string>();
    for (const cover of covers) {
      if (cover.coverFile && cover.coverUrl) wanted.set(cover.coverFile, cover.coverUrl);
    }

    for (const item of dir.list()) {
      if (item instanceof File && !wanted.has(item.name)) {
        try {
          item.delete();
        } catch {}
      }
    }

    await Promise.allSettled(
      [...wanted].map(async ([name, url]) => {
        const file = new File(dir, name);
        if (file.exists) return;
        await File.downloadFileAsync(url, file);
      }),
    );
  } catch (err) {
    if (__DEV__) console.warn('[widgets] cover cache failed', err);
  }
}

export function reloadWidgets(): void {
  ExtensionStorage.reloadWidget();
}
