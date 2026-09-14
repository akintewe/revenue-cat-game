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
  /** 'steam' | 'xbox' | 'psn' come from platform import, not /share-confirm — sourceUrl stays null for those. */
  sourceKind: 'search' | 'manual' | 'tiktok' | 'youtube' | 'steam' | 'xbox' | 'psn' | null;
  /** Epoch ms the game was marked beaten, or null if it hasn't been. */
  finishedAt: number | null;
};

export type { GameStatus } from '../../../shared/types/status';
export { GAME_STATUSES, STATUS_LABEL } from '../../../shared/types/status';
