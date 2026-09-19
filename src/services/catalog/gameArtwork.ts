import { supabase } from '../supabase/client';

/**
 * Real IGDB key art (screenshot, falling back to artwork) for a game — an upgrade
 * path over the free blurred-cover background every screen already has. Empty
 * string is a real, cached "IGDB has nothing" answer, not an error. See
 * quick-view-card-for-sola.md §2 — call this deliberately (games actually on
 * screen), never speculatively (a long scrollback).
 */

const cache = new Map<string, string>();

async function fetchRemoteArtwork(gameIds: string[]): Promise<Record<string, string>> {
  const { data, error } = await supabase.functions.invoke<{ artwork: Record<string, string> }>('game-artwork', {
    method: 'POST',
    body: { gameIds },
  });
  if (error) throw error;
  return data?.artwork ?? {};
}

/** Up to 50 ids per call — batch a screen's worth of games, not one call per card. */
export async function fetchGameArtwork(gameIds: string[]): Promise<Record<string, string>> {
  const uncached = gameIds.filter((id) => !cache.has(id));
  if (uncached.length > 0) {
    try {
      const artwork = await fetchRemoteArtwork(uncached.slice(0, 50));
      uncached.forEach((id) => cache.set(id, artwork[id] ?? ''));
    } catch {
      // Leave uncached ids unset — caller falls back per-id (no cache entry = unknown, not "no art").
      return Object.fromEntries(gameIds.filter((id) => cache.has(id)).map((id) => [id, cache.get(id)!]));
    }
  }
  return Object.fromEntries(gameIds.map((id) => [id, cache.get(id) ?? '']));
}

/** Single-game convenience for the long-press quick-view card. */
export async function fetchGameArtworkFor(gameId: string): Promise<string> {
  const result = await fetchGameArtwork([gameId]);
  return result[gameId] ?? '';
}
