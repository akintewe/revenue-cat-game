import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, ViewStyle, type LayoutChangeEvent } from 'react-native';
import { Image, type ImageLoadEventData } from 'expo-image';
import { coverColors, radii } from '../theme/theme';
import { useCoverFocus } from '../cover-focus/useCoverFocus';
import { focusImageStyle } from '../cover-focus/focusImageStyle';
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
  /**
   * Crop the art so the title stays whole and letterbox bars are skipped. The image is held back
   * until its crop is known, so it appears once, in place, instead of jumping.
   */
  smartCrop?: boolean;
};

/** If the analysis has not answered by then, show the plain centre crop rather than nothing. */
const SMART_CROP_WAIT_MS = 2000;

type Box = { w: number; h: number };

export function GameCover({
  abbreviation,
  colorKey,
  imageUrl,
  size = 48,
  width,
  height,
  style,
  onLoad,
  smartCrop = true,
}: GameCoverProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const backgroundColor = coverColors[colorKey] ?? coverColors.slate;
  const boxWidth = width ?? size;
  const boxHeight = height ?? size;
  const borderRadius = Math.min(boxWidth, boxHeight) >= 96 ? radii.lg : radii.sm;
  const showImage = Boolean(imageUrl) && !imageFailed;
  const wantFocus = smartCrop && showImage;

  // A style, or an explicit width/height prop, that makes the box something other than
  // size × size needs to be measured rather than assumed.
  const flatStyle = StyleSheet.flatten(style);
  const overridesBox =
    flatStyle?.width !== undefined || flatStyle?.height !== undefined || width !== undefined || height !== undefined;
  const [measured, setMeasured] = useState<Box | null>(null);
  const box: Box | null = overridesBox ? (measured ?? { w: boxWidth, h: boxHeight }) : { w: size, h: size };

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
        { backgroundColor, width: boxWidth, height: boxHeight, borderRadius },
        style,
      ]}
    >
      {!showImage ? (
        <Text style={[styles.label, { fontSize: Math.min(boxWidth, boxHeight) * 0.32 }]}>{abbreviation}</Text>
      ) : holdImage ? null : (
        <Image
          source={{ uri: imageUrl }}
          style={focus && box ? focusImageStyle(focus, box.w, box.h) : StyleSheet.absoluteFill}
          contentFit="cover"
          transition={150}
          onError={() => setImageFailed(true)}
          onLoad={onLoad ? (e: ImageLoadEventData) => onLoad({ width: e.source.width, height: e.source.height }) : undefined}
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
