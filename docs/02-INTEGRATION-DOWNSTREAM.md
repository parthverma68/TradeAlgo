# 02 · Downstream Integration

**Downstream = everything that consumes what this app produces.** The app emits device
tokens, preference writes, acknowledgements, and telemetry. Each needs a receiver.

```
                    ┌──────────── RN APP ─────────────┐
                    └──┬────────┬────────┬────────┬───┘
       FCM token ──────┘        │        │        └────── crash reports
       watchlist writes ────────┘        └── telemetry batches
       alert acks
                       │
                       ▼
              Spring Boot ──► Firebase Admin SDK ──► APNs / FCM
                          ──► Telegram / email dispatchers
```

---

## 1. Device token registration (the critical one)

Without this the alert engine has nowhere to deliver.

```
login → requestPushToken()            src/services/notifications.ts
      → permission prompt (iOS / Android 13+)
      → FCM token
      → POST /devices/register { token, platform: "fcm" }
      → backend stores it against user_id
      → alert engine now has a target
```

`onTokenRefresh` re-registers automatically when FCM rotates the token — handle repeat
calls idempotently.

**Backend must implement:**

| Endpoint | Body | Behaviour |
|---|---|---|
| `POST /devices/register` | `{ token, platform }` | **Upsert by token**, not by user |
| `DELETE /devices/{token}` | — | called on sign-out |

**Operational rules the backend owns:**

- **Dedupe by token.** Reinstalls produce new tokens; users have multiple devices.
- **Prune dead tokens.** FCM returns `UNREGISTERED` / `INVALID_ARGUMENT` — delete on
  receipt or you accumulate ghost targets and waste dispatch quota forever.
- **Filter by alert type server-side.** The app stores preferences locally in v0.1; never
  rely on a client to suppress a notification it has already received.
- **Throttle and coalesce per user.** A noisy IV-spike rule can fire dozens of times at
  09:10. Batch it before dispatch — this is a backend job, not a UI job.

### Notification payload contract

```json
{
  "notification": { "title": "BANKNIFTY · IV spike", "body": "IV jumped 12% above average" },
  "data": { "screen": "Alerts", "symbol": "BANKNIFTY", "alertId": "a1" }
}
```

`data.screen` / `data.symbol` drive deep links, handled by `addNotificationTapListener`
across all three launch paths (foreground / background / killed). Keep `data` small (APNs
caps payload size) and put nothing sensitive in `title`/`body` — they render on a locked screen.

---

## 2. Alert acknowledgement

`POST /alerts/{id}/ack` fires when a user taps an unread alert.

Downstream value: read state syncs across devices, and you get an honest engagement signal
showing which alert types users actually open — the right basis for pruning noisy rules later.

---

## 3. Watchlist & preference writes

| Action | Endpoint | Backend effect |
|---|---|---|
| Add symbol | `POST /watchlist` | may require computing verdicts for a new symbol |
| Remove | `DELETE /watchlist/{symbol}` | stop computing/alerting |
| Alert type toggle | *(local in v0.1)* | should become `PATCH /preferences` |

⚠️ **A watchlist write can silently expand your ingestion cost.** Each new symbol may mean
another option-chain fetch against a rate-limited broker API. Cap watchlist size and
validate against a supported-symbol whitelist server-side. Don't let the client define the
ingestion universe.

---

## 4. Telemetry

`src/services/telemetry.ts` buffers events and flushes every 30s.

Deliberate guarantees: **never throws** (a failing sink must not break the app), **never
blocks the UI**, **bounded buffer** (50 events, so an hour offline isn't unbounded memory).

Emitted today: `device_registered`, `alert_opened`. Add more with `track(name, props)`.

**Privacy:** no email, tokens, or holdings in event props. A trading app's telemetry is
sensitive — keep it to interaction names and non-identifying context.

---

## 5. Crash reporting

Not wired in v0.1. When you add it (Sentry or Firebase Crashlytics):
- initialise before `<Provider>` in `App.tsx` so bootstrap crashes are captured
- **scrub the JWT** from breadcrumbs and headers
- tag releases with the build number so a crash maps to a bundle

---

## 6. App stores — the slowest downstream consumer

- **Review lag** means a breaking API change reaches users on Apple's schedule, not yours.
  This is exactly why `/api/v1` must stay backward-compatible.
- **Finance apps get extra scrutiny.** The "analytics, not advice" framing must be visible
  *in the app*, not just the store listing — hence the disclaimer on Dashboard, Login and
  Settings.
- Bare RN has no OTA by default. Adding CodePush is possible but JS-only; native changes
  always need a full release.

---

## Backend checklist

- [ ] `POST /devices/register` + `DELETE /devices/{token}`
- [ ] Dead-token pruning on FCM rejection
- [ ] Server-side alert-type filtering + per-user throttling
- [ ] Push payload includes `data.screen` / `data.symbol`
- [ ] `POST /alerts/{id}/ack`
- [ ] Watchlist size cap + symbol whitelist
- [ ] Errors shaped `{ error: { code, message } }`
