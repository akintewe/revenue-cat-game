import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, coverColors, discoverColors, radii, spacing, typography } from '../../../shared/theme/theme';
import { EmptyState } from '../../../shared/components/EmptyState';
import { ScreenBackground } from '../../../shared/components/ScreenBackground';
import { followUser, searchUsers, unfollowUser, type ProfileSummary } from '../../../services/social/profiles';
import { useAuthStore } from '../../auth/store/useAuthStore';
import type { RootScreenProps } from '../../../core/navigation/types';

const SEARCH_DEBOUNCE_MS = 300;

type Props = RootScreenProps<'FriendSearch'>;

export function FriendSearchScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const userId = useAuthStore((state) => state.session?.user.id);
  const inputRef = useRef<TextInput>(null);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ProfileSummary[]>([]);
  const [searching, setSearching] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    let cancelled = false;
    const timer = setTimeout(() => {
      searchUsers(trimmed)
        .then((rows) => {
          if (!cancelled) setResults(rows);
        })
        .catch(() => {
          if (!cancelled) setResults([]);
        })
        .finally(() => {
          if (!cancelled) setSearching(false);
        });
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  const toggleFollow = useCallback(
    async (row: ProfileSummary) => {
      if (!userId || busyId) return;
      setBusyId(row.user_id);
      const wasFollowing = row.followed_by_me;
      setResults((prev) => prev.map((r) => (r.user_id === row.user_id ? { ...r, followed_by_me: !wasFollowing } : r)));
      try {
        if (wasFollowing) {
          await unfollowUser(userId, row.user_id);
        } else {
          await followUser(userId, row.user_id);
        }
      } catch {
        setResults((prev) => prev.map((r) => (r.user_id === row.user_id ? { ...r, followed_by_me: wasFollowing } : r)));
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
        <View style={styles.searchBar}>
          <Ionicons name="search" size={16} color={discoverColors.mutedText} />
          <TextInput
            ref={inputRef}
            value={query}
            onChangeText={setQuery}
            placeholder="Search by handle or name"
            placeholderTextColor={discoverColors.mutedText}
            style={styles.searchInput}
            autoCapitalize="none"
            autoCorrect={false}
            autoFocus
          />
          {searching && <ActivityIndicator size="small" color={colors.accent} />}
        </View>
      </View>

      <FlatList
        data={results}
        keyExtractor={(row) => row.user_id}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          query.trim().length < 2 ? (
            <EmptyState title="Find people" description="Search by their exact handle or display name." />
          ) : !searching ? (
            <EmptyState title="No one found" description={`No account matches "${query.trim()}".`} />
          ) : null
        }
        renderItem={({ item }) => (
          <Pressable
            style={styles.row}
            onPress={() => navigation.navigate('FriendProfile', { handle: item.handle })}
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
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: discoverColors.rowBg,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    fontSize: 15,
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
