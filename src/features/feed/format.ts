/** 742 → "742", 1_204 → "1.2K", 12_400 → "12K", 1_500_000 → "1.5M". */
export function compactCount(n: number): string {
  if (n < 1000) return String(n);
  if (n < 10_000) return `${trimZero((n / 1000).toFixed(1))}K`;
  if (n < 1_000_000) return `${Math.round(n / 1000)}K`;
  return `${trimZero((n / 1_000_000).toFixed(1))}M`;
}

const trimZero = (s: string) => s.replace(/\.0$/, '');

/** "Ends in 2hrs 18 min", "Ends in 3 days", or "Final results" once the poll has closed. */
export function pollTimeLeft(endsAt: string, now = Date.now()): string {
  const minutes = Math.floor((new Date(endsAt).getTime() - now) / 60_000);
  if (minutes <= 0) return 'Final results';
  if (minutes < 60) return `Ends in ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    const rest = minutes % 60;
    const h = `${hours}${hours === 1 ? 'hr' : 'hrs'}`;
    return rest > 0 ? `Ends in ${h} ${rest} min` : `Ends in ${h}`;
  }
  const days = Math.floor(hours / 24);
  return `Ends in ${days} ${days === 1 ? 'day' : 'days'}`;
}

export function voteCountLabel(total: number): string {
  return `${total.toLocaleString('en-US')} ${total === 1 ? 'Vote' : 'Votes'}`;
}

/** IGDB genre names are long. The chips on the game card need one short word. */
const GENRE_SHORT: Record<string, string> = {
  'Role-playing (RPG)': 'RPG',
  'Real Time Strategy (RTS)': 'RTS',
  'Turn-based strategy (TBS)': 'TBS',
  "Hack and slash/Beat 'em up": 'Action',
  'Point-and-click': 'Point & Click',
  'Card & Board Game': 'Cards',
  'Quiz/Trivia': 'Trivia',
  Simulator: 'Sim',
  Platform: 'Platformer',
  Sport: 'Sports',
};

export function shortGenres(genres: string[] | null, max = 3): string[] {
  const out: string[] = [];
  for (const genre of genres ?? []) {
    const label = GENRE_SHORT[genre] ?? genre;
    if (!out.includes(label)) out.push(label);
    if (out.length === max) break;
  }
  return out;
}

/** Platform families in the order the card shows them. PlatformIcon draws each one. */
const FAMILY_ORDER = ['playstation', 'xbox', 'nintendo', 'pc', 'mobile'];
const FAMILY_ICON_NAME: Record<string, string> = {
  playstation: 'PS5',
  xbox: 'Xbox',
  nintendo: 'Switch',
  pc: 'PC',
  mobile: 'Mobile',
};

export function platformIconNames(families: string[] | null, max = 3): string[] {
  return FAMILY_ORDER.filter((f) => families?.includes(f))
    .slice(0, max)
    .map((f) => FAMILY_ICON_NAME[f]);
}
