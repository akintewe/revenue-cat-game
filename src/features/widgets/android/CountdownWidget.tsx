import React from 'react';
import { FlexWidget, ImageWidget, OverlapWidget, TextWidget } from 'react-native-android-widget';
import type { ImageWidgetSource } from 'react-native-android-widget';
import type { WidgetSnapshot } from '../snapshot/types';
import { dim, shortDate, upcoming, type CountdownRow } from './model';

const HOURGLASS = require('../../../../assets/widgets/hourglass.png');
const ACCENT = '#FD5021';
const INK = '#FFFFFF';
const INK_2 = 'rgba(255, 255, 255, 0.62)';
const GLASS_BLEED = '#D46947';
const RADIUS = 28;

type Props = { snapshot: WidgetSnapshot | null; size: 'small' | 'medium'; now: Date };

/**
 * The Android release countdown. A pure function of its props: the task handler and the app's
 * update call both render it, and neither may read anything else.
 * Android draws this tree to a bitmap, so there is no radial gradient; a diagonal one stands in.
 */
export function CountdownWidget({ snapshot, size, now }: Props) {
  const rows = upcoming(snapshot, now);
  const hero = rows[0];
  if (!hero) return <Empty />;
  return size === 'medium' ? <Medium hero={hero} rest={rows.slice(1, 3)} /> : <Small hero={hero} />;
}

function link(row: CountdownRow) {
  return { clickAction: 'OPEN_URI' as const, clickActionData: { uri: `prysm://game/${encodeURIComponent(row.catalogId)}` } };
}

function Card({ bleed, children, ...click }: { bleed: string; children: React.ReactNode; clickAction: string; clickActionData?: Record<string, unknown> }) {
  return (
    <OverlapWidget
      {...click}
      style={{
        width: 'match_parent',
        height: 'match_parent',
        borderRadius: RADIUS,
        overflow: 'hidden',
        backgroundGradient: { from: '#000000', to: dim(bleed, 0.55), orientation: 'TL_BR' },
      }}
    >
      {children}
    </OverlapWidget>
  );
}

function Hourglass() {
  return (
    <FlexWidget style={{ width: 'match_parent', height: 'match_parent', alignItems: 'flex-end', justifyContent: 'flex-end' }}>
      <ImageWidget image={HOURGLASS} imageWidth={57} imageHeight={122} style={{ rotation: 14 }} />
    </FlexWidget>
  );
}

function Small({ hero }: { hero: CountdownRow }) {
  const out = hero.days === 0;
  return (
    <Card bleed={GLASS_BLEED} {...link(hero)}>
      <Hourglass />
      <FlexWidget style={{ width: 'match_parent', height: 'match_parent', padding: 16, flexDirection: 'column' }}>
        <TextWidget text={out ? hero.shortTitle : `${hero.shortTitle} in`} maxLines={1} truncate="END" style={{ fontSize: 12, fontWeight: '600', color: ACCENT }} />
        <TextWidget
          text={out ? 'Out now' : String(hero.days)}
          maxLines={out ? 2 : 1}
          style={{ fontSize: out ? 30 : hero.days > 99 ? 50 : 68, fontWeight: '900', color: INK, letterSpacing: -0.04 }}
        />
        <FlexWidget style={{ flex: 1 }} />
        <TextWidget
          text={out ? shortDate(hero.releaseDate) : `${hero.days === 1 ? 'day' : 'days'} · ${shortDate(hero.releaseDate)}`}
          style={{ fontSize: 12, color: INK_2 }}
        />
      </FlexWidget>
    </Card>
  );
}

function Cover({ row, width, tagged }: { row: CountdownRow; width: number; tagged?: boolean }) {
  const height = Math.round((width * 4) / 3);
  return (
    <OverlapWidget style={{ width, height }}>
      {row.coverUrl ? (
        <ImageWidget image={row.coverUrl as ImageWidgetSource} imageWidth={width} imageHeight={height} radius={8} resizeMode="cover" />
      ) : (
        <FlexWidget style={{ width, height, borderRadius: 8, backgroundColor: dim(row.bleed, 1), alignItems: 'center', justifyContent: 'center' }}>
          <TextWidget text={row.title.slice(0, 2).toUpperCase()} style={{ fontSize: Math.round(width * 0.3), fontWeight: '800', color: INK }} />
        </FlexWidget>
      )}
      {tagged ? (
        <FlexWidget style={{ width, height, justifyContent: 'flex-end', padding: 4 }}>
          <TextWidget
            text={`${row.days}d`}
            style={{ fontSize: 10, fontWeight: '700', color: INK, backgroundColor: 'rgba(0, 0, 0, 0.72)', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 }}
          />
        </FlexWidget>
      ) : null}
    </OverlapWidget>
  );
}

function Medium({ hero, rest }: { hero: CountdownRow; rest: CountdownRow[] }) {
  const out = hero.days === 0;
  return (
    <Card bleed={hero.bleed} {...link(hero)}>
      <FlexWidget style={{ width: 'match_parent', height: 'match_parent', padding: 16, flexDirection: 'row' }}>
        <FlexWidget style={{ flex: 1, height: 'match_parent', flexDirection: 'column' }}>
          <TextWidget text={out ? 'Out now' : 'Out in'} style={{ fontSize: 12, fontWeight: '600', color: ACCENT }} />
          {out ? null : (
            <FlexWidget style={{ flexDirection: 'row', alignItems: 'flex-end', flexGap: 6 }}>
              <TextWidget text={String(hero.days)} style={{ fontSize: 60, fontWeight: '900', color: INK, letterSpacing: -0.04 }} />
              <TextWidget text={hero.days === 1 ? 'day' : 'days'} style={{ fontSize: 14, color: INK_2, marginBottom: 12 }} />
            </FlexWidget>
          )}
          <FlexWidget style={{ flex: 1 }} />
          <TextWidget text={hero.title} maxLines={out ? 3 : 1} truncate="END" style={{ fontSize: 15, fontWeight: '600', color: INK }} />
          <TextWidget text={shortDate(hero.releaseDate)} style={{ fontSize: 12, color: INK_2 }} />
        </FlexWidget>
        {/* The fan: later releases behind, the nearest on top. Children draw in order. */}
        <OverlapWidget style={{ width: 170, height: 'match_parent' }}>
          {rest[1] ? (
            <FlexWidget style={{ marginLeft: 8, marginTop: 28, rotation: -9 }}>
              <Cover row={rest[1]} width={62} tagged />
            </FlexWidget>
          ) : null}
          {rest[0] ? (
            <FlexWidget style={{ marginLeft: 40, marginTop: 14, rotation: -3 }}>
              <Cover row={rest[0]} width={78} tagged />
            </FlexWidget>
          ) : null}
          <FlexWidget style={{ marginLeft: 76, rotation: 4 }}>
            <Cover row={hero} width={94} />
          </FlexWidget>
        </OverlapWidget>
      </FlexWidget>
    </Card>
  );
}

function Empty() {
  return (
    <Card bleed={GLASS_BLEED} clickAction="OPEN_URI" clickActionData={{ uri: 'prysm://wishlist' }}>
      <Hourglass />
      <FlexWidget style={{ width: 'match_parent', height: 'match_parent', padding: 16, flexDirection: 'column' }}>
        <TextWidget text="Release countdown" style={{ fontSize: 12, fontWeight: '600', color: ACCENT }} />
        <FlexWidget style={{ flex: 1 }} />
        <TextWidget text="Wishlist a game to count it down" maxLines={3} style={{ fontSize: 15, fontWeight: '600', color: INK }} />
      </FlexWidget>
    </Card>
  );
}
