import { findCatalogGame, searchCatalog, type CatalogGame } from '../../data/catalog';
import { getRemoteCatalogGame, searchRemoteCatalog } from './remoteCatalog';
import { normalizeRemoteGame } from './normalize';

// There's no "browse popular" endpoint on the backend (89k games, search-only by design),
// so "Explore popular" is seeded by searching a handful of broadly recognizable titles and
// taking the top hit from each — a stand-in for real trending data.
const POPULAR_SEED_QUERIES = [
  'The Legend of Zelda',
  'Grand Theft Auto',
  'Minecraft',
  'Spider-Man',
  "Baldur's Gate",
  'God of War',
  'The Witcher',
  'Red Dead Redemption',
  'Final Fantasy',
  'Call of Duty',
  'Resident Evil',
  'Elden Ring',
  'Assassin\'s Creed',
  'Mario Kart',
  'Halo',
];

/** Caches normalized remote lookups so repeat views (and every consumer of useResolvedGames) don't refetch. */
const remoteCache = new Map<string, CatalogGame>();

/**
 * Resolves a catalogId to a game, checking the small local demo catalog first
 * (instant, no network) and falling back to the live backend for real IGDB ids.
 */
export async function resolveCatalogGame(id: string): Promise<CatalogGame | undefined> {
  const local = findCatalogGame(id);
  if (local) return local;

  if (remoteCache.has(id)) return remoteCache.get(id);

  try {
    const remote = await getRemoteCatalogGame(id);
    if (!remote) return undefined;
    const normalized = normalizeRemoteGame(remote);
    remoteCache.set(id, normalized);
    return normalized;
  } catch {
    return undefined;
  }
}

export type CatalogSearchResult = {
  games: CatalogGame[];
  /** Set when the live search failed (e.g. not signed in yet) — local demo results still come back. */
  remoteError: string | null;
};

/** Searches the local demo catalog (instant) and the live 89k-game backend, merged and deduped. */
export async function searchAllCatalog(query: string): Promise<CatalogSearchResult> {
  const localResults = searchCatalog(query);

  if (!query.trim()) {
    return { games: localResults, remoteError: null };
  }

  try {
    const remoteResults = await searchRemoteCatalog(query);
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
  /** Set only if every seed query failed (e.g. not signed in) — a single bad query is skipped silently. */
  error: string | null;
};

/**
 * Pulls a small "Explore popular" shelf from the live catalog by searching a fixed set of
 * well-known titles and taking the top hit from each, skipping anything already owned.
 */
export async function fetchPopularSuggestions(
  excludeIds: Set<string>,
  limit: number,
): Promise<PopularSuggestionsResult> {
  const results = await Promise.allSettled(POPULAR_SEED_QUERIES.map((q) => searchRemoteCatalog(q)));

  const games: CatalogGame[] = [];
  const seen = new Set<string>();
  let failures = 0;

  for (const result of results) {
    if (result.status === 'rejected') {
      failures += 1;
      continue;
    }
    const top = result.value.find((game) => !excludeIds.has(game.id) && !seen.has(game.id));
    if (!top) continue;
    const normalized = normalizeRemoteGame(top);
    remoteCache.set(normalized.id, normalized);
    seen.add(normalized.id);
    games.push(normalized);
    if (games.length >= limit) break;
  }

  return {
    games,
    error: failures === POPULAR_SEED_QUERIES.length ? 'Could not reach the catalog' : null,
  };
}
