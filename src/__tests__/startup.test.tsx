/**
 * Startup smoke tests — mount the real app tree (store, navigation, screens)
 * with only native modules mocked. Cheapest reproduction of a "crashes on
 * launch" report.
 *
 * The unconfigured-Firebase case is the regression that matters: without
 * `google-services.json` and the Google Services Gradle plugin (docs/07 step
 * 6), `messaging()` throws, and it used to do so during evaluation of index.js
 * — before anything could render.
 */
import React from 'react';
import renderer, { act } from 'react-test-renderer';
import messaging from '@react-native-firebase/messaging';
import BootSplash from 'react-native-bootsplash';

import App from '@/App';
import {
  requestPushToken, onTokenRefresh, onForegroundMessage,
  addNotificationTapListener, deletePushToken, isPushAvailable,
  registerBackgroundMessageHandler,
} from '@/services/notifications';

const NO_FIREBASE = "No Firebase App '[DEFAULT]' has been created - call firebase.initializeApp()";

const messagingMock = messaging as unknown as jest.Mock;
const configuredFirebase = messagingMock.getMockImplementation()!;

/** Reproduce a build with no google-services.json / GoogleService-Info.plist. */
const breakFirebase = () =>
  messagingMock.mockImplementation(() => { throw new Error(NO_FIREBASE); });

const mountApp = async () => {
  let tree: renderer.ReactTestRenderer | undefined;
  await act(async () => { tree = renderer.create(<App />); });
  await act(async () => {
    await Promise.resolve();
    jest.runOnlyPendingTimers();
  });
  return tree!;
};

describe('app startup', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
    messagingMock.mockImplementation(configuredFirebase);
  });

  it('mounts and lands on the welcome screen', async () => {
    const tree = await mountApp();
    expect(JSON.stringify(tree.toJSON())).toContain('Building Wealth');
    act(() => { tree.unmount(); });
  });

  it('still starts when Firebase is not configured for the build', async () => {
    breakFirebase();

    const tree = await mountApp();
    expect(JSON.stringify(tree.toJSON())).toContain('Building Wealth');
    act(() => { tree.unmount(); });
  });

  it('still starts when the native splash was never generated', async () => {
    (BootSplash.hide as jest.Mock).mockRejectedValueOnce(new Error('BootSplash.init not called'));

    const tree = await mountApp();
    expect(JSON.stringify(tree.toJSON())).toContain('Building Wealth');
    act(() => { tree.unmount(); });
  });
});

describe('push service without Firebase', () => {
  beforeEach(() => {
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    breakFirebase();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    messagingMock.mockImplementation(configuredFirebase);
  });

  it('reports push as unavailable instead of throwing', () => {
    expect(isPushAvailable()).toBe(false);
  });

  it('survives the messaging module being unlinked entirely', () => {
    jest.isolateModules(() => {
      jest.doMock('@react-native-firebase/messaging', () => {
        throw new Error(
          "You attempted to use a firebase module that's not installed natively",
        );
      });
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const push = require('@/services/notifications');
      expect(push.isPushAvailable()).toBe(false);
      expect(() => push.registerBackgroundMessageHandler(async () => {})).not.toThrow();
    });
  });

  it('degrades every entry point to a no-op', async () => {
    await expect(requestPushToken()).resolves.toBeNull();
    await expect(deletePushToken()).resolves.toBeUndefined();
    expect(() => registerBackgroundMessageHandler(async () => {})).not.toThrow();
    expect(typeof onTokenRefresh(() => {})).toBe('function');
    expect(typeof onForegroundMessage()).toBe('function');

    const sub = addNotificationTapListener(() => {});
    expect(() => sub.remove()).not.toThrow();
  });
});
