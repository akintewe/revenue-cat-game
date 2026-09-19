# Widgets 1: Foundation + Release Countdown — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the shared widget pipeline and the Release countdown widget (small, medium, iOS lock screen) on iOS and Android.

**Architecture:** A pure TypeScript builder turns the wishlist and the catalog into a versioned JSON snapshot. A publisher writes the snapshot and cover thumbnails to shared storage and asks the OS to reload. A SwiftUI target and an Android JSX widget render the snapshot; they hold no app logic except "days from today".

**Tech Stack:** Expo SDK 57, TypeScript, Zustand, jest-expo, `@bacons/apple-targets` 5.0.0 (SwiftUI/WidgetKit), `react-native-android-widget` 0.22.1, `expo-file-system` (`Paths.appleSharedContainers`), AsyncStorage.

**Spec:** `docs/superpowers/specs/2026-09-18-home-screen-widgets-design.md`

## Global Constraints

- Read https://docs.expo.dev/versions/v57.0.0/ for any Expo API before using it (AGENTS.md).
- App Group: `group.com.nathanakin.revenuecatgame`. UserDefaults / AsyncStorage key: `widgetSnapshot`. Cover folder: `widget-covers`.
- Snapshot `version: 1`. Renderers must show the empty state, not crash, for a missing or newer-version snapshot.
- Colours: card `#000000`, accent `#FD5021`, ink white at 1.0 / 0.62 / 0.38.
- iOS widget deployment target `17.0`. Local builds use `DEVELOPER_DIR=/Applications/Xcode-26.6.0.app/Contents/Developer`.
- Finish every install with `npx -y npm@10.9.8 install`.
- Commits: imperative, no AI attribution, no co-author lines, explicit paths only (other sessions share this repo). Never force push.
- `ios/` and `android/` are generated (gitignored). Native changes go through config plugins and `targets/`.

## File map

| File | Responsibility |
|---|---|
| `src/features/widgets/snapshot/types.ts` | Snapshot types and constants |
| `src/features/widgets/snapshot/days.ts` | `daysUntil`, `localDayKey` (pure date maths) |
| `src/features/widgets/snapshot/buildCountdown.ts` | wishlist + games → `CountdownItem[]` |
| `src/features/widgets/snapshot/buildWidgetSnapshot.ts` | assembles the whole snapshot |
| `src/features/widgets/snapshot/__tests__/*.test.ts` | jest tests for the three above |
| `src/features/widgets/publish/sharedStore.ts` | platform write + reload (the only native touchpoint) |
| `src/features/widgets/publish/coverCache.ts` | download covers next to the snapshot |
| `src/features/widgets/publish/publishWidgetSnapshot.ts` | resolve games, build, cache covers, write |
| `src/features/widgets/publish/useWidgetPublisher.ts` | store subscriptions, debounce, foreground |
| `src/features/widgets/android/CountdownWidget.tsx` | Android JSX layout |
| `src/features/widgets/android/widgetTaskHandler.tsx` | Android headless handler |
| `targets/widgets/expo-target.config.js` | target config, App Group, images |
| `targets/widgets/*.swift` | `PrysmWidgets` bundle, `SnapshotStore`, `Theme`, `CountdownWidget` |

---

### Task 1: Snapshot types and date maths

**Files:** Create `src/features/widgets/snapshot/types.ts`, `days.ts`, `__tests__/days.test.ts`.

**Interfaces — Produces:**
```ts
export const WIDGET_SNAPSHOT_VERSION = 1;
export const WIDGET_SNAPSHOT_KEY = 'widgetSnapshot';
export const WIDGET_COVER_DIR = 'widget-covers';
export const APP_GROUP = 'group.com.nathanakin.revenuecatgame';
export type CountdownItem = { catalogId: string; title: string; releaseDate: string; coverFile: string | null; coverUrl: string | null; bleed: string };
export type WidgetSnapshot = { version: 1; generatedAt: number; isPlus: boolean; countdown: { items: CountdownItem[] } };
export function daysUntil(isoDate: string, now: Date): number;   // whole local days, 0 = today, negative = past
export function localDayKey(d: Date): string;                    // 'YYYY-MM-DD' in local time
```
`coverUrl` is added to the spec's shape: Android renders remote URLs directly, iOS uses `coverFile`.

- [ ] **Step 1: failing test** `__tests__/days.test.ts`
```ts
import { daysUntil, localDayKey } from '../days';
describe('daysUntil', () => {
  const now = new Date(2026, 8, 22, 23, 30); // 22 Sep 2026, 23:30 local
  it('counts whole local days, ignoring the time of day', () => {
    expect(daysUntil('2026-10-04', now)).toBe(12);
    expect(daysUntil('2026-09-23', now)).toBe(1);
  });
  it('is 0 on release day and negative after', () => {
    expect(daysUntil('2026-09-22', now)).toBe(0);
    expect(daysUntil('2026-09-20', now)).toBe(-2);
  });
  it('survives a daylight-saving change', () => {
    expect(daysUntil('2026-11-02', new Date(2026, 9, 31, 12))).toBe(2);
  });
  it('returns NaN for a malformed date', () => {
    expect(daysUntil('soon', now)).toBeNaN();
  });
});
test('localDayKey pads month and day', () => {
  expect(localDayKey(new Date(2026, 0, 5, 9))).toBe('2026-01-05');
});
```
- [ ] **Step 2:** `npx jest src/features/widgets -t daysUntil` → FAIL (module not found).
- [ ] **Step 3: implement** `days.ts` — parse `YYYY-MM-DD` with a regex, build both dates with `Date.UTC(y, m-1, d)` from *local* calendar parts, divide by 86 400 000, `Math.round`. `types.ts` as in Interfaces.
- [ ] **Step 4:** tests PASS. **Step 5:** commit `Add widget snapshot types and day maths`.

### Task 2: Countdown builder

**Files:** Create `snapshot/buildCountdown.ts`, `__tests__/buildCountdown.test.ts`.

**Interfaces — Consumes:** Task 1 types, `WishlistEntry` (`src/features/wishlist/types`), `CatalogGame` (`src/data/catalog`), `coverColors` (`src/shared/theme/theme`).
**Produces:**
```ts
export const COUNTDOWN_MAX = 4;
export function buildCountdown(entries: WishlistEntry[], games: Record<string, CatalogGame | undefined>, now: Date): CountdownItem[];
export function coverFileFor(catalogId: string): string; // safe file name + '.jpg'
```
Rules: keep entries whose game has a parseable `releaseDate` with `daysUntil >= 0`; sort by date, then title; take 4; `bleed = coverColors[game.colorKey] ?? '#FD5021'`; `coverFile` is set only when `coverImageUrl` exists; `coverFileFor` replaces every char outside `[A-Za-z0-9_-]` with `_`.

- [ ] **Step 1: failing tests** — cases: drops released and undated games; sorts soonest first with title tiebreak; caps at 4; release-day game is kept (0 days); unknown game id is skipped; `coverFileFor('igdb:12/3')` → `'igdb_12_3.jpg'`; no cover URL → `coverFile: null, coverUrl: null`.
- [ ] **Step 2:** run → FAIL. **Step 3:** implement. **Step 4:** PASS. **Step 5:** commit `Build the countdown widget payload from the wishlist`.

### Task 3: Snapshot assembly

**Files:** Create `snapshot/buildWidgetSnapshot.ts`, `__tests__/buildWidgetSnapshot.test.ts`.

**Produces:**
```ts
export type SnapshotInput = { wishlist: WishlistEntry[]; games: Record<string, CatalogGame | undefined>; isPlus: boolean; now: Date };
export function buildWidgetSnapshot(input: SnapshotInput): WidgetSnapshot;
export function snapshotsEqual(a: WidgetSnapshot | null, b: WidgetSnapshot): boolean; // ignores generatedAt
```
- [ ] Tests: version is 1; `generatedAt === now.getTime()`; `snapshotsEqual` is true when only `generatedAt` differs and false when an item changes. Implement, PASS, commit `Assemble the versioned widget snapshot`.

### Task 4: Publisher (JS side)

**Files:** Create `publish/sharedStore.ts`, `publish/coverCache.ts`, `publish/publishWidgetSnapshot.ts`, `publish/useWidgetPublisher.ts`; modify `App.tsx` (mount the hook); modify `package.json` via installs.

- [ ] **Step 1:** `npx expo install @bacons/apple-targets react-native-android-widget` then `npx -y npm@10.9.8 install`.
- [ ] **Step 2: `sharedStore.ts`** — `writeSnapshot(json: string): Promise<void>` and `reloadWidgets(): void`. iOS: `require('@bacons/apple-targets').ExtensionStorage` inside `try` (an older dev build has no native module; log once and return). Android: `AsyncStorage.setItem(WIDGET_SNAPSHOT_KEY, json)` then `requestWidgetUpdate` for each registered widget name. Other platforms: no-op.
- [ ] **Step 3: `coverCache.ts`** — `cacheCovers(items: {coverFile: string|null; coverUrl: string|null}[]): Promise<void>`; iOS only. Directory `new Directory(Paths.appleSharedContainers[APP_GROUP], WIDGET_COVER_DIR)`, `create({ idempotent: true, intermediates: true })`; skip files that exist; `File.downloadFileAsync(url, file)`; delete files no longer referenced; every failure is swallowed per file.
- [ ] **Step 4: `publishWidgetSnapshot.ts`** — resolve each wishlist `catalogId` with `resolveCatalogGame(id, { track: false })` (`Promise.allSettled`), build, compare with the last published snapshot via `snapshotsEqual` (skip when equal and the day key is unchanged), `cacheCovers`, `writeSnapshot`, `reloadWidgets`. Whole body in `try/catch`; never throws.
- [ ] **Step 5: `useWidgetPublisher.ts`** — subscribe to `useWishlistStore` and `useAuthStore`, debounce 500 ms, publish on `AppState` `active`, publish an empty snapshot on sign-out. `isPlus` comes from the existing RevenueCat customer-info check; `false` on error.
- [ ] **Step 6:** mount `useWidgetPublisher()` in `App.tsx`. `npm run typecheck && npm run lint && npm test` → all pass. Commit `Publish the widget snapshot to shared storage`.

### Task 5: iOS target and countdown widget

**Files:** Create `targets/widgets/expo-target.config.js`, `index.swift`, `SnapshotStore.swift`, `Theme.swift`, `CountdownWidget.swift`, `assets/widgets/hourglass.png` (copied from `dist/widget-board/img/hourglass.png`); modify `app.json` (plugin `@bacons/apple-targets`, `ios.entitlements` App Group).

- [ ] **Step 1: config**
```js
/** @type {import('@bacons/apple-targets/app.plugin').ConfigFunction} */
module.exports = () => ({
  type: 'widget',
  name: 'PrysmWidgets',
  displayName: 'Prysm',
  deploymentTarget: '17.0',
  bundleIdentifier: '.widgets',
  frameworks: ['SwiftUI', 'WidgetKit'],
  colors: { $accent: '#FD5021', $widgetBackground: '#000000' },
  images: { hourglass: '../../assets/widgets/hourglass.png' },
  entitlements: { 'com.apple.security.application-groups': ['group.com.nathanakin.revenuecatgame'] },
});
```
- [ ] **Step 2: `SnapshotStore.swift`** — `Codable` mirrors of the snapshot; `SnapshotStore.load()` reads the JSON string from `UserDefaults(suiteName:)`, returns `nil` on any decode error or `version != 1`; `coverImage(file:maxPixel:)` downsamples with `CGImageSourceCreateThumbnailAtIndex` (widgets are killed for large bitmaps); `daysUntil(_:from:)` with `Calendar.current.startOfDay`.
- [ ] **Step 3: `CountdownWidget.swift`** — `TimelineProvider` with one entry per midnight for 14 days; families `.systemSmall`, `.systemMedium`, `.accessoryRectangular`, `.accessoryCircular`, `.accessoryInline`; layouts per the board (small: label, 76 pt expanded heavy numeral, hourglass offset bottom-right, "days · 4 Oct"; medium: numeral + title left, fanned covers right with day chips); release day shows "Out now"; empty state "Wishlist a game to count it down"; `widgetURL(prysm://game/<id>)`; `.containerBackground(.black, for: .widget)`.
- [ ] **Step 4:** `npx expo prebuild --platform ios --no-install`, `cd ios && pod install`, `npx expo run:ios` with `DEVELOPER_DIR` set. Expected: build succeeds, the app launches.
- [ ] **Step 5:** add the widget on the simulator home screen, screenshot small + medium, compare with the board. Commit `Add the iOS widget target with the release countdown`.

### Task 6: Android countdown widget

**Files:** Create `src/features/widgets/android/CountdownWidget.tsx`, `widgetTaskHandler.tsx`; modify `index.ts` (register handler), `app.json` (plugin with two widgets: `CountdownSmall` 2×2, `CountdownMedium` 4×2, `updatePeriodMillis: 1800000`), copy `hourglass.png` into `assets/widgets/`.

- [ ] **Step 1:** read the library docs (https://saleksovski.github.io/react-native-android-widget/) for `FlexWidget`, `TextWidget`, `ImageWidget`, `registerWidgetTaskHandler`, `requestWidgetUpdate`, and the plugin's widget fields. Use only documented props.
- [ ] **Step 2:** `CountdownWidget({ snapshot, size, now })` — a pure function of its props, same copy and rules as iOS; `clickAction: 'OPEN_URI'` with `prysm://game/<id>`.
- [ ] **Step 3:** handler reads `AsyncStorage[WIDGET_SNAPSHOT_KEY]`, parses defensively, renders for `WIDGET_ADDED | WIDGET_UPDATE | WIDGET_RESIZED`.
- [ ] **Step 4:** `npm run typecheck && npm run lint && npm test`. If an Android emulator exists, `npx expo run:android` and add the widget; if not, state that the Android render is unverified. Commit `Add the Android release countdown widget`.

### Task 7: Deep link `prysm://game/<id>`

**Files:** modify `src/core/navigation/RootNavigator.tsx` (`handleUrl`).
- [ ] Extend `handleUrl` so `prysm://game/<catalogId>` navigates to the existing game detail route and `prysm://wishlist` to the wishlist tab, only when `status === 'signedIn'`. Extract the URL parsing into a pure `parseWidgetLink(url)` with jest tests. Commit `Open widget deep links`.

## Known follow-ups (not in this plan)

- A production iOS build needs a provisioning profile for the new `.widgets` bundle id with the App Group. That needs one Apple ID login by the account holder, like the share extension did.
- Sampled bleed colours, Up next, roulette: plan 2.
