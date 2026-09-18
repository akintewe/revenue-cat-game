import type { CatalogGame } from '../../../data/catalog';
import type { LibraryEntry } from '../../library/types';
import { coverFields } from './cover';
import type { UpNextItem } from './types';

export const UP_NEXT_MAX = 3;

/** How far along a game is, in words a person would use. `progress` is hours over time to beat. */
export function progressWord(progress: number): string {
  if (progress < 0.1) return 'just started';
  if (progress < 0.4) return 'early on';
  if (progress < 0.6) return 'about halfway';
  if (progress < 0.9) return 'past halfway';
  if (progress < 1) return 'nearly done';
  return 'past the average time';
}

function sentences(hours: number | null, timeToBeat: number | null, progress: number | null) {
  const played = hours === null ? null : `${Math.round(hours)}h`;
  const toBeat = timeToBeat === null ? null : `${Math.round(timeToBeat)}h to beat`;
  if (played === null) {
    return { summary: 'No hours logged', detail: toBeat ? `About ${toBeat}` : 'No hours logged' };
  }
  if (progress === null || toBeat === null) {
    return { summary: `${played} played`, detail: `${played} played` };
  }
  return { summary: `${played} · ${progressWord(progress)}`, detail: `${played} played · about ${toBeat}` };
}

/** Games with status `playing`, most hours first. */
export function buildUpNext(
  entries: LibraryEntry[],
  games: Record<string, CatalogGame | undefined>,
): { items: UpNextItem[]; backlogCount: number } {
  const items: UpNextItem[] = [];
  const playing = entries
    .filter((entry) => entry.status === 'playing')
    .sort((a, b) => (b.hoursPlayed ?? -1) - (a.hoursPlayed ?? -1) || b.addedAt - a.addedAt);

  for (const entry of playing) {
    if (items.length === UP_NEXT_MAX) break;
    const game = games[entry.catalogId];
    if (!game) continue;
    const hours = entry.hoursPlayed;
    const timeToBeat = game.timeToBeatHours && game.timeToBeatHours > 0 ? game.timeToBeatHours : null;
    const progress = hours !== null && timeToBeat !== null ? Math.min(hours / timeToBeat, 1) : null;
    items.push({
      catalogId: game.id,
      title: game.title,
      hoursPlayed: hours,
      timeToBeatHours: timeToBeat,
      progress,
      ...sentences(hours, timeToBeat, progress),
      ...coverFields(game),
    });
  }

  return { items, backlogCount: entries.filter((entry) => entry.status === 'backlog').length };
}
