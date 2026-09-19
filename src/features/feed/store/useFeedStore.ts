import { create } from 'zustand';

type FeedState = {
  /** Goes up by one after the caller posts. The feed reloads when it changes. */
  version: number;
  bump: () => void;
};

export const useFeedStore = create<FeedState>((set) => ({
  version: 0,
  bump: () => set((state) => ({ version: state.version + 1 })),
}));
