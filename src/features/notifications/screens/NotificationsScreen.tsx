import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, coverColors, radii, spacing, typography } from '../../../shared/theme/theme';
import { Avatar } from '../../../shared/components/Avatar';
import { EmptyState } from '../../../shared/components/EmptyState';
import { ScreenBackground } from '../../../shared/components/ScreenBackground';
import { timeAgo } from '../../../shared/utils/formatDate';
import { fetchNotifications, markNotificationsRead, type ShelfNotification } from '../../../services/social/notifications';
import { findPostById } from '../../../services/social/feed';
import { fetchMyProfile } from '../../../services/social/profiles';
import { useAuthStore } from '../../auth/store/useAuthStore';
import type { RootScreenProps } from '../../../core/navigation/types';

type Props = RootScreenProps<'Notifications'>;

function describe(item: ShelfNotification): string {
  switch (item.kind) {
    case 'follow':
      return 'started following you';
    case 'post_like':
      return `liked your post${item.post_excerpt ? `: "${item.post_excerpt}"` : ''}`;
    case 'post_comment':
      return `commented${item.comment_excerpt ? `: "${item.comment_excerpt}"` : ''}`;
    case 'game_release':
      return 'is out today';
    default:
      return '';
  }
}

function iconFor(kind: ShelfNotification['kind']): keyof typeof Ionicons.glyphMap {
  switch (kind) {
    case 'follow':
      return 'person-add';
    case 'post_like':
      return 'heart';
    case 'post_comment':
      return 'chatbubble';
    case 'game_release':
      return 'game-controller';
  }
}

export function NotificationsScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const userId = useAuthStore((state) => state.session?.user.id);
  const [items, setItems] = useState<ShelfNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [myHandle, setMyHandle] = useState<string | null>(null);
  const [openingId, setOpeningId] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      fetchNotifications({ limit: 30 })
        .then((rows) => {
          if (!cancelled) setItems(rows);
        })
        .catch(() => undefined)
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
      return () => {
        cancelled = true;
      };
    }, []),
  );

  // Opening the inbox is what "read" means here — mark everything the moment it's viewed.
  useEffect(() => {
    markNotificationsRead().catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!userId) return;
    fetchMyProfile(userId)
      .then((profile) => setMyHandle(profile?.handle ?? null))
      .catch(() => undefined);
  }, [userId]);

  async function handlePressItem(item: ShelfNotification) {
    if (openingId) return;
    if (item.kind === 'game_release') {
      if (item.game_id) navigation.navigate('GameDetail', { catalogId: item.game_id });
      return;
    }
    const isPostNotification = item.kind === 'post_like' || item.kind === 'post_comment';
    if (isPostNotification && item.post_id && myHandle) {
      setOpeningId(item.id);
      const post = await findPostById(myHandle, item.post_id).catch(() => null);
      setOpeningId(null);
      if (post) {
        navigation.navigate('PostDetail', { post });
        return;
      }
    }
    // Follows, and a post that couldn't be found (e.g. since deleted), fall back to the profile.
    navigation.navigate('FriendProfile', { handle: item.handle });
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <ScreenBackground />
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </Pressable>
        <Text style={styles.title}>Notifications</Text>
        <View style={styles.headerSpacer} />
      </View>

      {loading ? (
        <ActivityIndicator color={colors.accent} style={styles.loading} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <EmptyState title="No notifications yet" description="Follows, likes and comments will show up here." />
          }
          renderItem={({ item }) => (
            <Pressable
              style={[styles.row, !item.read_at && styles.rowUnread]}
              onPress={() => handlePressItem(item)}
              disabled={openingId === item.id}
            >
              <View style={[styles.avatar, { backgroundColor: coverColors[item.avatar_color] ?? coverColors.slate }]}>
                {item.kind === 'game_release' && item.game_cover ? (
                  <Image source={{ uri: item.game_cover }} style={styles.avatarCover} contentFit="cover" />
                ) : item.handle ? (
                  <Avatar handle={item.handle} color={item.avatar_color} size={40} />
                ) : null}
                <View style={styles.avatarBadge}>
                  <Ionicons name={iconFor(item.kind)} size={11} color={colors.onAccent} />
                </View>
              </View>
              <View style={styles.rowBody}>
                <Text style={styles.rowText}>
                  <Text style={styles.rowName}>{item.kind === 'game_release' ? item.game_title ?? 'A game' : item.display_name}</Text>{' '}
                  {describe(item)}
                </Text>
                <Text style={styles.rowTime}>{timeAgo(item.created_at)}</Text>
              </View>
              {openingId === item.id ? (
                <ActivityIndicator size="small" color={colors.textMuted} />
              ) : (
                !item.read_at && <View style={styles.unreadDot} />
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
    gap: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.md,
  },
  rowUnread: {
    backgroundColor: colors.accentMuted,
  },
  avatarCover: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 20,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.background,
  },
  rowBody: {
    flex: 1,
    gap: 2,
  },
  rowText: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 19,
  },
  rowName: {
    color: colors.text,
    fontWeight: '700',
  },
  rowTime: {
    color: colors.textFaint,
    fontSize: 12,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accent,
  },
});
