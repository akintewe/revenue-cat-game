import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, discoverColors, radii, spacing } from '../../../shared/theme/theme';
import {
  finishSteamLink,
  importSteamLibrary,
  SteamProfilePrivateError,
  type SteamImportResult,
} from '../../../services/social/steam';
import { useLibraryStore } from '../../library/store/useLibraryStore';
import type { RootScreenProps } from '../../../core/navigation/types';

type Props = RootScreenProps<'SteamLink'>;

type Stage = 'connecting' | 'importing' | 'done' | 'private' | 'error' | 'failed' | 'expired';

export function SteamLinkScreen({ route, navigation }: Props) {
  const { status, nonce } = route.params;
  const insets = useSafeAreaInsets();
  const [stage, setStage] = useState<Stage>(
    status === 'ok' ? 'connecting' : status === 'failed' ? 'failed' : 'expired',
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fixUrl, setFixUrl] = useState<string | null>(null);
  const [result, setResult] = useState<SteamImportResult | null>(null);

  useEffect(() => {
    if (status !== 'ok') return;
    let cancelled = false;

    (async () => {
      try {
        await finishSteamLink(nonce);
        if (cancelled) return;
        setStage('importing');
        const importResult = await importSteamLibrary();
        if (cancelled) return;
        await useLibraryStore.getState().hydrate();
        if (cancelled) return;
        setResult(importResult);
        setStage('done');
      } catch (err) {
        if (cancelled) return;
        if (err instanceof SteamProfilePrivateError) {
          setErrorMessage(err.message);
          setFixUrl(err.fixUrl);
          setStage('private');
        } else {
          setErrorMessage(err instanceof Error ? err.message : 'Something went wrong connecting Steam.');
          setStage('error');
        }
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, nonce]);

  function dismiss() {
    navigation.replace('Tabs');
  }

  function goToLibrary() {
    navigation.replace('Tabs', { screen: 'LibraryTab', params: { openBrowse: true } });
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + spacing.lg }]}>
      {(stage === 'connecting' || stage === 'importing') && (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.accent} size="large" />
          <Text style={styles.statusText}>
            {stage === 'connecting' ? 'Connecting your Steam account…' : 'Importing your library…'}
          </Text>
        </View>
      )}

      {stage === 'done' && result && (
        <View style={styles.centered}>
          <Ionicons name="checkmark-circle" size={56} color={colors.success} />
          <Text style={styles.title}>Steam connected</Text>
          <Text style={styles.bigNumber}>{result.matched.toLocaleString()} games added</Text>
          <Text style={styles.body}>
            Out of {result.total.toLocaleString()} in your Steam library — the rest are mostly bundle extras and
            non-game apps we don't track. Sorted by playtime, your shelf is the real picture.
          </Text>
          <Pressable style={styles.primaryButton} onPress={goToLibrary}>
            <Text style={styles.primaryButtonText}>Go to my library</Text>
          </Pressable>
        </View>
      )}

      {stage === 'private' && (
        <View style={styles.centered}>
          <Ionicons name="lock-closed" size={48} color={colors.textMuted} />
          <Text style={styles.title}>Your Steam profile is private</Text>
          <Text style={styles.body}>{errorMessage}</Text>
          {fixUrl && (
            <Pressable style={styles.primaryButton} onPress={() => Linking.openURL(fixUrl)}>
              <Text style={styles.primaryButtonText}>Fix Steam privacy settings</Text>
            </Pressable>
          )}
          <Pressable style={styles.secondaryButton} onPress={dismiss}>
            <Text style={styles.secondaryButtonText}>Not now</Text>
          </Pressable>
        </View>
      )}

      {(stage === 'error' || stage === 'failed' || stage === 'expired') && (
        <View style={styles.centered}>
          <Ionicons name="close-circle" size={48} color={colors.danger} />
          <Text style={styles.title}>
            {stage === 'expired' ? 'That link expired' : stage === 'failed' ? "Steam sign-in didn't go through" : 'Something went wrong'}
          </Text>
          <Text style={styles.body}>
            {stage === 'error'
              ? errorMessage ?? 'Please try connecting again.'
              : 'Head back to your profile and try connecting Steam again.'}
          </Text>
          <Pressable style={styles.secondaryButton} onPress={dismiss}>
            <Text style={styles.secondaryButtonText}>Back to Prysm</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.xl,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  statusText: {
    color: colors.textMuted,
    fontSize: 15,
  },
  title: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  bigNumber: {
    color: colors.accent,
    fontSize: 28,
    fontWeight: '800',
  },
  body: {
    color: colors.textMuted,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  primaryButton: {
    marginTop: spacing.md,
    alignSelf: 'stretch',
    backgroundColor: colors.accent,
    borderRadius: radii.pill,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: colors.onAccent,
    fontWeight: '700',
    fontSize: 15,
  },
  secondaryButton: {
    paddingVertical: spacing.sm,
  },
  secondaryButtonText: {
    color: discoverColors.mutedText,
    fontWeight: '600',
    fontSize: 14,
  },
});
