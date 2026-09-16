import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../../theme/theme';

/** The 20pt accent circle with a count, from the Figma side menu (Events "2"). */
type Props = {
  count: number;
};

export function CountBadge({ count }: Props) {
  return (
    <View style={styles.badge}>
      <Text style={styles.label}>{count}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 100,
    paddingHorizontal: 6,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 14,
    includeFontPadding: false,
  },
});
