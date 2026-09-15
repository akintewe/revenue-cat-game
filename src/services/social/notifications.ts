import { supabase } from '../supabase/client';
import type { CoverColorKey } from '../../data/catalog';

export type NotificationKind = 'follow' | 'post_like' | 'post_comment';

export type ShelfNotification = {
  id: string;
  kind: NotificationKind;
  created_at: string;
  read_at: string | null;
  actor_id: string;
  handle: string;
  display_name: string;
  avatar_color: CoverColorKey;
  post_id: string | null;
  post_excerpt: string | null;
  comment_id: string | null;
  comment_excerpt: string | null;
};

export async function fetchNotifications(params?: {
  limit?: number;
  before?: string;
  beforeId?: string;
  unreadOnly?: boolean;
}): Promise<ShelfNotification[]> {
  const { data, error } = await supabase.rpc('shelf_notifications', {
    p_limit: params?.limit ?? 20,
    p_before: params?.before ?? null,
    p_before_id: params?.beforeId ?? null,
    p_unread_only: params?.unreadOnly ?? false,
  });
  if (error) throw error;
  return data ?? [];
}

export async function fetchUnreadNotificationCount(): Promise<number> {
  const { data, error } = await supabase.rpc('shelf_unread_notification_count');
  if (error) throw error;
  return Number(data ?? 0);
}

/** Omit ids to mark every notification read. Returns how many rows actually changed. */
export async function markNotificationsRead(ids?: string[]): Promise<number> {
  const { data, error } = await supabase.rpc('shelf_mark_notifications_read', {
    p_ids: ids ?? null,
  });
  if (error) throw error;
  return Number(data ?? 0);
}
