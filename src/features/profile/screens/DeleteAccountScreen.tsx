import React, { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, discoverColors, radii, spacing, typography } from '../../../shared/theme/theme';
import { deleteAccount } from '../../../services/auth/accountDeletion';
import { useAuthStore } from '../../auth/store/useAuthStore';
import type { RootScreenProps } from '../../../core/navigation/types';

const CONFIRM_WORD = 'DELETE';

type Props = RootScreenProps<'DeleteAccount'>;

export function DeleteAccountScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const signOut = useAuthStore((state) => state.signOut);
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  const canDelete = confirmText.trim().toUpperCase() === CONFIRM_WORD;

  async function handleDelete() {
    if (!canDelete || deleting) return;
    setDeleting(true);
    try {
      await deleteAccount();
      await signOut();
      // RootNavigator's auth listener takes it from here — status flips to signedOut.
    } catch (err) {
      setDeleting(false);
      Alert.alert('Could not delete account', err instanceof Error ? err.message : 'Please try again.');
    }
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + spacing.lg }]}>
      <Pressable onPress={() => navigation.goBack()} hitSlop={12} style={styles.backButton}>
        <Ionicons name="chevron-back" size={22} color={colors.text} />
      </Pressable>

      <View style={styles.body}>
        <View style={styles.iconWrap}>
          <Ionicons name="warning" size={32} color={colors.danger} />
        </View>
        <Text style={styles.title}>Delete your account</Text>
        <Text style={styles.body1}>
          This permanently deletes your library, wishlist, posts, comments, likes, follows, platform
          connections and profile. There is no undo.
        </Text>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>Type {CONFIRM_WORD} to confirm</Text>
          <TextInput
            value={confirmText}
            onChangeText={setConfirmText}
            placeholder={CONFIRM_WORD}
            placeholderTextColor={discoverColors.mutedText}
            style={styles.input}
            autoCapitalize="characters"
            autoCorrect={false}
          />
        </View>

        <Pressable
          style={[styles.deleteButton, !canDelete && styles.deleteButtonDisabled]}
          onPress={handleDelete}
          disabled={!canDelete || deleting}
        >
          {deleting ? (
            <ActivityIndicator color={colors.onAccent} />
          ) : (
            <Text style={styles.deleteButtonText}>Permanently delete my account</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
  },
  backButton: {
    marginBottom: spacing.lg,
  },
  body: {
    flex: 1,
    alignItems: 'center',
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(240,100,95,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.heading,
    fontSize: 22,
    textAlign: 'center',
  },
  body1: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.xl,
  },
  card: {
    alignSelf: 'stretch',
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  cardLabel: {
    color: colors.textFaint,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: discoverColors.rowBg,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 1,
  },
  deleteButton: {
    alignSelf: 'stretch',
    backgroundColor: colors.danger,
    borderRadius: radii.pill,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  deleteButtonDisabled: {
    opacity: 0.35,
  },
  deleteButtonText: {
    color: colors.onAccent,
    fontWeight: '700',
    fontSize: 15,
  },
});
