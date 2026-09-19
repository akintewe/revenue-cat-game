import { useCallback, useEffect, useSyncExternalStore } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createCoverFocusStore, type CoverFocusStatus } from './coverFocusStore';
import { analyzeCoverUrl } from './coverFocusPipeline';
import type { CoverFocus } from './analyzeCover';

/** App-wide cache. Created at import time, so it starts hydrating from disk on launch. */
export const coverFocusStore = createCoverFocusStore({ analyzeUrl: analyzeCoverUrl, storage: AsyncStorage });

const noop = () => {};

export type CoverFocusState = {
  /** `ready` and `failed` are final for this launch. Anything else: the crop is still unknown. */
  status: CoverFocusStatus;
  focus: CoverFocus | undefined;
};

/**
 * The smart crop for `url`. Requests an analysis when `enabled` and the crop is not cached yet.
 * With `enabled` false the status stays `unknown` and no work happens.
 */
export function useCoverFocus(url: string | undefined, enabled: boolean): CoverFocusState {
  const subscribe = useCallback(
    (onChange: () => void) => (url ? coverFocusStore.subscribe(url, onChange) : noop),
    [url],
  );
  // Two snapshots, both referentially stable, so useSyncExternalStore never loops.
  const focus = useSyncExternalStore(
    subscribe,
    useCallback(() => (url ? coverFocusStore.get(url) : undefined), [url]),
  );
  const status = useSyncExternalStore(
    subscribe,
    useCallback((): CoverFocusStatus => (url ? coverFocusStore.status(url) : 'unknown'), [url]),
  );

  useEffect(() => {
    if (url && enabled && status === 'unknown') coverFocusStore.request(url);
  }, [url, enabled, status]);

  return enabled ? { status, focus } : { status: 'unknown', focus: undefined };
}
