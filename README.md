# revenue-cat-game

A React Native (Expo + TypeScript) tap game with a RevenueCat-powered store for in-app purchases (extra lives).

## Stack

- **Expo (SDK 57) + TypeScript** — managed workflow, fast iteration, EAS-ready.
- **React Navigation (native-stack)** — screen navigation.
- **Zustand** — lightweight, hook-based state management for game state.
- **react-native-purchases (RevenueCat)** — subscriptions/IAP handling, offerings, entitlements, restore.
- **ESLint (expo config) + Prettier** — linting and formatting.

## Architecture

The app is organized by **feature**, not by file type, so each feature owns its screens, components, hooks, store, and types:

```
src/
  core/
    navigation/        # RootNavigator, route param types
  config/
    env.ts             # typed access to app.json "extra" config (RevenueCat keys, etc.)
  features/
    game/
      components/       # ScoreBoard, TapTarget
      screens/           # GameScreen
      store/             # useGameStore (zustand)
      types/
    store/
      hooks/             # useOfferings, useCustomerInfo
      screens/           # StoreScreen (RevenueCat purchase UI)
  services/
    revenuecat/
      purchases.ts       # thin wrapper around the RevenueCat SDK
  shared/
    components/          # Button, Screen
    theme/                # colors, spacing, typography tokens
    hooks/
    utils/
```

**Why this shape:**

- **Feature isolation** — `features/game` and `features/store` don't reach into each other's internals; cross-feature state (e.g. granting lives after a purchase) goes through the game's public store API.
- **Service layer indirection** — all RevenueCat SDK calls go through `services/revenuecat/purchases.ts`. Screens/hooks never import `react-native-purchases` directly, so the SDK could be swapped or mocked in tests without touching UI code.
- **Config isolation** — RevenueCat API keys are read from `app.json`'s `extra` block via `expo-constants`, not hardcoded, so builds can be configured per environment (dev/prod, EAS build profiles) without code changes.
- **Shared design system** — `shared/theme` centralizes colors/spacing/typography so screens stay visually consistent without duplicating style values.

## RevenueCat setup

1. Create a project in the [RevenueCat dashboard](https://app.revenuecat.com/) and configure your App Store / Play Store products and an offering.
2. Add your public SDK keys to `app.json`:

   ```json
   "extra": {
     "revenueCatApiKeyIos": "appl_xxx",
     "revenueCatApiKeyAndroid": "goog_xxx"
   }
   ```

3. `App.tsx` calls `configurePurchases()` on mount, which reads those keys via `src/config/env.ts`.

## Getting started

```bash
npm install
npm run start
```

- `npm run ios` / `npm run android` / `npm run web` — run on a specific platform.
- `npm run lint` — ESLint.
- `npm run typecheck` — TypeScript, no emit.

## Game

Tap the cat to score points. Missing has a small chance to cost a life. Run out of lives and the run ends — buy extra lives from the Store screen via RevenueCat.
