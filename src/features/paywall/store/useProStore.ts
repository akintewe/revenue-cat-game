import { create } from 'zustand';
import Purchases from 'react-native-purchases';
import { getCustomerInfo, hasActiveEntitlement } from '../../../services/revenuecat/purchases';
import { PRO_ENTITLEMENT_ID } from '../../../shared/constants/app';

/**
 * The one shared "is this user Pro" check — see prysm-pro-for-sola.md §6. Every
 * screen reads `isPro` from here instead of calling `getCustomerInfo` itself.
 * Refreshed at launch, after any purchase/restore, and via RevenueCat's own
 * update listener — never on a per-render basis.
 */
type ProStore = {
  isPro: boolean;
  /** True only until the very first check resolves — not shown again on later refreshes. */
  loading: boolean;
  refresh: () => Promise<void>;
  /** Starts RevenueCat's push-style update listener. Call once, at app boot. */
  listen: () => void;
};

let listening = false;

export const useProStore = create<ProStore>((set, get) => ({
  isPro: false,
  loading: true,

  refresh: async () => {
    try {
      const info = await getCustomerInfo();
      set({ isPro: hasActiveEntitlement(info, PRO_ENTITLEMENT_ID), loading: false });
    } catch (err) {
      // Fail open — a network hiccup should never demote a paying user mid-session.
      console.warn('[pro] refresh failed', err);
      if (get().loading) set({ loading: false });
    }
  },

  listen: () => {
    if (listening) return;
    listening = true;
    Purchases.addCustomerInfoUpdateListener((info) => {
      set({ isPro: hasActiveEntitlement(info, PRO_ENTITLEMENT_ID), loading: false });
    });
  },
}));
