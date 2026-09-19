import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { coverColors } from '../theme/theme';

/**
 * DiceBear "Personas" (Draftbit, CC BY 4.0), made from the handle so a person keeps one face.
 * The profile colour is the background. The pacifier mouth is left out: it reads as a baby.
 * Credit line: AVATAR_ATTRIBUTION.
 */
const MOUTHS = 'bigSmile,smile,smirk,lips,surprise';

export const AVATAR_ATTRIBUTION = 'Avatars: “Personas” by Draftbit, CC BY 4.0, via DiceBear';

export function avatarUrl(handle: string, color: string | null | undefined, px = 128): string {
  const background = (coverColors[color ?? ''] ?? coverColors.slate).replace('#', '');
  const params = new URLSearchParams({ seed: handle, size: String(px), backgroundColor: background, mouth: MOUTHS });
  return `https://api.dicebear.com/9.x/personas/png?${params.toString()}`;
}

type Props = {
  handle: string;
  color?: string | null;
  size: number;
  /** A ring in the page colour, for faces that overlap in a stack. */
  ringColor?: string;
  style?: StyleProp<ViewStyle>;
};

export function Avatar({ handle, color, size, ringColor, style }: Props) {
  const ring = ringColor ? 1 : 0;
  // Ask for 3× the drawn size so the face stays sharp on 3× screens. The steps keep the cache small.
  const px = size <= 24 ? 96 : size <= 48 ? 160 : 256;
  return (
    <View
      style={[
        styles.frame,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: coverColors[color ?? ''] ?? coverColors.slate,
          borderWidth: ring,
          borderColor: ringColor,
        },
        style,
      ]}
    >
      <Image
        source={{ uri: avatarUrl(handle, color, px) }}
        style={{ width: size - ring * 2, height: size - ring * 2, borderRadius: size / 2 }}
        contentFit="cover"
        cachePolicy="memory-disk"
        recyclingKey={handle}
        transition={120}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
