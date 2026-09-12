import type { GameStatus } from '../../../shared/types/status';

export type LibraryEntry = {
  catalogId: string;
  status: GameStatus;
  rating: number | null;
  addedAt: number;
  notes: string;
  hoursPlayed: number | null;
  /** Set only by /share-confirm — a game found by search has neither of these. */
  sourceUrl: string | null;
  sourceKind: 'search' | 'manual' | 'tiktok' | 'youtube' | null;
  /** Epoch ms the game was marked beaten, or null if it hasn't been. */
  finishedAt: number | null;
};

export type { GameStatus } from '../../../shared/types/status';
export { GAME_STATUSES, STATUS_LABEL } from '../../../shared/types/status';
