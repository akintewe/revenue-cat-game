import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GameCover } from '../../../shared/components/GameCover';
import { PlatformIcon } from '../../../shared/components/PlatformIcon';
import { EmptyState } from '../../../shared/components/EmptyState';
import { colors, discoverColors, radii, spacing, typography } from '../../../shared/theme/theme';
import type { CatalogGame } from '../../../data/catalog';
import { resolveShare, confirmShare, type ShareResolution } from '../../../services/social/share';
import { useLibraryStore } from '../../library/store/useLibraryStore';
import type { RootScreenProps } from '../../../core/navigation/types';

type Props = RootScreenProps<'ShareConfirm'>;

const PROVIDER_LABEL: Record<string, string> = {
  tiktok: 'TikTok',
  youtube: 'YouTube',
  other: 'that link',
};

export function ShareConfirmScreen({ route, navigation }: Props) {
  const { url } = route.params;
  const [resolution, setResolution] = useState<ShareResolution | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [showAllCandidates, setShowAllCandidates] = useState(false);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    let cancelled = false;
    resolveShare(url)
      .then((res) => {
        if (cancelled) return;
        setResolution(res);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Could not read that link');
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [url]);

  async function handleConfirm(game: CatalogGame) {
    if (!resolution || confirmingId) return;
    setConfirmingId(game.id);
    try {
      await confirmShare(resolution.intakeId, game.id);
      await useLibraryStore.getState().hydrate();
      navigation.replace('GameDetail', { catalogId: game.id });
    } catch (err) {
      setConfirmingId(null);
      setError(err instanceof Error ? err.message : 'Could not add that game');
    }
  }

  const providerLabel = resolution?.provider ? PROVIDER_LABEL[resolution.provider] ?? 'that link' : 'that link';
  const topCandidate = resolution?.candidates[0];
  const restCandidates = resolution?.candidates.slice(1) ?? [];
  const showConfident = Boolean(resolution?.confident && topCandidate && !showAllCandidates);

  return (
    <View style={styles.root}>
      <View style={styles.safeArea}>
        <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
          <Pressable onPress={() => navigation.goBack()} hitSlop={12} style={styles.closeButton}>
            <Ionicons name="close" size={20} color={colors.text} />
          </Pressable>
          <Text style={styles.title}>Add from {providerLabel}</Text>
        </View>

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator color={colors.accent} />
            <Text style={styles.loadingText}>Reading your link…</Text>
          </View>
        ) : error ? (
          <EmptyState title="Something went wrong" description={error} />
        ) : !resolution ? null : (
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            {resolution.extractedText && (
              <Text style={styles.extractedText}>We read this from your link: "{resolution.extractedText}"</Text>
            )}

            {resolution.candidates.length === 0 ? (
              <EmptyState
                title="Couldn't find a match"
                description="We saved your link, but couldn't tell which game it was. Search for it instead."
              />
            ) : showConfident && topCandidate ? (
              <>
                <View style={styles.confidentCard}>
                  <GameCover
                    abbreviation={topCandidate.abbreviation}
                    colorKey={topCandidate.colorKey}
                    imageUrl={topCandidate.coverImageUrl}
                    size={160}
                    style={styles.confidentCover}
                  />
                  <Text style={styles.confidentTitle}>{topCandidate.title}</Text>
                  <View style={styles.metaRow}>
                    <PlatformIcon platform={topCandidate.platform} size={14} color={colors.textMuted} />
                    <Text style={styles.metaText}>
                      {topCandidate.platform}
                      {topCandidate.year ? ` · ${topCandidate.year}` : ''}
                    </Text>
                  </View>
                  <Pressable
                    style={[styles.confirmButton, confirmingId === topCandidate.id && styles.confirmButtonDisabled]}
                    onPress={() => handleConfirm(topCandidate)}
                    disabled={confirmingId === topCandidate.id}
                  >
                    <Text style={styles.confirmButtonText}>
                      {confirmingId === topCandidate.id ? 'Adding…' : 'Add to library'}
                    </Text>
                  </Pressable>
                </View>
                {restCandidates.length > 0 && (
                  <Pressable onPress={() => setShowAllCandidates(true)} hitSlop={8} style={styles.notThisButton}>
                    <Text style={styles.notThisText}>Not this one? See other matches</Text>
                  </Pressable>
                )}
              </>
            ) : (
              <View style={styles.list}>
                <Text style={styles.listLabel}>Which game is this?</Text>
                {resolution.candidates.map((game) => (
                  <Pressable
                    key={game.id}
                    style={styles.candidateRow}
                    onPress={() => handleConfirm(game)}
                    disabled={Boolean(confirmingId)}
                  >
                    <GameCover
                      abbreviation={game.abbreviation}
                      colorKey={game.colorKey}
                      imageUrl={game.coverImageUrl}
                      size={56}
                    />
                    <View style={styles.candidateInfo}>
                      <Text style={styles.candidateTitle} numberOfLines={1}>
                        {game.title}
                      </Text>
                      <View style={styles.metaRow}>
                        <PlatformIcon platform={game.platform} size={12} color={colors.textMuted} />
                        <Text style={styles.metaText}>
                          {game.platform}
                          {game.year ? ` · ${game.year}` : ''}
                        </Text>
                      </View>
                    </View>
                    {confirmingId === game.id ? (
                      <ActivityIndicator color={colors.accent} />
                    ) : (
                      <View style={styles.addPill}>
                        <Ionicons name="add" size={14} color={colors.onAccent} />
                        <Text style={styles.addPillText}>Add</Text>
                      </View>
                    )}
                  </Pressable>
                ))}
              </View>
            )}
          </ScrollView>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  loadingText: {
    color: colors.textMuted,
    fontSize: 14,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.lg,
  },
  extractedText: {
    color: colors.textFaint,
    fontSize: 13,
    fontStyle: 'italic',
  },
  confidentCard: {
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: discoverColors.cardBg,
    borderRadius: radii.lg,
    padding: spacing.xl,
  },
  confidentCover: {
    marginBottom: spacing.xs,
  },
  confidentTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '700',
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
    fontWeight: '600',
  },
  confirmButton: {
    marginTop: spacing.md,
    alignSelf: 'stretch',
    backgroundColor: colors.accent,
    borderRadius: radii.pill,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  confirmButtonDisabled: {
    opacity: 0.6,
  },
  confirmButtonText: {
    color: colors.onAccent,
    fontWeight: '700',
    fontSize: 15,
  },
  notThisButton: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  notThisText: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: '600',
  },
  list: {
    gap: spacing.md,
  },
  listLabel: {
    color: colors.textFaint,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  candidateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: discoverColors.cardBg,
    borderRadius: radii.md,
    padding: spacing.sm,
  },
  candidateInfo: {
    flex: 1,
    gap: 4,
  },
  candidateTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  addPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.accent,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 6,
  },
  addPillText: {
    color: colors.onAccent,
    fontSize: 13,
    fontWeight: '700',
  },
});
