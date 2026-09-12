import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { ShareIntentProvider } from 'expo-share-intent';
import { RootNavigator } from './src/core/navigation/RootNavigator';
import { configurePurchases } from './src/services/revenuecat/purchases';

export default function App() {
  useEffect(() => {
    configurePurchases();
  }, []);

  return (
    <ShareIntentProvider>
      <RootNavigator />
      <StatusBar style="light" />
    </ShareIntentProvider>
  );
}
