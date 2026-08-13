/**
 * Bare React Native entry point.
 * Must be the FIRST thing that runs — polyfills and the background message
 * handler have to be registered before the app renders.
 */
import 'react-native-gesture-handler';
import './src/polyfills';

import { AppRegistry } from 'react-native';
import App from './src/App';
import { registerBackgroundMessageHandler } from './src/services/notifications';
import { name as appName } from './app.json';

// Headless handler: fires when a data-only push arrives with the app killed
// or backgrounded. Keep it tiny — Android gives it a short window.
//
// Registration is a no-op on builds without Firebase configured. Calling
// messaging() directly here used to throw during module evaluation, which
// killed the app on launch before anything rendered.
registerBackgroundMessageHandler(async remoteMessage => {
  console.log('[push] background message', remoteMessage?.messageId);
});

AppRegistry.registerComponent(appName, () => App);
