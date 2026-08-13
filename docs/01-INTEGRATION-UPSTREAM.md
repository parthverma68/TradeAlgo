# 01 · Upstream Integration

**Upstream = everything this app consumes.** The app is a pure consumer: it never talks to
a broker, an exchange, or a news vendor directly. All market data reaches it through your
Spring Boot backend.

```
Broker API ─┐
NSE feeds  ─┤
News API   ─┼──►  Spring Boot  ──►  ┌── REST /api/v1 ────┐
Global qts ─┤   (ingest+engine)     │                    ├──►  RN APP
LLM API    ─┘                       └── STOMP /ws ───────┘
```

**Why the app never calls a vendor directly:** vendor keys would ship inside the APK/IPA
(trivially extractable), rate limits are per-key not per-user, and every phone would
recompute the same signals. One backend, many thin clients.

---

## The two doors

| Door | File | Carries |
|---|---|---|
| REST | `src/api/client.ts` | all request/response traffic |
| Realtime | `src/realtime/stompClient.ts` | verdict + alert pushes |

Nothing else in the app calls `fetch()` or opens a socket. That single rule is what keeps
auth, retry, and error shape consistent on every screen.

---

## REST: what `client.ts` does, in order

1. **Mock short-circuit** — if `CONFIG.useMock`, resolve from `src/api/mock.ts` with
   simulated latency. The app is fully usable before your backend exists.
2. **Auth header** — injects `Authorization: Bearer <token>` from the `auth` slice.
3. **Timeout** — 12s (`CONFIG.requestTimeoutMs`).
4. **Retry** — up to 2 attempts on transport failure, timeout, `429`, or `5xx`, with
   exponential backoff **plus jitter** (`400ms × 2^n` + random). The jitter matters: without
   it every phone retries in lockstep at 09:14 and you self-DDoS your own API at the exact
   moment it's under most load.
5. **401 → sign out.** Never retried — retrying can't fix an expired token.
6. **Error normalisation** — every failure becomes `{ code, message, status? }`.

### Error codes

| Code | Trigger | UX |
|---|---|---|
| `OFFLINE` | transport failure | "Cannot reach PreMarketIQ" + retry |
| `TIMEOUT` | >12s | retry button |
| `UNAUTHORIZED` | 401 | forced sign-out |
| `RATE_LIMITED` | 429 | backoff, retry |
| `SERVER_ERROR` | 5xx | auto-retry, then error card |
| `BAD_RESPONSE` | unparseable body | error card |

If your backend returns `{"error":{"code","message"}}`, the app surfaces your message.
Otherwise it falls back to a generic one per status.

---

## Realtime: STOMP over WebSocket

**Protocol choice matters here.** The app previously assumed socket.io; it now speaks
**STOMP**, because Spring Boot serves STOMP natively via `spring-boot-starter-websocket`
while socket.io needs a third-party server implementation.

Behaviours in `stompClient.ts`:

- **Auth** — JWT sent as a STOMP `CONNECT` header; validate in a `ChannelInterceptor` and
  set the `Principal` (required for `/user/queue/**` to resolve).
- **Reconnect** — `@stomp/stompjs` retries every 2s indefinitely; heartbeats both ways at 10s.
- **App-state aware** — disconnects on background, reconnects on foreground. A pre-market
  app is opened once a day; holding a socket for 23 hours burns battery for nothing.
- **Never writes to the RTK Query cache.** Pushes land in the `live` slice, so a socket
  outage leaves REST data intact instead of blanking the screen.
- **Merge rule** (`useLiveVerdict.ts`): a push wins only if its `asOf` is newer. Prevents a
  delayed or replayed frame from rewinding the UI.
- **Degradation** — when not connected, the hook enables 60s REST polling. Data keeps
  moving even on networks that block WebSockets.
- **Malformed frames are swallowed**, not thrown — one bad JSON body must not kill the
  subscription.

---

## Auth flow

```
LoginScreen ──POST /auth/login──► Spring Security
     │◄──── { token, user } ────┘
     ▼
saveSession()  →  react-native-keychain (iOS Keychain / Android EncryptedSharedPrefs)
     ▼
credentialsReceived()  →  auth slice  →  RootNavigator swaps to Tabs
     ▼
connectStomp(token)
```

Cold start calls `loadSession()` before first render (behind the bootsplash), so returning
users never see a login flash. Tokens are **never** in AsyncStorage — that's plaintext on disk.

**No refresh flow in v0.1.** Expiry forces re-login. Hook point for adding it: the
`err.status === 401` branch in `client.ts` — attempt refresh once, replay the original
request, sign out only if that fails.

---

## Contract change management

`/api/v1` is versioned for a reason: old app versions live on phones for months.

- **Additive fields are safe** — unknown JSON keys are ignored.
- **Renaming or removing a field is breaking.** Needs `/v2` or a deprecation window.
- `src/types.ts` and `docs/03-API-CONTRACT.md` must change in the same commit as your DTOs.

---

## Switching from mock to live

```bash
# .env.development
USE_MOCK=false
API_BASE_URL=http://10.0.2.2:8080/api/v1
WS_URL=ws://10.0.2.2:8080/ws
```
Then **rebuild** (`react-native-config` is build-time, not runtime).

Nothing else changes — the fixtures were written to match the contract exactly. If a screen
breaks after the switch, that's a contract mismatch in the backend, which is precisely what
mock mode is designed to expose.
