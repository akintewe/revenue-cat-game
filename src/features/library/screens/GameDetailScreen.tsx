import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '../../../shared/components/Button';
import { GameCover } from '../../../shared/components/GameCover';
import { PlatformIcon } from '../../../shared/components/PlatformIcon';
import { SegmentedTabs } from '../../../shared/components/SegmentedTabs';
import { RatingScale } from '../../../shared/components/RatingScale';
import { LabeledInput } from '../../../shared/components/LabeledInput';
import { colors, coverColors, radii, spacing, typography } from '../../../shared/theme/theme';
import { findCatalogGame, type CatalogGame } from '../../../data/catalog';
import { resolveCatalogGame } from '../../../services/catalog/unifiedCatalog';
import { useLibraryStore } from '../store/useLibraryStore';
import { useWishlistStore } from '../../wishlist/store/useWishlistStore';
import { useRecentlyViewedStore } from '../../addGame/store/useRecentlyViewedStore';
import { GAME_STATUSES, STATUS_LABEL } from '../types';
import { STATUS_ICON } from '../../../shared/types/status';
import type { RootScreenProps } from '../../../core/navigation/types';

const HERO_HEIGHT = 400;

type Props = RootScreenProps<'GameDetail'>;

const statusOptions = GAME_STATUSES.map((status) => ({
  value: status,
  label: STATUS_LABEL[status],
  icon: STATUS_ICON[status],
}));

export function GameDetailScreen({ route, navigation }: Props) {
  const { catalogId } = route.params;
  const insets = useSafeAreaInsets();
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
      <View style={[styles.root, styles.centered]}>
        {loading ? (
          <ActivityIndicator color={colors.accent} />
        ) : (
          <Text style={typography.subheading}>Game not found</Text>
        )}
      </View>
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

  const coverBackground = coverColors[game.colorKey] ?? coverColors.slate;

  return (
    <View style={styles.root}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={[styles.hero, { backgroundColor: coverBackground }]}>
          {game.coverImageUrl && (
            <Image
              source={{ uri: game.coverImageUrl }}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              blurRadius={22}
            />
          )}
          <LinearGradient
            colors={['rgba(9,9,9,0.05)', 'rgba(9,9,9,0.1)', 'rgba(9,9,9,0.75)', colors.background]}
            locations={[0, 0.4, 0.82, 1]}
            style={StyleSheet.absoluteFill}
          />

          <View style={[styles.heroTopRow, { paddingTop: insets.top + spacing.sm }]}>
            <Pressable style={styles.heroIconButton} onPress={() => navigation.goBack()} hitSlop={10}>
              <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
              <Ionicons name="chevron-back" size={20} color={colors.text} />
            </Pressable>
            <Pressable style={styles.heroIconButton} onPress={handleShare} hitSlop={10}>
              <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
              <Ionicons name="share-outline" size={19} color={colors.text} />
            </Pressable>
          </View>

          <View style={styles.heroPosterWrap}>
            <GameCover
              abbreviation={game.abbreviation}
              colorKey={game.colorKey}
              imageUrl={game.coverImageUrl}
              size={132}
              style={styles.heroPoster}
            />
          </View>
        </View>

        <View style={styles.content}>
          <View style={styles.titleBlock}>
            <Text style={styles.title}>{game.title}</Text>
            <View style={styles.metaRow}>
              <PlatformIcon platform={game.platform} size={14} color={colors.textMuted} />
              <Text style={styles.metaText}>{game.platform}</Text>
              <Text style={styles.metaDot}>·</Text>
              <Text style={styles.metaText}>{game.genre}</Text>
              {game.year && (
                <>
                  <Text style={styles.metaDot}>·</Text>
                  <Text style={styles.metaText}>{game.year}</Text>
                </>
              )}
            </View>

            {(game.criticScore || game.timeToBeatHours) && (
              <View style={styles.statRow}>
                {game.criticScore && (
                  <View style={styles.statChip}>
                    <Ionicons name="star" size={13} color={colors.accent} />
                    <Text style={styles.statChipText}>{game.criticScore}</Text>
                    <Text style={styles.statChipSub}>IGDB</Text>
                  </View>
                )}
                {game.timeToBeatHours && (
                  <View style={styles.statChip}>
                    <Ionicons name="time-outline" size={13} color={colors.textMuted} />
                    <Text style={styles.statChipText}>{Math.round(game.timeToBeatHours)}h</Text>
                    <Text style={styles.statChipSub}>to beat</Text>
                  </View>
                )}
              </View>
            )}

            {game.coverImageUrl && <Text style={styles.attribution}>Game data and cover art from IGDB.com</Text>}
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
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingBottom: spacing.xl,
  },
  hero: {
    height: HERO_HEIGHT,
    overflow: 'hidden',
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
  },
  heroIconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  heroPosterWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: spacing.lg,
  },
  heroPoster: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.45,
    shadowRadius: 20,
    elevation: 10,
  },
  content: {
    gap: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  titleBlock: {
    gap: spacing.sm,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  metaText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '500',
  },
  metaDot: {
    color: colors.textFaint,
    fontSize: 13,
  },
  statRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  statChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  statChipText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  statChipSub: {
    color: colors.textFaint,
    fontSize: 11,
    fontWeight: '600',
  },
  attribution: {
    color: colors.textFaint,
    fontSize: 10,
    marginTop: spacing.xs,
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
