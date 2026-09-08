import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Image, type ImageSource } from 'expo-image';
import { preorderColors, radii, spacing } from '../theme/theme';

const DASH_ICON = require('../../../assets/figma-icons/pill-preorder-dash.png') as ImageSource;

export function PreorderPill() {
  return (
    <View style={styles.base}>
      <Image source={DASH_ICON} style={styles.icon} contentFit="contain" />
      <Text style={styles.label}>Preorder</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: preorderColors.bg,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.sm,
    alignSelf: 'flex-start',
  },
  icon: {
    width: 12,
    height: 12,
  },
  label: {
    color: preorderColors.fg,
    fontSize: 12,
    fontWeight: '600',
  },
});
