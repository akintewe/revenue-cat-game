import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { Screen } from '../../../shared/components/Screen';
import { GameRow } from '../../../shared/components/GameRow';
import { EmptyState } from '../../../shared/components/EmptyState';
import { GamePreviewModal } from '../../../shared/components/GamePreviewModal';
import { colors, radii, spacing, typography } from '../../../shared/theme/theme';
import { formatReleaseLabel, formatShortDate } from '../../../shared/utils/formatDate';
import { fetchWatchedGames } from '../../../services/catalog/unifiedCatalog';
import { deleteGameWatch } from '../../../services/events/remoteGameWatches';
import { fetchSeasonalChallenges } from '../../../services/events/remoteChallenges';
import { useLibraryStore } from '../../library/store/useLibraryStore';
import type { WatchedGame, SeasonalChallenge, ChallengeStatus } from '../types';
import type { CatalogGame } from '../../../data/catalog';
import type { RootScreenProps } from '../../../core/navigation/types';

type Props = RootScreenProps<'Events'>;

const STATUS_META: Record<ChallengeStatus, { label: string; color: string }> = {
  active: { label: 'Active', color: colors.success },
  upcoming: { label: 'Upcoming', color: colors.info },
  ended: { label: 'Ended', color: colors.textFaint },
};

export function EventsScreen({ navigation }: Props) {
  const [watching, setWatching] = useState<WatchedGame[]>([]);
  const [watchingLoading, setWatchingLoading] = useState(true);
  const [challenges, setChallenges] = useState<SeasonalChallenge[]>([]);
  const [challengesLoading, setChallengesLoading] = useState(true);
  const [previewGame, setPreviewGame] = useState<CatalogGame | null>(null);

  const entries = useLibraryStore((state) => state.entries);
  const addGame = useLibraryStore((state) => state.addGame);
  const libraryIds = useMemo(() => new Set(entries.map((entry) => entry.catalogId)), [entries]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      fetchWatchedGames()
        .then((rows) => {
          if (!cancelled) setWatching(rows);
        })
        .catch(() => undefined)
        .finally(() => {
          if (!cancelled) setWatchingLoading(false);
        });
      fetchSeasonalChallenges()
        .then((rows) => {
          if (!cancelled) setChallenges(rows);
        })
        .catch(() => undefined)
        .finally(() => {
          if (!cancelled) setChallengesLoading(false);
        });
      return () => {
        cancelled = true;
      };
    }, []),
  );

  function handleUnwatch(catalogId: string) {
    const previous = watching;
    setWatching((prev) => prev.filter((row) => row.game.id !== catalogId));
    deleteGameWatch(catalogId).catch((err) => {
      console.warn('[events] unwatch failed', err);
      setWatching(previous);
    });
  }

  return (
    <Screen fadeBottom>
      <Text style={typography.heading}>Events</Text>
      <Text style={[typography.body, styles.subtitle]}>Challenges and games you're watching for release.</Text>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Seasonal Challenges</Text>
          {challengesLoading ? (
            <ActivityIndicator color={colors.accent} style={styles.loading} />
          ) : challenges.length === 0 ? (
            <Text style={styles.emptyText}>No challenges right now — check back soon.</Text>
          ) : (
            <View style={styles.challengeList}>
              {challenges.map((challenge) => (
                <ChallengeCard key={challenge.id} challenge={challenge} />
              ))}
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Watching</Text>
          {watchingLoading ? (
            <ActivityIndicator color={colors.accent} style={styles.loading} />
          ) : watching.length === 0 ? (
            <EmptyState
              title="Nothing watched yet"
              description="Watch a game from its detail page to get notified when it releases."
            />
          ) : (
            <View style={styles.watchList}>
              {watching.map((row, index) => (
                <GameRow
                  key={row.game.id}
                  title={row.game.title}
                  platform={row.game.platform}
                  detail={formatReleaseLabel(row.game.releaseDate)}
                  abbreviation={row.game.abbreviation}
                  colorKey={row.game.colorKey}
                  imageUrl={row.game.coverImageUrl}
                  onPress={() => navigation.navigate('GameDetail', { catalogId: row.game.id })}
                  onLongPress={() => setPreviewGame(row.game)}
                  style={[styles.watchRow, index === watching.length - 1 && styles.watchRowLast]}
                >
                  <Pressable onPress={() => handleUnwatch(row.game.id)} hitSlop={8} style={styles.unwatchButton}>
                    <Ionicons name="bookmark" size={18} color={colors.accent} />
                  </Pressable>
                </GameRow>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      <GamePreviewModal
        game={previewGame}
        visible={!!previewGame}
        isOwned={previewGame ? libraryIds.has(previewGame.id) : false}
        onClose={() => setPreviewGame(null)}
        onViewDetails={() => {
          if (!previewGame) return;
          const catalogId = previewGame.id;
          setPreviewGame(null);
          navigation.navigate('GameDetail', { catalogId });
        }}
        onAdd={async () => {
          if (!previewGame) return;
          const catalogId = previewGame.id;
          setPreviewGame(null);
          const { limitReached } = await addGame(catalogId);
          if (limitReached) navigation.navigate('Paywall', { pendingGameId: catalogId });
        }}
      />
    </Screen>
  );
}

function ChallengeCard({ challenge }: { challenge: SeasonalChallenge }) {
  const meta = STATUS_META[challenge.status];
  const { count, target } = challenge.myProgress;
  const progressPct = target > 0 ? Math.min(1, count / target) : 0;

  return (
    <View style={styles.challengeCard}>
      <View style={styles.challengeHeaderRow}>
        <Text style={styles.challengeTitle}>{challenge.title}</Text>
        <View style={[styles.statusPill, { backgroundColor: meta.color }]}>
          <Text style={styles.statusPillText}>{meta.label}</Text>
        </View>
      </View>
      <Text style={styles.challengeDescription}>{challenge.description}</Text>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progressPct * 100}%` }]} />
      </View>
      <View style={styles.challengeFooterRow}>
        <Text style={styles.challengeProgressText}>
          {count}/{target}
        </Text>
        <Text style={styles.challengeDates}>
          {formatShortDate(challenge.startDate)} – {formatShortDate(challenge.endDate)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  subtitle: {
    marginBottom: spacing.lg,
  },
  scrollContent: {
    paddingBottom: spacing.xl,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    ...typography.subheading,
    marginBottom: spacing.sm,
  },
  loading: {
    marginTop: spacing.md,
  },
  emptyText: {
    ...typography.body,
    color: colors.textFaint,
  },
  challengeList: {
    gap: spacing.sm,
  },
  challengeCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: spacing.xs,
  },
  challengeHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  challengeTitle: {
    ...typography.subheading,
    flexShrink: 1,
  },
  statusPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radii.pill,
  },
  statusPillText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  challengeDescription: {
    ...typography.body,
    fontSize: 13,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.surfaceAlt,
    overflow: 'hidden',
    marginTop: spacing.xs,
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: colors.accent,
  },
  challengeFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  challengeProgressText: {
    color: colors.textFaint,
    fontSize: 12,
    fontWeight: '700',
  },
  challengeDates: {
    color: colors.textFaint,
    fontSize: 11,
  },
  watchList: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
  },
  watchRow: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  watchRowLast: {
    borderBottomWidth: 0,
  },
  unwatchButton: {
    padding: spacing.xs,
  },
});
