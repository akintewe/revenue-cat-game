const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})/;
const MS_PER_DAY = 86_400_000;

/**
 * Whole calendar days from `now` (local time) to an ISO date. 0 is today, negative is past.
 * Both sides go through Date.UTC so a daylight-saving change cannot add or drop a day.
 * Returns NaN when the date cannot be parsed.
 */
export function daysUntil(isoDate: string, now: Date): number {
  const match = ISO_DATE.exec(isoDate);
  if (!match) return NaN;
  const target = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((target - today) / MS_PER_DAY);
}

/** 'YYYY-MM-DD' in local time. */
export function localDayKey(d: Date): string {
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
}
