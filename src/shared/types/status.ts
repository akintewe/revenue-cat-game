export type GameStatus = 'playing' | 'backlog' | 'beaten' | 'dropped';

export const GAME_STATUSES: GameStatus[] = ['playing', 'backlog', 'beaten', 'dropped'];

export const STATUS_LABEL: Record<GameStatus, string> = {
  playing: 'Playing',
  backlog: 'Minilog',
  beaten: 'Completed',
  dropped: 'Liked',
};
