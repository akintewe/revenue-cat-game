import type { CatalogGame } from '../../../data/catalog';
import type { WishlistEntry } from '../../wishlist/types';
import { coverFields, coverFileFor } from './cover';
import { daysUntil } from './days';
import type { CountdownItem } from './types';

/** The medium widget shows a hero and up to three more covers. */
export const COUNTDOWN_MAX = 4;
export { coverFileFor };

/**
 * "Hollow Knight: Silksong" reads as "Silksong" on a small widget. A subtitle is used only when
 * it can stand alone: at least four characters, and not a bare edition or sequel number.
 */
export function shortTitleFor(title: string): string {
  const parts = title.split(/:\s+|\s+[–—-]\s+/);
  const last = parts[parts.length - 1].trim();
  if (parts.length < 2 || last.length < 4 || /^(part|episode|chapter|vol(ume)?\.?)?\s*[\divxlc]+$/i.test(last)) {
    return title;
  }
  return last;
}

/** Wishlisted games that are not out yet, soonest first. */
export function buildCountdown(
  entries: WishlistEntry[],
  games: Record<string, CatalogGame | undefined>,
  now: Date,
): CountdownItem[] {
  const items: CountdownItem[] = [];
  for (const entry of entries) {
    const game = games[entry.catalogId];
    if (!game?.releaseDate) continue;
    const days = daysUntil(game.releaseDate, now);
    if (Number.isNaN(days) || days < 0) continue;
    items.push({
      catalogId: game.id,
      title: game.title,
      shortTitle: shortTitleFor(game.title),
      releaseDate: game.releaseDate.slice(0, 10),
      ...coverFields(game),
    });
  }
  items.sort((a, b) => a.releaseDate.localeCompare(b.releaseDate) || a.title.localeCompare(b.title));
  return items.slice(0, COUNTDOWN_MAX);
}
