import { Platform } from 'react-native';
import { registerRootComponent } from 'expo';

import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);

// Android home screen widgets render in a headless JS task, so the handler is registered at the
// entry point and not inside the React tree. The library's native module throws on import
// where it does not exist, so iOS must never load it: hence require() behind the platform check.
if (Platform.OS === 'android') {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { registerWidgetTaskHandler } = require('react-native-android-widget');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { widgetTaskHandler } = require('./src/features/widgets/android/widgetTaskHandler');
  registerWidgetTaskHandler(widgetTaskHandler);
}
