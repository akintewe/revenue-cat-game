import { supabase } from '../supabase/client';

export type AccountDeleteResult = {
  deleted: boolean;
  imagesRemoved: number;
};

/**
 * The only path that removes a user's auth.users row (and everything cascading from it —
 * library, wishlist, posts, comments, likes, follows, blocks, reports, notifications,
 * platform links, share history, profile). Storage isn't cascaded automatically, so the
 * function clears post-images first and aborts the delete if that fails.
 */
export async function deleteAccount(): Promise<AccountDeleteResult> {
  const { data, error } = await supabase.functions.invoke<AccountDeleteResult>('account-delete', {
    method: 'POST',
    body: { confirm: 'delete' },
  });
  if (error) throw error;
  return data!;
}
