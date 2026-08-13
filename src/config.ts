import Config from 'react-native-config';

/**
 * Values come from .env at BUILD time via react-native-config.
 * Changing .env requires a rebuild (Android: gradle; iOS: Xcode), not just a
 * Metro refresh — this trips people up constantly.
 */
export const CONFIG = {
  apiBaseUrl: Config.API_BASE_URL ?? 'http://10.0.2.2:8080/api/v1',
  wsUrl: Config.WS_URL ?? 'ws://10.0.2.2:8080/ws',
  envName: Config.ENV_NAME ?? 'development',
  /** Serve fixtures instead of calling the backend. Lets the app run before
   *  the Spring Boot service exists. See docs/00-INTEGRATION-RUNBOOK.md */
  useMock: (Config.USE_MOCK ?? 'true') === 'true',
  requestTimeoutMs: 12000,
  maxRetries: 2,
  /** REST polling interval used when the STOMP connection is down */
  pollIntervalMs: 60000,
} as const;

export const DISCLAIMER =
  'Analytics only — not investment advice. Signals describe how current inputs ' +
  'agree with each other, not what the market will do.';
