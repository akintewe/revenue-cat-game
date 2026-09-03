import React from 'react';
import { StyleSheet, TextInput, TextInputProps } from 'react-native';
import { colors, radii, spacing } from '../theme/theme';

export function LabeledInput(props: TextInputProps) {
  return (
    <TextInput
      placeholderTextColor={colors.textFaint}
      style={[styles.input, props.multiline && styles.multiline, props.style]}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    color: colors.text,
    fontSize: 14,
  },
  multiline: {
    minHeight: 88,
    textAlignVertical: 'top',
  },
});
