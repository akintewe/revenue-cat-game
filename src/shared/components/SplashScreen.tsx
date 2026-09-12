import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../theme/theme';

const LOCKUP = require('../../../assets/splash-lockup.png');

/** Matches the Figma splash frame (node 2164:2740) — sampled top gradient, centered wordmark lockup. */
export function SplashScreen() {
  return (
    <View style={styles.root}>
      <LinearGradient
        colors={['#872B11', '#170502', colors.background]}
        locations={[0, 0.4, 1]}
        style={styles.gradient}
      />
      <View style={styles.content}>
        <Image source={LOCKUP} style={styles.lockup} contentFit="contain" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  gradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 340,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockup: {
    width: 220,
    height: 220 * (102 / 438),
  },
});
