/**
 * DOWNSTREAM BOUNDARY (push) — bare RN.
 * Firebase Messaging supplies the device token (FCM on Android, APNs-via-FCM on
 * iOS). Notifee renders foreground notifications, which FCM does not do itself.
 * See docs/02-INTEGRATION-DOWNSTREAM.md
 */
import { Platform, PermissionsAndroid } from 'react-native';
import messaging, {
  FirebaseMessagingTypes,
} from '@react-native-firebase/messaging';
import notifee, { AndroidImportance, EventType } from '@notifee/react-native';

const CHANNEL_ID = 'market-alerts';

async function ensureAndroidChannel() {
  if (Platform.OS !== 'android') return;
  await notifee.createChannel({
    id: CHANNEL_ID,
    name: 'Market alerts',
    importance: AndroidImportance.HIGH,
    vibration: true,
  });
}

/** Ask for permission, then return the FCM token (or null if denied). */
export async function requestPushToken(): Promise<string | null> {
  if (Platform.OS === 'android' && Number(Platform.Version) >= 33) {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
    );
    if (granted !== PermissionsAndroid.RESULTS.GRANTED) return null;
  } else {
    const status = await messaging().requestPermission();
    const ok =
      status === messaging.AuthorizationStatus.AUTHORIZED ||
      status === messaging.AuthorizationStatus.PROVISIONAL;
    if (!ok) return null;
  }

  await ensureAndroidChannel();

  // iOS must register with APNs before a token is available.
  if (Platform.OS === 'ios') await messaging().registerDeviceForRemoteMessages();

  return messaging().getToken();
}

/**
 * Drop the device token on sign-out so alerts for this account stop reaching
 * this handset. The backend prunes the dead token on its next send.
 */
export async function deletePushToken(): Promise<void> {
  try {
    await messaging().deleteToken();
  } catch {
    /* no token registered, or FCM unavailable — nothing to revoke */
  }
}

/** FCM rotates tokens. Re-register whenever it changes or the backend goes stale. */
export function onTokenRefresh(cb: (token: string) => void) {
  return messaging().onTokenRefresh(cb);
}

/** Foreground pushes are silent by default — render them explicitly. */
export function onForegroundMessage() {
  return messaging().onMessage(async (msg: FirebaseMessagingTypes.RemoteMessage) => {
    await ensureAndroidChannel();
    await notifee.displayNotification({
      title: msg.notification?.title ?? 'PreMarketIQ',
      body: msg.notification?.body ?? '',
      data: msg.data,
      android: { channelId: CHANNEL_ID, pressAction: { id: 'default' } },
    });
  });
}

/**
 * Tap handling across all three launch paths:
 *  1. app in foreground  -> notifee foreground event
 *  2. app in background  -> messaging().onNotificationOpenedApp
 *  3. app killed         -> messaging().getInitialNotification
 */
export function addNotificationTapListener(cb: (data: Record<string, unknown>) => void) {
  const unsubNotifee = notifee.onForegroundEvent(({ type, detail }) => {
    if (type === EventType.PRESS) cb(detail.notification?.data ?? {});
  });
  const unsubOpened = messaging().onNotificationOpenedApp(msg => cb(msg?.data ?? {}));
  messaging()
    .getInitialNotification()
    .then(msg => { if (msg) cb(msg.data ?? {}); });

  return { remove: () => { unsubNotifee(); unsubOpened(); } };
}
