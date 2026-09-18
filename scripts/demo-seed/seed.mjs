#!/usr/bin/env node
// Seeds the demo crowd into the Shipaton Supabase project, or removes it.
//
//   node scripts/demo-seed/seed.mjs            create the demo users, or refresh them
//   node scripts/demo-seed/seed.mjs --dry-run  write the SQL to a temp file and change nothing
//   node scripts/demo-seed/seed.mjs --remove   delete every demo user and every row they own
//
// Auth: SUPABASE_ACCESS_TOKEN (a personal access token), else the Supabase CLI login in the
// macOS keychain.
//
// A re-run is safe. It deletes the rows the demo users own and writes them again. All times
// are relative to now, so run it again just before a demo and the feed looks fresh.
// It also deletes the real accounts' follows of demo users, and any likes, comments or votes on
// demo posts, and then writes the follows again from REAL_LINKS.
//
// Before the SQL runs it asks the game-artwork function for wide art for every game a post
// names, and uploads the demo photos to post-images. A dry run does neither.

import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  ENDLESS,
  GAMES,
  GENERIC_REPLIES,
  NOTES,
  POOLS,
  POSTS,
  REAL_LINKS,
  REAL_POST_REPLIES,
  SHARED,
  UPCOMING,
  USERS,
} from './data.mjs';

const PROJECT_REF = 'sbunhrxwhraigwpidbxk';
const PROJECT_URL = `https://${PROJECT_REF}.supabase.co`;
const SEED_TAG = 'prysm-demo-2026-09';
const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;
const NOW = Date.now();
const YEAR_START = Date.UTC(new Date(NOW).getUTCFullYear(), 0, 1);
// When a game is not on any of a user's own platforms, log it on the first of these it has.
const FALLBACK_PLATFORMS = [6, 167, 169, 508, 130, 48, 49];
const CATEGORIES = ['trophies', 'questions', 'memes'];
const PHOTO_BUCKET = 'post-images';

const args = new Set(process.argv.slice(2));
const DRY_RUN = args.has('--dry-run');
const REMOVE = args.has('--remove');

const emailFor = (handle) => `demo+${handle}@example.com`;

// ---------------------------------------------------------------------------------------------
// Supabase access

function accessToken() {
  if (process.env.SUPABASE_ACCESS_TOKEN) return process.env.SUPABASE_ACCESS_TOKEN;
  try {
    const raw = execFileSync('security', ['find-generic-password', '-s', 'Supabase CLI', '-w'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    const prefix = 'go-keyring-base64:';
    return raw.startsWith(prefix) ? Buffer.from(raw.slice(prefix.length), 'base64').toString('utf8') : raw;
  } catch {
    throw new Error('No Supabase access token. Set SUPABASE_ACCESS_TOKEN or run `supabase login`.');
  }
}

const TOKEN = accessToken();

async function management(path, init = {}) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Management API ${path} failed (${res.status}): ${text}`);
  return text ? JSON.parse(text) : null;
}

/** Runs SQL as postgres. Returns the rows of the last statement that returns rows. */
const sql = (query) => management('/database/query', { method: 'POST', body: JSON.stringify({ query }) });

/** Runs SQL as a signed-in user, so row level security and auth.uid() apply. Always rolls back. */
const sqlAs = (userId, query) =>
  sql(`begin;
set local role authenticated;
select set_config('request.jwt.claims', ${lit(JSON.stringify({ sub: userId, role: 'authenticated' }))}, true);
${query};
rollback;`);

async function serviceRoleKey() {
  const keys = await management('/api-keys?reveal=true');
  const key = keys.find((k) => k.name === 'service_role')?.api_key;
  if (!key) throw new Error('The project has no service_role key.');
  return key;
}

async function createAuthUser(key, user) {
  const res = await fetch(`${PROJECT_URL}/auth/v1/admin/users`, {
    method: 'POST',
    headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: emailFor(user.handle),
      email_confirm: true,
      app_metadata: { demo_seed: SEED_TAG },
      user_metadata: { display_name: user.name },
    }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(`Could not create ${user.handle}: ${JSON.stringify(body)}`);
  return body.id;
}

const serviceHeaders = (key, extra = {}) => ({ apikey: key, Authorization: `Bearer ${key}`, ...extra });

/** Asks the game-artwork function for wide art. Returns game id -> URL, or '' when IGDB has none. */
async function requestArtwork(key, gameIds) {
  const artwork = {};
  // The function takes 50 ids a call.
  for (let i = 0; i < gameIds.length; i += 50) {
    const res = await fetch(`${PROJECT_URL}/functions/v1/game-artwork`, {
      method: 'POST',
      headers: serviceHeaders(key, { 'Content-Type': 'application/json' }),
      body: JSON.stringify({ gameIds: gameIds.slice(i, i + 50) }),
    });
    const text = await res.text();
    if (!res.ok) throw new Error(`game-artwork failed (${res.status}): ${text}`);
    Object.assign(artwork, JSON.parse(text).artwork);
  }
  return artwork;
}

/** Copies an image into post-images. upsert: a re-run writes over the same path. */
async function uploadPhoto(key, path, imageUrl) {
  const image = await fetch(imageUrl);
  if (!image.ok) throw new Error(`Could not download ${imageUrl} (${image.status})`);
  const res = await fetch(`${PROJECT_URL}/storage/v1/object/${PHOTO_BUCKET}/${path}`, {
    method: 'POST',
    headers: serviceHeaders(key, { 'Content-Type': 'image/jpeg', 'x-upsert': 'true' }),
    body: Buffer.from(await image.arrayBuffer()),
  });
  if (!res.ok) throw new Error(`Could not upload ${path} (${res.status}): ${await res.text()}`);
}

/** Deletes the demo photos that no post uses now. SQL cannot delete storage objects, so this
 *  goes through the Storage API. Returns how many it deleted. */
async function deleteDemoPhotos(key, demoIds, keep = new Set()) {
  if (demoIds.length === 0) return 0;
  const rows = await sql(`
    select name from storage.objects
     where bucket_id = ${lit(PHOTO_BUCKET)}
       and split_part(name, '/', 1) = any('{${demoIds.join(',')}}'::text[])
       and name ~ '/demo-[0-9]+\\.jpg$'`);
  const stale = rows.map((r) => r.name).filter((name) => !keep.has(name));
  if (stale.length === 0) return 0;
  const res = await fetch(`${PROJECT_URL}/storage/v1/object/${PHOTO_BUCKET}`, {
    method: 'DELETE',
    headers: serviceHeaders(key, { 'Content-Type': 'application/json' }),
    body: JSON.stringify({ prefixes: stale }),
  });
  if (!res.ok) throw new Error(`Could not delete old demo photos (${res.status}): ${await res.text()}`);
  return stale.length;
}

// ---------------------------------------------------------------------------------------------
// SQL literals and a seeded random source

function lit(value) {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return `'${String(value).replaceAll("'", "''")}'`;
}

const tuple = (...values) => `(${values.map(lit).join(', ')})`;
const iso = (ms) => new Date(ms).toISOString();
const round1 = (n) => Math.round(n * 10) / 10;
const clamp = (n, lo, hi) => Math.min(Math.max(n, lo), hi);

/** Deterministic per label, so a re-run gives every user the same shelf. */
function random(label) {
  let h = 1779033703 ^ label.length;
  for (let i = 0; i < label.length; i++) {
    h = Math.imul(h ^ label.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a = h >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    between: (lo, hi) => lo + (hi - lo) * next(),
    int: (lo, hi) => Math.floor(lo + (hi - lo + 1) * next()),
    chance: (p) => next() < p,
    pick: (list) => list[Math.floor(next() * list.length)],
    shuffle: (list) => {
      const out = [...list];
      for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [out[i], out[j]] = [out[j], out[i]];
      }
      return out;
    },
  };
}

// ---------------------------------------------------------------------------------------------
// Reads

async function resolveGames() {
  const values = Object.entries(GAMES)
    .map(([key, [title, year]]) => tuple(key, title, year))
    .join(',\n');
  const rows = await sql(`
    select distinct on (t.key) t.key, g.id, g.release_date, g.ttb_normally_hours::float as ttb,
           coalesce((select array_agg(gp.platform_id order by gp.platform_id)
                       from game_platforms gp where gp.game_id = g.id), '{}') as platforms
      from (values ${values}) as t(key, title, year)
      join games g on g.title = t.title and extract(year from g.release_date)::int = t.year
     order by t.key, g.total_rating_count desc nulls last`);
  return new Map(
    rows.map((r) => [r.key, { id: r.id, release: Date.parse(r.release_date), ttb: r.ttb, platforms: r.platforms }]),
  );
}

async function existingDemoUsers() {
  const emails = USERS.map((u) => lit(emailFor(u.handle))).join(', ');
  const rows = await sql(`select id, email from auth.users where email in (${emails})`);
  return new Map(rows.map((r) => [r.email, r.id]));
}

async function realAccounts() {
  const handles = [...new Set([...REAL_LINKS.map((l) => l.handle), ...REAL_POST_REPLIES.map((r) => r.author)])];
  const rows = await sql(`
    select p.user_id, p.handle, u.created_at
      from profiles p join auth.users u on u.id = p.user_id
     where p.handle in (${handles.map(lit).join(', ')})`);
  return new Map(rows.map((r) => [r.handle, { id: r.user_id, joined: Date.parse(r.created_at) }]));
}

async function realPosts() {
  if (REAL_POST_REPLIES.length === 0) return [];
  const values = REAL_POST_REPLIES.map((r, i) => tuple(i, r.author, r.match)).join(', ');
  const rows = await sql(`
    select t.i, p.id, p.created_at, p.author_id
      from (values ${values}) as t(i, handle, pattern)
      join lateral (
        select p.id, p.created_at, p.author_id
          from posts p join profiles pr on pr.user_id = p.author_id
         where pr.handle = t.handle and p.body ilike t.pattern
         order by p.created_at
         limit 1
      ) p on true`);
  return rows.map((r) => ({ ...REAL_POST_REPLIES[r.i], id: r.id, at: Date.parse(r.created_at), authorId: r.author_id }));
}

/** Stops before any write when data.mjs breaks a rule that the database or the app enforces. */
function checkData() {
  const problems = [];
  POSTS.forEach((p, i) => {
    const where = `POSTS[${i}] (${p.by})`;
    if (p.body.trim().length > 500) problems.push(`${where}: the body is over 500 characters`);
    if (!CATEGORIES.includes(p.category)) problems.push(`${where}: category must be one of ${CATEGORIES.join(', ')}`);
    if (p.photo && !p.game) problems.push(`${where}: a photo comes from the post's game, so it needs a game`);
    if (p.poll) {
      const { options } = p.poll;
      if (options.length < 2 || options.length > 4) problems.push(`${where}: a poll needs 2 to 4 options`);
      for (const o of options) if (o.trim().length < 1 || o.trim().length > 40) problems.push(`${where}: option "${o}" is not 1 to 40 characters`);
    }
  });
  if (problems.length) throw new Error(`data.mjs has problems:\n  ${problems.join('\n  ')}`);
}

// ---------------------------------------------------------------------------------------------
// The model: every row the seed writes, built in memory first.

function buildModel({ games, ids, real, existingRealPosts }) {
  const people = new Map();
  USERS.forEach((user, index) => {
    const r = random(`join:${user.handle}`);
    people.set(user.handle, {
      ...user,
      id: ids.get(user.handle),
      joined: NOW - r.between(12.9, 14.2) * DAY,
      avatarKey: `glass-${String((index % 20) + 1).padStart(2, '0')}`,
    });
  });
  const person = (handle) => people.get(handle) ?? real.get(handle);

  // Follows -------------------------------------------------------------------------------
  const follows = new Map(); // "followerId>followeeId" -> { follower, followee, at }
  function follow(fromHandle, toHandle, r, before = NOW - 5 * MIN) {
    const from = person(fromHandle);
    const to = person(toHandle);
    if (!from || !to || from.id === to.id) return;
    const key = `${from.id}>${to.id}`;
    if (follows.has(key)) return;
    const earliest = Math.max(from.joined, to.joined) + 10 * MIN;
    const latest = Math.max(earliest, before);
    // Most follows happen in the first days after people join.
    follows.set(key, { follower: from.id, followee: to.id, at: earliest + (latest - earliest) * r.next() ** 2 });
  }

  for (const a of USERS) {
    const r = random(`follows:${a.handle}`);
    for (const b of USERS) {
      if (a.handle === b.handle) continue;
      let p = a.squads.some((s) => b.squads.includes(s)) ? 0.8 : 0.12;
      if (a.quiet) p *= 0.4;
      if (r.chance(p)) follow(a.handle, b.handle, r);
    }
  }
  for (const link of REAL_LINKS) {
    if (!real.has(link.handle)) continue;
    const r = random(`real:${link.handle}`);
    for (const h of link.follows) follow(link.handle, h, r);
    for (const h of link.followedBy) follow(h, link.handle, r);
  }

  // Posts and the replies written for them --------------------------------------------------
  const posts = [];
  const comments = [];
  const repliesFor = (post, list, label) => {
    const r = random(label);
    let at = post.at;
    list.forEach(([handle, body], i) => {
      const who = person(handle);
      const left = list.length - i;
      at = Math.max(at + Math.min(r.between(8 * MIN, 3 * HOUR), (NOW - at) / (left + 1)), who.joined + 10 * MIN);
      comments.push({ id: randomUUID(), postId: post.id, author: who.id, body, at: Math.min(at, NOW - MIN) });
      if (handle !== post.by) follow(handle, post.by, r, at);
    });
  };

  POSTS.forEach((p, i) => {
    const r = random(`post:${i}`);
    const author = people.get(p.by);
    const game = p.game ? games.get(p.game) : null;
    const at = clamp(NOW - p.ago * DAY + r.between(-20, 20) * MIN, author.joined + 30 * MIN, NOW - MIN);
    const post = {
      id: randomUUID(),
      by: p.by,
      author: author.id,
      body: p.body,
      category: p.category,
      link: p.link ?? null,
      gameId: game?.id ?? null,
      // A fixed path per post, so a re-run writes over the same file instead of adding one.
      imagePath: p.photo ? `${author.id}/demo-${i}.jpg` : null,
      hourMark: game && (p.status === 'playing' || p.status === 'beaten') ? p.hour : null,
      at,
    };
    posts.push(post);
    if (p.replies) repliesFor(post, p.replies, `replies:${i}`);
  });
  for (const rp of existingRealPosts) {
    const post = { id: rp.id, by: rp.author, author: rp.authorId, at: rp.at, real: true };
    repliesFor(post, rp.replies, `real-replies:${rp.id}`);
  }

  // Everyone who follows each account, now that the follow graph is final.
  const followersOf = new Map();
  for (const f of follows.values()) {
    if (!followersOf.has(f.followee)) followersOf.set(f.followee, []);
    followersOf.get(f.followee).push(f.follower);
  }
  const demoIds = new Set([...people.values()].map((p) => p.id));
  const joinedById = new Map([...people.values(), ...real.values()].map((p) => [p.id, p.joined]));

  // Generic replies on the posts that have none written for them.
  POSTS.forEach((p, i) => {
    if (p.replies) return;
    const r = random(`generic:${i}`);
    const post = posts[i];
    const fans = r.shuffle((followersOf.get(post.author) ?? []).filter((id) => demoIds.has(id)));
    const count = r.chance(0.55) ? (r.chance(0.35) ? 2 : 1) : 0;
    const handles = fans.slice(0, count).map((id) => [...people.values()].find((u) => u.id === id).handle);
    repliesFor(post, handles.map((h) => [h, r.pick(GENERIC_REPLIES)]), `generic-replies:${i}`);
  });

  // Likes: demo followers of the author, plus most of the people who replied.
  const likes = [];
  const allPosts = [
    ...posts,
    ...existingRealPosts.map((rp) => ({ id: rp.id, author: rp.authorId, at: rp.at, real: true })),
  ];
  for (const post of allPosts) {
    const r = random(`likes:${post.id.slice(0, 8)}:${post.at}`);
    const repliers = new Set(comments.filter((c) => c.postId === post.id).map((c) => c.author));
    const fans = new Set([...(followersOf.get(post.author) ?? []), ...repliers]);
    for (const id of fans) {
      if (!demoIds.has(id) || id === post.author) continue;
      if (!r.chance(repliers.has(id) ? 0.7 : post.real ? 0.4 : 0.5)) continue;
      const window = Math.min(2 * DAY, NOW - post.at - MIN);
      const at = Math.max(post.at + r.next() ** 2 * window, joinedById.get(id) + 10 * MIN);
      likes.push({ postId: post.id, user: id, at: Math.min(at, NOW - MIN) });
    }
  }

  // Polls. Only demo users vote: a real account must see every poll as "not voted yet".
  const polls = [];
  const pollOptions = [];
  const votes = [];
  const demoUsers = [...people.values()];
  POSTS.forEach((p, i) => {
    if (!p.poll) return;
    const r = random(`poll:${i}`);
    const post = posts[i];
    const endsAt = NOW + p.poll.endsInHours * HOUR;
    const closes = Math.min(endsAt, NOW) - MIN;
    // The app offers polls of 1 to 168 hours, and the votes need room to come in.
    if (endsAt - post.at < HOUR || endsAt - post.at > 168 * HOUR || closes - post.at < HOUR) {
      throw new Error(`POSTS[${i}]: the poll must run 1 to 168 hours and be open for an hour before now. Check ago and endsInHours.`);
    }
    polls.push({ postId: post.id, endsAt, at: post.at });
    const options = p.poll.options.map((label, position) => ({ id: randomUUID(), postId: post.id, position, label }));
    pollOptions.push(...options);

    // A friend who names an option in a reply votes for it, so the replies and the counts agree.
    const named = new Map(); // user id -> option
    for (const [handle, body] of p.replies ?? []) {
      const option = options.find((o) => body.toLowerCase().includes(o.label.toLowerCase()));
      if (option) named.set(people.get(handle).id, option);
    }
    // Everyone else splits unevenly. The first option leads: people list their own pick first.
    const weights = options.map((_, k) => [6, 3, 1.5, 0.6][k] * r.between(0.7, 1.3));
    const total = weights.reduce((a, b) => a + b, 0);
    const choose = () => {
      let x = r.next() * total;
      return options.find((_, k) => (x -= weights[k]) < 0) ?? options.at(-1);
    };
    const others = r.shuffle(demoUsers.filter((u) => u.id !== post.author && !named.has(u.id)));
    const voters = [...demoUsers.filter((u) => named.has(u.id)), ...others].slice(0, r.int(10, 22));
    for (const voter of voters) {
      const from = Math.max(post.at, voter.joined) + 2 * MIN;
      const option = named.get(voter.id) ?? choose();
      // Most votes come in soon after the post goes up.
      votes.push({ postId: post.id, user: voter.id, optionId: option.id, at: from + r.next() ** 2 * (closes - from) });
    }
  });

  // Reposts, as data.mjs lists them.
  const reposts = [];
  POSTS.forEach((p, i) => {
    const r = random(`reposts:${i}`);
    const post = posts[i];
    for (const handle of p.repostedBy ?? []) {
      const who = people.get(handle);
      const from = Math.max(post.at, who.joined) + 5 * MIN;
      reposts.push({ postId: post.id, user: who.id, at: from + r.next() ** 2 * clamp(NOW - from - MIN, 0, DAY) });
    }
  });

  // Shares out of the app: 0 to 12 per post, most posts at the low end. One person can share
  // a post more than once.
  const shares = [];
  posts.forEach((post, i) => {
    const r = random(`shares:${i}`);
    const others = demoUsers.filter((u) => u.id !== post.author);
    const count = Math.floor(r.next() ** 1.6 * 13);
    for (let k = 0; k < count; k++) {
      const who = r.pick(others);
      const from = Math.max(post.at, who.joined) + MIN;
      shares.push({ id: randomUUID(), postId: post.id, user: who.id, at: from + r.next() ** 2 * Math.max(NOW - from - MIN, 0) });
    }
  });

  // Shelves ---------------------------------------------------------------------------------
  const library = [];
  const wishlist = [];
  const watches = [];

  for (const user of people.values()) {
    const r = random(`shelf:${user.handle}`);
    const shelf = new Map();
    const watching = new Set();
    const platformFor = (game) =>
      user.platforms.find((p) => game.platforms.includes(p)) ??
      FALLBACK_PLATFORMS.find((p) => game.platforms.includes(p)) ??
      null;
    const importedAt = () => user.joined + r.between(1, 40) * MIN;

    // 1. What the user's own posts say. Oldest first, so the latest post wins.
    const own = POSTS.filter((p) => p.by === user.handle && p.game).sort((a, b) => b.ago - a.ago);
    for (const p of own) {
      if (p.status === 'watch') {
        watching.add(p.game);
        continue;
      }
      const game = games.get(p.game);
      const hours =
        p.status === 'playing'
          ? round1(p.hour + r.between(0, 1.2) * p.ago) // they kept playing after the post
          : p.hour;
      const beatenAt = p.status === 'beaten' ? NOW - (p.ago + r.between(0.05, 0.6)) * DAY : null;
      shelf.set(p.game, {
        game,
        status: p.status,
        hours: Math.max(hours, shelf.get(p.game)?.hours ?? 0),
        rating: p.status === 'beaten' ? r.pick([10, 10, 9, 9, 8]) : r.chance(0.4) ? r.pick([8, 9, 10]) : null,
        finishedAt: beatenAt === null ? null : Math.max(beatenAt, game.release + DAY),
        addedAt: importedAt(),
      });
    }

    // 2. Games the real accounts own, so friends overlap with them. Kept light: too much
    //    and "Popular with friends" shows only the real user's own shelf back to them.
    const released = (key) => games.has(key) && games.get(key).release < NOW - 3 * DAY;
    for (const key of r.shuffle(SHARED).slice(0, r.int(0, 2))) {
      if (shelf.has(key) || !released(key)) continue;
      shelf.set(key, rollEntry(r, key, games.get(key), user, shelf, r.chance(0.5) ? 'beaten' : undefined));
    }

    // 3. Fill up to the shelf size from the user's taste pools.
    const target = r.int(user.size[0], user.size[1]);
    const candidates = [...new Set(user.pools.flatMap((pool) => r.shuffle(POOLS[pool])))];
    for (const key of r.shuffle(candidates)) {
      if (shelf.size >= target) break;
      if (shelf.has(key) || !released(key)) continue;
      shelf.set(key, rollEntry(r, key, games.get(key), user, shelf));
    }

    for (const e of shelf.values()) {
      library.push({
        user: user.id,
        gameId: e.game.id,
        status: e.status,
        rating: e.rating,
        notes: e.notes ?? '',
        hours: e.hours === null ? null : Math.min(e.hours, 9999.9),
        platform: platformFor(e.game),
        source: r.chance(0.7) ? 'search' : 'manual',
        addedAt: e.addedAt ?? (r.chance(0.75) ? importedAt() : user.joined + r.next() * (NOW - user.joined - HOUR)),
        finishedAt: e.finishedAt,
      });
    }

    // 4. Upcoming games they watch and wishlist.
    if (r.chance(0.7)) watching.add('gta6');
    for (const key of r.shuffle(UPCOMING).slice(0, r.int(1, 4))) watching.add(key);
    for (const key of watching) {
      const game = games.get(key);
      if (!game) continue;
      const at = user.joined + r.next() * (NOW - user.joined - HOUR);
      watches.push({ user: user.id, gameId: game.id, at });
      wishlist.push({ user: user.id, gameId: game.id, at });
    }
  }

  return {
    people,
    follows: [...follows.values()],
    posts,
    comments,
    likes,
    polls,
    pollOptions,
    votes,
    reposts,
    shares,
    library,
    wishlist,
    watches,
  };
}

/** One generated shelf entry. `forced` pins the status. */
function rollEntry(r, key, game, user, shelf, forced) {
  const endless = ENDLESS.has(key);
  const playingNow = [...shelf.values()].filter((e) => e.status === 'playing').length;
  let status = forced;
  if (!status) {
    const x = r.next();
    const backlog = user.backlogBias ?? 0.22;
    if (endless) status = x < 0.55 ? 'playing' : x < 0.8 ? 'dropped' : 'backlog';
    else if (x < backlog) status = 'backlog';
    else if (x < backlog + 0.12) status = 'dropped';
    else if (x < backlog + 0.2) status = 'playing';
    else status = 'beaten';
  }
  if (status === 'beaten' && endless) status = 'playing';
  if (status === 'playing' && playingNow >= 4) status = endless ? 'dropped' : 'backlog';

  let finishedAt = null;
  if (status === 'beaten') {
    const earliest = Math.max(game.release + 2 * DAY, NOW - 900 * DAY);
    const latest = NOW - 2 * DAY;
    if (earliest >= latest) {
      status = 'playing';
    } else {
      // Nearly half of all finishes land in the current year, so "year so far" has data.
      const from = r.chance(0.45) ? Math.max(earliest, YEAR_START) : earliest;
      finishedAt = from < latest ? from + r.next() * (latest - from) : earliest + r.next() * (latest - earliest);
    }
  }

  const ttb = game.ttb ?? r.between(15, 45);
  let hours;
  if (status === 'backlog') hours = r.chance(0.2) ? round1(r.between(0.3, 2.5)) : null;
  else if (endless) hours = round1(status === 'playing' ? r.between(25, 450) : r.between(3, 40));
  else if (status === 'playing') hours = round1(ttb * r.between(0.12, 0.75));
  else if (status === 'dropped') hours = round1(Math.max(0.5, ttb * r.between(0.05, 0.3)));
  else hours = round1(Math.min(ttb * r.between(0.85, 1.6), 999));

  let rating = null;
  if (status === 'beaten' && r.chance(0.75)) rating = r.pick([10, 9, 9, 8, 8, 8, 7, 7, 6]);
  if (status === 'playing' && r.chance(0.35)) rating = r.pick([10, 9, 8, 8, 7]);
  if (status === 'dropped' && r.chance(0.6)) rating = r.pick([3, 4, 5, 5, 6]);

  return { game, status, hours, rating, finishedAt, notes: r.chance(0.18) ? r.pick(NOTES[status]) : '' };
}

// ---------------------------------------------------------------------------------------------
// SQL

function buildSql(model) {
  const demo = `'{${[...model.people.values()].map((p) => p.id).join(',')}}'::uuid[]`;
  const values = (rows) => rows.join(',\n  ');
  const out = [];
  // An insert with no rows is a syntax error. Skip it instead.
  const insert = (head, rows) => rows.length && out.push(`${head} values\n  ${values(rows)};`);

  out.push(`begin;`);
  out.push(`-- Clear everything a previous run wrote.
delete from notifications where actor_id = any(${demo}) or user_id = any(${demo});
delete from posts where author_id = any(${demo});
delete from post_comments where author_id = any(${demo});
delete from post_likes where user_id = any(${demo});
-- Polls, votes, reposts and shares on demo posts went with the posts. These are the demo
-- users' rows on real posts.
delete from post_poll_votes where user_id = any(${demo});
delete from post_reposts where user_id = any(${demo});
delete from post_shares where user_id = any(${demo});
delete from follows where follower_id = any(${demo}) or followee_id = any(${demo});
delete from library_entries where user_id = any(${demo});
delete from wishlist_entries where user_id = any(${demo});
delete from game_watches where user_id = any(${demo});`);

  const people = [...model.people.values()];
  out.push(`update auth.users u
   set created_at = v.at::timestamptz, updated_at = v.at::timestamptz, email_confirmed_at = v.at::timestamptz
  from (values
  ${values(people.map((p) => tuple(p.id, iso(p.joined))))}
  ) as v(id, at)
 where u.id = v.id::uuid;`);

  out.push(`insert into profiles (user_id, handle, display_name, avatar_color, bio, share_activity, created_at) values
  ${values(people.map((p) => tuple(p.id, p.handle, p.name, p.color, p.bio, p.shareActivity ?? true, iso(p.joined))))}
on conflict (user_id) do update
   set handle = excluded.handle, display_name = excluded.display_name, avatar_color = excluded.avatar_color,
       bio = excluded.bio, share_activity = excluded.share_activity, created_at = excluded.created_at;`);

  out.push(`insert into library_entries (user_id, game_id, status, rating, notes, hours_played, platform_id, source_kind, added_at, finished_at) values
  ${values(
    model.library.map((e) =>
      tuple(e.user, e.gameId, e.status, e.rating, e.notes, e.hours, e.platform, e.source, iso(e.addedAt), e.finishedAt ? iso(e.finishedAt) : null),
    ),
  )};`);

  out.push(`insert into wishlist_entries (user_id, game_id, reminder_enabled, added_at) values
  ${values(model.wishlist.map((w) => tuple(w.user, w.gameId, true, iso(w.at))))};`);

  out.push(`insert into game_watches (user_id, game_id, created_at) values
  ${values(model.watches.map((w) => tuple(w.user, w.gameId, iso(w.at))))};`);

  // The follow, like and comment triggers write notifications as the rows go in.
  out.push(`insert into follows (follower_id, followee_id, created_at) values
  ${values(model.follows.map((f) => tuple(f.follower, f.followee, iso(f.at))))};`);

  out.push(`insert into posts (id, author_id, body, category, link_url, game_id, image_path, created_at) values
  ${values(model.posts.map((p) => tuple(p.id, p.author, p.body, p.category, p.link, p.gameId, p.imagePath, iso(p.at))))};`);

  insert(
    `insert into post_polls (post_id, ends_at, created_at)`,
    model.polls.map((p) => tuple(p.postId, iso(p.endsAt), iso(p.at))),
  );
  insert(
    `insert into post_poll_options (id, post_id, position, label)`,
    model.pollOptions.map((o) => tuple(o.id, o.postId, o.position, o.label)),
  );
  insert(
    `insert into post_poll_votes (post_id, user_id, option_id, created_at)`,
    model.votes.map((v) => tuple(v.postId, v.user, v.optionId, iso(v.at))),
  );
  insert(
    `insert into post_reposts (post_id, user_id, created_at)`,
    model.reposts.map((r) => tuple(r.postId, r.user, iso(r.at))),
  );
  insert(
    `insert into post_shares (id, post_id, user_id, created_at)`,
    model.shares.map((sh) => tuple(sh.id, sh.postId, sh.user, iso(sh.at))),
  );

  out.push(`insert into post_comments (id, post_id, author_id, body, created_at) values
  ${values(model.comments.map((c) => tuple(c.id, c.postId, c.author, c.body, iso(c.at))))};`);

  out.push(`insert into post_likes (post_id, user_id, created_at) values
  ${values(model.likes.map((l) => tuple(l.postId, l.user, iso(l.at))))};`);

  out.push(`-- The triggers stamp notifications with now(). Move each one to the time of its event.
update notifications n set created_at = f.created_at
  from follows f
 where n.kind = 'follow' and n.user_id = f.followee_id and n.actor_id = f.follower_id
   and (f.follower_id = any(${demo}) or f.followee_id = any(${demo}));
update notifications n set created_at = l.created_at
  from post_likes l
 where n.kind = 'post_like' and n.post_id = l.post_id and n.actor_id = l.user_id and l.user_id = any(${demo});
update notifications n set created_at = c.created_at
  from post_comments c
 where n.kind = 'post_comment' and n.comment_id = c.id and c.author_id = any(${demo});
-- Never push these. push-sweep sends every row where pushed_at is null.
update notifications set pushed_at = now()
 where pushed_at is null and (actor_id = any(${demo}) or user_id = any(${demo}));
-- Demo users have read everything. Real accounts keep the last 36 hours unread.
update notifications set read_at = created_at + interval '1 hour'
 where read_at is null
   and (user_id = any(${demo}) or (actor_id = any(${demo}) and created_at < now() - interval '36 hours'));`);

  // Columns that the backend plan adds later (docs/backend-feasibility.md). PL/pgSQL plans
  // a statement only when it runs, so the branch for a missing column never fails.
  const hourMarks = model.posts.filter((p) => p.hourMark !== null);
  out.push(`do $seed$
begin
  if exists (select 1 from information_schema.columns
              where table_schema = 'public' and table_name = 'posts' and column_name = 'hour_mark') then
    update posts p set hour_mark = v.h
      from (values ${hourMarks.map((p) => `(${lit(p.id)}::uuid, ${p.hourMark}::numeric)`).join(', ')}) as v(id, h)
     where p.id = v.id;
  end if;
  if exists (select 1 from information_schema.columns
              where table_schema = 'public' and table_name = 'profiles' and column_name = 'avatar_key') then
    update profiles p set avatar_key = v.k
      from (values ${people.map((p) => `(${lit(p.id)}::uuid, ${lit(p.avatarKey)})`).join(', ')}) as v(id, k)
     where p.user_id = v.id;
  end if;
end
$seed$;`);

  out.push(`commit;`);
  return out.join('\n\n');
}

// ---------------------------------------------------------------------------------------------

async function remove() {
  // Photos first: once the users are gone, nothing tells a demo photo apart.
  const ids = (await sql(`select id from auth.users where raw_app_meta_data->>'demo_seed' = ${lit(SEED_TAG)}`)).map((r) => r.id);
  const photos = await deleteDemoPhotos(await serviceRoleKey(), ids);
  const [{ count }] = await sql(`
    with gone as (delete from auth.users where raw_app_meta_data->>'demo_seed' = ${lit(SEED_TAG)} returning 1)
    select count(*)::int as count from gone`);
  console.log(
    `Removed ${count} demo users and ${photos} demo photos. Their profiles, shelves, posts, polls, reposts, ` +
      `follows and notifications went with them.`,
  );
}

async function report(model, real) {
  const demo = `'{${[...model.people.values()].map((p) => p.id).join(',')}}'::uuid[]`;
  const [counts] = await sql(`
    select (select count(*) from profiles where user_id = any(${demo}))::int as profiles,
           (select count(*) from notifications)::int as notifications,
           (select count(*) from notifications where pushed_at is null)::int as unpushed,
           (select coalesce(json_object_agg(c.category, c.n), '{}')
              from (select coalesce(category, 'none') as category, count(*)::int as n
                      from posts where author_id = any(${demo}) group by 1 order by 1) c) as categories,
           (select count(*) from post_polls pp join posts p on p.id = pp.post_id where p.author_id = any(${demo}))::int as polls,
           (select count(*) from post_poll_votes where user_id = any(${demo}))::int as votes,
           (select count(*) from post_poll_votes v join posts p on p.id = v.post_id
             where p.author_id = any(${demo}) and not v.user_id = any(${demo}))::int as other_votes,
           (select count(*) from post_reposts where user_id = any(${demo}))::int as reposts,
           (select count(distinct post_id) from post_reposts where user_id = any(${demo}))::int as reposted_posts,
           (select count(*) from post_shares where user_id = any(${demo}))::int as shares,
           (select count(*) from posts where author_id = any(${demo}) and image_path is not null)::int as photos`);
  console.log(
    `\nWrote ${counts.profiles} profiles, ${model.library.length} shelf entries, ${model.follows.length} follows, ` +
      `${model.posts.length} posts, ${model.comments.length} comments, ${model.likes.length} likes, ` +
      `${model.watches.length} watches.`,
  );
  console.log(
    `Categories: ${Object.entries(counts.categories).map(([c, n]) => `${n} ${c}`).join(', ')}. ` +
      `${counts.polls} polls with ${counts.votes} votes (${counts.other_votes} from other accounts). ` +
      `${counts.reposts} reposts on ${counts.reposted_posts} posts. ${counts.shares} shares. ${counts.photos} photos.`,
  );
  console.log(`Notifications in the project: ${counts.notifications} (${counts.unpushed} not pushed, none of them from the seed).`);

  for (const [handle, account] of real) {
    // One row every time. An empty result would make the API return set_config's row instead.
    const [view] = await sqlAs(
      account.id,
      `select f.feed, f.polls, f.voted, f.reposted, f.photos,
              shelf_unread_notification_count()::int as unread,
              (select coalesce(json_agg(t), '[]'::json)
                 from (select title, friend_count::int as friends from shelf_popular_with_friends(5)) t) as popular
         from (select count(*)::int as feed,
                      count(*) filter (where poll is not null)::int as polls,
                      count(*) filter (where poll->>'my_option_id' is not null)::int as voted,
                      count(*) filter (where reposted_by_handle is not null)::int as reposted,
                      count(*) filter (where image_path is not null)::int as photos
                 from shelf_feed(50)) f`,
    );
    console.log(
      `\n@${handle}: ${view.feed} posts in the feed, ${view.unread} unread notifications.` +
        `\n  Feed: ${view.polls} polls (${view.voted} voted), ${view.reposted} "reposted by" lines, ${view.photos} photos.` +
        `\n  Popular with friends: ${view.popular.map((g) => `${g.title} (${g.friends})`).join(', ') || 'nothing'}`,
    );
  }
}

async function main() {
  if (REMOVE) return remove();
  checkData();

  const games = await resolveGames();
  const missing = Object.keys(GAMES).filter((k) => !games.has(k));
  const needed = new Set(POSTS.map((p) => p.game).filter(Boolean));
  const missingNeeded = missing.filter((k) => needed.has(k));
  if (missingNeeded.length) throw new Error(`Posts name games the catalog does not have: ${missingNeeded.join(', ')}`);
  if (missing.length) console.warn(`Skipping games the catalog does not have: ${missing.join(', ')}`);

  const existing = await existingDemoUsers();
  const ids = new Map();
  const toCreate = USERS.filter((u) => !existing.has(emailFor(u.handle)));
  const key = DRY_RUN ? null : await serviceRoleKey();
  for (const user of USERS) {
    const known = existing.get(emailFor(user.handle));
    if (known) ids.set(user.handle, known);
    else if (DRY_RUN) ids.set(user.handle, randomUUID());
    else ids.set(user.handle, await createAuthUser(key, user));
  }
  console.log(`${USERS.length - toCreate.length} demo users already existed, ${toCreate.length} ${DRY_RUN ? 'would be' : 'were'} created.`);

  const real = await realAccounts();
  const missingReal = REAL_LINKS.map((l) => l.handle).filter((h) => !real.has(h));
  if (missingReal.length) console.warn(`Real accounts not found, skipped: ${missingReal.join(', ')}`);
  const existingRealPosts = await realPosts();

  const model = buildModel({ games, ids, real, existingRealPosts });
  const photos = model.posts.filter((p) => p.imagePath);

  if (!DRY_RUN) {
    // Wide art for each game card: the demo posts' games, and the games real posts name.
    const realGames = await sql(`select distinct game_id::text as id from posts where game_id is not null`);
    const gameIds = [...new Set([...model.posts.map((p) => p.gameId).filter(Boolean), ...realGames.map((g) => g.id)])];
    const artwork = await requestArtwork(key, gameIds);
    const withArt = gameIds.filter((id) => artwork[id]).length;
    console.log(`Game art: ${withArt} of ${gameIds.length} games have it. IGDB has none for ${gameIds.length - withArt}.`);

    // Each photo is its game's IGDB screenshot at t_screenshot_big.
    for (const post of photos) {
      const art = artwork[post.gameId];
      if (!art) {
        console.warn(`No IGDB screenshot for the game on "${post.body.slice(0, 40)}...". The post goes up without a photo.`);
        post.imagePath = null;
        continue;
      }
      await uploadPhoto(key, post.imagePath, art.replace('/t_screenshot_huge/', '/t_screenshot_big/'));
    }
  }

  const query = buildSql(model);

  if (DRY_RUN) {
    const file = join(tmpdir(), 'prysm-demo-seed.sql');
    writeFileSync(file, query);
    console.log(`Dry run. Nothing changed. The SQL is in ${file}`);
    return;
  }

  await sql(query);
  const kept = new Set(model.posts.map((p) => p.imagePath).filter(Boolean));
  const deleted = await deleteDemoPhotos(key, [...model.people.values()].map((p) => p.id), kept);
  if (deleted) console.log(`Deleted ${deleted} demo photos that no post uses now.`);
  await report(model, real);
}

main().catch((error) => {
  console.error(error.message ?? error);
  process.exit(1);
});
