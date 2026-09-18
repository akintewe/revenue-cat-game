import { daysUntil } from '../snapshot/days';
import { WIDGET_SNAPSHOT_VERSION, type CountdownItem, type WidgetSnapshot } from '../snapshot/types';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** A stored snapshot string, or null when it is missing, broken, or from a newer app version. */
export function parseSnapshot(json: string | null): WidgetSnapshot | null {
  if (!json) return null;
  try {
    const value = JSON.parse(json) as Partial<WidgetSnapshot> | null;
    if (!value || value.version !== WIDGET_SNAPSHOT_VERSION || !Array.isArray(value.countdown?.items)) return null;
    // Sections added after the first release are optional in a stored snapshot.
    return {
      ...(value as WidgetSnapshot),
      upNext: value.upNext ?? { items: [], backlogCount: 0 },
      roulette: value.roulette ?? { pool: [], freeRollsPerDay: 1 },
    };
  } catch {
    return null;
  }
}

export type CountdownRow = CountdownItem & { days: number };

/** The snapshot can be days old, so "not out yet" and the day counts are decided at render time. */
export function upcoming(snapshot: WidgetSnapshot | null, now: Date): CountdownRow[] {
  return (snapshot?.countdown.items ?? [])
    .map((item) => ({ ...item, days: daysUntil(item.releaseDate, now) }))
    .filter((row) => row.days >= 0);
}

/** "4 Oct" */
export function shortDate(iso: string): string {
  const [, month, day] = iso.split('-').map(Number);
  return MONTHS[month - 1] ? `${day} ${MONTHS[month - 1]}` : '';
}

/** A dark version of the bleed colour for the card's gradient end. `amount` 0 is black, 1 is the colour. */
export function dim(hex: string, amount: number): `#${string}` {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex);
  const value = match ? parseInt(match[1], 16) : 0xfd5021;
  const channel = (shift: number) =>
    Math.round(((value >> shift) & 0xff) * amount)
      .toString(16)
      .padStart(2, '0');
  return `#${channel(16)}${channel(8)}${channel(0)}`;
}
