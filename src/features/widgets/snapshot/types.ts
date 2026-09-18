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
/** `group.` + the iOS bundle id. Also named in targets/widgets (config and SnapshotStore.swift). */
export const APP_GROUP = 'group.com.fastmakers.revenuecatgame';

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

export type UpNextItem = {
  catalogId: string;
  title: string;
  hoursPlayed: number | null;
  timeToBeatHours: number | null;
  /** 0..1, capped. Null when hours or time to beat is unknown. */
  progress: number | null;
  /** "31h · about halfway". The builder writes the sentence, the widgets print it. */
  summary: string;
  /** "31h played · about 60h to beat" */
  detail: string;
  coverFile: string | null;
  coverUrl: string | null;
  bleed: string;
};

export type RouletteItem = {
  catalogId: string;
  title: string;
  /** "about 22h · in your backlog since March" */
  detail: string;
  coverFile: string | null;
  coverUrl: string | null;
  bleed: string;
};

/** Written by the widgets themselves (iOS App Intent, Android click handler), not by the app. */
export const WIDGET_ROULETTE_KEY = 'widgetRoulette';
export const FREE_ROLLS_PER_DAY = 1;

export type WidgetSnapshot = {
  version: typeof WIDGET_SNAPSHOT_VERSION;
  /** Epoch ms. */
  generatedAt: number;
  isPlus: boolean;
  countdown: { items: CountdownItem[] };
  /** Games in play, most hours first. `backlogCount` feeds the empty state. */
  upNext: { items: UpNextItem[]; backlogCount: number };
  /** The pool the widget rolls from. The pick and the roll count live under WIDGET_ROULETTE_KEY. */
  roulette: { pool: RouletteItem[]; freeRollsPerDay: number };
};
