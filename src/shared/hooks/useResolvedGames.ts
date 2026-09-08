import { useEffect, useState } from 'react';
import type { CatalogGame } from '../../data/catalog';
import { resolveCatalogGame } from '../../services/catalog/unifiedCatalog';

type ResolvedGames = {
  games: CatalogGame[];
  /** True while any id in the list hasn't resolved yet (e.g. a remote fetch in flight). */
  loading: boolean;
};

/**
 * Resolves a list of catalogIds to games, checking the local demo catalog first
 * and fetching anything else from the live backend. Local ids resolve on the
 * first render; remote ids appear once their fetch completes.
 */
export function useResolvedGames(ids: string[]): ResolvedGames {
  const key = ids.join(',');
  // null = attempted but not found (still "resolved", just no game) — distinct from
  // "not yet attempted" so a missing id doesn't leave `loading` stuck forever.
  const [resolved, setResolved] = useState<Record<string, CatalogGame | null>>({});

  useEffect(() => {
    let cancelled = false;
    const missing = ids.filter((id) => !(id in resolved));
    if (missing.length === 0) return;

    Promise.all(missing.map((id) => resolveCatalogGame(id))).then((games) => {
      if (cancelled) return;
      setResolved((prev) => {
        const next = { ...prev };
        missing.forEach((id, index) => {
          next[id] = games[index] ?? null;
        });
        return next;
      });
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return {
    games: ids.map((id) => resolved[id]).filter((game): game is CatalogGame => Boolean(game)),
    loading: ids.some((id) => !(id in resolved)),
  };
}
