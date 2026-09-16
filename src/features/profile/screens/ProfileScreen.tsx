import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image, type ImageSource } from 'expo-image';
import { useFocusEffect } from '@react-navigation/native';
import * as WebBrowser from 'expo-web-browser';
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
import { fetchMyShareActivity, setShareActivity } from '../../../services/social/profiles';
import {
  disconnectSteam,
  fetchPlatformAccounts,
  importSteamLibrary,
  startSteamLink,
  SteamProfilePrivateError,
  type PlatformAccount,
} from '../../../services/social/steam';
import { scanAndImportAndroidGames } from '../../../services/social/android';
import type { TabScreenProps } from '../../../core/navigation/types';

const STEAM_CONNECT_BUTTON = require('../../../../assets/figma-icons/steam-connect-button.png') as ImageSource;

type Props = TabScreenProps<'ProfileTab'>;

export function ProfileScreen({ navigation }: Props) {
  const [isPlus, setIsPlus] = useState(false);
  const gameCount = useLibraryStore((state) => state.entries.length);
  const signOut = useAuthStore((state) => state.signOut);
  const userId = useAuthStore((state) => state.session?.user.id);
  const userEmail = useAuthStore((state) => state.session?.user.email);

  const [shareActivity, setShareActivityState] = useState(true);
  const [steamAccount, setSteamAccount] = useState<PlatformAccount | null>(null);
  const [steamBusy, setSteamBusy] = useState(false);
  const [androidScanBusy, setAndroidScanBusy] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      fetchPlatformAccounts()
        .then((accounts) => {
          if (cancelled) return;
          setSteamAccount(accounts.find((a) => a.platform === 'steam') ?? null);
        })
        .catch(() => undefined);
      return () => {
        cancelled = true;
      };
    }, []),
  );

  async function handleConnectSteam() {
    setSteamBusy(true);
    try {
      const { redirectUrl } = await startSteamLink();
      await WebBrowser.openBrowserAsync(redirectUrl);
    } catch (err) {
      Alert.alert('Could not connect Steam', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setSteamBusy(false);
    }
  }

  async function handleResyncSteam() {
    setSteamBusy(true);
    try {
      const result = await importSteamLibrary();
      const accounts = await fetchPlatformAccounts();
      setSteamAccount(accounts.find((a) => a.platform === 'steam') ?? null);
      await useLibraryStore.getState().hydrate();
      Alert.alert(
        'Steam synced',
        `${result.matched.toLocaleString()} games up to date out of ${result.total.toLocaleString()} in your Steam library — the rest are mostly bundle extras and non-game apps we don't track.`,
      );
    } catch (err) {
      if (err instanceof SteamProfilePrivateError) {
        Alert.alert('Your Steam profile is private', err.message, [
          { text: 'Not now', style: 'cancel' },
          { text: 'Fix privacy settings', onPress: () => WebBrowser.openBrowserAsync(err.fixUrl) },
        ]);
      } else {
        Alert.alert('Could not sync Steam', err instanceof Error ? err.message : 'Please try again.');
      }
    } finally {
      setSteamBusy(false);
    }
  }

  function handleDisconnectSteam() {
    Alert.alert(
      'Disconnect Steam',
      "Games you've rated, statused or added notes to stay in your library — everything else Steam added goes with it.",
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: async () => {
            setSteamBusy(true);
            try {
              await disconnectSteam();
              setSteamAccount(null);
              useLibraryStore.getState().hydrate();
            } catch (err) {
              Alert.alert('Could not disconnect', err instanceof Error ? err.message : 'Please try again.');
            } finally {
              setSteamBusy(false);
            }
          },
        },
      ],
    );
  }

  async function handleScanAndroid() {
    setAndroidScanBusy(true);
    try {
      const result = await scanAndImportAndroidGames();
      await useLibraryStore.getState().hydrate();
      Alert.alert(
        'Scan complete',
        result.matched > 0
          ? `Found ${result.matched.toLocaleString()} game${result.matched === 1 ? '' : 's'} on this device and added them to your shelf.`
          : "Didn't find any games from our catalog installed on this device.",
      );
    } catch (err) {
      Alert.alert('Could not scan', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setAndroidScanBusy(false);
    }
  }

  useEffect(() => {
    if (!userId) return;
    fetchMyShareActivity(userId)
      .then(setShareActivityState)
      .catch(() => undefined);
  }, [userId]);

  function handleToggleShareActivity(enabled: boolean) {
    if (!userId) return;
    setShareActivityState(enabled);
    setShareActivity(userId, enabled).catch((err) => {
      console.warn('[profile] setShareActivity failed', err);
      setShareActivityState(!enabled);
    });
  }

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

      <Pressable style={styles.linkRow} onPress={() => navigation.navigate('EditProfile')}>
        <Text style={typography.subheading}>Edit profile</Text>
        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
      </Pressable>

      <Pressable style={styles.linkRow} onPress={() => navigation.navigate('Passport')}>
        <Text style={typography.subheading}>Passport</Text>
        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
      </Pressable>

      <View style={styles.linkRow}>
        <View style={styles.toggleLabelGroup}>
          <Text style={typography.subheading}>Steam</Text>
          {steamAccount ? (
            <Text style={styles.toggleHint}>
              Connected as {steamAccount.display_name ?? steamAccount.external_id}
              {steamAccount.last_import_matched != null
                ? ` · ${steamAccount.last_import_matched} games imported`
                : ''}
            </Text>
          ) : (
            <Text style={styles.toggleHint}>Import your whole library in seconds.</Text>
          )}
        </View>
        {steamBusy ? (
          <ActivityIndicator color={colors.textMuted} />
        ) : steamAccount ? (
          <View style={styles.steamActions}>
            <Pressable onPress={handleResyncSteam} hitSlop={8}>
              <Ionicons name="refresh" size={18} color={colors.accent} />
            </Pressable>
            <Pressable onPress={handleDisconnectSteam}>
              <Text style={[typography.subheading, styles.steamAction, styles.logoutLabel]}>Disconnect</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable onPress={handleConnectSteam}>
            <Image source={STEAM_CONNECT_BUTTON} style={styles.steamButtonImage} contentFit="contain" />
          </Pressable>
        )}
      </View>

      {Platform.OS === 'android' && (
        <View style={styles.linkRow}>
          <View style={styles.toggleLabelGroup}>
            <Text style={typography.subheading}>Installed games</Text>
            <Text style={styles.toggleHint}>Scan this device and add anything from our catalog you already have.</Text>
          </View>
          {androidScanBusy ? (
            <ActivityIndicator color={colors.textMuted} />
          ) : (
            <Pressable onPress={handleScanAndroid} hitSlop={8}>
              <Ionicons name="scan-outline" size={20} color={colors.accent} />
            </Pressable>
          )}
        </View>
      )}

      <View style={styles.linkRow}>
        <View style={styles.toggleLabelGroup}>
          <Text style={typography.subheading}>Share activity with friends</Text>
          <Text style={styles.toggleHint}>
            Lets people who follow you count your games in "Popular with friends". Never reveals which games.
          </Text>
        </View>
        <Switch
          value={shareActivity}
          onValueChange={handleToggleShareActivity}
          trackColor={{ false: colors.border, true: colors.accent }}
          thumbColor={colors.onAccent}
        />
      </View>

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

      <Pressable style={styles.linkRow} onPress={() => navigation.navigate('DeleteAccount')}>
        <Text style={[typography.subheading, styles.logoutLabel]}>Delete account</Text>
        <Ionicons name="trash-outline" size={18} color={colors.danger} />
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
  steamActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  steamAction: {
    color: colors.accent,
  },
  steamButtonImage: {
    width: 135,
    height: 26,
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
  toggleLabelGroup: {
    flex: 1,
    gap: 2,
    paddingRight: spacing.md,
  },
  toggleHint: {
    color: colors.textFaint,
    fontSize: 12,
    lineHeight: 16,
  },
});
