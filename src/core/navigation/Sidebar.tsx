import React, { useEffect, useRef } from 'react';
import { Alert, Animated, Dimensions, Easing, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image, type ImageSource } from 'expo-image';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, coverColors, discoverColors, radii, spacing } from '../../shared/theme/theme';
import type { CoverColorKey } from '../../data/catalog';

const DRAWER_WIDTH = Math.min(320, Dimensions.get('window').width * 0.8);

const PRYSM_WORDMARK = require('../../../assets/figma-icons/prysm-wordmark.png') as ImageSource;

type SidebarItem = {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  activeTab: 'games' | 'friends';
  onSelectGames: () => void;
  onSelectFriends: () => void;
  onOpenProfile: () => void;
  onOpenAchievements: () => void;
  onOpenEvents: () => void;
  displayName: string | null;
  avatarColor: CoverColorKey | null;
};

function comingSoon(feature: string) {
  Alert.alert(feature, "This is coming soon — we're still building it out.");
}

export function Sidebar({
  visible,
  onClose,
  activeTab,
  onSelectGames,
  onSelectFriends,
  onOpenProfile,
  onOpenAchievements,
  onOpenEvents,
  displayName,
  avatarColor,
}: Props) {
  const translateX = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const [mounted, setMounted] = React.useState(visible);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.parallel([
        Animated.timing(translateX, { toValue: 0, duration: 240, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(backdropOpacity, { toValue: 1, duration: 240, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateX, { toValue: -DRAWER_WIDTH, duration: 200, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
        Animated.timing(backdropOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start(({ finished }) => {
        if (finished) setMounted(false);
      });
    }
  }, [visible, translateX, backdropOpacity]);

  if (!mounted) return null;

  const items: SidebarItem[] = [
    { key: 'games', label: 'Games', icon: 'game-controller-outline', onPress: onSelectGames },
    { key: 'friends', label: 'Friends', icon: 'people-outline', onPress: onSelectFriends },
    { key: 'events', label: 'Events', icon: 'calendar-outline', onPress: onOpenEvents },
    { key: 'achievements', label: 'Achievements', icon: 'ribbon-outline', onPress: onOpenAchievements },
    { key: 'support', label: 'Support', icon: 'help-circle-outline', onPress: () => comingSoon('Support') },
  ];

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.root}>
        <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        </Animated.View>

        <Animated.View style={[styles.drawer, { transform: [{ translateX }] }]}>
          <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
          <View style={[StyleSheet.absoluteFill, styles.drawerTint]} />
          <View style={[styles.safeArea, { paddingTop: insets.top + spacing.sm, paddingBottom: insets.bottom + spacing.sm }]}>
            <View style={styles.header}>
              <Image source={PRYSM_WORDMARK} style={styles.brandLogo} contentFit="contain" />
              <Pressable hitSlop={12} onPress={onClose} style={styles.closeButton}>
                <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
                <View style={[StyleSheet.absoluteFill, styles.glassTint]} />
                <Ionicons name="close" size={16} color={colors.text} />
              </Pressable>
            </View>

            <View style={styles.items}>
              {items.map((item) => {
                const isActive = item.key === activeTab;
                return (
                  <Pressable
                    key={item.key}
                    onPress={item.onPress}
                    style={[styles.itemRow, isActive && styles.itemRowActive]}
                  >
                    <Ionicons
                      name={item.icon}
                      size={20}
                      color={isActive ? colors.accent : colors.textMuted}
                    />
                    <Text style={[styles.itemLabel, isActive && styles.itemLabelActive]}>{item.label}</Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.spacer} />

            <View style={styles.divider} />

            <Pressable style={styles.itemRow} onPress={() => comingSoon('Settings')}>
              <Ionicons name="settings-outline" size={20} color={colors.textMuted} />
              <Text style={styles.itemLabel}>Settings</Text>
            </Pressable>

            <Pressable style={styles.profileRow} onPress={onOpenProfile}>
              <View style={[styles.avatar, avatarColor && { backgroundColor: coverColors[avatarColor] }]}>
                {!avatarColor && <Ionicons name="person" size={16} color={colors.textMuted} />}
              </View>
              <Text style={styles.profileName} numberOfLines={1}>
                {displayName ?? 'Your profile'}
              </Text>
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    flexDirection: 'row',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  drawer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: DRAWER_WIDTH,
    borderRightWidth: 1,
    borderRightColor: colors.border,
    overflow: 'hidden',
  },
  drawerTint: {
    backgroundColor: 'rgba(9,9,9,0.55)',
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
  },
  brandLogo: {
    width: 75,
    height: 20,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    opacity: 0.5,
  },
  glassTint: {
    backgroundColor: discoverColors.navBg,
  },
  items: {
    marginTop: spacing.md,
    gap: spacing.md,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.md,
  },
  itemRowActive: {
    backgroundColor: colors.accentMuted,
  },
  itemLabel: {
    color: colors.textMuted,
    fontSize: 15,
    fontWeight: '600',
  },
  itemLabelActive: {
    color: colors.text,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
  spacer: {
    flex: 1,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileName: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
    flexShrink: 1,
  },
});
