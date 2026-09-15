import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, coverColors, radii, spacing, typography } from '../../../shared/theme/theme';
import { EmptyState } from '../../../shared/components/EmptyState';
import { ScreenBackground } from '../../../shared/components/ScreenBackground';
import { fetchFollowers, fetchFollowing, followUser, unfollowUser, type FollowListRow } from '../../../services/social/profiles';
import { useAuthStore } from '../../auth/store/useAuthStore';
import type { RootScreenProps } from '../../../core/navigation/types';

type Props = RootScreenProps<'FollowList'>;

export function FollowListScreen({ route, navigation }: Props) {
  const { handle, mode } = route.params;
  const insets = useSafeAreaInsets();
  const userId = useAuthStore((state) => state.session?.user.id);

  const [rows, setRows] = useState<FollowListRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    const fetcher = mode === 'followers' ? fetchFollowers : fetchFollowing;
    fetcher({ handle })
      .then(setRows)
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [handle, mode]);

  const toggleFollow = useCallback(
    async (row: FollowListRow) => {
      if (!userId || busyId) return;
      setBusyId(row.user_id);
      const wasFollowing = row.followed_by_me;
      setRows((prev) => prev.map((r) => (r.user_id === row.user_id ? { ...r, followed_by_me: !wasFollowing } : r)));
      try {
        if (wasFollowing) {
          await unfollowUser(userId, row.user_id);
        } else {
          await followUser(userId, row.user_id);
        }
      } catch {
        setRows((prev) => prev.map((r) => (r.user_id === row.user_id ? { ...r, followed_by_me: wasFollowing } : r)));
      } finally {
        setBusyId(null);
      }
    },
    [userId, busyId],
  );

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <ScreenBackground />
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </Pressable>
        <Text style={styles.title}>{mode === 'followers' ? 'Followers' : 'Following'}</Text>
        <View style={styles.headerSpacer} />
      </View>

      {loading ? (
        <ActivityIndicator color={colors.accent} style={styles.loading} />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(row) => row.user_id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <EmptyState
              title={mode === 'followers' ? 'No followers yet' : 'Not following anyone yet'}
              description={mode === 'followers' ? 'When people follow @' + handle + ', they show up here.' : 'Search for people to follow.'}
            />
          }
          renderItem={({ item }) => (
            <Pressable
              style={styles.row}
              onPress={() => navigation.push('FriendProfile', { handle: item.handle })}
            >
              <View style={[styles.avatar, { backgroundColor: coverColors[item.avatar_color] ?? coverColors.slate }]} />
              <View style={styles.rowBody}>
                <Text style={styles.rowName} numberOfLines={1}>
                  {item.display_name}
                </Text>
                <Text style={styles.rowHandle} numberOfLines={1}>
                  @{item.handle}
                </Text>
              </View>
              {!item.is_me && (
                <Pressable
                  style={[styles.followButton, item.followed_by_me && styles.followButtonActive]}
                  onPress={() => toggleFollow(item)}
                  disabled={busyId === item.user_id}
                >
                  <Text style={[styles.followButtonText, item.followed_by_me && styles.followButtonTextActive]}>
                    {item.followed_by_me ? 'Following' : 'Follow'}
                  </Text>
                </Pressable>
              )}
            </Pressable>
          )}
        />
      )}
    </View>
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
  title: {
    ...typography.subheading,
    fontSize: 17,
  },
  headerSpacer: {
    width: 22,
  },
  loading: {
    marginTop: spacing.xl,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm + 2,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  rowBody: {
    flex: 1,
    gap: 2,
  },
  rowName: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  rowHandle: {
    color: colors.textMuted,
    fontSize: 13,
  },
  followButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radii.pill,
    backgroundColor: colors.accent,
  },
  followButtonActive: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.border,
  },
  followButtonText: {
    color: colors.onAccent,
    fontWeight: '700',
    fontSize: 13,
  },
  followButtonTextActive: {
    color: colors.text,
  },
});
