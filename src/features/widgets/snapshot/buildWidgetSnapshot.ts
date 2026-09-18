import type { CatalogGame } from '../../../data/catalog';
import type { LibraryEntry } from '../../library/types';
import type { WishlistEntry } from '../../wishlist/types';
import { buildCountdown } from './buildCountdown';
import { buildRoulette } from './buildRoulette';
import { buildUpNext } from './buildUpNext';
import { WIDGET_SNAPSHOT_VERSION, type WidgetSnapshot } from './types';

export type SnapshotInput = {
  wishlist: WishlistEntry[];
  library: LibraryEntry[];
  /** Resolved catalog games by id. A missing id is skipped. */
  games: Record<string, CatalogGame | undefined>;
  isPlus: boolean;
  now: Date;
};

/** Pure: all widget decisions are made here, the native renderers only lay out the result. */
export function buildWidgetSnapshot({ wishlist, library, games, isPlus, now }: SnapshotInput): WidgetSnapshot {
  return {
    version: WIDGET_SNAPSHOT_VERSION,
    generatedAt: now.getTime(),
    isPlus,
    countdown: { items: buildCountdown(wishlist, games, now) },
    upNext: buildUpNext(library, games),
    roulette: buildRoulette(library, games, now),
  };
}

/** True when two snapshots would render the same widgets. `generatedAt` is ignored. */
export function snapshotsEqual(previous: WidgetSnapshot | null, next: WidgetSnapshot): boolean {
  if (!previous) return false;
  return JSON.stringify({ ...previous, generatedAt: 0 }) === JSON.stringify({ ...next, generatedAt: 0 });
}
