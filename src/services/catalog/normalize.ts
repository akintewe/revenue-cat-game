import type { CatalogGame } from '../../data/catalog';
import type { Platform, RemoteCatalogGame } from './types';

// Prefer the platform someone's most likely tracking a game on. Matched against
// the `slug` values IGDB returns (see technical-notes-for-sola.md §3's Elden Ring sample).
const PLATFORM_SLUG_PRIORITY = ['ps5', 'series-x-s', 'switch-2', 'switch', 'win', 'ps4--1', 'xboxone'];

function pickPrimaryPlatform(platforms: Platform[]): string {
  if (platforms.length === 0) return 'Multi-platform';
  const ranked = [...platforms].sort((a, b) => {
    const aRank = PLATFORM_SLUG_PRIORITY.indexOf(a.slug);
    const bRank = PLATFORM_SLUG_PRIORITY.indexOf(b.slug);
    return (aRank === -1 ? 99 : aRank) - (bRank === -1 ? 99 : bRank);
  });
  return ranked[0].name;
}

/** Flattens a live IGDB-backed game into the shape every existing screen already renders. */
export function normalizeRemoteGame(remote: RemoteCatalogGame): CatalogGame {
  return {
    id: remote.id,
    title: remote.title,
    platform: pickPrimaryPlatform(remote.platforms),
    year: remote.releaseDate ? new Date(remote.releaseDate).getFullYear() : undefined,
    genre: remote.genres[0] ?? 'Game',
    abbreviation: remote.abbreviation,
    colorKey: remote.colorKey,
    releaseDate: remote.releaseDate,
    coverImageUrl: remote.coverImageUrl,
    criticScore: remote.criticScore,
    timeToBeatHours: remote.timeToBeatHours,
    // pcRequirements has no IGDB equivalent — stays undefined for every remote game.
  };
}
