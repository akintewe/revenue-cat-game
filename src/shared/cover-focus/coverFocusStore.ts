import type { CoverFocus } from './analyzeCover';

/** The subset of AsyncStorage the store needs, so tests can inject a fake. */
export type CoverFocusStorage = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
};

export type CoverFocusStoreDeps = {
  /** Downloads, shrinks and analyses one cover. Rejects on any failure. */
  analyzeUrl: (url: string) => Promise<CoverFocus>;
  storage: CoverFocusStorage;
  /** Oldest entries are dropped past this count. Default 1000. */
  maxEntries?: number;
};

export type CoverFocusStatus = 'unknown' | 'pending' | 'ready' | 'failed';

export type CoverFocusStore = {
  /** Synchronous cache read. `undefined` means not ready (or failed): render the centre crop. */
  get(url: string): CoverFocus | undefined;
  /** `pending` while queued or running. `failed` stays until the next launch. */
  status(url: string): CoverFocusStatus;
  /** Notifies when `url` becomes ready or fails. Returns the unsubscribe function. */
  subscribe(url: string, listener: () => void): () => void;
  /** Queues an analysis for `url` unless it is cached, in flight, or already failed. */
  request(url: string): void;
};

type Listener = () => void;

/** Bump the version whenever `analyzeCover` changes, so stale crops are recomputed. */
export const STORAGE_KEY = 'coverFocus:v2';
/**
 * Analyses running at once. The JS work per cover is tiny (a 5 KB PNG); the limit mainly keeps
 * native decode and disk writes from piling up behind a long list.
 */
const MAX_CONCURRENT = 4;
const DEFAULT_MAX_ENTRIES = 1000;
const PERSIST_DEBOUNCE_MS = 500;

/** On-disk shape per url: `[x, y, side, aspect, content.x, content.y, content.w, content.h]`. */
type StoredFocus = [number, number, number, number, number, number, number, number];

export function createCoverFocusStore(deps: CoverFocusStoreDeps): CoverFocusStore {
  const maxEntries = deps.maxEntries ?? DEFAULT_MAX_ENTRIES;
  /** Insertion order is age: the first entry is the oldest. */
  const cache = new Map<string, CoverFocus>();
  const listeners = new Map<string, Set<Listener>>();
  /** Memory only, so a failed cover is retried on the next launch, not on every render. */
  const failed = new Set<string>();
  const queued = new Set<string>();
  const queue: string[] = [];
  let running = 0;
  let hydrated = false;
  let persistTimer: ReturnType<typeof setTimeout> | null = null;

  hydrate().finally(() => {
    hydrated = true;
    pump();
  });

  async function hydrate() {
    try {
      const raw = await deps.storage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed: unknown = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return;
      for (const [url, value] of Object.entries(parsed)) {
        const focus = fromStored(value);
        if (focus) cache.set(url, focus);
      }
    } catch (error) {
      if (__DEV__) console.warn('[coverFocus] could not read cache', error);
    }
  }

  function schedulePersist() {
    if (persistTimer) clearTimeout(persistTimer);
    persistTimer = setTimeout(() => {
      persistTimer = null;
      trim();
      const stored: Record<string, StoredFocus> = {};
      cache.forEach((focus, url) => {
        stored[url] = toStored(focus);
      });
      deps.storage.setItem(STORAGE_KEY, JSON.stringify(stored)).catch((error: unknown) => {
        if (__DEV__) console.warn('[coverFocus] could not write cache', error);
      });
    }, PERSIST_DEBOUNCE_MS);
  }

  function trim() {
    while (cache.size > maxEntries) {
      const oldest = cache.keys().next().value;
      if (oldest === undefined) break;
      cache.delete(oldest);
    }
  }

  function notify(url: string) {
    listeners.get(url)?.forEach((listener) => listener());
  }

  function pump() {
    if (!hydrated) return;
    while (running < MAX_CONCURRENT && queue.length > 0) {
      const url = queue.shift()!;
      // Hydration may have filled this in after the request was queued.
      if (cache.has(url)) {
        queued.delete(url);
        continue;
      }
      running++;
      deps
        .analyzeUrl(url)
        .then((focus) => {
          cache.set(url, focus);
          schedulePersist();
          notify(url);
        })
        .catch((error: unknown) => {
          failed.add(url);
          if (__DEV__) console.warn('[coverFocus] analysis failed', url, error);
          notify(url);
        })
        .finally(() => {
          running--;
          queued.delete(url);
          pump();
        });
    }
  }

  return {
    get: (url) => cache.get(url),

    status(url) {
      if (cache.has(url)) return 'ready';
      if (failed.has(url)) return 'failed';
      if (queued.has(url)) return 'pending';
      return 'unknown';
    },

    subscribe(url, listener) {
      let set = listeners.get(url);
      if (!set) {
        set = new Set();
        listeners.set(url, set);
      }
      set.add(listener);
      return () => {
        set.delete(listener);
        if (set.size === 0) listeners.delete(url);
      };
    },

    request(url) {
      if (cache.has(url) || failed.has(url) || queued.has(url)) return;
      queued.add(url);
      queue.push(url);
      pump();
    },
  };
}

function toStored({ x, y, side, aspect, content }: CoverFocus): StoredFocus {
  return [x, y, side, aspect, content.x, content.y, content.w, content.h];
}

function fromStored(value: unknown): CoverFocus | null {
  if (!Array.isArray(value) || value.length !== 8) return null;
  if (!value.every((n) => typeof n === 'number' && Number.isFinite(n))) return null;
  const [x, y, side, aspect, cx, cy, cw, ch] = value as StoredFocus;
  return { x, y, side, aspect, content: { x: cx, y: cy, w: cw, h: ch } };
}
