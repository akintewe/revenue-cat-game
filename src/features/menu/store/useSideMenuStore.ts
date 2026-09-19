import { create } from 'zustand';

type SideMenuState = {
  isOpen: boolean;
  show: () => void;
  hide: () => void;
};

/** Open/closed state of the left side menu. The hamburger calls `show`; the menu calls `hide`. */
export const useSideMenuStore = create<SideMenuState>((set) => ({
  isOpen: false,
  show: () => set({ isOpen: true }),
  hide: () => set({ isOpen: false }),
}));
