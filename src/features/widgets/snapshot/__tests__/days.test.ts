import { daysUntil, localDayKey } from '../days';

describe('daysUntil', () => {
  const now = new Date(2026, 8, 22, 23, 30); // 22 Sep 2026, 23:30 local

  it('counts whole local days, ignoring the time of day', () => {
    expect(daysUntil('2026-10-04', now)).toBe(12);
    expect(daysUntil('2026-09-23', now)).toBe(1);
  });

  it('is 0 on release day and negative after', () => {
    expect(daysUntil('2026-09-22', now)).toBe(0);
    expect(daysUntil('2026-09-20', now)).toBe(-2);
  });

  it('survives a daylight-saving change', () => {
    expect(daysUntil('2026-11-02', new Date(2026, 9, 31, 12))).toBe(2);
  });

  it('accepts a full ISO timestamp and uses its date part', () => {
    expect(daysUntil('2026-09-25T00:00:00Z', now)).toBe(3);
  });

  it('returns NaN for a malformed date', () => {
    expect(daysUntil('soon', now)).toBeNaN();
  });
});

test('localDayKey pads month and day', () => {
  expect(localDayKey(new Date(2026, 0, 5, 9))).toBe('2026-01-05');
});
