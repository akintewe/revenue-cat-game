import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { radii, spacing, statusColors } from '../theme/theme';
import { STATUS_LABEL, type GameStatus } from '../types/status';

export function StatusPill({ status }: { status: GameStatus }) {
  const color = statusColors[status];
  return (
    <View style={[styles.base, { backgroundColor: `${color}26`, borderColor: `${color}55` }]}>
      <Text style={[styles.label, { color }]}>{STATUS_LABEL[status]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.pill,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  label: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
});
