# 04 · State & Data Flow

## Store shape

```
store
├── auth        token, user, hydrated       (persisted → Keychain)
├── live        STOMP pushes + conn state   (ephemeral)
├── settings    activeSymbol, symbols, alert prefs
└── marketApi   RTK Query cache             (REST responses)
```

**Rule:** REST data lives in the RTK Query cache; push data lives in `live`. They are never
merged in the store — only at read time, in a hook. That separation is what lets the socket
die without blanking the screen.

---

## The merge rule

`src/hooks/useLiveVerdict.ts`:

```
REST payload   = floor (always present once fetched)
STOMP payload  = override, but ONLY if pushed.asOf > rest.asOf
```

Comparing timestamps rather than always preferring the push means a delayed or replayed
frame can't rewind the UI to older numbers. Ordering is made explicit instead of assumed.

**This is why `asOf` is mandatory in the contract.** If your Spring DTO omits it or
serializes it as a numeric timestamp, live updates silently stop applying — the app keeps
working, just never updates, which is a nasty bug to chase.

---

## Connection-driven behaviour

| `live.connection` | REST polling | Banner |
|---|---|---|
| `connected` | off (STOMP carries updates) | hidden |
| `connecting` / `reconnecting` | 60s | "Reconnecting to live feed…" |
| `offline` | 60s | "Live feed disconnected — showing last known data" |

Three tiers of freshness, and the app always tells the user which one they're on. For a
pre-market tool that matters: stale numbers presented as live are worse than an honest
"disconnected" label.

---

## Cold start sequence (`App.tsx`)

```
1. loadSession()          → Keychain → auth.hydrated → BootSplash.hide()
2. NetInfo listener       → live.networkOnline
3. token present?         → connectStomp(token, symbols)
4. notifications enabled? → requestPushToken() → POST /devices/register
5. onForegroundMessage() + tap listener + telemetry
6. render RootNavigator (Login vs Tabs, from auth.token)
```

The splash covers step 1, so a returning user never sees the login screen flash.

---

## Screen data dependencies

| Screen | REST | STOMP | Notes |
|---|---|---|---|
| Dashboard | `preopen`, `global`, `sectors` | `/topic/verdicts.{SYM}` | pull-to-refresh refetches all three |
| Option Chain | `options/chain` | — | static between scheduler runs |
| Futures | `futures/{symbol}` | — | |
| News | `news/sentiment` | — | overnight batch |
| Alerts | `alerts` | `/user/queue/alerts` | pushes merge ahead, deduped by `id` |
| Watchlist | `watchlist` | — | mutations invalidate the tag |

---

## Symbol switching

`settings.activeSymbol` is the single source of truth. Changing it:
1. re-renders every screen bound to it,
2. RTK Query fetches the new symbol (or serves cache),
3. `updateSubscription()` re-subscribes STOMP to `/topic/verdicts.{NEW}`.

No screen holds its own symbol state — that's what keeps the tabs in sync.

---

## Deliberately *not* in Redux

Form inputs (local `useState`), navigation state (React Navigation owns it), and derived
values like colours and percentages (computed at render from theme helpers). Keeping these
out avoids the classic RN failure of re-rendering the whole tree on every keystroke.
