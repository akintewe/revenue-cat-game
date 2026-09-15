import { supabase } from '../supabase/client';
import type { RemoteCatalogGame } from './types';

export type SearchDevice = 'playstation' | 'xbox' | 'nintendo' | 'pc' | 'mobile';
export type SearchSort = 'best_match' | 'popular' | 'rating' | 'recent' | 'alpha';

export type SearchFilters = {
  /** A slug from genre_pills (e.g. 'platformer') — not an IGDB genre name. */
  genre?: string;
  device?: SearchDevice;
  /** YYYY-MM-DD, both bounds inclusive. */
  releaseFrom?: string;
  releaseTo?: string;
  sort?: SearchSort;
  sortDir?: 'asc' | 'desc';
};

/**
 * Live catalog search against the IGDB-backed Supabase functions (89k+ games).
 * Requires a signed-in user — the functions reject anon-only requests with 401.
 * `functions.invoke` attaches the current session's token automatically.
 */
export async function searchRemoteCatalog(
  query: string,
  filters?: SearchFilters,
): Promise<RemoteCatalogGame[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const params = new URLSearchParams({ q: trimmed });
  if (filters?.genre) params.set('genre', filters.genre);
  if (filters?.device) params.set('device', filters.device);
  if (filters?.releaseFrom) params.set('releaseFrom', filters.releaseFrom);
  if (filters?.releaseTo) params.set('releaseTo', filters.releaseTo);
  if (filters?.sort) params.set('sort', filters.sort);
  if (filters?.sortDir) params.set('sortDir', filters.sortDir);

  const { data, error } = await supabase.functions.invoke<RemoteCatalogGame[]>(
    `search?${params.toString()}`,
    { method: 'GET' },
  );
  if (error) throw error;
  return data ?? [];
}

/** The live, servable genre pills — never hardcode this list, it can change server-side. */
export async function fetchGenrePills(): Promise<string[]> {
  const { data, error } = await supabase.from('genre_pills').select('pill');
  if (error) throw error;
  return Array.from(new Set((data ?? []).map((row) => row.pill as string)));
}

export async function getRemoteCatalogGame(id: string): Promise<RemoteCatalogGame | null> {
  const { data, error } = await supabase.functions.invoke<RemoteCatalogGame>(`games/${id}`, {
    method: 'GET',
  });
  if (error) throw error;
  return data ?? null;
}

/** Real trending games — ordered by IGDB rating-count, most-rated first. Paginated; not infinite. */
export async function fetchRemotePopularGames(
  limit: number,
  offset = 0,
): Promise<RemoteCatalogGame[]> {
  const { data, error } = await supabase.functions.invoke<RemoteCatalogGame[]>(
    `games/popular?limit=${limit}&offset=${offset}`,
    { method: 'GET' },
  );
  if (error) throw error;
  return data ?? [];
}
