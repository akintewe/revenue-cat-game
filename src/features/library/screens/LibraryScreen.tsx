import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
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
import { formatReleaseLabel } from '../../../shared/utils/formatDate';
import { useAuthStore } from '../../auth/store/useAuthStore';
import { fetchMyAvatarColor } from '../../../services/social/profiles';
import { fetchUnreadNotificationCount } from '../../../services/social/notifications';
import type { CoverColorKey } from '../../../data/catalog';
import type { TabScreenProps } from '../../../core/navigation/types';
import { FriendsFeed } from '../../feed/components/FriendsFeed';
import { feedColors } from '../../feed/theme';

const GRID_SEARCH_DEBOUNCE_MS = 350;
const GRID_POPULAR_LIMIT = 15;

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

  // The Friends feed is its own Figma frame: a darker page and a black end to the hero gradient.
  const showFeed = tab === 'friends' && !browsingPopular && !libraryBrowsing;

  return (
    <View style={[styles.root, showFeed && { backgroundColor: feedColors.background }]}>
      <LinearGradient
        colors={showFeed ? feedColors.heroGradient : discoverColors.heroGradient}
        locations={showFeed ? feedColors.heroGradientLocations : discoverColors.heroGradientLocations}
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
                // The Friends feed writes from here. The mock has no composer on the page.
                ...(showFeed
                  ? [{ icon: 'pencil' as const, accessibilityLabel: 'New post', onPress: () => navigation.navigate('ComposePost') }]
                  : []),
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
          <FriendsFeed />
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
  bottomFade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 200,
  },
});
