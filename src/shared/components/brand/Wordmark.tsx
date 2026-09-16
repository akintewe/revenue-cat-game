import React from 'react';
import { Image } from 'expo-image';

/**
 * "PRYSM" as set in Figma: SF Pro Expanded with the warm glow baked in (Frame 124, cropped to
 * the letterforms, 388×72). iOS cannot select the Expanded width from the system font, so the
 * artwork is the source of truth.
 *
 * `fontSize` keeps the call sites' vocabulary: the mock shows a glyph width of 4.0× the nominal
 * font size (79pt at 19.7, 96pt at 24.3). `glow` shows the gradient; without it the mark is
 * tinted flat white, for the orange splash.
 */
const WORDMARK = require('../../../../assets/brand/wordmark.png');
const WIDTH_PER_FONT_PT = 4.0;
const ASPECT = 72 / 388;

type Props = {
  fontSize: number;
  glow?: boolean;
};

export function Wordmark({ fontSize, glow = false }: Props) {
  const width = fontSize * WIDTH_PER_FONT_PT;
  return (
    <Image
      source={WORDMARK}
      style={{ width, height: width * ASPECT }}
      contentFit="contain"
      tintColor={glow ? undefined : '#FFFFFF'}
      accessibilityLabel="Prysm"
    />
  );
}
