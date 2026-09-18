import React, { useEffect, useState } from 'react';
import { NavigationContainer, DefaultTheme, createNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Pressable } from 'react-native';
import * as Linking from 'expo-linking';
import { useShareIntentContext } from 'expo-share-intent';
import { TabNavigator } from './TabNavigator';
import { parseWidgetLink } from '../../features/widgets/links';
import { dispatchPlatformLink, parsePlatformLink } from '../../services/social/platformLink';
import { SplashScreen } from '../../shared/components/SplashScreen';
import { AddGameScreen } from '../../features/addGame/screens/AddGameScreen';
import { GameDetailScreen } from '../../features/library/screens/GameDetailScreen';
import { PaywallScreen } from '../../features/paywall/screens/PaywallScreen';
import { PassportScreen } from '../../features/passport/screens/PassportScreen';
import { AchievementDetailScreen } from '../../features/passport/screens/AchievementDetailScreen';
import { ShareConfirmScreen } from '../../features/share/screens/ShareConfirmScreen';
import { SteamLinkScreen } from '../../features/steam/screens/SteamLinkScreen';
import { FriendProfileScreen } from '../../features/friendProfile/screens/FriendProfileScreen';
import { PostDetailScreen } from '../../features/library/screens/PostDetailScreen';
import { FollowListScreen } from '../../features/friendProfile/screens/FollowListScreen';
import { FriendSearchScreen } from '../../features/friendProfile/screens/FriendSearchScreen';
import { NotificationsScreen } from '../../features/notifications/screens/NotificationsScreen';
import { EditProfileScreen } from '../../features/profile/screens/EditProfileScreen';
import { DeleteAccountScreen } from '../../features/profile/screens/DeleteAccountScreen';
import { LoginScreen } from '../../features/auth/screens/LoginScreen';
import { OnboardingScreen } from '../../features/onboarding/screens/OnboardingScreen';
import { useOnboardingStore } from '../../features/onboarding/store/useOnboardingStore';
import { useAuthStore } from '../../features/auth/store/useAuthStore';
import { useLibraryStore } from '../../features/library/store/useLibraryStore';
import { useWishlistStore } from '../../features/wishlist/store/useWishlistStore';
import { ensureProfile } from '../../services/social/profiles';
import { colors } from '../../shared/theme/theme';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();
const navigationRef = createNavigationContainerRef<RootStackParamList>();

/** Runs `action` once the navigator can take it; gives up after about three seconds. */
function whenNavigationReady(action: () => void, attempt = 0) {
  if (navigationRef.isReady()) action();
  else if (attempt < 20) setTimeout(() => whenNavigationReady(action, attempt + 1), 150);
}

/** Auth often resolves near-instantly from a cached session — hold the splash a beat so it's actually seen. */
const MIN_SPLASH_MS = 700;

/** How new an account has to be to count as "just signed up" for onboarding routing. */
const FRESH_SIGNUP_WINDOW_MS = 30 * 60 * 1000;

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
  const [onboardingPending, setOnboardingPending] = useState<boolean | null>(null);
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
    if (status !== 'signedIn') return;

    function handleUrl(url: string) {
      const widgetLink = parseWidgetLink(url);
      if (widgetLink) {
        // A widget tap can cold-start the app, so the URL may arrive before the navigator mounts.
        whenNavigationReady(() => {
          if (widgetLink.kind === 'game') navigationRef.navigate('GameDetail', { catalogId: widgetLink.catalogId });
          else if (widgetLink.kind === 'start') {
            // The roulette's Start: the game leaves the backlog, then its page opens.
            void useLibraryStore.getState().setStatus(widgetLink.catalogId, 'playing');
            navigationRef.navigate('GameDetail', { catalogId: widgetLink.catalogId });
          }
          else if (widgetLink.kind === 'wishlist') navigationRef.navigate('Tabs', { screen: 'WishlistTab' });
          else if (widgetLink.kind === 'library') navigationRef.navigate('Tabs', { screen: 'LibraryTab' });
          else navigationRef.navigate('Paywall');
        });
        return;
      }
      const platformLink = parsePlatformLink(url);
      if (!platformLink) return;
      // Onboarding runs the import inside its own step, so it takes the redirect itself.
      if (dispatchPlatformLink(platformLink)) return;
      // Anywhere else, only Steam has a result screen. Xbox links are started from onboarding only.
      if (platformLink.platform !== 'steam') return;
      whenNavigationReady(() => navigationRef.navigate('SteamLink', { status: platformLink.status, nonce: platformLink.nonce }));
    }

    Linking.getInitialURL().then((url) => {
      if (url) handleUrl(url);
    });
    const subscription = Linking.addEventListener('url', ({ url }) => handleUrl(url));
    return () => subscription.remove();
  }, [status]);

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
      if (session?.user.id) {
        // Local-only flag can't tell "just signed up" from "existing account, new device" —
        // an account created more than half an hour ago is treated as a returning login
        // regardless of whether this device has seen it before, so onboarding never
        // re-triggers for someone who just reinstalled or switched phones.
        const notCompletedLocally = !useOnboardingStore.getState().isComplete(session.user.id);
        const createdAt = session.user.created_at ? new Date(session.user.created_at).getTime() : 0;
        const isFreshSignup = createdAt > 0 && Date.now() - createdAt < FRESH_SIGNUP_WINDOW_MS;
        setOnboardingPending(notCompletedLocally && isFreshSignup);
      }
      // identifyOneSignalUser(session.user.id) — re-enable alongside initOneSignal()
      // in App.tsx once a build with the OneSignal native module is out.
    } else if (status === 'signedOut') {
      useLibraryStore.getState().reset();
      useWishlistStore.getState().reset();
      setOnboardingPending(null);
      // clearOneSignalUser() — same as above.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  if (status === 'loading' || !minSplashElapsed || (status === 'signedIn' && onboardingPending === null)) {
    return <SplashScreen />;
  }

  return (
    <NavigationContainer ref={navigationRef} theme={navigationTheme}>
      <Stack.Navigator
        initialRouteName={status === 'signedIn' ? (onboardingPending ? 'Onboarding' : 'Tabs') : undefined}
        screenOptions={{
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text,
          headerShadowVisible: false,
          headerTitleStyle: { fontWeight: '700' },
        }}
      >
        {status === 'signedOut' ? (
          <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
        ) : (
          <Stack.Group>
            <Stack.Screen name="Tabs" component={TabNavigator} options={{ headerShown: false }} />
            {/* Pushed as a card, not a modal: iOS refuses swipe-to-dismiss on fullScreenModal. */}
            <Stack.Screen
              name="Onboarding"
              component={OnboardingScreen}
              options={{ headerShown: false, gestureEnabled: false }}
            />
            <Stack.Screen
              name="AddGame"
              component={AddGameScreen}
              options={{
                headerShown: false,
                presentation: 'card',
                animation: 'slide_from_bottom',
                gestureDirection: 'vertical',
              }}
            />
            <Stack.Screen name="GameDetail" component={GameDetailScreen} options={{ headerShown: false }} />
            <Stack.Screen
              name="ShareConfirm"
              component={ShareConfirmScreen}
              options={{ headerShown: false, presentation: 'fullScreenModal', animation: 'slide_from_bottom' }}
            />
            <Stack.Screen
              name="SteamLink"
              component={SteamLinkScreen}
              options={{ headerShown: false, presentation: 'fullScreenModal', animation: 'slide_from_bottom' }}
            />
            <Stack.Screen
              name="FriendProfile"
              component={FriendProfileScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="PostDetail"
              component={PostDetailScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="FollowList"
              component={FollowListScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="FriendSearch"
              component={FriendSearchScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="Notifications"
              component={NotificationsScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="EditProfile"
              component={EditProfileScreen}
              options={{ headerShown: false, presentation: 'modal' }}
            />
            <Stack.Screen
              name="DeleteAccount"
              component={DeleteAccountScreen}
              options={{ headerShown: false, presentation: 'modal' }}
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
            <Stack.Screen
              name="AchievementDetail"
              component={AchievementDetailScreen}
              options={{ headerShown: false, presentation: 'modal' }}
            />
          </Stack.Group>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
