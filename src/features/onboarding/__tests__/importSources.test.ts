import { importSourcesFor, nextStep, previousStep, STEPS } from '../importSources';

const on = { xbox: true, psn: true };
const off = { xbox: false, psn: false };

describe('importSourcesFor', () => {
  it('maps each chosen platform to its import, in a fixed order', () => {
    const sources = importSourcesFor(new Set(['playstation', 'pc', 'xbox', 'mobile', 'nintendo']), 'android', on);
    expect(sources.map((s) => [s.id, s.available])).toEqual([['steam', true], ['xbox', true], ['psn', true], ['android', true]]);
  });
  it('has no phone scan on iOS and nothing for Nintendo', () => {
    expect(importSourcesFor(new Set(['mobile', 'nintendo']), 'ios', on)).toEqual([]);
  });
  it('keeps a switched-off import in the list, marked unavailable', () => {
    const sources = importSourcesFor(new Set(['xbox', 'playstation']), 'ios', off);
    expect(sources.map((s) => [s.id, s.available])).toEqual([['xbox', false], ['psn', false]]);
  });
});

describe('step order', () => {
  it('is name, username, platforms, import, games, friends', () => {
    expect(STEPS).toEqual(['name', 'username', 'platforms', 'import', 'games', 'friends']);
  });
  it('skips the import step when there is nothing to offer, both ways', () => {
    expect(nextStep('platforms', true)).toBe('import');
    expect(nextStep('platforms', false)).toBe('games');
    expect(previousStep('games', true)).toBe('import');
    expect(previousStep('games', false)).toBe('platforms');
  });
  it('stops at the ends', () => {
    expect(previousStep('name', true)).toBe('name');
    expect(nextStep('friends', true)).toBeNull();
  });
});
