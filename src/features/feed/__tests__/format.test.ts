import { compactCount, platformIconNames, pollTimeLeft, shortGenres, voteCountLabel } from '../format';

describe('compactCount', () => {
  it('keeps small numbers as they are', () => {
    expect(compactCount(0)).toBe('0');
    expect(compactCount(742)).toBe('742');
    expect(compactCount(999)).toBe('999');
  });

  it('uses one decimal below ten thousand and drops a trailing .0', () => {
    expect(compactCount(1204)).toBe('1.2K');
    expect(compactCount(1000)).toBe('1K');
    expect(compactCount(9950)).toBe('9.9K');
  });

  it('rounds to whole thousands and millions above that', () => {
    expect(compactCount(12_400)).toBe('12K');
    expect(compactCount(1_500_000)).toBe('1.5M');
  });
});

describe('pollTimeLeft', () => {
  const now = Date.parse('2026-09-18T10:00:00Z');
  const at = (minutes: number) => new Date(now + minutes * 60_000).toISOString();

  it('matches the mock for hours and minutes', () => {
    expect(pollTimeLeft(at(2 * 60 + 18), now)).toBe('Ends in 2hrs 18 min');
  });

  it('uses the singular for one hour and hides zero minutes', () => {
    expect(pollTimeLeft(at(60), now)).toBe('Ends in 1hr');
    expect(pollTimeLeft(at(65), now)).toBe('Ends in 1hr 5 min');
  });

  it('counts minutes under an hour and days over a day', () => {
    expect(pollTimeLeft(at(45), now)).toBe('Ends in 45 min');
    expect(pollTimeLeft(at(24 * 60), now)).toBe('Ends in 1 day');
    expect(pollTimeLeft(at(3 * 24 * 60 + 30), now)).toBe('Ends in 3 days');
  });

  it('says the poll is over once the end time passes', () => {
    expect(pollTimeLeft(at(0), now)).toBe('Final results');
    expect(pollTimeLeft(at(-90), now)).toBe('Final results');
  });
});

describe('voteCountLabel', () => {
  it('groups thousands like the mock and uses the singular for one', () => {
    expect(voteCountLabel(1248)).toBe('1,248 Votes');
    expect(voteCountLabel(1)).toBe('1 Vote');
    expect(voteCountLabel(0)).toBe('0 Votes');
  });
});

describe('shortGenres', () => {
  it('shortens IGDB names, drops repeats and keeps the first three', () => {
    expect(shortGenres(['Role-playing (RPG)', 'Adventure', 'Simulator', 'Indie'])).toEqual(['RPG', 'Adventure', 'Sim']);
    expect(shortGenres(["Hack and slash/Beat 'em up", "Hack and slash/Beat 'em up"])).toEqual(['Action']);
    expect(shortGenres(null)).toEqual([]);
  });
});

describe('platformIconNames', () => {
  it('orders families the same way every time and caps the count', () => {
    expect(platformIconNames(['pc', 'xbox', 'nintendo', 'playstation'])).toEqual(['PS5', 'Xbox', 'Switch']);
    expect(platformIconNames(['mobile'])).toEqual(['Mobile']);
    expect(platformIconNames(null)).toEqual([]);
  });
});
