import { createCoverFocusStore, type CoverFocusStorage } from '../coverFocusStore';
import type { CoverFocus } from '../analyzeCover';

const FOCUS: CoverFocus = { x: 0.1, y: 0.2, side: 0.8, aspect: 4 / 3, content: { x: 0.1, y: 0, w: 0.8, h: 4 / 3 } };
/** FOCUS as it is written to disk. */
const STORED = [0.1, 0.2, 0.8, 4 / 3, 0.1, 0, 0.8, 4 / 3];

/** A controllable analyser: each call returns a promise the test resolves by hand. */
function makeAnalyzer() {
  const pending: { url: string; resolve: (f: CoverFocus) => void; reject: (e: Error) => void }[] = [];
  const analyzeUrl = jest.fn(
    (url: string) =>
      new Promise<CoverFocus>((resolve, reject) => {
        pending.push({ url, resolve, reject });
      }),
  );
  return { analyzeUrl, pending };
}

function makeStorage(initial?: string): CoverFocusStorage & { written: string[] } {
  const written: string[] = [];
  return {
    written,
    getItem: jest.fn(async () => initial ?? null),
    setItem: jest.fn(async (_key: string, value: string) => {
      written.push(value);
    }),
  };
}

/** Let queued microtasks run. */
const flush = () => new Promise<void>((resolve) => setImmediate(resolve));

describe('createCoverFocusStore', () => {
  test('request analyses the url, notifies the subscriber, and get returns the focus', async () => {
    const { analyzeUrl, pending } = makeAnalyzer();
    const store = createCoverFocusStore({ analyzeUrl, storage: makeStorage() });
    const listener = jest.fn();
    store.subscribe('a', listener);

    expect(store.get('a')).toBeUndefined();
    store.request('a');
    await flush();
    expect(analyzeUrl).toHaveBeenCalledWith('a');

    pending[0].resolve(FOCUS);
    await flush();

    expect(store.get('a')).toEqual(FOCUS);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  test('a url in flight or already cached is not analysed again', async () => {
    const { analyzeUrl, pending } = makeAnalyzer();
    const store = createCoverFocusStore({ analyzeUrl, storage: makeStorage() });

    store.request('a');
    store.request('a');
    await flush();
    expect(analyzeUrl).toHaveBeenCalledTimes(1);

    pending[0].resolve(FOCUS);
    await flush();
    store.request('a');
    await flush();
    expect(analyzeUrl).toHaveBeenCalledTimes(1);
  });

  test('at most four analyses run at once; the rest wait their turn', async () => {
    const { analyzeUrl, pending } = makeAnalyzer();
    const store = createCoverFocusStore({ analyzeUrl, storage: makeStorage() });
    const urls = ['a', 'b', 'c', 'd', 'e', 'f'];

    urls.forEach((url) => store.request(url));
    await flush();
    expect(analyzeUrl.mock.calls.map(([url]) => url)).toEqual(['a', 'b', 'c', 'd']);

    pending[0].resolve(FOCUS);
    await flush();
    expect(analyzeUrl.mock.calls.map(([url]) => url)).toEqual(['a', 'b', 'c', 'd', 'e']);

    pending[1].resolve(FOCUS);
    await flush();
    expect(analyzeUrl.mock.calls.map(([url]) => url)).toEqual(urls);
  });

  test('a failed url is not retried, keeps the centre crop, and still notifies', async () => {
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    const { analyzeUrl, pending } = makeAnalyzer();
    const store = createCoverFocusStore({ analyzeUrl, storage: makeStorage() });
    const listener = jest.fn();
    store.subscribe('a', listener);

    store.request('a');
    await flush();
    pending[0].reject(new Error('decode failed'));
    await flush();

    store.request('a');
    await flush();
    expect(analyzeUrl).toHaveBeenCalledTimes(1);
    expect(store.get('a')).toBeUndefined();
    expect(store.status('a')).toBe('failed');
    expect(listener).toHaveBeenCalledTimes(1);
  });

  test('status moves from unknown to pending to ready', async () => {
    const { analyzeUrl, pending } = makeAnalyzer();
    const store = createCoverFocusStore({ analyzeUrl, storage: makeStorage() });

    expect(store.status('a')).toBe('unknown');
    store.request('a');
    expect(store.status('a')).toBe('pending');
    await flush();
    pending[0].resolve(FOCUS);
    await flush();
    expect(store.status('a')).toBe('ready');
  });

  describe('persistence', () => {
    beforeEach(() => jest.useFakeTimers({ doNotFake: ['setImmediate', 'nextTick'] }));
    afterEach(() => jest.useRealTimers());

    test('entries found in storage are served without analysis', async () => {
      const { analyzeUrl } = makeAnalyzer();
      const storage = makeStorage(JSON.stringify({ a: STORED }));
      const store = createCoverFocusStore({ analyzeUrl, storage });
      await flush();

      expect(store.get('a')).toEqual(FOCUS);
      store.request('a');
      await flush();
      expect(analyzeUrl).not.toHaveBeenCalled();
    });

    test('a request made before hydration finishes does not re-analyse a stored url', async () => {
      const { analyzeUrl } = makeAnalyzer();
      const storage = makeStorage(JSON.stringify({ a: STORED }));
      const store = createCoverFocusStore({ analyzeUrl, storage });

      store.request('a');
      await flush();

      expect(analyzeUrl).not.toHaveBeenCalled();
      expect(store.get('a')).toEqual(FOCUS);
    });

    test('corrupt storage is ignored and the store starts empty', async () => {
      const { analyzeUrl } = makeAnalyzer();
      const storage = makeStorage('{"a": "nonsense", "b": [1, 2], "c": [0.1, 0.2, 0.8, 1.33]}');
      const store = createCoverFocusStore({ analyzeUrl, storage });
      await flush();

      expect(store.get('a')).toBeUndefined();
      expect(store.get('b')).toBeUndefined();
      expect(store.get('c')).toBeUndefined();
    });

    test('a new result is written to storage once, after a short debounce', async () => {
      const { analyzeUrl, pending } = makeAnalyzer();
      const storage = makeStorage();
      const store = createCoverFocusStore({ analyzeUrl, storage });
      store.request('a');
      store.request('b');
      await flush();
      pending[0].resolve(FOCUS);
      pending[1].resolve(FOCUS);
      await flush();

      expect(storage.setItem).not.toHaveBeenCalled();
      jest.advanceTimersByTime(600);
      await flush();

      expect(storage.setItem).toHaveBeenCalledTimes(1);
      expect(JSON.parse(storage.written[0])).toEqual({ a: STORED, b: STORED });
    });

    test('the oldest entries are dropped when the cap is exceeded', async () => {
      const { analyzeUrl, pending } = makeAnalyzer();
      const storage = makeStorage();
      const store = createCoverFocusStore({ analyzeUrl, storage, maxEntries: 2 });
      ['a', 'b', 'c'].forEach((url) => store.request(url));
      await flush();
      pending[0].resolve(FOCUS);
      pending[1].resolve(FOCUS);
      await flush();
      pending[2].resolve(FOCUS);
      await flush();
      jest.advanceTimersByTime(600);
      await flush();

      expect(store.get('a')).toBeUndefined();
      expect(store.get('b')).toEqual(FOCUS);
      expect(store.get('c')).toEqual(FOCUS);
      expect(Object.keys(JSON.parse(storage.written[0]))).toEqual(['b', 'c']);
    });
  });
});
