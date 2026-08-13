# 03 · API Contract (client view)

The exact shapes `src/types.ts` expects. **This file is the interface between your Spring
Boot backend and this app.** Change both together, in the same commit.

Base: `{API_BASE_URL}` = `http://host:8080/api/v1`. JSON only. Times ISO-8601 UTC.

> **Jackson setup:** `spring.jackson.serialization.write-dates-as-timestamps=false`
> and `spring.jackson.default-property-inclusion=non_null`. The app parses `asOf` with
> `new Date(...)`; a numeric timestamp breaks the live-update merge rule silently.

---

## Auth

`POST /auth/login` · `POST /auth/register`
Request `{ "email": string, "password": string }`
```json
{ "token": "eyJhbGci…", "user": { "id": "u_1", "email": "a@b.com" } }
```

---

## `GET /market/preopen?symbol=NIFTY`

The primary payload. **The same object is pushed over STOMP** to
`/topic/verdicts.{SYMBOL}` — one DTO serves both paths.

```json
{
  "symbol": "NIFTY",
  "asOf": "2026-08-10T03:30:00Z",
  "spot": 24218.6,
  "futures": 24251.0,
  "dayChangePct": 0.34,
  "verdict": {
    "signal": "BULLISH",
    "confidence": 71,
    "bullScore": 73,
    "bearScore": 41,
    "riskScore": 38
  },
  "metrics": {
    "pcr": 1.46,
    "ivScore": 0.88,
    "volScore": 42,
    "gapUpProb": 58,
    "maxPain": 24200,
    "basis": 32.4,
    "range": [24050, 24420],
    "buildup": "long_buildup"
  },
  "aiExplanation": "NIFTY leans bullish into the open…",
  "spark": [24135, 24150, 24142, 24180, 24205, 24190, 24230, 24218],
  "disclaimer": "Analytics only — not investment advice."
}
```

| Field | Java type | Notes |
|---|---|---|
| `asOf` | `Instant` | **Required.** Drives the STOMP-vs-REST merge |
| `verdict.signal` | `enum {BULLISH,BEARISH,NEUTRAL}` | New values need an app release |
| `verdict.confidence` | `int` 0–100 | Agreement of inputs, **not** probability |
| `metrics.range` | `BigDecimal[2]` | Array of exactly two, `[low, high]` |
| `metrics.buildup` | `enum` | `long_buildup \| short_buildup \| short_covering \| long_unwinding` — lowercase snake, so annotate the enum or use `@JsonValue` |
| `spark` | `number[]` | 6–30 points; the app scales automatically |
| `disclaimer` | `String?` | If present, rendered verbatim |

---

## `GET /options/chain/{symbol}?expiry=YYYY-MM-DD`

```json
{
  "symbol": "NIFTY",
  "expiry": "2026-08-13",
  "pcr": 1.46,
  "maxPain": 24200,
  "rows": [
    { "strike": 24000,
      "callOi": 48, "callChgOi": -3, "callIv": 14.2, "callLtp": 92.5,
      "putOi": 168, "putChgOi": 22, "putIv": 15.1, "putLtp": 61.0 }
  ],
  "zones": {
    "support": [24000, 23800],
    "resistance": [24300, 24500],
    "callWriting": [24300],
    "putWriting": [24000]
  }
}
```

`rows` **must be sorted ascending by strike** — the chart renders in array order.
Return ~12–20 strikes around ATM; a 60-strike payload is slow on mobile.

## `GET /futures/{symbol}`
```json
{ "symbol": "NIFTY", "futPrice": 24251, "spotPrice": 24218.6, "basis": 32.4,
  "oi": 12840000, "chgOi": 412000, "volume": 284000, "buildup": "long_buildup" }
```

## `GET /global/markets`
```json
[ { "key": "S&P 500", "value": 5872.4, "changePct": 0.53 } ]
```

## `GET /sector/strength`
```json
[ { "sector": "Banking", "changePct": 1.2 } ]
```

## `GET /news/sentiment?symbol=NIFTY`
```json
[ { "id": "n1", "headline": "Fed minutes signal patience…", "source": "Reuters",
    "sentiment": 0.6, "classification": "BULLISH", "tag": "Macro",
    "publishedAt": "2026-08-10T01:12:00Z" } ]
```
`sentiment` ∈ [-1, 1]. `tag` is one short label, rendered as a chip.

## `GET /alerts`
```json
[ { "id": "a1", "type": "iv_spike", "symbol": "BANKNIFTY",
    "message": "IV jumped 12% above its 20-day average",
    "createdAt": "2026-08-10T03:40:00Z", "read": false } ]
```
Known `type` values: `iv_spike`, `unusual_oi`, `gap_up`, `reversal`.
Unknown types render neutral — safe to add new ones without an app release.

## `POST /alerts/{id}/ack` → `204`

## Watchlist
- `GET /watchlist` → `["NIFTY","BANKNIFTY"]`
- `POST /watchlist` `{ "symbol": "FINNIFTY" }`
- `DELETE /watchlist/{symbol}`

## Devices (downstream)
- `POST /devices/register` `{ "token": "fcm-token", "platform": "fcm" }`
- `DELETE /devices/{token}`

---

## Errors

Every non-2xx must return:
```json
{ "error": { "code": "RATE_LIMITED", "message": "Too many requests." } }
```

Spring Boot: a `@RestControllerAdvice` with `@ExceptionHandler` methods. The app shows
`message` directly to the user, so write them for humans, not for logs.

Codes the app maps to specific behaviour: `UNAUTHORIZED` (401 → sign out, no retry),
`RATE_LIMITED` (429 → backoff + retry), `SERVER_ERROR` (5xx → retry ×2).

---

## STOMP WebSocket

Endpoint `ws://host:8080/ws` — **plain WebSocket, no SockJS.**

| Direction | Destination | Payload |
|---|---|---|
| app subscribes | `/topic/verdicts.{SYMBOL}` | the `/market/preopen` object |
| app subscribes | `/user/queue/alerts` | an `AlertItem` |
| app sends | `Authorization` CONNECT header | `Bearer <jwt>` |

Publish only after the scheduler recomputes. Never let a client action trigger an upstream
broker fetch — that's how you exhaust your rate limit at market open.
