import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radii, spacing, typography } from '../../../shared/theme/theme';
import { EmptyState } from '../../../shared/components/EmptyState';
import { Avatar } from '../../../shared/components/Avatar';
import { PostCard } from '../../feed/components/PostCard';
import { usePostHandlers } from '../../feed/hooks/usePostHandlers';
import { feedLayout } from '../../feed/theme';
import { ScreenBackground } from '../../../shared/components/ScreenBackground';
import { fetchProfileStats, followUser, unfollowUser, type ProfileStats } from '../../../services/social/profiles';
import { blockUser, reportContent } from '../../../services/social/moderation';
import { fetchFeed, type FeedPost } from '../../../services/social/feed';
import { useAuthStore } from '../../auth/store/useAuthStore';
import type { RootScreenProps } from '../../../core/navigation/types';

const REPORT_REASONS = ['Spam', 'Harassment', 'Inappropriate content', 'Impersonation', 'Other'];

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
  const postHandlers = usePostHandlers({ setPosts });

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

  function handleReport() {
    if (!stats || !userId) return;
    const reasonButtons: NonNullable<Parameters<typeof Alert.alert>[2]> = [
      ...REPORT_REASONS.map((reason) => ({
        text: reason,
        onPress: () => {
          reportContent(userId, 'profile', stats.user_id, reason).catch(() => undefined);
          Alert.alert('Reported', "Thanks — we've received your report.");
        },
      })),
      { text: 'Cancel', style: 'cancel' as const },
    ];
    Alert.alert('Report this account', 'What best describes the issue?', reasonButtons);
  }

  function handleMoreOptions() {
    if (!stats || !userId) return;
    Alert.alert(`@${stats.handle}`, undefined, [
      {
        text: 'Block this account',
        style: 'destructive',
        onPress: () => {
          Alert.alert('Block this account?', 'You will no longer see each other on Prysm.', [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Block',
              style: 'destructive',
              onPress: async () => {
                try {
                  await blockUser(userId, stats.user_id);
                  navigation.goBack();
                } catch (err) {
                  Alert.alert('Could not block', err instanceof Error ? err.message : 'Please try again.');
                }
              },
            },
          ]);
        },
      },
      { text: 'Report', onPress: handleReport },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  if (loading) {
    return (
      <View style={[styles.root, styles.centered]}>
        <ScreenBackground />
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (notFound || !stats) {
    return (
      <View style={[styles.root, { paddingTop: insets.top + spacing.lg }]}>
        <ScreenBackground />
        <Pressable onPress={() => navigation.goBack()} hitSlop={12} style={styles.backButton}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </Pressable>
        <EmptyState title="Couldn't find this profile" description="This account may no longer exist." />
      </View>
    );
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <ScreenBackground />
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </Pressable>
        {!stats.is_me && (
          <Pressable onPress={handleMoreOptions} hitSlop={12}>
            <Ionicons name="ellipsis-horizontal" size={22} color={colors.text} />
          </Pressable>
        )}
      </View>

      <FlatList
        data={posts}
        keyExtractor={(post) => post.id}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={styles.profileHeader}>
            <Avatar handle={stats.handle} color={stats.avatar_color} size={72} style={styles.avatar} />
            <Text style={styles.displayName}>{stats.display_name}</Text>
            <Text style={styles.handle}>@{stats.handle}</Text>
            {stats.bio ? <Text style={styles.bio}>{stats.bio}</Text> : null}

            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{stats.post_count}</Text>
                <Text style={styles.statLabel}>Posts</Text>
              </View>
              <Pressable
                style={styles.statItem}
                onPress={() => navigation.push('FollowList', { handle: stats.handle, mode: 'followers' })}
              >
                <Text style={styles.statNumber}>{stats.followers}</Text>
                <Text style={styles.statLabel}>Followers</Text>
              </Pressable>
              <Pressable
                style={styles.statItem}
                onPress={() => navigation.push('FollowList', { handle: stats.handle, mode: 'following' })}
              >
                <Text style={styles.statNumber}>{stats.following}</Text>
                <Text style={styles.statLabel}>Following</Text>
              </Pressable>
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
        renderItem={({ item }) => <PostCard post={item} {...postHandlers} />}
        ItemSeparatorComponent={PostGap}
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

function PostGap() {
  return <View style={{ height: feedLayout.postGap }} />;
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  backButton: {
    marginBottom: spacing.lg,
  },
  listContent: {
    paddingHorizontal: feedLayout.gutter,
    paddingBottom: spacing.xl,
  },
  profileHeader: {
    alignItems: 'center',
    paddingBottom: spacing.lg,
  },
  avatar: {
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
