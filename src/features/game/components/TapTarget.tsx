import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { colors, radii } from '../../../shared/theme/theme';

type TapTargetProps = {
  onPress: () => void;
};

export function TapTarget({ onPress }: TapTargetProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.target, pressed && styles.pressed]}
    >
      <Text style={styles.emoji}>🐱</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  target: {
    width: 180,
    height: 180,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    borderWidth: 4,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  pressed: {
    transform: [{ scale: 0.96 }],
  },
  emoji: {
    fontSize: 72,
  },
});
