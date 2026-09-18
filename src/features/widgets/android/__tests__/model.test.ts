import { dim, parseSnapshot, shortDate, upcoming } from '../model';

const item = { catalogId: 'a', title: 'A', shortTitle: 'A', releaseDate: '2026-10-04', coverFile: null, coverUrl: null, bleed: '#2FB6A8' };
const snapshot = { version: 1 as const, generatedAt: 0, isPlus: false, countdown: { items: [item, { ...item, catalogId: 'old', releaseDate: '2026-09-01' }] } };

describe('parseSnapshot', () => {
  it('reads a valid snapshot', () => {
    expect(parseSnapshot(JSON.stringify(snapshot))?.countdown.items).toHaveLength(2);
  });
  it('rejects missing, broken, newer-version and malformed input', () => {
    expect(parseSnapshot(null)).toBeNull();
    expect(parseSnapshot('{oops')).toBeNull();
    expect(parseSnapshot(JSON.stringify({ ...snapshot, version: 2 }))).toBeNull();
    expect(parseSnapshot(JSON.stringify({ version: 1 }))).toBeNull();
    expect(parseSnapshot('null')).toBeNull();
  });
});

test('upcoming drops games that came out since the snapshot and counts the days', () => {
  const rows = upcoming(snapshot, new Date(2026, 8, 22, 9));
  expect(rows.map((r) => [r.catalogId, r.days])).toEqual([['a', 12]]);
  expect(upcoming(null, new Date())).toEqual([]);
});

test('shortDate', () => {
  expect(shortDate('2026-10-04')).toBe('4 Oct');
  expect(shortDate('bad')).toBe('');
});

test('dim scales each channel toward black', () => {
  expect(dim('#FF8040', 0.5)).toBe('#804020');
  expect(dim('#FF8040', 0)).toBe('#000000');
  expect(dim('nope', 1)).toBe('#fd5021');
});
