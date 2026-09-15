import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, coverColors, discoverColors, radii, spacing, typography } from '../../../shared/theme/theme';
import { ScreenBackground } from '../../../shared/components/ScreenBackground';
import { fetchMyProfile, updateMyProfile, ProfileUpdateError, type MyProfile } from '../../../services/social/profiles';
import { useAuthStore } from '../../auth/store/useAuthStore';
import type { CoverColorKey } from '../../../data/catalog';
import type { RootScreenProps } from '../../../core/navigation/types';

const AVATAR_COLOR_KEYS = Object.keys(coverColors) as CoverColorKey[];
const HANDLE_PATTERN = /^[a-z0-9_]{3,20}$/;
const BIO_MAX = 160;

type Props = RootScreenProps<'EditProfile'>;

export function EditProfileScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const userId = useAuthStore((state) => state.session?.user.id);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [original, setOriginal] = useState<MyProfile | null>(null);
  const [handle, setHandle] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [avatarColor, setAvatarColor] = useState<CoverColorKey>('slate');
  const [handleError, setHandleError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    fetchMyProfile(userId)
      .then((profile) => {
        if (!profile) return;
        setOriginal(profile);
        setHandle(profile.handle);
        setDisplayName(profile.display_name);
        setBio(profile.bio ?? '');
        setAvatarColor(profile.avatar_color);
      })
      .catch(() => Alert.alert('Could not load profile', 'Please try again.'))
      .finally(() => setLoading(false));
  }, [userId]);

  const handleValid = HANDLE_PATTERN.test(handle);
  const displayNameValid = displayName.trim().length > 0 && displayName.trim().length <= 40;
  const dirty =
    original != null &&
    (handle !== original.handle ||
      displayName.trim() !== original.display_name ||
      bio !== (original.bio ?? '') ||
      avatarColor !== original.avatar_color);
  const canSave = handleValid && displayNameValid && dirty && !saving;

  async function handleSave() {
    if (!userId || !original || !canSave) return;
    setSaving(true);
    setHandleError(null);
    try {
      await updateMyProfile(userId, {
        handle,
        display_name: displayName.trim(),
        bio,
        avatar_color: avatarColor,
      });
      navigation.goBack();
    } catch (err) {
      if (err instanceof ProfileUpdateError && err.field === 'handle') {
        setHandleError(err.message);
      } else {
        Alert.alert('Could not save', err instanceof Error ? err.message : 'Please try again.');
      }
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <View style={[styles.root, styles.centered, { paddingTop: insets.top }]}>
        <ScreenBackground />
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <ScreenBackground />
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </Pressable>
        <Text style={styles.title}>Edit profile</Text>
        <Pressable onPress={handleSave} disabled={!canSave} hitSlop={12}>
          {saving ? (
            <ActivityIndicator color={colors.accent} size="small" />
          ) : (
            <Text style={[styles.saveLabel, !canSave && styles.saveLabelDisabled]}>Save</Text>
          )}
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.sectionLabel}>Avatar color</Text>
        <View style={styles.swatchRow}>
          {AVATAR_COLOR_KEYS.map((key) => (
            <Pressable
              key={key}
              onPress={() => setAvatarColor(key)}
              style={[
                styles.swatch,
                { backgroundColor: coverColors[key] },
                avatarColor === key && styles.swatchSelected,
              ]}
            >
              {avatarColor === key && <Ionicons name="checkmark" size={18} color="#FFFFFF" />}
            </Pressable>
          ))}
        </View>

        <Text style={styles.sectionLabel}>Handle</Text>
        <View style={styles.inputRow}>
          <Text style={styles.inputPrefix}>@</Text>
          <TextInput
            value={handle}
            onChangeText={(text) => {
              setHandle(text.toLowerCase());
              setHandleError(null);
            }}
            placeholder="handle"
            placeholderTextColor={discoverColors.mutedText}
            style={styles.input}
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={20}
          />
        </View>
        <Text style={[styles.hint, (handleError || (handle.length > 0 && !handleValid)) && styles.hintError]}>
          {handleError ?? '3-20 characters: lowercase letters, numbers, and underscores only.'}
        </Text>

        <Text style={styles.sectionLabel}>Display name</Text>
        <TextInput
          value={displayName}
          onChangeText={setDisplayName}
          placeholder="Display name"
          placeholderTextColor={discoverColors.mutedText}
          style={[styles.input, styles.standaloneInput]}
          maxLength={40}
        />

        <Text style={styles.sectionLabel}>Bio</Text>
        <TextInput
          value={bio}
          onChangeText={(text) => setBio(text.slice(0, BIO_MAX))}
          placeholder="Tell people about yourself"
          placeholderTextColor={discoverColors.mutedText}
          style={[styles.input, styles.standaloneInput, styles.bioInput]}
          multiline
          maxLength={BIO_MAX}
        />
        <Text style={styles.hint}>{bio.length}/{BIO_MAX}</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  title: {
    ...typography.subheading,
    fontSize: 17,
  },
  saveLabel: {
    color: colors.accent,
    fontWeight: '700',
    fontSize: 15,
  },
  saveLabelDisabled: {
    color: colors.textFaint,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  sectionLabel: {
    color: colors.textFaint,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  swatchRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  swatch: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatchSelected: {
    borderWidth: 2,
    borderColor: colors.text,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: discoverColors.rowBg,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
  },
  inputPrefix: {
    color: colors.textMuted,
    fontSize: 16,
    marginRight: 2,
  },
  input: {
    flex: 1,
    color: colors.text,
    fontSize: 16,
    paddingVertical: spacing.sm + 2,
  },
  standaloneInput: {
    backgroundColor: discoverColors.rowBg,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
  },
  bioInput: {
    minHeight: 88,
    textAlignVertical: 'top',
  },
  hint: {
    color: colors.textFaint,
    fontSize: 12,
    marginTop: spacing.xs,
  },
  hintError: {
    color: colors.danger,
  },
});
