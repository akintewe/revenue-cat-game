# Friends Feed — Backend Requirements

The client (Prysm mobile app) has shipped a redesigned Friends feed: new post cards, a
full-screen composer, topic categories, polls, reposts, and native share. This doc
describes exactly what the backend needs to implement so the client's UI — which is
already built and wired up — starts working for real instead of running on local-only
optimistic state.

Everywhere below, "already exists" means the client is already calling it in production;
"needs backend work" means the client has a fully-built UI for it but is currently faking
the behavior locally (in-memory only, resets on refresh, invisible to other users).

## 1. What already exists and works today

These are unchanged by this update — listed for context only.

- **`posts` table** — columns the client writes/reads: `id`, `author_id`, `body`,
  `link_url`, `game_id`, `image_path`, `created_at`, `edited_at`.
- **`post_likes` table** — `post_id`, `user_id`, unique constraint on the pair (client
  swallows a `23505` unique-violation as "already liked").
- **`post_comments` table** — `id`, `post_id`, `author_id`, `body`, `created_at`.
- **`shelf_feed` RPC** — `(p_limit, p_before, p_before_id, p_handle)` → page of posts,
  newest first, each row already joined with the author's `handle`, `display_name`,
  `avatar_color`, plus `like_count`, `comment_count`, `liked_by_me`, and (when
  `game_id` is set) `game_title`/`game_cover`. `p_handle` filters to one author's posts
  (used for a profile's own post list).
- **`shelf_notifications` / `shelf_unread_notification_count` / `shelf_mark_notifications_read` RPCs**
  — notification kinds today: `follow`, `post_like`, `post_comment`.
- **`post-images` storage bucket** — client uploads picked images here and reads them
  back via public URL (`postImageUrl(path)`).
- **Moderation** — `blockUser`, `reportContent` (reason + target) already work against
  existing tables, untouched by this update.
- **Body constraint** — `posts.body` is enforced today as 1–500 characters. The composer
  already hard-requires non-empty text client-side to match this (an image/game/poll
  attachment is never allowed to stand alone without a caption).

## 2. Post topic / category (small, do this first)

The composer lets the user tag a post with one topic: **Trophies**, **Questions**, or
**Memes** (see `src/features/library/components/PostCategoryPill.tsx` for the exact
three values, colors and icons — the enum is `'trophies' | 'questions' | 'memes'`).

**Needed:**
- Add a nullable `category` column to `posts` (text or enum: `trophies` / `questions` /
  `memes`; no category = general post, no pill shown).
- `shelf_feed` (and any other post-returning RPC) must return this column as `category`.
- No new endpoint — it rides along with the existing `createPost` insert into `posts`
  once the column exists (client already sends it optimistically today, it's just
  discarded because the column doesn't exist server-side).

## 3. Polls

The composer can attach a single-choice poll (2–4 text options, 24 hour voting window)
instead of an image or game. Reference: `ComposePostScreen.tsx` (`pollOptions` state,
`MAX_POLL_OPTIONS = 4`, `POLL_DURATION_MS = 24h`) and `src/features/library/components/PollCard.tsx`
(render/vote UI).

**Needed — schema:**
- `polls` table: `id`, `post_id` (FK to `posts`, one poll per post), `ends_at`
  (timestamp, `created_at + 24h` by default — client currently always uses 24h, but
  don't hardcode it server-side beyond a sane default in case this becomes configurable
  later).
- `poll_options` table: `id`, `poll_id` (FK), `label` (text, ≤40 chars to match the
  client's `maxLength`), `position` (int, to preserve author's ordering — 2 to 4 rows
  per poll).
- `poll_votes` table: `id`, `poll_option_id` (FK), `user_id`, unique constraint on
  `(poll_id, user_id)` — **one vote per user per poll**, not per option (a user picks
  exactly one option, ever, and cannot change it — matches the client, which locks
  voting UI the instant `myVoteId` is set).

**Needed — endpoints:**
- Extend post creation so a poll can be attached atomically with the post (either a
  combined RPC, or a `createPoll(postId, options[])` call the client makes immediately
  after `createPost` succeeds — whichever is simpler backend-side, since the client
  already awaits `createPost`'s returned `id` before doing anything poll-related).
- `shelf_feed` (and single-post fetch) needs to return, for any post with a poll:
  - all options with their `id`, `label`, and current `votes` count
  - `ends_at`
  - `my_vote_id` — the *current user's* chosen option id, or null if they haven't voted
    (this is what makes the client show results vs. an interactive ballot)
- A `votePoll(pollOptionId)` RPC/endpoint: inserts into `poll_votes`, rejects (or
  no-ops) if the user already voted on that poll, rejects if `ends_at` has passed.
  Should return the updated vote counts so the client can reconcile its optimistic
  update.

**Not needed:** multi-select polls, vote changing/retracting, or poll editing after
creation — the client UI doesn't support any of these, so don't build for them.

## 4. Reposts

Every post has a repost button (icon: `repeat-outline`, fills green when active). Right
now this is 100% client-local — toggling it just flips a number in memory
(`src/features/library/screens/LibraryScreen.tsx#handleRepost`,
`PostDetailScreen.tsx#handleRepost`) with a comment explicitly noting it "doesn't
persist or notify anyone." Nothing survives a refresh; nobody else ever sees a repost
happen.

**Needed — schema:**
- `post_reposts` table: `id`, `post_id` (FK), `user_id`, `created_at`, unique constraint
  on `(post_id, user_id)` — a user can repost a given post at most once, and can
  presumably un-repost (delete the row) to toggle it back off, matching the client's
  toggle behavior.

**Needed — endpoints:**
- `repost(postId)` — insert into `post_reposts` (idempotent / ignore-on-conflict like
  likes).
- `unrepost(postId)` — delete the row.
- `shelf_feed` needs to return, per post: `repost_count` (count of rows in
  `post_reposts` for that post) and `reposted_by_me` (whether the current user has a row
  there) — this exactly mirrors how `like_count`/`liked_by_me` already work today, just
  for the new table.

**Open product question for whoever builds this** — decide whether a repost should
literally re-inject the original post into the reposter's followers' feeds (Twitter-style
retweet, showing up as "X reposted" with the original author/content), or just be a
lightweight counter/bookmark-style action. The client's current implementation only
toggles a counter and icon state — it does **not** render "reposted by X" cards anywhere
in the feed — so the simplest correct backend for what's actually built today is just the
counter/relation described above. If real feed-injection is wanted, that's a larger
scope change the client isn't built for yet and should be discussed before implementing.

**Notifications:** add a `post_repost` kind to the existing notification system
(`NotificationKind` currently is `'follow' | 'post_like' | 'post_comment'`) so an author
gets notified when someone reposts their post, the same way they do for likes/comments.

## 5. Post visibility ("Public" selector)

The composer has a "Public ⌄" pill in its toolbar (bottom-right, next to the Post
button). **This is currently decorative** — tapping it does nothing, and every post is
implicitly fully public today (`shelf_feed` has no visibility filtering at all).

**Needed (design decision + implementation):**
- Add a `visibility` column to `posts` (e.g. `public` / `friends`, default `public` to
  match current behavior exactly — nothing changes for existing posts).
- `shelf_feed` must filter: a `friends`-visibility post should only appear in the feed
  of the author's friends/followers (and the author themself), never in a public/global
  feed to non-friends.
- The client will need the selector in the composer wired to an actual value and sent
  through `createPost` — that's a small client follow-up once the backend contract
  (accepted values, default) is confirmed. Flagging this now so the backend and client
  work land together rather than the pill staying a no-op indefinitely.

## 6. Mentions and hashtags — client-only today, flagging for awareness

The composer lets users type `@handle` and `#hashtag` tokens freely in the body text
(no autocomplete, no validation), and the feed renders them with distinct styling — see
`src/shared/utils/postText.ts` (`parsePostText`) and `PostCard.tsx`'s `PostRichText`.
**This is purely cosmetic today**: an `@mention` is just colored text, not a real link to
a user, not tappable, and does not trigger a notification to the mentioned person.

**Not required for this pass**, but noted since "everything" was asked for — a real
mentions system would need: resolving `@handle` tokens against `profiles.handle` at post
time, a `post_mentions` join table (or similar), and a `post_mention` notification kind.
Treat this as a later/optional enhancement, not a blocker for the rest of this doc.

## 7. Share — no backend work needed

The share button uses the OS-native share sheet (`Share.share({ message })`, React
Native's built-in API) to let the user share post text through Messages/WhatsApp/etc. It
never touches the backend at all. Listed here only so it's clear it's not an accidental
gap — it's simply out of scope for the server.

## 8. Summary — exact `shelf_feed` response shape needed going forward

Once everything above is done, each row `shelf_feed` returns should carry (new fields
marked ⭐):

```
id, body, link_url, image_path, created_at, edited_at,
author_id, handle, display_name, avatar_color,
game_id, game_title, game_cover,
like_count, comment_count, liked_by_me,
⭐ category,               -- text | null
⭐ visibility,              -- 'public' | 'friends'  (or omit the column if not exposing it to the client)
⭐ repost_count, reposted_by_me,
⭐ poll: {                  -- null if the post has no poll
     options: [{ id, label, votes }, ...],
     ends_at,
     my_vote_id
   }
```

The client's `FeedPost` type (`src/services/social/feed.ts`) already has every one of
these fields typed as optional/local-only, with comments noting "always undefined from
real server fetches" — so the moment the server starts returning them, the client will
pick them up automatically with no further client changes needed for read paths. The
write paths (`createPost` sending `category`, a poll-attach call, `repost`/`unrepost`,
`votePoll`) are the only client code that will need small follow-up changes once the
corresponding endpoint exists.

## Suggested order

1. `category` column (trivial, unblocks immediately).
2. Reposts (schema + 2 endpoints + `shelf_feed` fields + notification kind).
3. Polls (schema + attach-on-create + vote endpoint + `shelf_feed` fields).
4. Visibility (needs a product decision on friend-graph semantics before implementation).
5. Mentions (optional/later).
