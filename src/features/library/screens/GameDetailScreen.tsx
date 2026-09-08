import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Screen } from '../../../shared/components/Screen';
import { Button } from '../../../shared/components/Button';
import { GameCover } from '../../../shared/components/GameCover';
import { SegmentedTabs } from '../../../shared/components/SegmentedTabs';
import { RatingScale } from '../../../shared/components/RatingScale';
import { LabeledInput } from '../../../shared/components/LabeledInput';
import { colors, spacing, typography } from '../../../shared/theme/theme';
import { findCatalogGame, type CatalogGame } from '../../../data/catalog';
import { resolveCatalogGame } from '../../../services/catalog/unifiedCatalog';
import { useLibraryStore } from '../store/useLibraryStore';
import { useWishlistStore } from '../../wishlist/store/useWishlistStore';
import { useRecentlyViewedStore } from '../../addGame/store/useRecentlyViewedStore';
import { GAME_STATUSES, STATUS_LABEL } from '../types';
import { STATUS_ICON } from '../../../shared/types/status';
import type { RootScreenProps } from '../../../core/navigation/types';

type Props = RootScreenProps<'GameDetail'>;

const statusOptions = GAME_STATUSES.map((status) => ({
  value: status,
  label: STATUS_LABEL[status],
  icon: STATUS_ICON[status],
}));

export function GameDetailScreen({ route }: Props) {
  const { catalogId } = route.params;
  const [game, setGame] = useState<CatalogGame | undefined>(() => findCatalogGame(catalogId));
  const [loading, setLoading] = useState(!game);

  useEffect(() => {
    if (game) return;
    let cancelled = false;
    setLoading(true);
    resolveCatalogGame(catalogId).then((resolved) => {
      if (cancelled) return;
      setGame(resolved);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [catalogId, game]);

  const entry = useLibraryStore((state) => state.getEntry(catalogId));
  const addToLibrary = useLibraryStore((state) => state.addGame);
  const setStatus = useLibraryStore((state) => state.setStatus);
  const setRating = useLibraryStore((state) => state.setRating);
  const setNotes = useLibraryStore((state) => state.setNotes);
  const setHoursPlayed = useLibraryStore((state) => state.setHoursPlayed);

  const isWishlisted = useWishlistStore((state) => state.isWishlisted(catalogId));
  const addToWishlist = useWishlistStore((state) => state.addGame);
  const recordView = useRecentlyViewedStore((state) => state.recordView);

  const [hoursDraft, setHoursDraft] = useState(entry?.hoursPlayed?.toString() ?? '');

  useEffect(() => {
    if (game) recordView(catalogId);
  }, [catalogId, game, recordView]);

  if (!game) {
    return (
      <Screen>
        {loading ? (
          <ActivityIndicator color={colors.accent} style={styles.spacerTop} />
        ) : (
          <Text style={typography.subheading}>Game not found</Text>
        )}
      </Screen>
    );
  }

  function handleMarkBeaten() {
    if (!entry) {
      addToLibrary(catalogId);
    }
    setStatus(catalogId, 'beaten');
  }

  function handleShare() {
    Alert.alert('Share', `Share sheet for ${game!.title} goes here.`);
  }

  function commitHours() {
    const parsed = Number(hoursDraft);
    setHoursPlayed(catalogId, hoursDraft.trim() === '' || Number.isNaN(parsed) ? null : parsed);
  }

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <GameCover
            abbreviation={game.abbreviation}
            colorKey={game.colorKey}
            imageUrl={game.coverImageUrl}
            size={96}
          />
          <View style={styles.headerInfo}>
            <Text style={typography.heading}>{game.title}</Text>
            <Text style={typography.body}>
              {game.platform} · {game.genre}
              {game.year ? ` · ${game.year}` : ''}
            </Text>
          </View>
        </View>

        {entry ? (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Status</Text>
              <SegmentedTabs
                options={statusOptions}
                value={entry.status}
                onChange={(status) => setStatus(catalogId, status)}
              />
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Your rating · out of 10</Text>
              <RatingScale value={entry.rating} onChange={(rating) => setRating(catalogId, rating)} />
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Time to beat · your hours</Text>
              <LabeledInput
                value={hoursDraft}
                onChangeText={setHoursDraft}
                onBlur={commitHours}
                placeholder="e.g. 42"
                keyboardType="decimal-pad"
              />
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Notes</Text>
              <LabeledInput
                value={entry.notes}
                onChangeText={(text) => setNotes(catalogId, text)}
                placeholder="Private notes and review — only you see this."
                multiline
              />
            </View>

            {game.pcRequirements && (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>PC requirements</Text>
                <View style={styles.requirementRow}>
                  <Text style={styles.requirementLabel}>Minimum</Text>
                  <Text style={typography.body}>{game.pcRequirements.minimum}</Text>
                </View>
                <View style={styles.requirementRow}>
                  <Text style={styles.requirementLabel}>Recommended</Text>
                  <Text style={typography.body}>{game.pcRequirements.recommended}</Text>
                </View>
              </View>
            )}

            <Button
              label={entry.status === 'beaten' ? 'Completed' : 'Mark as completed'}
              onPress={handleMarkBeaten}
              disabled={entry.status === 'beaten'}
              style={styles.spacerTop}
            />
          </>
        ) : (
          <View style={styles.section}>
            <Button label="Add to library" onPress={() => addToLibrary(catalogId)} />
            {!isWishlisted && (
              <Button
                label="Add to wishlist"
                onPress={() => addToWishlist(catalogId)}
                variant="secondary"
                style={styles.spacerTop}
              />
            )}
          </View>
        )}

        <Button label="Share" onPress={handleShare} variant="secondary" style={styles.spacerTop} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.lg,
    paddingBottom: spacing.xl,
  },
  headerRow: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
  },
  headerInfo: {
    flex: 1,
    gap: spacing.xs,
  },
  section: {
    gap: spacing.sm,
  },
  sectionLabel: {
    color: colors.textFaint,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  spacerTop: {
    marginTop: spacing.sm,
  },
  requirementRow: {
    gap: 2,
  },
  requirementLabel: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 13,
  },
});
