import React, { useState } from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Image, type ImageLoadEventData } from 'expo-image';
import { coverColors, radii } from '../theme/theme';
import type { CoverColorKey } from '../../data/catalog';

type GameCoverProps = {
  abbreviation: string;
  colorKey: CoverColorKey;
  imageUrl?: string;
  size?: number;
  /** Override size for a non-square box (e.g. a cover whose real aspect ratio was measured). Falls back to `size` for whichever axis is omitted. */
  width?: number;
  height?: number;
  style?: ViewStyle;
  /** Fires with the image's real pixel dimensions once it actually loads — the one source of truth for its aspect ratio, no separate network call to race or fail independently. */
  onLoad?: (size: { width: number; height: number }) => void;
};

export function GameCover({ abbreviation, colorKey, imageUrl, size = 48, width, height, style, onLoad }: GameCoverProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const backgroundColor = coverColors[colorKey] ?? coverColors.slate;
  const boxWidth = width ?? size;
  const boxHeight = height ?? size;
  const borderRadius = Math.min(boxWidth, boxHeight) >= 96 ? radii.lg : radii.sm;
  const showImage = Boolean(imageUrl) && !imageFailed;

  return (
    <View
      style={[
        styles.base,
        { backgroundColor, width: boxWidth, height: boxHeight, borderRadius },
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
          onLoad={onLoad ? (e: ImageLoadEventData) => onLoad({ width: e.source.width, height: e.source.height }) : undefined}
        />
      ) : (
        <Text style={[styles.label, { fontSize: Math.min(boxWidth, boxHeight) * 0.32 }]}>{abbreviation}</Text>
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
