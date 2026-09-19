import { supabase } from '../supabase/client';
import type { GameStatus, LibraryEntry } from '../../features/library/types';

/**
 * The server-enforced free-tier cap (or a locked-row edit) — see
 * prysm-pro-for-sola.md §7.1. `reason` is the raw PostgREST `message`
 * (`free_tier_limit_reached` | `entry_locked_free_tier`); `hint` is written to be
 * shown to the user verbatim.
 */
export class LibraryLimitError extends Error {
  constructor(public reason: string, public hint: string) {
    super(hint);
  }
}

function throwIfLimitError(error: { code?: string; message: string; hint?: string | null }): never {
  if (error.code === 'PT402') {
    throw new LibraryLimitError(error.message, error.hint ?? 'Prysm Pro removes this limit.');
  }
  throw error;
}

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
  source_url: string | null;
  source_kind: LibraryEntry['sourceKind'];
  finished_at: string | null;
};

const LIBRARY_COLUMNS =
  'game_id, status, rating, notes, hours_played, added_at, source_url, source_kind, finished_at';

function rowToEntry(row: LibraryRow): LibraryEntry {
  return {
    catalogId: row.game_id,
    status: row.status,
    rating: row.rating,
    notes: row.notes ?? '',
    hoursPlayed: row.hours_played,
    addedAt: new Date(row.added_at).getTime(),
    sourceUrl: row.source_url,
    sourceKind: row.source_kind,
    finishedAt: row.finished_at ? new Date(row.finished_at).getTime() : null,
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
  if (error) throwIfLimitError(error);
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
  if (error) throwIfLimitError(error);
}
