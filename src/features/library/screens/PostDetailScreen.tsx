import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, discoverColors, radii, spacing } from '../../../shared/theme/theme';
import { Avatar } from '../../../shared/components/Avatar';
import { ScreenBackground } from '../../../shared/components/ScreenBackground';
import { timeAgo } from '../../../shared/utils/formatDate';
import { addComment, fetchComments, type FeedPost, type PostComment } from '../../../services/social/feed';
import { PostCard } from '../../feed/components/PostCard';
import { usePostHandlers } from '../../feed/hooks/usePostHandlers';
import { useAuthStore } from '../../auth/store/useAuthStore';
import type { RootScreenProps } from '../../../core/navigation/types';

type Props = RootScreenProps<'PostDetail'>;

export function PostDetailScreen({ route, navigation }: Props) {
  const insets = useSafeAreaInsets();
  const userId = useAuthStore((state) => state.session?.user.id);
  const { onPostUpdated, onPostDeleted } = route.params;

  const [posts, setPosts] = useState<FeedPost[]>([route.params.post]);
  const post = posts[0] ?? route.params.post;
  const [comments, setComments] = useState<PostComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);

  const onRemoved = useCallback(
    (removed: FeedPost) => {
      onPostDeleted?.(removed.id);
      navigation.goBack();
    },
    [navigation, onPostDeleted],
  );
  const handlers = usePostHandlers({ setPosts, canOpen: false, onRemoved });

  // Keep the list this post came from in step with likes, reposts, votes and comments here.
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (posts[0]) onPostUpdated?.(posts[0]);
  }, [posts, onPostUpdated]);

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
  }, [post.id]);

  async function handleSend() {
    const body = draft.trim();
    if (!body || !userId || sending) return;
    setSending(true);
    try {
      await addComment(post.id, userId, body);
      setDraft('');
      setPosts((prev) => prev.map((p) => ({ ...p, comment_count: p.comment_count + 1 })));
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
      <ScreenBackground />
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
              <PostCard post={post} {...handlers} />
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
            <Pressable onPress={() => navigation.push('FriendProfile', { handle: item.handle })} hitSlop={4}>
              <Avatar handle={item.handle} color={item.avatar_color} size={34} />
            </Pressable>
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
  postCard: {
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
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
