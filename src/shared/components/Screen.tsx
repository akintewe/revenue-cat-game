import React, { PropsWithChildren } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing } from '../theme/theme';
import { ScreenBackground } from './ScreenBackground';

type ScreenProps = PropsWithChildren<{
  background?: string;
  /** Fades scrolled content into the background near the floating tab bar, instead of a hard cutoff. */
  fadeBottom?: boolean;
}>;

export function Screen({ children, background = colors.background, fadeBottom = false }: ScreenProps) {
  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: background }]}>
      <ScreenBackground />
      <View style={styles.content}>{children}</View>
      {fadeBottom && (
        <LinearGradient
          pointerEvents="none"
          colors={['transparent', background]}
          locations={[0, 0.75]}
          style={styles.fade}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: spacing.lg,
  },
  fade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 110,
  },
});
