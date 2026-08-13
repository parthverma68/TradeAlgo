# PreMarketIQ · Mobile (Bare React Native)

React Native 0.74 + TypeScript client for the PreMarketIQ pre-market intelligence platform.
**No Expo.** Dark institutional terminal UI, live verdicts over STOMP, FCM push alerts.

Built to pair with a **Spring Boot (Java)** backend.

> **Analytics, not advice.** Every signal describes how current inputs agree with each
> other — it is not a prediction and not a recommendation to trade. The disclaimer renders
> in-app on Dashboard, Login and Settings, deliberately.

---

## Start here

**→ [`docs/00-INTEGRATION-RUNBOOK.md`](docs/00-INTEGRATION-RUNBOOK.md)** — the step-by-step
wiring of every system, from the broker API through your Spring Boot service to the phone.
Phased, with a verify gate on each step. That's the document you asked for; the rest support it.

**→ [`docs/07-NATIVE-SETUP.md`](docs/07-NATIVE-SETUP.md)** — do this first if you haven't
generated the native projects yet.

---

## Run it now (no backend needed)

```bash
npx @react-native-community/cli@latest init PreMarketIQ --version 0.74.5
# copy this repo's files over the generated project (see docs/07)

npm install
cd ios && pod install && cd ..

npm start
npm run android      # or npm run ios
```

Ships with `USE_MOCK=true`, so **every screen works before your backend exists** —
realistic fixtures, simulated latency, and a mock stream that drifts prices every 5 seconds.
Sign in with any email and password.

Point it at Spring Boot by setting `USE_MOCK=false` in `.env.development` and rebuilding.

---

## What changed from the Expo version

| Expo | Bare RN replacement |
|---|---|
| `expo-secure-store` | `react-native-keychain` |
| `expo-notifications` | `@react-native-firebase/messaging` + `@notifee/react-native` |
| `expo-constants` | `react-native-config` (build-time `.env`) |
| `expo-splash-screen` | `react-native-bootsplash` |
| `expo-status-bar` | `StatusBar` from `react-native` |
| `expo-font` | `npx react-native-asset` |
| **socket.io-client** | **`@stomp/stompjs`** ← protocol change, see below |

### Why STOMP instead of socket.io

Spring Boot serves **STOMP over WebSocket** natively (`spring-boot-starter-websocket`).
socket.io has its own handshake protocol that Spring doesn't speak without a third-party
server library. Switching the client is much cheaper than fighting your backend framework.

The app subscribes to `/topic/verdicts.{SYMBOL}` and `/user/queue/alerts`, sending the JWT
as a STOMP `CONNECT` header. Full backend config in the runbook, Phase 6.

---

## Screens

| Screen | Shows |
|---|---|
| **Dashboard** | Verdict, confidence, bull/bear/risk, 4 SVG gauges, expected range, sparkline, global board, sector heatmap, AI explanation |
| **Option Chain** | OI-by-strike chart with Max Pain line, support/resistance/writing zones, full chain table |
| **Futures** | Basis, OI, ΔOI, buildup matrix with current state highlighted |
| **News** | Sentiment-scored headlines + net sentiment |
| **Alerts** | REST + pushed alerts merged, tap to acknowledge |
| **Watchlist / Settings / Login** | Symbol management, alert prefs, connection status, auth |

---

## Architecture

```
screens ──► hooks ──┬── RTK Query cache  ◄── REST   (client.ts)
                    └── live slice       ◄── STOMP  (stompClient.ts)
services ──► FCM token, telemetry, acks ──► backend
```

Three decisions worth knowing:

- **Two network doors only.** `client.ts` and `stompClient.ts`. Nothing else calls `fetch()`
  or opens a socket, which is what keeps auth/retry/errors consistent everywhere.
- **REST and push data stored separately**, merged at read time by `asOf` timestamp. A dead
  socket degrades to 60s polling instead of blanking the screen.
- **No fabricated data.** Failures show stale-but-labelled values or an honest error.

---

## Project layout

```
index.js              entry + FCM background handler
src/
├── polyfills.ts      TextEncoder for STOMP on Hermes
├── api/              client.ts (REST door), marketApi.ts, mock.ts
├── realtime/         stompClient.ts (realtime door)
├── store/            auth · live · settings slices
├── services/         secureStorage (Keychain), notifications (FCM), telemetry
├── components/       primitives, Gauge, Sparkline, OIChart, SignalCard, StateViews
├── screens/          8 screens
├── hooks/            useLiveVerdict — the REST/push merge
├── navigation/       RootNavigator (auth-gated tabs)
├── config.ts         env resolution + disclaimer
├── theme.ts          design tokens
└── types.ts          client-side contract
```

---

## Documentation

| Doc | Read when |
|---|---|
| **[00 · Integration Runbook](docs/00-INTEGRATION-RUNBOOK.md)** | **Wiring everything together, phase by phase** |
| [01 · Upstream](docs/01-INTEGRATION-UPSTREAM.md) | REST/STOMP/auth boundaries, retry policy |
| [02 · Downstream](docs/02-INTEGRATION-DOWNSTREAM.md) | FCM tokens, acks, telemetry — what your backend must accept |
| [03 · API Contract](docs/03-API-CONTRACT.md) | Exact payloads + Jackson/DTO notes |
| [04 · State & Data Flow](docs/04-STATE-DATA-FLOW.md) | How REST and push data combine |
| [05 · Setup, Build & Release](docs/05-SETUP-BUILD-RELEASE.md) | Environments, Gradle, release checklist |
| [06 · Error Handling & Offline](docs/06-ERROR-HANDLING-OFFLINE.md) | Failure modes + test list |
| [07 · Native Setup](docs/07-NATIVE-SETUP.md) | Android/iOS patching, Firebase, fonts, signing |

---

## Backend checklist (Spring Boot)

- [ ] `GET /market/preopen`, `/options/chain/{symbol}`, `/futures/{symbol}`,
      `/global/markets`, `/sector/strength`, `/news/sentiment`, `/alerts`, `/watchlist`
- [ ] `POST /auth/login` · `/auth/register` → `{ token, user }`
- [ ] STOMP `/ws` (no SockJS), `/topic/verdicts.{SYMBOL}`, `/user/queue/alerts`,
      JWT via `ChannelInterceptor`
- [ ] `POST /devices/register` + dead-token pruning
- [ ] `POST /alerts/{id}/ack`
- [ ] `@RestControllerAdvice` → `{ error: { code, message } }`
- [ ] Jackson: ISO-8601 dates, **`asOf` always present**

---

## Known gaps in v0.1

Stated plainly rather than left to discover:

- **No token refresh** — a 401 forces re-login. Hook point marked in `client.ts`.
- **Alert preferences are local only** — need `PATCH /preferences`, and the backend must
  filter server-side regardless.
- **No crash reporting** — approach described in doc 02, not installed.
- **Fonts not bundled** — add IBM Plex `.ttf` files or drop `fontFamily` from `theme.ts`.
- **Charts are custom SVG**, deliberately lightweight. TradingView is a Phase 2 decision.
- **No unit tests yet** — highest-value first target is `useLiveVerdict`'s merge rule.
- **`android/` and `ios/` not included** — generated by the CLI, then patched per doc 07.
