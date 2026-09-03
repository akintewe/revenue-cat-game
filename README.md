# Shelf

A React Native (Expo + TypeScript) game backlog tracker: log what you're playing, rate what you've
beaten, keep a wishlist with release reminders, and unlock unlimited shelves with a RevenueCat-powered
"Shelf Plus" subscription.

## Stack

- **Expo (SDK 57) + TypeScript** — managed workflow, EAS-ready.
- **React Navigation** — bottom tabs (Library / Add / Wishlist / Profile) inside a root stack that
  pushes Game Detail full-screen and presents the Paywall as a modal. On wide/unfolded screens the
  tab bar automatically becomes a left rail via `tabBarPosition`.
- **Zustand + AsyncStorage** — local-first persistence for the library and wishlist (no backend yet;
  "Sync everywhere" is a Plus-tier feature reserved for a future backend integration).
- **react-native-purchases (RevenueCat)** — subscription paywall, offerings, entitlements, restore.
- **ESLint (expo config) + Prettier** — linting and formatting.

## Architecture

Organized by **feature**, so each feature owns its screens, components, and store:

```
src/
  core/
    navigation/         # RootNavigator (stack), TabNavigator (tabs), shared nav types
  data/
    catalog.ts          # offline game catalog standing in for a real games API (IGDB/RAWG)
  features/
    library/
      screens/           # LibraryScreen, GameDetailScreen
      store/             # useLibraryStore (zustand, persisted) + free-tier game limit
      types/
    addGame/
      screens/           # AddGameScreen (search the catalog, add to library)
    wishlist/
      screens/           # WishlistScreen (release reminders)
      store/             # useWishlistStore (zustand, persisted)
      types/
    paywall/
      screens/           # PaywallScreen ("Shelf Plus")
      hooks/             # useOfferings (RevenueCat)
    profile/
      screens/           # ProfileScreen (subscription status, restore purchases)
  services/
    revenuecat/
      purchases.ts        # thin wrapper around the RevenueCat SDK
  shared/
    components/           # Button, Screen, GameCover, GameRow, StatusPill, RatingScale, SegmentedTabs, EmptyState
    constants/             # APP_NAME, entitlement id
    hooks/                 # useResponsiveLayout (drives the rail/bar and grid breakpoints)
    theme/                 # colors, spacing, typography tokens
    types/                 # cross-feature vocabulary (GameStatus) that both library and shared UI need
```

**Why this shape:**

- **Feature isolation** — `library`, `wishlist`, `addGame`, `paywall`, and `profile` don't reach into
  each other's internals. Cross-feature reads (e.g. Add Game checking whether a title is already in
  the library) go through a feature's public store API, not its internals.
- **Shared vocabulary lives in `shared`, not a feature** — `GameStatus` is used by both the library
  feature and shared UI (`StatusPill`), so it's defined once in `shared/types`, not imported sideways
  from a feature into `shared`.
- **Service layer indirection** — all RevenueCat SDK calls go through `services/revenuecat/purchases.ts`.
  Screens/hooks never import `react-native-purchases` directly, so the SDK could be swapped or mocked
  in tests without touching UI code.
- **Local-first data** — `useLibraryStore` / `useWishlistStore` persist to AsyncStorage via Zustand's
  `persist` middleware. This matches the paywall's pitch: free tier is on-device only, Plus adds sync.
- **Responsive by default** — `useResponsiveLayout` centralizes the breakpoint; the tab navigator reads
  it to flip `tabBarPosition` between `bottom` and `left`, and list screens read it to switch between a
  1-column and 2-column grid, so the "unfolded" layout isn't a separate screen to maintain.

## Data

Game metadata currently comes from a small offline catalog (`src/data/catalog.ts`) rather than a real
games database. Swapping in IGDB or RAWG later means replacing `searchCatalog`/`findCatalogGame` with
real API calls — the screens that consume them (`AddGameScreen`, `LibraryScreen`, `GameDetailScreen`)
don't need to change.

## RevenueCat setup

1. Create a project in the [RevenueCat dashboard](https://app.revenuecat.com/), configure your App
   Store / Play Store products, and set up an offering with `annual` and `monthly` packages plus an
   entitlement called `plus` (see `PLUS_ENTITLEMENT_ID` in `src/shared/constants/app.ts`).
2. Add your public SDK keys to `app.json`:

   ```json
   "extra": {
     "revenueCatApiKeyIos": "appl_xxx",
     "revenueCatApiKeyAndroid": "goog_xxx"
   }
   ```

3. `App.tsx` calls `configurePurchases()` on mount, which reads those keys via `src/config/env.ts`.

Without real keys/offerings configured, the Paywall screen still renders with fallback pricing text,
but purchases will show a "Not configured yet" alert instead of completing.

## Getting started

```bash
npm install
npm run start
```

- `npm run ios` / `npm run android` / `npm run web` — run on a specific platform.
- `npm run lint` — ESLint.
- `npm run typecheck` — TypeScript, no emit.

## Screens

- **Library** — your games, filterable by status (Playing / Backlog / Beaten / Dropped).
- **Add** — search the catalog and add a game to your library (backlog by default).
- **Game Detail** — change status, rate 1–10, mark beaten, or add to wishlist.
- **Wishlist** — upcoming/wanted games with a per-game release reminder toggle.
- **Paywall** — "Shelf Plus": unlimited shelves (free tier caps at 50 games), backlog stats, sync.
- **Profile** — subscription status and restore purchases.
