import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { coverColors, radii } from '../theme/theme';
import type { CoverColorKey } from '../../data/catalog';

type GameCoverProps = {
  abbreviation: string;
  colorKey: CoverColorKey;
  size?: number;
  style?: ViewStyle;
};

export function GameCover({ abbreviation, colorKey, size = 48, style }: GameCoverProps) {
  const backgroundColor = coverColors[colorKey] ?? coverColors.slate;
  return (
    <View
      style={[
        styles.base,
        { backgroundColor, width: size, height: size, borderRadius: size >= 96 ? radii.lg : radii.sm },
        style,
      ]}
    >
      <Text style={[styles.label, { fontSize: size * 0.32 }]}>{abbreviation}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    color: 'rgba(255,255,255,0.92)',
    fontWeight: '800',
  },
});
