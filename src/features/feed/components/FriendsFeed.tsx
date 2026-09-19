import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Shimmer } from '../../../shared/components/Shimmer';
import { AVATAR_ATTRIBUTION } from '../../../shared/components/Avatar';
import { fetchFeed, type FeedPost } from '../../../services/social/feed';
import type { RootStackParamList } from '../../../core/navigation/types';
import { usePostHandlers } from '../hooks/usePostHandlers';
import { useFeedStore } from '../store/useFeedStore';
import { PostCard } from './PostCard';
import { feedColors, feedLayout } from '../theme';

const PAGE = 20;
/** The floating tab bar is 54pt and sits over the list. */
const TAB_BAR = 54;
/** Figma: the toggle ends at 138, the first post starts at 171. The toggle keeps a 24pt margin. */
const FIRST_POST_OFFSET = 171 - 138 - 24;

/**
 * The Friends side of home: the caller's own posts, people they follow, their reposts,
 * friends of friends, and popular posts (shelf_feed decides). Newest first, 20 at a time.
 */
export function FriendsFeed() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const version = useFeedStore((state) => state.version);

  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const request = useRef(0);
  const list = useRef<FlatList<FeedPost>>(null);

  const handlers = usePostHandlers({ setPosts });

  // The first page. `request` drops answers that a newer load has already replaced.
  const loadFirstPage = useCallback(() => {
    const id = ++request.current;
    return fetchFeed({ limit: PAGE })
      .then((page) => {
        if (id !== request.current) return;
        setPosts(page);
        setHasMore(page.length === PAGE);
        setStatus('ready');
      })
      .catch((err) => {
        if (id !== request.current) return;
        console.warn('[feed] load failed', err);
        setStatus((s) => (s === 'ready' ? s : 'error'));
      });
  }, []);

  // Reload after the caller posts, and jump to the top where the new post lands.
  useEffect(() => {
    loadFirstPage();
    if (version > 0) list.current?.scrollToOffset({ offset: 0, animated: false });
  }, [loadFirstPage, version]);

  function refresh() {
    setRefreshing(true);
    loadFirstPage().finally(() => setRefreshing(false));
  }

  async function loadMore() {
    if (loadingMore || !hasMore || status !== 'ready' || posts.length === 0) return;
    const last = posts[posts.length - 1];
    const id = request.current;
    setLoadingMore(true);
    try {
      const page = await fetchFeed({ limit: PAGE, before: last.created_at, beforeId: last.id });
      if (id !== request.current) return;
      setPosts((prev) => {
        const seen = new Set(prev.map((p) => p.id));
        return [...prev, ...page.filter((p) => !seen.has(p.id))];
      });
      setHasMore(page.length === PAGE);
    } catch (err) {
      console.warn('[feed] next page failed', err);
    } finally {
      setLoadingMore(false);
    }
  }

  return (
    <FlatList
      ref={list}
      data={posts}
      keyExtractor={(post) => post.id}
      renderItem={({ item }) => <PostCard post={item} {...handlers} />}
      ItemSeparatorComponent={Separator}
      contentContainerStyle={[
        styles.content,
        { paddingBottom: insets.bottom + TAB_BAR + 48 },
        posts.length === 0 && styles.contentEmpty,
      ]}
      showsVerticalScrollIndicator={false}
      onEndReached={loadMore}
      onEndReachedThreshold={0.6}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={feedColors.muted} />
      }
      ListEmptyComponent={
        status === 'loading' ? (
          <FeedSkeleton />
        ) : (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>{status === 'error' ? 'Could not load the feed' : 'No posts yet'}</Text>
            <Text style={styles.emptyBody}>
              {status === 'error'
                ? 'Pull down to try again.'
                : 'Follow friends or share what you are playing to get the feed going.'}
            </Text>
            {status !== 'error' && (
              <Pressable style={styles.emptyButton} onPress={() => navigation.navigate('FriendSearch')}>
                <Text style={styles.emptyButtonText}>Find people</Text>
              </Pressable>
            )}
          </View>
        )
      }
      ListFooterComponent={
        posts.length > 0 ? (
          loadingMore ? (
            <ActivityIndicator style={styles.footerSpinner} color={feedColors.muted} />
          ) : !hasMore ? (
            <Text style={styles.attribution}>{AVATAR_ATTRIBUTION}</Text>
          ) : null
        ) : null
      }
    />
  );
}

function Separator() {
  return <View style={{ height: feedLayout.postGap }} />;
}

function FeedSkeleton() {
  return (
    <View style={{ gap: feedLayout.postGap }}>
      {[0, 1, 2].map((key) => (
        <View key={key} style={styles.skeletonPost}>
          <Shimmer style={styles.skeletonAvatar} />
          <View style={styles.skeletonColumn}>
            <Shimmer style={styles.skeletonName} />
            <Shimmer style={styles.skeletonLine} />
            <Shimmer style={styles.skeletonCard} />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: feedLayout.gutter,
    paddingTop: FIRST_POST_OFFSET,
  },
  contentEmpty: {
    flexGrow: 1,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 8,
  },
  emptyTitle: {
    color: feedColors.name,
    fontSize: 17,
    fontWeight: '700',
  },
  emptyBody: {
    color: feedColors.muted,
    fontSize: 14,
    textAlign: 'center',
  },
  emptyButton: {
    marginTop: 8,
    paddingHorizontal: 18,
    height: 36,
    borderRadius: 100,
    justifyContent: 'center',
    backgroundColor: feedColors.accent,
  },
  emptyButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  footerSpinner: {
    marginTop: feedLayout.postGap,
  },
  attribution: {
    marginTop: 32,
    textAlign: 'center',
    fontSize: 11,
    color: feedColors.muted,
  },
  skeletonPost: {
    flexDirection: 'row',
    gap: feedLayout.avatarGap,
  },
  skeletonAvatar: {
    width: feedLayout.avatar,
    height: feedLayout.avatar,
    borderRadius: feedLayout.avatar / 2,
  },
  skeletonColumn: {
    flex: 1,
    gap: 12,
    paddingVertical: 4,
  },
  skeletonName: {
    height: 14,
    width: '55%',
    borderRadius: 4,
  },
  skeletonLine: {
    height: 12,
    width: '90%',
    borderRadius: 4,
  },
  skeletonCard: {
    width: '100%',
    aspectRatio: feedLayout.gameCardAspect,
    borderRadius: feedLayout.cardRadius,
  },
});
