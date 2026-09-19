import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { requestWidgetUpdate, type WidgetTaskHandlerProps } from 'react-native-android-widget';
import { localDayKey } from '../snapshot/days';
import { canRoll, roll, type RouletteState } from '../snapshot/roll';
import { WIDGET_ROULETTE_KEY, WIDGET_SNAPSHOT_KEY, type WidgetSnapshot } from '../snapshot/types';
import { CountdownWidget } from './CountdownWidget';
import { parseSnapshot } from './model';
import { ROLL_ACTION, RouletteWidget } from './RouletteWidget';
import { UpNextWidget } from './UpNextWidget';

/** Must match the widget names in app.json (react-native-android-widget plugin). */
const WIDGETS = {
  CountdownSmall: { kind: 'countdown', size: 'small' },
  CountdownMedium: { kind: 'countdown', size: 'medium' },
  UpNextSmall: { kind: 'upNext', size: 'small' },
  UpNextMedium: { kind: 'upNext', size: 'medium' },
  RouletteSmall: { kind: 'roulette', size: 'small' },
  RouletteMedium: { kind: 'roulette', size: 'medium' },
} as const;
type WidgetName = keyof typeof WIDGETS;
type Frame = { width: number; height: number };
const DEFAULT_FRAME: Record<'small' | 'medium', Frame> = { small: { width: 170, height: 170 }, medium: { width: 360, height: 170 } };

async function readSnapshot(): Promise<WidgetSnapshot | null> {
  try {
    return parseSnapshot(await AsyncStorage.getItem(WIDGET_SNAPSHOT_KEY));
  } catch {
    return null;
  }
}

async function readRoulette(): Promise<RouletteState | null> {
  try {
    const json = await AsyncStorage.getItem(WIDGET_ROULETTE_KEY);
    const value = json ? (JSON.parse(json) as Partial<RouletteState>) : null;
    if (!value || typeof value.rollDay !== 'string' || typeof value.rollsToday !== 'number') return null;
    return { pickId: typeof value.pickId === 'string' ? value.pickId : null, rollDay: value.rollDay, rollsToday: value.rollsToday };
  } catch {
    return null;
  }
}

function render(name: WidgetName, snapshot: WidgetSnapshot | null, state: RouletteState | null, frame?: Frame) {
  const { kind, size } = WIDGETS[name];
  const { width, height } = frame && frame.width > 0 ? frame : DEFAULT_FRAME[size];
  const now = new Date();
  if (kind === 'countdown') return <CountdownWidget snapshot={snapshot} size={size} now={now} />;
  if (kind === 'upNext') return <UpNextWidget snapshot={snapshot} size={size} width={width} height={height} />;
  return <RouletteWidget snapshot={snapshot} state={state} today={localDayKey(now)} size={size} width={width} height={height} />;
}

/** Runs headless, without the app UI: on add, resize, the 30-minute system update, and clicks. */
export async function widgetTaskHandler({ widgetInfo, widgetAction, clickAction, renderWidget }: WidgetTaskHandlerProps) {
  const name = widgetInfo.widgetName as WidgetName;
  if (!(name in WIDGETS) || widgetAction === 'WIDGET_DELETED') return;

  const snapshot = await readSnapshot();
  let state = await readRoulette();

  if (widgetAction === 'WIDGET_CLICK' && clickAction === ROLL_ACTION && snapshot) {
    const today = localDayKey(new Date());
    if (canRoll(state, snapshot.isPlus, snapshot.roulette.freeRollsPerDay, today)) {
      state = roll(snapshot.roulette.pool.map((item) => item.catalogId), state, today, Math.random);
      await AsyncStorage.setItem(WIDGET_ROULETTE_KEY, JSON.stringify(state));
      // The other roulette size shows the same pick.
      const other: WidgetName = name === 'RouletteSmall' ? 'RouletteMedium' : 'RouletteSmall';
      const rolled = state;
      void requestWidgetUpdate({ widgetName: other, renderWidget: (info) => render(other, snapshot, rolled, info) });
    }
  }

  renderWidget(render(name, snapshot, state, widgetInfo));
}

/** Called by the app right after it stores a new snapshot. */
export async function refreshAndroidWidgets(): Promise<void> {
  const [snapshot, state] = await Promise.all([readSnapshot(), readRoulette()]);
  await Promise.all(
    (Object.keys(WIDGETS) as WidgetName[]).map((widgetName) =>
      requestWidgetUpdate({ widgetName, renderWidget: (info) => render(widgetName, snapshot, state, info) }),
    ),
  );
}
