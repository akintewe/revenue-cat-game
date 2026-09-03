import { create } from 'zustand';
import { GameState } from '../types';

const STARTING_LIVES = 3;

type GameStore = GameState & {
  addPoint: () => void;
  loseLife: () => void;
  resetGame: () => void;
  addExtraLife: (amount: number) => void;
};

export const useGameStore = create<GameStore>((set) => ({
  score: 0,
  highScore: 0,
  livesRemaining: STARTING_LIVES,

  addPoint: () =>
    set((state) => ({
      score: state.score + 1,
      highScore: Math.max(state.highScore, state.score + 1),
    })),

  loseLife: () =>
    set((state) => ({
      livesRemaining: Math.max(0, state.livesRemaining - 1),
    })),

  addExtraLife: (amount: number) =>
    set((state) => ({
      livesRemaining: state.livesRemaining + amount,
    })),

  resetGame: () =>
    set((state) => ({
      score: 0,
      livesRemaining: STARTING_LIVES,
      highScore: state.highScore,
    })),
}));
