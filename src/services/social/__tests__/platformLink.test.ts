import { dispatchPlatformLink, parsePlatformLink, setPlatformLinkHandler } from '../platformLink';

describe('parsePlatformLink', () => {
  it('reads the Steam and Xbox redirects', () => {
    expect(parsePlatformLink('prysm://link/steam?status=ok&nonce=abc')).toEqual({ platform: 'steam', status: 'ok', nonce: 'abc' });
    expect(parsePlatformLink('prysm://link/xbox?nonce=n1&status=failed')).toEqual({ platform: 'xbox', status: 'failed', nonce: 'n1' });
    expect(parsePlatformLink('prysm:///link/steam?status=expired&nonce=z')).toEqual({ platform: 'steam', status: 'expired', nonce: 'z' });
  });
  it('rejects unknown platforms, statuses and a missing nonce', () => {
    expect(parsePlatformLink('prysm://link/psn?status=ok&nonce=a')).toBeNull();
    expect(parsePlatformLink('prysm://link/steam?status=maybe&nonce=a')).toBeNull();
    expect(parsePlatformLink('prysm://link/steam?status=ok')).toBeNull();
    expect(parsePlatformLink('prysm://game/steam')).toBeNull();
  });
});

describe('platform link handler', () => {
  const event = { platform: 'steam' as const, status: 'ok' as const, nonce: 'abc' };
  afterEach(() => setPlatformLinkHandler(null));

  it('reports unhandled when nobody listens, so the navigator can open its own screen', () => {
    expect(dispatchPlatformLink(event)).toBe(false);
  });
  it('hands the event to the listener, and stops after it is removed', () => {
    const seen: unknown[] = [];
    const remove = setPlatformLinkHandler((e) => seen.push(e));
    expect(dispatchPlatformLink(event)).toBe(true);
    expect(seen).toEqual([event]);
    remove();
    expect(dispatchPlatformLink(event)).toBe(false);
  });
  it('does not let a stale remover clear a newer listener', () => {
    const removeOld = setPlatformLinkHandler(() => {});
    setPlatformLinkHandler(() => {});
    removeOld();
    expect(dispatchPlatformLink(event)).toBe(true);
  });
});
