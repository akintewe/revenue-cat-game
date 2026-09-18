import { supabase } from '../supabase/client';
import { readFunctionErrorBody, type SteamImportResult } from './steam';

/**
 * PlayStation import. There is no sign-in: the player types their PSN ID and the backend reads
 * their public trophy list. That gives games and trophy progress, never hours played.
 *
 * Contract for the `psn-import` backend function (not deployed as of 2026-09-18, so onboarding
 * keeps this behind EXPO_PUBLIC_PSN_IMPORT):
 *   POST { onlineId: string }
 *   200  { total, matched, inserted, updated, viaParent, unmatched }   (same as steam-import)
 *   4xx  { error: 'psn_not_found' | 'psn_profile_private', message, fixUrl? }
 * It must call shelf_import_library with p_source = 'psn', like the Steam and Xbox imports.
 */
export type PsnImportResult = SteamImportResult;

const PSN_ID = /^[A-Za-z][A-Za-z0-9_-]{2,15}$/;

/** Sony's own rule: 3 to 16 characters, starts with a letter, then letters, digits, - and _. */
export function isValidPsnId(value: string): boolean {
  return PSN_ID.test(value.trim());
}

export class PsnNotFoundError extends Error {
  constructor(message = 'We could not find that PSN ID.') {
    super(message);
    this.name = 'PsnNotFoundError';
  }
}

/** Trophies are not visible to "Anyone" in the player's PSN privacy settings. */
export class PsnProfilePrivateError extends Error {
  fixUrl: string;
  constructor(message: string, fixUrl: string) {
    super(message);
    this.name = 'PsnProfilePrivateError';
    this.fixUrl = fixUrl;
  }
}

export async function importPsnLibrary(onlineId: string): Promise<PsnImportResult> {
  const { data, error } = await supabase.functions.invoke<PsnImportResult>('psn-import', {
    method: 'POST',
    body: { onlineId: onlineId.trim() },
  });
  if (error) {
    const body = await readFunctionErrorBody(error);
    if (body?.error === 'psn_not_found') throw new PsnNotFoundError(body.message);
    if (body?.error === 'psn_profile_private') {
      throw new PsnProfilePrivateError(
        body.message ?? 'Your trophies are private.',
        body.fixUrl ?? 'https://www.playstation.com/acct/management/privacy',
      );
    }
    throw new Error(body?.message ?? body?.error ?? (error instanceof Error ? error.message : 'Import failed.'));
  }
  return data!;
}
