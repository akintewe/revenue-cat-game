import type { GameStatus } from '../../../shared/types/status';

export type LibraryEntry = {
  catalogId: string;
  status: GameStatus;
  rating: number | null;
  addedAt: number;
  notes: string;
  hoursPlayed: number | null;
};

export type { GameStatus } from '../../../shared/types/status';
export { GAME_STATUSES, STATUS_LABEL } from '../../../shared/types/status';
