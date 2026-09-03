import React, { useMemo } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../../../shared/components/Screen';
import { GameRow } from '../../../shared/components/GameRow';
import { EmptyState } from '../../../shared/components/EmptyState';
import { colors, spacing, typography } from '../../../shared/theme/theme';
import { useResponsiveLayout } from '../../../shared/hooks/useResponsiveLayout';
import { findCatalogGame } from '../../../data/catalog';
import { formatReleaseLabel } from '../../../shared/utils/formatDate';
import { useWishlistStore } from '../store/useWishlistStore';
import type { TabScreenProps } from '../../../core/navigation/types';

type Props = TabScreenProps<'WishlistTab'>;

export function WishlistScreen({ navigation }: Props) {
  const entries = useWishlistStore((state) => state.entries);
  const toggleReminder = useWishlistStore((state) => state.toggleReminder);
  const { columns } = useResponsiveLayout();

  const rows = useMemo(
    () =>
      entries
        .map((entry) => ({ entry, game: findCatalogGame(entry.catalogId) }))
        .filter((row): row is { entry: typeof row.entry; game: NonNullable<typeof row.game> } =>
          Boolean(row.game),
        ),
    [entries],
  );

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={typography.heading}>Wishlist</Text>
        <Text style={typography.body}>
          {entries.length} game{entries.length === 1 ? '' : 's'} · {entries.filter((e) => e.reminderEnabled).length}{' '}
          reminders armed
        </Text>
      </View>

      {rows.length === 0 ? (
        <EmptyState
          title="Nothing on your wishlist"
          description="Open a game's detail page to add it to your wishlist."
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
              subtitle={`${item.game.platform} · ${formatReleaseLabel(item.game.releaseDate)}`}
              abbreviation={item.game.abbreviation}
              colorKey={item.game.colorKey}
              imageUrl={item.game.coverImageUrl}
              onPress={() =>
                navigation.navigate('GameDetail', { catalogId: item.entry.catalogId })
              }
              style={columns > 1 ? styles.gridItem : undefined}
            >
              <Pressable
                onPress={() => toggleReminder(item.entry.catalogId)}
                hitSlop={8}
                style={styles.bell}
              >
                <Ionicons
                  name={item.entry.reminderEnabled ? 'notifications' : 'notifications-outline'}
                  size={20}
                  color={item.entry.reminderEnabled ? colors.accent : colors.textMuted}
                />
              </Pressable>
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
    gap: 2,
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
  bell: {
    padding: spacing.xs,
  },
});
