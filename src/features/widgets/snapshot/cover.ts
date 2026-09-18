import type { CatalogGame } from '../../../data/catalog';
import { coverColors } from '../../../shared/theme/theme';

const FALLBACK_BLEED = '#FD5021';

/** A file name that is safe on both platforms, whatever the catalog id looks like. */
export function coverFileFor(catalogId: string): string {
  return `${catalogId.replace(/[^A-Za-z0-9_-]/g, '_')}.jpg`;
}

/** The three fields every widget item carries for its art. */
export function coverFields(game: CatalogGame): { coverFile: string | null; coverUrl: string | null; bleed: string } {
  const coverUrl = game.coverImageUrl ?? null;
  return {
    coverFile: coverUrl ? coverFileFor(game.id) : null,
    coverUrl,
    bleed: coverColors[game.colorKey] ?? FALLBACK_BLEED,
  };
}
