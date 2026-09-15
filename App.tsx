import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { ShareIntentProvider } from 'expo-share-intent';
import { RootNavigator } from './src/core/navigation/RootNavigator';
import { configurePurchases } from './src/services/revenuecat/purchases';
// initOneSignal() is wired in src/services/notifications/oneSignal.ts but not called
// yet — the native module only exists in builds made after the OneSignal plugin was
// added, and TurboModuleRegistry's missing-module invariant isn't reliably catchable
// from JS, so calling it against an already-shipped build crashes on launch. Re-enable
// the call below once a fresh EAS build (with the plugin applied) is out.
// import { initOneSignal } from './src/services/notifications/oneSignal';

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
