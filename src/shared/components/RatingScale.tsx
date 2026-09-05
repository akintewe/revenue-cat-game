import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing } from '../theme/theme';

const SCALE = Array.from({ length: 10 }, (_, index) => index + 1);

type RatingScaleProps = {
  value: number | null;
  onChange: (value: number) => void;
};

export function RatingScale({ value, onChange }: RatingScaleProps) {
  return (
    <View style={styles.row}>
      {SCALE.map((score) => {
        const isActive = value !== null && score <= value;
        return (
          <Pressable
            key={score}
            onPress={() => onChange(score)}
            style={[styles.chip, isActive && styles.chipActive]}
          >
            <Text style={[styles.label, isActive && styles.labelActive]}>{score}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  chip: {
    width: 30,
    height: 30,
    borderRadius: radii.sm,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipActive: {
    backgroundColor: colors.accent,
  },
  label: {
    color: colors.textMuted,
    fontWeight: '700',
    fontSize: 13,
  },
  labelActive: {
    color: colors.onAccent,
  },
});
