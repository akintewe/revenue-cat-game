import React, { useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../../../shared/components/Screen';
import { GameCover } from '../../../shared/components/GameCover';
import { EmptyState } from '../../../shared/components/EmptyState';
import { colors, radii, spacing, typography } from '../../../shared/theme/theme';
import { searchCatalog } from '../../../data/catalog';
import { useLibraryStore, FREE_TIER_GAME_LIMIT } from '../../library/store/useLibraryStore';

export function AddGameScreen() {
  const [query, setQuery] = useState('');
  const entries = useLibraryStore((state) => state.entries);
  const isInLibrary = useLibraryStore((state) => state.isInLibrary);
  const addGame = useLibraryStore((state) => state.addGame);

  const results = useMemo(() => searchCatalog(query), [query]);

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
    <Screen>
      <Text style={typography.heading}>Add a Game</Text>

      <View style={styles.searchBar}>
        <Ionicons name="search" size={18} color={colors.textMuted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search for a game"
          placeholderTextColor={colors.textFaint}
          style={styles.searchInput}
          autoCorrect={false}
        />
        {query.length > 0 && (
          <Pressable onPress={() => setQuery('')} hitSlop={8}>
            <Ionicons name="close-circle" size={18} color={colors.textMuted} />
          </Pressable>
        )}
      </View>

      {query.trim().length === 0 ? (
        <EmptyState
          title="Find something to play"
          description="Search by title to add a game to your library."
        />
      ) : results.length === 0 ? (
        <EmptyState title="No results" description={`Nothing matches "${query}".`} />
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => {
            const added = isInLibrary(item.id);
            return (
              <View style={styles.row}>
                <GameCover abbreviation={item.abbreviation} colorKey={item.colorKey} size={44} />
                <View style={styles.info}>
                  <Text style={typography.subheading} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={typography.body} numberOfLines={1}>
                    {item.year} · {item.platform}
                  </Text>
                </View>
                <Pressable
                  onPress={() => handleAdd(item.id)}
                  disabled={added}
                  style={[styles.addButton, added && styles.addButtonDone]}
                >
                  <Ionicons
                    name={added ? 'checkmark' : 'add'}
                    size={20}
                    color={added ? colors.success : colors.text}
                  />
                </Pressable>
              </View>
            );
          }}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    paddingVertical: spacing.sm + 2,
    fontSize: 15,
  },
  list: {
    gap: spacing.sm,
    paddingBottom: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.sm,
  },
  info: {
    flex: 1,
    gap: 2,
  },
  addButton: {
    width: 32,
    height: 32,
    borderRadius: radii.pill,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonDone: {
    backgroundColor: colors.surfaceAlt,
  },
});
