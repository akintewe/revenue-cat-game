import React from 'react';
import { FlexWidget, ImageWidget, TextWidget } from 'react-native-android-widget';
import { canRoll, type RouletteState } from '../snapshot/roll';
import type { WidgetSnapshot } from '../snapshot/types';
import { Card, Cover, FullBleed, INK, INK_2, Label, Layer, Pill, gameLink, openUri, type Click } from './parts';

const D20 = require('../../../../assets/widgets/d20.png');

/** Handled in widgetTaskHandler: rolls in the background, the app does not open. */
export const ROLL_ACTION = 'ROLL';

type Props = { snapshot: WidgetSnapshot | null; state: RouletteState | null; today: string; size: 'small' | 'medium'; width: number; height: number };

export function RouletteWidget({ snapshot, state, today, size, width, height }: Props) {
  const pool = snapshot?.roulette.pool ?? [];
  if (pool.length === 0) {
    return (
      <Card bleed={null} {...openUri('prysm://library')}>
        <Layer justify="flex-end">
          <TextWidget text="Your backlog is empty" style={{ fontSize: 15, fontWeight: '600', color: INK }} />
          <TextWidget text="Add games to roll for one" style={{ fontSize: 12, color: INK_2 }} />
        </Layer>
      </Card>
    );
  }

  // A pick that left the backlog (started, removed) is no longer a pick.
  const pick = pool.find((item) => item.catalogId === state?.pickId) ?? null;
  const allowed = canRoll(state, snapshot?.isPlus ?? false, snapshot?.roulette.freeRollsPerDay ?? 1, today);
  const rollClick: Click = allowed ? { clickAction: ROLL_ACTION } : openUri('prysm://paywall');
  const pose = ((state?.rollsToday ?? 0) * 47) % 360;
  const cardClick = pick ? gameLink('game', pick.catalogId) : rollClick;

  if (size === 'small') {
    return pick ? (
      <Card bleed={pick.bleed} {...cardClick}>
        <FullBleed art={pick} width={width} height={height} />
        <Layer align="flex-end" padding={10}>
          <ImageWidget image={D20} imageWidth={37} imageHeight={40} style={{ rotation: pose }} {...rollClick} />
        </Layer>
        <Layer justify="flex-end">
          <Label text="Tonight you play" />
          <TextWidget text={pick.title} maxLines={2} truncate="END" style={{ fontSize: 15, fontWeight: '600', color: INK }} />
        </Layer>
      </Card>
    ) : (
      <Card bleed={null} {...cardClick}>
        <Layer align="center" padding={8}>
          <ImageWidget image={D20} imageWidth={114} imageHeight={124} style={{ rotation: pose }} />
        </Layer>
        <Layer align="center" justify="flex-end">
          <Pill text={allowed ? 'Roll' : 'Unlock rolls'} {...rollClick} />
        </Layer>
      </Card>
    );
  }

  return (
    <Card bleed={pick?.bleed ?? null} {...cardClick}>
      <FlexWidget style={{ width: 'match_parent', height: 'match_parent', padding: 16, flexDirection: 'row', alignItems: 'center', flexGap: 12 }}>
        <ImageWidget image={D20} imageWidth={83} imageHeight={90} style={{ rotation: pose + 14 }} />
        <FlexWidget style={{ flex: 1, flexDirection: 'column', flexGap: 4 }}>
          <Label text={pick ? 'Tonight you play' : 'Roll the backlog'} />
          <TextWidget text={pick ? pick.title : 'What do you play tonight?'} maxLines={pick ? 1 : 2} truncate="END" style={{ fontSize: 19, fontWeight: '600', color: INK }} />
          <TextWidget text={pick ? pick.detail : `${pool.length} ${pool.length === 1 ? 'game' : 'games'} waiting`} maxLines={2} truncate="END" style={{ fontSize: 12, color: INK_2 }} />
          <FlexWidget style={{ flexDirection: 'row', flexGap: 8, marginTop: 6 }}>
            <Pill text={allowed ? (pick ? 'Roll again' : 'Roll') : 'Unlock rolls'} quiet={Boolean(pick)} {...rollClick} />
            {pick ? <Pill text="Start" {...gameLink('start', pick.catalogId)} /> : null}
          </FlexWidget>
        </FlexWidget>
        {pick ? <Cover art={pick} width={60} /> : null}
      </FlexWidget>
    </Card>
  );
}
