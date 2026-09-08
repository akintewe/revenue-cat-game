import React, { PropsWithChildren } from 'react';
import { Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { GameCover } from './GameCover';
import { colors, spacing } from '../theme/theme';
import { platformImage } from '../utils/platformImage';
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
  style,
  children,
}: GameRowProps) {
  const logo = platformImage(platform);

  return (
    <Pressable
      onPress={onPress}
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
          {logo && <Image source={logo} style={styles.platformLogo} contentFit="contain" />}
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
  platformLogo: {
    width: 14,
    height: 14,
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '500',
  },
});
