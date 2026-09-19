# Widgets 2: Up Next + Roll the Backlog — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the Up next widget (small, medium, empty) and the interactive Roll the backlog widget (small, medium) on iOS and Android.

**Architecture:** The snapshot gains two additive sections, `upNext` and `roulette`. The roll itself happens in the widget process (an iOS App Intent, an Android click action) against the pool in the snapshot, so it works without the app. Roll state lives beside the snapshot under its own key. "Start" is a deep link the app handles.

**Tech Stack:** as plan 1, plus AppIntents (iOS 17 `Button(intent:)`).

**Spec:** `docs/superpowers/specs/2026-09-18-home-screen-widgets-design.md`

## Global Constraints

- All constraints of plan 1 apply.
- Snapshot stays `version: 1`. New sections are additive; both renderers treat a missing section as empty (a plan 1 snapshot must still decode).
- Roll state key: `widgetRoulette`, JSON `{ "pickId": string | null, "rollDay": "YYYY-MM-DD", "rollsToday": number }`.
- Free tier: `FREE_ROLLS_PER_DAY = 1`. Plus: unlimited. The locked face links to `prysm://paywall`.
- New deep link: `prysm://start/<catalogId>` sets the game to `playing` and opens its page.
- Assets: `assets/widgets/d20.png`, `assets/widgets/controller.png` (from `dist/widget-board/img/`, max 400 px on the long side).

## Snapshot additions

```ts
export type UpNextItem = {
  catalogId: string; title: string;
  hoursPlayed: number | null; timeToBeatHours: number | null;
  /** 0..1, null when either number is missing. Capped at 1. */
  progress: number | null;
  /** "31h · about halfway" — the builder writes the sentence, the widgets print it. */
  summary: string;
  /** "31h played · about 60h to beat" */
  detail: string;
  coverFile: string | null; coverUrl: string | null; bleed: string;
};
export type RouletteItem = {
  catalogId: string; title: string;
  /** "about 22h · in your backlog since March" */
  detail: string;
  coverFile: string | null; coverUrl: string | null; bleed: string;
};
export type WidgetSnapshot = { ...plan 1;
  upNext: { items: UpNextItem[]; backlogCount: number };   // status 'playing', most hours first, max 3
  roulette: { pool: RouletteItem[]; freeRollsPerDay: number }; // status 'backlog', newest first, max 12
};
```

Progress wording (pure, tested): `< 0.1` "just started", `< 0.4` "early on", `< 0.6` "about halfway", `< 0.9` "past halfway", `< 1` "nearly done", `>= 1` "past the average time". Hours print as whole numbers; `null` hours print "No hours logged".

---

### Task 1: Builders
**Files:** Create `snapshot/buildUpNext.ts`, `snapshot/buildRoulette.ts`, `snapshot/roll.ts`, tests for each; modify `types.ts`, `buildWidgetSnapshot.ts` (+ `library: LibraryEntry[]` input), existing snapshot tests.
**Produces:** `buildUpNext(entries, games)`, `buildRoulette(entries, games, now)`, and in `roll.ts`:
```ts
export type RouletteState = { pickId: string | null; rollDay: string; rollsToday: number };
export function canRoll(state: RouletteState | null, isPlus: boolean, freePerDay: number, today: string): boolean;
export function roll(poolIds: string[], state: RouletteState | null, today: string, random: () => number): RouletteState; // never repeats the current pick when the pool has 2+
```
`roll.ts` is the reference implementation; the Swift intent mirrors it line for line and the Android handler imports it.
- [ ] Tests first (ordering, caps, wording table, null paths, `canRoll` day rollover, `roll` no-repeat and counter), run red, implement, run green, commit `Add Up next and roulette payloads to the widget snapshot`.

### Task 2: Publisher
**Files:** modify `publish/publishWidgetSnapshot.ts` (library entries, resolve games for wishlist + playing + backlog pool, cache all covers), `publish/useWidgetPublisher.ts` (subscribe to `useLibraryStore`).
- [ ] Typecheck, lint, tests. Commit `Publish library data to the widgets`.

### Task 3: Start link
**Files:** modify `src/features/widgets/links.ts` (+ `{ kind: 'start', catalogId }`), its test, `RootNavigator.tsx` (call `useLibraryStore.getState().setStatus(id, 'playing')`, then navigate to `GameDetail`).
- [ ] Tests first. Commit `Handle the widget Start link`.

### Task 4: iOS widgets
**Files:** Create `targets/widgets/UpNextWidget.swift`, `RouletteWidget.swift`, `RouletteIntent.swift`; modify `SnapshotStore.swift` (optional sections, generic cover view), `Theme.swift`, `index.swift`, `expo-target.config.js` (images).
- [ ] `RollIntent: AppIntent` — loads snapshot + state, applies `canRoll`/`roll`, writes state, `WidgetCenter.shared.reloadTimelines(ofKind: "RouletteWidget")`.
- [ ] Layouts per the board. Small roulette at rest: die + "Roll" button. After a roll (small): cover-led pick with "Roll again". Medium: die left, pick text, `Roll again` + `Start`. Locked: "Unlock unlimited rolls".
- [ ] Prebuild, build with Xcode 26.6, seed a snapshot, add widgets, tap Roll on the simulator, screenshot. Commit `Add the Up next and Roll the backlog widgets on iOS`.

### Task 5: Android widgets
**Files:** Create `android/UpNextWidget.tsx`, `android/RouletteWidget.tsx`; modify `widgetTaskHandler.tsx` (names, `WIDGET_CLICK` with `clickAction: 'ROLL'`), `model.ts`, `app.json` (four more widgets).
- [ ] Typecheck, lint, tests. Commit `Add the Up next and Roll the backlog widgets on Android`.
