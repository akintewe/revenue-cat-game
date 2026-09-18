import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { requestGameArtwork } from '../../../services/social/feed';

/**
 * Wide art for the game card. The feed returns games.artwork_url. When that is null, nobody
 * has asked IGDB for this game yet: this batches every such id seen in one frame into one
 * game-artwork call, which also saves the answer for everyone else.
 */
const known = new Map<string, string>();
const listeners = new Map<string, Set<() => void>>();
const queued = new Set<string>();
const inFlight = new Set<string>();
let timer: ReturnType<typeof setTimeout> | null = null;

function emit(id: string) {
  listeners.get(id)?.forEach((fn) => fn());
}

function flush() {
  timer = null;
  const ids = [...queued].slice(0, 50);
  ids.forEach((id) => {
    queued.delete(id);
    inFlight.add(id);
  });
  if (queued.size > 0) timer = setTimeout(flush, 0);
  requestGameArtwork(ids)
    .then((artwork) => {
      for (const id of ids) {
        known.set(id, artwork[id] ?? '');
        emit(id);
      }
    })
    .catch(() => {
      // Fall back to the cover for this launch. The next launch asks again.
      for (const id of ids) {
        known.set(id, '');
        emit(id);
      }
    })
    .finally(() => ids.forEach((id) => inFlight.delete(id)));
}

function subscribe(id: string, fn: () => void) {
  if (!listeners.has(id)) listeners.set(id, new Set());
  listeners.get(id)!.add(fn);
  return () => listeners.get(id)?.delete(fn);
}

/** `null` while unknown, `''` when IGDB has no art (use the cover), else the URL. */
export function useGameArtwork(gameId: string | null, fromFeed: string | null): string | null {
  const cached = useSyncExternalStore(
    useCallback((fn: () => void) => (gameId ? subscribe(gameId, fn) : () => undefined), [gameId]),
    useCallback(() => (gameId ? known.get(gameId) : undefined), [gameId]),
  );

  useEffect(() => {
    if (!gameId || fromFeed !== null || known.has(gameId) || inFlight.has(gameId)) return;
    queued.add(gameId);
    if (!timer) timer = setTimeout(flush, 16);
  }, [gameId, fromFeed]);

  return fromFeed ?? cached ?? null;
}
