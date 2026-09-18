import type { SearchDevice } from '../../services/catalog/remoteCatalog';

export const STEPS = ['name', 'username', 'platforms', 'import', 'games', 'friends'] as const;
export type Step = (typeof STEPS)[number];

/** The import step only exists when the chosen platforms have something to import. */
export function nextStep(step: Step, hasImports: boolean): Step | null {
  const next = STEPS[STEPS.indexOf(step) + 1];
  if (!next) return null;
  return next === 'import' && !hasImports ? nextStep(next, hasImports) : next;
}

export function previousStep(step: Step, hasImports: boolean): Step {
  const previous = STEPS[STEPS.indexOf(step) - 1];
  if (!previous) return step;
  return previous === 'import' && !hasImports ? previousStep(previous, hasImports) : previous;
}

export type ImportSourceId = 'steam' | 'xbox' | 'psn' | 'android';

export type ImportSource = {
  id: ImportSourceId;
  label: string;
  /** What the user gets, in one line. */
  promise: string;
  action: string;
  /** `signIn` opens a browser sheet, `field` asks for an ID, `scan` is one tap. */
  kind: 'signIn' | 'field' | 'scan';
  /** False while the backend for it is not live: the row shows "Coming soon". */
  available: boolean;
};

export type ImportFlags = { xbox: boolean; psn: boolean };

/**
 * Xbox: the backend functions exist but no real account has completed the link yet.
 * PlayStation: no backend function yet. Set the variable to 1 to try either in a build.
 */
export const IMPORT_FLAGS: ImportFlags = {
  xbox: process.env.EXPO_PUBLIC_XBOX_IMPORT === '1',
  psn: process.env.EXPO_PUBLIC_PSN_IMPORT === '1',
};

/** Nintendo has no import anywhere, and Apple does not let an app list installed games. */
export function importSourcesFor(platforms: Set<SearchDevice>, os: string, flags: ImportFlags = IMPORT_FLAGS): ImportSource[] {
  const sources: ImportSource[] = [];
  if (platforms.has('pc')) {
    sources.push({ id: 'steam', label: 'Steam', promise: 'Your games and hours played', action: 'Connect', kind: 'signIn', available: true });
  }
  if (platforms.has('xbox')) {
    sources.push({ id: 'xbox', label: 'Xbox', promise: 'Your games and achievements', action: 'Connect', kind: 'signIn', available: flags.xbox });
  }
  if (platforms.has('playstation')) {
    sources.push({ id: 'psn', label: 'PlayStation', promise: 'Your games and trophies', action: 'Import', kind: 'field', available: flags.psn });
  }
  if (platforms.has('mobile') && os === 'android') {
    sources.push({ id: 'android', label: 'This phone', promise: 'Games installed on this phone', action: 'Scan', kind: 'scan', available: true });
  }
  return sources;
}
