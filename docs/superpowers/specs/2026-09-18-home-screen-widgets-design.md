# Home screen widgets — design

Date: 2026-09-18. Status: approved by Joshua ("let's go then").
Visual source of truth: the review board at https://claude.ai/artifact/QiLZwiwZ3PyzTmqTBnwPsz
(local copy `dist/widget-board/index.html`, gitignored). This document records the decisions; the
board records the pixels.

## Goal

Five home screen widgets on iOS and Android that look like one family and make Prysm visible
every time the phone is unlocked. The hackathon cut line is three widgets on both platforms by
26 September 2026 (submission 30 September).

## The widgets

| Widget | Sizes | Data | Tier |
|---|---|---|---|
| Release countdown | small, medium, iOS lock screen (rectangular, circular, inline) | wishlist entries whose game has a future `releaseDate` | free |
| Up next | small, medium, empty state | library entries with status `playing`, then `backlog` | free |
| Roll the backlog | small, medium | library entries with status `backlog` | one roll a day free, unlimited with Plus |
| Year so far | small, medium | library entries: `finishedAt` in this year, `hoursPlayed` | free (streak added when moments exist) |
| Friends' moments | small, medium, medium list | feed posts with a game and an hour mark | Plus |

Dropped: the large Up next widget (rejected in review: the cover crop did not hold up).

## Visual rules (all widgets)

1. Pure black card. One radial colour bleed, taken from the hero cover or a fixed accent.
2. One hero per widget: a giant numeral, a cover, or a glass object. Never two.
3. Numerals: heavy weight, expanded width, proportional figures, left edge optically flush with the label above.
4. Orange `#FD5021` is for the label and the one action. Everything else is white at 100 / 62 / 38 percent.
5. Glass objects (hourglass, d20, trophy, flame, controller, 20 avatars) are transparent PNGs that may break the card edge.
6. Widget text never truncates a number. Titles truncate with an ellipsis at one line (two on small).

## Architecture

```
stores (library, wishlist, feed)
   -> buildWidgetSnapshot()      pure TypeScript, unit tested, no I/O
   -> publishWidgetSnapshot()    writes JSON + cover thumbnails, asks the OS to reload
        iOS:     App Group `group.com.nathanakin.revenuecatgame`
                 UserDefaults key `widgetSnapshot` (JSON string) via ExtensionStorage
                 covers in `<app group>/widget-covers/<catalogId>.jpg` via expo-file-system
        Android: AsyncStorage key `widgetSnapshot`, covers in the document directory,
                 then requestWidgetUpdate()
   -> renderers
        iOS:     SwiftUI target `targets/widgets` (@bacons/apple-targets), one WidgetBundle
        Android: react-native-android-widget, JSX rendered to a bitmap in a headless task
```

The widgets never use the network and never run app logic. All decisions (which game, how many
days, what is blurred) are made in `buildWidgetSnapshot`. The renderers only lay out what they get.

Days-left is the one exception: a snapshot can be days old, so each countdown item carries the
ISO `releaseDate` and both renderers compute `days` from today's date. iOS gets a timeline entry
per midnight for 14 days; Android sets `updatePeriodMillis` to 30 minutes (the platform minimum).

### Snapshot shape (version 1)

```ts
type WidgetSnapshot = {
  version: 1;
  generatedAt: number;            // epoch ms
  isPlus: boolean;
  countdown: { items: CountdownItem[] };   // soonest first, max 4
  upNext: { items: UpNextItem[] };         // playing first, then backlog, max 3
  roulette: { pool: RouletteItem[]; pick: RouletteItem | null; rollsToday: number; rollDay: string };
  year: { year: number; beaten: number; hours: number; recent: string[] /* cover files */ };
  friends: { items: MomentItem[] };        // empty until moments ship
};
type CountdownItem = { catalogId: string; title: string; releaseDate: string; coverFile: string | null; bleed: string };
type UpNextItem   = { catalogId: string; title: string; status: 'playing' | 'backlog'; hoursPlayed: number | null; timeToBeatHours: number | null; coverFile: string | null; bleed: string };
type RouletteItem = { catalogId: string; title: string; timeToBeatHours: number | null; addedAt: number; coverFile: string | null; bleed: string };
```

`bleed` is a hex colour. It comes from the game's existing `colorKey` palette in plan 1; a sampled
colour from the cover can replace it later without a snapshot change.

### Deep links

Every widget opens the app with the existing `prysm://` scheme: `prysm://game/<catalogId>`,
`prysm://wishlist`, `prysm://library?tab=games`, `prysm://friends`. Routes that do not exist yet
are added to the linking config in the plan that ships the widget.

### Publishing triggers

Subscribe to the library and wishlist stores; publish 500 ms after the last change (debounced),
and once on app foreground. Publishing is fire-and-forget and never throws into the UI.

## Plus gating

`isPlus` is part of the snapshot. A gated widget renders its locked face from the snapshot alone:
the same layout, the content blurred or the action replaced by "Unlock with Plus", deep linking to
`prysm://paywall`. No entitlement check runs in a widget.

## Testing

- `buildWidgetSnapshot` and its helpers: jest, the repo's existing setup.
- iOS: build with Xcode 26.6, add the widget in the simulator, screenshot, compare to the board.
- Android: the library's widget preview component inside a dev-only screen, then a real launcher.

## Plans

1. Foundation + Release countdown on both platforms (this unblocks everything else).
2. Up next + Roll the backlog (hackathon cut line).
3. Year so far.
4. Moments in the app, then the friends widget. Sign-up avatars ship with this plan.

## Out of scope

Live Activities, StandBy layouts, iOS 26 tinted variants, widget configuration (pick a game),
interactive Android list widgets.
