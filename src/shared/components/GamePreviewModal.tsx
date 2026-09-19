import React, { useEffect, useRef, useState } from 'react';
import { Animated, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, radii, spacing } from '../theme/theme';
import { GameCover } from './GameCover';
import { PlatformIcon } from './PlatformIcon';
import { STATUS_LABEL } from '../types/status';
import type { GameStatus } from '../types/status';
import type { CatalogGame } from '../../data/catalog';
import { fetchGameArtworkFor } from '../../services/catalog/gameArtwork';
import { clampSummary } from '../utils/text';

const SUMMARY_MAX_CHARS = 140;
const COVER_MAX_DIM = 260;
const COVER_MIN_DIM = 160;

type Props = {
  game: CatalogGame | null;
  visible: boolean;
  isOwned: boolean;
  /** Shown instead of the release year when the game is already in the library. */
  status?: GameStatus;
  onClose: () => void;
  onViewDetails: () => void;
  onAdd: () => void;
};

/** A condensed quick-look, reachable by long-pressing a game cell — not the full details screen. */
export function GamePreviewModal({ game, visible, isOwned, status, onClose, onViewDetails, onAdd }: Props) {
  const scale = useRef(new Animated.Value(0.9)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const artOpacity = useRef(new Animated.Value(0)).current;
  const [artworkUrl, setArtworkUrl] = useState<string | null>(null);
  const [coverBox, setCoverBox] = useState({ width: COVER_MAX_DIM, height: COVER_MAX_DIM });

  useEffect(() => {
    if (!visible) return;
    scale.setValue(0.9);
    opacity.setValue(0);
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, friction: 7, tension: 60, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
    ]).start();
  }, [visible, scale, opacity]);

  useEffect(() => {
    if (!visible || !game) {
      setArtworkUrl(null);
      return;
    }
    let cancelled = false;
    artOpacity.setValue(0);
    setArtworkUrl(null);
    fetchGameArtworkFor(game.id)
      .then((url) => {
        if (cancelled || !url) return;
        setArtworkUrl(url);
        Animated.timing(artOpacity, { toValue: 1, duration: 240, useNativeDriver: true }).start();
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, game?.id]);

  // Reset to square the moment a *different* game is shown, so the previous game's
  // box shape doesn't flash before this one's cover actually loads and reports its size.
  useEffect(() => {
    setCoverBox({ width: COVER_MAX_DIM, height: COVER_MAX_DIM });
  }, [game?.id]);

  function handleCoverLoad({ width: w, height: h }: { width: number; height: number }) {
    if (!w || !h) return;
    const ratio = w / h;
    setCoverBox(
      ratio >= 1
        ? { width: COVER_MAX_DIM, height: Math.max(COVER_MIN_DIM, COVER_MAX_DIM / ratio) }
        : { width: Math.max(COVER_MIN_DIM, COVER_MAX_DIM * ratio), height: COVER_MAX_DIM },
    );
  }

  if (!game) return null;

  const summary = game.summary ? clampSummary(game.summary, SUMMARY_MAX_CHARS) : null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        {artworkUrl && (
          <Animated.View style={[StyleSheet.absoluteFill, { opacity: artOpacity }]} pointerEvents="none">
            <Image source={{ uri: artworkUrl }} style={StyleSheet.absoluteFill} contentFit="cover" blurRadius={6} />
            <LinearGradient
              colors={['rgba(0,0,0,0.55)', 'rgba(0,0,0,0.8)']}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
        )}
        <Animated.View style={{ opacity, transform: [{ scale }] }}>
          <Pressable onPress={onViewDetails} style={styles.coverWrap}>
            <GameCover
              // A box resize after the image has already laid out can leave a stale crop on iOS —
              // force a clean remount for the final size rather than an in-place relayout.
              key={`${game.id}-${coverBox.width}x${coverBox.height}`}
              abbreviation={game.abbreviation}
              colorKey={game.colorKey}
              imageUrl={game.coverImageUrl}
              width={coverBox.width}
              height={coverBox.height}
              style={styles.cover}
              onLoad={handleCoverLoad}
            />
          </Pressable>

          <View style={styles.textBlock}>
            <Text style={styles.title} numberOfLines={2}>
              {game.title}
            </Text>

            <View style={styles.metaRow}>
              <Text style={styles.metaText}>{status ? STATUS_LABEL[status] : (game.year ?? 'TBA')}</Text>
              <Text style={styles.metaDot}>·</Text>
              <PlatformIcon platform={game.platform} size={14} color="rgba(255,255,255,0.7)" />
            </View>

            {summary && (
              <Text style={styles.summary} numberOfLines={3}>
                {summary.text}
                {summary.truncated ? '…' : ''}
              </Text>
            )}
          </View>

          <View style={styles.actions}>
            <Pressable style={styles.closeButton} onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={18} color="#FFFFFF" />
            </Pressable>
            {!isOwned && (
              <Pressable style={styles.addButton} onPress={onAdd}>
                <Text style={styles.addButtonText}>Add</Text>
              </Pressable>
            )}
          </View>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  coverWrap: {
    alignSelf: 'center',
    borderRadius: radii.lg,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  cover: {
    borderRadius: 0,
  },
  textBlock: {
    alignSelf: 'center',
    maxWidth: 300,
    marginTop: spacing.md,
    paddingHorizontal: spacing.xs,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 19,
    fontWeight: '700',
    textAlign: 'center',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  metaText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    fontWeight: '500',
  },
  metaDot: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
  },
  summary: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButton: {
    backgroundColor: colors.accent,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm + 4,
  },
  addButtonText: {
    color: colors.onAccent,
    fontWeight: '700',
    fontSize: 15,
  },
});
