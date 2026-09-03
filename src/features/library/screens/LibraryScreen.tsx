import React, { useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { Screen } from '../../../shared/components/Screen';
import { GameRow } from '../../../shared/components/GameRow';
import { StatusPill } from '../../../shared/components/StatusPill';
import { SegmentedTabs } from '../../../shared/components/SegmentedTabs';
import { EmptyState } from '../../../shared/components/EmptyState';
import { spacing, typography } from '../../../shared/theme/theme';
import { useResponsiveLayout } from '../../../shared/hooks/useResponsiveLayout';
import { useLibraryStore } from '../store/useLibraryStore';
import { GAME_STATUSES, STATUS_LABEL, type GameStatus } from '../types';
import { findCatalogGame } from '../../../data/catalog';
import type { TabScreenProps } from '../../../core/navigation/types';

type FilterValue = 'all' | GameStatus;

type Props = TabScreenProps<'LibraryTab'>;

export function LibraryScreen({ navigation }: Props) {
  const [filter, setFilter] = useState<FilterValue>('all');
  const entries = useLibraryStore((state) => state.entries);
  const { columns } = useResponsiveLayout();

  const rows = useMemo(() => {
    return entries
      .map((entry) => ({ entry, game: findCatalogGame(entry.catalogId) }))
      .filter((row): row is { entry: typeof row.entry; game: NonNullable<typeof row.game> } =>
        Boolean(row.game),
      )
      .filter((row) => filter === 'all' || row.entry.status === filter);
  }, [entries, filter]);

  const filterOptions = [
    { value: 'all' as const, label: 'All' },
    ...GAME_STATUSES.map((status) => ({ value: status, label: STATUS_LABEL[status] })),
  ];

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={typography.heading}>Your Library</Text>
      </View>

      <SegmentedTabs options={filterOptions} value={filter} onChange={setFilter} />

      {rows.length === 0 ? (
        <EmptyState
          title={entries.length === 0 ? 'Your library is empty' : 'No games in this status'}
          description={
            entries.length === 0
              ? 'Add a game from the Add tab to start tracking your backlog.'
              : 'Try a different filter or add more games.'
          }
        />
      ) : (
        <FlatList
          key={columns}
          data={rows}
          keyExtractor={(row) => row.entry.catalogId}
          numColumns={columns}
          columnWrapperStyle={columns > 1 ? styles.columnWrapper : undefined}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <GameRow
              title={item.game.title}
              subtitle={`${item.game.platform} · ${item.game.year}`}
              abbreviation={item.game.abbreviation}
              colorKey={item.game.colorKey}
              imageUrl={item.game.coverImageUrl}
              onPress={() => navigation.navigate('GameDetail', { catalogId: item.entry.catalogId })}
              style={columns > 1 ? styles.gridItem : undefined}
            >
              <StatusPill status={item.entry.status} />
            </GameRow>
          )}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom: spacing.md,
  },
  list: {
    gap: spacing.sm,
    paddingBottom: spacing.lg,
  },
  columnWrapper: {
    gap: spacing.sm,
  },
  gridItem: {
    flex: 1,
  },
});
