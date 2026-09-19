import type { CatalogGame } from '../../../../data/catalog';
import type { WishlistEntry } from '../../../wishlist/types';
import { buildCountdown, coverFileFor, COUNTDOWN_MAX, shortTitleFor } from '../buildCountdown';

const now = new Date(2026, 8, 22, 10);

function game(id: string, releaseDate: string | undefined, extra: Partial<CatalogGame> = {}): CatalogGame {
  return {
    id,
    title: id.toUpperCase(),
    platform: 'PC',
    genre: 'Action',
    abbreviation: id.slice(0, 2),
    colorKey: 'teal',
    releaseDate,
    coverImageUrl: `https://img.example/${id}.jpg`,
    ...extra,
  };
}
const entry = (catalogId: string): WishlistEntry => ({ catalogId, reminderEnabled: true, addedAt: 1 });
const index = (...games: CatalogGame[]) => Object.fromEntries(games.map((g) => [g.id, g]));

describe('buildCountdown', () => {
  it('drops released and undated games and skips unknown ids', () => {
    const games = index(game('past', '2026-09-01'), game('nodate', undefined), game('soon', '2026-10-04'));
    const items = buildCountdown([entry('past'), entry('nodate'), entry('soon'), entry('ghost')], games, now);
    expect(items.map((i) => i.catalogId)).toEqual(['soon']);
  });

  it('sorts soonest first, then by title', () => {
    const games = index(game('b', '2026-10-04'), game('a', '2026-10-04'), game('c', '2026-09-30'));
    const items = buildCountdown([entry('b'), entry('a'), entry('c')], games, now);
    expect(items.map((i) => i.catalogId)).toEqual(['c', 'a', 'b']);
  });

  it('keeps a game that releases today', () => {
    const items = buildCountdown([entry('today')], index(game('today', '2026-09-22')), now);
    expect(items).toHaveLength(1);
  });

  it('caps the list', () => {
    const games = index(...['a', 'b', 'c', 'd', 'e', 'f'].map((id, n) => game(id, `2026-10-0${n + 1}`)));
    const items = buildCountdown(Object.keys(games).map(entry), games, now);
    expect(items).toHaveLength(COUNTDOWN_MAX);
  });

  it('carries title, date, cover and bleed colour', () => {
    const [item] = buildCountdown([entry('soon')], index(game('soon', '2026-10-04')), now);
    expect(item).toEqual({
      catalogId: 'soon',
      title: 'SOON',
      shortTitle: 'SOON',
      releaseDate: '2026-10-04',
      coverFile: 'soon.jpg',
      coverUrl: 'https://img.example/soon.jpg',
      bleed: '#2FB6A8',
    });
  });

  it('has no cover fields when the game has no cover', () => {
    const [item] = buildCountdown([entry('x')], index(game('x', '2026-10-04', { coverImageUrl: undefined })), now);
    expect(item.coverFile).toBeNull();
    expect(item.coverUrl).toBeNull();
  });
});

test('coverFileFor makes a safe file name', () => {
  expect(coverFileFor('igdb:12/3')).toBe('igdb_12_3.jpg');
});

describe('shortTitleFor', () => {
  it('uses a subtitle that can stand alone', () => {
    expect(shortTitleFor('Hollow Knight: Silksong')).toBe('Silksong');
    expect(shortTitleFor('Metroid Prime 4: Beyond')).toBe('Beyond');
    expect(shortTitleFor('Marvel 1943 - Rise of Hydra')).toBe('Rise of Hydra');
  });
  it('keeps the full title otherwise', () => {
    expect(shortTitleFor('Hades II')).toBe('Hades II');
    expect(shortTitleFor('Final Fantasy VII Remake: Part 3')).toBe('Final Fantasy VII Remake: Part 3');
    expect(shortTitleFor('Deltarune: IV')).toBe('Deltarune: IV');
  });
});
