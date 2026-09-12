import React, { useEffect, useState } from 'react';
import { NavigationContainer, DefaultTheme, createNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Pressable } from 'react-native';
import { useShareIntentContext } from 'expo-share-intent';
import { TabNavigator } from './TabNavigator';
import { SplashScreen } from '../../shared/components/SplashScreen';
import { AddGameScreen } from '../../features/addGame/screens/AddGameScreen';
import { GameDetailScreen } from '../../features/library/screens/GameDetailScreen';
import { PaywallScreen } from '../../features/paywall/screens/PaywallScreen';
import { PassportScreen } from '../../features/passport/screens/PassportScreen';
import { ShareConfirmScreen } from '../../features/share/screens/ShareConfirmScreen';
import { LoginScreen } from '../../features/auth/screens/LoginScreen';
import { SignupScreen } from '../../features/auth/screens/SignupScreen';
import { useAuthStore } from '../../features/auth/store/useAuthStore';
import { useLibraryStore } from '../../features/library/store/useLibraryStore';
import { useWishlistStore } from '../../features/wishlist/store/useWishlistStore';
import { ensureProfile } from '../../services/social/profiles';
import { colors } from '../../shared/theme/theme';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();
const navigationRef = createNavigationContainerRef<RootStackParamList>();

/** Auth often resolves near-instantly from a cached session — hold the splash a beat so it's actually seen. */
const MIN_SPLASH_MS = 700;

const navigationTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.background,
    card: colors.surface,
    text: colors.text,
    primary: colors.accent,
    border: colors.border,
  },
};

function BackButton({ navigation }: { navigation: { goBack: () => void } }) {
  return (
    <Pressable onPress={navigation.goBack} hitSlop={12}>
      <Ionicons name="chevron-back" size={24} color={colors.text} />
    </Pressable>
  );
}

export function RootNavigator() {
  const status = useAuthStore((state) => state.status);
  const session = useAuthStore((state) => state.session);
  const initialize = useAuthStore((state) => state.initialize);
  const [minSplashElapsed, setMinSplashElapsed] = useState(false);
  const { hasShareIntent, shareIntent, resetShareIntent } = useShareIntentContext();

  useEffect(() => {
    if (!hasShareIntent || status !== 'signedIn') return;
    const url = shareIntent.webUrl ?? shareIntent.text?.match(/https?:\/\/\S+/)?.[0];
    if (url && navigationRef.isReady()) {
      navigationRef.navigate('ShareConfirm', { url });
    }
    resetShareIntent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasShareIntent, status]);

  useEffect(() => {
    initialize();
    const timer = setTimeout(() => setMinSplashElapsed(true), MIN_SPLASH_MS);
    return () => clearTimeout(timer);
  }, [initialize]);

  useEffect(() => {
    if (status === 'signedIn') {
      useLibraryStore.getState().hydrate();
      useWishlistStore.getState().hydrate();
      if (session?.user.email) {
        ensureProfile(session.user.id, session.user.email).catch((err) =>
          console.warn('[profiles] ensureProfile failed', err),
        );
      }
    } else if (status === 'signedOut') {
      useLibraryStore.getState().reset();
      useWishlistStore.getState().reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  if (status === 'loading' || !minSplashElapsed) {
    return <SplashScreen />;
  }

  return (
    <NavigationContainer ref={navigationRef} theme={navigationTheme}>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text,
          headerShadowVisible: false,
          headerTitleStyle: { fontWeight: '700' },
        }}
      >
        {status === 'signedOut' ? (
          <Stack.Group screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Signup" component={SignupScreen} />
          </Stack.Group>
        ) : (
          <Stack.Group>
            <Stack.Screen name="Tabs" component={TabNavigator} options={{ headerShown: false }} />
            <Stack.Screen
              name="AddGame"
              component={AddGameScreen}
              options={{ headerShown: false, presentation: 'fullScreenModal', animation: 'slide_from_bottom' }}
            />
            <Stack.Screen name="GameDetail" component={GameDetailScreen} options={{ headerShown: false }} />
            <Stack.Screen
              name="ShareConfirm"
              component={ShareConfirmScreen}
              options={{ headerShown: false, presentation: 'fullScreenModal', animation: 'slide_from_bottom' }}
            />
            <Stack.Screen
              name="Paywall"
              component={PaywallScreen}
              options={{ presentation: 'modal', headerShown: false }}
            />
            <Stack.Screen
              name="Passport"
              component={PassportScreen}
              options={({ navigation }) => ({ title: '', headerLeft: () => <BackButton navigation={navigation} /> })}
            />
          </Stack.Group>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
