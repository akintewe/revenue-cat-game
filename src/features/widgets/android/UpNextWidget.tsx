import React from 'react';
import { FlexWidget, ImageWidget, TextWidget } from 'react-native-android-widget';
import type { WidgetSnapshot } from '../snapshot/types';
import { ACCENT, Card, Cover, FullBleed, INK, INK_2, Label, Layer, Pill, gameLink, openUri } from './parts';

const CONTROLLER = require('../../../../assets/widgets/controller.png');

type Props = { snapshot: WidgetSnapshot | null; size: 'small' | 'medium'; width: number; height: number };

/** The game in play. Pure: everything it shows is already a sentence in the snapshot. */
export function UpNextWidget({ snapshot, size, width, height }: Props) {
  const hero = snapshot?.upNext.items[0];
  if (!hero) {
    const count = snapshot?.upNext.backlogCount ?? 0;
    return (
      <Card bleed={null} {...openUri('prysm://library')}>
        <Layer align="flex-end" padding={0}>
          <ImageWidget image={CONTROLLER} imageWidth={140} imageHeight={106} style={{ rotation: -10, marginTop: 10 }} />
        </Layer>
        <Layer justify="flex-end">
          <TextWidget text="Nothing in play" style={{ fontSize: 15, fontWeight: '600', color: INK }} />
          <TextWidget text={count > 0 ? `Pick from ${count} in your backlog` : 'Add a game to start'} style={{ fontSize: 12, color: INK_2 }} />
        </Layer>
      </Card>
    );
  }

  if (size === 'small') {
    return (
      <Card bleed={hero.bleed} {...gameLink('game', hero.catalogId)}>
        <FullBleed art={hero} width={width} height={height} />
        <Layer justify="flex-end">
          <Label text="Playing" />
          <TextWidget text={hero.title} maxLines={2} truncate="END" style={{ fontSize: 15, fontWeight: '600', color: INK }} />
          <TextWidget text={hero.summary} maxLines={1} truncate="END" style={{ fontSize: 12, color: INK_2 }} />
        </Layer>
      </Card>
    );
  }

  const percent = hero.progress === null ? null : Math.round(hero.progress * 100);
  return (
    <Card bleed={hero.bleed} {...gameLink('game', hero.catalogId)}>
      <FlexWidget style={{ width: 'match_parent', height: 'match_parent', padding: 16, flexDirection: 'row', alignItems: 'center', flexGap: 14 }}>
        <Cover art={hero} width={92} radius={10} />
        <FlexWidget style={{ flex: 1, flexDirection: 'column', flexGap: 4 }}>
          <Label text="Playing" />
          <TextWidget text={hero.title} maxLines={2} truncate="END" style={{ fontSize: 19, fontWeight: '600', color: INK }} />
          <TextWidget text={hero.detail} maxLines={1} truncate="END" style={{ fontSize: 12, color: INK_2 }} />
          {percent === null ? null : (
            <FlexWidget style={{ flexDirection: 'row', alignItems: 'center', flexGap: 10, marginTop: 6 }}>
              <TextWidget text={`${percent}%`} style={{ fontSize: 13, fontWeight: '700', color: ACCENT }} />
              <Pill text="Update hours" quiet {...gameLink('game', hero.catalogId)} />
            </FlexWidget>
          )}
        </FlexWidget>
      </FlexWidget>
    </Card>
  );
}
