import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { GameStatus, LibraryEntry } from '../types';

export const FREE_TIER_GAME_LIMIT = 50;

type LibraryStore = {
  entries: LibraryEntry[];
  isInLibrary: (catalogId: string) => boolean;
  getEntry: (catalogId: string) => LibraryEntry | undefined;
  addGame: (catalogId: string) => void;
  removeGame: (catalogId: string) => void;
  setStatus: (catalogId: string, status: GameStatus) => void;
  setRating: (catalogId: string, rating: number) => void;
};

export const useLibraryStore = create<LibraryStore>()(
  persist(
    (set, get) => ({
      entries: [],

      isInLibrary: (catalogId) => get().entries.some((entry) => entry.catalogId === catalogId),

      getEntry: (catalogId) => get().entries.find((entry) => entry.catalogId === catalogId),

      addGame: (catalogId) =>
        set((state) => {
          if (state.entries.some((entry) => entry.catalogId === catalogId)) return state;
          const entry: LibraryEntry = {
            catalogId,
            status: 'backlog',
            rating: null,
            addedAt: Date.now(),
          };
          return { entries: [entry, ...state.entries] };
        }),

      removeGame: (catalogId) =>
        set((state) => ({
          entries: state.entries.filter((entry) => entry.catalogId !== catalogId),
        })),

      setStatus: (catalogId, status) =>
        set((state) => ({
          entries: state.entries.map((entry) =>
            entry.catalogId === catalogId ? { ...entry, status } : entry,
          ),
        })),

      setRating: (catalogId, rating) =>
        set((state) => ({
          entries: state.entries.map((entry) =>
            entry.catalogId === catalogId ? { ...entry, rating } : entry,
          ),
        })),
    }),
    {
      name: 'library-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ entries: state.entries }),
    },
  ),
);
