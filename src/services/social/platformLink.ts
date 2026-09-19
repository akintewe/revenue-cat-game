/**
 * The browser redirect that ends a platform sign-in: prysm://link/<platform>?status=…&nonce=…
 * By default the navigator opens the full-screen result page. A screen that wants the result
 * itself (onboarding) registers a handler, and the navigator then stays out of the way.
 */
export type LinkPlatform = 'steam' | 'xbox';
export type LinkStatus = 'ok' | 'failed' | 'expired';
export type PlatformLinkEvent = { platform: LinkPlatform; status: LinkStatus; nonce: string };

const LINK = /^prysm:\/\/\/?link\/([a-z]+)\?(.*)$/i;

export function parsePlatformLink(url: string): PlatformLinkEvent | null {
  const match = LINK.exec(url);
  if (!match) return null;
  const platform = match[1].toLowerCase();
  if (platform !== 'steam' && platform !== 'xbox') return null;
  const params = new Map(
    match[2].split('&').map((pair) => {
      const [key, value = ''] = pair.split('=');
      return [key, decodeURIComponent(value)] as const;
    }),
  );
  const status = params.get('status');
  const nonce = params.get('nonce');
  if ((status !== 'ok' && status !== 'failed' && status !== 'expired') || !nonce) return null;
  return { platform, status, nonce };
}

type Handler = (event: PlatformLinkEvent) => void;
let handler: Handler | null = null;

/** Registers the one listener. Returns its remover, which is safe to call late. */
export function setPlatformLinkHandler(next: Handler | null): () => void {
  handler = next;
  return () => {
    if (handler === next) handler = null;
  };
}

/** True when a listener took the event. */
export function dispatchPlatformLink(event: PlatformLinkEvent): boolean {
  if (!handler) return false;
  handler(event);
  return true;
}
