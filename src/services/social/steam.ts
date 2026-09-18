import { supabase } from '../supabase/client';

export type PlatformAccount = {
  user_id: string;
  platform: 'steam' | 'xbox' | 'psn';
  external_id: string;
  display_name: string | null;
  avatar_url: string | null;
  linked_at: string;
  last_import_at: string | null;
  last_import_total: number | null;
  last_import_matched: number | null;
};

export type SteamImportResult = {
  total: number;
  matched: number;
  inserted: number;
  updated: number;
  viaParent: number;
  /** Capped at 50 — a debugging sample, not a complete list. */
  unmatched: string[];
};

/** Thrown by importSteamLibrary when the user's Steam "Game details" privacy isn't Public. */
export class SteamProfilePrivateError extends Error {
  fixUrl: string;
  constructor(message: string, fixUrl: string) {
    super(message);
    this.name = 'SteamProfilePrivateError';
    this.fixUrl = fixUrl;
  }
}

/** Reads the caller's own platform connections — owner-only via RLS. */
export async function fetchPlatformAccounts(): Promise<PlatformAccount[]> {
  const { data, error } = await supabase.from('platform_accounts').select('*');
  if (error) throw error;
  return data ?? [];
}

/** Step 1 — returns the Steam URL to open and the nonce step 3 is called with. */
export async function startSteamLink(): Promise<{ redirectUrl: string; nonce: string }> {
  const { data, error } = await supabase.functions.invoke<{ redirectUrl: string; nonce: string }>(
    'steam-link-start',
    { method: 'POST' },
  );
  if (error) throw new Error(await describeFunctionError(error));
  return data!;
}

/** Step 3 — only call once the prysm://link/steam redirect carries status=ok. */
export async function finishSteamLink(nonce: string): Promise<PlatformAccount> {
  const { data, error } = await supabase.functions.invoke<PlatformAccount>('steam-link-finish', {
    method: 'POST',
    body: { nonce },
  });
  if (error) throw new Error(await describeFunctionError(error));
  return data!;
}

/** Pulls (or re-syncs) the linked Steam library into the shelf. Safe to re-run. */
export async function importSteamLibrary(): Promise<SteamImportResult> {
  const { data, error } = await supabase.functions.invoke<SteamImportResult>('steam-import', {
    method: 'POST',
  });
  if (error) {
    const body = await readFunctionErrorBody(error);
    if (body?.error === 'steam_profile_private') {
      throw new SteamProfilePrivateError(
        body.message ?? 'This Steam profile is private.',
        body.fixUrl ?? 'https://steamcommunity.com/my/edit/settings',
      );
    }
    throw new Error(body?.error ?? (error instanceof Error ? error.message : 'Import failed.'));
  }
  return data!;
}

export async function disconnectSteam(): Promise<number> {
  const { data, error } = await supabase.rpc('shelf_disconnect_platform', { p_platform: 'steam' });
  if (error) throw error;
  return data?.[0]?.removed_entries ?? 0;
}

/** supabase-js only guarantees a generic message on a non-2xx function response — the real
 * `{ error, message, fixUrl }` body has to be read off the underlying Response ourselves. */
export async function readFunctionErrorBody(
  error: unknown,
): Promise<{ error?: string; message?: string; fixUrl?: string } | null> {
  const context = (error as { context?: Response })?.context;
  if (!context || typeof context.json !== 'function') return null;
  try {
    return await context.json();
  } catch {
    return null;
  }
}

/** Best-effort human-readable message for a functions.invoke error — real body if we can read it. */
export async function describeFunctionError(error: unknown): Promise<string> {
  const body = await readFunctionErrorBody(error);
  if (body?.error) return body.error;
  if (error instanceof Error) return error.message;
  return 'Something went wrong.';
}
