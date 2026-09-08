import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { radii, spacing, statusColors } from '../theme/theme';
import { STATUS_LABEL, type GameStatus } from '../types/status';

export function StatusPill({ status }: { status: GameStatus }) {
  const { bg, fg } = statusColors[status];
  return (
    <View style={[styles.base, { backgroundColor: bg }]}>
      <Text style={[styles.label, { color: fg }]}>{STATUS_LABEL[status]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.sm,
    alignSelf: 'flex-start',
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
  },
});
