# 00 · Integration Runbook

**Step-by-step wiring of every system, from the original data source to the pixel on the
phone.** Follow the phases in order. Each has a *build*, a *verify*, and a *done when* —
do not move on until the verify passes, because every later phase assumes the earlier one
is trustworthy.

Backend is **Spring Boot (Java)**, which you're writing yourself. This document specifies
*what it must expose and how the app consumes it*, not how to implement it.

---

## The full chain

```
 ┌─── EXTERNAL (licensed / third-party) ────────────────────────────┐
 │  Broker API (option chain, futures, spot)                        │
 │  NSE bhavcopy (FII/DII)                                          │
 │  Global quote provider (S&P, NASDAQ, VIX, Nikkei, GIFT Nifty)    │
 │  News API / RSS                                                  │
 │  LLM API (sentiment + explanation text)                          │
 └────────────────────────┬─────────────────────────────────────────┘
                          │  Phase 1-2: ingestion (scheduled pull)
                          ▼
 ┌─── YOUR SPRING BOOT BACKEND ─────────────────────────────────────┐
 │  @Scheduled ingestion  →  PostgreSQL (raw snapshots)             │
 │  Signal engine service →  computed verdict                       │
 │  Redis cache           →  hot read path                          │
 │  REST @RestController  →  /api/v1/**                             │
 │  STOMP WebSocket       →  /ws  →  /topic/verdicts.{SYMBOL}       │
 │  FCM dispatcher        →  push to devices                        │
 └────────────────────────┬─────────────────────────────────────────┘
                          │  Phase 5-8: consumption
                          ▼
 ┌─── THIS REACT NATIVE APP ────────────────────────────────────────┐
 │  src/api/client.ts   ← every REST call passes through here       │
 │  src/realtime/stompClient.ts ← every push arrives here           │
 │  src/hooks/useLiveVerdict.ts ← merges REST + push by `asOf`      │
 │  screens/                                                        │
 └──────────────────────────────────────────────────────────────────┘
```

**The app has exactly two upstream doors** (`client.ts` and `stompClient.ts`). Nothing
else touches the network. Keep it that way — it's what makes auth, retry, and error
handling consistent across every screen.

---

## Data lineage — where each number on screen comes from

Read this table when something looks wrong; it tells you which layer to debug.

| Screen element | Original source | Backend transform | Endpoint | App file |
|---|---|---|---|---|
| Spot / futures price | Broker API | store snapshot | `/market/preopen` | `DashboardScreen` |
| PCR | Broker option chain | `Σ putOI / Σ callOI` | `/market/preopen.metrics.pcr` | `Gauge` |
| Max Pain | Broker option chain | min total payout across strikes | `/market/preopen.metrics.maxPain` | `OIChart` ref line |
| Basis | Broker futures + spot | `fut − spot` | `/market/preopen.metrics.basis` | Dashboard chip |
| Buildup | Broker futures ΔPrice/ΔOI | 4-quadrant rule | `.metrics.buildup` | `FuturesScreen` matrix |
| IV score | Broker IV + your history | `currentIV / avgIV` | `.metrics.ivScore` | `Gauge` |
| Volatility score | IV + VIX + ATR + gap | weighted blend, 0–100 | `.metrics.volScore` | `Gauge` |
| Gap-up probability | Global quotes + GIFT + news | weighted blend | `.metrics.gapUpProb` | `Gauge` |
| Bull / bear / confidence | all of the above | signal engine | `.verdict.*` | `SignalCard` |
| AI explanation | LLM over computed metrics | one call per symbol per run | `.aiExplanation` | Dashboard panel |
| Global board | Global quote provider | normalise to `{key,value,changePct}` | `/global/markets` | Dashboard grid |
| Sector heatmap | Broker/index provider | per-sector % change | `/sector/strength` | Dashboard heatmap |
| News sentiment | News API + LLM | score −1..+1 | `/news/sentiment` | `NewsScreen` |
| Alerts | Signal engine thresholds | rule evaluation | `/alerts` + STOMP | `AlertsScreen` |

---

# PHASE 0 — Freeze the contract

**Build:** Read `docs/03-API-CONTRACT.md`. That file *is* the interface between your
Spring Boot code and this app. Create your Java DTOs to match it field-for-field.

Java DTO naming maps directly (`PreOpenResponse`, `VerdictDto`, `MetricsDto`, …). Two
things that bite people:

- **`asOf` is mandatory.** The app compares it to decide whether a WebSocket push is
  newer than the REST response. Missing or wrongly-formatted, and live updates silently
  stop applying. Serialize as ISO-8601 UTC: configure Jackson with
  `WRITE_DATES_AS_TIMESTAMPS = false`.
- **`metrics.range` is a two-element array**, not an object.

**Verify:** Write the JSON examples from the contract doc into
`src/test/resources/` and assert your DTOs deserialize them.

**Done when:** your DTOs round-trip the contract's example payloads unchanged.

---

# PHASE 1 — Prove you can get raw data

*Before any Spring code.* The single most common way this project stalls is discovering
in week 3 that the data source doesn't give what you assumed.

**Build:** nothing. Use `curl` or Postman against your chosen broker API.

**Verify:** pull, by hand, for NIFTY:
- [ ] full option chain for the nearest expiry (strike, CE/PE OI, ΔOI, IV, LTP)
- [ ] futures price, OI, change in OI
- [ ] index spot
- [ ] yesterday's FII/DII figures
- [ ] global quotes (S&P, NASDAQ, VIX, Nikkei) + GIFT Nifty

Save each raw response to a file. These become your test fixtures and your ingestion
parser's reference.

**Done when:** you have five saved JSON files and you know each field's exact name, type,
and unit. **Do not proceed without this.**

> Legal note: use a broker API you have an account with. Respect rate limits and each
> provider's terms — scraping exchange endpoints in production is fragile and ToS-grey.

---

# PHASE 2 — Ingestion into PostgreSQL

**Build (Spring Boot):**
- Entities/tables per the backend schema doc (`option_chain`, `futures_data`,
  `market_indices`, `fii_dii_activity`, `news`, `market_sentiment`).
- One `@Component` adapter per source, all behind a common interface
  (`MarketDataAdapter` with `getOptionChain / getFutures / getIndexSpot`). This is what
  makes adding US/Japan later a new class rather than a rewrite.
- `RestTemplate`/`WebClient` calls with timeouts and a retry policy.
- A `@Scheduled` job writing snapshots.

**Verify:**
```sql
SELECT symbol, expiry, count(*), max(captured_at)
FROM option_chain GROUP BY 1,2;
```
Rows should appear on schedule, with sane OI magnitudes and no nulls in required columns.

**Common failures:** timezone drift (store UTC, convert to IST only at the edge);
broker rate limits (widen the interval, cache); expiry rollover on Thursdays.

**Done when:** a scheduled job has populated a full session's data unattended.

---

# PHASE 3 — Signal engine

**Build:** a pure `SignalEngineService` — no HTTP, no DB access inside the math. Takes a
snapshot object, returns a verdict object. Formulas are specified in the platform docs
(`06-SIGNAL-ENGINE.md` from the backend plan): PCR, Max Pain, basis, buildup, IV score,
volatility score, gap-up probability, bull/bear, confidence, risk.

**Verify with JUnit** — this is the highest-value testing in the whole system, because a
bug here produces a *plausible but wrong* verdict that nothing else will catch:
- hand-computable 3-strike Max Pain fixture
- an obviously bullish chain → `BULLISH`
- an obviously bearish chain → `BEARISH`
- balanced → `NEUTRAL`

**Done when:** tests pass and a computed verdict is persisted to `market_sentiment`.

---

# PHASE 4 — REST endpoints

**Build:** `@RestController` for each contract endpoint. Read from Redis; only the
scheduler writes through to it. Never let a client request trigger a broker fetch — that
is how you blow your rate limit at 09:14 when everyone opens the app at once.

Also required:
- **Error shape.** A `@RestControllerAdvice` mapping every exception to
  `{"error":{"code":"...","message":"..."}}`. The app renders `message` directly to users,
  so write them for humans. Codes the app already understands: `UNAUTHORIZED`,
  `RATE_LIMITED`, `SERVER_ERROR`, `NOT_FOUND`.
- **CORS** isn't needed for the mobile app (no browser origin), but add it if you keep the
  web dashboard.

**Verify:**
```bash
curl -s localhost:8080/api/v1/market/preopen?symbol=NIFTY | jq
```
Compare field-by-field against `docs/03-API-CONTRACT.md`. Every key must match in name,
type, and nesting.

**Done when:** all eight GET endpoints return contract-shaped JSON.

---

# PHASE 5 — Connect the app to REST ← *first integration milestone*

**Build (app side):** one flag.

```bash
# .env.development
API_BASE_URL=http://10.0.2.2:8080/api/v1   # Android emulator → host machine
USE_MOCK=false
```

Host addresses that actually work:

| Running on | Use |
|---|---|
| Android emulator | `http://10.0.2.2:8080` |
| iOS simulator | `http://localhost:8080` |
| Physical device | `http://<your-LAN-IP>:8080` (same Wi-Fi) |

Then **rebuild** — `react-native-config` reads `.env` at build time, so a Metro reload is
not enough:
```bash
npm run android      # or: npm run ios
```

**Verify:** Dashboard shows your real numbers. Settings screen shows `Data mode: LIVE`.

**Common failures:**
- *Network request failed* on Android with `http://` → cleartext blocked. See
  `docs/07-NATIVE-SETUP.md` §Cleartext.
- Values render but gauges look wrong → a contract mismatch; diff your `curl` output
  against the contract before touching app code.
- Nothing changed at all → you edited `.env` but didn't rebuild.

**Done when:** you can kill the mock flag and the app is driven entirely by your Spring
Boot service.

---

# PHASE 6 — STOMP WebSocket

The app speaks **STOMP over a native WebSocket** (not socket.io — Spring doesn't serve
that protocol natively).

**Build (Spring Boot):**

```java
@Configuration @EnableWebSocketMessageBroker
public class WsConfig implements WebSocketMessageBrokerConfigurer {
  public void registerStompEndpoints(StompEndpointRegistry r) {
    r.addEndpoint("/ws").setAllowedOriginPatterns("*");   // no withSockJS() — RN uses raw WS
  }
  public void configureMessageBroker(MessageBrokerRegistry r) {
    r.enableSimpleBroker("/topic", "/queue");
    r.setApplicationDestinationPrefixes("/app");
    r.setUserDestinationPrefix("/user");
  }
}
```

Destinations the app subscribes to:

| Destination | Payload | Emitted when |
|---|---|---|
| `/topic/verdicts.{SYMBOL}` | full `/market/preopen` object | scheduler recomputes |
| `/user/queue/alerts` | `AlertItem` | an alert rule fires for that user |

**JWT on connect:** the app sends `Authorization: Bearer <token>` as a STOMP **CONNECT
header**. Read it in a `ChannelInterceptor` on `preSend` when
`StompCommand.CONNECT`, validate, and set the `Principal` — the `Principal` is what makes
`/user/queue/**` resolve to the right device.

**Important:** do **not** call `withSockJS()`. The app connects with a plain
`new WebSocket(url)`; SockJS expects an HTTP handshake negotiation the client won't do.

**Verify:** with the app open, publish a test frame from the backend:
```java
messagingTemplate.convertAndSend("/topic/verdicts.NIFTY", preOpenDto);
```
The Dashboard should update without a pull-to-refresh, and the amber "Reconnecting"
banner should disappear.

**Common failures:**
- Banner stuck on *reconnecting* → wrong path. `WS_URL` must be the full endpoint
  (`ws://host:8080/ws`), not just the host.
- Connects then immediately drops → JWT rejected in the interceptor.
- Pushes arrive but the screen doesn't change → your pushed `asOf` is older than the REST
  one. The merge rule in `useLiveVerdict.ts` is deliberately ignoring stale frames.
- `TextEncoder is not defined` → `src/polyfills` wasn't imported first in `index.js`.

**Done when:** the connection banner is hidden and pushes visibly move the numbers.

---

# PHASE 7 — Auth (JWT)

**Build:** `POST /auth/login` and `/auth/register` returning
`{ "token": "...", "user": { "id": "...", "email": "..." } }`, plus Spring Security
filtering `/api/v1/**` on the `Authorization: Bearer` header.

**How the app handles it** (already implemented):
1. Login → `saveSession()` → **Keychain / EncryptedSharedPreferences** (never AsyncStorage).
2. Token injected into every request by `client.ts`.
3. Any `401` → `loggedOut()` → session cleared → Login screen. It does **not** retry a 401.
4. Cold start restores the session before first render.

**Token expiry:** v0.1 has no refresh flow — expiry forces re-login. If you add refresh
tokens, the hook point is the `err.status === 401` branch in `src/api/client.ts`.

**Verify:** log in, force-quit, reopen → still logged in. Then expire a token server-side
→ app returns to Login cleanly, no crash loop.

---

# PHASE 8 — Push notifications (FCM)

This is the longest phase because it crosses three systems. Order matters.

**8.1 Firebase project**
- Create a Firebase project. Add an Android app (package `com.premarketiq`) and an iOS app.
- Download `google-services.json` → `android/app/`.
- Download `GoogleService-Info.plist` → add to the Xcode project (drag into the target).
- iOS only: upload your **APNs auth key (.p8)** to Firebase → Cloud Messaging.

**8.2 Native wiring** — follow `docs/07-NATIVE-SETUP.md` §Firebase.

**8.3 App → backend**
Already implemented in `App.tsx`: after login, `requestPushToken()` gets the FCM token and
calls `POST /devices/register { token, platform: "fcm" }`. `onTokenRefresh` re-registers
when FCM rotates the token.

**8.4 Backend (Spring Boot)**
- `POST /devices/register` — upsert **by token**, not by user (reinstalls create new tokens).
- `DELETE /devices/:token` — on sign-out.
- Dispatch via the Firebase Admin SDK (`firebase-admin` Maven dependency).
- **Prune dead tokens:** FCM returns `UNREGISTERED` / `INVALID_ARGUMENT` — delete on receipt
  or you accumulate ghost targets forever.
- **Throttle per user.** A noisy IV-spike rule can fire dozens of times at 09:10. Coalesce
  server-side; never rely on the client to suppress a push it already received.

**Payload contract:**
```json
{
  "notification": { "title": "BANKNIFTY · IV spike", "body": "IV jumped 12% above average" },
  "data": { "screen": "Alerts", "symbol": "BANKNIFTY", "alertId": "a1" }
}
```
`data.screen` / `data.symbol` drive deep links. Keep `data` small (APNs size cap) and put
nothing sensitive in `title`/`body` — they render on a locked screen.

**Verify all three launch paths** (they use different code paths and people usually only
test one):
- [ ] app **foreground** → Notifee renders it
- [ ] app **background** → tap opens the app
- [ ] app **killed** → tap cold-starts and still routes

---

# PHASE 9 — Scheduler orchestration

**Build:** one `@Scheduled` pre-open pipeline (cron, `Asia/Kolkata`):

```
fetch global + GIFT  →  fetch chain + futures  →  fetch/score news
   →  run signal engine  →  persist  →  write Redis
   →  convertAndSend to /topic/verdicts.{SYMBOL}
   →  evaluate alert rules  →  FCM dispatch
```

Run it around 08:45–09:10 IST, several times, so the app shows a progressively fresher
verdict as the open approaches.

**Verify:** with the app installed and closed, let the job run. Open the app at 09:10 —
the verdict should already be current, and any triggered alert should have arrived as a
push.

**Done when:** the whole chain runs unattended, with no one touching a keyboard.

---

# PHASE 10 — Hardening before anyone else uses it

- [ ] Rate limiting per user and per IP (Bucket4j or a gateway)
- [ ] Secrets out of `application.properties` → environment/parameter store
- [ ] HTTPS + WSS only in production (`.env.production` already assumes this)
- [ ] Structured logging with a correlation id per pipeline run
- [ ] `USE_MOCK=false` verified in the release build — shipping mock data to users would
      display **fabricated market numbers**, which is the worst possible bug in this app
- [ ] Disclaimer visible in-app (already rendered on Dashboard, Login, Settings)
- [ ] Offline test: airplane mode → banner + cached data, no crash
- [ ] Backend-down test: error card with retry, no crash loop

---

## Integration troubleshooting index

| Symptom | Most likely layer | First thing to check |
|---|---|---|
| Screens show demo numbers | App config | `USE_MOCK` still `true`, or app not rebuilt after `.env` edit |
| "Cannot reach PreMarketIQ" | Network/host | `10.0.2.2` vs `localhost` vs LAN IP; cleartext config |
| Data loads once, never updates | STOMP | `WS_URL` path, JWT interceptor, `asOf` freshness |
| Instant sign-out after login | Auth | JWT filter rejecting the app's `Authorization` header |
| Gauges look absurd | Contract | `curl` the endpoint, diff against `03-API-CONTRACT.md` |
| Pushes never arrive | FCM | `google-services.json` present? token reached `/devices/register`? |
| Push works foreground only | Native | Background handler in `index.js`; APNs key uploaded |
| `TextEncoder is not defined` | Polyfill | `import './src/polyfills'` must be first in `index.js` |

---

## Recommended order of work

Phases 1 → 2 → 3 → 4 → **5 (first real milestone)** → 7 → 6 → 9 → 8 → 10.

Auth before WebSocket is deliberate: the STOMP handshake needs a valid JWT, and debugging
two unfamiliar things at once is how people lose a weekend.
