import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Ionicons as IoniconsType } from '@expo/vector-icons';
import { Image, type ImageSource } from 'expo-image';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GameCover } from '../../../shared/components/GameCover';
import { PlatformIcon } from '../../../shared/components/PlatformIcon';
import { Shimmer } from '../../../shared/components/Shimmer';
import { colors, discoverColors, radii, spacing } from '../../../shared/theme/theme';
import type { CatalogGame } from '../../../data/catalog';
import { fetchPopularSuggestions, resolveRemoteId, searchAllCatalog } from '../../../services/catalog/unifiedCatalog';
import { isUuid } from '../../../shared/utils/id';
import { useResolvedGames } from '../../../shared/hooks/useResolvedGames';
import { useLibraryStore, FREE_TIER_GAME_LIMIT } from '../../library/store/useLibraryStore';
import { useWishlistStore } from '../../wishlist/store/useWishlistStore';
import { useRecentlyViewedStore } from '../store/useRecentlyViewedStore';
import type { RootScreenProps } from '../../../core/navigation/types';

const ADD_CIRCLE_ICON = require('../../../../assets/figma-icons/add-circle.png') as ImageSource;

type Props = RootScreenProps<'AddGame'>;
type IconName = React.ComponentProps<typeof IoniconsType>['name'];

const SEARCH_DEBOUNCE_MS = 350;
const POPULAR_PREVIEW_LIMIT = 10;
const POPULAR_BROWSE_LIMIT = 24;

type SortOption = 'popular' | 'ratings' | 'recent' | 'alphabetical';
type SortDirection = 'asc' | 'desc';
type BrowseSection = 'recent' | 'popular' | 'saved' | 'library' | null;
type Panel = 'none' | 'category' | 'sort';

const GENRE_FILTERS: { label: string; icon: IconName; keywords: string[] }[] = [
  { label: 'Action', icon: 'flash-outline', keywords: ['action'] },
  { label: 'Adventure', icon: 'compass-outline', keywords: ['adventure'] },
  { label: 'RPG', icon: 'shield-outline', keywords: ['role-playing', 'rpg'] },
  { label: 'FPS', icon: 'locate-outline', keywords: ['shooter'] },
  { label: 'Strategy', icon: 'grid-outline', keywords: ['strategy'] },
  { label: 'Simulation', icon: 'sync-outline', keywords: ['simulat'] },
  { label: 'Sports', icon: 'football-outline', keywords: ['sport'] },
  { label: 'Racing', icon: 'car-sport-outline', keywords: ['racing'] },
  { label: 'Fighting', icon: 'hand-left-outline', keywords: ['fighting'] },
  { label: 'Platformer', icon: 'walk-outline', keywords: ['platform'] },
  { label: 'Puzzle', icon: 'extension-puzzle-outline', keywords: ['puzzle'] },
  { label: 'Souls', icon: 'skull-outline', keywords: ['souls'] },
  { label: 'Open World', icon: 'globe-outline', keywords: ['open world'] },
  { label: 'Survival', icon: 'leaf-outline', keywords: ['survival'] },
];

const DEVICE_FILTERS: { label: string; icon: IconName; keywords: string[] }[] = [
  { label: 'Play Station', icon: 'logo-playstation', keywords: ['ps', 'playstation'] },
  { label: 'Xbox', icon: 'logo-xbox', keywords: ['xbox'] },
  { label: 'Nintendo', icon: 'game-controller-outline', keywords: ['switch', 'nintendo'] },
  { label: 'PC', icon: 'desktop-outline', keywords: ['pc', 'windows', 'win'] },
  { label: 'Mobile', icon: 'phone-portrait-outline', keywords: ['ios', 'android', 'mobile'] },
];

const SORT_OPTIONS: { value: SortOption; label: string; icon: IconName }[] = [
  { value: 'popular', label: 'Most Popular', icon: 'bar-chart-outline' },
  { value: 'ratings', label: 'Ratings', icon: 'star-outline' },
  { value: 'recent', label: 'Most Recent', icon: 'calendar-outline' },
  { value: 'alphabetical', label: 'Alphabetical Order', icon: 'swap-vertical-outline' },
];

function matchesAny(value: string, labels: Set<string>, filters: { label: string; keywords: string[] }[]) {
  if (labels.size === 0) return true;
  const normalized = value.toLowerCase();
  return Array.from(labels).some((label) => {
    const filter = filters.find((f) => f.label === label);
    return filter?.keywords.some((keyword) => normalized.includes(keyword));
  });
}

function formatMonthYear(releaseDate?: string, year?: number): string {
  if (releaseDate) {
    const parsed = new Date(releaseDate);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    }
  }
  return year ? String(year) : '—';
}

export function AddGameScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const inputRef = useRef<TextInput>(null);
  const cursorOpacity = useRef(new Animated.Value(1)).current;

  const [query, setQuery] = useState('');
  const [searchActive, setSearchActive] = useState(false);
  const [browseSection, setBrowseSection] = useState<BrowseSection>(null);
  const [panel, setPanel] = useState<Panel>('none');

  const [results, setResults] = useState<CatalogGame[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const [popularPreview, setPopularPreview] = useState<CatalogGame[]>([]);
  const [browsePopular, setBrowsePopular] = useState<CatalogGame[]>([]);
  const [browsePopularLoading, setBrowsePopularLoading] = useState(false);

  const [genreExpanded, setGenreExpanded] = useState(true);
  const [deviceExpanded, setDeviceExpanded] = useState(false);
  const [selectedGenres, setSelectedGenres] = useState<Set<string>>(new Set());
  const [selectedDevices, setSelectedDevices] = useState<Set<string>>(new Set());
  const [sortOption, setSortOption] = useState<SortOption>('popular');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const entries = useLibraryStore((state) => state.entries);
  const isInLibrary = useLibraryStore((state) => state.isInLibrary);
  const addGame = useLibraryStore((state) => state.addGame);
  const libraryIds = useMemo(() => new Set(entries.map((entry) => entry.catalogId)), [entries]);
  const libraryIdsKey = Array.from(libraryIds).join(',');

  const recentlyViewedIds = useRecentlyViewedStore((state) => state.catalogIds);
  const { games: recentGames } = useResolvedGames(recentlyViewedIds);

  const wishlistEntries = useWishlistStore((state) => state.entries);
  const wishlistIds = useMemo(() => wishlistEntries.map((entry) => entry.catalogId), [wishlistEntries]);
  const { games: savedGames } = useResolvedGames(wishlistIds);

  const { games: myLibraryGames } = useResolvedGames(Array.from(libraryIds));

  useEffect(() => {
    fetchPopularSuggestions(libraryIds, POPULAR_PREVIEW_LIMIT).then(({ games }) => setPopularPreview(games));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [libraryIdsKey]);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      setSearching(false);
      setSearchError(null);
      return;
    }
    setSearching(true);
    let cancelled = false;
    const timer = setTimeout(() => {
      searchAllCatalog(trimmed).then(({ games, remoteError }) => {
        if (cancelled) return;
        setResults(games);
        setSearchError(remoteError);
        setSearching(false);
      });
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  useEffect(() => {
    if (!searchActive || query.length > 0) {
      cursorOpacity.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(cursorOpacity, { toValue: 0, duration: 500, useNativeDriver: true }),
        Animated.timing(cursorOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [searchActive, query.length, cursorOpacity]);

  function openSearch() {
    setSearchActive(true);
    setBrowseSection(null);
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  function leaveSearch() {
    Keyboard.dismiss();
    navigation.goBack();
  }

  function openBrowseSection(section: Exclude<BrowseSection, null>) {
    Keyboard.dismiss();
    setSearchActive(true);
    setQuery('');
    setBrowseSection(section);
    if (section === 'popular' && browsePopular.length === 0) {
      setBrowsePopularLoading(true);
      fetchPopularSuggestions(libraryIds, POPULAR_BROWSE_LIMIT).then(({ games }) => {
        setBrowsePopular(games);
        setBrowsePopularLoading(false);
      });
    }
  }

  async function handleAdd(game: CatalogGame) {
    if (entries.length >= FREE_TIER_GAME_LIMIT && !isInLibrary(game.id)) {
      Alert.alert(
        'Library full',
        `The free tier stops at ${FREE_TIER_GAME_LIMIT} games. Upgrade to Plus for unlimited shelves.`,
      );
      return;
    }
    const catalogId = isUuid(game.id) ? game.id : await resolveRemoteId(game.title);
    if (!catalogId) {
      Alert.alert('Not in the live catalog yet', `Couldn't find "${game.title}" to add it.`);
      return;
    }
    addGame(catalogId);
  }

  function applyFiltersAndSort(list: CatalogGame[]): CatalogGame[] {
    const filtered = list.filter(
      (game) => matchesAny(game.genre, selectedGenres, GENRE_FILTERS) && matchesAny(game.platform, selectedDevices, DEVICE_FILTERS),
    );
    switch (sortOption) {
      case 'ratings':
        return [...filtered].sort((a, b) => (b.criticScore ?? -1) - (a.criticScore ?? -1));
      case 'recent':
        return [...filtered].sort((a, b) => (b.releaseDate ?? '').localeCompare(a.releaseDate ?? ''));
      case 'alphabetical':
        return [...filtered].sort((a, b) =>
          sortDirection === 'asc' ? a.title.localeCompare(b.title) : b.title.localeCompare(a.title),
        );
      default:
        return filtered;
    }
  }

  const activeFilterCount = selectedGenres.size + selectedDevices.size;
  const trimmedQuery = query.trim();

  const browseData =
    browseSection === 'recent'
      ? recentGames
      : browseSection === 'popular'
        ? browsePopular
        : browseSection === 'saved'
          ? savedGames
          : browseSection === 'library'
            ? myLibraryGames
            : [];
  const browseLoading = browseSection === 'popular' && browsePopularLoading;
  const browseTitle =
    browseSection === 'recent'
      ? 'Recently Viewed'
      : browseSection === 'popular'
        ? 'Explore popular'
        : browseSection === 'saved'
          ? 'Explore Saved'
          : 'Explore your Library';

  const sortedResults = applyFiltersAndSort(results);
  const bestMatch = browseSection === null ? sortedResults.slice(0, 3) : [];
  const fromLibraryMatches =
    browseSection === null && trimmedQuery
      ? myLibraryGames.filter((game) => game.title.toLowerCase().includes(trimmedQuery.toLowerCase())).slice(0, 6)
      : [];
  const gamesList = browseSection === null ? sortedResults.slice(3) : applyFiltersAndSort(browseData);

  const headerTitle = searchActive ? (browseSection ? browseTitle : 'Search results') : 'Find games';

  function openPanel(target: Exclude<Panel, 'none'>) {
    Keyboard.dismiss();
    setPanel(target);
  }

  function renderIdleSections() {
    return (
      <>
        <VerticalSection
          title="Recently Viewed"
          data={recentGames}
          onSeeAll={() => openBrowseSection('recent')}
          onPressItem={(game) => navigation.navigate('GameDetail', { catalogId: game.id })}
        />
        <VerticalSection
          title="Explore your Library"
          data={myLibraryGames}
          onSeeAll={() => openBrowseSection('library')}
          onPressItem={(game) => navigation.navigate('GameDetail', { catalogId: game.id })}
        />
        <VerticalSection
          title="Explore popular"
          data={popularPreview}
          onSeeAll={() => openBrowseSection('popular')}
          seeAllLabel="See all"
          withAddPill
          isInLibrary={isInLibrary}
          onAdd={handleAdd}
          onPressItem={(game) => navigation.navigate('GameDetail', { catalogId: game.id })}
        />
        <VerticalSection
          title="Explore Saved"
          data={savedGames}
          onSeeAll={() => openBrowseSection('saved')}
          seeAllLabel="See all"
          withAddPill
          isInLibrary={isInLibrary}
          onAdd={handleAdd}
          onPressItem={(game) => navigation.navigate('GameDetail', { catalogId: game.id })}
        />
      </>
    );
  }

  function renderFilterRow() {
    return (
      <View style={styles.filterRow}>
        <Pressable style={styles.filterPill} onPress={() => openPanel('category')}>
          <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
          <View style={[StyleSheet.absoluteFill, styles.filterPillTint]} />
          <Text style={styles.filterPillText}>Categories</Text>
          {activeFilterCount > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
            </View>
          )}
          <Ionicons name="chevron-down" size={14} color={discoverColors.mutedText} />
        </Pressable>
        <Pressable
          style={styles.filterPill}
          onPress={() => setSortOption((prev) => (prev === 'recent' ? 'popular' : 'recent'))}
        >
          <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
          <View style={[StyleSheet.absoluteFill, styles.filterPillTint]} />
          <Text style={[styles.filterPillText, sortOption === 'recent' && styles.filterPillTextActive]}>
            Release Date
          </Text>
          <Ionicons
            name={sortOption === 'recent' ? 'checkmark' : 'chevron-down'}
            size={14}
            color={sortOption === 'recent' ? colors.accent : discoverColors.mutedText}
          />
        </Pressable>
        <Pressable style={styles.sortIconButton} onPress={() => openPanel('sort')} hitSlop={8}>
          <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
          <View style={[StyleSheet.absoluteFill, styles.filterPillTint]} />
          <Ionicons name="apps-outline" size={16} color={colors.text} />
        </Pressable>
      </View>
    );
  }

  function renderResultsBody() {
    if (browseSection) {
      if (browseLoading) {
        return <GamesListSkeleton />;
      }
      if (browseData.length === 0) {
        return <Text style={styles.emptyText}>Nothing here yet.</Text>;
      }
      return (
        <GamesList
          title={browseTitle}
          data={applyFiltersAndSort(browseData)}
          isInLibrary={isInLibrary}
          onAdd={handleAdd}
          onPress={(game) => navigation.navigate('GameDetail', { catalogId: game.id })}
        />
      );
    }

    if (!trimmedQuery) {
      return null;
    }

    if (searching && results.length === 0) {
      return <GamesListSkeleton />;
    }

    if (sortedResults.length === 0) {
      return <Text style={styles.emptyText}>{`Nothing matches "${trimmedQuery}".`}</Text>;
    }

    return (
      <>
        {searchError && (
          <Text style={styles.errorBanner}>Couldn&apos;t reach the full catalog ({searchError}). Showing local matches only.</Text>
        )}
        {bestMatch.length > 0 && (
          <HorizontalSection
            title="Best Match"
            data={bestMatch}
            withAddPill
            isInLibrary={isInLibrary}
            onAdd={handleAdd}
            onPressItem={(game) => navigation.navigate('GameDetail', { catalogId: game.id })}
          />
        )}
        {fromLibraryMatches.length > 0 && (
          <HorizontalSection
            title="From your Library"
            data={fromLibraryMatches}
            compact
            onPressItem={(game) => navigation.navigate('GameDetail', { catalogId: game.id })}
          />
        )}
        {gamesList.length > 0 && (
          <GamesList
            title="Games"
            data={gamesList}
            isInLibrary={isInLibrary}
            onAdd={handleAdd}
            onPress={(game) => navigation.navigate('GameDetail', { catalogId: game.id })}
          />
        )}
      </>
    );
  }

  const dockTrailingIcon: IconName = searchActive ? 'close' : 'search';
  function handleDockTrailingPress() {
    if (!searchActive) return openSearch();
    return leaveSearch();
  }

  return (
    <View style={styles.root}>
      <LinearGradient colors={discoverColors.heroGradient} locations={discoverColors.heroGradientLocations} style={styles.heroGradient} />
      <View style={styles.safeArea}>
        <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
          <Text style={styles.pageTitle}>{headerTitle}</Text>
        </View>

        {searchActive && renderFilterRow()}

        {panel === 'category' ? (
          <CategoryPanel
            genreExpanded={genreExpanded}
            onToggleGenreExpanded={() => setGenreExpanded((v) => !v)}
            deviceExpanded={deviceExpanded}
            onToggleDeviceExpanded={() => setDeviceExpanded((v) => !v)}
            selectedGenres={selectedGenres}
            onToggleGenre={(label) =>
              setSelectedGenres((prev) => {
                const next = new Set(prev);
                next.has(label) ? next.delete(label) : next.add(label);
                return next;
              })
            }
            selectedDevices={selectedDevices}
            onToggleDevice={(label) =>
              setSelectedDevices((prev) => {
                const next = new Set(prev);
                next.has(label) ? next.delete(label) : next.add(label);
                return next;
              })
            }
            onClose={() => setPanel('none')}
            onOpenSort={() => setPanel('sort')}
            onApply={() => setPanel('none')}
          />
        ) : panel === 'sort' ? (
          <SortPanel
            sortOption={sortOption}
            onSelectSort={setSortOption}
            sortDirection={sortDirection}
            onSelectDirection={setSortDirection}
            onClose={() => setPanel('none')}
            onOpenFilters={() => setPanel('category')}
            onApply={() => setPanel('none')}
          />
        ) : (
          <ScrollView
            style={styles.body}
            contentContainerStyle={styles.bodyContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {!searchActive ? renderIdleSections() : renderResultsBody()}
          </ScrollView>
        )}
      </View>

      {panel === 'none' && (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} pointerEvents="box-none" style={styles.dockWrap}>
          <View style={[styles.dockRow, { marginBottom: insets.bottom || spacing.md }]}>
            <View style={styles.searchBarPill}>
              <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
              <View style={[StyleSheet.absoluteFill, styles.searchDockTint]} />
              <Pressable style={styles.searchDockTouchable} onPress={openSearch}>
                {searchActive && query.length === 0 && <Animated.View style={[styles.cursorBar, { opacity: cursorOpacity }]} />}
                <TextInput
                  ref={inputRef}
                  value={query}
                  onChangeText={setQuery}
                  onFocus={openSearch}
                  placeholder='Try "Minecraft"'
                  placeholderTextColor={discoverColors.mutedText}
                  style={styles.searchInput}
                  autoCorrect={false}
                  caretHidden
                  cursorColor="transparent"
                />
                {query.length > 0 && (
                  <Pressable onPress={() => setQuery('')} hitSlop={8} style={styles.inlineClearButton}>
                    <Ionicons name="close" size={14} color={colors.text} />
                  </Pressable>
                )}
              </Pressable>
            </View>
            <Pressable
              style={[styles.searchDockButton, dockTrailingIcon === 'close' && styles.searchDockButtonClose]}
              onPress={handleDockTrailingPress}
              hitSlop={8}
            >
              <Ionicons name={dockTrailingIcon} size={20} color={dockTrailingIcon === 'close' ? colors.text : colors.onAccent} />
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      )}
    </View>
  );
}

type VerticalSectionProps = {
  title: string;
  data: CatalogGame[];
  onSeeAll: () => void;
  seeAllLabel?: string;
  withAddPill?: boolean;
  isInLibrary?: (id: string) => boolean;
  onAdd?: (game: CatalogGame) => void;
  onPressItem: (game: CatalogGame) => void;
};

function VerticalSection({ title, data, onSeeAll, seeAllLabel, withAddPill, isInLibrary, onAdd, onPressItem }: VerticalSectionProps) {
  if (data.length === 0) return null;
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <Pressable onPress={onSeeAll} hitSlop={8}>
          {seeAllLabel ? <Text style={styles.seeAll}>{seeAllLabel}</Text> : <Ionicons name="chevron-forward" size={16} color={discoverColors.mutedText} />}
        </Pressable>
      </View>
      {data.slice(0, 3).map((game) => {
        const added = isInLibrary?.(game.id);
        return (
          <Pressable key={game.id} style={styles.row} onPress={() => onPressItem(game)}>
            <GameCover abbreviation={game.abbreviation} colorKey={game.colorKey} imageUrl={game.coverImageUrl} size={48} />
            <View style={styles.rowInfo}>
              <Text style={styles.rowTitle} numberOfLines={1}>
                {game.title}
              </Text>
              <View style={styles.cardMetaRow}>
                <Text style={styles.rowMeta}>{game.year ?? '—'}</Text>
                <PlatformIcon platform={game.platform} size={12} color={discoverColors.mutedText} />
              </View>
            </View>
            {withAddPill && onAdd && <GlassAddPill added={Boolean(added)} onPress={() => !added && onAdd(game)} />}
          </Pressable>
        );
      })}
    </View>
  );
}

type HorizontalSectionProps = {
  title: string;
  data: CatalogGame[];
  onPressItem: (game: CatalogGame) => void;
  withAddPill?: boolean;
  compact?: boolean;
  isInLibrary?: (id: string) => boolean;
  onAdd?: (game: CatalogGame) => void;
};

function HorizontalSection({ title, data, onPressItem, withAddPill, compact, isInLibrary, onAdd }: HorizontalSectionProps) {
  if (data.length === 0) return null;
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {withAddPill && <Ionicons name="chevron-forward" size={16} color={discoverColors.mutedText} />}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hRow}>
        {data.map((game) => {
          const added = isInLibrary?.(game.id);
          return (
            <Pressable key={game.id} style={compact ? styles.compactCard : styles.card} onPress={() => onPressItem(game)}>
              <GameCover
                abbreviation={game.abbreviation}
                colorKey={game.colorKey}
                imageUrl={game.coverImageUrl}
                size={compact ? 64 : 104}
                style={styles.cardCover}
              />
              <Text style={styles.cardTitle} numberOfLines={1}>
                {game.title}
              </Text>
              <View style={styles.cardMetaRow}>
                <Text style={styles.cardMetaText}>{compact ? game.year ?? '—' : formatMonthYear(game.releaseDate, game.year)}</Text>
                <PlatformIcon platform={game.platform} size={12} color={discoverColors.mutedText} />
              </View>
              {withAddPill && onAdd && (
                <View style={styles.cardPillWrap}>
                  <GlassAddPill added={Boolean(added)} onPress={() => !added && onAdd(game)} />
                </View>
              )}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

function GlassAddPill({ added, onPress }: { added: boolean; onPress: () => void }) {
  return (
    <Pressable style={styles.addPill} onPress={onPress}>
      <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
      <View style={[StyleSheet.absoluteFill, styles.addPillTint]} />
      {added ? (
        <Ionicons name="checkmark" size={14} color={colors.text} />
      ) : (
        <Image source={ADD_CIRCLE_ICON} style={styles.addIcon} contentFit="contain" />
      )}
      <Text style={styles.addLabel}>{added ? 'Owned' : 'Add'}</Text>
    </Pressable>
  );
}

type GamesListProps = {
  title: string;
  data: CatalogGame[];
  isInLibrary: (id: string) => boolean;
  onAdd: (game: CatalogGame) => void;
  onPress: (game: CatalogGame) => void;
};

function GamesList({ title, data, isInLibrary, onAdd, onPress }: GamesListProps) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <FlatList
        data={data}
        keyExtractor={(item) => item.id}
        scrollEnabled={false}
        ItemSeparatorComponent={() => <View style={styles.rowSeparator} />}
        renderItem={({ item }) => {
          const added = isInLibrary(item.id);
          return (
            <Pressable style={styles.row} onPress={() => onPress(item)}>
              <GameCover abbreviation={item.abbreviation} colorKey={item.colorKey} imageUrl={item.coverImageUrl} size={48} />
              <View style={styles.rowInfo}>
                <Text style={styles.rowTitle} numberOfLines={1}>
                  {item.title}
                </Text>
                <View style={styles.cardMetaRow}>
                  <Text style={styles.rowMeta}>{item.year ?? '—'}</Text>
                  <PlatformIcon platform={item.platform} size={12} color={discoverColors.mutedText} />
                </View>
              </View>
              {added ? <Text style={styles.ownedText}>Owned</Text> : <GlassAddPill added={false} onPress={() => onAdd(item)} />}
            </Pressable>
          );
        }}
      />
    </View>
  );
}

function GamesListSkeleton() {
  return (
    <View style={styles.section}>
      {[0, 1, 2, 3, 4].map((key) => (
        <View key={key} style={styles.row}>
          <Shimmer style={styles.rowCoverSkeleton} />
          <View style={styles.rowInfo}>
            <Shimmer style={styles.skeletonLine} />
            <Shimmer style={styles.skeletonLineShort} />
          </View>
        </View>
      ))}
    </View>
  );
}

type CategoryPanelProps = {
  genreExpanded: boolean;
  onToggleGenreExpanded: () => void;
  deviceExpanded: boolean;
  onToggleDeviceExpanded: () => void;
  selectedGenres: Set<string>;
  onToggleGenre: (label: string) => void;
  selectedDevices: Set<string>;
  onToggleDevice: (label: string) => void;
  onClose: () => void;
  onOpenSort: () => void;
  onApply: () => void;
};

function CategoryPanel({
  genreExpanded,
  onToggleGenreExpanded,
  deviceExpanded,
  onToggleDeviceExpanded,
  selectedGenres,
  onToggleGenre,
  selectedDevices,
  onToggleDevice,
  onClose,
  onOpenSort,
  onApply,
}: CategoryPanelProps) {
  return (
    <View style={styles.panel}>
      <View style={styles.panelHeaderRow}>
        <Text style={styles.panelTitle}>Category</Text>
        <Pressable onPress={onClose} hitSlop={10} style={styles.panelCloseButton}>
          <Ionicons name="close" size={18} color={colors.text} />
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={styles.panelScroll}>
        <Pressable style={styles.panelSectionHeaderRow} onPress={onToggleGenreExpanded}>
          <Text style={styles.panelSectionLabel}>Genre</Text>
          <Ionicons name={genreExpanded ? 'chevron-up' : 'chevron-down'} size={16} color={discoverColors.mutedText} />
        </Pressable>
        {genreExpanded && (
          <View style={styles.pillWrap}>
            {GENRE_FILTERS.map((filter) => {
              const active = selectedGenres.has(filter.label);
              return (
                <Pressable
                  key={filter.label}
                  style={[styles.filterChip, active && styles.filterChipActive]}
                  onPress={() => onToggleGenre(filter.label)}
                >
                  <Ionicons name={filter.icon} size={13} color={active ? colors.background : discoverColors.mutedText} />
                  <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>{filter.label}</Text>
                </Pressable>
              );
            })}
          </View>
        )}

        <Pressable style={styles.panelSectionHeaderRow} onPress={onToggleDeviceExpanded}>
          <Text style={styles.panelSectionLabel}>Device Type</Text>
          <Ionicons name={deviceExpanded ? 'chevron-up' : 'chevron-down'} size={16} color={discoverColors.mutedText} />
        </Pressable>
        {deviceExpanded && (
          <View style={styles.pillWrap}>
            {DEVICE_FILTERS.map((filter) => {
              const active = selectedDevices.has(filter.label);
              return (
                <Pressable
                  key={filter.label}
                  style={[styles.filterChip, active && styles.filterChipActive]}
                  onPress={() => onToggleDevice(filter.label)}
                >
                  <Ionicons name={filter.icon} size={13} color={active ? colors.background : discoverColors.mutedText} />
                  <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>{filter.label}</Text>
                </Pressable>
              );
            })}
          </View>
        )}

        <Pressable style={styles.panelLinkRow} onPress={onOpenSort}>
          <View style={styles.panelLinkIconBox}>
            <Ionicons name="list-outline" size={16} color={colors.accent} />
          </View>
          <Text style={styles.panelLinkText}>Sort Search Results</Text>
          <Ionicons name="chevron-forward" size={16} color={discoverColors.mutedText} />
        </Pressable>
      </ScrollView>

      <Pressable style={styles.applyButton} onPress={onApply}>
        <Text style={styles.applyButtonText}>Apply Selection</Text>
      </Pressable>
    </View>
  );
}

type SortPanelProps = {
  sortOption: SortOption;
  onSelectSort: (option: SortOption) => void;
  sortDirection: SortDirection;
  onSelectDirection: (direction: SortDirection) => void;
  onClose: () => void;
  onOpenFilters: () => void;
  onApply: () => void;
};

function SortPanel({ sortOption, onSelectSort, sortDirection, onSelectDirection, onClose, onOpenFilters, onApply }: SortPanelProps) {
  const showDirection = sortOption === 'alphabetical';
  return (
    <View style={styles.panel}>
      <View style={styles.panelHeaderRow}>
        <Text style={styles.panelTitle}>Sort By</Text>
        <Pressable onPress={onClose} hitSlop={10} style={styles.panelCloseButton}>
          <Ionicons name="close" size={18} color={colors.text} />
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={styles.panelScroll}>
        {SORT_OPTIONS.map((option) => (
          <RadioRow
            key={option.value}
            icon={option.icon}
            label={option.label}
            selected={sortOption === option.value}
            onPress={() => onSelectSort(option.value)}
          />
        ))}

        {showDirection && (
          <>
            <Text style={[styles.panelSectionLabel, styles.sortingOrderLabel]}>Sorting order</Text>
            <RadioRow
              icon="swap-vertical-outline"
              label="Ascending"
              selected={sortDirection === 'asc'}
              onPress={() => onSelectDirection('asc')}
            />
            <RadioRow
              icon="swap-vertical-outline"
              label="Descending"
              selected={sortDirection === 'desc'}
              onPress={() => onSelectDirection('desc')}
            />
          </>
        )}

        <Pressable style={styles.panelLinkRow} onPress={onOpenFilters}>
          <View style={styles.panelLinkIconBox}>
            <Ionicons name="apps-outline" size={16} color={colors.accent} />
          </View>
          <Text style={styles.panelLinkText}>Filter Categories</Text>
          <Ionicons name="chevron-forward" size={16} color={discoverColors.mutedText} />
        </Pressable>
      </ScrollView>

      <Pressable style={styles.applyButton} onPress={onApply}>
        <Text style={styles.applyButtonText}>Apply Sorting</Text>
      </Pressable>
    </View>
  );
}

function RadioRow({ icon, label, selected, onPress }: { icon: IconName; label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable style={[styles.radioRow, selected && styles.radioRowActive]} onPress={onPress}>
      <Ionicons name={icon} size={18} color={selected ? colors.text : discoverColors.mutedText} />
      <Text style={[styles.radioRowLabel, selected && styles.radioRowLabelActive]}>{label}</Text>
      <View style={[styles.radioOuter, selected && styles.radioOuterActive]}>{selected && <View style={styles.radioInner} />}</View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  heroGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 320,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  pageTitle: {
    color: colors.text,
    fontSize: 26,
    fontWeight: '600',
  },
  body: {
    flex: 1,
  },
  bodyContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 140,
    gap: spacing.lg,
  },
  section: {
    gap: spacing.sm,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  seeAll: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: '700',
  },
  hRow: {
    gap: spacing.md,
  },
  card: {
    width: 110,
    gap: spacing.xs,
  },
  compactCard: {
    width: 72,
    gap: spacing.xs,
  },
  cardCover: {
    width: '100%',
  },
  cardTitle: {
    color: discoverColors.titleText,
    fontSize: 12,
    fontWeight: '600',
  },
  cardMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  cardMetaText: {
    color: discoverColors.mutedText,
    fontSize: 11,
    fontWeight: '600',
  },
  cardPillWrap: {
    marginTop: 2,
    alignItems: 'flex-start',
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    overflow: 'hidden',
  },
  filterPillTint: {
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
  filterPillText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  filterPillTextActive: {
    color: colors.accent,
  },
  filterBadge: {
    backgroundColor: colors.accent,
    borderRadius: radii.pill,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  filterBadgeText: {
    color: colors.onAccent,
    fontSize: 10,
    fontWeight: '700',
  },
  sortIconButton: {
    marginLeft: 'auto',
    width: 34,
    height: 34,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  errorBanner: {
    color: colors.textFaint,
    fontSize: 12,
  },
  emptyText: {
    color: discoverColors.mutedText,
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: spacing.xl,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  rowInfo: {
    flex: 1,
    gap: 4,
  },
  rowTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  rowMeta: {
    color: discoverColors.mutedText,
    fontSize: 12,
    fontWeight: '600',
  },
  rowSeparator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
  rowCoverSkeleton: {
    width: 48,
    height: 48,
    borderRadius: radii.sm,
  },
  skeletonLine: {
    height: 14,
    borderRadius: 4,
    width: '70%',
  },
  skeletonLineShort: {
    height: 12,
    borderRadius: 4,
    width: '40%',
    marginTop: 4,
  },
  ownedText: {
    color: discoverColors.mutedText,
    fontSize: 13,
    fontWeight: '600',
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
  addPillTint: {
    backgroundColor: discoverColors.pillBg,
  },
  addIcon: {
    width: 14,
    height: 14,
  },
  addLabel: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  dockWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  dockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
  },
  searchBarPill: {
    flex: 1,
    height: 54,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    overflow: 'hidden',
  },
  searchDockTint: {
    backgroundColor: 'rgba(19,17,17,0.66)',
  },
  searchDockTouchable: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  cursorBar: {
    width: 2,
    height: 16,
    backgroundColor: colors.accent,
    marginRight: spacing.xs,
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    fontSize: 15,
    paddingVertical: spacing.sm,
  },
  inlineClearButton: {
    width: 22,
    height: 22,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.xs,
  },
  searchDockButton: {
    width: 69,
    height: 54,
    borderRadius: radii.pill,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.accent,
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  searchDockButtonClose: {
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    shadowColor: 'transparent',
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
    boxShadow:
      '0px 1px 0.5px 0.5px rgba(254, 242, 189, 0.25) inset, ' +
      '0px -1px 0.5px 0.5px rgba(0, 0, 0, 0.15) inset, ' +
      '0.5px -0.2px 0.2px 0.5px rgba(0, 0, 0, 0.1) inset, ' +
      '-0.5px -0.2px 0.2px 0.5px rgba(0, 0, 0, 0.1) inset, ' +
      '0px 0px 0px 0.5px rgba(251, 113, 28, 0.3)',
  },
  panel: {
    flex: 1,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },
  panelHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  panelTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '700',
  },
  panelCloseButton: {
    width: 30,
    height: 30,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  panelScroll: {
    flex: 1,
  },
  panelSectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  panelSectionLabel: {
    color: colors.textFaint,
    fontSize: 13,
    fontWeight: '600',
  },
  sortingOrderLabel: {
    marginTop: spacing.md,
  },
  pillWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingBottom: spacing.sm,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  filterChipActive: {
    backgroundColor: colors.text,
    borderColor: colors.text,
  },
  filterChipText: {
    color: discoverColors.mutedText,
    fontSize: 13,
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: colors.background,
  },
  panelLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: discoverColors.rowBg,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    marginTop: spacing.md,
  },
  panelLinkIconBox: {
    width: 26,
    height: 26,
    borderRadius: radii.sm,
    backgroundColor: colors.accentMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  panelLinkText: {
    flex: 1,
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  radioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: discoverColors.rowBg,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    marginBottom: spacing.sm,
  },
  radioRowActive: {
    backgroundColor: discoverColors.rowBg,
  },
  radioRowLabel: {
    flex: 1,
    color: discoverColors.mutedText,
    fontSize: 15,
    fontWeight: '600',
  },
  radioRowLabelActive: {
    color: colors.text,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: radii.pill,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterActive: {
    borderColor: colors.accent,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: radii.pill,
    backgroundColor: colors.accent,
  },
  applyButton: {
    backgroundColor: colors.accent,
    borderRadius: radii.pill,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  applyButtonText: {
    color: colors.onAccent,
    fontWeight: '800',
    fontSize: 15,
  },
});
