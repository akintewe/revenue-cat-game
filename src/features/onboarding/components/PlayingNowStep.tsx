import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { CatalogGame } from '../../../data/catalog';
import { resolveCatalogGame } from '../../../services/catalog/unifiedCatalog';
import { GameCover } from '../../../shared/components/GameCover';
import { colors, spacing, typography } from '../../../shared/theme/theme';
import { hapticSelection } from '../../../shared/utils/haptics';
import { useLibraryStore } from '../../library/store/useLibraryStore';
import type { GameStatus, LibraryEntry } from '../../library/types';

const MAX_SHOWN = 18;
const IMPORTED = new Set<LibraryEntry['sourceKind']>(['steam', 'xbox', 'psn', 'android']);

/** Imported games, the ones most likely to be in play first: most hours, then most recent. */
export function importedEntries(entries: LibraryEntry[]): LibraryEntry[] {
  return entries
    .filter((entry) => IMPORTED.has(entry.sourceKind))
    .sort((a, b) => (b.hoursPlayed ?? 0) - (a.hoursPlayed ?? 0) || b.addedAt - a.addedAt);
}

/**
 * After an import the library is already full, so the "pick 3 games" page has nothing to do.
 * It asks the one thing an import cannot know: which of these are you playing right now?
 * There is no minimum, and every tap saves at once.
 */
export function PlayingNowStep() {
  const entries = useLibraryStore((state) => state.entries);
  const setStatus = useLibraryStore((state) => state.setStatus);
  const shown = useMemo(() => importedEntries(entries).slice(0, MAX_SHOWN), [entries]);
  const total = useMemo(() => importedEntries(entries).length, [entries]);
  const [games, setGames] = useState<Record<string, CatalogGame>>({});
  // What each game was before the tap, so a second tap puts it back.
  const [before, setBefore] = useState<Record<string, GameStatus>>({});

  const ids = shown.map((entry) => entry.catalogId).join('|');
  useEffect(() => {
    let cancelled = false;
    Promise.allSettled(ids.split('|').filter(Boolean).map((id) => resolveCatalogGame(id, { track: false }))).then((results) => {
      if (cancelled) return;
      const next: Record<string, CatalogGame> = {};
      for (const result of results) if (result.status === 'fulfilled' && result.value) next[result.value.id] = result.value;
      setGames(next);
    });
    return () => {
      cancelled = true;
    };
  }, [ids]);

  function toggle(entry: LibraryEntry) {
    hapticSelection();
    if (entry.status === 'playing') {
      void setStatus(entry.catalogId, before[entry.catalogId] ?? 'backlog');
    } else {
      setBefore((previous) => ({ ...previous, [entry.catalogId]: entry.status }));
      void setStatus(entry.catalogId, 'playing');
    }
  }

  return (
    <View style={styles.body}>
      <Text style={styles.title}>What are you playing right now?</Text>
      <Text style={styles.subtitle}>
        {total.toLocaleString()} {total === 1 ? 'game is' : 'games are'} in your library. Tap the ones you are in the middle of.
      </Text>
      <ScrollView contentContainerStyle={styles.grid} showsVerticalScrollIndicator={false}>
        {shown.map((entry) => {
          const game = games[entry.catalogId];
          if (!game) return null;
          const playing = entry.status === 'playing';
          return (
            <Pressable
              key={entry.catalogId}
              onPress={() => toggle(entry)}
              accessibilityRole="button"
              accessibilityState={{ selected: playing }}
              accessibilityLabel={game.title}
            >
              <View style={[styles.coverWrap, playing && styles.coverWrapSelected]}>
                <GameCover
                  abbreviation={game.abbreviation}
                  colorKey={game.colorKey}
                  imageUrl={game.coverImageUrl}
                  size={104}
                  style={!playing ? styles.coverDim : undefined}
                />
                {playing && (
                  <View style={styles.check}>
                    <Ionicons name="play" size={11} color="#FFFFFF" />
                  </View>
                )}
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, paddingHorizontal: spacing.lg, paddingTop: spacing.xl },
  title: { ...typography.heading, fontSize: 24 },
  subtitle: { color: colors.textMuted, fontSize: 13, marginTop: 4, marginBottom: spacing.lg },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, paddingBottom: spacing.xl },
  coverWrap: { borderRadius: 10, borderWidth: 2, borderColor: 'transparent' },
  coverWrapSelected: { borderColor: '#FFFFFF' },
  coverDim: { opacity: 0.8 },
  check: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
