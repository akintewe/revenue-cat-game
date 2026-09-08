import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

const MAX_RECENTS = 10;

type RecentlyViewedStore = {
  catalogIds: string[];
  recordView: (catalogId: string) => void;
};

export const useRecentlyViewedStore = create<RecentlyViewedStore>()(
  persist(
    (set) => ({
      catalogIds: ['elden-ring', 'clair-obscur-expedition-33', 'hades-2'],
      recordView: (catalogId) =>
        set((state) => ({
          catalogIds: [catalogId, ...state.catalogIds.filter((id) => id !== catalogId)].slice(
            0,
            MAX_RECENTS,
          ),
        })),
    }),
    {
      name: 'recently-viewed-store',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
