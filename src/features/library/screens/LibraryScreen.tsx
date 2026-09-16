import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Animated,
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { Ionicons } from '@expo/vector-icons';
import { Image, type ImageSource } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { GameCover } from '../../../shared/components/GameCover';
import { GameRow } from '../../../shared/components/GameRow';
import { StatusPill } from '../../../shared/components/StatusPill';
import { PreorderPill } from '../../../shared/components/PreorderPill';
import { SegmentedTabs } from '../../../shared/components/SegmentedTabs';
import { PlatformIcon } from '../../../shared/components/PlatformIcon';
import { Shimmer } from '../../../shared/components/Shimmer';
import { colors, coverColors, discoverColors, radii, spacing } from '../../../shared/theme/theme';
import { TopBar } from '../../../shared/components/TopBar';
import { useLibraryStore } from '../store/useLibraryStore';
import { useWishlistStore } from '../../wishlist/store/useWishlistStore';
import { useSideMenuStore } from '../../menu/store/useSideMenuStore';
import { CATALOG, type CatalogGame } from '../../../data/catalog';
import { useResolvedGames } from '../../../shared/hooks/useResolvedGames';
import { fetchPopularSuggestions, searchAllCatalog } from '../../../services/catalog/unifiedCatalog';
import { GAME_STATUSES, STATUS_LABEL, type GameStatus } from '../types';
import { STATUS_ICON } from '../../../shared/types/status';
import { formatReleaseLabel, timeAgo } from '../../../shared/utils/formatDate';
import {
  createPost,
  deletePost,
  fetchFeed,
  likePost,
  postImageUrl,
  unlikePost,
  uploadPostImage,
  type FeedPost,
} from '../../../services/social/feed';
import { useAuthStore } from '../../auth/store/useAuthStore';
import { fetchMyAvatarColor, fetchMyDisplayName } from '../../../services/social/profiles';
import { fetchUnreadNotificationCount } from '../../../services/social/notifications';
import { blockUser, reportContent } from '../../../services/social/moderation';
import type { CoverColorKey } from '../../../data/catalog';
import type { TabScreenProps } from '../../../core/navigation/types';

const GRID_SEARCH_DEBOUNCE_MS = 350;
const GRID_POPULAR_LIMIT = 15;

const REPORT_REASONS = ['Spam', 'Harassment', 'Inappropriate content', 'Impersonation', 'Other'];
const ADD_CIRCLE_ICON = require('../../../../assets/figma-icons/add-circle.png') as ImageSource;
const CHEVRON_ICON = require('../../../../assets/figma-icons/chevron-forward.png') as ImageSource;

const TAB_ALL_IMAGE = {
  active: require('../../../../assets/figma-icons/tab-all-active.png') as ImageSource,
  inactive: require('../../../../assets/figma-icons/tab-all-inactive.png') as ImageSource,
};
const TAB_PLAYING_IMAGE = {
  active: require('../../../../assets/figma-icons/tab-playing-active.png') as ImageSource,
  inactive: require('../../../../assets/figma-icons/tab-playing-inactive.png') as ImageSource,
};
const TAB_COMPLETED_IMAGE = {
  active: require('../../../../assets/figma-icons/tab-completed-active.png') as ImageSource,
  inactive: require('../../../../assets/figma-icons/tab-completed-inactive.png') as ImageSource,
};
const STATUS_TAB_IMAGE: Partial<Record<GameStatus, { active: ImageSource; inactive: ImageSource }>> = {
  playing: TAB_PLAYING_IMAGE,
  beaten: TAB_COMPLETED_IMAGE,
};

type LibraryFilter = 'all' | GameStatus | 'saved';
const LIBRARY_RECENT_LIMIT = 5;

/** Bottom scroll inset so content clears the floating tab bar + FAB. */
const NAV_CLEARANCE = 40;
const EXPLORE_POPULAR_LIMIT = 3;
const EXPLORE_SAVED_LIMIT = 6;
const TOP_PLAYED_LIMIT = 10;

/** Figma 64 ÷ 1.1 — the mock frame is 1.1× device points. */
const POPULAR_COVER_SIZE = 58;
/** Side gutter of the home dashboard (header, Games content, Friends feed). */
const HOME_PADDING_X = 13;

type DashboardTab = 'games' | 'friends';

const DASHBOARD_TABS: { key: DashboardTab; label: string }[] = [
  { key: 'games', label: 'Games' },
  { key: 'friends', label: 'Friends' },
];

const glassAvailable = Platform.OS === 'ios' && isLiquidGlassAvailable();
const TOGGLE_HEIGHT = 34;
const TOGGLE_SEGMENT_WIDTH = 92;
const TOGGLE_TRACK_PADDING = 3;
const TOGGLE_TRACK_HEIGHT = TOGGLE_HEIGHT + TOGGLE_TRACK_PADDING * 2;

/**
 * The Games / Friends switch. The selected pill springs between equal-width segments and the
 * label colours crossfade with it, all on the native driver. On iOS 26 the track is one
 * interactive Liquid Glass capsule, like the system segmented control. Older iOS and Android
 * keep the blur fallback.
 */
function DashboardToggle({ value, onChange }: { value: DashboardTab; onChange: (tab: DashboardTab) => void }) {
  const selectedIndex = Math.max(
    0,
    DASHBOARD_TABS.findIndex((tab) => tab.key === value),
  );
  const [position] = useState(() => new Animated.Value(selectedIndex));

  useEffect(() => {
    Animated.spring(position, {
      toValue: selectedIndex,
      useNativeDriver: true,
      stiffness: 320,
      damping: 28,
      mass: 1,
    }).start();
  }, [position, selectedIndex]);

  const content = (
    <>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.toggleIndicator,
          { transform: [{ translateX: Animated.multiply(position, TOGGLE_SEGMENT_WIDTH) }] },
        ]}
      >
        {glassAvailable ? (
          <View style={[StyleSheet.absoluteFill, styles.toggleIndicatorGlassFill]} />
        ) : (
          <>
            <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
            <View style={[StyleSheet.absoluteFill, styles.togglePillTint]} />
          </>
        )}
      </Animated.View>
      {DASHBOARD_TABS.map(({ key, label }, index) => {
        const activeOpacity = position.interpolate({
          inputRange: [index - 1, index, index + 1],
          outputRange: [0, 1, 0],
          extrapolate: 'clamp',
        });
        return (
          <Pressable key={key} onPress={() => onChange(key)} style={styles.toggleSegment}>
            <Text style={styles.toggleLabel}>{label}</Text>
            <Animated.Text
              style={[styles.toggleLabel, styles.toggleLabelActive, styles.toggleLabelOverlay, { opacity: activeOpacity }]}
            >
              {label}
            </Animated.Text>
          </Pressable>
        );
      })}
    </>
  );

  if (glassAvailable) {
    return (
      <GlassView
        style={styles.toggleGlassTrack}
        glassEffectStyle="regular"
        colorScheme="dark"
        isInteractive
        tintColor={discoverColors.navBg}
      >
        {content}
      </GlassView>
    );
  }

  return (
    <View style={styles.toggleOuter}>
      <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
      <View style={[StyleSheet.absoluteFill, styles.toggleOuterTint]} />
      {content}
    </View>
  );
}


type Props = TabScreenProps<'LibraryTab'>;

export function LibraryScreen({ navigation, route }: Props) {
  const [tab, setTab] = useState<DashboardTab>('games');
  const showSideMenu = useSideMenuStore((state) => state.show);
  const requestedTab = route.params?.tab;

  // The side menu picks Games / Friends through the route param. Applying it during render
  // avoids a frame on the old tab; the effect only clears the param afterwards.
  // Tracking the param itself, not the tab, matters: the effect below clears the param, which
  // resets this to undefined. Without that reset, picking Friends, switching back with the
  // toggle, then picking Friends again would match the old value and do nothing.
  const [appliedTab, setAppliedTab] = useState<DashboardTab | undefined>(undefined);
  if (requestedTab !== appliedTab) {
    setAppliedTab(requestedTab);
    if (requestedTab) setTab(requestedTab);
  }

  useEffect(() => {
    if (!requestedTab) return;
    navigation.setParams({ tab: undefined });
  }, [navigation, requestedTab]);
  const userId = useAuthStore((state) => state.session?.user.id);
  const [myAvatarColor, setMyAvatarColor] = useState<CoverColorKey | null>(null);
  const [myDisplayName, setMyDisplayName] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      fetchUnreadNotificationCount()
        .then((count) => {
          if (!cancelled) setUnreadCount(count);
        })
        .catch(() => undefined);
      return () => {
        cancelled = true;
      };
    }, []),
  );

  useEffect(() => {
    if (route.params?.openBrowse) {
      openLibraryBrowser();
      navigation.setParams({ openBrowse: undefined });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route.params?.openBrowse]);

  useFocusEffect(
    useCallback(() => {
      if (!userId) return;
      fetchMyAvatarColor(userId)
        .then(setMyAvatarColor)
        .catch(() => undefined);
      fetchMyDisplayName(userId)
        .then(setMyDisplayName)
        .catch(() => undefined);
    }, [userId]),
  );

  // Tapping the already-active Library tab icon backs out of any in-place browsing
  // mode (popular grid, library browser) instead of doing nothing.
  useEffect(() => {
    const unsubscribe = navigation.addListener('tabPress', () => {
      if (!navigation.isFocused()) return;
      setBrowsingPopular(false);
      setLibraryBrowsing(false);
    });
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigation]);

  const [feedPosts, setFeedPosts] = useState<FeedPost[]>([]);
  const [feedLoading, setFeedLoading] = useState(false);
  const [feedError, setFeedError] = useState<string | null>(null);
  const [composerText, setComposerText] = useState('');
  const [composerImage, setComposerImage] = useState<{ uri: string; mimeType: string } | null>(null);
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    if (tab !== 'friends') return;
    let cancelled = false;
    setFeedLoading(true);
    setFeedError(null);
    fetchFeed()
      .then((posts) => {
        if (cancelled) return;
        setFeedPosts(posts);
        setFeedLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setFeedError(err instanceof Error ? err.message : 'Could not load the feed');
        setFeedLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tab]);

  function handleToggleLike(post: FeedPost) {
    if (!userId) return;
    const wasLiked = post.liked_by_me;
    setFeedPosts((prev) =>
      prev.map((p) =>
        p.id === post.id ? { ...p, liked_by_me: !wasLiked, like_count: p.like_count + (wasLiked ? -1 : 1) } : p,
      ),
    );
    const action = wasLiked ? unlikePost(userId, post.id) : likePost(userId, post.id);
    action.catch((err) => {
      console.warn('[feed] toggle like failed', err);
      setFeedPosts((prev) =>
        prev.map((p) =>
          p.id === post.id ? { ...p, liked_by_me: wasLiked, like_count: p.like_count + (wasLiked ? 1 : -1) } : p,
        ),
      );
    });
  }

  function handleDeletePost(post: FeedPost) {
    Alert.alert('Delete post?', 'This can\'t be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          const previous = feedPosts;
          setFeedPosts((prev) => prev.filter((p) => p.id !== post.id));
          deletePost(post.id).catch((err) => {
            console.warn('[feed] delete post failed', err);
            setFeedPosts(previous);
          });
        },
      },
    ]);
  }

  function handleReportPost(post: FeedPost) {
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
                  .then(() => setFeedPosts((prev) => prev.filter((p) => p.author_id !== post.author_id)))
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

  async function handlePickComposerImage() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsEditing: true,
      aspect: [4, 3],
    });
    if (result.canceled || result.assets.length === 0) return;
    const asset = result.assets[0];
    setComposerImage({ uri: asset.uri, mimeType: asset.mimeType ?? 'image/jpeg' });
  }

  async function handlePost() {
    // The body column requires 1-500 chars — an image needs a caption alongside it, not instead of one.
    if (!userId || !composerText.trim() || posting) return;
    setPosting(true);
    try {
      const imagePath = composerImage ? await uploadPostImage(userId, composerImage.uri, composerImage.mimeType) : undefined;
      await createPost(userId, composerText.trim(), { imagePath });
      setComposerText('');
      setComposerImage(null);
      const posts = await fetchFeed();
      setFeedPosts(posts);
    } catch (err) {
      setFeedError(err instanceof Error ? err.message : 'Could not post');
    } finally {
      setPosting(false);
    }
  }

  const entries = useLibraryStore((state) => state.entries);
  const addGame = useLibraryStore((state) => state.addGame);
  const wishlistEntries = useWishlistStore((state) => state.entries);

  const libraryIds = useMemo(() => new Set(entries.map((entry) => entry.catalogId)), [entries]);
  const wishlistIds = useMemo(() => wishlistEntries.map((entry) => entry.catalogId), [wishlistEntries]);

  const allEntryIds = useMemo(() => entries.map((entry) => entry.catalogId), [entries]);
  const { games: allLibraryGames, loading: allLibraryLoading } = useResolvedGames(allEntryIds);

  const libraryRows = useMemo(() => {
    const byId = new Map(allLibraryGames.map((game) => [game.id, game]));
    return entries
      .map((entry) => ({ entry, game: byId.get(entry.catalogId) }))
      .filter((row): row is { entry: (typeof entries)[number]; game: CatalogGame } => Boolean(row.game));
  }, [entries, allLibraryGames]);

  // Steam gives us total hours per game but no last-played date or per-device playtime,
  // so "most played" is the honest signal — not a fabricated "recently played".
  const topPlayed = useMemo(() => {
    return [...libraryRows]
      .sort((a, b) => (b.entry.hoursPlayed ?? 0) - (a.entry.hoursPlayed ?? 0))
      .slice(0, TOP_PLAYED_LIMIT)
      .map((row) => row.game);
  }, [libraryRows]);

  const [popularSuggestions, setPopularSuggestions] = useState<CatalogGame[]>([]);
  const [popularLoading, setPopularLoading] = useState(true);
  const libraryIdsKey = Array.from(libraryIds).join(',');

  useEffect(() => {
    let cancelled = false;
    setPopularLoading(true);
    fetchPopularSuggestions(libraryIds, EXPLORE_POPULAR_LIMIT).then(({ games }) => {
      if (cancelled) return;
      setPopularSuggestions(games);
      setPopularLoading(false);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [libraryIdsKey]);

  const popularToShow = popularSuggestions;

  const { games: savedGamesAll, loading: savedGamesLoading } = useResolvedGames(wishlistIds);
  const savedGames = savedGamesAll.slice(0, EXPLORE_SAVED_LIMIT);

  const stillLoading = allLibraryLoading || savedGamesLoading || popularLoading;
  const hasAnyContent =
    stillLoading || topPlayed.length > 0 || popularToShow.length > 0 || savedGames.length > 0;

  // "Top played" chevron opens the full library browser in place of the dashboard —
  // same screen, same tab bar, not a separate stack screen.
  const [libraryBrowsing, setLibraryBrowsing] = useState(false);
  const [libraryFilter, setLibraryFilter] = useState<LibraryFilter>('all');
  const [libraryShowAll, setLibraryShowAll] = useState(false);
  const [librarySortAZ, setLibrarySortAZ] = useState(false);
  const [libraryPromoDismissed, setLibraryPromoDismissed] = useState(false);

  const libraryFilteredRows = useMemo(() => {
    const filtered =
      libraryFilter === 'all' || libraryFilter === 'saved'
        ? libraryRows
        : libraryRows.filter((row) => row.entry.status === libraryFilter);
    return librarySortAZ ? [...filtered].sort((a, b) => a.game.title.localeCompare(b.game.title)) : filtered;
  }, [libraryRows, libraryFilter, librarySortAZ]);

  const libraryRecentRows = useMemo(() => {
    const sorted = [...libraryRows].sort((a, b) => b.entry.addedAt - a.entry.addedAt);
    return sorted.slice(0, LIBRARY_RECENT_LIMIT);
  }, [libraryRows]);

  function openLibraryBrowser(filter: LibraryFilter = 'all', showAll = false) {
    setLibraryFilter(filter);
    setLibraryShowAll(showAll);
    setLibraryBrowsing(true);
  }

  function handleLibraryFilterChange(filter: LibraryFilter) {
    setLibraryFilter(filter);
    setLibraryShowAll(true);
  }

  const libraryFilterOptions: {
    value: LibraryFilter;
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
    image?: { active: ImageSource; inactive: ImageSource };
  }[] = [
    { value: 'all', label: 'All', icon: 'grid', image: TAB_ALL_IMAGE },
    ...GAME_STATUSES.map((status) => ({
      value: status as LibraryFilter,
      label: STATUS_LABEL[status],
      icon: STATUS_ICON[status],
      image: STATUS_TAB_IMAGE[status],
    })),
    { value: 'saved' as LibraryFilter, label: 'Saved', icon: 'bookmark' as const },
  ];

  function renderLibraryRow(row: { entry: (typeof entries)[number]; game: CatalogGame }, isLast: boolean) {
    const isUpcoming = Boolean(row.game.releaseDate && new Date(row.game.releaseDate) > new Date());
    return (
      <GameRow
        key={row.entry.catalogId}
        title={row.game.title}
        platform={row.game.platform}
        detail={isUpcoming ? formatReleaseLabel(row.game.releaseDate) : row.game.year?.toString() ?? '—'}
        abbreviation={row.game.abbreviation}
        colorKey={row.game.colorKey}
        imageUrl={row.game.coverImageUrl}
        onPress={() => navigation.navigate('GameDetail', { catalogId: row.entry.catalogId })}
        style={[styles.libraryRow, isLast && styles.libraryRowLast]}
      >
        {isUpcoming ? <PreorderPill /> : <StatusPill status={row.entry.status} />}
      </GameRow>
    );
  }

  function renderSavedRow(game: CatalogGame, isLast: boolean) {
    const isUpcoming = Boolean(game.releaseDate && new Date(game.releaseDate) > new Date());
    return (
      <GameRow
        key={game.id}
        title={game.title}
        platform={game.platform}
        detail={isUpcoming ? formatReleaseLabel(game.releaseDate) : game.year?.toString() ?? '—'}
        abbreviation={game.abbreviation}
        colorKey={game.colorKey}
        imageUrl={game.coverImageUrl}
        onPress={() => navigation.navigate('GameDetail', { catalogId: game.id })}
        style={[styles.libraryRow, isLast && styles.libraryRowLast]}
      >
        {isUpcoming ? (
          <PreorderPill />
        ) : (
          <View style={styles.savedPill}>
            <Ionicons name="bookmark" size={15} color={discoverColors.mutedText} />
          </View>
        )}
      </GameRow>
    );
  }

  const librarySortedSaved = useMemo(
    () => (librarySortAZ ? [...savedGamesAll].sort((a, b) => a.title.localeCompare(b.title)) : savedGamesAll),
    [savedGamesAll, librarySortAZ],
  );

  // "See all" on Explore popular opens a grid browser in place of the dashboard —
  // same screen, same tab bar, not a separate stack screen.
  const [browsingPopular, setBrowsingPopular] = useState(false);
  const [gridQuery, setGridQuery] = useState('');
  const [gridResults, setGridResults] = useState<CatalogGame[]>([]);
  const [gridLoading, setGridLoading] = useState(false);

  useEffect(() => {
    if (!browsingPopular) return;
    let cancelled = false;
    const trimmed = gridQuery.trim();

    setGridLoading(true);
    const timer = setTimeout(
      () => {
        const request = trimmed
          ? searchAllCatalog(trimmed).then((r) => r.games)
          : fetchPopularSuggestions(libraryIds, GRID_POPULAR_LIMIT).then((r) => r.games);
        request.then((games) => {
          if (cancelled) return;
          setGridResults(games);
          setGridLoading(false);
        });
      },
      trimmed ? GRID_SEARCH_DEBOUNCE_MS : 0,
    );

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [browsingPopular, gridQuery]);

  function renderExploreCardSkeleton(key: number) {
    return (
      <View key={key} style={styles.exploreCard}>
        <Shimmer style={styles.exploreCover} />
        <Shimmer style={styles.skeletonLine} />
        <Shimmer style={styles.skeletonLineShort} />
      </View>
    );
  }

  function renderExploreCard(game: (typeof CATALOG)[number]) {
    return (
      <Pressable
        key={game.id}
        style={styles.exploreCard}
        onPress={() => navigation.navigate('GameDetail', { catalogId: game.id })}
      >
        <GameCover
          abbreviation={game.abbreviation}
          colorKey={game.colorKey}
          imageUrl={game.coverImageUrl}
          size={115}
          style={styles.exploreCover}
        />
        <Text style={styles.exploreTitle} numberOfLines={1}>
          {game.title}
        </Text>
        <View style={styles.exploreMetaRow}>
          <Text style={styles.exploreMetaText}>{game.year ?? "—"}</Text>
          <PlatformIcon platform={game.platform} size={14} color={discoverColors.mutedText} />
        </View>
      </Pressable>
    );
  }

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={discoverColors.heroGradient}
        locations={discoverColors.heroGradientLocations}
        style={styles.heroGradient}
      />

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {libraryBrowsing ? (
          <View style={styles.libraryHeader}>
            <Text style={styles.libraryTitle}>Library</Text>
            <View style={[styles.libraryAvatar, myAvatarColor && { backgroundColor: coverColors[myAvatarColor] }]}>
              {!myAvatarColor && <Ionicons name="person" size={17} color={discoverColors.mutedText} />}
            </View>
          </View>
        ) : (
          <View style={styles.header}>
            <TopBar
              leading={browsingPopular ? 'back' : 'menu'}
              onLeadingPress={browsingPopular ? () => setBrowsingPopular(false) : showSideMenu}
              title={browsingPopular ? 'Explore popular' : undefined}
              actions={[
                {
                  icon: 'bell',
                  accessibilityLabel:
                    unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications',
                  unread: unreadCount > 0,
                  onPress: () => navigation.navigate('Notifications'),
                },
              ]}
            />
          </View>
        )}

        {browsingPopular ? (
          <View style={styles.gridSearchBar}>
            <Ionicons name="search" size={18} color={discoverColors.mutedText} />
            <TextInput
              value={gridQuery}
              onChangeText={setGridQuery}
              placeholder="Search popular games"
              placeholderTextColor={discoverColors.mutedText}
              style={styles.gridSearchInput}
              autoCorrect={false}
            />
          </View>
        ) : libraryBrowsing ? (
          <View style={styles.libraryTabsWrap}>
            <SegmentedTabs options={libraryFilterOptions} value={libraryFilter} onChange={handleLibraryFilterChange} />
          </View>
        ) : (
          <DashboardToggle value={tab} onChange={setTab} />
        )}

        {browsingPopular ? (
          <FlatList
            data={gridResults}
            keyExtractor={(item) => item.id}
            numColumns={3}
            columnWrapperStyle={styles.gridRow}
            contentContainerStyle={styles.gridContent}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              gridLoading ? (
                <View style={styles.gridRow}>
                  {[0, 1, 2].map((key) => (
                    <View key={key} style={styles.gridItem}>
                      <Shimmer style={styles.gridCoverSkeleton} />
                      <Shimmer style={styles.skeletonLine} />
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={styles.gridEmptyText}>No games found.</Text>
              )
            }
            renderItem={({ item }) => (
              <Pressable
                style={styles.gridItem}
                onPress={() => navigation.navigate('GameDetail', { catalogId: item.id })}
              >
                <GameCover
                  abbreviation={item.abbreviation}
                  colorKey={item.colorKey}
                  imageUrl={item.coverImageUrl}
                  size={110}
                  style={styles.gridCover}
                />
                <Text style={styles.gridTitle} numberOfLines={2}>
                  {item.title}
                </Text>
                <View style={styles.gridMetaRow}>
                  <Text style={styles.exploreMetaText}>{item.year ?? '—'}</Text>
                  <PlatformIcon platform={item.platform} size={12} color={discoverColors.mutedText} />
                </View>
              </Pressable>
            )}
          />
        ) : libraryBrowsing ? (
          <ScrollView contentContainerStyle={styles.libraryScrollContent} showsVerticalScrollIndicator={false}>
            {libraryFilter === 'saved' ? (
              librarySortedSaved.length === 0 ? (
                <Text style={styles.gridEmptyText}>Nothing saved yet.</Text>
              ) : (
                <>
                  <View style={styles.libraryShowingRow}>
                    <Text style={styles.libraryShowingLabel}>Showing Saved</Text>
                    <Pressable style={styles.librarySortButton} onPress={() => setLibrarySortAZ((v) => !v)} hitSlop={8}>
                      <Ionicons name="swap-vertical-outline" size={14} color={discoverColors.mutedText} />
                      <Text style={styles.librarySortText}>{librarySortAZ ? 'A–Z' : 'Recent'}</Text>
                    </Pressable>
                  </View>
                  <View style={styles.libraryCard}>
                    {librarySortedSaved.map((game, index) =>
                      renderSavedRow(game, index === librarySortedSaved.length - 1),
                    )}
                  </View>
                </>
              )
            ) : libraryRows.length === 0 ? (
              <Text style={styles.gridEmptyText}>Your library is empty.</Text>
            ) : !libraryShowAll ? (
              <>
                <View style={styles.libraryShowingRow}>
                  <Text style={styles.libraryShowingLabel}>Recents</Text>
                  <Pressable onPress={() => setLibraryShowAll(true)} hitSlop={8}>
                    <Text style={styles.seeAll}>See all</Text>
                  </Pressable>
                </View>
                <View style={styles.libraryCard}>
                  {libraryRecentRows.map((row, index) => renderLibraryRow(row, index === libraryRecentRows.length - 1))}
                </View>

                {!libraryPromoDismissed && (
                  <View style={styles.libraryPromoCard}>
                    <Pressable
                      style={styles.libraryPromoClose}
                      onPress={() => setLibraryPromoDismissed(true)}
                      hitSlop={8}
                    >
                      <Ionicons name="close" size={14} color={discoverColors.mutedText} />
                    </Pressable>
                    <View style={styles.libraryPromoRow}>
                      <Text style={styles.libraryPromoText}>Dismissable promotions would come here</Text>
                      <View style={styles.libraryPromoButton}>
                        <Text style={styles.libraryPromoButtonText}>Join Challenge</Text>
                      </View>
                    </View>
                  </View>
                )}

                {popularToShow.length > 0 && (
                  <View style={styles.section}>
                    <Text style={styles.libraryShowingLabel}>Discover</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hRow}>
                      {popularToShow.map(renderExploreCard)}
                    </ScrollView>
                  </View>
                )}
              </>
            ) : libraryFilteredRows.length === 0 ? (
              <Text style={styles.gridEmptyText}>No games in this status.</Text>
            ) : (
              <>
                <View style={styles.libraryShowingRow}>
                  <Text style={styles.libraryShowingLabel}>
                    {libraryFilter === 'all' ? 'Showing All' : `Showing ${STATUS_LABEL[libraryFilter as GameStatus]}`}
                  </Text>
                  <Pressable style={styles.librarySortButton} onPress={() => setLibrarySortAZ((v) => !v)} hitSlop={8}>
                    <Ionicons name="swap-vertical-outline" size={14} color={discoverColors.mutedText} />
                    <Text style={styles.librarySortText}>{librarySortAZ ? 'A–Z' : 'Recent'}</Text>
                  </Pressable>
                </View>
                <View style={styles.libraryCard}>
                  {libraryFilteredRows.map((row, index) => renderLibraryRow(row, index === libraryFilteredRows.length - 1))}
                </View>
              </>
            )}
          </ScrollView>
        ) : tab === 'friends' ? (
          <ScrollView contentContainerStyle={styles.feedContent} showsVerticalScrollIndicator={false}>
            <Pressable style={styles.findPeopleRow} onPress={() => navigation.navigate('FriendSearch')}>
              <Ionicons name="search" size={16} color={discoverColors.mutedText} />
              <Text style={styles.findPeopleText}>Find people to follow</Text>
            </Pressable>
            <View style={styles.composer}>
              <View style={styles.composerRow}>
                <TextInput
                  value={composerText}
                  onChangeText={setComposerText}
                  placeholder="Share what you're playing…"
                  placeholderTextColor={discoverColors.mutedText}
                  style={styles.composerInput}
                  multiline
                />
                <Pressable
                  style={[styles.composerButton, (!composerText.trim() || posting) && styles.composerButtonDisabled]}
                  onPress={handlePost}
                  disabled={!composerText.trim() || posting}
                >
                  <Text style={styles.composerButtonText}>{posting ? 'Posting…' : 'Post'}</Text>
                </Pressable>
              </View>
              <View style={styles.composerToolsRow}>
                <Pressable style={styles.composerImageButton} onPress={handlePickComposerImage} hitSlop={8}>
                  <Ionicons name="image-outline" size={18} color={discoverColors.mutedText} />
                  <Text style={styles.composerImageButtonText}>Photo</Text>
                </Pressable>
                {composerImage && (
                  <View style={styles.composerImagePreviewWrap}>
                    <Image source={{ uri: composerImage.uri }} style={styles.composerImagePreview} contentFit="cover" />
                    <Pressable style={styles.composerImageRemove} onPress={() => setComposerImage(null)} hitSlop={8}>
                      <Ionicons name="close" size={12} color={colors.text} />
                    </Pressable>
                  </View>
                )}
              </View>
            </View>

            {feedError && <Text style={styles.feedError}>{feedError}</Text>}

            {feedLoading ? (
              [0, 1].map((key) => (
                <View key={key} style={styles.postCard}>
                  <View style={styles.postHeader}>
                    <Shimmer style={styles.postAvatarSkeleton} />
                    <View style={styles.postHeaderText}>
                      <Shimmer style={styles.skeletonLine} />
                    </View>
                  </View>
                  <Shimmer style={styles.skeletonLine} />
                  <Shimmer style={styles.skeletonLineShort} />
                </View>
              ))
            ) : feedPosts.length === 0 ? (
              <View style={styles.comingSoon}>
                <Text style={styles.comingSoonTitle}>No posts yet</Text>
                <Text style={styles.comingSoonBody}>
                  Follow friends or share what you're playing to get the feed going.
                </Text>
              </View>
            ) : (
              feedPosts.map((post) => (
                <Pressable
                  key={post.id}
                  style={styles.postCard}
                  onPress={() =>
                    navigation.navigate('PostDetail', {
                      post,
                      onPostUpdated: (updated) =>
                        setFeedPosts((prev) => prev.map((p) => (p.id === updated.id ? updated : p))),
                      onPostDeleted: (postId) => setFeedPosts((prev) => prev.filter((p) => p.id !== postId)),
                    })
                  }
                >
                  <View style={styles.postHeader}>
                    <Pressable
                      style={styles.postAuthorTapArea}
                      onPress={() => navigation.navigate('FriendProfile', { handle: post.handle })}
                      hitSlop={4}
                    >
                      <View style={[styles.postAvatar, { backgroundColor: coverColors[post.avatar_color] ?? coverColors.slate }]} />
                      <View style={styles.postHeaderText}>
                        <Text style={styles.postName}>{post.display_name}</Text>
                        <Text style={styles.postHandle}>@{post.handle}</Text>
                      </View>
                    </Pressable>
                    <Text style={styles.postTime}>{timeAgo(post.created_at)}</Text>
                    {post.author_id === userId ? (
                      <Pressable style={styles.postDeleteButton} onPress={() => handleDeletePost(post)} hitSlop={8}>
                        <Ionicons name="trash-outline" size={16} color={discoverColors.mutedText} />
                      </Pressable>
                    ) : (
                      <Pressable style={styles.postDeleteButton} onPress={() => handleReportPost(post)} hitSlop={8}>
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
                  <View style={styles.postActions}>
                    <Pressable style={styles.postActionButton} hitSlop={8} onPress={() => handleToggleLike(post)}>
                      <Ionicons
                        name={post.liked_by_me ? 'heart' : 'heart-outline'}
                        size={18}
                        color={post.liked_by_me ? colors.accent : discoverColors.mutedText}
                      />
                      {post.like_count > 0 && <Text style={styles.postActionCount}>{post.like_count}</Text>}
                    </Pressable>
                    <Pressable
                      style={styles.postActionButton}
                      hitSlop={8}
                      onPress={() =>
                        navigation.navigate('PostDetail', {
                          post,
                          onPostUpdated: (updated) =>
                            setFeedPosts((prev) => prev.map((p) => (p.id === updated.id ? updated : p))),
                          onPostDeleted: (postId) => setFeedPosts((prev) => prev.filter((p) => p.id !== postId)),
                        })
                      }
                    >
                      <Ionicons name="chatbubble-outline" size={17} color={discoverColors.mutedText} />
                      {post.comment_count > 0 && <Text style={styles.postActionCount}>{post.comment_count}</Text>}
                    </Pressable>
                  </View>
                </Pressable>
              ))
            )}
          </ScrollView>
        ) : !hasAnyContent ? (
          <View style={styles.comingSoon}>
            <Text style={styles.comingSoonTitle}>Your shelf is empty</Text>
            <Text style={styles.comingSoonBody}>Tap the search button below to add a game.</Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {(topPlayed.length > 0 || allLibraryLoading) && (
              <View style={styles.section}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.sectionTitle}>Top played</Text>
                  <Pressable onPress={() => openLibraryBrowser('all', false)} hitSlop={8}>
                    <Image source={CHEVRON_ICON} style={styles.chevronIcon} contentFit="contain" />
                  </Pressable>
                </View>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.hRow}
                >
                  {topPlayed.length > 0
                    ? topPlayed.map(renderExploreCard)
                    : [0, 1, 2].map(renderExploreCardSkeleton)}
                </ScrollView>
              </View>
            )}

            {(popularToShow.length > 0 || popularLoading) && (
              <View style={styles.section}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.sectionTitle}>Explore popular</Text>
                  <Pressable onPress={() => setBrowsingPopular(true)} hitSlop={8}>
                    <Text style={styles.seeAll}>See all</Text>
                  </Pressable>
                </View>
                <View style={styles.popularCard}>
                  {popularToShow.length > 0
                    ? popularToShow.map((game, index) => (
                        <Pressable
                          key={game.id}
                          style={[styles.popularRow, index === popularToShow.length - 1 && styles.popularRowLast]}
                          onPress={() => navigation.navigate('GameDetail', { catalogId: game.id })}
                        >
                          <GameCover
                            abbreviation={game.abbreviation}
                            colorKey={game.colorKey}
                            imageUrl={game.coverImageUrl}
                            size={POPULAR_COVER_SIZE}
                            style={styles.popularCover}
                          />
                          <View style={styles.popularInfo}>
                            <Text style={styles.exploreTitle} numberOfLines={1}>
                              {game.title}
                            </Text>
                            <View style={styles.exploreMetaRow}>
                              <Text style={styles.exploreMetaText}>{game.year ?? '—'}</Text>
                              <PlatformIcon platform={game.platform} size={14} color={discoverColors.mutedText} />
                            </View>
                          </View>
                          <Pressable style={styles.addPill} onPress={() => addGame(game.id)}>
                            {glassAvailable ? (
                              <GlassView
                                style={[StyleSheet.absoluteFill, styles.addPillGlass]}
                                glassEffectStyle="regular"
                                colorScheme="dark"
                                isInteractive
                                tintColor={discoverColors.pillBg}
                              />
                            ) : (
                              <>
                                <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
                                <View style={[StyleSheet.absoluteFill, styles.addPillTint]} />
                              </>
                            )}
                            <Image source={ADD_CIRCLE_ICON} style={styles.addIcon} contentFit="contain" />
                            <Text style={styles.addLabel}>Add</Text>
                          </Pressable>
                        </Pressable>
                      ))
                    : [0, 1, 2].map((key) => (
                        <View key={key} style={[styles.popularRow, key === 2 && styles.popularRowLast]}>
                          <Shimmer style={styles.popularCoverSkeleton} />
                          <View style={styles.popularInfo}>
                            <Shimmer style={styles.skeletonLine} />
                            <Shimmer style={styles.skeletonLineShort} />
                          </View>
                          <Shimmer style={styles.addPillSkeleton} />
                        </View>
                      ))}
                </View>
              </View>
            )}

            {(savedGames.length > 0 || savedGamesLoading) && (
              <View style={styles.section}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.sectionTitle}>Explore Saved</Text>
                  <Pressable onPress={() => navigation.navigate('WishlistTab')} hitSlop={8}>
                    <Text style={styles.seeAll}>See all</Text>
                  </Pressable>
                </View>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.hRow}
                >
                  {savedGames.length > 0
                    ? savedGames.map(renderExploreCard)
                    : [0, 1, 2].map(renderExploreCardSkeleton)}
                </ScrollView>
              </View>
            )}

            <Text style={styles.attribution}>Game data and cover art from IGDB.com</Text>
          </ScrollView>
        )}
      </SafeAreaView>

      <LinearGradient
        pointerEvents="none"
        colors={discoverColors.bottomFadeColors}
        locations={discoverColors.bottomFadeLocations}
        style={styles.bottomFade}
      />

    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: discoverColors.background,
  },
  heroGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 177,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    paddingHorizontal: HOME_PADDING_X,
    paddingTop: spacing.sm,
  },
  libraryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
  },
  libraryTitle: {
    flex: 1,
    color: colors.text,
    fontSize: 26,
    fontWeight: '600',
  },
  libraryAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: discoverColors.rowBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleOuter: {
    flexDirection: 'row',
    alignSelf: 'center',
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
    height: TOGGLE_TRACK_HEIGHT,
    padding: TOGGLE_TRACK_PADDING,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    overflow: 'hidden',
  },
  // Glass path. No overflow clip on the track, so the interactive press scale is not cut off.
  toggleGlassTrack: {
    flexDirection: 'row',
    alignSelf: 'center',
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
    height: TOGGLE_TRACK_HEIGHT,
    padding: TOGGLE_TRACK_PADDING,
    // An explicit half-height radius. UICornerRadius does not clamp radii.pill (999).
    borderRadius: TOGGLE_TRACK_HEIGHT / 2,
  },
  toggleSegment: {
    width: TOGGLE_SEGMENT_WIDTH,
    height: TOGGLE_HEIGHT,
    justifyContent: 'center',
  },
  toggleIndicator: {
    position: 'absolute',
    left: TOGGLE_TRACK_PADDING,
    top: TOGGLE_TRACK_PADDING,
    width: TOGGLE_SEGMENT_WIDTH,
    height: TOGGLE_HEIGHT,
    borderRadius: TOGGLE_HEIGHT / 2,
    overflow: 'hidden',
  },
  toggleIndicatorGlassFill: {
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  gridSearchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: radii.pill,
    backgroundColor: discoverColors.rowBg,
  },
  gridSearchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 15,
  },
  gridContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: NAV_CLEARANCE,
    gap: spacing.md,
  },
  gridRow: {
    gap: spacing.md,
  },
  gridItem: {
    flex: 1,
    maxWidth: '33%',
    gap: spacing.xs,
  },
  gridCover: {
    width: '100%',
    height: 150,
    borderRadius: 10,
  },
  gridCoverSkeleton: {
    width: '100%',
    height: 150,
    borderRadius: 10,
  },
  gridTitle: {
    color: discoverColors.titleText,
    fontSize: 12,
    fontWeight: '600',
  },
  gridMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  gridEmptyText: {
    color: discoverColors.mutedText,
    fontSize: 14,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
  toggleOuterTint: {
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  togglePillTint: {
    backgroundColor: discoverColors.pillBg,
  },
  toggleLabel: {
    color: discoverColors.mutedText,
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: TOGGLE_HEIGHT,
  },
  toggleLabelActive: {
    color: '#FFFFFF',
  },
  toggleLabelOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  comingSoon: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
  },
  comingSoonTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  comingSoonBody: {
    color: discoverColors.mutedText,
    fontSize: 14,
    textAlign: 'center',
  },
  scrollContent: {
    paddingHorizontal: HOME_PADDING_X,
    gap: spacing.xl,
    paddingBottom: NAV_CLEARANCE,
  },
  section: {
    gap: spacing.md,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  chevronIcon: {
    width: 24,
    height: 24,
  },
  libraryTabsWrap: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  libraryScrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: NAV_CLEARANCE,
    gap: spacing.lg,
  },
  libraryShowingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  libraryShowingLabel: {
    color: discoverColors.mutedText,
    fontSize: 13,
    fontWeight: '600',
  },
  librarySortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  librarySortText: {
    color: discoverColors.mutedText,
    fontSize: 12,
    fontWeight: '600',
  },
  libraryCard: {
    backgroundColor: discoverColors.cardBg,
    borderRadius: radii.lg,
    overflow: 'hidden',
  },
  libraryRow: {
    backgroundColor: discoverColors.cardBg,
    borderRadius: 0,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    marginBottom: 1,
  },
  libraryRowLast: {
    marginBottom: 0,
  },
  savedPill: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: discoverColors.rowBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  libraryPromoCard: {
    minHeight: 127,
    justifyContent: 'center',
    backgroundColor: discoverColors.cardBg,
    borderRadius: 16,
    padding: spacing.lg,
    paddingRight: spacing.xl + spacing.md,
  },
  libraryPromoRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  libraryPromoClose: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  libraryPromoText: {
    flex: 1,
    color: discoverColors.titleText,
    fontSize: 14,
    fontWeight: '600',
    paddingRight: spacing.xl,
  },
  libraryPromoButton: {
    alignSelf: 'flex-end',
    backgroundColor: colors.text,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm - 2,
  },
  libraryPromoButtonText: {
    color: colors.background,
    fontSize: 13,
    fontWeight: '700',
  },
  seeAll: {
    color: '#FD5821',
    fontWeight: '700',
    fontSize: 13,
  },
  hRow: {
    gap: spacing.sm,
  },
  exploreCard: {
    width: 115,
    gap: spacing.sm,
  },
  exploreCover: {
    width: 115,
    height: 173,
    borderRadius: 8,
  },
  exploreTitle: {
    color: discoverColors.titleText,
    fontSize: 13,
    fontWeight: '600',
  },
  exploreMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  exploreMetaText: {
    color: discoverColors.mutedText,
    fontSize: 11,
    fontWeight: '600',
  },
  exploreMetaIcon: {
    width: 14,
    height: 14,
  },
  skeletonLine: {
    height: 13,
    borderRadius: 4,
    width: '85%',
  },
  skeletonLineShort: {
    height: 11,
    borderRadius: 4,
    width: '50%',
  },
  popularCoverSkeleton: {
    width: POPULAR_COVER_SIZE,
    height: POPULAR_COVER_SIZE,
    borderRadius: 9,
  },
  addPillSkeleton: {
    width: 70,
    height: 30,
    borderRadius: radii.pill,
  },
  attribution: {
    color: discoverColors.mutedText,
    fontSize: 11,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  popularCard: {
    backgroundColor: discoverColors.cardBg,
    borderRadius: radii.lg,
    overflow: 'hidden',
  },
  popularRow: {
    flexDirection: 'row',
    alignItems: 'center',
    // Figma gap 16 / padding 8, ÷1.1.
    gap: 14,
    backgroundColor: discoverColors.rowBg,
    paddingHorizontal: 7,
    paddingVertical: 7,
    marginBottom: 2,
  },
  popularRowLast: {
    marginBottom: 0,
  },
  popularCover: {
    borderRadius: 9,
  },
  popularInfo: {
    flex: 1,
    gap: 4,
  },
  addPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: radii.pill,
    overflow: 'hidden',
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 6,
  },
  addPillGlass: {
    borderRadius: radii.pill,
  },
  /** Pre-iOS-26 / Android stand-in for the glass fill. */
  addPillTint: {
    backgroundColor: discoverColors.pillBg,
  },
  addIcon: {
    width: 14,
    height: 14,
  },
  addLabel: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  feedContent: {
    paddingHorizontal: HOME_PADDING_X,
    gap: spacing.md,
    paddingBottom: NAV_CLEARANCE,
  },
  postCard: {
    gap: spacing.sm,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  postAuthorTapArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  postAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  postHeaderText: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  postName: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  postHandle: {
    color: discoverColors.mutedText,
    fontSize: 13,
  },
  postTime: {
    color: discoverColors.mutedText,
    fontSize: 13,
  },
  postDeleteButton: {
    marginLeft: spacing.xs,
    padding: 2,
  },
  postMessage: {
    color: discoverColors.titleText,
    fontSize: 14,
    lineHeight: 20,
  },
  postImage: {
    height: 180,
    borderRadius: radii.md,
    backgroundColor: discoverColors.rowBg,
  },
  postActions: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  postActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    padding: 2,
  },
  postActionCount: {
    color: discoverColors.mutedText,
    fontSize: 12,
    fontWeight: '600',
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
  postAvatarSkeleton: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  findPeopleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
  },
  findPeopleText: {
    color: discoverColors.mutedText,
    fontSize: 14,
    fontWeight: '600',
  },
  composer: {
    gap: spacing.sm,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  composerRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  composerToolsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  composerImageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  composerImageButtonText: {
    color: discoverColors.mutedText,
    fontSize: 12,
    fontWeight: '600',
  },
  composerImagePreviewWrap: {
    position: 'relative',
  },
  composerImagePreview: {
    width: 44,
    height: 44,
    borderRadius: radii.sm,
  },
  composerImageRemove: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  composerInput: {
    flex: 1,
    color: discoverColors.titleText,
    fontSize: 14,
    maxHeight: 90,
    backgroundColor: discoverColors.rowBg,
    borderRadius: radii.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  composerButton: {
    backgroundColor: colors.accent,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  composerButtonDisabled: {
    opacity: 0.4,
  },
  composerButtonText: {
    color: colors.onAccent,
    fontWeight: '700',
    fontSize: 13,
  },
  feedError: {
    color: colors.danger,
    fontSize: 12,
  },
  bottomFade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 200,
  },
});
