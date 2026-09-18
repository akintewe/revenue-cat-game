/**
 * The contract between the app and the home screen widgets.
 * The SwiftUI target (targets/widgets/SnapshotStore.swift) and the Android widgets decode this
 * shape, so change it only together with them, and bump the version for a breaking change.
 */
export const WIDGET_SNAPSHOT_VERSION = 1;
/** UserDefaults key on iOS, AsyncStorage key on Android. */
export const WIDGET_SNAPSHOT_KEY = 'widgetSnapshot';
/** Folder for cover thumbnails inside the iOS App Group container. */
export const WIDGET_COVER_DIR = 'widget-covers';
export const APP_GROUP = 'group.com.nathanakin.revenuecatgame';

export type CountdownItem = {
  catalogId: string;
  title: string;
  /** The subtitle of a "Series: Subtitle" name, for the small widget's one-line label. */
  shortTitle: string;
  /** ISO date, YYYY-MM-DD. The widgets compute "days left" from this, so an old snapshot stays right. */
  releaseDate: string;
  /** File name inside WIDGET_COVER_DIR (iOS). Null when the game has no cover art. */
  coverFile: string | null;
  /** Remote cover URL (Android renders it directly). */
  coverUrl: string | null;
  /** Hex colour for the card's radial bleed. */
  bleed: string;
};

export type WidgetSnapshot = {
  version: typeof WIDGET_SNAPSHOT_VERSION;
  /** Epoch ms. */
  generatedAt: number;
  isPlus: boolean;
  countdown: { items: CountdownItem[] };
};
