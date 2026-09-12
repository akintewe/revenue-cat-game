import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { statusColors } from '../theme/theme';
import { STATUS_ICON, type GameStatus } from '../types/status';

/** A small circular status badge — icon only, no label, matching the Figma library browser. */
export function StatusPill({ status }: { status: GameStatus }) {
  const { bg, fg } = statusColors[status];
  return (
    <View style={[styles.base, { backgroundColor: bg }]}>
      <Ionicons name={STATUS_ICON[status]} size={15} color={fg} />
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
