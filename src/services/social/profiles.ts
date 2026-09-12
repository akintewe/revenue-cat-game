import { supabase } from '../supabase/client';
import { coverColors } from '../../shared/theme/theme';
import type { CoverColorKey } from '../../data/catalog';

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
