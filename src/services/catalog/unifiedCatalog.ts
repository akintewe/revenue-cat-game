import { findCatalogGame, searchCatalog, type CatalogGame } from '../../data/catalog';
import { isUuid } from '../../shared/utils/id';
import {
  fetchRemotePopularGames,
  fetchRemoteRecentlyViewed,
  getRemoteCatalogGame,
  searchRemoteCatalog,
  type SearchFilters,
} from './remoteCatalog';
import { normalizeRemoteGame } from './normalize';
import { fetchRemoteWatchedGames } from '../events/remoteGameWatches';
import type { WatchedGame } from '../../features/events/types';
import {
  createVagueSearchJob,
  fetchVagueSearchJob,
  type RemoteVagueSearchJob,
  type VagueSearchStatus,
} from './remoteVagueSearch';

/** Caches normalized remote lookups so repeat views (and every consumer of useResolvedGames) don't refetch. */
const remoteCache = new Map<string, CatalogGame>();

/**
 * The small local demo catalog uses plain slugs, but the real library_entries table has a
 * uuid foreign key into the live catalog — a slug id can't be written there. Resolves a demo
 * game to its real backend id by title, for the rare case one still turns up in search results.
 */
export async function resolveRemoteId(title: string): Promise<string | null> {
  try {
    const results = await searchRemoteCatalog(title);
    const exact = results.find((game) => game.title.toLowerCase() === title.toLowerCase());
    return (exact ?? results[0])?.id ?? null;
  } catch {
    return null;
  }
}

/**
 * Resolves a catalogId to a game, checking the small local demo catalog first
 * (instant, no network) and falling back to the live backend for real IGDB ids.
 *
 * Pass `track: true` only when this resolution IS the user opening a game's detail
 * screen — it records a view server-side. A cached result is skipped in that case so
 * the tracked request always actually reaches the server, even for a game whose
 * metadata was already resolved untracked (e.g. from a list row) earlier.
 */
export async function resolveCatalogGame(id: string, options?: { track?: boolean }): Promise<CatalogGame | undefined> {
  const local = findCatalogGame(id);
  if (local) return local;

  const track = options?.track ?? false;
  if (!track && remoteCache.has(id)) return remoteCache.get(id);

  try {
    const remote = await getRemoteCatalogGame(id, { track });
    if (!remote) return undefined;
    const normalized = normalizeRemoteGame(remote);
    remoteCache.set(id, normalized);
    return normalized;
  } catch {
    return undefined;
  }
}

export type GameDetailResult = {
  game: CatalogGame;
  /** Always false for the small local demo catalog — those aren't real DB rows. */
  watching: boolean;
  watcherCount: number;
};

/**
 * Like `resolveCatalogGame`, but also surfaces the per-user `watching`/`watcherCount`
 * fields `/games/:id` returns — deliberately a separate function rather than widening
 * `resolveCatalogGame`'s return shape, since that one is cached and shared across 20+
 * call sites that have nothing to do with a specific user's watch state. Used only by
 * GameDetailScreen, the one screen that needs this.
 */
export async function fetchGameDetail(id: string, options?: { track?: boolean }): Promise<GameDetailResult | undefined> {
  const local = findCatalogGame(id);
  if (local) return { game: local, watching: false, watcherCount: 0 };

  try {
    const remote = await getRemoteCatalogGame(id, { track: options?.track ?? false });
    if (!remote) return undefined;
    const normalized = normalizeRemoteGame(remote);
    remoteCache.set(id, normalized);
    return { game: normalized, watching: remote.watching ?? false, watcherCount: remote.watcherCount ?? 0 };
  } catch {
    return undefined;
  }
}

/** Release-Day Tracker's watched-games list — full catalog rows, upcoming-soonest first (server-ordered). */
export async function fetchWatchedGames(): Promise<WatchedGame[]> {
  const remote = await fetchRemoteWatchedGames();
  return remote.map(({ game, watchedAt, watcherCount }) => {
    const normalized = normalizeRemoteGame(game);
    remoteCache.set(normalized.id, normalized);
    return { game: normalized, watchedAt, watcherCount };
  });
}

/** The server-tracked recently-viewed rail — newest first, populated only by real detail-screen opens. */
export async function fetchRecentlyViewed(limit: number, offset = 0): Promise<CatalogGame[]> {
  try {
    const remote = await fetchRemoteRecentlyViewed(limit, offset);
    const normalized = remote.map(normalizeRemoteGame);
    normalized.forEach((game) => remoteCache.set(game.id, game));
    return normalized;
  } catch {
    return [];
  }
}

export type CatalogSearchResult = {
  games: CatalogGame[];
  /** Set when the live search failed (e.g. not signed in yet) — local demo results still come back. */
  remoteError: string | null;
};

/**
 * Searches the local demo catalog (instant) and the live 89k-game backend, merged and deduped.
 * Any filter active hands the query entirely to the backend — the tiny local catalog has no way
 * to honor genre/device/date filters, so it would just show unfiltered noise alongside real results.
 */
export async function searchAllCatalog(query: string, filters?: SearchFilters): Promise<CatalogSearchResult> {
  const hasFilters = Boolean(filters && Object.keys(filters).length > 0);
  const localResults = hasFilters ? [] : searchCatalog(query);

  if (!query.trim()) {
    return { games: localResults, remoteError: null };
  }

  try {
    const remoteResults = await searchRemoteCatalog(query, filters);
    const normalized = remoteResults.map(normalizeRemoteGame);
    normalized.forEach((game) => remoteCache.set(game.id, game));
    const localIds = new Set(localResults.map((game) => game.id));
    return { games: [...localResults, ...normalized.filter((game) => !localIds.has(game.id))], remoteError: null };
  } catch (err) {
    return { games: localResults, remoteError: err instanceof Error ? err.message : 'Search failed' };
  }
}

export type PopularSuggestionsResult = {
  games: CatalogGame[];
  /** Set when the live call failed (e.g. not signed in). */
  error: string | null;
  /** Pass back as `startOffset` to fetch the next page — accounts for owned games filtered out along the way. */
  nextOffset: number;
  /** True once the server has nothing left to give, regardless of the requested limit. */
  exhausted: boolean;
};

/**
 * Real trending games from GET /games/popular — most-rated first, skipping anything
 * already owned. Pages forward internally if a page is entirely excluded games, and
 * accepts `startOffset` so a caller can request more results for infinite scroll.
 */
export async function fetchPopularSuggestions(
  excludeIds: Set<string>,
  limit: number,
  startOffset = 0,
): Promise<PopularSuggestionsResult> {
  const games: CatalogGame[] = [];
  let offset = startOffset;
  let exhausted = false;
  const PAGE_SIZE = Math.max(limit * 2, 20);
  const MAX_PAGES = 5;

  try {
    for (let page = 0; page < MAX_PAGES && games.length < limit; page++) {
      const remoteResults = await fetchRemotePopularGames(PAGE_SIZE, offset);
      if (remoteResults.length === 0) {
        exhausted = true;
        break;
      }
      offset += remoteResults.length;

      for (const remote of remoteResults) {
        if (excludeIds.has(remote.id)) continue;
        const normalized = normalizeRemoteGame(remote);
        remoteCache.set(normalized.id, normalized);
        games.push(normalized);
        if (games.length >= limit) break;
      }
    }
    return { games, error: null, nextOffset: offset, exhausted };
  } catch (err) {
    return { games, error: err instanceof Error ? err.message : 'Could not reach the catalog', nextOffset: offset, exhausted };
  }
}

export type VagueSearchJob = {
  id: string;
  status: VagueSearchStatus;
  query: string;
  candidates: CatalogGame[];
  confidence: number | null;
  fromCache: boolean;
  error: string | null;
};

function normalizeVagueSearchJob(job: RemoteVagueSearchJob): VagueSearchJob {
  const candidates = job.candidates.map((remote) => {
    const normalized = normalizeRemoteGame(remote);
    remoteCache.set(normalized.id, normalized);
    return normalized;
  });
  return {
    id: job.id,
    status: job.status,
    query: job.query,
    candidates,
    confidence: job.confidence,
    fromCache: job.fromCache,
    error: job.error,
  };
}

export async function startVagueSearch(query: string): Promise<VagueSearchJob> {
  return normalizeVagueSearchJob(await createVagueSearchJob(query));
}

export async function pollVagueSearch(jobId: string): Promise<VagueSearchJob> {
  return normalizeVagueSearchJob(await fetchVagueSearchJob(jobId));
}
