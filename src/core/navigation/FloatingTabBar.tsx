import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Image, type ImageSource } from 'expo-image';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { colors, discoverColors, radii, spacing } from '../../shared/theme/theme';
import type { TabParamList } from './types';

const TAB_ICON: Record<keyof TabParamList, ImageSource> = {
  LibraryTab: require('../../../assets/figma-icons/nav-library.png'),
  WishlistTab: require('../../../assets/figma-icons/nav-wishlist.png'),
  ProfileTab: require('../../../assets/figma-icons/nav-profile.png'),
};

const SEARCH_ICON = require('../../../assets/figma-icons/nav-search.png') as ImageSource;

export function FloatingTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom || spacing.md }]}>
      <View style={styles.pillShadow}>
        <View style={styles.pill}>
          <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
          <View style={[StyleSheet.absoluteFill, styles.pillTintDark]} />
          {state.routes.map((route, index) => {
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
                <Image source={icon} style={styles.tabIcon} contentFit="contain" />
                {isFocused && <View style={styles.activeDot} />}
              </Pressable>
            );
          })}
        </View>
      </View>

      <Pressable
        style={styles.fab}
        onPress={() => navigation.getParent()?.navigate('AddGame')}
      >
        <Image source={SEARCH_ICON} style={styles.fabIcon} contentFit="contain" />
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
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radii.pill,
    overflow: 'hidden',
  },
  pillTintDark: {
    backgroundColor: discoverColors.navBg,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  tabIcon: {
    width: 24,
    height: 24,
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: radii.pill,
    backgroundColor: colors.accent,
  },
  fab: {
    width: 69,
    height: 54,
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
