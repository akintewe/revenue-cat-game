const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The real catalog keys every game by a backend uuid; the small local demo catalog uses plain slugs. */
export function isUuid(id: string): boolean {
  return UUID_RE.test(id);
}
