import { supabase } from '../supabase/client';
import { coverColors } from '../../shared/theme/theme';
import type { CoverColorKey } from '../../data/catalog';
import type { SearchDevice } from '../catalog/remoteCatalog';

const AVATAR_COLORS = Object.keys(coverColors) as CoverColorKey[];

function randomAvatarColor(): CoverColorKey {
  return AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
}

function slugifyHandle(email: string): string {
  const base = email
    .split('@')[0]
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '')
    .slice(0, 16);
  return base.length >= 3 ? base : `player${base}`;
}

/**
 * Nothing writes `profiles` automatically, and a post by an account with no profile
 * row never appears in any feed (the query joins on it). Called once per sign-in —
 * upserts on user_id so it's a no-op after the first successful call, and retries
 * with a randomized suffix if the slugified handle collides with someone else's.
 */
export async function ensureProfile(userId: string, email: string): Promise<void> {
  const base = slugifyHandle(email);
  let handle = base;

  for (let attempt = 0; attempt < 5; attempt++) {
    const { error } = await supabase.from('profiles').upsert(
      { user_id: userId, handle, display_name: base, avatar_color: randomAvatarColor() },
      { onConflict: 'user_id' },
    );
    if (!error) return;
    if (error.code === '23505') {
      handle = `${base}${Math.floor(1000 + Math.random() * 9000)}`;
      continue;
    }
    throw error;
  }
}

export async function fetchMyAvatarColor(userId: string): Promise<CoverColorKey | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('avatar_color')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return (data?.avatar_color as CoverColorKey | undefined) ?? null;
}

export async function fetchMyDisplayName(userId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return data?.display_name ?? null;
}

/** Whether this account is counted in /games/popular-with-friends for people who follow them. Defaults to true. */
export async function fetchMyShareActivity(userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('profiles')
    .select('share_activity')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return data?.share_activity ?? true;
}

export async function setShareActivity(userId: string, enabled: boolean): Promise<void> {
  const { error } = await supabase.from('profiles').update({ share_activity: enabled }).eq('user_id', userId);
  if (error) throw error;
}

export type MyProfile = {
  handle: string;
  display_name: string;
  bio: string;
  avatar_color: CoverColorKey;
};

export async function fetchMyProfile(userId: string): Promise<MyProfile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('handle, display_name, bio, avatar_color')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return data ?? null;
}

export class ProfileUpdateError extends Error {
  constructor(public field: 'handle' | 'other', message: string) {
    super(message);
  }
}

export async function updateMyProfile(
  userId: string,
  patch: Partial<Pick<MyProfile, 'handle' | 'display_name' | 'bio' | 'avatar_color'>> & { platforms?: SearchDevice[] },
): Promise<void> {
  const { error } = await supabase.from('profiles').update(patch).eq('user_id', userId);
  if (!error) return;
  if (error.code === '23505') throw new ProfileUpdateError('handle', 'That handle is already taken.');
  if (error.code === '23514') throw new ProfileUpdateError('handle', 'Handle must be 3-20 characters: lowercase letters, numbers, and underscores only.');
  throw new ProfileUpdateError('other', error.message);
}

export type ProfileStats = {
  user_id: string;
  handle: string;
  display_name: string;
  avatar_color: CoverColorKey;
  bio: string;
  followers: number;
  following: number;
  post_count: number;
  followed_by_me: boolean;
  is_me: boolean;
};

export async function fetchProfileStats(handle: string): Promise<ProfileStats | null> {
  const { data, error } = await supabase.rpc('shelf_profile_stats', { p_handle: handle });
  if (error) throw error;
  return (data ?? [])[0] ?? null;
}

export async function followUser(userId: string, targetUserId: string): Promise<void> {
  const { error } = await supabase.from('follows').insert({ follower_id: userId, followee_id: targetUserId });
  if (error && error.code !== '23505') throw error;
}

export async function unfollowUser(userId: string, targetUserId: string): Promise<void> {
  const { error } = await supabase
    .from('follows')
    .delete()
    .eq('follower_id', userId)
    .eq('followee_id', targetUserId);
  if (error) throw error;
}

export type ProfileSummary = {
  user_id: string;
  handle: string;
  display_name: string;
  avatar_color: CoverColorKey;
  bio: string;
  followed_by_me: boolean;
  is_me: boolean;
};

export type FollowListRow = ProfileSummary & {
  /** Pagination cursor for the two list RPCs — when the follow happened. */
  followed_at: string;
};

/** Prefix search over handle/display name. Under 2 characters returns nothing, same floor as /search. */
export async function searchUsers(query: string, maxResults = 20): Promise<ProfileSummary[]> {
  const { data, error } = await supabase.rpc('shelf_search_users', { q: query, max_results: maxResults });
  if (error) throw error;
  return data ?? [];
}

export type SuggestedUser = ProfileSummary & {
  games_in_common: number;
  library_count: number;
  /** Null (not 0) on every real account today — render as absent, not "0 hrs". */
  hours_played: number | null;
  platforms: SearchDevice[];
};

/**
 * Curated "people like you" — ranked games-in-common, then shared platforms, then
 * library size, then hours, with accounts under 3 games sorted last (never excluded).
 * Already excludes people followed and either direction of a block.
 */
export async function fetchSuggestedUsers(maxResults = 20): Promise<SuggestedUser[]> {
  const { data, error } = await supabase.rpc('shelf_suggested_users', { max_results: maxResults });
  if (error) throw error;
  return data ?? [];
}

export async function fetchFollowers(params: {
  handle: string;
  limit?: number;
  before?: string;
  beforeId?: string;
}): Promise<FollowListRow[]> {
  const { data, error } = await supabase.rpc('shelf_followers', {
    p_handle: params.handle,
    p_limit: params.limit ?? 20,
    p_before: params.before ?? null,
    p_before_id: params.beforeId ?? null,
  });
  if (error) throw error;
  return data ?? [];
}

export async function fetchFollowing(params: {
  handle: string;
  limit?: number;
  before?: string;
  beforeId?: string;
}): Promise<FollowListRow[]> {
  const { data, error } = await supabase.rpc('shelf_following', {
    p_handle: params.handle,
    p_limit: params.limit ?? 20,
    p_before: params.before ?? null,
    p_before_id: params.beforeId ?? null,
  });
  if (error) throw error;
  return data ?? [];
}
