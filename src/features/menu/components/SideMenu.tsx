import React, { useEffect, useRef, useState } from 'react';
import { Animated, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { Image, type ImageSource } from 'expo-image';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Wordmark } from '../../../shared/components/brand/Wordmark';
import { GradientBadge } from '../../../shared/components/badges/GradientBadge';
import { CountBadge } from '../../../shared/components/badges/CountBadge';
import { colors, coverColors } from '../../../shared/theme/theme';
import { useAuthStore } from '../../auth/store/useAuthStore';
import { fetchMyProfileSummary, type MyProfileSummary } from '../../../services/social/profiles';
import type { RootStackParamList } from '../../../core/navigation/types';
import { useSideMenuStore } from '../store/useSideMenuStore';

/**
 * The left side menu from the Figma "iPhone 16 & 17 Pro - 50" frame. Measured in points:
 * panel 323 wide, header centred 36 below the safe top, divider 88 below it, rows on a 60pt
 * pitch, bottom group anchored to the safe bottom. Mounted once above the tab navigator.
 */
const PANEL_WIDTH = 323;
const HEADER_CENTER = 36;
const HEADER_DIVIDER = 88;
const ROW_HEIGHT = 60;
const CLOSE_SIZE = 35;
const ICON_SIZE = 24;
const AVATAR_SIZE = 28;

const glassAvailable = Platform.OS === 'ios' && isLiquidGlassAvailable();

type MenuItemKey = 'games' | 'friends' | 'events' | 'achievements' | 'support' | 'settings';

const ICONS: Record<MenuItemKey, ImageSource> = {
  games: require('../../../../assets/figma-icons/menu-games.png'),
  friends: require('../../../../assets/figma-icons/menu-friends.png'),
  events: require('../../../../assets/figma-icons/menu-events.png'),
  achievements: require('../../../../assets/figma-icons/menu-achievements.png'),
  support: require('../../../../assets/figma-icons/menu-support.png'),
  settings: require('../../../../assets/figma-icons/menu-settings.png'),
};

const MAIN_ITEMS: { key: MenuItemKey; label: string; trailing?: React.ReactNode }[] = [
  { key: 'games', label: 'Games' },
  { key: 'friends', label: 'Friends', trailing: <GradientBadge label="New" /> },
  { key: 'events', label: 'Events', trailing: <CountBadge count={2} /> },
  { key: 'achievements', label: 'Achievements' },
  { key: 'support', label: 'Support' },
];

type Navigation = NativeStackNavigationProp<RootStackParamList>;

export function SideMenu() {
  const isOpen = useSideMenuStore((state) => state.isOpen);
  const hide = useSideMenuStore((state) => state.hide);
  const navigation = useNavigation<Navigation>();
  const insets = useSafeAreaInsets();
  const session = useAuthStore((state) => state.session);

  // Stays mounted while the close animation runs, then unmounts.
  const [mounted, setMounted] = useState(isOpen);
  const progress = useRef(new Animated.Value(isOpen ? 1 : 0)).current;
  const [profile, setProfile] = useState<MyProfileSummary | null>(null);

  useEffect(() => {
    if (isOpen) {
      setMounted(true);
      Animated.spring(progress, {
        toValue: 1,
        useNativeDriver: true,
        stiffness: 260,
        damping: 30,
        mass: 1,
      }).start();
      return;
    }
    Animated.timing(progress, { toValue: 0, duration: 220, useNativeDriver: true }).start(({ finished }) => {
      if (finished) setMounted(false);
    });
  }, [isOpen, progress]);

  useEffect(() => {
    const userId = session?.user.id;
    if (!isOpen || !userId || profile) return;
    fetchMyProfileSummary(userId)
      .then(setProfile)
      .catch((err) => console.warn('[side-menu] profile summary failed', err));
  }, [isOpen, profile, session?.user.id]);

  if (!mounted) return null;

  function goToLibrary(tab: 'games' | 'friends') {
    hide();
    navigation.navigate('Tabs', { screen: 'LibraryTab', params: { tab } });
  }

  function goToProfile() {
    hide();
    navigation.navigate('Tabs', { screen: 'ProfileTab' });
  }

  function handleItem(key: MenuItemKey) {
    switch (key) {
      case 'games':
        goToLibrary('games');
        break;
      case 'friends':
        goToLibrary('friends');
        break;
      case 'settings':
        goToProfile();
        break;
      default:
        // Events, Achievements and Support have no screens yet.
        hide();
    }
  }

  const avatarColor = (profile?.avatarColor && coverColors[profile.avatarColor]) || colors.accent;
  const displayName = profile?.displayName ?? session?.user.email?.split('@')[0] ?? 'You';

  const translateX = progress.interpolate({ inputRange: [0, 1], outputRange: [-PANEL_WIDTH, 0] });

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: progress }]}>
        <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
        <Pressable accessibilityLabel="Close menu" onPress={hide} style={[StyleSheet.absoluteFill, styles.dim]} />
      </Animated.View>

      <Animated.View style={[styles.panel, { transform: [{ translateX }] }]}>
        <View style={[styles.header, { marginTop: insets.top + HEADER_CENTER - CLOSE_SIZE / 2 }]}>
          <Wordmark fontSize={16} glow />
          <Pressable accessibilityLabel="Close menu" onPress={hide} hitSlop={10} style={styles.closeButton}>
            {glassAvailable ? (
              <GlassView
                style={[StyleSheet.absoluteFill, styles.closeGlass]}
                glassEffectStyle="regular"
                colorScheme="dark"
                isInteractive
                tintColor="rgba(255,255,255,0.06)"
              />
            ) : (
              <View style={[StyleSheet.absoluteFill, styles.closeFallback]} />
            )}
            <Ionicons name="close" size={20} color="#9A9A9A" />
          </Pressable>
        </View>
        <View style={[styles.divider, { marginTop: HEADER_DIVIDER - HEADER_CENTER - CLOSE_SIZE / 2 }]} />

        <View style={styles.list}>
          {MAIN_ITEMS.map((item) => (
            <MenuRow key={item.key} label={item.label} icon={ICONS[item.key]} trailing={item.trailing} onPress={() => handleItem(item.key)} />
          ))}
        </View>

        <View style={[styles.bottomGroup, { paddingBottom: insets.bottom + 19 }]}>
          <View style={styles.divider} />
          <View style={styles.bottomList}>
            <MenuRow label="Settings" icon={ICONS.settings} onPress={() => handleItem('settings')} />
            <Pressable onPress={goToProfile} style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}>
              <View style={[styles.avatar, { backgroundColor: avatarColor }]} />
              <Text style={styles.label} numberOfLines={1}>
                {displayName}
              </Text>
            </Pressable>
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

type RowProps = {
  label: string;
  icon: ImageSource;
  trailing?: React.ReactNode;
  onPress: () => void;
};

function MenuRow({ label, icon, trailing, onPress }: RowProps) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}>
      <Image source={icon} style={styles.icon} contentFit="contain" />
      <Text style={styles.label} numberOfLines={1}>
        {label}
      </Text>
      {trailing && <View style={styles.trailing}>{trailing}</View>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  dim: {
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  panel: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: PANEL_WIDTH,
    backgroundColor: '#000000CC',
    // Only the right edge has a border. The other three edges melt into the screen edges.
    borderRightWidth: 0.5,
    borderRightColor: '#3F3F3F',
  },
  header: {
    height: CLOSE_SIZE,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 31,
    paddingRight: 17,
  },
  // No overflow clip: the interactive glass scales past its bounds on press.
  closeButton: {
    width: CLOSE_SIZE,
    height: CLOSE_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeGlass: {
    // The radius goes on the glass view itself so the glass shape is a circle.
    borderRadius: CLOSE_SIZE / 2,
  },
  closeFallback: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: CLOSE_SIZE / 2,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.13)',
  },
  list: {
    paddingTop: 8,
  },
  bottomGroup: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  bottomList: {
    paddingTop: 16,
  },
  row: {
    height: ROW_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 34,
    paddingRight: 26,
    gap: 15,
  },
  rowPressed: {
    opacity: 0.6,
  },
  icon: {
    width: ICON_SIZE,
    height: ICON_SIZE,
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    marginLeft: -2,
    marginRight: -2,
  },
  label: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  trailing: {
    marginLeft: 8,
  },
});
