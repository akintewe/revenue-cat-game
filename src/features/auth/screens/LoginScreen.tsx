import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../../shared/components/Button';
import { LabeledInput } from '../../../shared/components/LabeledInput';
import { SocialSignInButtons } from '../components/SocialSignInButtons';
import { colors, spacing, typography } from '../../../shared/theme/theme';
import { ScreenBackground } from '../../../shared/components/ScreenBackground';
import { APP_NAME } from '../../../shared/constants/app';
import { useAuthStore } from '../store/useAuthStore';
import type { RootScreenProps } from '../../../core/navigation/types';

type Props = RootScreenProps<'Login'>;

export function LoginScreen({ navigation }: Props) {
  const signIn = useAuthStore((state) => state.signIn);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = email.trim().length > 0 && password.length > 0 && !submitting;

  async function handleSubmit() {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    const { error: signInError } = await signIn(email.trim(), password);
    setSubmitting(false);
    if (signInError) setError(signInError);
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScreenBackground />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.brand}>{APP_NAME.toUpperCase()}</Text>
          <Text style={typography.heading}>Welcome back</Text>
          <Text style={styles.subtitle}>Log in to pick up your shelf where you left it.</Text>

          <View style={styles.form}>
            <LabeledInput
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              textContentType="emailAddress"
            />
            <LabeledInput
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              textContentType="password"
            />
            {error && <Text style={styles.error}>{error}</Text>}
            <Button
              label={submitting ? 'Logging in…' : 'Log in'}
              onPress={handleSubmit}
              disabled={!canSubmit}
            />
          </View>

          <SocialSignInButtons />

          <Pressable onPress={() => navigation.replace('Signup')} hitSlop={8} style={styles.footer}>
            <Text style={styles.footerText}>
              Don&apos;t have an account? <Text style={styles.footerLink}>Sign up</Text>
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    gap: spacing.xs,
  },
  brand: {
    color: colors.text,
    fontWeight: '800',
    fontSize: 13,
    letterSpacing: 0.4,
    marginBottom: spacing.sm,
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 14,
    marginTop: 4,
    marginBottom: spacing.lg,
  },
  form: {
    gap: spacing.sm,
  },
  error: {
    color: colors.danger,
    fontSize: 13,
  },
  footer: {
    marginTop: spacing.xl,
    alignItems: 'center',
  },
  footerText: {
    color: colors.textMuted,
    fontSize: 14,
  },
  footerLink: {
    color: colors.accent,
    fontWeight: '700',
  },
});
