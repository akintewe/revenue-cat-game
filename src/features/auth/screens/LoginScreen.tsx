import React, { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { GlassPill } from '../../../shared/components/GlassPill';
import { Wordmark } from '../../../shared/components/brand/Wordmark';
import { GoogleMark } from '../../../shared/components/brand/GoogleMark';
import { authTheme, colors } from '../../../shared/theme/theme';
import { useAuthStore } from '../store/useAuthStore';

const COLLAGE = require('../../../../assets/login-collage.png');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CODE_LENGTH = 6;
const RESEND_SECONDS = 30;

type Step = 'email' | 'code';

/**
 * Login, from the Figma "iPhone 16 & 17 Pro - 46" frame. All sizes are the frame's values ÷ 1.1.
 * Passwordless: Continue emails a 6-digit code, the same layout then takes the code.
 * One screen serves sign-in and sign-up; Google is the one-tap path.
 */
export function LoginScreen() {
  const insets = useSafeAreaInsets();
  const requestEmailCode = useAuthStore((s) => s.requestEmailCode);
  const verifyEmailCode = useAuthStore((s) => s.verifyEmailCode);
  const signInWithGoogle = useAuthStore((s) => s.signInWithGoogle);

  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState<'none' | 'continue' | 'google'>('none');
  const [error, setError] = useState<string | null>(null);
  const [resendIn, setResendIn] = useState(0);

  const trimmedEmail = email.trim();
  const canContinue =
    busy === 'none' &&
    (step === 'email' ? EMAIL_RE.test(trimmedEmail) : code.length === CODE_LENGTH);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((n) => n - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  async function sendCode() {
    setBusy('continue');
    setError(null);
    const { error: sendError } = await requestEmailCode(trimmedEmail);
    setBusy('none');
    if (sendError) {
      setError(sendError);
      return false;
    }
    setResendIn(RESEND_SECONDS);
    return true;
  }

  async function submitCode(value: string) {
    setBusy('continue');
    setError(null);
    const { error: verifyError } = await verifyEmailCode(trimmedEmail, value);
    setBusy('none');
    // On success the auth store's session listener flips status to signedIn and this screen unmounts.
    if (verifyError) setError(verifyError);
  }

  async function handleContinue() {
    if (!canContinue) return;
    if (step === 'email') {
      if (await sendCode()) {
        setCode('');
        setStep('code');
      }
      return;
    }
    await submitCode(code);
  }

  function handleCodeChange(value: string) {
    const digits = value.replace(/\D/g, '').slice(0, CODE_LENGTH);
    setCode(digits);
    setError(null);
    if (digits.length === CODE_LENGTH && busy === 'none') void submitCode(digits);
  }

  async function handleGoogle() {
    if (busy !== 'none') return;
    setBusy('google');
    setError(null);
    const { error: googleError } = await signInWithGoogle();
    setBusy('none');
    if (googleError) setError(googleError);
  }

  function changeEmail() {
    setStep('email');
    setCode('');
    setError(null);
    setResendIn(0);
  }

  const continueLabel =
    busy === 'continue' ? (step === 'email' ? 'Sending code…' : 'Checking…') : 'Continue';

  return (
    <View style={styles.root}>
      <Image source={COLLAGE} style={StyleSheet.absoluteFill} contentFit="cover" />
      <View style={[StyleSheet.absoluteFill, styles.scrim]} />
      <LinearGradient
        colors={authTheme.topFadeColors}
        style={[styles.topFade, { height: authTheme.topFadeHeight }]}
      />
      <LinearGradient
        colors={authTheme.bottomFadeColors}
        locations={authTheme.bottomFadeLocations}
        style={[styles.bottomFade, { top: authTheme.bottomFadeTop }]}
      />

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View
          style={[
            styles.page,
            {
              paddingTop: insets.top + 6.5,
              paddingBottom: Math.max(insets.bottom, 16) + authTheme.pagePaddingBottom,
            },
          ]}
        >
          <View style={styles.header}>
            <Wordmark fontSize={19.7} glow />
          </View>

          <View style={styles.flex} />

          <Text style={styles.headline}>Never lose track{'\n'}of a game again</Text>

          <View style={styles.form}>
            {step === 'code' && <Text style={styles.hint}>We sent a code to {trimmedEmail}</Text>}

            <GlassPill>
              {step === 'email' ? (
                <TextInput
                  key="email"
                  style={styles.input}
                  value={email}
                  onChangeText={(v) => {
                    setEmail(v);
                    setError(null);
                  }}
                  placeholder="Enter your email address"
                  placeholderTextColor={authTheme.placeholder}
                  selectionColor={colors.accent}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="email"
                  keyboardType="email-address"
                  textContentType="emailAddress"
                  returnKeyType="next"
                  onSubmitEditing={handleContinue}
                />
              ) : (
                <TextInput
                  key="code"
                  style={[styles.input, styles.codeInput]}
                  value={code}
                  onChangeText={handleCodeChange}
                  placeholder="Enter the 6-digit code"
                  placeholderTextColor={authTheme.placeholder}
                  selectionColor={colors.accent}
                  keyboardType="number-pad"
                  autoComplete="one-time-code"
                  textContentType="oneTimeCode"
                  maxLength={CODE_LENGTH}
                  returnKeyType="done"
                  autoFocus
                  onSubmitEditing={handleContinue}
                />
              )}
            </GlassPill>

            <Pressable onPress={handleContinue} disabled={!canContinue}>
              <GlassPill
                interactive
                tint={colors.accent}
                overlay={undefined}
                insetShadow={authTheme.buttonInsetShadow}
              >
                <LinearGradient colors={authTheme.buttonGradient} style={StyleSheet.absoluteFill} />
                <Text style={styles.buttonLabel}>{continueLabel}</Text>
              </GlassPill>
            </Pressable>

            {error && <Text style={styles.error}>{error}</Text>}

            {step === 'code' && (
              <View style={styles.links}>
                <Pressable onPress={sendCode} disabled={resendIn > 0 || busy !== 'none'} hitSlop={8}>
                  <Text style={[styles.link, resendIn > 0 && styles.linkMuted]}>
                    {resendIn > 0 ? `Resend code in ${resendIn}s` : 'Resend code'}
                  </Text>
                </Pressable>
                <Pressable onPress={changeEmail} hitSlop={8}>
                  <Text style={styles.link}>Use a different email</Text>
                </Pressable>
              </View>
            )}

            <View style={styles.orRow}>
              <View style={styles.rule} />
              <Text style={styles.or}>OR</Text>
              <View style={styles.rule} />
            </View>

            <Pressable onPress={handleGoogle} disabled={busy !== 'none'}>
              <GlassPill interactive>
                <View style={styles.googleRow}>
                  <GoogleMark size={20} />
                  <Text style={styles.buttonLabel}>
                    {busy === 'google' ? 'Signing in…' : 'Continue with Google'}
                  </Text>
                </View>
              </GlassPill>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000000',
  },
  flex: {
    flex: 1,
  },
  scrim: {
    backgroundColor: authTheme.collageScrim,
  },
  topFade: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  bottomFade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  page: {
    flex: 1,
    paddingHorizontal: authTheme.pagePaddingX,
  },
  header: {
    alignItems: 'center',
  },
  headline: {
    color: '#FFFFFF',
    fontSize: 32,
    lineHeight: 36.3,
    fontWeight: '700',
    letterSpacing: -0.32,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 0.5,
    marginBottom: 18.5,
  },
  form: {
    gap: 10,
  },
  hint: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 13,
    lineHeight: 17,
    textAlign: 'center',
  },
  input: {
    flex: 1,
    paddingHorizontal: 24,
    color: '#FFFFFF',
    fontSize: 15.5,
  },
  codeInput: {
    letterSpacing: 2,
  },
  buttonLabel: {
    color: '#FFFFFF',
    fontSize: 15,
    lineHeight: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  googleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  orRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 25,
    height: 15,
  },
  rule: {
    flex: 1,
    height: 1,
    backgroundColor: authTheme.divider,
  },
  or: {
    color: '#FFFFFF',
    fontSize: 15,
    lineHeight: 15,
    fontWeight: '600',
    letterSpacing: 0.15,
    textAlign: 'center',
  },
  error: {
    color: '#FFD7CC',
    fontSize: 13,
    lineHeight: 17,
    textAlign: 'center',
  },
  links: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
  },
  link: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '600',
  },
  linkMuted: {
    color: 'rgba(255,255,255,0.4)',
  },
});
