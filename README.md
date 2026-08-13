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
realistic fixtures, simulated latency, and a mock stream that drifts prices every few seconds.
Sign in with any email and password.

**Firebase and the native splash are optional.** Until you complete docs/07 steps 5
and 6 (`google-services.json` / `GoogleService-Info.plist`, the Google Services Gradle
plugin, `generate-bootsplash`), push alerts are simply off and the app logs a warning —
it still launches.

Two things make that true, because an unconfigured Firebase used to kill the app on
launch in two different ways:

- **`react-native.config.js` links the Firebase native modules only when a config file
  is present.** Without one, the Google Services plugin never generates the config
  resources, and the native module throws `Default FirebaseApp is not initialized in
  this process` during startup — before any JavaScript runs, so no JS guard can catch
  it. Drop `google-services.json` into `android/app/` (or the plist into
  `ios/PreMarketIQ/`) and linking resumes automatically on the next build.
- **`src/services/notifications.ts` requires the module lazily behind a guard**, so
  every push entry point degrades to a no-op whether the module is missing, unlinked,
  or present-but-uninitialised. `index.js` no longer touches `messaging()` at module
  scope, which previously threw during bundle evaluation.

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

The app has two surfaces. The **trading surface** is what you land on; the
**analytics surface** is the institutional terminal, reachable from Profile.

### Trading surface (light, tabbed)

| Screen | Shows |
|---|---|
| **Onboarding** | Welcome illustration, shown once — the flag persists across launches |
| **Login** | Email/password; in mock mode any credentials sign you in |
| **Home** | Portfolio total + day move, brand cluster, live search, "Stock Activates" cards with trend lines |
| **Markets** | Full universe, search, All / Gainers / Losers filters |
| **Market detail** | Dark card: tappable candlestick chart, 24hr/Week/Month/Year ranges, High/Low/Open/Prev close, today's volume, your position, **Sell / Buy** |
| **Portfolio** | Value, invested vs cash, unrealised P&L, holdings, session order blotter |
| **Profile** | Push toggle, links into the analytics surface, portfolio reset, sign out |

Buying and selling is real against local state: the order goes through
`POST /orders`, and only a `FILLED` response moves cash and holdings. Rejects
(unknown symbol, zero quantity) surface as an alert. Quantity is checked
against buying power and position size before submission.

### Analytics surface (dark terminal)

| Screen | Shows |
|---|---|
| **Dashboard** | Verdict, confidence, bull/bear/risk, 4 SVG gauges, expected range, sparkline, global board, sector heatmap, AI explanation |
| **Option Chain** | OI-by-strike chart with Max Pain line, support/resistance/writing zones, full chain table |
| **Futures** | Basis, OI, ΔOI, buildup matrix with current state highlighted |
| **News** | Sentiment-scored headlines + net sentiment |
| **Alerts** | REST + pushed alerts merged, tap to acknowledge |
| **Watchlist / Settings** | Symbol management, alert prefs, connection status |

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
├── api/              client.ts (REST door), marketApi.ts, mock.ts, mockStocks.ts
├── realtime/         stompClient.ts (realtime door)
├── store/            auth · live · settings · portfolio slices
├── services/         secureStorage (Keychain), notifications (FCM), telemetry
├── components/       primitives, Gauge, Sparkline, OIChart, SignalCard, StateViews
│   └── ui/           trading surface: CandleChart, StockCard, TrendLine,
│                     BrandMark, TradeSheet, FloatingTabBar, Layout
├── design/           tokens + SVG icon set for the trading surface
├── screens/          14 screens (7 trading, 7 analytics)
├── hooks/            useLiveVerdict — the REST/push merge
│                     useStocks — quotes/detail/portfolio read models
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
- [ ] `GET /stocks`, `GET /stocks/{symbol}?range=24hr|week|month|year`,
      `POST /orders` → `{ id, symbol, side, qty, price, status, placedAt, reason? }`
- [ ] `POST /auth/login` · `/auth/register` → `{ token, user }`
- [ ] STOMP `/ws` (no SockJS), `/topic/verdicts.{SYMBOL}`, `/user/queue/alerts`,
      JWT via `ChannelInterceptor`, `/topic/quotes` for last-traded prices
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
- **Test coverage is partial** — 41 tests cover the fixture engine, the portfolio
  reducer, the chart/card components, app startup (including the unconfigured-Firebase
  path) and the welcome → sign-in → market → buy walkthrough. `useLiveVerdict`'s merge
  rule is still uncovered.
- **Push is off until Firebase is configured** — `isPushAvailable()` reports the state;
  every push entry point no-ops rather than throwing.
- **The portfolio lives in memory** — orders survive navigation but not a restart,
  and nothing is posted to a backend beyond `POST /orders`.
- **Brand marks are simplified vectors**, not the trademarked wordmarks.
- **`android/` and `ios/` not included** — generated by the CLI, then patched per doc 07.
