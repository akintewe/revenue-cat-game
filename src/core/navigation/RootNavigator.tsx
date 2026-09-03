import React from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { GameScreen } from '../../features/game/screens/GameScreen';
import { StoreScreen } from '../../features/store/screens/StoreScreen';
import { colors } from '../../shared/theme/theme';

export type RootStackParamList = {
  Game: undefined;
  Store: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const navigationTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.background,
    card: colors.surface,
    text: colors.text,
    primary: colors.primary,
    border: colors.surface,
  },
};

export function RootNavigator() {
  return (
    <NavigationContainer theme={navigationTheme}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Game" component={GameScreen} />
        <Stack.Screen
          name="Store"
          component={StoreScreen}
          options={{ headerShown: true, title: 'Store' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
