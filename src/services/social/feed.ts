import { supabase } from '../supabase/client';
import type { CoverColorKey } from '../../data/catalog';

export type FeedPost = {
  id: string;
  body: string;
  link_url: string | null;
  image_path: string | null;
  created_at: string;
  edited_at: string | null;
  author_id: string;
  handle: string;
  display_name: string;
  avatar_color: CoverColorKey;
  game_id: string | null;
  game_title: string | null;
  game_cover: string | null;
  like_count: number;
  comment_count: number;
  liked_by_me: boolean;
};

export async function fetchFeed(params?: {
  limit?: number;
  before?: string;
  beforeId?: string;
  handle?: string;
}): Promise<FeedPost[]> {
  const { data, error } = await supabase.rpc('shelf_feed', {
    p_limit: params?.limit ?? 20,
    p_before: params?.before ?? null,
    p_before_id: params?.beforeId ?? null,
    p_handle: params?.handle ?? null,
  });
  if (error) throw error;
  return data ?? [];
}

/**
 * There's no direct "fetch one post by id" endpoint yet, so this pages through an
 * author's own feed looking for it. Only reliable for the signed-in user's own recent
 * posts — which is the only case this is used for: a post_like/post_comment
 * notification is always about a post the signed-in user wrote. Flagged to backend as
 * a real gap worth closing (a `shelf_post(p_post_id)` RPC) rather than paging forever.
 */
export async function findPostById(handle: string, postId: string, maxPages = 4): Promise<FeedPost | null> {
  let before: string | undefined;
  let beforeId: string | undefined;
  for (let page = 0; page < maxPages; page++) {
    const posts = await fetchFeed({ handle, limit: 50, before, beforeId });
    const found = posts.find((post) => post.id === postId);
    if (found) return found;
    if (posts.length < 50) return null;
    const last = posts[posts.length - 1];
    before = last.created_at;
    beforeId = last.id;
  }
  return null;
}

export async function createPost(
  authorId: string,
  body: string,
  opts?: { linkUrl?: string; gameId?: string; imagePath?: string },
): Promise<void> {
  const { error } = await supabase.from('posts').insert({
    author_id: authorId,
    body,
    link_url: opts?.linkUrl ?? null,
    game_id: opts?.gameId ?? null,
    image_path: opts?.imagePath ?? null,
  });
  if (error) throw error;
}

const POST_IMAGES_BUCKET = 'post-images';

/** Uploads a locally-picked image to the post-images bucket and returns its storage path (not a URL). */
export async function uploadPostImage(userId: string, uri: string, mimeType = 'image/jpeg'): Promise<string> {
  const ext = mimeType === 'image/png' ? 'png' : mimeType === 'image/webp' ? 'webp' : 'jpg';
  const path = `${userId}/${Date.now()}-${Math.floor(Math.random() * 1e6)}.${ext}`;
  const arrayBuffer = await fetch(uri).then((res) => res.arrayBuffer());
  const { error } = await supabase.storage.from(POST_IMAGES_BUCKET).upload(path, arrayBuffer, {
    contentType: mimeType,
  });
  if (error) throw error;
  return path;
}

export function postImageUrl(path: string): string {
  return supabase.storage.from(POST_IMAGES_BUCKET).getPublicUrl(path).data.publicUrl;
}

export async function deletePost(postId: string): Promise<void> {
  const { error } = await supabase.from('posts').delete().eq('id', postId);
  if (error) throw error;
}

export async function likePost(userId: string, postId: string): Promise<void> {
  const { error } = await supabase.from('post_likes').insert({ post_id: postId, user_id: userId });
  if (error && error.code !== '23505') throw error;
}

export async function unlikePost(userId: string, postId: string): Promise<void> {
  const { error } = await supabase.from('post_likes').delete().eq('post_id', postId).eq('user_id', userId);
  if (error) throw error;
}

export async function addComment(postId: string, authorId: string, body: string): Promise<void> {
  const { error } = await supabase.from('post_comments').insert({ post_id: postId, author_id: authorId, body });
  if (error) throw error;
}

export type PostComment = {
  id: string;
  post_id: string;
  author_id: string;
  body: string;
  created_at: string;
  handle: string;
  display_name: string;
  avatar_color: CoverColorKey;
};

/**
 * post_comments has no direct PostgREST-embeddable relationship to profiles, so this
 * fetches comments then resolves their authors' profiles in a second query and merges —
 * same info shelf_feed already joins server-side for posts, just not for comments yet.
 */
export async function fetchComments(postId: string): Promise<PostComment[]> {
  const { data: comments, error } = await supabase
    .from('post_comments')
    .select('id, post_id, author_id, body, created_at')
    .eq('post_id', postId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  if (!comments || comments.length === 0) return [];

  const authorIds = Array.from(new Set(comments.map((c) => c.author_id)));
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('user_id, handle, display_name, avatar_color')
    .in('user_id', authorIds);
  if (profilesError) throw profilesError;

  const byId = new Map((profiles ?? []).map((p) => [p.user_id, p]));
  return comments.map((c) => {
    const profile = byId.get(c.author_id);
    return {
      ...c,
      handle: profile?.handle ?? 'unknown',
      display_name: profile?.display_name ?? 'Unknown',
      avatar_color: (profile?.avatar_color as CoverColorKey) ?? 'slate',
    };
  });
}
