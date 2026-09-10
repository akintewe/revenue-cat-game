import { supabase } from '../supabase/client';
import type { GameStatus, LibraryEntry } from '../../features/library/types';

/**
 * Real, synced library — direct Postgres access to `library_entries` via PostgREST,
 * scoped by row-level security to the signed-in user. No edge function involved.
 * See the Shelf backend API reference, "The library" section.
 */

type LibraryRow = {
  game_id: string;
  status: GameStatus;
  rating: number | null;
  notes: string | null;
  hours_played: number | null;
  added_at: string;
};

const LIBRARY_COLUMNS = 'game_id, status, rating, notes, hours_played, added_at';

function rowToEntry(row: LibraryRow): LibraryEntry {
  return {
    catalogId: row.game_id,
    status: row.status,
    rating: row.rating,
    notes: row.notes ?? '',
    hoursPlayed: row.hours_played,
    addedAt: new Date(row.added_at).getTime(),
  };
}

export async function fetchLibraryEntries(): Promise<LibraryEntry[]> {
  const { data, error } = await supabase
    .from('library_entries')
    .select(LIBRARY_COLUMNS)
    .order('added_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(rowToEntry);
}

export async function insertLibraryEntry(userId: string, gameId: string): Promise<LibraryEntry> {
  const { data, error } = await supabase
    .from('library_entries')
    .insert({ user_id: userId, game_id: gameId, status: 'backlog', source_kind: 'search' })
    .select(LIBRARY_COLUMNS)
    .single();
  if (error) throw error;
  return rowToEntry(data);
}

export async function deleteLibraryEntry(userId: string, gameId: string): Promise<void> {
  const { error } = await supabase
    .from('library_entries')
    .delete()
    .eq('user_id', userId)
    .eq('game_id', gameId);
  if (error) throw error;
}

type LibraryPatch = Partial<{
  status: GameStatus;
  rating: number | null;
  notes: string;
  hours_played: number | null;
  finished_at: string | null;
}>;

export async function updateLibraryEntry(
  userId: string,
  gameId: string,
  patch: LibraryPatch,
): Promise<void> {
  const { error } = await supabase
    .from('library_entries')
    .update(patch)
    .eq('user_id', userId)
    .eq('game_id', gameId);
  if (error) throw error;
}
