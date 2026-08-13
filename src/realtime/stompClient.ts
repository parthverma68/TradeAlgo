/**
 * UPSTREAM BOUNDARY (realtime) — STOMP over WebSocket.
 *
 * Why STOMP and not socket.io: Spring Boot serves STOMP natively via
 * spring-boot-starter-websocket. socket.io has its own handshake protocol that
 * Spring does not speak without a third-party server library. STOMP is the
 * idiomatic path for a Spring backend.
 *
 * Backend contract (see docs/00-INTEGRATION-RUNBOOK.md Phase 6):
 *   endpoint           : ws://host/ws            (registerStompEndpoints)
 *   broker prefixes    : /topic, /queue
 *   app prefix         : /app
 *   subscribe verdicts : /topic/verdicts.{SYMBOL}
 *   subscribe alerts   : /user/queue/alerts
 *   JWT                : sent as a CONNECT header, validated in a ChannelInterceptor
 */
import { Client, IMessage, StompSubscription } from '@stomp/stompjs';
import { AppState, AppStateStatus } from 'react-native';
import { CONFIG } from '@/config';
import { store } from '@/store';
import { connectionChanged, verdictPushed, alertPushed } from '@/store/liveSlice';
import type { PreOpen, AlertItem } from '@/types';

let client: Client | null = null;
let subs: Record<string, StompSubscription> = {};
let currentSymbols: string[] = [];
let appStateSub: { remove: () => void } | null = null;

export function connectStomp(token: string | null, symbols: string[]) {
  if (CONFIG.useMock) return startMockStream(symbols);
  if (client?.active) return;

  currentSymbols = symbols;
  store.dispatch(connectionChanged('connecting'));

  client = new Client({
    // RN has no SockJS-friendly XHR by default — use the native WebSocket.
    webSocketFactory: () => new WebSocket(CONFIG.wsUrl),
    connectHeaders: token ? { Authorization: `Bearer ${token}` } : {},
    reconnectDelay: 2000,          // STOMP.js reconnects internally
    heartbeatIncoming: 10000,
    heartbeatOutgoing: 10000,
    // Hermes has no console.debug noise budget — keep this off in release.
    debug: () => {},
    onConnect: () => {
      store.dispatch(connectionChanged('connected'));
      subscribeAll(currentSymbols);
    },
    onStompError: () => store.dispatch(connectionChanged('reconnecting')),
    onWebSocketClose: () => store.dispatch(connectionChanged('offline')),
    onWebSocketError: () => store.dispatch(connectionChanged('reconnecting')),
  });

  client.activate();

  // Drop the socket in the background, restore on foreground. A pre-market app
  // is opened once a day — holding a socket all day burns battery for nothing.
  appStateSub = AppState.addEventListener('change', (s: AppStateStatus) => {
    if (s === 'active' && client && !client.active) client.activate();
    if (/inactive|background/.test(s) && client?.active) client.deactivate();
  });
}

function subscribeAll(symbols: string[]) {
  if (!client?.connected) return;

  Object.values(subs).forEach(s => s.unsubscribe());
  subs = {};

  symbols.forEach(sym => {
    subs[sym] = client!.subscribe(`/topic/verdicts.${sym}`, (msg: IMessage) => {
      try {
        store.dispatch(verdictPushed(JSON.parse(msg.body) as PreOpen));
      } catch {
        /* malformed frame — ignore rather than crash the socket */
      }
    });
  });

  // User-scoped queue: Spring resolves /user/** to the authenticated principal.
  subs.__alerts = client!.subscribe('/user/queue/alerts', (msg: IMessage) => {
    try {
      store.dispatch(alertPushed(JSON.parse(msg.body) as AlertItem));
    } catch {
      /* ignore */
    }
  });
}

export function updateSubscription(symbols: string[]) {
  currentSymbols = symbols;
  subscribeAll(symbols);
}

export function disconnectStomp() {
  Object.values(subs).forEach(s => s.unsubscribe());
  subs = {};
  client?.deactivate();
  client = null;
  appStateSub?.remove();
  appStateSub = null;
  stopMockStream();
  store.dispatch(connectionChanged('idle'));
}

/* ---------- Mock stream so the realtime UI works before the backend --------- */
let mockTimer: ReturnType<typeof setInterval> | null = null;

function startMockStream(symbols: string[]) {
  store.dispatch(connectionChanged('connected'));
  stopMockStream();
  mockTimer = setInterval(async () => {
    const { MOCK_PREOPEN } = await import('@/api/mock');
    symbols.forEach(sym => {
      const base = MOCK_PREOPEN[sym];
      if (!base) return;
      const drift = (Math.random() - 0.5) * 12;
      store.dispatch(
        verdictPushed({
          ...base,
          asOf: new Date().toISOString(),
          spot: +(base.spot + drift).toFixed(2),
          futures: +(base.futures + drift).toFixed(2),
          verdict: {
            ...base.verdict,
            confidence: Math.max(
              45,
              Math.min(95, base.verdict.confidence + Math.round((Math.random() - 0.5) * 6)),
            ),
          },
        }),
      );
    });
  }, 5000);
}

function stopMockStream() {
  if (mockTimer) clearInterval(mockTimer);
  mockTimer = null;
}
