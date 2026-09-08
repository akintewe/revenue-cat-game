import React, { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { Screen } from '../../../shared/components/Screen';
import { Button } from '../../../shared/components/Button';
import { colors, radii, spacing, typography } from '../../../shared/theme/theme';
import { APP_NAME, PLUS_ENTITLEMENT_ID } from '../../../shared/constants/app';
import { useLibraryStore, FREE_TIER_GAME_LIMIT } from '../../library/store/useLibraryStore';
import { useAuthStore } from '../../auth/store/useAuthStore';
import {
  getCustomerInfo,
  hasActiveEntitlement,
  restorePurchases,
} from '../../../services/revenuecat/purchases';
import type { TabScreenProps } from '../../../core/navigation/types';

type Props = TabScreenProps<'ProfileTab'>;

export function ProfileScreen({ navigation }: Props) {
  const [isPlus, setIsPlus] = useState(false);
  const gameCount = useLibraryStore((state) => state.entries.length);
  const signOut = useAuthStore((state) => state.signOut);
  const userEmail = useAuthStore((state) => state.session?.user.email);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      getCustomerInfo()
        .then((info) => {
          if (!cancelled) setIsPlus(hasActiveEntitlement(info, PLUS_ENTITLEMENT_ID));
        })
        .catch(() => undefined);
      return () => {
        cancelled = true;
      };
    }, []),
  );

  async function handleRestore() {
    try {
      const info = await restorePurchases();
      setIsPlus(hasActiveEntitlement(info, PLUS_ENTITLEMENT_ID));
      Alert.alert('Restored', 'Your purchases have been restored.');
    } catch (err) {
      Alert.alert('Restore failed', err instanceof Error ? err.message : 'Please try again.');
    }
  }

  return (
    <Screen>
      <Text style={typography.heading}>Profile</Text>
      {userEmail && <Text style={styles.email}>{userEmail}</Text>}

      <View style={styles.card}>
        <View style={styles.cardRow}>
          <Ionicons
            name={isPlus ? 'star' : 'star-outline'}
            size={20}
            color={isPlus ? colors.accent : colors.textMuted}
          />
          <Text style={typography.subheading}>
            {isPlus ? `${APP_NAME} Plus` : `${APP_NAME} Free`}
          </Text>
        </View>
        <Text style={typography.body}>
          {isPlus
            ? 'Unlimited shelves, backlog stats, and sync are unlocked.'
            : `${gameCount}/${FREE_TIER_GAME_LIMIT} games used on the free tier.`}
        </Text>
        {!isPlus && (
          <Button
            label="Upgrade to Plus"
            onPress={() => navigation.navigate('Paywall')}
            style={styles.spacerTop}
          />
        )}
      </View>

      <Pressable style={styles.linkRow} onPress={() => navigation.navigate('Passport')}>
        <Text style={typography.subheading}>Passport</Text>
        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
      </Pressable>

      <Pressable style={styles.linkRow} onPress={handleRestore}>
        <Text style={typography.subheading}>Restore purchases</Text>
        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
      </Pressable>

      <Pressable
        style={styles.linkRow}
        onPress={() =>
          Alert.alert('Log out', 'Are you sure you want to log out?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Log out', style: 'destructive', onPress: signOut },
          ])
        }
      >
        <Text style={[typography.subheading, styles.logoutLabel]}>Log out</Text>
        <Ionicons name="log-out-outline" size={18} color={colors.danger} />
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  email: {
    color: colors.textMuted,
    fontSize: 14,
    marginTop: 2,
  },
  logoutLabel: {
    color: colors.danger,
  },
  card: {
    marginTop: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  spacerTop: {
    marginTop: spacing.md,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    marginTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
});
