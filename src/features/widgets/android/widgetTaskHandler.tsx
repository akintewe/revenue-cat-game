import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { requestWidgetUpdate, type WidgetTaskHandlerProps } from 'react-native-android-widget';
import { WIDGET_SNAPSHOT_KEY } from '../snapshot/types';
import { CountdownWidget } from './CountdownWidget';
import { parseSnapshot } from './model';

/** Must match the widget names in app.json (react-native-android-widget plugin). */
const SIZES = { CountdownSmall: 'small', CountdownMedium: 'medium' } as const;
type WidgetName = keyof typeof SIZES;

async function readSnapshot() {
  try {
    return parseSnapshot(await AsyncStorage.getItem(WIDGET_SNAPSHOT_KEY));
  } catch {
    return null;
  }
}

/** Runs headless, without the app UI: on add, on resize, and on the 30-minute system update. */
export async function widgetTaskHandler({ widgetInfo, widgetAction, renderWidget }: WidgetTaskHandlerProps) {
  const size = SIZES[widgetInfo.widgetName as WidgetName];
  if (!size || widgetAction === 'WIDGET_DELETED') return;
  renderWidget(<CountdownWidget snapshot={await readSnapshot()} size={size} now={new Date()} />);
}

/** Called by the app right after it stores a new snapshot. */
export async function refreshAndroidWidgets(): Promise<void> {
  const snapshot = await readSnapshot();
  await Promise.all(
    (Object.keys(SIZES) as WidgetName[]).map((widgetName) =>
      requestWidgetUpdate({
        widgetName,
        renderWidget: () => <CountdownWidget snapshot={snapshot} size={SIZES[widgetName]} now={new Date()} />,
      }),
    ),
  );
}
