import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GameCover } from '../../../shared/components/GameCover';
import { EmptyState } from '../../../shared/components/EmptyState';
import { Shimmer } from '../../../shared/components/Shimmer';
import { colors, radii, spacing, typography } from '../../../shared/theme/theme';
import { APP_NAME } from '../../../shared/constants/app';
import type { CatalogGame } from '../../../data/catalog';
import { searchAllCatalog } from '../../../services/catalog/unifiedCatalog';
import { useResolvedGames } from '../../../shared/hooks/useResolvedGames';
import { useLibraryStore, FREE_TIER_GAME_LIMIT } from '../../library/store/useLibraryStore';
import { useRecentlyViewedStore } from '../store/useRecentlyViewedStore';
import type { RootScreenProps } from '../../../core/navigation/types';

const SEARCH_DEBOUNCE_MS = 350;

type Props = RootScreenProps<'AddGame'>;

export function AddGameScreen({ navigation }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<CatalogGame[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const entries = useLibraryStore((state) => state.entries);
  const isInLibrary = useLibraryStore((state) => state.isInLibrary);
  const addGame = useLibraryStore((state) => state.addGame);
  const recentlyViewedIds = useRecentlyViewedStore((state) => state.catalogIds);
  const { games: recentGames } = useResolvedGames(recentlyViewedIds);

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

  function handleAdd(catalogId: string) {
    if (entries.length >= FREE_TIER_GAME_LIMIT && !isInLibrary(catalogId)) {
      Alert.alert(
        'Library full',
        `The free tier stops at ${FREE_TIER_GAME_LIMIT} games. Upgrade to Plus for unlimited shelves.`,
      );
      return;
    }
    addGame(catalogId);
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.brand}>{APP_NAME.toUpperCase()}</Text>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
          <Ionicons name="close" size={24} color={colors.textMuted} />
        </Pressable>
      </View>

      <View style={styles.searchBar}>
        <Ionicons name="search" size={18} color={colors.textMuted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search a game, character or franchise"
          placeholderTextColor={colors.textFaint}
          style={styles.searchInput}
          autoCorrect={false}
          autoFocus
        />
        {searching && <ActivityIndicator size="small" color={colors.textMuted} />}
        {!searching && query.length > 0 && (
          <Pressable onPress={() => setQuery('')} hitSlop={8}>
            <Ionicons name="close-circle" size={18} color={colors.textMuted} />
          </Pressable>
        )}
      </View>

      {query.trim().length === 0 ? (
        <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
          {recentGames.length === 0 ? (
            <EmptyState
              title="Find something to play"
              description="Search by title to add a game to your library."
            />
          ) : (
            <>
              <Text style={styles.sectionLabel}>Recently viewed</Text>
              <FlatList
                data={recentGames}
                horizontal
                showsHorizontalScrollIndicator={false}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.recentRow}
                renderItem={({ item }) => (
                  <Pressable
                    style={styles.recentItem}
                    onPress={() => navigation.navigate('GameDetail', { catalogId: item.id })}
                  >
                    <GameCover
                      abbreviation={item.abbreviation}
                      colorKey={item.colorKey}
                      imageUrl={item.coverImageUrl}
                      size={72}
                    />
                    <Text style={styles.recentTitle} numberOfLines={1}>
                      {item.title}
                    </Text>
                  </Pressable>
                )}
              />
            </>
          )}
        </ScrollView>
      ) : results.length === 0 && searching ? (
        <View style={styles.list}>
          {[0, 1, 2, 3, 4].map((key) => (
            <View key={key} style={styles.row}>
              <Shimmer style={styles.rowCoverSkeleton} />
              <View style={styles.info}>
                <Shimmer style={styles.skeletonLine} />
                <Shimmer style={styles.skeletonLineShort} />
              </View>
            </View>
          ))}
        </View>
      ) : results.length === 0 ? (
        <EmptyState title="No results" description={`Nothing matches "${query}".`} />
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListHeaderComponent={
            searchError ? (
              <Text style={styles.errorBanner}>
                Couldn&apos;t reach the full catalog ({searchError}). Showing local matches only.
              </Text>
            ) : null
          }
          renderItem={({ item }) => {
            const added = isInLibrary(item.id);
            return (
              <Pressable
                style={styles.row}
                onPress={() => navigation.navigate('GameDetail', { catalogId: item.id })}
              >
                <GameCover
                  abbreviation={item.abbreviation}
                  colorKey={item.colorKey}
                  imageUrl={item.coverImageUrl}
                  size={44}
                />
                <View style={styles.info}>
                  <Text style={typography.subheading} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={typography.body} numberOfLines={1}>
                    {[item.year, item.platform].filter(Boolean).join(' · ')}
                  </Text>
                </View>
                {added ? (
                  <View style={styles.addedBadge}>
                    <Ionicons name="checkmark" size={16} color={colors.onAccent} />
                  </View>
                ) : (
                  <Pressable onPress={() => handleAdd(item.id)} style={styles.addPill} hitSlop={4}>
                    <Ionicons name="add" size={16} color={colors.onAccent} />
                    <Text style={styles.addPillLabel}>Add</Text>
                  </Pressable>
                )}
              </Pressable>
            );
          }}
        />
      )}
      <Text style={styles.attribution}>Game data and cover art from IGDB.com</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.md,
  },
  brand: {
    color: colors.text,
    fontWeight: '900',
    fontSize: 14,
    letterSpacing: 1.2,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: spacing.md,
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    fontSize: 15,
  },
  body: {
    flex: 1,
  },
  sectionLabel: {
    color: colors.textFaint,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: spacing.md,
  },
  recentRow: {
    gap: spacing.md,
    paddingBottom: spacing.lg,
  },
  recentItem: {
    width: 72,
    gap: spacing.xs,
  },
  recentTitle: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },
  list: {
    paddingBottom: spacing.lg,
  },
  errorBanner: {
    color: colors.textFaint,
    fontSize: 12,
    paddingBottom: spacing.md,
  },
  attribution: {
    color: colors.textFaint,
    fontSize: 11,
    textAlign: 'center',
    paddingVertical: spacing.sm,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  info: {
    flex: 1,
    gap: 2,
  },
  rowCoverSkeleton: {
    width: 44,
    height: 44,
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
  addPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 6,
    borderRadius: radii.pill,
    backgroundColor: colors.accent,
  },
  addPillLabel: {
    color: colors.onAccent,
    fontWeight: '700',
    fontSize: 13,
  },
  addedBadge: {
    width: 26,
    height: 26,
    borderRadius: radii.pill,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
