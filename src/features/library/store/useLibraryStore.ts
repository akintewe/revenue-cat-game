import { create } from 'zustand';
import type { GameStatus, LibraryEntry } from '../types';
import { useAuthStore } from '../../auth/store/useAuthStore';
import {
  deleteLibraryEntry,
  fetchLibraryEntries,
  insertLibraryEntry,
  updateLibraryEntry,
  LibraryLimitError,
} from '../../../services/library/remoteLibrary';

export const FREE_TIER_GAME_LIMIT = 50;

function currentUserId(): string | null {
  return useAuthStore.getState().session?.user.id ?? null;
}

type LibraryStore = {
  entries: LibraryEntry[];
  loading: boolean;
  hydrated: boolean;
  /** Pulls the signed-in user's real library from the backend. Call on sign-in. */
  hydrate: () => Promise<void>;
  /** Clears local state. Call on sign-out — this data is per-account, not device-wide. */
  reset: () => void;
  isInLibrary: (catalogId: string) => boolean;
  getEntry: (catalogId: string) => LibraryEntry | undefined;
  /** Returns `{ limitReached: true }` when the server refused the write over the free-tier cap. */
  addGame: (catalogId: string) => Promise<{ limitReached: boolean }>;
  removeGame: (catalogId: string) => Promise<void>;
  setStatus: (catalogId: string, status: GameStatus) => Promise<void>;
  setRating: (catalogId: string, rating: number) => Promise<void>;
  setNotes: (catalogId: string, notes: string) => Promise<void>;
  setHoursPlayed: (catalogId: string, hours: number | null) => Promise<void>;
};

export const useLibraryStore = create<LibraryStore>((set, get) => ({
  entries: [],
  loading: false,
  hydrated: false,

  hydrate: async () => {
    if (!currentUserId()) return;
    set({ loading: true });
    try {
      const entries = await fetchLibraryEntries();
      set({ entries, loading: false, hydrated: true });
    } catch {
      // Keep whatever's already in memory; the next hydrate (e.g. app foreground) retries.
      set({ loading: false, hydrated: true });
    }
  },

  reset: () => set({ entries: [], loading: false, hydrated: false }),

  isInLibrary: (catalogId) => get().entries.some((entry) => entry.catalogId === catalogId),

  getEntry: (catalogId) => get().entries.find((entry) => entry.catalogId === catalogId),

  addGame: async (catalogId) => {
    const userId = currentUserId();
    if (!userId || get().isInLibrary(catalogId)) return { limitReached: false };

    const optimistic: LibraryEntry = {
      catalogId,
      status: 'backlog',
      rating: null,
      addedAt: Date.now(),
      notes: '',
      hoursPlayed: null,
      sourceUrl: null,
      sourceKind: 'search',
      finishedAt: null,
    };
    set((state) => ({ entries: [optimistic, ...state.entries] }));

    try {
      await insertLibraryEntry(userId, catalogId);
      return { limitReached: false };
    } catch (err) {
      set((state) => ({ entries: state.entries.filter((entry) => entry.catalogId !== catalogId) }));
      if (err instanceof LibraryLimitError) {
        return { limitReached: true };
      }
      console.warn('[library] addGame failed', err);
      return { limitReached: false };
    }
  },

  removeGame: async (catalogId) => {
    const userId = currentUserId();
    if (!userId) return;

    const previous = get().entries;
    set((state) => ({ entries: state.entries.filter((entry) => entry.catalogId !== catalogId) }));

    try {
      await deleteLibraryEntry(userId, catalogId);
    } catch (err) {
      console.warn('[library] removeGame failed', err);
      set({ entries: previous });
    }
  },

  setStatus: async (catalogId, status) => {
    const userId = currentUserId();
    if (!userId) return;

    const previous = get().entries;
    const finishedAt = status === 'beaten' ? Date.now() : previous.find((e) => e.catalogId === catalogId)?.finishedAt ?? null;
    set((state) => ({
      entries: state.entries.map((entry) => (entry.catalogId === catalogId ? { ...entry, status, finishedAt } : entry)),
    }));

    try {
      await updateLibraryEntry(userId, catalogId, {
        status,
        ...(status === 'beaten' ? { finished_at: new Date(finishedAt as number).toISOString() } : {}),
      });
    } catch (err) {
      console.warn('[library] setStatus failed', err);
      set({ entries: previous });
    }
  },

  setRating: async (catalogId, rating) => {
    const userId = currentUserId();
    if (!userId) return;

    const previous = get().entries;
    set((state) => ({
      entries: state.entries.map((entry) => (entry.catalogId === catalogId ? { ...entry, rating } : entry)),
    }));

    try {
      await updateLibraryEntry(userId, catalogId, { rating });
    } catch (err) {
      console.warn('[library] setRating failed', err);
      set({ entries: previous });
    }
  },

  setNotes: async (catalogId, notes) => {
    const userId = currentUserId();
    if (!userId) return;

    set((state) => ({
      entries: state.entries.map((entry) => (entry.catalogId === catalogId ? { ...entry, notes } : entry)),
    }));

    try {
      await updateLibraryEntry(userId, catalogId, { notes });
    } catch {
      // Best-effort — free text isn't worth rolling back mid-type; next hydrate reconciles.
    }
  },

  setHoursPlayed: async (catalogId, hoursPlayed) => {
    const userId = currentUserId();
    if (!userId) return;

    set((state) => ({
      entries: state.entries.map((entry) => (entry.catalogId === catalogId ? { ...entry, hoursPlayed } : entry)),
    }));

    try {
      await updateLibraryEntry(userId, catalogId, { hours_played: hoursPlayed });
    } catch {
      // Best-effort, same as notes.
    }
  },
}));
