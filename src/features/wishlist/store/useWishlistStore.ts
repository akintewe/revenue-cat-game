import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { WishlistEntry } from '../types';

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
      entries: [],

      isWishlisted: (catalogId) => get().entries.some((entry) => entry.catalogId === catalogId),

      addGame: (catalogId) =>
        set((state) => {
          if (state.entries.some((entry) => entry.catalogId === catalogId)) return state;
          const entry: WishlistEntry = { catalogId, reminderEnabled: true, addedAt: Date.now() };
          return { entries: [entry, ...state.entries] };
        }),

      removeGame: (catalogId) =>
        set((state) => ({
          entries: state.entries.filter((entry) => entry.catalogId !== catalogId),
        })),

      toggleReminder: (catalogId) =>
        set((state) => ({
          entries: state.entries.map((entry) =>
            entry.catalogId === catalogId
              ? { ...entry, reminderEnabled: !entry.reminderEnabled }
              : entry,
          ),
        })),
    }),
    {
      name: 'wishlist-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ entries: state.entries }),
    },
  ),
);
