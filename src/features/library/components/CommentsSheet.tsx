import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, coverColors, discoverColors, radii, spacing } from '../../../shared/theme/theme';
import { timeAgo } from '../../../shared/utils/formatDate';
import { addComment, fetchComments, type PostComment } from '../../../services/social/feed';

type Props = {
  visible: boolean;
  postId: string | null;
  userId: string | null;
  onClose: () => void;
  /** Fired once a comment is successfully added, so the caller can bump the post's local comment_count. */
  onCommentAdded: (postId: string) => void;
};

export function CommentsSheet({ visible, postId, userId, onClose, onCommentAdded }: Props) {
  const insets = useSafeAreaInsets();
  const [comments, setComments] = useState<PostComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!visible || !postId) return;
    let cancelled = false;
    setLoading(true);
    fetchComments(postId)
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
  }, [visible, postId]);

  async function handleSend() {
    const body = draft.trim();
    if (!body || !postId || !userId || sending) return;
    setSending(true);
    try {
      await addComment(postId, userId, body);
      setDraft('');
      onCommentAdded(postId);
      const refreshed = await fetchComments(postId);
      setComments(refreshed);
    } catch (err) {
      console.warn('[comments] addComment failed', err);
    } finally {
      setSending(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.root}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.sheetWrap}
        >
          <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.sm }]}>
            <View style={styles.handleBar} />
            <View style={styles.header}>
              <Text style={styles.title}>Comments</Text>
              <Pressable onPress={onClose} hitSlop={12}>
                <Ionicons name="close" size={20} color={colors.text} />
              </Pressable>
            </View>

            {loading ? (
              <ActivityIndicator color={colors.accent} style={styles.loading} />
            ) : (
              <FlatList
                data={comments}
                keyExtractor={(item) => item.id}
                style={styles.list}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={<Text style={styles.empty}>No comments yet — be the first.</Text>}
                renderItem={({ item }) => (
                  <View style={styles.commentRow}>
                    <View style={[styles.avatar, { backgroundColor: coverColors[item.avatar_color] ?? coverColors.slate }]} />
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
            )}

            <View style={styles.inputRow}>
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
                {sending ? (
                  <ActivityIndicator color={colors.onAccent} size="small" />
                ) : (
                  <Ionicons name="arrow-up" size={18} color={colors.onAccent} />
                )}
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  sheetWrap: {
    maxHeight: '75%',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  handleBar: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.16)',
    marginBottom: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: spacing.md,
  },
  title: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  loading: {
    paddingVertical: spacing.xl,
  },
  list: {
    maxHeight: 340,
  },
  listContent: {
    gap: spacing.md,
    paddingBottom: spacing.md,
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
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
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
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
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
