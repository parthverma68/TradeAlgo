/**
 * Bare React Native entry point.
 *
 * Order matters here. `AppRegistry.registerComponent` runs BEFORE any optional
 * wiring, because anything that throws before it leaves the app dead on launch
 * with the misleading
 *
 *   Invariant Violation: "PreMarketIQ" has not been registered.
 *
 * which reads like a Metro problem but is really "a module failed to load".
 * Registering first means a broken optional integration costs you that feature,
 * not the whole app.
 */
import 'react-native-gesture-handler';
import './src/polyfills';

import { AppRegistry } from 'react-native';
import { name as appName } from './app.json';

// The component factory is called when the app actually mounts, so App's whole
// import graph is pulled in AFTER registration. A failure in there then shows
// up as a real error at mount time instead of a phantom registration problem.
AppRegistry.registerComponent(appName, () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
  return require('./src/App').default;
});

// Headless handler: fires when a data-only push arrives with the app killed or
// backgrounded. Keep it tiny — Android gives it a short window.
//
// Required lazily and guarded: on a build without Firebase configured this is a
// no-op, and even an unexpected throw here can no longer stop the app starting.
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
  const { registerBackgroundMessageHandler } = require('./src/services/notifications');
  registerBackgroundMessageHandler(async remoteMessage => {
    console.log('[push] background message', remoteMessage?.messageId);
  });
} catch (e) {
  console.warn('[push] background handler not registered', e);
}
