import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StatusBar } from 'react-native';
import { Provider } from 'react-redux';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import NetInfo from '@react-native-community/netinfo';
import BootSplash from 'react-native-bootsplash';

import { store, useAppDispatch, useAppSelector } from '@/store';
import { hydrated } from '@/store/authSlice';
import { networkChanged } from '@/store/liveSlice';
import { onboardingHydrated } from '@/store/settingsSlice';
import { loadSession, loadOnboarded } from '@/services/secureStorage';
import { connectStomp, disconnectStomp, updateSubscription } from '@/realtime/stompClient';
import {
  requestPushToken, onTokenRefresh, onForegroundMessage, addNotificationTapListener,
} from '@/services/notifications';
import { startTelemetry, stopTelemetry, track } from '@/services/telemetry';
import { useRegisterDeviceMutation } from '@/api/marketApi';
import RootNavigator from '@/navigation/RootNavigator';
import { ui } from '@/design/tokens';

function Bootstrap() {
  const dispatch = useAppDispatch();
  const { token, hydrated: isHydrated } = useAppSelector(s => s.auth);
  const { symbols, notificationsEnabled } = useAppSelector(s => s.settings);
  const [registerDevice] = useRegisterDeviceMutation();
  const [ready, setReady] = useState(false);

  // 1. Restore the session + onboarding flag before first render, then drop
  //    the splash. Both reads happen together so the first frame is the real
  //    destination screen rather than a flash of the welcome screen.
  useEffect(() => {
    (async () => {
      const [session, seenWelcome] = await Promise.all([loadSession(), loadOnboarded()]);
      dispatch(hydrated(session));
      dispatch(onboardingHydrated(seenWelcome));
      setReady(true);
      await BootSplash.hide({ fade: true });
    })();
  }, [dispatch]);

  // 2. Network awareness -> offline banner + polling fallback.
  useEffect(
    () => NetInfo.addEventListener(st => dispatch(networkChanged(Boolean(st.isConnected)))),
    [dispatch],
  );

  // 3. Realtime: connect once authenticated.
  useEffect(() => {
    if (!token) return;
    connectStomp(token, symbols);
    return () => disconnectStomp();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => { if (token) updateSubscription(symbols); }, [symbols, token]);

  // 4. DOWNSTREAM: hand the FCM token to the backend alert dispatcher.
  useEffect(() => {
    if (!token || !notificationsEnabled) return;
    let unsubRefresh: (() => void) | undefined;
    (async () => {
      const fcmToken = await requestPushToken();
      if (fcmToken) {
        await registerDevice({ token: fcmToken, platform: 'fcm' });
        track('device_registered');
      }
      unsubRefresh = onTokenRefresh(t => registerDevice({ token: t, platform: 'fcm' }));
    })();
    return () => unsubRefresh?.();
  }, [token, notificationsEnabled, registerDevice]);

  // 5. Foreground pushes, tap deep-links, telemetry.
  useEffect(() => {
    const unsubFg = onForegroundMessage();
    const tapSub = addNotificationTapListener(data => track('alert_opened', data));
    startTelemetry();
    return () => { unsubFg(); tapSub.remove(); stopTelemetry(); };
  }, []);

  if (!ready || !isHydrated) {
    return (
      <View style={{ flex: 1, backgroundColor: ui.screenTop, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={ui.purple} />
      </View>
    );
  }
  return <RootNavigator />;
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Provider store={store}>
        <SafeAreaProvider>
          <StatusBar barStyle="dark-content" backgroundColor={ui.screenTop} />
          <Bootstrap />
        </SafeAreaProvider>
      </Provider>
    </GestureHandlerRootView>
  );
}
