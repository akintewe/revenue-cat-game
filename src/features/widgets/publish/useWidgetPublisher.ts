import { useEffect } from 'react';
import { AppState } from 'react-native';
import { useAuthStore } from '../../auth/store/useAuthStore';
import { useWishlistStore } from '../../wishlist/store/useWishlistStore';
import { publishWidgetSnapshot } from './publishWidgetSnapshot';

const DEBOUNCE_MS = 500;

/**
 * Keeps the home screen widgets in step with the app: publishes after the wishlist or the
 * session changes (debounced), and each time the app comes to the foreground.
 * Mount once, at the root.
 */
export function useWidgetPublisher(): void {
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;

    const schedule = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        timer = null;
        const status = useAuthStore.getState().status;
        if (status === 'loading') return;
        void publishWidgetSnapshot(status === 'signedIn');
      }, DEBOUNCE_MS);
    };

    const stopWishlist = useWishlistStore.subscribe((state, previous) => {
      if (state.entries !== previous.entries) schedule();
    });
    const stopAuth = useAuthStore.subscribe((state, previous) => {
      if (state.status !== previous.status) schedule();
    });
    const appState = AppState.addEventListener('change', (next) => {
      if (next === 'active') schedule();
    });
    schedule();

    return () => {
      if (timer) clearTimeout(timer);
      stopWishlist();
      stopAuth();
      appState.remove();
    };
  }, []);
}
