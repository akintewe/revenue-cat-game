import { parseWidgetLink } from '../../links';

describe('parseWidgetLink', () => {
  it('reads a game link and decodes the id', () => {
    expect(parseWidgetLink('prysm://game/elden-ring')).toEqual({ kind: 'game', catalogId: 'elden-ring' });
    expect(parseWidgetLink('prysm://game/igdb%3A12')).toEqual({ kind: 'game', catalogId: 'igdb:12' });
    expect(parseWidgetLink('prysm:///game/x?from=widget')).toEqual({ kind: 'game', catalogId: 'x' });
  });
  it('reads a start link', () => {
    expect(parseWidgetLink('prysm://start/hades-ii')).toEqual({ kind: 'start', catalogId: 'hades-ii' });
    expect(parseWidgetLink('prysm://start')).toBeNull();
  });
  it('reads the wishlist and paywall links', () => {
    expect(parseWidgetLink('prysm://wishlist')).toEqual({ kind: 'wishlist' });
    expect(parseWidgetLink('prysm://paywall/')).toEqual({ kind: 'paywall' });
  });
  it('ignores everything else', () => {
    expect(parseWidgetLink('prysm://link/steam?status=ok')).toBeNull();
    expect(parseWidgetLink('prysm://game')).toBeNull();
    expect(parseWidgetLink('prysm://game/a/b')).toBeNull();
    expect(parseWidgetLink('prysm://game/%E0%A4%A')).toBeNull();
    expect(parseWidgetLink('https://prysm.app/game/x')).toBeNull();
  });
});
