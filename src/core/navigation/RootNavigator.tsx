import React, { useEffect } from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { TabNavigator } from './TabNavigator';
import { AddGameScreen } from '../../features/addGame/screens/AddGameScreen';
import { GameDetailScreen } from '../../features/library/screens/GameDetailScreen';
import { AllGamesScreen } from '../../features/library/screens/AllGamesScreen';
import { PaywallScreen } from '../../features/paywall/screens/PaywallScreen';
import { PassportScreen } from '../../features/passport/screens/PassportScreen';
import { LoginScreen } from '../../features/auth/screens/LoginScreen';
import { SignupScreen } from '../../features/auth/screens/SignupScreen';
import { useAuthStore } from '../../features/auth/store/useAuthStore';
import { useLibraryStore } from '../../features/library/store/useLibraryStore';
import { colors } from '../../shared/theme/theme';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

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
  const initialize = useAuthStore((state) => state.initialize);

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    if (status === 'signedIn') {
      useLibraryStore.getState().hydrate();
    } else if (status === 'signedOut') {
      useLibraryStore.getState().reset();
    }
  }, [status]);

  if (status === 'loading') {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return (
    <NavigationContainer theme={navigationTheme}>
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
              name="AllGames"
              component={AllGamesScreen}
              options={({ navigation }) => ({
                title: 'All Games',
                headerLeft: () => <BackButton navigation={navigation} />,
              })}
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
