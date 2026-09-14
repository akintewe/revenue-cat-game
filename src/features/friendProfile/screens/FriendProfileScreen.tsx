import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, coverColors, discoverColors, radii, spacing, typography } from '../../../shared/theme/theme';
import { EmptyState } from '../../../shared/components/EmptyState';
import { fetchProfileStats, followUser, unfollowUser, type ProfileStats } from '../../../services/social/profiles';
import { fetchFeed, type FeedPost } from '../../../services/social/feed';
import { useAuthStore } from '../../auth/store/useAuthStore';
import { timeAgo } from '../../../shared/utils/formatDate';
import type { RootScreenProps } from '../../../core/navigation/types';

type Props = RootScreenProps<'FriendProfile'>;

export function FriendProfileScreen({ route, navigation }: Props) {
  const { handle } = route.params;
  const insets = useSafeAreaInsets();
  const userId = useAuthStore((state) => state.session?.user.id);

  const [stats, setStats] = useState<ProfileStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [postsLoading, setPostsLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    setNotFound(false);
    fetchProfileStats(handle)
      .then((result) => {
        if (!result) {
          setNotFound(true);
          return;
        }
        setStats(result);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));

    setPostsLoading(true);
    fetchFeed({ handle })
      .then(setPosts)
      .catch(() => setPosts([]))
      .finally(() => setPostsLoading(false));
  }, [handle]);

  useFocusEffect(load);

  async function handleToggleFollow() {
    if (!stats || !userId || followBusy) return;
    const wasFollowing = stats.followed_by_me;
    setFollowBusy(true);
    setStats({
      ...stats,
      followed_by_me: !wasFollowing,
      followers: stats.followers + (wasFollowing ? -1 : 1),
    });
    try {
      if (wasFollowing) {
        await unfollowUser(userId, stats.user_id);
      } else {
        await followUser(userId, stats.user_id);
      }
    } catch {
      setStats(stats);
    } finally {
      setFollowBusy(false);
    }
  }

  if (loading) {
    return (
      <View style={[styles.root, styles.centered]}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (notFound || !stats) {
    return (
      <View style={[styles.root, { paddingTop: insets.top + spacing.lg }]}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12} style={styles.backButton}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </Pressable>
        <EmptyState title="Couldn't find this profile" description="This account may no longer exist." />
      </View>
    );
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </Pressable>
      </View>

      <FlatList
        data={posts}
        keyExtractor={(post) => post.id}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={styles.profileHeader}>
            <View style={[styles.avatar, { backgroundColor: coverColors[stats.avatar_color] ?? coverColors.slate }]} />
            <Text style={styles.displayName}>{stats.display_name}</Text>
            <Text style={styles.handle}>@{stats.handle}</Text>
            {stats.bio ? <Text style={styles.bio}>{stats.bio}</Text> : null}

            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{stats.post_count}</Text>
                <Text style={styles.statLabel}>Posts</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{stats.followers}</Text>
                <Text style={styles.statLabel}>Followers</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{stats.following}</Text>
                <Text style={styles.statLabel}>Following</Text>
              </View>
            </View>

            {!stats.is_me && (
              <Pressable
                style={[styles.followButton, stats.followed_by_me && styles.followButtonActive]}
                onPress={handleToggleFollow}
                disabled={followBusy}
              >
                <Text style={[styles.followButtonText, stats.followed_by_me && styles.followButtonTextActive]}>
                  {stats.followed_by_me ? 'Following' : 'Follow'}
                </Text>
              </Pressable>
            )}

            <Text style={styles.sectionLabel}>Posts</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.postCard}>
            <Text style={styles.postTime}>{timeAgo(item.created_at)}</Text>
            <Text style={styles.postBody}>{item.body}</Text>
          </View>
        )}
        ListEmptyComponent={
          postsLoading ? (
            <ActivityIndicator color={colors.accent} style={styles.postsLoading} />
          ) : (
            <Text style={styles.noPosts}>No posts yet.</Text>
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  backButton: {
    marginBottom: spacing.lg,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  profileHeader: {
    alignItems: 'center',
    paddingBottom: spacing.lg,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    marginBottom: spacing.md,
  },
  displayName: {
    ...typography.heading,
    fontSize: 20,
  },
  handle: {
    color: colors.textMuted,
    fontSize: 14,
    marginTop: 2,
  },
  bio: {
    color: colors.textMuted,
    fontSize: 14,
    textAlign: 'center',
    marginTop: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.xl,
    marginTop: spacing.lg,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '700',
  },
  statLabel: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  followButton: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm + 2,
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
    fontSize: 14,
  },
  followButtonTextActive: {
    color: colors.text,
  },
  sectionLabel: {
    alignSelf: 'flex-start',
    color: colors.textFaint,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginTop: spacing.xl,
  },
  postCard: {
    backgroundColor: discoverColors.cardBg,
    borderRadius: radii.md,
    padding: spacing.md,
    marginTop: spacing.md,
    gap: spacing.xs,
  },
  postTime: {
    color: colors.textFaint,
    fontSize: 12,
  },
  postBody: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
  },
  postsLoading: {
    marginTop: spacing.xl,
  },
  noPosts: {
    color: colors.textMuted,
    fontSize: 14,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
});
