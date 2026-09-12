import { supabase } from '../supabase/client';
import { normalizeRemoteGame } from '../catalog/normalize';
import type { RemoteCatalogGame } from '../catalog/types';
import type { CatalogGame } from '../../data/catalog';

export type ShareProvider = 'tiktok' | 'youtube' | 'other' | null;

export type ShareResolution = {
  intakeId: string;
  provider: ShareProvider;
  extractedText: string | null;
  confident: boolean;
  candidates: CatalogGame[];
};

type ShareResolveResponse = {
  intakeId: string;
  provider: ShareProvider;
  extractedText: string | null;
  confident: boolean;
  candidates: RemoteCatalogGame[];
};

/** Turns a shared TikTok/YouTube link into candidate games. Never writes to the library. */
export async function resolveShare(url: string): Promise<ShareResolution> {
  const { data, error } = await supabase.functions.invoke<ShareResolveResponse>('share-resolve', {
    method: 'POST',
    body: { url },
  });
  if (error) throw error;
  return {
    intakeId: data!.intakeId,
    provider: data!.provider,
    extractedText: data!.extractedText,
    confident: data!.confident,
    candidates: (data!.candidates ?? []).map(normalizeRemoteGame),
  };
}

/** The only path that writes a shared game into the library — always a deliberate tap, never automatic. */
export async function confirmShare(intakeId: string, gameId: string): Promise<void> {
  const { error } = await supabase.functions.invoke('share-confirm', {
    method: 'POST',
    body: { intakeId, gameId },
  });
  if (error) throw error;
}
