import React from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { Image, type ImageSource } from 'expo-image';
import { BlurView } from 'expo-blur';
import { GlassContainer, GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { colors, discoverColors, radii, spacing } from '../../shared/theme/theme';
import type { TabParamList } from './types';

/** Outline when idle, filled when selected. Figma "Frame 24/26/27" pairs; the filled profile is derived from its outline. */
const TAB_ICON: Record<keyof TabParamList, { outline: ImageSource; filled: ImageSource }> = {
  LibraryTab: {
    outline: require('../../../assets/figma-icons/nav-library-outline.png'),
    filled: require('../../../assets/figma-icons/nav-library-filled.png'),
  },
  WishlistTab: {
    outline: require('../../../assets/figma-icons/nav-wishlist-outline.png'),
    filled: require('../../../assets/figma-icons/nav-wishlist-filled.png'),
  },
  ProfileTab: {
    outline: require('../../../assets/figma-icons/nav-profile-outline.png'),
    filled: require('../../../assets/figma-icons/nav-profile-filled.png'),
  },
};

const SEARCH_ICON = require('../../../assets/figma-icons/nav-search.png') as ImageSource;

const BAR_HEIGHT = 54;
const glassAvailable = Platform.OS === 'ios' && isLiquidGlassAvailable();

export function FloatingTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  const tabItems = state.routes.map((route, index) => {
    const isFocused = state.index === index;
    const icon = TAB_ICON[route.name as keyof TabParamList];

    function handlePress() {
      const event = navigation.emit({
        type: 'tabPress',
        target: route.key,
        canPreventDefault: true,
      });
      if (!isFocused && !event.defaultPrevented) {
        navigation.navigate(route.name);
      }
    }

    return (
      <Pressable key={route.key} onPress={handlePress} style={styles.tabItem}>
        <Image source={isFocused ? icon.filled : icon.outline} style={styles.tabIcon} contentFit="contain" />
      </Pressable>
    );
  });

  const searchIcon = <Image source={SEARCH_ICON} style={styles.fabIcon} contentFit="contain" />;
  const openSearch = () => navigation.getParent()?.navigate('AddGame');

  if (glassAvailable) {
    // iOS 26: one interactive glass pill for the tabs and one for search, grouped so they
    // merge when they get close. No overflow clip, so the press scale is not cut off.
    return (
      <GlassContainer
        spacing={4}
        style={[styles.container, { paddingBottom: insets.bottom || spacing.md }]}
      >
        <GlassView
          style={styles.glassPill}
          glassEffectStyle="regular"
          colorScheme="dark"
          isInteractive
          tintColor={discoverColors.navBg}
        >
          {tabItems}
        </GlassView>
        <GlassView
          style={styles.glassFab}
          glassEffectStyle="regular"
          colorScheme="dark"
          isInteractive
          tintColor={colors.accent}
        >
          <Pressable style={styles.glassFabHit} onPress={openSearch}>
            {searchIcon}
          </Pressable>
        </GlassView>
      </GlassContainer>
    );
  }

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom || spacing.md }]}>
      <View style={styles.pillShadow}>
        <View style={styles.pill}>
          <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
          <View style={[StyleSheet.absoluteFill, styles.pillTintDark]} />
          {tabItems}
        </View>
      </View>

      <Pressable style={styles.fab} onPress={openSearch}>
        {searchIcon}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  pillShadow: {
    flex: 1,
    borderRadius: radii.pill,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  pill: {
    height: BAR_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radii.pill,
    overflow: 'hidden',
  },
  // Explicit half-height radii: UICornerRadius does not clamp radii.pill (999).
  glassPill: {
    flex: 1,
    height: BAR_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BAR_HEIGHT / 2,
  },
  glassFab: {
    width: 69,
    height: BAR_HEIGHT,
    borderRadius: BAR_HEIGHT / 2,
    shadowColor: colors.accent,
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  glassFabHit: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillTintDark: {
    backgroundColor: discoverColors.navBg,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
  },
  tabIcon: {
    width: 24,
    height: 24,
  },
  fab: {
    width: 69,
    height: BAR_HEIGHT,
    borderRadius: radii.pill,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.accent,
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  fabIcon: {
    width: 22,
    height: 22,
  },
});
