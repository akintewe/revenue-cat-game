import React, { PropsWithChildren } from 'react';
import { Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { GameCover } from './GameCover';
import { PlatformIcon } from './PlatformIcon';
import { colors, spacing } from '../theme/theme';
import type { CoverColorKey } from '../../data/catalog';

type GameRowProps = PropsWithChildren<{
  title: string;
  /** Platform label shown with its logo, e.g. "PS5". */
  platform: string;
  /** Trailing detail after the platform, e.g. a year or release label. */
  detail: string;
  abbreviation: string;
  colorKey: CoverColorKey;
  imageUrl?: string;
  onPress?: () => void;
  onLongPress?: () => void;
  style?: StyleProp<ViewStyle>;
}>;

export function GameRow({
  title,
  platform,
  detail,
  abbreviation,
  colorKey,
  imageUrl,
  onPress,
  onLongPress,
  style,
  children,
}: GameRowProps) {
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      disabled={!onPress}
      style={({ pressed }) => [styles.row, pressed && onPress && styles.pressed, style]}
    >
      <GameCover
        abbreviation={abbreviation}
        colorKey={colorKey}
        imageUrl={imageUrl}
        size={64}
        style={styles.cover}
      />
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        <View style={styles.subtitleRow}>
          <PlatformIcon platform={platform} size={14} color={colors.textMuted} />
          <Text style={styles.subtitle} numberOfLines={1}>
            {platform} · {detail}
          </Text>
        </View>
      </View>
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  pressed: {
    opacity: 0.75,
  },
  cover: {
    borderRadius: 10,
  },
  info: {
    flex: 1,
    gap: 4,
  },
  title: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  subtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '500',
  },
});
