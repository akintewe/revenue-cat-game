import type { ImageSource } from 'expo-image';

const PLAYSTATION = require('../../../assets/figma-icons/platform-playstation.png') as ImageSource;
const XBOX = require('../../../assets/figma-icons/platform-xbox.png') as ImageSource;
const SWITCH = require('../../../assets/figma-icons/platform-switch.png') as ImageSource;

/** Figma-exported platform logos — returns undefined for platforms without a matching asset. */
export function platformImage(platform: string): ImageSource | undefined {
  const normalized = platform.toLowerCase();
  if (normalized.includes('ps') || normalized.includes('playstation')) return PLAYSTATION;
  if (normalized.includes('xbox')) return XBOX;
  if (normalized.includes('switch')) return SWITCH;
  return undefined;
}
