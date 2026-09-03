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
  setNotes: (catalogId: string, notes: string) => void;
  setHoursPlayed: (catalogId: string, hours: number | null) => void;
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
            notes: '',
            hoursPlayed: null,
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

      setNotes: (catalogId, notes) =>
        set((state) => ({
          entries: state.entries.map((entry) =>
            entry.catalogId === catalogId ? { ...entry, notes } : entry,
          ),
        })),

      setHoursPlayed: (catalogId, hoursPlayed) =>
        set((state) => ({
          entries: state.entries.map((entry) =>
            entry.catalogId === catalogId ? { ...entry, hoursPlayed } : entry,
          ),
        })),
    }),
    {
      name: 'library-store',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ entries: state.entries }),
      migrate: (persistedState) => {
        const state = persistedState as { entries?: Partial<LibraryEntry>[] };
        return {
          entries: (state.entries ?? []).map((entry) => ({
            catalogId: entry.catalogId ?? '',
            status: entry.status ?? 'backlog',
            rating: entry.rating ?? null,
            addedAt: entry.addedAt ?? Date.now(),
            notes: entry.notes ?? '',
            hoursPlayed: entry.hoursPlayed ?? null,
          })),
        };
      },
    },
  ),
);
