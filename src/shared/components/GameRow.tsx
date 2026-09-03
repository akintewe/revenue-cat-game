import React, { PropsWithChildren } from 'react';
import { Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { GameCover } from './GameCover';
import { colors, radii, spacing, typography } from '../theme/theme';
import type { CoverColorKey } from '../../data/catalog';

type GameRowProps = PropsWithChildren<{
  title: string;
  subtitle: string;
  abbreviation: string;
  colorKey: CoverColorKey;
  imageUrl?: string;
  onPress?: () => void;
  style?: ViewStyle;
}>;

export function GameRow({
  title,
  subtitle,
  abbreviation,
  colorKey,
  imageUrl,
  onPress,
  style,
  children,
}: GameRowProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [styles.row, pressed && onPress && styles.pressed, style]}
    >
      <GameCover abbreviation={abbreviation} colorKey={colorKey} imageUrl={imageUrl} size={48} />
      <View style={styles.info}>
        <Text style={typography.subheading} numberOfLines={1}>
          {title}
        </Text>
        <Text style={typography.body} numberOfLines={1}>
          {subtitle}
        </Text>
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
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.sm,
  },
  pressed: {
    opacity: 0.75,
  },
  info: {
    flex: 1,
    gap: 2,
  },
});
