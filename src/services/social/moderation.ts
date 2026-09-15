import { supabase } from '../supabase/client';

export type ReportTargetType = 'post' | 'comment' | 'profile';

export async function blockUser(blockerId: string, blockedId: string): Promise<void> {
  const { error } = await supabase.from('user_blocks').insert({ blocker_id: blockerId, blocked_id: blockedId });
  if (error && error.code !== '23505') throw error;
}

export async function unblockUser(blockerId: string, blockedId: string): Promise<void> {
  const { error } = await supabase
    .from('user_blocks')
    .delete()
    .eq('blocker_id', blockerId)
    .eq('blocked_id', blockedId);
  if (error) throw error;
}

export async function reportContent(
  reporterId: string,
  targetType: ReportTargetType,
  targetId: string,
  reason: string,
): Promise<void> {
  const { error } = await supabase.from('content_reports').insert({
    reporter_id: reporterId,
    target_type: targetType,
    target_id: targetId,
    reason,
  });
  if (error) throw error;
}
