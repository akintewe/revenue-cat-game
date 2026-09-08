import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image, type ImageSource } from 'expo-image';
import { Screen } from '../../../shared/components/Screen';
import { GameRow } from '../../../shared/components/GameRow';
import { GameCover } from '../../../shared/components/GameCover';
import { StatusPill } from '../../../shared/components/StatusPill';
import { PreorderPill } from '../../../shared/components/PreorderPill';
import { SegmentedTabs } from '../../../shared/components/SegmentedTabs';
import { EmptyState } from '../../../shared/components/EmptyState';
import { colors, radii, spacing } from '../../../shared/theme/theme';
import { useLibraryStore } from '../store/useLibraryStore';
import { useRecentlyViewedStore } from '../../addGame/store/useRecentlyViewedStore';
import { GAME_STATUSES, STATUS_LABEL, type GameStatus } from '../types';
import { STATUS_ICON } from '../../../shared/types/status';
import { useResolvedGames } from '../../../shared/hooks/useResolvedGames';
import { formatReleaseLabel } from '../../../shared/utils/formatDate';
import type { RootScreenProps } from '../../../core/navigation/types';

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

const SECTION_PLAYING_ICON = require('../../../../assets/figma-icons/section-playing.png') as ImageSource;
const SECTION_ADDED_ICON = require('../../../../assets/figma-icons/section-added.png') as ImageSource;
const SECTION_MENU_ICON = require('../../../../assets/figma-icons/section-menu.png') as ImageSource;

/** Bottom scroll inset so content clears the floating tab bar + FAB. */
const NAV_CLEARANCE = 40;

type FilterValue = 'all' | GameStatus;

const RECENT_LIMIT = 5;

type Props = RootScreenProps<'AllGames'>;

export function AllGamesScreen({ navigation }: Props) {
  const [filter, setFilter] = useState<FilterValue>('all');
  const [showAllRecent, setShowAllRecent] = useState(false);
  const entries = useLibraryStore((state) => state.entries);
  const recentlyViewedIds = useRecentlyViewedStore((state) => state.catalogIds);

  const entryIds = useMemo(() => entries.map((entry) => entry.catalogId), [entries]);
  const { games: resolvedGames } = useResolvedGames(entryIds);

  const rows = useMemo(() => {
    const gamesById = new Map(resolvedGames.map((game) => [game.id, game]));
    return entries
      .map((entry) => ({ entry, game: gamesById.get(entry.catalogId) }))
      .filter((row): row is { entry: typeof row.entry; game: NonNullable<typeof row.game> } =>
        Boolean(row.game),
      );
  }, [entries, resolvedGames]);

  const filteredRows = useMemo(
    () => rows.filter((row) => filter === 'all' || row.entry.status === filter),
    [rows, filter],
  );

  const playingRows = useMemo(
    () => rows.filter((row) => row.entry.status === 'playing'),
    [rows],
  );

  const recentRows = useMemo(() => {
    const sorted = [...rows].sort((a, b) => b.entry.addedAt - a.entry.addedAt);
    return showAllRecent ? sorted : sorted.slice(0, RECENT_LIMIT);
  }, [rows, showAllRecent]);

  const { games: recentlyPlayed } = useResolvedGames(recentlyViewedIds);

  const filterOptions: {
    value: FilterValue;
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
    image?: { active: ImageSource; inactive: ImageSource };
  }[] = [
    { value: 'all', label: 'All', icon: 'grid', image: TAB_ALL_IMAGE },
    ...GAME_STATUSES.map((status) => ({
      value: status,
      label: STATUS_LABEL[status],
      icon: STATUS_ICON[status],
      image: STATUS_TAB_IMAGE[status],
    })),
  ];

  function renderList(list: typeof rows) {
    return (
      <View style={styles.card}>
        {list.map((row, index) => {
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
              style={[styles.cardRow, index === list.length - 1 && styles.cardRowLast]}
            >
              {isUpcoming ? <PreorderPill /> : <StatusPill status={row.entry.status} />}
            </GameRow>
          );
        })}
      </View>
    );
  }

  return (
    <Screen background={colors.surface} fadeBottom={false}>
      <View style={styles.tabsWrap}>
        <SegmentedTabs options={filterOptions} value={filter} onChange={setFilter} />
      </View>

      {rows.length === 0 ? (
        <EmptyState
          title="Your library is empty"
          description="Tap the search button below to add a game to your library."
        />
      ) : filter !== 'all' ? (
        filteredRows.length === 0 ? (
          <EmptyState title="No games in this status" description="Try a different filter." />
        ) : (
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {renderList(filteredRows)}
          </ScrollView>
        )
      ) : (
        <ScrollView contentContainerStyle={styles.sections} showsVerticalScrollIndicator={false}>
          {playingRows.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <View style={styles.sectionHeaderLeft}>
                  <Image source={SECTION_PLAYING_ICON} style={styles.sectionIcon} contentFit="contain" />
                  <Text style={styles.sectionLabel}>Currently playing</Text>
                </View>
                <Image source={SECTION_MENU_ICON} style={styles.sectionMenuIcon} contentFit="contain" />
              </View>
              {renderList(playingRows)}
            </View>
          )}

          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionHeaderLeft}>
                <Image source={SECTION_ADDED_ICON} style={styles.sectionIcon} contentFit="contain" />
                <Text style={styles.sectionLabel}>Recently added</Text>
              </View>
              {rows.length > RECENT_LIMIT && (
                <Pressable onPress={() => setShowAllRecent((value) => !value)}>
                  <Text style={styles.seeAll}>{showAllRecent ? 'Show less' : 'See all'}</Text>
                </Pressable>
              )}
            </View>
            {renderList(recentRows)}
          </View>

          {recentlyPlayed.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Recently Played</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.recentlyPlayedRow}
              >
                {recentlyPlayed.map((game) => (
                  <Pressable
                    key={game.id}
                    style={styles.recentlyPlayedCard}
                    onPress={() => navigation.navigate('GameDetail', { catalogId: game.id })}
                  >
                    <GameCover
                      abbreviation={game.abbreviation}
                      colorKey={game.colorKey}
                      imageUrl={game.coverImageUrl}
                      size={64}
                      style={styles.recentlyPlayedCover}
                    />
                    <Text style={styles.recentlyPlayedTitle} numberOfLines={2}>
                      {game.title}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          )}
        </ScrollView>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  tabsWrap: {
    marginBottom: spacing.sm,
  },
  sections: {
    gap: spacing.lg,
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
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
  },
  sectionIcon: {
    width: 16,
    height: 16,
  },
  sectionMenuIcon: {
    width: 18,
    height: 16,
  },
  sectionLabel: {
    color: '#888888',
    fontSize: 14,
    fontWeight: '500',
  },
  seeAll: {
    color: colors.accent,
    fontWeight: '700',
    fontSize: 13,
  },
  scrollContent: {
    paddingBottom: NAV_CLEARANCE,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  cardRow: {
    backgroundColor: colors.background,
    borderRadius: 0,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    marginBottom: 2,
  },
  cardRowLast: {
    marginBottom: 0,
  },
  recentlyPlayedRow: {
    gap: spacing.sm,
  },
  recentlyPlayedCard: {
    width: 132,
    backgroundColor: colors.background,
    borderRadius: radii.md,
    padding: spacing.sm,
    gap: spacing.sm,
  },
  recentlyPlayedCover: {
    borderRadius: 6,
  },
  recentlyPlayedTitle: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '500',
  },
});
