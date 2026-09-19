import type { CatalogGame } from '../../../data/catalog';
import { resolveCatalogGame } from '../../../services/catalog/unifiedCatalog';
import { getCustomerInfo, hasActiveEntitlement } from '../../../services/revenuecat/purchases';
import { PRO_ENTITLEMENT_ID } from '../../../shared/constants/app';
import { useLibraryStore } from '../../library/store/useLibraryStore';
import { useWishlistStore } from '../../wishlist/store/useWishlistStore';
import { ROULETTE_POOL_MAX } from '../snapshot/buildRoulette';
import { buildWidgetSnapshot, snapshotsEqual } from '../snapshot/buildWidgetSnapshot';
import { localDayKey } from '../snapshot/days';
import type { WidgetSnapshot } from '../snapshot/types';
import { cacheCovers, reloadWidgets, writeSnapshot } from './sharedStore';

let lastPublished: WidgetSnapshot | null = null;
let lastDayKey = '';
let inFlight: Promise<void> | null = null;
let queued = false;

async function readIsPlus(): Promise<boolean> {
  try {
    return hasActiveEntitlement(await getCustomerInfo(), PRO_ENTITLEMENT_ID);
  } catch {
    // RevenueCat is not configured in every build. Widgets then show the free tier.
    return false;
  }
}

async function resolveGames(ids: string[]): Promise<Record<string, CatalogGame | undefined>> {
  const results = await Promise.allSettled(ids.map((id) => resolveCatalogGame(id, { track: false })));
  const games: Record<string, CatalogGame | undefined> = {};
  results.forEach((result, i) => {
    if (result.status === 'fulfilled') games[ids[i]] = result.value;
  });
  return games;
}

async function publishOnce(signedIn: boolean): Promise<void> {
  const now = new Date();
  const wishlist = signedIn ? useWishlistStore.getState().entries : [];
  const library = signedIn ? useLibraryStore.getState().entries : [];

  // A library can hold hundreds of games. Only the ones a widget can show are resolved:
  // the wishlist, the games in play, and the newest backlog games (a few spare, in case
  // some no longer resolve).
  const backlog = library.filter((entry) => entry.status === 'backlog').sort((a, b) => b.addedAt - a.addedAt);
  const ids = new Set([
    ...wishlist.map((entry) => entry.catalogId),
    ...library.filter((entry) => entry.status === 'playing').map((entry) => entry.catalogId),
    ...backlog.slice(0, ROULETTE_POOL_MAX + 4).map((entry) => entry.catalogId),
  ]);

  const [games, isPlus] = await Promise.all([resolveGames([...ids]), signedIn ? readIsPlus() : Promise.resolve(false)]);
  const snapshot = buildWidgetSnapshot({ wishlist, library, games, isPlus, now });

  // Same content on the same day renders the same widgets: do not wake WidgetKit for nothing.
  const dayKey = localDayKey(now);
  if (snapshotsEqual(lastPublished, snapshot) && dayKey === lastDayKey) return;

  await cacheCovers([...snapshot.countdown.items, ...snapshot.upNext.items, ...snapshot.roulette.pool]);
  await writeSnapshot(JSON.stringify(snapshot));
  reloadWidgets();
  lastPublished = snapshot;
  lastDayKey = dayKey;
}

/**
 * Builds and publishes the widget snapshot. Fire-and-forget: it never throws, and calls made
 * while one is running collapse into a single follow-up run.
 */
export function publishWidgetSnapshot(signedIn: boolean): Promise<void> {
  if (inFlight) {
    queued = true;
    return inFlight;
  }
  inFlight = publishOnce(signedIn)
    .catch((err) => {
      if (__DEV__) console.warn('[widgets] publish failed', err);
    })
    .finally(() => {
      inFlight = null;
      if (queued) {
        queued = false;
        void publishWidgetSnapshot(signedIn);
      }
    });
  return inFlight;
}
