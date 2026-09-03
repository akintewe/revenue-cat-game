const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

/** Formats an ISO date (YYYY-MM-DD) as "12 Sept 2026". */
export function formatShortDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  return `${day} ${MONTHS[month - 1]} ${year}`;
}

export function formatReleaseLabel(releaseDate: string | undefined): string {
  if (!releaseDate) return 'Release date TBA';
  return `Out ${formatShortDate(releaseDate)}`;
}
