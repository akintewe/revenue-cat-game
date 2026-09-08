import { supabase } from '../supabase/client';
import type { RemoteCatalogGame } from './types';

/**
 * Live catalog search against the IGDB-backed Supabase functions (89k+ games).
 * Requires a signed-in user — the functions reject anon-only requests with 401.
 * `functions.invoke` attaches the current session's token automatically.
 */
export async function searchRemoteCatalog(query: string): Promise<RemoteCatalogGame[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const { data, error } = await supabase.functions.invoke<RemoteCatalogGame[]>(
    `search?q=${encodeURIComponent(trimmed)}`,
    { method: 'GET' },
  );
  if (error) throw error;
  return data ?? [];
}

export async function getRemoteCatalogGame(id: string): Promise<RemoteCatalogGame | null> {
  const { data, error } = await supabase.functions.invoke<RemoteCatalogGame>(`games/${id}`, {
    method: 'GET',
  });
  if (error) throw error;
  return data ?? null;
}
