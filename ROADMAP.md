# Roadmap

A phased plan for the feature list below, grouped by what the current architecture can support
today versus what requires new infrastructure. Nothing here is scheduled — it's a menu to pick
from, ordered roughly by how much has to be built before the feature can exist at all.

Current state: local-only (Zustand + AsyncStorage), no auth, no backend, no push infrastructure.
See [README.md](README.md) for the existing architecture.

## Phase 1 — Local-only, no new infrastructure

These extend what's already built (`useLibraryStore`, `useWishlistStore`, `src/data/catalog.ts`)
without needing a server, auth, or third-party accounts.

- **Save games to play / track status** — done (Library statuses: Playing/Backlog/Beaten/Dropped).
- **Wishlist** — done.
- **Easy to search** — done for the mock catalog; carries over once a real games API replaces it.
- **PC requirements for games** — done. `pcRequirements` on `CatalogGame`, shown on Game Detail for
  PC titles only.
- **Game reviews (private)** — done. Free-text `notes` field per `LibraryEntry`, shown on Game
  Detail. (Public/shared reviews are still Phase 3 — they need a backend to aggregate across users.)
- **Time to beat — your own time** — done. `hoursPlayed` on `LibraryEntry`, editable on Game Detail.
  ("Average time" and "friends' time" still need external data / a backend — Phase 2 and 3.)
- **Collectible passport stamps** — done. `src/features/passport` derives games-logged, beaten,
  genres-explored, and platform-loyalty stamps purely from `useLibraryStore.entries`; linked from
  Profile.
- **Reminders for wishlist releases** — done. `src/services/notifications/reminders.ts` schedules a
  real local notification (`expo-notifications`) against a wishlist entry's release date, armed via
  the bell toggle and cancelled on remove/disarm.

## Phase 2 — Needs a third-party API key, not necessarily a custom backend

These need an external data source or API credentials, but can often be called directly from the
app (or through a thin proxy to keep API keys off-device) without full backend infrastructure.

- **Real game search/metadata** — replace `src/data/catalog.ts` with IGDB or RAWG (deferred earlier
  by design — see the "mock data for now" decision in the conversation history).
- **Time to beat — average** — HowLongToBeat has no official API; would need a community library
  or light scraping proxy.
- **Coupons/deals/sales (e.g. summer sale)** — a deals aggregator like IsThereAnyDeal has a public
  API; needs an API key, ideally proxied so the key isn't shipped in the client.
- **Track streams of a game** — Twitch's Get Streams API by game name; same API-key-proxy concern.
- **Notifications on upcoming games (from wishlist)** — Phase 1 covers this for games the user
  already wishlisted with a known date. Doing it for *newly announced* games needs a release-
  calendar data source (IGDB has one).
- **Notifications on popular/trending games** — needs a trending-games feed (IGDB/RAWG popularity
  metrics or a curated list) plus a scheduled job to push it — this edges into Phase 3 since "push
  to users who aren't in the app" needs a server-side scheduler, not just an API call.
- **Grab games from social media searches** — needs clarification on what this means concretely
  (a share extension that parses a shared link/image? OCR on a screenshot? searching a platform's
  API for a mentioned title?) before this is buildable at all.

## Phase 3 — Needs a real backend, auth, and a social graph

These require accounts, a database of users/relationships, and (for push) a notification service
— the biggest jump from where the app is today.

- **Friends and friend achievement notifications** — needs auth, a friend graph, and push
  infrastructure (e.g. Expo push notifications + a backend that fans out events).
- **Steam / Roblox / Google Play Games connectors** — OAuth flows per platform, token storage, and
  periodic achievement sync jobs. Each platform is its own integration with its own quirks
  (Steam's API is keyed and public-profile-dependent; Google Play Games and Roblox both need OAuth
  consent screens).
- **Public/shared game reviews** — needs a backend to store and aggregate reviews across users.
- **Events** — needs a backend content model (what is an event, who can create one, RSVP state).
- **Host competitions** — the heaviest lift: needs user-generated competitions, entry/scoring
  rules, and almost certainly ties into the achievement connectors above to verify results.

## Suggested order if/when we leave local-only

1. Real game search API (unblocks accurate metadata for everything downstream).
2. Auth + minimal backend (unblocks sync, which the paywall already promises as a Plus feature).
3. Friends graph + push infra (unblocks friend achievements, popular-game notifications).
4. Platform connectors (Steam first — most open API — then Google Play Games, then Roblox).
5. Deals/streams integrations (self-contained, can slot in anytime after step 1).
6. Events and competitions last — they depend on the social graph and, for competitions, the
   connectors being trustworthy enough to verify scores.
