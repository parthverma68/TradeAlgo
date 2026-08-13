# 06 · Error Handling & Offline Behaviour

A pre-market app is opened in the fifteen minutes before the bell, often on mobile data,
often in a lift or a car park. Network flakiness is the normal case, not the edge case.
The app is built so that **no failure produces a blank screen or a fabricated number**.

---

## The four states every data screen implements

| State | Component | Condition |
|---|---|---|
| Loading | `Loading` / `Skeleton` | first fetch, no cached data |
| Error | `ErrorState` | request failed **and** nothing cached |
| Empty | `EmptyState` | succeeded, zero rows |
| Content | screen body | data present (cached or fresh) |

Note "**and** nothing cached" — if a refresh fails but stale data exists, the app keeps
showing it with a banner rather than throwing the user back to an error card.

---

## Retry policy (`src/api/client.ts`)

| Failure | Retry? | Why |
|---|---|---|
| transport failure | yes ×2 | usually transient |
| timeout | yes ×2 | slow network |
| `429` | yes, backoff | server asked us to slow down |
| `5xx` | yes ×2 | server hiccup |
| `401` | **no** — sign out | retrying can't fix an expired token |
| other `4xx` | **no** | the request itself is wrong |

Backoff is `400ms × 2^attempt` **plus jitter**. The jitter is not cosmetic: without it,
every user's phone retries in lockstep at 09:14 and you self-DDoS your own API at the exact
moment it's under peak load.

---

## Offline behaviour

1. `NetInfo` sets `live.networkOnline`.
2. STOMP drops → `connection: 'offline'` → banner appears.
3. `useLiveVerdict` switches to 60s REST polling; those calls fail fast offline and resume
   automatically on reconnect.
4. The RTK Query cache keeps serving the last successful payload, so the Dashboard still
   shows the morning's verdict under an honest "showing last known data" label.

**What the app never does:** invent, extrapolate, or interpolate a market value to fill a
gap. Stale-but-labelled beats fresh-looking-but-wrong — especially where someone might act
on the number with real money.

---

## STOMP-specific failures

| Symptom | Handling |
|---|---|
| JWT rejected at CONNECT | `reconnecting` state; a later REST 401 triggers sign-out |
| WebSocket blocked by network | infinite reconnect; polling covers the gap |
| App backgrounded | deliberate disconnect; reconnect on foreground |
| Out-of-order frame | discarded by the `asOf` comparison |
| Malformed JSON body | swallowed per-frame; subscription survives |

---

## Test before every release

- [ ] Airplane mode on Dashboard → banner + cached data, no crash
- [ ] Backend returns 500 → error card, retry works after restart
- [ ] Backend returns malformed JSON → `BAD_RESPONSE`, no white screen
- [ ] Token expired → single 401 → clean sign-out, no loop
- [ ] Wrong `WS_URL` → app still fully usable via polling
- [ ] Slow 3G → skeletons, no request pile-up
- [ ] Push permission denied → app works, alerts still visible in-app

---

## Guardrails around the numbers themselves

Beyond networking, two product rules:

1. **Freshness is always visible.** A verdict computed at 08:50 and shown at 09:20 without
   context is misleading even though the fetch technically succeeded.
2. **The disclaimer stays rendered, not buried.** Confidence scores read as certainty to
   users unless the framing is explicit — the number describes agreement between inputs,
   not the probability of an outcome.
