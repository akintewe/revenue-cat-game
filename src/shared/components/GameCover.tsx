import React, { useState } from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { coverColors, radii } from '../theme/theme';
import type { CoverColorKey } from '../../data/catalog';

type GameCoverProps = {
  abbreviation: string;
  colorKey: CoverColorKey;
  imageUrl?: string;
  size?: number;
  style?: ViewStyle;
};

export function GameCover({ abbreviation, colorKey, imageUrl, size = 48, style }: GameCoverProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const backgroundColor = coverColors[colorKey] ?? coverColors.slate;
  const borderRadius = size >= 96 ? radii.lg : radii.sm;
  const showImage = Boolean(imageUrl) && !imageFailed;

  return (
    <View
      style={[
        styles.base,
        { backgroundColor, width: size, height: size, borderRadius },
        style,
      ]}
    >
      {showImage ? (
        <Image
          source={{ uri: imageUrl }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          transition={150}
          onError={() => setImageFailed(true)}
        />
      ) : (
        <Text style={[styles.label, { fontSize: size * 0.32 }]}>{abbreviation}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  label: {
    color: 'rgba(255,255,255,0.92)',
    fontWeight: '800',
  },
});
