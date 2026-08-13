/**
 * Native module mocks so the app tree can be mounted in jest. Each mock is the
 * smallest surface the app actually calls — a fatter mock hides real crashes.
 */
require('react-native-gesture-handler/jestSetup');

// The library's own jest mock ships untranspiled TSX, so declare a small one.
jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  const { View } = require('react-native');
  const inset = { top: 0, right: 0, bottom: 0, left: 0 };
  return {
    SafeAreaProvider: ({ children }) => React.createElement(View, null, children),
    SafeAreaView: ({ children, ...rest }) => React.createElement(View, rest, children),
    SafeAreaInsetsContext: React.createContext(inset),
    useSafeAreaInsets: () => inset,
    useSafeAreaFrame: () => ({ x: 0, y: 0, width: 390, height: 844 }),
    initialWindowMetrics: { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: inset },
  };
});

jest.mock('react-native-bootsplash', () => ({
  hide: jest.fn(async () => {}),
  isVisible: jest.fn(async () => false),
}));

jest.mock('react-native-keychain', () => ({
  ACCESSIBLE: { WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'whenUnlockedThisDeviceOnly' },
  setGenericPassword: jest.fn(async () => true),
  getGenericPassword: jest.fn(async () => false),
  resetGenericPassword: jest.fn(async () => true),
}));

jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn(() => () => {}),
  fetch: jest.fn(async () => ({ isConnected: true })),
}));

jest.mock('react-native-config', () => ({ USE_MOCK: 'true' }));

jest.mock('@react-native-firebase/messaging', () => {
  // jest.fn so a test can swap in the "Firebase not configured" behaviour.
  const messaging = jest.fn(() => ({
    setBackgroundMessageHandler: jest.fn(),
    requestPermission: jest.fn(async () => 1),
    registerDeviceForRemoteMessages: jest.fn(async () => {}),
    getToken: jest.fn(async () => 'fcm-token'),
    deleteToken: jest.fn(async () => {}),
    onTokenRefresh: jest.fn(() => () => {}),
    onMessage: jest.fn(() => () => {}),
    onNotificationOpenedApp: jest.fn(() => () => {}),
    getInitialNotification: jest.fn(async () => null),
  }));
  messaging.AuthorizationStatus = { AUTHORIZED: 1, PROVISIONAL: 2 };
  return { __esModule: true, default: messaging };
});

jest.mock('@notifee/react-native', () => ({
  __esModule: true,
  default: {
    createChannel: jest.fn(async () => 'channel'),
    displayNotification: jest.fn(async () => {}),
    onForegroundEvent: jest.fn(() => () => {}),
  },
  AndroidImportance: { HIGH: 4 },
  EventType: { PRESS: 1 },
}));
