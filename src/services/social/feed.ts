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
