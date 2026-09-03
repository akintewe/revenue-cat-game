import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { RootNavigator } from './src/core/navigation/RootNavigator';
import { configurePurchases } from './src/services/revenuecat/purchases';

export default function App() {
  useEffect(() => {
    configurePurchases();
  }, []);

  return (
    <>
      <RootNavigator />
      <StatusBar style="light" />
    </>
  );
}
