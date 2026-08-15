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

The app has two surfaces. The **confidence surface** is what you land on —
pick a market, pick an industry, search a share, see what every indicator
says about it. The **index analytics surface** is the institutional F&O
terminal for NIFTY/BANKNIFTY, reachable from Profile.

### Confidence surface (light, tabbed)

| Screen | Shows |
|---|---|
| **Onboarding** | Welcome illustration, shown once — the flag persists across launches |
| **Login** | Email/password; in mock mode any credentials sign you in |
| **Home** | Search, today's top confidence picks, one-tap industry shortcuts |
| **Markets** | Market picker (India · NSE / United States) → industry category grid, each tile showing average confidence; global share search |
| **Industry** | Every share in one market + category, ranked by confidence, with in-category search |
| **Market detail** | A single share's confidence: a 0-100 ring, BUY/WATCH/AVOID call, one-line synthesis, price action chart, and every indicator group behind the score (F&O positioning, technical momentum, news & sentiment, earnings track record, forward earnings prospect, shareholder confidence) |
| **Watchlist** | Shares you're tracking, each with its confidence pill; add/remove by ticker |
| **Subscription** | Free vs Pro plan comparison — Pro unlocks the premium indicator groups, alerts and job scheduling |
| **Profile** | Plan status, push toggle, links into index analytics, sign out |

There's no order ticket anywhere in this surface — the app doesn't execute
trades. `earnings`, `future earnings prospect` and `shareholder confidence`
are gated behind the Pro plan (`src/store/settingsSlice.ts`'s `plan` field);
`fno`, `technical` and `news` are free.

### Index analytics surface (dark terminal)

| Screen | Shows |
|---|---|
| **Dashboard** | Verdict, confidence, bull/bear/risk, 4 SVG gauges, expected range, sparkline, global board, sector heatmap, AI explanation |
| **Option Chain** | OI-by-strike chart with Max Pain line, support/resistance/writing zones, full chain table |
| **Futures** | Basis, OI, ΔOI, buildup matrix with current state highlighted |
| **News** | Sentiment-scored headlines + net sentiment |
| **Alerts** | REST + pushed alerts merged, tap to acknowledge |
| **Settings** | Alert prefs, connection status |

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
├── store/            auth · live · settings (incl. plan) slices
├── services/         secureStorage (Keychain), notifications (FCM), telemetry
├── components/       primitives, Gauge, Sparkline, OIChart, SignalCard, StateViews
│   └── ui/           confidence surface: CandleChart, StockCard, TrendLine,
│                     StockAvatar, FloatingTabBar, Layout
├── design/           tokens + SVG icon set for the confidence surface
├── screens/          15 screens (7 confidence surface, 6 index analytics, onboarding + login)
├── hooks/            useLiveVerdict — the REST/push merge
│                     useStocks — quotes/detail/confidence read models
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
| [Backend build plan](docs/backend-plan/README.md) | Building the Spring Boot backend from scratch — 8-week plan covering **both India (NSE/BSE) and US (NYSE/NASDAQ) markets** |

---

## Backend checklist (Spring Boot)

- [ ] `GET /market/preopen`, `/options/chain/{symbol}`, `/futures/{symbol}`,
      `/global/markets`, `/sector/strength`, `/news/sentiment`, `/alerts`, `/watchlist`
- [ ] `GET /stocks`, `GET /stocks/{symbol}?range=24hr|week|month|year`,
      `GET /stocks/{symbol}/confidence` → `StockConfidence` (overall score, recommendation,
      six weighted `IndicatorGroup`s — see `src/types.ts`)
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
- **Test coverage is partial** — the fixture engine, confidence scoring and the chart/card
  components are covered. `useLiveVerdict`'s merge rule is still uncovered.
- **Confidence scores are a local heuristic** — `mockConfidence()` in `mockStocks.ts` is a
  deterministic stand-in for a real scoring service; every list badge computes it inline
  rather than through the async `/confidence` endpoint, so a real backend should expose a
  batched list-scoring route to avoid N calls per screen.
- **Subscription billing is mocked** — `Subscription` screen just flips a local `plan` flag;
  wiring a real payment provider and server-side entitlement check is unstarted.
- **The watchlist and plan are local only** — nothing is posted to a backend yet beyond the
  existing `/watchlist` endpoints; a restart currently keeps them since they aren't persisted
  outside Redux state.
- **`android/` and `ios/` not included** — generated by the CLI, then patched per doc 07.
- **`docs/00-03` still describe the old buy/sell order flow** — those detailed integration
  docs haven't been refreshed for the confidence surface yet; treat this README as current.
