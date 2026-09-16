import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { LibraryScreen } from '../../features/library/screens/LibraryScreen';
import { WishlistScreen } from '../../features/wishlist/screens/WishlistScreen';
import { ProfileScreen } from '../../features/profile/screens/ProfileScreen';
import { FloatingTabBar } from './FloatingTabBar';
import { SideMenu } from '../../features/menu/components/SideMenu';
import type { TabParamList } from './types';

const Tab = createBottomTabNavigator<TabParamList>();

export function TabNavigator() {
  return (
    <>
      <Tab.Navigator
        tabBar={(props) => <FloatingTabBar {...props} />}
        screenOptions={{ headerShown: false }}
      >
        <Tab.Screen name="LibraryTab" component={LibraryScreen} options={{ title: 'Library' }} />
        <Tab.Screen name="WishlistTab" component={WishlistScreen} options={{ title: 'Wishlist' }} />
        <Tab.Screen name="ProfileTab" component={ProfileScreen} options={{ title: 'Profile' }} />
      </Tab.Navigator>
      {/* Above the screens and the floating tab bar. */}
      <SideMenu />
    </>
  );
}
