import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../../shared/components/Button';
import { LabeledInput } from '../../../shared/components/LabeledInput';
import { SocialSignInButtons } from '../components/SocialSignInButtons';
import { colors, spacing, typography } from '../../../shared/theme/theme';
import { APP_NAME } from '../../../shared/constants/app';
import { useAuthStore } from '../store/useAuthStore';
import type { RootScreenProps } from '../../../core/navigation/types';

type Props = RootScreenProps<'Signup'>;

export function SignupScreen({ navigation }: Props) {
  const signUp = useAuthStore((state) => state.signUp);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmationSent, setConfirmationSent] = useState(false);

  const canSubmit =
    email.trim().length > 0 && password.length >= 6 && password === confirmPassword && !submitting;

  async function handleSubmit() {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    const { error: signUpError } = await signUp(email.trim(), password);
    setSubmitting(false);
    if (signUpError) {
      setError(signUpError);
      return;
    }
    // Supabase issues a session immediately only if email confirmation is disabled;
    // otherwise the auth listener won't flip status until the user confirms.
    setConfirmationSent(true);
  }

  if (confirmationSent) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <Text style={typography.heading}>Check your email</Text>
          <Text style={styles.subtitle}>
            We sent a confirmation link to {email.trim()}. Follow it to finish creating your account.
          </Text>
          <Pressable onPress={() => navigation.replace('Login')} hitSlop={8} style={styles.footer}>
            <Text style={styles.footerText}>
              Back to <Text style={styles.footerLink}>log in</Text>
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.brand}>{APP_NAME.toUpperCase()}</Text>
          <Text style={typography.heading}>Create your account</Text>
          <Text style={styles.subtitle}>Track what you play, save what you want, share what you find.</Text>

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
              textContentType="newPassword"
            />
            <LabeledInput
              placeholder="Confirm password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              textContentType="newPassword"
            />
            {password.length > 0 && password.length < 6 && (
              <Text style={styles.hint}>Password must be at least 6 characters.</Text>
            )}
            {confirmPassword.length > 0 && password !== confirmPassword && (
              <Text style={styles.hint}>Passwords don&apos;t match.</Text>
            )}
            {error && <Text style={styles.error}>{error}</Text>}
            <Button
              label={submitting ? 'Creating account…' : 'Sign up'}
              onPress={handleSubmit}
              disabled={!canSubmit}
            />
          </View>

          <SocialSignInButtons />

          <Pressable onPress={() => navigation.replace('Login')} hitSlop={8} style={styles.footer}>
            <Text style={styles.footerText}>
              Already have an account? <Text style={styles.footerLink}>Log in</Text>
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
  hint: {
    color: colors.textFaint,
    fontSize: 12,
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
