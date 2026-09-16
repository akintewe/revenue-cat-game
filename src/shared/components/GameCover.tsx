import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, ViewStyle, type LayoutChangeEvent } from 'react-native';
import { Image } from 'expo-image';
import { coverColors, radii } from '../theme/theme';
import { useCoverFocus } from '../cover-focus/useCoverFocus';
import { focusImageStyle } from '../cover-focus/focusImageStyle';
import type { CoverColorKey } from '../../data/catalog';

type GameCoverProps = {
  abbreviation: string;
  colorKey: CoverColorKey;
  imageUrl?: string;
  size?: number;
  style?: ViewStyle;
  /**
   * Crop the art so the title stays whole and letterbox bars are skipped. The image is held back
   * until its crop is known, so it appears once, in place, instead of jumping.
   */
  smartCrop?: boolean;
};

/** If the analysis has not answered by then, show the plain centre crop rather than nothing. */
const SMART_CROP_WAIT_MS = 2000;

type Box = { w: number; h: number };

export function GameCover({ abbreviation, colorKey, imageUrl, size = 48, style, smartCrop = true }: GameCoverProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const backgroundColor = coverColors[colorKey] ?? coverColors.slate;
  const borderRadius = size >= 96 ? radii.lg : radii.sm;
  const showImage = Boolean(imageUrl) && !imageFailed;
  const wantFocus = smartCrop && showImage;

  // A style that sets width or height makes the box something other than size × size: measure it.
  const flatStyle = StyleSheet.flatten(style);
  const overridesBox = flatStyle?.width !== undefined || flatStyle?.height !== undefined;
  const [measured, setMeasured] = useState<Box | null>(null);
  const box: Box | null = overridesBox ? measured : { w: size, h: size };

  const { status, focus } = useCoverFocus(imageUrl, wantFocus);
  const cropUnknown = status !== 'ready' && status !== 'failed';
  const [waitedTooLong, setWaitedTooLong] = useState(false);
  const holdImage = wantFocus && !waitedTooLong && (cropUnknown || box === null);

  // Whatever the reason for holding the image, give up after a while and show the centre crop.
  useEffect(() => {
    if (!holdImage) return;
    const timer = setTimeout(() => setWaitedTooLong(true), SMART_CROP_WAIT_MS);
    return () => clearTimeout(timer);
  }, [holdImage]);

  function handleLayout({ nativeEvent: { layout } }: LayoutChangeEvent) {
    setMeasured((prev) =>
      prev && prev.w === layout.width && prev.h === layout.height ? prev : { w: layout.width, h: layout.height },
    );
  }

  return (
    <View
      onLayout={wantFocus && overridesBox ? handleLayout : undefined}
      style={[
        styles.base,
        { backgroundColor, width: size, height: size, borderRadius },
        style,
      ]}
    >
      {!showImage ? (
        <Text style={[styles.label, { fontSize: size * 0.32 }]}>{abbreviation}</Text>
      ) : holdImage ? null : (
        <Image
          source={{ uri: imageUrl }}
          style={focus && box ? focusImageStyle(focus, box.w, box.h) : StyleSheet.absoluteFill}
          contentFit="cover"
          transition={150}
          onError={() => setImageFailed(true)}
        />
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
