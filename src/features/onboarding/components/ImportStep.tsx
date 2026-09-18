import React, { useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, discoverColors, radii, spacing, typography } from '../../../shared/theme/theme';
import { isValidPsnId } from '../../../services/social/psn';
import type { ImportSource, ImportSourceId } from '../importSources';
import type { ImportRun, useImportRunner } from '../useImportRunner';

const ICONS: Record<ImportSourceId, { name: React.ComponentProps<typeof Ionicons>['name']; tint: string }> = {
  steam: { name: 'logo-steam', tint: '#1B2838' },
  xbox: { name: 'logo-xbox', tint: '#3A9E3A' },
  psn: { name: 'logo-playstation', tint: '#2D5FE0' },
  android: { name: 'phone-portrait-outline', tint: '#8B5CF6' },
};

type Props = { sources: ImportSource[]; runner: ReturnType<typeof useImportRunner> };

/** One row per platform the player chose. Every row is optional, and none can block Continue. */
export function ImportStep({ sources, runner }: Props) {
  return (
    <View style={styles.body}>
      <Text style={styles.title}>Bring your games in</Text>
      <Text style={styles.subtitle}>Skip the typing. You can also do this later from your profile.</Text>
      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {sources.map((source) => (
          <ImportRow key={source.id} source={source} run={runner.runs[source.id]} runner={runner} />
        ))}
      </ScrollView>
    </View>
  );
}

function statusLine(source: ImportSource, run: ImportRun): string {
  switch (run.stage) {
    case 'connecting':
      return 'Waiting for the sign-in…';
    case 'importing':
      return source.id === 'android' ? 'Scanning this phone…' : 'Finding your games… big libraries take a moment';
    case 'done':
      return run.matched === 0
        ? 'No games found'
        : `${run.matched.toLocaleString()} ${run.matched === 1 ? 'game' : 'games'} added`;
    case 'private':
    case 'notFound':
    case 'error':
      return run.message;
    default:
      return source.available ? source.promise : 'Coming soon';
  }
}

function ImportRow({ source, run, runner }: { source: ImportSource; run: ImportRun; runner: Props['runner'] }) {
  const [psnId, setPsnId] = useState('');
  const icon = ICONS[source.id];
  const busy = run.stage === 'connecting' || run.stage === 'importing';
  const failed = run.stage === 'private' || run.stage === 'notFound' || run.stage === 'error';
  const done = run.stage === 'done';
  const showField = source.kind === 'field' && source.available && !busy && !done;
  const psnReady = isValidPsnId(psnId);

  function start() {
    if (source.id === 'steam' || source.id === 'xbox') {
      // A private profile means the account is already linked: import again, no new sign-in.
      if (run.stage === 'private') void runner.retry(source.id);
      else void runner.connect(source.id);
    } else if (source.id === 'psn') {
      if (psnReady) void runner.importPsn(psnId);
    } else {
      void runner.scanPhone();
    }
  }

  const actionLabel = failed ? 'Retry' : source.action;
  const actionDisabled = !source.available || (source.kind === 'field' && !psnReady);

  return (
    <View style={[styles.row, done && styles.rowDone]}>
      <View style={styles.rowTop}>
        <View style={[styles.iconWrap, { backgroundColor: source.available ? icon.tint : discoverColors.cardBg }]}>
          <Ionicons name={icon.name} size={20} color={source.available ? '#FFFFFF' : discoverColors.mutedText} />
        </View>
        <View style={styles.rowText}>
          <Text style={styles.label}>{source.label}</Text>
          <Text style={[styles.status, failed && styles.statusFailed, done && styles.statusDone]} numberOfLines={3}>
            {statusLine(source, run)}
          </Text>
        </View>
        {busy ? (
          <ActivityIndicator color={colors.accent} />
        ) : done ? (
          <Ionicons name="checkmark-circle" size={26} color={colors.success} />
        ) : showField ? null : (
          <Pressable
            style={[styles.action, actionDisabled && styles.actionDisabled]}
            onPress={start}
            disabled={actionDisabled}
            accessibilityRole="button"
            accessibilityLabel={`${actionLabel} ${source.label}`}
          >
            <Text style={styles.actionText}>{actionLabel}</Text>
          </Pressable>
        )}
      </View>

      {showField && (
        <View style={styles.fieldRow}>
          <TextInput
            value={psnId}
            onChangeText={setPsnId}
            placeholder="Your PSN ID"
            placeholderTextColor={discoverColors.mutedText}
            style={styles.field}
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={16}
            returnKeyType="go"
            onSubmitEditing={start}
          />
          <Pressable style={[styles.action, !psnReady && styles.actionDisabled]} onPress={start} disabled={!psnReady}>
            <Text style={styles.actionText}>{actionLabel}</Text>
          </Pressable>
        </View>
      )}
      {showField && run.stage === 'idle' && (
        <Text style={styles.helper}>Your trophies must be visible to Anyone in your PSN privacy settings.</Text>
      )}

      {run.stage === 'private' && (
        <Pressable onPress={() => Linking.openURL(run.fixUrl)} hitSlop={8}>
          <Text style={styles.fixLink}>How to fix this</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, paddingHorizontal: spacing.lg, paddingTop: spacing.xl },
  title: { ...typography.heading, fontSize: 24 },
  subtitle: { color: colors.textMuted, fontSize: 13, marginTop: 4, marginBottom: spacing.lg },
  list: { gap: spacing.sm, paddingBottom: spacing.xl },
  row: {
    backgroundColor: discoverColors.rowBg,
    borderRadius: radii.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'transparent',
    gap: spacing.sm,
  },
  rowDone: { borderColor: 'rgba(255,255,255,0.14)' },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  iconWrap: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  rowText: { flex: 1, minWidth: 0 },
  label: { color: colors.text, fontSize: 16, fontWeight: '600' },
  status: { color: colors.textMuted, fontSize: 12.5, marginTop: 2, lineHeight: 17 },
  statusFailed: { color: '#FFB4A2' },
  statusDone: { color: colors.text },
  action: {
    backgroundColor: colors.accent,
    borderRadius: 999,
    paddingHorizontal: 16,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionDisabled: { backgroundColor: 'rgba(255,255,255,0.1)' },
  actionText: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },
  fieldRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  field: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    paddingHorizontal: 12,
    backgroundColor: discoverColors.cardBg,
    color: colors.text,
    fontSize: 15,
  },
  helper: { color: discoverColors.mutedText, fontSize: 11.5, lineHeight: 16 },
  fixLink: { color: colors.accent, fontSize: 13, fontWeight: '600' },
});
