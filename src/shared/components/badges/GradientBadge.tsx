import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

/**
 * The 45×20 "New" pill from Figma: radius 8, padding 4/8, five-stop orange gradient at 100.25°.
 * CSS 100.25° runs left to right and slightly downward; start/end reproduce that direction.
 */
type Props = {
  label?: string;
};

const GRADIENT_COLORS = ['#FD5821', '#FA4F19', '#E78F2B', '#FD5821', '#F09204'] as const;
const GRADIENT_LOCATIONS = [0.0274, 0.2819, 0.3955, 0.5364, 0.9681] as const;

export function GradientBadge({ label = 'New' }: Props) {
  return (
    <View style={styles.badge}>
      <LinearGradient
        colors={GRADIENT_COLORS}
        locations={GRADIENT_LOCATIONS}
        start={{ x: 0.008, y: 0.411 }}
        end={{ x: 0.992, y: 0.589 }}
        style={StyleSheet.absoluteFill}
      />
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    minWidth: 45,
    height: 20,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  label: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 12,
    includeFontPadding: false,
  },
});
