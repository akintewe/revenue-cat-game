import type { CatalogGame } from '../../../data/catalog';
import type { LibraryEntry } from '../../library/types';
import { coverFields } from './cover';
import { FREE_ROLLS_PER_DAY, type RouletteItem } from './types';

/** Each pool game needs a cover on disk, so the pool is kept small. */
export const ROULETTE_POOL_MAX = 12;

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function since(addedAt: number, now: Date): string {
  const added = new Date(addedAt);
  const month = MONTHS[added.getMonth()];
  return added.getFullYear() === now.getFullYear() ? month : `${month} ${added.getFullYear()}`;
}

/** Backlog games the widget can roll from, newest first. */
export function buildRoulette(
  entries: LibraryEntry[],
  games: Record<string, CatalogGame | undefined>,
  now: Date,
): { pool: RouletteItem[]; freeRollsPerDay: number } {
  const pool: RouletteItem[] = [];
  const backlog = entries.filter((entry) => entry.status === 'backlog').sort((a, b) => b.addedAt - a.addedAt);

  for (const entry of backlog) {
    if (pool.length === ROULETTE_POOL_MAX) break;
    const game = games[entry.catalogId];
    if (!game) continue;
    const length = game.timeToBeatHours && game.timeToBeatHours > 0 ? `about ${Math.round(game.timeToBeatHours)}h · ` : '';
    pool.push({
      catalogId: game.id,
      title: game.title,
      detail: `${length}in your backlog since ${since(entry.addedAt, now)}`,
      ...coverFields(game),
    });
  }

  return { pool, freeRollsPerDay: FREE_ROLLS_PER_DAY };
}
