/**
 * Bare React Native entry point.
 * Must be the FIRST thing that runs — polyfills and the background message
 * handler have to be registered before the app renders.
 */
import 'react-native-gesture-handler';
import './src/polyfills';

import { AppRegistry } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import App from './src/App';
import { name as appName } from './app.json';

// Headless handler: fires when a data-only push arrives with the app killed
// or backgrounded. Keep it tiny — Android gives it a short window.
messaging().setBackgroundMessageHandler(async remoteMessage => {
  console.log('[push] background message', remoteMessage?.messageId);
});

AppRegistry.registerComponent(appName, () => App);
