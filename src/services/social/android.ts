import { Platform } from 'react-native';
import { supabase } from '../supabase/client';
import androidPackages from '../../../assets/data/android-packages.json';

export type AndroidImportResult = {
  total: number;
  matched: number;
  inserted: number;
  updated: number;
  /** Capped — a debugging sample, not a complete list. */
  unmatched: string[];
};

/** Posts whichever of the catalog's ~490 packages this device actually has installed. */
export async function importAndroidGames(packages: string[]): Promise<AndroidImportResult> {
  const { data, error } = await supabase.functions.invoke<AndroidImportResult>('android-import', {
    method: 'POST',
    body: { packages },
  });
  if (error) throw error;
  return data!;
}

/**
 * Checks the device for every package in the allowlist and returns the ones installed.
 * Android-only — Android 11+ requires the <queries> declaration in AndroidManifest.xml
 * (see plugins/withAndroidPackageQueries.js) to even ask this question, and the native
 * check itself only runs on Android. Backed by the local expo module at
 * modules/android-installed-games (a small custom module — the npm packages for this
 * turned out to be either iOS-only or built against Gradle tooling from ~2016 that no
 * longer builds at all). Guarded with a lazy require + try/catch because it's still a
 * native module: any build made before it was added won't have it compiled in, and a
 * static import would crash app boot on those builds the same way an un-guarded
 * OneSignal import did earlier this session.
 */
export async function scanInstalledAndroidGames(): Promise<string[]> {
  if (Platform.OS !== 'android') return [];

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const nativeModule = require('../../../modules/android-installed-games/src/AndroidInstalledGamesModule').default;
    const packages = androidPackages as string[];
    return await nativeModule.getInstalledPackages(packages);
  } catch (err) {
    console.warn('[android-import] native install-checker not present in this build', err);
    return [];
  }
}

/** Runs the full scan-then-import flow. Safe to call repeatedly — there's no connection to undo. */
export async function scanAndImportAndroidGames(): Promise<AndroidImportResult> {
  const installed = await scanInstalledAndroidGames();
  return importAndroidGames(installed);
}
