import type { CatalogGame } from '../../../../data/catalog';
import type { LibraryEntry } from '../../../library/types';
import { buildRoulette, ROULETTE_POOL_MAX } from '../buildRoulette';
import { canRoll, roll } from '../roll';

const now = new Date(2026, 8, 22);
const game = (id: string, extra: Partial<CatalogGame> = {}): CatalogGame => ({
  id, title: id, platform: 'PC', genre: 'Action', abbreviation: 'xx', colorKey: 'teal', ...extra,
});
const entry = (catalogId: string, status: LibraryEntry['status'], addedAt: number): LibraryEntry => ({
  catalogId, status, rating: null, addedAt, notes: '', hoursPlayed: null, sourceUrl: null, sourceKind: null, finishedAt: null,
});

describe('buildRoulette', () => {
  it('pools backlog games only, newest first, capped', () => {
    const ids = Array.from({ length: 15 }, (_, n) => `g${n}`);
    const games = Object.fromEntries(ids.map((id) => [id, game(id)]));
    const entries = [...ids.map((id, n) => entry(id, 'backlog', n)), entry('p', 'playing', 99)];
    const { pool, freeRollsPerDay } = buildRoulette(entries, { ...games, p: game('p') }, now);
    expect(pool).toHaveLength(ROULETTE_POOL_MAX);
    expect(pool[0].catalogId).toBe('g14');
    expect(pool.some((i) => i.catalogId === 'p')).toBe(false);
    expect(freeRollsPerDay).toBe(1);
  });

  it('writes the detail line from time to beat and the month it was added', () => {
    const march = new Date(2026, 2, 3).getTime();
    const lastYear = new Date(2025, 10, 3).getTime();
    const games = { a: game('a', { timeToBeatHours: 22.4 }), b: game('b'), c: game('c', { timeToBeatHours: 8 }) };
    const { pool } = buildRoulette([entry('a', 'backlog', march), entry('b', 'backlog', march - 1), entry('c', 'backlog', lastYear)], games, now);
    expect(pool.map((i) => i.detail)).toEqual([
      'about 22h · in your backlog since March',
      'in your backlog since March',
      'about 8h · in your backlog since November 2025',
    ]);
  });
});

describe('canRoll', () => {
  const today = '2026-09-22';
  it('always lets Plus roll', () => {
    expect(canRoll({ pickId: 'a', rollDay: today, rollsToday: 9 }, true, 1, today)).toBe(true);
  });
  it('gives the free tier its rolls per day, and resets on a new day', () => {
    expect(canRoll(null, false, 1, today)).toBe(true);
    expect(canRoll({ pickId: 'a', rollDay: today, rollsToday: 1 }, false, 1, today)).toBe(false);
    expect(canRoll({ pickId: 'a', rollDay: '2026-09-21', rollsToday: 5 }, false, 1, today)).toBe(true);
  });
});

describe('roll', () => {
  const today = '2026-09-22';
  it('picks from the pool and counts the roll', () => {
    expect(roll(['a', 'b', 'c'], null, today, () => 0.5)).toEqual({ pickId: 'b', rollDay: today, rollsToday: 1 });
  });
  it('never repeats the current pick when there is a choice', () => {
    const state = { pickId: 'a', rollDay: today, rollsToday: 1 };
    for (const r of [0, 0.3, 0.6, 0.999]) expect(roll(['a', 'b', 'c'], state, today, () => r).pickId).not.toBe('a');
    expect(roll(['a', 'b', 'c'], state, today, () => 0).rollsToday).toBe(2);
  });
  it('restarts the counter on a new day and copes with tiny pools', () => {
    expect(roll(['a'], { pickId: 'a', rollDay: '2026-09-21', rollsToday: 4 }, today, () => 0.9)).toEqual({ pickId: 'a', rollDay: today, rollsToday: 1 });
    expect(roll([], null, today, () => 0.2)).toEqual({ pickId: null, rollDay: today, rollsToday: 0 });
  });
});
