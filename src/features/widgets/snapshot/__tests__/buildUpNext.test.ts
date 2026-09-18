import type { CatalogGame } from '../../../../data/catalog';
import type { LibraryEntry } from '../../../library/types';
import { buildUpNext, progressWord, UP_NEXT_MAX } from '../buildUpNext';

const game = (id: string, extra: Partial<CatalogGame> = {}): CatalogGame => ({
  id, title: id.toUpperCase(), platform: 'PC', genre: 'Action', abbreviation: id.slice(0, 2), colorKey: 'green',
  coverImageUrl: `https://img.example/${id}.jpg`, ...extra,
});
const entry = (catalogId: string, status: LibraryEntry['status'], hoursPlayed: number | null = null): LibraryEntry => ({
  catalogId, status, rating: null, addedAt: 1, notes: '', hoursPlayed, sourceUrl: null, sourceKind: null, finishedAt: null,
});

describe('buildUpNext', () => {
  it('keeps playing games only, most hours first, and counts the backlog', () => {
    const games = { a: game('a'), b: game('b'), c: game('c'), d: game('d') };
    const result = buildUpNext([entry('a', 'playing', 3), entry('b', 'playing', 31), entry('c', 'backlog'), entry('d', 'beaten', 80)], games);
    expect(result.items.map((i) => i.catalogId)).toEqual(['b', 'a']);
    expect(result.backlogCount).toBe(1);
  });

  it('caps the list and skips unknown games', () => {
    const ids = ['a', 'b', 'c', 'd', 'e'];
    const games = Object.fromEntries(ids.map((id) => [id, game(id)]));
    const result = buildUpNext([...ids.map((id, n) => entry(id, 'playing', n)), entry('ghost', 'playing', 99)], games);
    expect(result.items).toHaveLength(UP_NEXT_MAX);
    expect(result.items[0].catalogId).toBe('e');
  });

  it('writes progress and both sentences when hours and time to beat are known', () => {
    const [item] = buildUpNext([entry('a', 'playing', 31.4)], { a: game('a', { timeToBeatHours: 60 }) }).items;
    expect(item.progress).toBeCloseTo(0.523, 2);
    expect(item.summary).toBe('31h · about halfway');
    expect(item.detail).toBe('31h played · about 60h to beat');
    expect(item.bleed).toBe('#2E8B57');
    expect(item.coverFile).toBe('a.jpg');
  });

  it('caps progress at 1 and says so', () => {
    const [item] = buildUpNext([entry('a', 'playing', 90)], { a: game('a', { timeToBeatHours: 60 }) }).items;
    expect(item.progress).toBe(1);
    expect(item.summary).toBe('90h · past the average time');
  });

  it('handles missing time to beat and missing hours', () => {
    const noTtb = buildUpNext([entry('a', 'playing', 12)], { a: game('a') }).items[0];
    expect(noTtb).toMatchObject({ progress: null, summary: '12h played', detail: '12h played' });
    const noHours = buildUpNext([entry('a', 'playing', null)], { a: game('a', { timeToBeatHours: 20 }) }).items[0];
    expect(noHours).toMatchObject({ progress: null, summary: 'No hours logged', detail: 'About 20h to beat' });
    const nothing = buildUpNext([entry('a', 'playing', null)], { a: game('a') }).items[0];
    expect(nothing).toMatchObject({ summary: 'No hours logged', detail: 'No hours logged' });
  });
});

test('progressWord covers the whole range', () => {
  expect([0, 0.09, 0.1, 0.39, 0.4, 0.59, 0.6, 0.89, 0.9, 0.99, 1].map(progressWord)).toEqual([
    'just started', 'just started', 'early on', 'early on', 'about halfway', 'about halfway',
    'past halfway', 'past halfway', 'nearly done', 'nearly done', 'past the average time',
  ]);
});
