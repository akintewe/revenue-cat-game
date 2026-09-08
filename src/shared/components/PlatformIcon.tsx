import React from 'react';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { platformImage } from '../utils/platformImage';

type PlatformIconProps = {
  platform: string;
  size?: number;
  color?: string;
};

/** Figma-exported logo for PS/Xbox/Switch; a generic glyph fallback for platforms not in the mockup (PC, handhelds). */
export function PlatformIcon({ platform, size = 14, color = '#646464' }: PlatformIconProps) {
  const logo = platformImage(platform);
  if (logo) {
    return <Image source={logo} style={{ width: size, height: size }} contentFit="contain" />;
  }
  if (platform.toLowerCase().includes('pc')) {
    return <Ionicons name="desktop-outline" size={size} color={color} />;
  }
  return <Ionicons name="game-controller-outline" size={size} color={color} />;
}
