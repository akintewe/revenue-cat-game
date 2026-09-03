import type { LibraryEntry } from '../../library/types';
import { findCatalogGame } from '../../../data/catalog';
import type { Stamp } from '../types';

const LOGGED_TIERS = [1, 10, 25, 50, 100];
const BEATEN_TIERS = [1, 10, 25];
const GENRE_TIERS = [3, 5, 10];
const PLATFORM_LOYALTY_TIERS = [5, 10, 20];

function buildTierStamps(
  category: Stamp['category'],
  idPrefix: string,
  tiers: number[],
  progress: number,
  icon: Stamp['icon'],
  titleFor: (tier: number) => string,
  descriptionFor: (tier: number) => string,
): Stamp[] {
  return tiers.map((tier) => ({
    id: `${idPrefix}-${tier}`,
    category,
    title: titleFor(tier),
    description: descriptionFor(tier),
    icon,
    target: tier,
    progress: Math.min(progress, tier),
    earned: progress >= tier,
  }));
}

export function computeStamps(entries: LibraryEntry[]): Stamp[] {
  const games = entries
    .map((entry) => findCatalogGame(entry.catalogId))
    .filter((game): game is NonNullable<typeof game> => Boolean(game));

  const beatenCount = entries.filter((entry) => entry.status === 'beaten').length;
  const genreCount = new Set(games.map((game) => game.genre)).size;

  const platformCounts = new Map<string, number>();
  for (const game of games) {
    platformCounts.set(game.platform, (platformCounts.get(game.platform) ?? 0) + 1);
  }
  const topPlatformCount = Math.max(0, ...platformCounts.values());
  const topPlatform = [...platformCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];

  return [
    ...buildTierStamps(
      'logged',
      'logged',
      LOGGED_TIERS,
      entries.length,
      'library',
      (tier) => `${tier} Logged`,
      (tier) => `Add ${tier} game${tier === 1 ? '' : 's'} to your library.`,
    ),
    ...buildTierStamps(
      'beaten',
      'beaten',
      BEATEN_TIERS,
      beatenCount,
      'trophy',
      (tier) => `${tier} Beaten`,
      (tier) => `Mark ${tier} game${tier === 1 ? '' : 's'} as beaten.`,
    ),
    ...buildTierStamps(
      'genres',
      'genres',
      GENRE_TIERS,
      genreCount,
      'shapes',
      (tier) => `${tier} Genres Explored`,
      (tier) => `Log games across ${tier} different genres.`,
    ),
    ...buildTierStamps(
      'platform',
      'platform',
      PLATFORM_LOYALTY_TIERS,
      topPlatformCount,
      'game-controller',
      (tier) => `${tier}x ${topPlatform ?? 'Platform'} Loyalist`,
      (tier) => `Log ${tier} games on the same platform.`,
    ),
  ];
}
