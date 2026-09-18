import { buildWidgetSnapshot, snapshotsEqual } from '../buildWidgetSnapshot';

const now = new Date(2026, 8, 22, 10);
const games = {
  soon: {
    id: 'soon', title: 'Soon', platform: 'PC', genre: 'Action', abbreviation: 'SO',
    colorKey: 'teal' as const, releaseDate: '2026-10-04',
  },
};
const wishlist = [{ catalogId: 'soon', reminderEnabled: true, addedAt: 1 }];

describe('buildWidgetSnapshot', () => {
  it('stamps the version, the time and the tier', () => {
    const snap = buildWidgetSnapshot({ wishlist, games, isPlus: true, now });
    expect(snap.version).toBe(1);
    expect(snap.generatedAt).toBe(now.getTime());
    expect(snap.isPlus).toBe(true);
    expect(snap.countdown.items).toHaveLength(1);
  });

  it('is empty for an empty wishlist', () => {
    expect(buildWidgetSnapshot({ wishlist: [], games: {}, isPlus: false, now }).countdown.items).toEqual([]);
  });
});

describe('snapshotsEqual', () => {
  const a = buildWidgetSnapshot({ wishlist, games, isPlus: false, now });
  it('ignores generatedAt', () => {
    const later = buildWidgetSnapshot({ wishlist, games, isPlus: false, now: new Date(now.getTime() + 60_000) });
    expect(snapshotsEqual(a, later)).toBe(true);
  });
  it('sees a changed item, a changed tier, and a null previous', () => {
    expect(snapshotsEqual(a, buildWidgetSnapshot({ wishlist: [], games, isPlus: false, now }))).toBe(false);
    expect(snapshotsEqual(a, buildWidgetSnapshot({ wishlist, games, isPlus: true, now }))).toBe(false);
    expect(snapshotsEqual(null, a)).toBe(false);
  });
});
