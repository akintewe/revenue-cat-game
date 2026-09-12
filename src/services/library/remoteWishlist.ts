import { supabase } from '../supabase/client';
import type { WishlistEntry } from '../../features/wishlist/types';

/**
 * Real, synced wishlist — direct Postgres access to `wishlist_entries` via PostgREST,
 * scoped by row-level security to the signed-in user. Same shape as the library:
 * no edge function, owner-only by RLS. See technical-notes-for-sola.md §2.
 */

type WishlistRow = {
  game_id: string;
  reminder_enabled: boolean;
  added_at: string;
};

const WISHLIST_COLUMNS = 'game_id, reminder_enabled, added_at';

function rowToEntry(row: WishlistRow): WishlistEntry {
  return {
    catalogId: row.game_id,
    reminderEnabled: row.reminder_enabled,
    addedAt: new Date(row.added_at).getTime(),
  };
}

export async function fetchWishlistEntries(): Promise<WishlistEntry[]> {
  const { data, error } = await supabase
    .from('wishlist_entries')
    .select(WISHLIST_COLUMNS)
    .order('added_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(rowToEntry);
}

export async function insertWishlistEntry(gameId: string): Promise<WishlistEntry | null> {
  // user_id defaults to the signed-in user server-side — do not pass it.
  const { data, error } = await supabase
    .from('wishlist_entries')
    .insert({ game_id: gameId })
    .select(WISHLIST_COLUMNS)
    .single();
  if (error) {
    // 23505 = already wishlisted (unique on user_id+game_id) — the desired state
    // already holds, so this isn't a real failure. A concurrent hydrate can race
    // this on reload and hit it even though nothing is actually wrong.
    if (error.code === '23505') return null;
    throw error;
  }
  return rowToEntry(data);
}

export async function deleteWishlistEntry(gameId: string): Promise<void> {
  const { error } = await supabase.from('wishlist_entries').delete().eq('game_id', gameId);
  if (error) throw error;
}

export async function setWishlistReminder(gameId: string, enabled: boolean): Promise<void> {
  const { error } = await supabase
    .from('wishlist_entries')
    .update({ reminder_enabled: enabled })
    .eq('game_id', gameId);
  if (error) throw error;
}
