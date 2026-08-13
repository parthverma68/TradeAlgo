/**
 * Guards the app's registration with AppRegistry.
 *
 * The failure this exists to prevent, as seen on a device:
 *
 *   ERROR  Error: No Firebase App '[DEFAULT]' has been created
 *   LOG    Running "PreMarketIQ" with {"rootTag":21}
 *   ERROR  Invariant Violation: "PreMarketIQ" has not been registered.
 *
 * A throw while index.js is being evaluated means registerComponent never runs,
 * and the native side then reports a registration problem that looks like a
 * Metro misconfiguration. Registration must survive any optional integration
 * blowing up.
 */
import { AppRegistry } from 'react-native';
import { name as appName } from '../../app.json';

const NO_FIREBASE = "No Firebase App '[DEFAULT]' has been created - call firebase.initializeApp()";

const loadEntrypoint = (setup: () => void) => {
  const registered: string[] = [];
  const factories: (() => unknown)[] = [];

  jest.isolateModules(() => {
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    const spy = jest
      .spyOn(AppRegistry, 'registerComponent')
      .mockImplementation(((name: string, factory: () => unknown) => {
        registered.push(name);
        factories.push(factory);
        return name;
      }) as typeof AppRegistry.registerComponent);
    setup();
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require('../../index.js');
    spy.mockRestore();
  });

  return { registered, factories };
};

describe('index.js', () => {
  afterEach(() => jest.restoreAllMocks());

  it('registers the app component, and the factory resolves to App', () => {
    const { registered, factories } = loadEntrypoint(() => {});
    expect(registered).toContain(appName);
    expect(typeof factories[0]()).toBe('function');
  });

  it('still registers when Firebase throws during evaluation', () => {
    const { registered } = loadEntrypoint(() => {
      jest.doMock('@react-native-firebase/messaging', () => {
        throw new Error(NO_FIREBASE);
      });
    });
    expect(registered).toContain(appName);
  });

  it('still registers when the whole push service fails to load', () => {
    const { registered } = loadEntrypoint(() => {
      jest.doMock('@/services/notifications', () => {
        throw new Error('push service exploded');
      });
    });
    expect(registered).toContain(appName);
  });
});
