# 07 · Performance, Concurrency & Scale

Concentrated in weeks 3, 4 and 8. The discipline that matters most: **measure, change one
thing, measure again.** Optimising by intuition is the most common way to waste a week and
make things slower.

---

## The load shape you're designing for

This system has an unusual profile: near-zero traffic most of the day, then **every user of a
given market opens the app in the same 60 seconds** at that market's open — and because
there are two markets on two independent clocks, that spike happens **twice a day**:

| Spike | Local time | Approx. UTC |
|---|---|---|
| India (NSE) open | 09:15 IST | 03:45 UTC (fixed, IST has no DST) |
| US (NYSE/NASDAQ) open | 09:30 ET | 13:30 UTC (EDT, Mar–Nov) or 14:30 UTC (EST, Nov–Mar) |

Design for **both** spikes, not the average, and don't assume they're evenly spaced — the gap
between them shifts by an hour twice a year as US daylight saving changes, while India's spike
time in UTC never moves. If your scheduler's cron expressions are hardcoded in UTC instead of
using `Asia/Kolkata` / `America/New_York` zone-aware triggers, the US ingestion will quietly
drift by an hour relative to the real market open every DST transition — verify this by hand
around the transition dates, don't assume Spring's cron handles it the way you expect.

Implications:
- Cache must be **warm before** each spike (scheduler writes through, not lazy population) —
  for whichever market is about to open.
- Cache stampede at 09:14 IST *and* at 09:29 ET is the realistic failure mode, twice a day.
- Retry jitter is essential or every phone retries in lockstep, per market.
- Autoscaling reacts too slowly for a 60-second spike — provision for peak or pre-warm, and
  size for the *larger* of the two markets' expected concurrent users, not their sum (the
  spikes don't overlap).

---

## Concurrency (week 3)

### Virtual threads vs platform threads

Your ingestion fans out to 4+ upstream APIs per market, all I/O-bound — 8+ calls total once
both markets' adapters run in the same cycle window (they don't share a clock, but nothing
stops both schedulers' jobs from executing concurrently if their windows happen to overlap on
a given day, which the app must handle cleanly regardless). Do the experiment:

```java
// 1. sequential
// 2. Executors.newFixedThreadPool(8)
// 3. Executors.newVirtualThreadPerTaskExecutor()
```

Time all three with 20 concurrent upstream calls (a realistic mix of India and US calls).
Virtual threads win because they park cheaply during I/O instead of pinning an OS thread. They
do **not** help CPU-bound work — try that too, and see it make no difference. That contrast is
the lesson.

**Virtual thread pitfalls:** `synchronized` blocks pin the carrier thread (use `ReentrantLock`);
thread-locals (including `MDC` for logging) don't propagate the way you expect — this bites
harder once your correlation IDs need to carry `market` through the fan-out; never pool
virtual threads — create one per task.

### Rules

- **Never** block inside a parallel stream — it shares the common ForkJoinPool and can starve
  your whole application, both markets' ingestion included.
- Bound every pool. Unbounded = OOM under load.
- Timeouts on everything: connect, read, and total. Defaults are often infinite.
- Prefer immutability over locks. `ConcurrentHashMap` when you must share.
- `CompletableFuture.allOf(...)` for the fan-out; handle partial failure explicitly — one dead
  vendor should degrade **that market's** confidence score, not fail the whole cycle and not
  touch the other market at all.

### Resilience4j

| Pattern | Applied to | Setting |
|---|---|---|
| Retry | idempotent GETs | 3 attempts, exponential + jitter |
| Circuit breaker | **each upstream vendor, per market** | open at 50% failure over 20 calls |
| Bulkhead | rate-limited vendors, **isolated per market** | cap concurrent calls |
| TimeLimiter | all upstream calls | 5s |

Break it on purpose: point the India adapter at a dead URL. The breaker should open for India,
the app should stay healthy, **US ingestion should be visibly unaffected**, and India should
recover when the URL comes back. If breaking one market's adapter ever slows or fails the
other market's requests, the bulkhead isn't actually isolating them — go find the shared
resource (a shared thread pool is the usual culprit) and fix it.

---

## Caching (week 4)

### Keys and TTLs

| Key | TTL | Written by |
|---|---|---|
| `confidence:{market}:{symbol}` | 120s | scheduler |
| `chain:{market}:{symbol}` | 60s | scheduler |
| `technical:{market}:{symbol}` | 3600s | scheduler (daily EOD job — an hour-long TTL is still fresher than the underlying data) |
| `global:board` | 300s | scheduler (cross-market, no `market` in the key) |
| `news:summary:{market}:{symbol}` | 600s | scheduler |
| `ratelimit:{userId}` | rolling | request path |

**Rule: only the scheduler writes through.** A client request must never trigger an upstream
fetch — that's what decouples your user traffic from vendor rate limits, for **either**
market's vendor.

### Cache stampede

500 requests hit an expired key simultaneously; all 500 miss and hit Postgres at once — and
because there are two daily spikes, this can happen twice, for two different keyspaces. Know
the three fixes and pick one:

1. **Single-flight lock** — one request recomputes, others wait (Redis `SETNX`).
2. **Jittered TTL** — `120s ± 20s`, so keys don't all expire together.
3. **Refresh-ahead** — the scheduler rewrites before expiry, so it never expires under load.

For this system **(3) is the natural fit**, because the scheduler already recomputes on a
cadence — and it already runs on two separate cadences, one per market, so "the scheduler"
here really means "each market's scheduler independently refreshes its own keys ahead of its
own spike." Implement (1) as an exercise anyway; it's the general-purpose answer.

---

## Database

- **Index for your query patterns**, not "just in case." Every index slows writes. With
  `market` leading every composite index (see `03-DATA-MODEL.md`), your query patterns are
  almost always `WHERE market = ? AND symbol = ? AND …` — index accordingly.
- Read query plans: `EXPLAIN ANALYZE`. `Seq Scan` on a large table = missing index.
- Watch for **N+1** — Hibernate's default lazy loading makes this trivially easy to introduce.
  Detect with `spring.jpa.show-sql` or the `hibernate.generate_statistics` counter, fix with
  `JOIN FETCH` or an `@EntityGraph`.
- **HikariCP:** pool size ≈ `(cores × 2) + effective_spindles`. Bigger is not better — an
  oversized pool queues at the database instead of in the app, which is harder to see. Two
  markets writing concurrently doesn't mean you need two pools; it means your existing pool
  sees roughly double the write burst at whichever spike is active.
- Batch inserts for chain snapshots (`hibernate.jdbc.batch_size=50`); a 20-strike chain should
  be one round trip, not twenty — true for either market's chain shape.
- Paginate everything that could grow. No unbounded `findAll()`.

---

## Measuring (weeks 4 and 8)

### k6 script shape

```js
export const options = {
  scenarios: {
    india_open: {
      executor: 'ramping-vus',
      exec: 'hitIndiaEndpoints',
      stages: [
        { duration: '30s', target: 50 },
        { duration: '1m',  target: 500 },   // the 09:14 IST spike
        { duration: '30s', target: 0 },
      ],
    },
    us_open: {
      executor: 'ramping-vus',
      exec: 'hitUsEndpoints',
      startTime: '2m',                      // run after india_open finishes, or overlap deliberately
      stages: [
        { duration: '30s', target: 50 },
        { duration: '1m',  target: 500 },   // the 09:29 ET spike
        { duration: '30s', target: 0 },
      ],
    },
  },
  thresholds: { http_req_duration: ['p(95)<300'] },
};
```

Record for each run: p50 / p95 / p99, error rate, throughput — **per market**, since the two
scenarios hit different symbols and potentially different cache-warm states. **Write the
numbers down before and after each change** — otherwise you're guessing.

### Targets to aim for

| Endpoint | p95 | Notes |
|---|---|---|
| `/market/preopen` (cache hit) | < 50ms | should be the common case, either market |
| `/market/preopen` (miss) | < 300ms | |
| `/options/chain` | < 300ms | 12–20 strikes, not 60 |
| `/ai/ask` | < 8s | LLM-bound; set expectations in the UI |

### The optimization loop

1. Measure and record the baseline, per market.
2. Find the actual bottleneck (query plan, pool metrics, GC, thread dump).
3. Change **one** thing.
4. Re-measure. Keep it only if it actually helped — and check it helped both markets, not just
   the one you happened to test against.

Skipping step 1 is how people "optimise" for a week and end up slower.

---

## Scaling out (week 8)

### nginx

```nginx
upstream premarketiq {
    least_conn;
    server app-a:8080 max_fails=3 fail_timeout=10s;
    server app-b:8080 max_fails=3 fail_timeout=10s;
}
```
Plus WebSocket upgrade headers on the `/ws` location — forgetting `Upgrade`/`Connection` is
the classic "why won't my socket connect through the proxy" bug.

### What breaks when you add instance B

| Breaks | Fix |
|---|---|
| WebSocket pushes only reach one instance | **RabbitMQ STOMP relay** |
| Rate limits double | counters in Redis |
| `@Scheduled` runs twice, **per market** | ShedLock with a lock name per market job, or a single scheduler profile |
| In-memory caches diverge | Redis |
| Sticky-session assumptions | stateless JWT (already done in week 2) |

That scheduler one is worth flagging twice: two instances means double the upstream calls and
duplicate alerts **for each market independently**, and nothing will obviously fail — you'll
just quietly burn both API quotas and annoy users of both markets.

---

## Observability

Minimum viable set (Actuator + Micrometer → Prometheus → Grafana):

| Metric | Why |
|---|---|
| Request rate + p95 by endpoint, tagged by `market` | user-facing health, per market |
| Cache hit ratio, tagged by `market` | is caching doing anything, for each market? |
| Kafka consumer lag | are you falling behind, and on which market's partitions? |
| Rabbit queue depth | are workers keeping up? |
| Hikari active/idle connections | pool saturation |
| JVM heap + GC pause | memory leaks, pause spikes |
| Upstream vendor error rate, **per vendor** | is the India data source degrading? The US one? Independently visible. |

**Correlation IDs:** generate one per pipeline run, put it in `MDC` (include `market` as a
field, not just embedded in a string), propagate into Kafka headers and log lines. Then one
grep traces a run from ingestion through the engine to the push — and a filter on `market`
separates the two markets' runs cleanly even when both schedulers happen to fire close
together. This is the single highest-value observability feature for a pipeline like this —
and the thing you'll miss most when a confidence score looks wrong and you need to know
instantly whether it was the India run or the US run that produced it.
