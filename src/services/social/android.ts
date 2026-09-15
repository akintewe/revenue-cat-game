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

const SCAN_BATCH_SIZE = 40;

/**
 * Checks the device for every package in the allowlist and returns the ones installed.
 * Android-only — Android 11+ requires the <queries> declaration in AndroidManifest.xml
 * (see plugins/withAndroidPackageQueries.js) to even ask this question, and the native
 * check itself only runs on Android. Guarded with a lazy require + try/catch because
 * react-native-check-app-install is a native module: any build made before it was added
 * won't have it compiled in, and a static import would crash app boot on those builds
 * the same way an un-guarded OneSignal import did earlier this session.
 */
export async function scanInstalledAndroidGames(): Promise<string[]> {
  if (Platform.OS !== 'android') return [];

  let checker: { isAppInstalledAndroid: (pkg: string) => Promise<boolean> } | null = null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    checker = require('react-native-check-app-install').AppInstalledChecker;
  } catch (err) {
    console.warn('[android-import] native install-checker not present in this build', err);
    return [];
  }
  if (!checker) return [];

  const installed: string[] = [];
  const packages = androidPackages as string[];
  for (let i = 0; i < packages.length; i += SCAN_BATCH_SIZE) {
    const batch = packages.slice(i, i + SCAN_BATCH_SIZE);
    const results = await Promise.all(
      batch.map((pkg) =>
        checker!.isAppInstalledAndroid(pkg).catch(() => false),
      ),
    );
    batch.forEach((pkg, index) => {
      if (results[index]) installed.push(pkg);
    });
  }
  return installed;
}

/** Runs the full scan-then-import flow. Safe to call repeatedly — there's no connection to undo. */
export async function scanAndImportAndroidGames(): Promise<AndroidImportResult> {
  const installed = await scanInstalledAndroidGames();
  return importAndroidGames(installed);
}
