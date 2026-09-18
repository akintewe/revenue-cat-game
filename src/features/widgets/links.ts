/** Where a widget tap lands. The widgets build these URLs; see CountdownWidget (both platforms). */
export type WidgetLink =
  | { kind: 'game'; catalogId: string }
  /** The roulette's Start button: move the game to Playing, then open it. */
  | { kind: 'start'; catalogId: string }
  | { kind: 'wishlist' } | { kind: 'paywall' };

const PREFIX = /^prysm:\/\/\/?/i;

/** Parses `prysm://game/<id>`, `prysm://start/<id>`, `prysm://wishlist` and `prysm://paywall`. Anything else is null. */
export function parseWidgetLink(url: string): WidgetLink | null {
  if (!PREFIX.test(url)) return null;
  const [path] = url.replace(PREFIX, '').split(/[?#]/);
  const [head, ...rest] = path.split('/').filter(Boolean);
  if (head === 'wishlist' && rest.length === 0) return { kind: 'wishlist' };
  if (head === 'paywall' && rest.length === 0) return { kind: 'paywall' };
  if ((head === 'game' || head === 'start') && rest.length === 1) {
    try {
      const catalogId = decodeURIComponent(rest[0]);
      return catalogId ? { kind: head, catalogId } : null;
    } catch {
      return null;
    }
  }
  return null;
}
