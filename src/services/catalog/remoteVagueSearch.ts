import { supabase } from '../supabase/client';
import type { RemoteCatalogGame } from './types';

/**
 * "The one where you play a bald assassin with a barcode tattoo" — names a game
 * from a vague description. Two calls, not one: naming a game takes a median of
 * 25.7s (p90 68.8s, max measured 227.5s), longer than an edge function is allowed
 * to run, so it creates a job and the client polls it. See time-to-beat-for-sola.md §2.
 */

export type VagueSearchStatus = 'pending' | 'processing' | 'done' | 'error';

export type RemoteVagueSearchJob = {
  id: string;
  status: VagueSearchStatus;
  query: string;
  candidates: RemoteCatalogGame[];
  /** Unthresholded, as the model returned it. Null until status is 'done'. */
  confidence: number | null;
  fromCache: boolean;
  error: string | null;
  createdAt: string;
  completedAt: string | null;
};

/** Creates the job. Server floor is 4 characters. */
export async function createVagueSearchJob(query: string): Promise<RemoteVagueSearchJob> {
  const { data, error } = await supabase.functions.invoke<RemoteVagueSearchJob>('vague-search', {
    method: 'POST',
    body: { query },
  });
  if (error) throw error;
  if (!data) throw new Error('No job returned');
  return data;
}

export async function fetchVagueSearchJob(jobId: string): Promise<RemoteVagueSearchJob> {
  const { data, error } = await supabase.functions.invoke<RemoteVagueSearchJob>(`vague-search?job=${jobId}`, {
    method: 'GET',
  });
  if (error) throw error;
  if (!data) throw new Error('No job returned');
  return data;
}
