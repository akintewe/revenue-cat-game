import React from 'react';
import { Platform, StyleSheet, View, type ViewStyle } from 'react-native';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { authTheme } from '../theme/theme';

/**
 * A 48pt Liquid Glass pill (iOS 26) with the Figma inset edge highlights.
 * On older iOS and Android it falls back to a flat translucent fill.
 */
type Props = {
  children: React.ReactNode;
  /** Tint applied to the glass. Defaults to the dark #00000080 fill. */
  tint?: string;
  /**
   * Flat colour layered over the glass, under the content. The system material lifts luminance;
   * this brings the interior back down to the Figma fill. Pass undefined for none.
   */
  overlay?: string;
  /** Adds the system press response (scale + shine). Use on buttons only. */
  interactive?: boolean;
  /** CSS box-shadow string with inset shadows, drawn above the content. */
  insetShadow?: string;
  style?: ViewStyle;
};

const glassAvailable = Platform.OS === 'ios' && isLiquidGlassAvailable();

export function GlassPill({
  children,
  tint = authTheme.glassTint,
  overlay = authTheme.glassOverlay,
  interactive = false,
  insetShadow = authTheme.glassInsetShadow,
  style,
}: Props) {
  return (
    <View style={[styles.pill, style]}>
      {glassAvailable ? (
        <GlassView
          style={StyleSheet.absoluteFill}
          glassEffectStyle="regular"
          tintColor={tint}
          isInteractive={interactive}
          colorScheme="dark"
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: tint }]} />
      )}
      {overlay && <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: overlay }]} />}
      {children}
      <View pointerEvents="none" style={[styles.edge, { boxShadow: insetShadow }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    height: authTheme.controlHeight,
    borderRadius: authTheme.controlRadius,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  edge: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: authTheme.controlRadius,
  },
});
