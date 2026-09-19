import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, discoverColors, radii, spacing, typography } from '../../../shared/theme/theme';
import { ScreenBackground } from '../../../shared/components/ScreenBackground';
import { GameRow } from '../../../shared/components/GameRow';
import { formatReleaseLabel } from '../../../shared/utils/formatDate';
import { startVagueSearch, pollVagueSearch, type VagueSearchJob } from '../../../services/catalog/unifiedCatalog';
import type { RootScreenProps } from '../../../core/navigation/types';

type Props = RootScreenProps<'VagueSearch'>;

const MIN_QUERY_LENGTH = 4;
const POLL_INTERVAL_MS = 3500;
const TIMEOUT_MS = 5 * 60 * 1000;
const EXAMPLE = 'the one where you play a bald assassin with a barcode tattoo on the back of his head';

const THINKING_LINES = [
  'This one usually takes a moment…',
  'Still thinking — most descriptions take under a minute.',
  'Checking a few possibilities…',
  'Almost there — the harder ones can take a couple of minutes.',
];

type Screen = 'input' | 'thinking' | 'results' | 'error' | 'timeout';

export function VagueSearchScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [screen, setScreen] = useState<Screen>('input');
  const [job, setJob] = useState<VagueSearchJob | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [thinkingLineIndex, setThinkingLineIndex] = useState(0);

  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lineTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (screen !== 'thinking') return;
    const loop = Animated.loop(
      Animated.timing(spin, { toValue: 1, duration: 1400, easing: Easing.linear, useNativeDriver: true }),
    );
    loop.start();
    return () => loop.stop();
  }, [screen, spin]);

  function clearTimers() {
    if (pollTimer.current) clearInterval(pollTimer.current);
    if (timeoutTimer.current) clearTimeout(timeoutTimer.current);
    if (lineTimer.current) clearInterval(lineTimer.current);
    pollTimer.current = null;
    timeoutTimer.current = null;
    lineTimer.current = null;
  }

  useEffect(() => clearTimers, []);

  function beginPolling(jobId: string) {
    setThinkingLineIndex(0);
    lineTimer.current = setInterval(() => {
      setThinkingLineIndex((i) => (i + 1) % THINKING_LINES.length);
    }, 6000);

    pollTimer.current = setInterval(async () => {
      try {
        const updated = await pollVagueSearch(jobId);
        if (updated.status === 'done' || updated.status === 'error') {
          clearTimers();
          setJob(updated);
          setScreen(updated.status === 'error' ? 'error' : 'results');
          if (updated.status === 'error') setErrorMessage(updated.error ?? 'Something went wrong.');
        }
      } catch (err) {
        clearTimers();
        setErrorMessage(err instanceof Error ? err.message : 'Something went wrong.');
        setScreen('error');
      }
    }, POLL_INTERVAL_MS);

    timeoutTimer.current = setTimeout(() => {
      clearTimers();
      setScreen('timeout');
    }, TIMEOUT_MS);
  }

  async function handleSubmit() {
    const trimmed = query.trim();
    if (trimmed.length < MIN_QUERY_LENGTH) return;
    setErrorMessage(null);
    setScreen('thinking');
    try {
      const created = await startVagueSearch(trimmed);
      if (created.status === 'done' || created.status === 'error') {
        setJob(created);
        setScreen(created.status === 'error' ? 'error' : 'results');
        if (created.status === 'error') setErrorMessage(created.error ?? 'Something went wrong.');
        return;
      }
      setJob(created);
      beginPolling(created.id);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Couldn't start the search.");
      setScreen('error');
    }
  }

  function handleTryAgain() {
    clearTimers();
    setJob(null);
    setErrorMessage(null);
    setScreen('input');
  }

  function handleKeepWaiting() {
    if (!job) return;
    setScreen('thinking');
    beginPolling(job.id);
  }

  const spinDeg = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const canSubmit = query.trim().length >= MIN_QUERY_LENGTH;

  return (
    <View style={styles.root}>
      <ScreenBackground />
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
          <Ionicons name="close" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Describe the game</Text>
        <View style={styles.headerSpacer} />
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {screen === 'input' && (
          <View style={styles.inputScreen}>
            <Ionicons name="help-circle-outline" size={28} color={colors.accent} />
            <Text style={styles.title}>Can't remember the name?</Text>
            <Text style={styles.subtitle}>
              Describe it however you remember it — a scene, a character, a vibe. No title needed.
            </Text>
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder={`e.g. "${EXAMPLE}"`}
              placeholderTextColor={colors.textFaint}
              style={styles.textArea}
              multiline
              autoFocus
            />
            <Pressable
              style={[styles.submitButton, !canSubmit && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={!canSubmit}
            >
              <Text style={styles.submitButtonText}>Find it</Text>
            </Pressable>
          </View>
        )}

        {screen === 'thinking' && (
          <View style={styles.centered}>
            <Animated.View style={{ transform: [{ rotate: spinDeg }] }}>
              <Ionicons name="sync" size={36} color={colors.accent} />
            </Animated.View>
            <Text style={styles.thinkingTitle}>Thinking…</Text>
            <Text style={styles.thinkingLine}>{THINKING_LINES[thinkingLineIndex]}</Text>
          </View>
        )}

        {screen === 'timeout' && (
          <View style={styles.centered}>
            <Ionicons name="time-outline" size={36} color={colors.textMuted} />
            <Text style={styles.thinkingTitle}>Still working on it</Text>
            <Text style={styles.subtitle}>
              This description is taking longer than usual. You can keep waiting or try describing it differently.
            </Text>
            <Pressable style={styles.submitButton} onPress={handleKeepWaiting}>
              <Text style={styles.submitButtonText}>Keep waiting</Text>
            </Pressable>
            <Pressable style={styles.secondaryButton} onPress={handleTryAgain}>
              <Text style={styles.secondaryButtonText}>Try a different description</Text>
            </Pressable>
          </View>
        )}

        {screen === 'error' && (
          <View style={styles.centered}>
            <Ionicons name="close-circle-outline" size={36} color={colors.danger} />
            <Text style={styles.thinkingTitle}>Couldn't find it that way</Text>
            <Text style={styles.subtitle}>{errorMessage ?? 'Please try again.'}</Text>
            <Pressable style={styles.submitButton} onPress={handleTryAgain}>
              <Text style={styles.submitButtonText}>Try again</Text>
            </Pressable>
          </View>
        )}

        {screen === 'results' && job && (
          <ScrollView contentContainerStyle={styles.resultsContent} showsVerticalScrollIndicator={false}>
            {job.candidates.length === 0 ? (
              <View style={styles.centered}>
                <Ionicons name="help-circle-outline" size={36} color={colors.textMuted} />
                <Text style={styles.thinkingTitle}>No match this time</Text>
                <Text style={styles.subtitle}>Try adding more detail — a character name, setting, or year.</Text>
                <Pressable style={styles.submitButton} onPress={handleTryAgain}>
                  <Text style={styles.submitButtonText}>Try again</Text>
                </Pressable>
              </View>
            ) : (
              <>
                <Text style={styles.resultsLabel}>
                  {job.candidates.length === 1 ? 'This might be it' : "Here's what it might be"}
                </Text>
                <Text style={styles.resultsSubtext}>Tap the one that looks right.</Text>
                <View style={styles.resultsList}>
                  {job.candidates.map((game, index) => (
                    <GameRow
                      key={game.id}
                      title={game.title}
                      platform={game.platform}
                      detail={game.year?.toString() ?? formatReleaseLabel(game.releaseDate)}
                      abbreviation={game.abbreviation}
                      colorKey={game.colorKey}
                      imageUrl={game.coverImageUrl}
                      onPress={() => navigation.navigate('GameDetail', { catalogId: game.id })}
                      style={[styles.resultRow, index === job.candidates.length - 1 && styles.resultRowLast]}
                    />
                  ))}
                </View>
                <Pressable style={styles.secondaryButton} onPress={handleTryAgain}>
                  <Text style={styles.secondaryButtonText}>None of these — try again</Text>
                </Pressable>
              </>
            )}
          </ScrollView>
        )}
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  headerTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '700',
  },
  headerSpacer: {
    width: 24,
  },
  inputScreen: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    alignItems: 'center',
  },
  title: {
    ...typography.heading,
    fontSize: 22,
    textAlign: 'center',
    marginTop: spacing.md,
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  textArea: {
    width: '100%',
    minHeight: 120,
    backgroundColor: discoverColors.rowBg,
    borderRadius: radii.md,
    padding: spacing.md,
    color: colors.text,
    fontSize: 15,
    lineHeight: 21,
    textAlignVertical: 'top',
  },
  submitButton: {
    marginTop: spacing.lg,
    alignSelf: 'stretch',
    backgroundColor: colors.accent,
    borderRadius: radii.pill,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.4,
  },
  submitButtonText: {
    color: colors.onAccent,
    fontWeight: '700',
    fontSize: 15,
  },
  secondaryButton: {
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
  },
  secondaryButtonText: {
    color: discoverColors.mutedText,
    fontWeight: '600',
    fontSize: 14,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    gap: 2,
  },
  thinkingTitle: {
    ...typography.subheading,
    fontSize: 18,
    marginTop: spacing.md,
  },
  thinkingLine: {
    color: colors.textMuted,
    fontSize: 14,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  resultsContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  resultsLabel: {
    ...typography.subheading,
    fontSize: 18,
    marginTop: spacing.md,
  },
  resultsSubtext: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 2,
    marginBottom: spacing.md,
  },
  resultsList: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
  },
  resultRow: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  resultRowLast: {
    borderBottomWidth: 0,
  },
});
