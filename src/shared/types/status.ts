export type GameStatus = 'playing' | 'backlog' | 'beaten' | 'dropped';

export const GAME_STATUSES: GameStatus[] = ['playing', 'backlog', 'beaten', 'dropped'];

export const STATUS_LABEL: Record<GameStatus, string> = {
  playing: 'Playing',
  backlog: 'Backlog',
  beaten: 'Completed',
  dropped: 'Paused',
};

export const STATUS_ICON: Record<GameStatus, 'play' | 'time-outline' | 'trophy' | 'pause'> = {
  playing: 'play',
  backlog: 'time-outline',
  beaten: 'trophy',
  dropped: 'pause',
};
