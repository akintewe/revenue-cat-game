import { supabase } from '../supabase/client';
import type { RemoteCatalogGame } from '../catalog/types';

/**
 * Release-Day Tracker's raw backing data — `game_watches` is a direct PostgREST
 * table (RLS-scoped, own-rows-only), written straight through like
 * `wishlist_entries` and `follows`. See FRIENDS_FEED_BACKEND.md's sibling doc,
 * events-screen (1).md §4b.
 */

type RemoteWatchedGameRow = {
  game: RemoteCatalogGame;
  watchedAt: string;
  watcherCount: number;
};

/** `GET /games/watching` — full catalog rows the user is watching, upcoming-soonest first. */
export async function fetchRemoteWatchedGames(): Promise<RemoteWatchedGameRow[]> {
  const { data, error } = await supabase.functions.invoke<RemoteWatchedGameRow[]>('games/watching', {
    method: 'GET',
  });
  if (error) throw error;
  return data ?? [];
}

export async function insertGameWatch(gameId: string): Promise<void> {
  // user_id defaults to the signed-in user server-side — do not pass it.
  const { error } = await supabase.from('game_watches').insert({ game_id: gameId });
  // 23505 = already watching (unique on user_id+game_id) — desired state already holds.
  if (error && error.code !== '23505') throw error;
}

export async function deleteGameWatch(gameId: string): Promise<void> {
  const { error } = await supabase.from('game_watches').delete().eq('game_id', gameId);
  if (error) throw error;
}
