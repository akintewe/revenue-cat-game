import { supabase } from '../supabase/client';
import type { SeasonalChallenge } from '../../features/events/types';

/**
 * Seasonal Challenge — team-authored only (no insert/update/delete policy exists
 * server-side by design). `shelf_challenges()` returns the row as stored plus a
 * computed `status` and the caller's own progress. See events-screen (1).md §3.
 */

type ChallengeRow = {
  id: string;
  title: string;
  description: string;
  start_date: string;
  end_date: string;
  status: SeasonalChallenge['status'];
  my_progress: { count: number; target: number };
};

function rowToChallenge(row: ChallengeRow): SeasonalChallenge {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    startDate: row.start_date,
    endDate: row.end_date,
    status: row.status,
    myProgress: row.my_progress,
  };
}

export async function fetchSeasonalChallenges(): Promise<SeasonalChallenge[]> {
  const { data, error } = await supabase.rpc('shelf_challenges');
  if (error) throw error;
  return ((data ?? []) as ChallengeRow[]).map(rowToChallenge);
}
