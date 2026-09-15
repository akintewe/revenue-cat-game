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
};

/**
 * Real trending games from GET /games/popular — most-rated first, skipping anything
 * already owned. Pages forward if a page is entirely excluded games.
 */
export async function fetchPopularSuggestions(
  excludeIds: Set<string>,
  limit: number,
): Promise<PopularSuggestionsResult> {
  const games: CatalogGame[] = [];
  let offset = 0;
  const PAGE_SIZE = Math.max(limit * 2, 20);
  const MAX_PAGES = 5;

  try {
    for (let page = 0; page < MAX_PAGES && games.length < limit; page++) {
      const remoteResults = await fetchRemotePopularGames(PAGE_SIZE, offset);
      if (remoteResults.length === 0) break;
      offset += remoteResults.length;

      for (const remote of remoteResults) {
        if (excludeIds.has(remote.id)) continue;
        const normalized = normalizeRemoteGame(remote);
        remoteCache.set(normalized.id, normalized);
        games.push(normalized);
        if (games.length >= limit) break;
      }
    }
    return { games, error: null };
  } catch (err) {
    return { games, error: err instanceof Error ? err.message : 'Could not reach the catalog' };
  }
}
