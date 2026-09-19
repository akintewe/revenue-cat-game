/**
 * The roll rules. This file is the reference: the Android click handler imports it, and the
 * iOS App Intent (targets/widgets/RouletteIntent.swift) mirrors it line for line.
 */
export type RouletteState = {
  pickId: string | null;
  /** Local day of the last roll, YYYY-MM-DD. The counter restarts when the day changes. */
  rollDay: string;
  rollsToday: number;
};

export function canRoll(state: RouletteState | null, isPlus: boolean, freePerDay: number, today: string): boolean {
  if (isPlus) return true;
  const used = state && state.rollDay === today ? state.rollsToday : 0;
  return used < freePerDay;
}

/** Picks a game from the pool. With two or more games it never lands on the current pick. */
export function roll(poolIds: string[], state: RouletteState | null, today: string, random: () => number): RouletteState {
  const used = state && state.rollDay === today ? state.rollsToday : 0;
  if (poolIds.length === 0) return { pickId: null, rollDay: today, rollsToday: used };
  const choices = poolIds.length > 1 ? poolIds.filter((id) => id !== state?.pickId) : poolIds;
  const index = Math.min(Math.floor(random() * choices.length), choices.length - 1);
  return { pickId: choices[index], rollDay: today, rollsToday: used + 1 };
}
