import { create } from 'zustand';
import type { WishlistEntry } from '../types';
import { useAuthStore } from '../../auth/store/useAuthStore';
import { resolveCatalogGame } from '../../../services/catalog/unifiedCatalog';
import { cancelReleaseReminder, scheduleReleaseReminder } from '../../../services/notifications/reminders';
import {
  deleteWishlistEntry,
  fetchWishlistEntries,
  insertWishlistEntry,
  setWishlistReminder,
} from '../../../services/library/remoteWishlist';

function currentUserId(): string | null {
  return useAuthStore.getState().session?.user.id ?? null;
}

/** Resolves through the real catalog (local demo first, then the backend) — a slug-only
 * lookup here would silently no-op for every real, backend-sourced game. */
async function syncReminder(catalogId: string, enabled: boolean) {
  if (!enabled) {
    cancelReleaseReminder(catalogId);
    return;
  }
  const game = await resolveCatalogGame(catalogId);
  const isUpcoming = Boolean(game?.releaseDate && new Date(game.releaseDate) > new Date());
  if (game && isUpcoming) {
    scheduleReleaseReminder(catalogId, game.title, game.releaseDate!);
  }
}

type WishlistStore = {
  entries: WishlistEntry[];
  loading: boolean;
  hydrate: () => Promise<void>;
  reset: () => void;
  isWishlisted: (catalogId: string) => boolean;
  addGame: (catalogId: string) => Promise<void>;
  removeGame: (catalogId: string) => Promise<void>;
  toggleReminder: (catalogId: string) => Promise<void>;
};

export const useWishlistStore = create<WishlistStore>((set, get) => ({
  entries: [],
  loading: false,

  hydrate: async () => {
    if (!currentUserId()) return;
    set({ loading: true });
    try {
      const entries = await fetchWishlistEntries();
      set({ entries, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  reset: () => set({ entries: [], loading: false }),

  isWishlisted: (catalogId) => get().entries.some((entry) => entry.catalogId === catalogId),

  addGame: async (catalogId) => {
    if (!currentUserId() || get().isWishlisted(catalogId)) return;

    const optimistic: WishlistEntry = { catalogId, reminderEnabled: true, addedAt: Date.now() };
    set((state) => ({ entries: [optimistic, ...state.entries] }));
    syncReminder(catalogId, true);

    try {
      await insertWishlistEntry(catalogId);
    } catch (err) {
      console.warn('[wishlist] addGame failed', err);
      set((state) => ({ entries: state.entries.filter((entry) => entry.catalogId !== catalogId) }));
    }
  },

  removeGame: async (catalogId) => {
    if (!currentUserId()) return;

    const previous = get().entries;
    cancelReleaseReminder(catalogId);
    set((state) => ({ entries: state.entries.filter((entry) => entry.catalogId !== catalogId) }));

    try {
      await deleteWishlistEntry(catalogId);
    } catch (err) {
      console.warn('[wishlist] removeGame failed', err);
      set({ entries: previous });
    }
  },

  toggleReminder: async (catalogId) => {
    if (!currentUserId()) return;

    const current = get().entries.find((entry) => entry.catalogId === catalogId);
    if (!current) return;
    const reminderEnabled = !current.reminderEnabled;

    set((state) => ({
      entries: state.entries.map((entry) => (entry.catalogId === catalogId ? { ...entry, reminderEnabled } : entry)),
    }));
    syncReminder(catalogId, reminderEnabled);

    try {
      await setWishlistReminder(catalogId, reminderEnabled);
    } catch (err) {
      console.warn('[wishlist] toggleReminder failed', err);
      set((state) => ({
        entries: state.entries.map((entry) =>
          entry.catalogId === catalogId ? { ...entry, reminderEnabled: !reminderEnabled } : entry,
        ),
      }));
    }
  },
}));
