import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, coverColors, discoverColors, radii, spacing } from '../../../shared/theme/theme';
import { GameCover } from '../../../shared/components/GameCover';
import { timeAgo } from '../../../shared/utils/formatDate';
import {
  addComment,
  deletePost,
  fetchComments,
  likePost,
  postImageUrl,
  unlikePost,
  type FeedPost,
  type PostComment,
} from '../../../services/social/feed';
import { blockUser, reportContent } from '../../../services/social/moderation';
import { useAuthStore } from '../../auth/store/useAuthStore';
import type { RootScreenProps } from '../../../core/navigation/types';

const REPORT_REASONS = ['Spam', 'Harassment', 'Inappropriate content', 'Impersonation', 'Other'];

type Props = RootScreenProps<'PostDetail'>;

export function PostDetailScreen({ route, navigation }: Props) {
  const insets = useSafeAreaInsets();
  const userId = useAuthStore((state) => state.session?.user.id);
  const { onPostUpdated, onPostDeleted } = route.params;

  const [post, setPost] = useState<FeedPost>(route.params.post);
  const [comments, setComments] = useState<PostComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchComments(post.id)
      .then((result) => {
        if (!cancelled) setComments(result);
      })
      .catch(() => {
        if (!cancelled) setComments([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [post.id]);

  function updatePost(next: FeedPost) {
    setPost(next);
    onPostUpdated?.(next);
  }

  function handleToggleLike() {
    if (!userId) return;
    const wasLiked = post.liked_by_me;
    updatePost({ ...post, liked_by_me: !wasLiked, like_count: post.like_count + (wasLiked ? -1 : 1) });
    const action = wasLiked ? unlikePost(userId, post.id) : likePost(userId, post.id);
    action.catch((err) => {
      console.warn('[post-detail] toggle like failed', err);
      updatePost({ ...post, liked_by_me: wasLiked, like_count: post.like_count });
    });
  }

  function handleDeletePost() {
    Alert.alert('Delete post?', "This can't be undone.", [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          deletePost(post.id)
            .then(() => {
              onPostDeleted?.(post.id);
              navigation.goBack();
            })
            .catch((err) => Alert.alert('Could not delete', err instanceof Error ? err.message : 'Please try again.'));
        },
      },
    ]);
  }

  function handleMoreOptions() {
    if (!userId) return;
    Alert.alert(`@${post.handle}`, undefined, [
      {
        text: 'Block this account',
        style: 'destructive',
        onPress: () => {
          Alert.alert('Block this account?', 'You will no longer see each other on Prysm.', [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Block',
              style: 'destructive',
              onPress: () => {
                blockUser(userId, post.author_id)
                  .then(() => {
                    onPostDeleted?.(post.id);
                    navigation.goBack();
                  })
                  .catch((err) => console.warn('[moderation] blockUser failed', err));
              },
            },
          ]);
        },
      },
      {
        text: 'Report post',
        onPress: () => {
          const reasonButtons: NonNullable<Parameters<typeof Alert.alert>[2]> = [
            ...REPORT_REASONS.map((reason) => ({
              text: reason,
              onPress: () => {
                reportContent(userId, 'post', post.id, reason).catch((err) =>
                  console.warn('[moderation] reportContent failed', err),
                );
                Alert.alert('Reported', "Thanks — we've received your report.");
              },
            })),
            { text: 'Cancel', style: 'cancel' as const },
          ];
          Alert.alert('Report this post', 'What best describes the issue?', reasonButtons);
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  async function handleSend() {
    const body = draft.trim();
    if (!body || !userId || sending) return;
    setSending(true);
    try {
      await addComment(post.id, userId, body);
      setDraft('');
      updatePost({ ...post, comment_count: post.comment_count + 1 });
      const refreshed = await fetchComments(post.id);
      setComments(refreshed);
    } catch (err) {
      console.warn('[post-detail] addComment failed', err);
    } finally {
      setSending(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={insets.top}
    >
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Post</Text>
        <View style={styles.headerSpacer} />
      </View>

      <FlatList
        data={comments}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View>
            <View style={styles.postCard}>
              <View style={styles.postHeader}>
                <Pressable
                  style={styles.postAuthorTapArea}
                  onPress={() => navigation.push('FriendProfile', { handle: post.handle })}
                  hitSlop={4}
                >
                  <View style={[styles.avatar, styles.postAvatar, { backgroundColor: coverColors[post.avatar_color] ?? coverColors.slate }]} />
                  <View>
                    <Text style={styles.postName}>{post.display_name}</Text>
                    <Text style={styles.postHandle}>@{post.handle}</Text>
                  </View>
                </Pressable>
                {post.author_id === userId ? (
                  <Pressable style={styles.postMenuButton} onPress={handleDeletePost} hitSlop={8}>
                    <Ionicons name="trash-outline" size={16} color={discoverColors.mutedText} />
                  </Pressable>
                ) : (
                  <Pressable style={styles.postMenuButton} onPress={handleMoreOptions} hitSlop={8}>
                    <Ionicons name="ellipsis-horizontal" size={16} color={discoverColors.mutedText} />
                  </Pressable>
                )}
              </View>

              <Text style={styles.postMessage}>{post.body}</Text>

              {post.image_path && (
                <Image source={{ uri: postImageUrl(post.image_path) }} style={styles.postImage} contentFit="cover" />
              )}

              {post.game_cover && (
                <View style={styles.postGameRow}>
                  <GameCover abbreviation={post.game_title?.slice(0, 2) ?? '??'} colorKey="slate" imageUrl={post.game_cover} size={40} />
                  <Text style={styles.postGameTitle} numberOfLines={1}>
                    {post.game_title}
                  </Text>
                </View>
              )}

              <Text style={styles.postTime}>{timeAgo(post.created_at)}</Text>

              <View style={styles.postActions}>
                <Pressable style={styles.postActionButton} hitSlop={8} onPress={handleToggleLike}>
                  <Ionicons
                    name={post.liked_by_me ? 'heart' : 'heart-outline'}
                    size={20}
                    color={post.liked_by_me ? colors.accent : discoverColors.mutedText}
                  />
                  {post.like_count > 0 && <Text style={styles.postActionCount}>{post.like_count}</Text>}
                </Pressable>
                <View style={styles.postActionButton}>
                  <Ionicons name="chatbubble-outline" size={19} color={discoverColors.mutedText} />
                  {post.comment_count > 0 && <Text style={styles.postActionCount}>{post.comment_count}</Text>}
                </View>
              </View>
            </View>

            <Text style={styles.commentsLabel}>Comments</Text>

            {loading && <ActivityIndicator color={colors.accent} style={styles.loading} />}
          </View>
        }
        ListEmptyComponent={
          !loading ? <Text style={styles.empty}>No comments yet — be the first.</Text> : null
        }
        renderItem={({ item }) => (
          <View style={styles.commentRow}>
            <View style={[styles.avatar, styles.commentAvatar, { backgroundColor: coverColors[item.avatar_color] ?? coverColors.slate }]} />
            <View style={styles.commentBody}>
              <View style={styles.commentMetaRow}>
                <Text style={styles.commentName}>{item.display_name}</Text>
                <Text style={styles.commentTime}>{timeAgo(item.created_at)}</Text>
              </View>
              <Text style={styles.commentText}>{item.body}</Text>
            </View>
          </View>
        )}
      />

      <View style={[styles.inputRow, { paddingBottom: insets.bottom + spacing.sm }]}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder="Add a comment…"
          placeholderTextColor={discoverColors.mutedText}
          style={styles.input}
          multiline
        />
        <Pressable
          style={[styles.sendButton, (!draft.trim() || sending) && styles.sendButtonDisabled]}
          onPress={handleSend}
          disabled={!draft.trim() || sending}
        >
          {sending ? <ActivityIndicator color={colors.onAccent} size="small" /> : <Ionicons name="arrow-up" size={18} color={colors.onAccent} />}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  headerTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '700',
  },
  headerSpacer: {
    width: 22,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  avatar: {
    borderRadius: 999,
  },
  postCard: {
    gap: spacing.sm,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  postAuthorTapArea: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  postAvatar: {
    width: 44,
    height: 44,
  },
  postName: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  postHandle: {
    color: discoverColors.mutedText,
    fontSize: 13,
    marginTop: 1,
  },
  postMenuButton: {
    padding: 4,
  },
  postMessage: {
    color: discoverColors.titleText,
    fontSize: 17,
    lineHeight: 24,
  },
  postImage: {
    height: 220,
    borderRadius: radii.md,
    backgroundColor: discoverColors.rowBg,
  },
  postGameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: discoverColors.rowBg,
    borderRadius: radii.md,
    padding: spacing.sm,
  },
  postGameTitle: {
    flex: 1,
    color: discoverColors.titleText,
    fontSize: 13,
    fontWeight: '600',
  },
  postTime: {
    color: discoverColors.mutedText,
    fontSize: 13,
  },
  postActions: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginTop: spacing.xs,
  },
  postActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    padding: 2,
  },
  postActionCount: {
    color: discoverColors.mutedText,
    fontSize: 13,
    fontWeight: '600',
  },
  commentsLabel: {
    color: colors.textFaint,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  loading: {
    paddingVertical: spacing.lg,
  },
  empty: {
    color: colors.textMuted,
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: spacing.xl,
  },
  commentRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingVertical: spacing.sm + 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  commentAvatar: {
    width: 34,
    height: 34,
  },
  commentBody: {
    flex: 1,
    gap: 2,
  },
  commentMetaRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  commentName: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  commentTime: {
    color: colors.textFaint,
    fontSize: 11,
  },
  commentText: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 19,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  input: {
    flex: 1,
    color: colors.text,
    fontSize: 14,
    maxHeight: 100,
    backgroundColor: discoverColors.rowBg,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.4,
  },
});
