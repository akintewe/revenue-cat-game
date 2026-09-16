import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

/**
 * Whether each account has been through onboarding, tracked locally per user id.
 * There's no backend field for this yet (nothing to sync), so completing onboarding
 * on one device won't carry to another — acceptable for now, worth a real
 * profiles.onboarded_at column later.
 */
type OnboardingStore = {
  completedUserIds: Record<string, true>;
  isComplete: (userId: string) => boolean;
  markComplete: (userId: string) => void;
};

export const useOnboardingStore = create<OnboardingStore>()(
  persist(
    (set, get) => ({
      completedUserIds: {},
      isComplete: (userId) => Boolean(get().completedUserIds[userId]),
      markComplete: (userId) =>
        set((state) => ({ completedUserIds: { ...state.completedUserIds, [userId]: true } })),
    }),
    {
      name: 'onboarding-store',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
