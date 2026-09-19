import type { CoverColorKey } from '../../data/catalog';

export type Platform = {
  id: number;
  name: string;
  slug: string;
};

/**
 * A game as returned by the live catalog backend (IGDB via our Supabase functions).
 * See technical-notes-for-sola.md §3 for the real response shape this mirrors.
 */
export type RemoteCatalogGame = {
  id: string;
  slug?: string;
  title: string;
  platforms: Platform[];
  /** ISO date (YYYY-MM-DD). Absent for games IGDB has no release date for. */
  releaseDate?: string;
  genres: string[];
  coverImageUrl?: string;
  /** "Normal" completion estimate. Only ~5% of games have this — treat absence as the default. */
  timeToBeatHours?: number;
  /** How many playthroughs timeToBeatHours is averaged from. 59% of timed games have just 1 — always show this beside the hours, never the bare number alone. */
  timeToBeatCount?: number;
  sessionFit?: 'high' | 'medium' | 'low';
  /** IGDB's own aggregate critic score, 0–100. NOT Metacritic — label it as IGDB's if shown. */
  criticScore?: number;
  abbreviation: string;
  colorKey: CoverColorKey;
  /** How precise IGDB's release date actually is — 'day' is a real announced date, the rest are placeholders. */
  releasePrecision?: 'day' | 'month' | 'quarter' | 'year';
  /** IGDB's raw, untruncated description. Absent for ~2.8% of the catalog. Collapse whitespace and clamp client-side. */
  summary?: string;
};

/** `/games/:id` only — watching/watcherCount are per-user, never returned by list endpoints. */
export type RemoteGameDetail = RemoteCatalogGame & {
  watching?: boolean;
  watcherCount?: number;
};
