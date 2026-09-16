import React from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { discoverColors } from '../theme/theme';

/**
 * The app's standard canvas: near-black base plus the warm top glow used on the
 * Library home screen. Render as the first child of a screen's root view so
 * everything else stacks on top of it.
 */
export function ScreenBackground() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <LinearGradient
        colors={discoverColors.heroGradient}
        locations={discoverColors.heroGradientLocations}
        style={styles.heroGradient}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  heroGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 177,
  },
});
