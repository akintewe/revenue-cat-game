import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { WishlistEntry } from '../types';
import { findCatalogGame } from '../../../data/catalog';
import { cancelReleaseReminder, scheduleReleaseReminder } from '../../../services/notifications/reminders';

function syncReminder(catalogId: string, enabled: boolean) {
  if (!enabled) {
    cancelReleaseReminder(catalogId);
    return;
  }
  const game = findCatalogGame(catalogId);
  const isUpcoming = Boolean(game?.releaseDate && new Date(game.releaseDate) > new Date());
  if (game && isUpcoming) {
    scheduleReleaseReminder(catalogId, game.title, game.releaseDate!);
  }
}

/** Sample wishlist so a fresh install shows a populated "Explore Saved" shelf. */
const DEFAULT_ENTRIES: WishlistEntry[] = [
  { catalogId: 'kirby-air-riders', reminderEnabled: true, addedAt: Date.now() },
  { catalogId: 'hollow-knight-silksong', reminderEnabled: true, addedAt: Date.now() - 1000 },
];

type WishlistStore = {
  entries: WishlistEntry[];
  isWishlisted: (catalogId: string) => boolean;
  addGame: (catalogId: string) => void;
  removeGame: (catalogId: string) => void;
  toggleReminder: (catalogId: string) => void;
};

export const useWishlistStore = create<WishlistStore>()(
  persist(
    (set, get) => ({
      entries: DEFAULT_ENTRIES,

      isWishlisted: (catalogId) => get().entries.some((entry) => entry.catalogId === catalogId),

      addGame: (catalogId) =>
        set((state) => {
          if (state.entries.some((entry) => entry.catalogId === catalogId)) return state;
          const entry: WishlistEntry = { catalogId, reminderEnabled: true, addedAt: Date.now() };
          syncReminder(catalogId, true);
          return { entries: [entry, ...state.entries] };
        }),

      removeGame: (catalogId) => {
        cancelReleaseReminder(catalogId);
        set((state) => ({
          entries: state.entries.filter((entry) => entry.catalogId !== catalogId),
        }));
      },

      toggleReminder: (catalogId) =>
        set((state) => ({
          entries: state.entries.map((entry) => {
            if (entry.catalogId !== catalogId) return entry;
            const reminderEnabled = !entry.reminderEnabled;
            syncReminder(catalogId, reminderEnabled);
            return { ...entry, reminderEnabled };
          }),
        })),
    }),
    {
      name: 'wishlist-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ entries: state.entries }),
    },
  ),
);
