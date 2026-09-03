import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { LibraryScreen } from '../../features/library/screens/LibraryScreen';
import { AddGameScreen } from '../../features/addGame/screens/AddGameScreen';
import { WishlistScreen } from '../../features/wishlist/screens/WishlistScreen';
import { ProfileScreen } from '../../features/profile/screens/ProfileScreen';
import { colors } from '../../shared/theme/theme';
import { useResponsiveLayout } from '../../shared/hooks/useResponsiveLayout';
import type { TabParamList } from './types';

const Tab = createBottomTabNavigator<TabParamList>();

const ICONS: Record<keyof TabParamList, keyof typeof Ionicons.glyphMap> = {
  LibraryTab: 'library',
  AddTab: 'add-circle',
  WishlistTab: 'bookmark',
  ProfileTab: 'person-circle',
};

export function TabNavigator() {
  const { navPlacement } = useResponsiveLayout();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarPosition: navPlacement === 'rail' ? 'left' : 'bottom',
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: { backgroundColor: colors.surface, borderColor: colors.border },
        tabBarIcon: ({ color, size }) => (
          <Ionicons name={ICONS[route.name as keyof TabParamList]} size={size} color={color} />
        ),
      })}
    >
      <Tab.Screen name="LibraryTab" component={LibraryScreen} options={{ title: 'Library' }} />
      <Tab.Screen name="AddTab" component={AddGameScreen} options={{ title: 'Add' }} />
      <Tab.Screen name="WishlistTab" component={WishlistScreen} options={{ title: 'Wishlist' }} />
      <Tab.Screen name="ProfileTab" component={ProfileScreen} options={{ title: 'Profile' }} />
    </Tab.Navigator>
  );
}
