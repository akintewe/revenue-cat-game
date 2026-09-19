import type { CatalogGame } from '../../../data/catalog';

export type WatchedGame = {
  game: CatalogGame;
  watchedAt: string;
  watcherCount: number;
};

export type ChallengeStatus = 'active' | 'upcoming' | 'ended';

export type SeasonalChallenge = {
  id: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  status: ChallengeStatus;
  myProgress: { count: number; target: number };
};
