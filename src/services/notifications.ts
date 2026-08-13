/**
 * DOWNSTREAM BOUNDARY (push) — bare RN.
 * Firebase Messaging supplies the device token (FCM on Android, APNs-via-FCM on
 * iOS). Notifee renders foreground notifications, which FCM does not do itself.
 * See docs/02-INTEGRATION-DOWNSTREAM.md
 *
 * Push is OPTIONAL at runtime. Until docs/07 step 6 is done — `google-services.json`
 * on Android, `GoogleService-Info.plist` on iOS, plus the Google Services Gradle
 * plugin — calling `messaging()` throws "No Firebase App '[DEFAULT]' has been
 * created". Every entry point below therefore degrades to a no-op instead of
 * throwing: an app with no alerts still beats an app that will not launch.
 */
import { Platform, PermissionsAndroid } from 'react-native';
import type { FirebaseMessagingTypes } from '@react-native-firebase/messaging';
import notifee, { AndroidImportance, EventType } from '@notifee/react-native';

const CHANNEL_ID = 'market-alerts';
const noop = () => {};

type MessagingModule = typeof import('@react-native-firebase/messaging').default;

let warned = false;
let cachedModule: MessagingModule | null | undefined;

function warnOnce(e: unknown) {
  if (warned) return;
  warned = true;
  console.warn(
    '[push] Firebase is not configured for this build — push alerts are off. ' +
      'See docs/07-NATIVE-SETUP.md step 6.',
    e,
  );
}

/**
 * The messaging module, required lazily. When Firebase is unconfigured the
 * native module is not linked at all (see react-native.config.js), so even the
 * import can fail — hence require() inside the try rather than a top-level
 * import.
 */
function messagingModule(): MessagingModule | null {
  if (cachedModule !== undefined) return cachedModule;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
    cachedModule = require('@react-native-firebase/messaging').default as MessagingModule;
  } catch (e) {
    warnOnce(e);
    cachedModule = null;
  }
  return cachedModule;
}

/** The messaging instance, or null when Firebase is not configured natively. */
function fcm(): FirebaseMessagingTypes.Module | null {
  const mod = messagingModule();
  if (!mod) return null;
  try {
    return mod();
  } catch (e) {
    warnOnce(e);
    return null;
  }
}

/** True when push can actually work on this build. */
export const isPushAvailable = () => fcm() !== null;

async function ensureAndroidChannel() {
  if (Platform.OS !== 'android') return;
  try {
    await notifee.createChannel({
      id: CHANNEL_ID,
      name: 'Market alerts',
      importance: AndroidImportance.HIGH,
      vibration: true,
    });
  } catch {
    /* Notifee unavailable — notifications simply will not render */
  }
}

/** Ask for permission, then return the FCM token (or null if denied/unavailable). */
export async function requestPushToken(): Promise<string | null> {
  const m = fcm();
  if (!m) return null;

  try {
    if (Platform.OS === 'android' && Number(Platform.Version) >= 33) {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
      );
      if (granted !== PermissionsAndroid.RESULTS.GRANTED) return null;
    } else {
      const status = await m.requestPermission();
      const authorized = messagingModule()?.AuthorizationStatus;
      const ok =
        status === authorized?.AUTHORIZED || status === authorized?.PROVISIONAL;
      if (!ok) return null;
    }

    await ensureAndroidChannel();

    // iOS must register with APNs before a token is available.
    if (Platform.OS === 'ios') await m.registerDeviceForRemoteMessages();

    return await m.getToken();
  } catch (e) {
    console.warn('[push] could not obtain a device token', e);
    return null;
  }
}

/**
 * Drop the device token on sign-out so alerts for this account stop reaching
 * this handset. The backend prunes the dead token on its next send.
 */
export async function deletePushToken(): Promise<void> {
  try {
    await fcm()?.deleteToken();
  } catch {
    /* no token registered, or FCM unavailable — nothing to revoke */
  }
}

/** FCM rotates tokens. Re-register whenever it changes or the backend goes stale. */
export function onTokenRefresh(cb: (token: string) => void) {
  return fcm()?.onTokenRefresh(cb) ?? noop;
}

/** Foreground pushes are silent by default — render them explicitly. */
export function onForegroundMessage() {
  const m = fcm();
  if (!m) return noop;

  return m.onMessage(async (msg: FirebaseMessagingTypes.RemoteMessage) => {
    await ensureAndroidChannel();
    try {
      await notifee.displayNotification({
        title: msg.notification?.title ?? 'PreMarketIQ',
        body: msg.notification?.body ?? '',
        data: msg.data,
        android: { channelId: CHANNEL_ID, pressAction: { id: 'default' } },
      });
    } catch (e) {
      console.warn('[push] could not display a foreground notification', e);
    }
  });
}

/**
 * Tap handling across all three launch paths:
 *  1. app in foreground  -> notifee foreground event
 *  2. app in background  -> messaging().onNotificationOpenedApp
 *  3. app killed         -> messaging().getInitialNotification
 */
export function addNotificationTapListener(cb: (data: Record<string, unknown>) => void) {
  let unsubNotifee = noop;
  try {
    unsubNotifee = notifee.onForegroundEvent(({ type, detail }) => {
      if (type === EventType.PRESS) cb(detail.notification?.data ?? {});
    });
  } catch {
    /* Notifee unavailable */
  }

  const m = fcm();
  const unsubOpened = m?.onNotificationOpenedApp(msg => cb(msg?.data ?? {})) ?? noop;
  m?.getInitialNotification()
    .then(msg => { if (msg) cb(msg.data ?? {}); })
    .catch(() => { /* nothing pending */ });

  return { remove: () => { unsubNotifee(); unsubOpened(); } };
}

/**
 * Registers the headless handler for data-only pushes that arrive with the app
 * backgrounded or killed. Safe to call when Firebase is absent.
 */
export function registerBackgroundMessageHandler(
  handler: (msg: FirebaseMessagingTypes.RemoteMessage) => Promise<void>,
) {
  fcm()?.setBackgroundMessageHandler(handler);
}
