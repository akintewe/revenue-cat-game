import { supabase } from '../supabase/client';
import { describeFunctionError, type PlatformAccount, type SteamImportResult } from './steam';

/**
 * Xbox link and import, the mirror of steam.ts. The four backend functions are deployed
 * (xbox-link-start, -callback, -finish, xbox-import) but, as of 2026-09-18, no real account has
 * completed the link, so onboarding keeps this behind EXPO_PUBLIC_XBOX_IMPORT.
 * The callback redirects to the backend secret APP_LINK_RETURN_URL_XBOX, which must be
 * `prysm://link/xbox`; without it the function falls back to a scheme this app does not own.
 */
/** steam-import's shape plus how each title was matched. `unmatched` holds Xbox title ids. */
export type XboxImportResult = SteamImportResult & { viaTitleId: number; viaNameMatch: number };

/** Step 1 — the Microsoft sign-in URL to open, and the nonce the redirect carries back. */
export async function startXboxLink(): Promise<{ redirectUrl: string; nonce: string }> {
  const { data, error } = await supabase.functions.invoke<{ redirectUrl: string; nonce: string }>('xbox-link-start', {
    method: 'POST',
  });
  if (error) throw new Error(await describeFunctionError(error));
  return data!;
}

/** Step 3 — only after the prysm://link/xbox redirect says status=ok. */
export async function finishXboxLink(nonce: string): Promise<PlatformAccount> {
  const { data, error } = await supabase.functions.invoke<PlatformAccount>('xbox-link-finish', {
    method: 'POST',
    body: { nonce },
  });
  if (error) throw new Error(await describeFunctionError(error));
  return data!;
}

/**
 * xbox-import has no structured error codes (no private-profile case): every failure is
 * `{ error: "<human message>" }`. It writes hours as 0 for every game, because play time needs
 * a call nobody built, so the app must not show hours for xbox-sourced rows.
 * A big library is slow: titles the id bridge misses cost one catalog search each.
 */
export async function importXboxLibrary(): Promise<XboxImportResult> {
  const { data, error } = await supabase.functions.invoke<XboxImportResult>('xbox-import', { method: 'POST' });
  if (error) throw new Error(await describeFunctionError(error));
  return data!;
}
