import React from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing } from '../../../shared/theme/theme';

function notReady(provider: string) {
  Alert.alert('Coming soon', `${provider} sign-in isn't connected yet — email works today.`);
}

export function SocialSignInButtons() {
  return (
    <View style={styles.container}>
      <View style={styles.dividerRow}>
        <View style={styles.divider} />
        <Text style={styles.dividerLabel}>or</Text>
        <View style={styles.divider} />
      </View>

      <Pressable style={styles.button} onPress={() => notReady('Google')}>
        <Ionicons name="logo-google" size={18} color={colors.text} />
        <Text style={styles.label}>Continue with Google</Text>
      </Pressable>

      <Pressable style={styles.button} onPress={() => notReady('Apple')}>
        <Ionicons name="logo-apple" size={20} color={colors.text} />
        <Text style={styles.label}>Continue with Apple</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginVertical: spacing.xs,
  },
  divider: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
  dividerLabel: {
    color: colors.textFaint,
    fontSize: 12,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingVertical: spacing.md,
  },
  label: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
});
