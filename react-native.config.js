const fs = require('fs');
const path = require('path');

const exists = p => fs.existsSync(path.join(__dirname, p));

/**
 * Firebase is linked only once it is actually configured.
 *
 * Autolinking the Firebase native modules into a build with no
 * `google-services.json` / `GoogleService-Info.plist` produces an app that dies
 * at launch — the Google Services Gradle plugin never generates the config
 * resources, so the SDK has no default FirebaseApp and the native module throws
 *
 *   java.lang.IllegalStateException: Default FirebaseApp is not initialized in
 *   this process. Make sure to call FirebaseApp.initializeApp(Context) first.
 *
 * during startup, before any JavaScript runs. A JS-side guard cannot catch that.
 *
 * So: drop the native modules until the config files land (docs/07 step 6), and
 * pick them up automatically once they do. `src/services/notifications.ts`
 * already degrades to a no-op, so the app runs with push disabled meanwhile.
 * Notifee is left linked — it works standalone.
 */
const firebase = {
  android: exists('android/app/google-services.json'),
  ios: exists('ios/PreMarketIQ/GoogleService-Info.plist'),
};

const linkage = () => ({
  platforms: {
    ...(firebase.android ? {} : { android: null }),
    ...(firebase.ios ? {} : { ios: null }),
  },
});

const dependencies = {};
if (!firebase.android || !firebase.ios) {
  dependencies['@react-native-firebase/app'] = linkage();
  dependencies['@react-native-firebase/messaging'] = linkage();
}

module.exports = {
  project: {
    ios: {},
    android: {},
  },
  dependencies,
  // Run `npx react-native-asset` after dropping .ttf files in assets/fonts
  assets: ['./assets/fonts'],
};
