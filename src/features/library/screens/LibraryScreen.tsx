import React, { useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { Image, type ImageSource } from 'expo-image';
import { GameCover } from '../../../shared/components/GameCover';
import { PlatformIcon } from '../../../shared/components/PlatformIcon';
import { Shimmer } from '../../../shared/components/Shimmer';
import { coverColors, discoverColors, radii, spacing } from '../../../shared/theme/theme';
import { APP_NAME } from '../../../shared/constants/app';
import { useLibraryStore } from '../store/useLibraryStore';
import { useWishlistStore } from '../../wishlist/store/useWishlistStore';
import { useRecentlyViewedStore } from '../../addGame/store/useRecentlyViewedStore';
import { CATALOG, type CatalogGame } from '../../../data/catalog';
import { useResolvedGames } from '../../../shared/hooks/useResolvedGames';
import { fetchPopularSuggestions, searchAllCatalog } from '../../../services/catalog/unifiedCatalog';
import type { TabScreenProps } from '../../../core/navigation/types';

const GRID_SEARCH_DEBOUNCE_MS = 350;
const GRID_POPULAR_LIMIT = 15;

const NAV_BELL_ICON = require('../../../../assets/figma-icons/nav-bell.png') as ImageSource;
const ADD_CIRCLE_ICON = require('../../../../assets/figma-icons/add-circle.png') as ImageSource;
const CHEVRON_ICON = require('../../../../assets/figma-icons/chevron-forward.png') as ImageSource;

/** Bottom scroll inset so content clears the floating tab bar + FAB. */
const NAV_CLEARANCE = 40;
const EXPLORE_POPULAR_LIMIT = 3;
const EXPLORE_SAVED_LIMIT = 6;

type DashboardTab = 'games' | 'friends';

type FriendPost = {
  id: string;
  name: string;
  handle: string;
  timeAgo: string;
  message: string;
  avatarColor: string;
  hasImage: boolean;
};

/** Sample social feed — no real backend yet, matches the Figma "Friends" mockup layout. */
const FRIEND_POSTS: FriendPost[] = [
  {
    id: 'post-1',
    name: 'Paul Elite',
    handle: '@paulelite',
    timeAgo: '4h',
    message: "Hey guys, I think you need to check out this game — just found it and it's incredible.",
    avatarColor: coverColors.green,
    hasImage: true,
  },
  {
    id: 'post-2',
    name: 'Mika Reyes',
    handle: '@mikaplays',
    timeAgo: '9h',
    message: 'Finally beat the final boss after 40 hours. Worth every minute.',
    avatarColor: coverColors.blue,
    hasImage: true,
  },
  {
    id: 'post-3',
    name: 'Dante Okafor',
    handle: '@dokafor',
    timeAgo: '1d',
    message: 'Anyone else stuck on the water temple? Send help.',
    avatarColor: coverColors.gold,
    hasImage: false,
  },
];

type Props = TabScreenProps<'LibraryTab'>;

export function LibraryScreen({ navigation }: Props) {
  const [tab, setTab] = useState<DashboardTab>('games');
  const entries = useLibraryStore((state) => state.entries);
  const addGame = useLibraryStore((state) => state.addGame);
  const wishlistEntries = useWishlistStore((state) => state.entries);
  const recentlyViewedIds = useRecentlyViewedStore((state) => state.catalogIds);

  const libraryIds = useMemo(() => new Set(entries.map((entry) => entry.catalogId)), [entries]);
  const wishlistIds = useMemo(() => wishlistEntries.map((entry) => entry.catalogId), [wishlistEntries]);

  const { games: recentlyPlayed, loading: recentlyPlayedLoading } = useResolvedGames(recentlyViewedIds);

  const localPopularFallback = useMemo(
    () => CATALOG.filter((game) => !libraryIds.has(game.id)).slice(0, EXPLORE_POPULAR_LIMIT),
    [libraryIds],
  );
  const [popularSuggestions, setPopularSuggestions] = useState<CatalogGame[]>([]);
  const [popularLoading, setPopularLoading] = useState(true);
  const libraryIdsKey = Array.from(libraryIds).join(',');

  useEffect(() => {
    let cancelled = false;
    setPopularLoading(true);
    fetchPopularSuggestions(libraryIds, EXPLORE_POPULAR_LIMIT).then(({ games, error }) => {
      if (cancelled) return;
      setPopularSuggestions(error ? [] : games);
      setPopularLoading(false);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [libraryIdsKey]);

  const popularToShow = popularSuggestions.length > 0 || popularLoading ? popularSuggestions : localPopularFallback;

  const { games: savedGamesAll, loading: savedGamesLoading } = useResolvedGames(wishlistIds);
  const savedGames = savedGamesAll.slice(0, EXPLORE_SAVED_LIMIT);

  const stillLoading = recentlyPlayedLoading || savedGamesLoading || popularLoading;
  const hasAnyContent =
    stillLoading || recentlyPlayed.length > 0 || popularToShow.length > 0 || savedGames.length > 0;

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
        <View style={styles.header}>
          <Pressable
            hitSlop={12}
            onPress={browsingPopular ? () => setBrowsingPopular(false) : undefined}
          >
            {browsingPopular ? (
              <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
            ) : (
              <View style={styles.hamburger}>
                <View style={styles.hamburgerLine} />
                <View style={styles.hamburgerLine} />
                <View style={styles.hamburgerLine} />
              </View>
            )}
          </Pressable>
          <Text style={styles.brand}>{APP_NAME.toUpperCase()}</Text>
          <Pressable hitSlop={12}>
            <Image source={NAV_BELL_ICON} style={styles.bellIcon} contentFit="contain" />
          </Pressable>
        </View>

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
        ) : (
          <View style={styles.toggleOuter}>
            <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
            <View style={[StyleSheet.absoluteFill, styles.toggleOuterTint]} />
            <Pressable onPress={() => setTab('games')} style={styles.togglePill}>
              {tab === 'games' && (
                <>
                  <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
                  <View style={[StyleSheet.absoluteFill, styles.togglePillTint]} />
                </>
              )}
              <Text style={[styles.toggleLabel, tab === 'games' && styles.toggleLabelActive]}>Games</Text>
            </Pressable>
            <Pressable onPress={() => setTab('friends')} style={styles.togglePill}>
              {tab === 'friends' && (
                <>
                  <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
                  <View style={[StyleSheet.absoluteFill, styles.togglePillTint]} />
                </>
              )}
              <Text style={[styles.toggleLabel, tab === 'friends' && styles.toggleLabelActive]}>Friends</Text>
            </Pressable>
          </View>
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
        ) : tab === 'friends' ? (
          <ScrollView contentContainerStyle={styles.feedContent} showsVerticalScrollIndicator={false}>
            {FRIEND_POSTS.map((post) => (
              <View key={post.id} style={styles.postCard}>
                <View style={styles.postHeader}>
                  <View style={[styles.postAvatar, { backgroundColor: post.avatarColor }]} />
                  <View style={styles.postHeaderText}>
                    <Text style={styles.postName}>{post.name}</Text>
                    <Text style={styles.postHandle}>{post.handle}</Text>
                  </View>
                  <Text style={styles.postTime}>{post.timeAgo}</Text>
                </View>
                <Text style={styles.postMessage}>{post.message}</Text>
                {post.hasImage && <View style={styles.postImage} />}
                <View style={styles.postActions}>
                  <Pressable style={styles.postActionButton} hitSlop={8}>
                    <Ionicons name="heart-outline" size={18} color={discoverColors.mutedText} />
                  </Pressable>
                  <Pressable style={styles.postActionButton} hitSlop={8}>
                    <Ionicons name="chatbubble-outline" size={17} color={discoverColors.mutedText} />
                  </Pressable>
                  <Pressable style={styles.postActionButton} hitSlop={8}>
                    <Ionicons name="arrow-redo-outline" size={18} color={discoverColors.mutedText} />
                  </Pressable>
                </View>
              </View>
            ))}
          </ScrollView>
        ) : !hasAnyContent ? (
          <View style={styles.comingSoon}>
            <Text style={styles.comingSoonTitle}>Your shelf is empty</Text>
            <Text style={styles.comingSoonBody}>Tap the search button below to add a game.</Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {(recentlyPlayed.length > 0 || recentlyPlayedLoading) && (
              <View style={styles.section}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.sectionTitle}>Recently played</Text>
                  <Pressable onPress={() => navigation.navigate('AllGames')} hitSlop={8}>
                    <Image source={CHEVRON_ICON} style={styles.chevronIcon} contentFit="contain" />
                  </Pressable>
                </View>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.hRow}
                >
                  {recentlyPlayed.length > 0
                    ? recentlyPlayed.map(renderExploreCard)
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
                            size={64}
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
                            <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
                            <View style={[StyleSheet.absoluteFill, styles.togglePillTint]} />
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  hamburger: {
    width: 21,
    height: 16,
    justifyContent: 'space-between',
  },
  hamburgerLine: {
    width: 21,
    height: 2,
    borderRadius: 2,
    backgroundColor: '#FFFFFF',
  },
  brand: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
    letterSpacing: 0.4,
  },
  bellIcon: {
    width: 28,
    height: 28,
  },
  toggleOuter: {
    flexDirection: 'row',
    alignSelf: 'center',
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    overflow: 'hidden',
    padding: 2,
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
  togglePill: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radii.pill,
    overflow: 'hidden',
  },
  togglePillTint: {
    backgroundColor: discoverColors.pillBg,
  },
  toggleLabel: {
    color: discoverColors.mutedText,
    fontSize: 15,
    fontWeight: '600',
  },
  toggleLabelActive: {
    color: '#FFFFFF',
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
    paddingHorizontal: spacing.lg,
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
  seeAll: {
    color: '#FD5821',
    fontWeight: '700',
    fontSize: 15,
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
    width: 64,
    height: 64,
    borderRadius: 10,
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
    gap: spacing.md,
    backgroundColor: discoverColors.rowBg,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    marginBottom: 2,
  },
  popularRowLast: {
    marginBottom: 0,
  },
  popularCover: {
    borderRadius: 10,
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
    paddingHorizontal: spacing.lg,
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
    padding: 2,
  },
  bottomFade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 200,
  },
});
