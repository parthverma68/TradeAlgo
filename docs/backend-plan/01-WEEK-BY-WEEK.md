# 01 · The 8-Week Plan

Solo developer, ~3–4 focused hours on weekdays plus longer weekend blocks. Each week has a
**theme**, the **concepts** it teaches, what you **build**, and a **verify gate**. Don't move
on until the gate passes — later weeks assume the earlier ones are trustworthy.

Both markets — **India (NSE/BSE)** and **US (NYSE/NASDAQ)** — are in scope from week 1. See
the README's "Two markets, one system" table for the concrete differences (symbols, currency,
timezone, session hours, institutional-flow signal, data-vendor terms). The schema, cache
keys, Kafka keys and STOMP topics are all keyed by `(market, symbol)` from the first migration
on, so adding depth to either market later never requires a breaking schema change.

**Weekly rhythm that works for learning:**

| Days | Activity |
|---|---|
| Mon | Read/learn the week's concept properly before touching code (2–3h) |
| Tue–Thu | Build the feature that uses it |
| Fri | Write tests, break it deliberately, fix it |
| Weekend | Bigger block: finish the deliverable, hit the verify gate, write notes |

That Friday "break it deliberately" slot is the highest-value hour of the week. Kill the
Kafka broker mid-consume. Yank the DB connection. That's where the concept actually lands.

---

# WEEK 1 · Foundations, SQL & the contract

**Concepts:** Spring Boot structure, dependency injection, layered architecture, JPA/Hibernate,
Flyway migrations, **SQL depth** (indexes, joins, `EXPLAIN ANALYZE`), Testcontainers, Docker Compose.

### Build
- `docker-compose.yml`: Postgres 16 + Redis (you'll use Redis in week 4).
- Spring Boot 3.3 / **Java 21** project. Packages by feature, not by layer:
  `market/`, `signals/`, `auth/`, `ingestion/` — each with its own controller/service/repo.
- Flyway migrations for the core schema (see `03-DATA-MODEL.md`), with a `market TEXT NOT
  NULL CHECK (market IN ('IN','US'))` column and composite `(market, symbol, …)` keys from
  the first migration.
- JPA entities + repositories for `market_indices`, `option_chain`, `futures_data`,
  `price_candles` (daily OHLCV — this is what week 4's technical/graph indicators are computed
  from, so the table exists from week 1 even though nothing reads it until week 4).
- **Backfill ~250 daily sessions of OHLCV history per symbol, both markets**, from your
  vendor's historical-data endpoint — a 200-day moving average needs 200 prior bars before it
  can compute at all, and starting the table empty means that indicator is `null` for the
  first ~9 months. Do this once, by hand, in week 1; don't let it become a week-4 surprise.
- DTOs matching `03-API-CONTRACT.md` from the mobile repo, **exactly** — including the
  `market` field the contract now requires on every market payload.
- `GET /api/v1/market/preopen` returning hardcoded data in the contract shape, for one fixture
  from each market (e.g. `market=IN&symbol=NIFTY` and `market=US&symbol=SPX`).
- Global `@RestControllerAdvice` → `{"error":{"code","message"}}`.
- Jackson config: ISO-8601 dates, non-null inclusion.

### SQL you should actually practise this week
Not "learn SQL" in the abstract — these specific things, against your own tables:
```sql
-- Which strikes had the biggest OI change between two snapshots, per market?
-- Latest snapshot per (market, symbol) — window function, not a subquery-per-row
SELECT DISTINCT ON (market, symbol) market, symbol, spot, captured_at
FROM market_indices ORDER BY market, symbol, captured_at DESC;

-- Then prove your index is used:
EXPLAIN ANALYZE SELECT * FROM option_chain
WHERE market='IN' AND symbol='NIFTY' AND expiry='2026-08-13'
ORDER BY captured_at DESC LIMIT 20;

EXPLAIN ANALYZE SELECT * FROM option_chain
WHERE market='US' AND symbol='SPX' AND expiry='2026-08-14'
ORDER BY captured_at DESC LIMIT 20;
```
Learn to read the query plan. `Seq Scan` on a large table means you're missing an index —
and with two markets in one table, a plain index on `symbol` alone is a trap: `NIFTY` and a
hypothetical US ticker collision aside, the planner needs `market` in the index too or it
scans rows for the wrong market on every lookup.

### Verify gate
- [ ] `curl localhost:8080/api/v1/market/preopen?market=IN&symbol=NIFTY` matches the contract
      field-for-field
- [ ] `curl localhost:8080/api/v1/market/preopen?market=US&symbol=SPX` matches the contract
      field-for-field, with `currency: "USD"` where India returns `"INR"`
- [ ] Flyway migrations run clean on an empty DB
- [ ] One integration test using **Testcontainers** (real Postgres, not H2 — H2 lies about SQL dialect)
- [ ] You can explain why each index exists, including why `market` leads the composite index

### Traps
Entity classes leaking into controllers (always map to DTOs); `spring.jpa.hibernate.ddl-auto=update`
in anything but a throwaway (use Flyway, always); H2 in tests giving false confidence; treating
`symbol` as globally unique and forgetting `market` in a `WHERE` clause or a `UNIQUE` constraint.

---

# WEEK 2 · Auth & Security

**Concepts:** Spring Security filter chain, JWT (access + refresh), BCrypt, stateless sessions,
method-level authorization, **rate limiting**, input validation, OWASP Top 10, secrets management.

### Build
- Spring Security 6 config: stateless, JWT bearer filter, public vs protected routes.
- `POST /auth/register` · `/auth/login` → `{ token, user }` (contract shape).
- **Refresh tokens**: short-lived access (15m) + long-lived refresh (30d) stored hashed in DB,
  rotated on use, revocable. This is the piece your mobile app's v0.1 is missing.
- BCrypt password hashing (cost 12), password policy validation.
- `@PreAuthorize` on admin-only endpoints; a `ROLE_ADMIN` for your ops endpoints.
- **Bucket4j + Redis** rate limiting: per-IP on `/auth/*`, per-user on `/api/v1/*`, and note
  that market endpoints will need *per-market* quota buckets from week 3 onward — India and
  US upstream vendors have independent, unrelated rate limits.
- Bean Validation (`@Valid`, `@Email`, `@Size`) on every request body.
- Secrets out of `application.yml` → env vars — now for **two** sets of vendor credentials.

### Concept work that matters
Understand *why* each piece exists, not just how to configure it:
- Why stateless JWT instead of server sessions? (horizontal scaling — pays off in week 8)
- Why is a JWT you can't revoke a problem? (hence refresh-token rotation)
- Why hash refresh tokens in the DB? (a DB leak shouldn't be a session leak)
- Read the OWASP Top 10 and find which ones your API is currently exposed to.

### Verify gate
- [ ] Mobile app logs in against your real backend (`USE_MOCK=false`), session survives restart
- [ ] Expired token → app signs out cleanly, no retry loop
- [ ] 20 rapid login attempts → `429` with `{"error":{"code":"RATE_LIMITED"}}`
- [ ] Refresh rotation works; a reused old refresh token is rejected
- [ ] Passwords never appear in logs

### Traps
`permitAll()` on too much; returning different errors for "user not found" vs "wrong password"
(user enumeration); logging the `Authorization` header; JWT secret shorter than 256 bits.

---

# WEEK 3 · Ingestion, Multithreading & Streams

**Concepts:** `ExecutorService`, **virtual threads (Java 21)**, `CompletableFuture`,
**Java Stream API**, `HttpClient`/`RestClient`, Resilience4j (retry, circuit breaker, bulkhead,
timeout), `@Scheduled`, thread-safety.

### Build
- `MarketDataAdapter` interface with **two implementations** — one per market
  (`InMarketDataAdapter` against your chosen India broker API, `UsMarketDataAdapter` against
  your chosen US vendor). Same interface, different upstream shapes; the mapping to your DTOs
  is where the real design work is. (Sort both data sources *before* this week — see
  `00-LEARNING-MAP.md` §Prerequisite.)
- Parallel fetch of independent sources with `CompletableFuture.allOf(...)`:
  chain, futures, spot, globals fetched concurrently, **and both markets' adapters run
  concurrently with each other**, not serially.
- **Virtual threads** (`Executors.newVirtualThreadPerTaskExecutor()`) for the I/O-bound
  fan-out. Then measure it against a fixed pool — this is the exercise that makes virtual
  threads click, and it matters more once you're fanning out to 8+ calls across two vendors.
- Resilience4j: retry with exponential backoff + jitter, circuit breaker **per upstream
  vendor** (so an India outage can't trip the breaker guarding US calls, or vice versa —
  that's the bulkhead pattern earning its keep), timeouts on everything.
- Parsing/normalisation with the Stream API: `map`, `filter`, `collect`, `groupingBy`,
  `flatMap`, `Collectors.toMap`, `teeing`.
- **Two independent `@Scheduled` jobs**, one per market, each on its own cron and its own
  timezone: `Asia/Kolkata` for the India ingestion cadence, `America/New_York` for the US
  cadence. Don't merge them into one job with an `if (market == ...)` branch — they have
  different trading calendars (NSE holidays vs NYSE/NASDAQ holidays) and, once daylight
  saving shifts the US session in the wall clock, different UTC trigger times through the
  year. Two schedules is the honest model.
- **A third, much slower `@Scheduled` job: daily EOD candle ingestion** into `price_candles`,
  once per symbol per market per trading day, after that market's close. This is a completely
  different cadence to the chain/futures polling above (once a day vs every few minutes) —
  don't fold it into the same job just because it shares a `MarketDataAdapter`. It's what feeds
  week 4's technical/graph indicators (RSI, moving averages, volume surge).

### Concept work
- Write the same fan-out three ways: sequential, fixed thread pool, virtual threads. Time all
  three. Understand *why* virtual threads win for I/O and don't for CPU-bound work.
- Find and fix one deliberate race condition (shared mutable `HashMap` across threads →
  `ConcurrentHashMap` or immutability).
- Learn when **not** to use parallel streams (they share the common ForkJoinPool — a blocking
  call inside one can starve your whole app).

### Verify gate
- [ ] A scheduled job has populated a full India session's real data unattended
- [ ] A scheduled job has populated a full US session's real data unattended, on its own clock
- [ ] Kill the India upstream (wrong URL) → its circuit breaker opens; **US ingestion keeps
      running unaffected** (the bulkhead is real, not just configured)
- [ ] Timing comparison of the three concurrency approaches, written down
- [ ] No `Seq Scan` on your ingestion write path for either market

### Traps
Blocking calls inside a parallel stream; unbounded thread pools; catching and swallowing
`InterruptedException`; forgetting timeouts (the default is often *infinite*); sharing one
circuit breaker or one thread pool across both markets' vendors, so one market's outage stalls
the other.

---

# WEEK 4 · Confidence engine, Redis & first optimization pass

**Concepts:** pure functions, Redis caching patterns (cache-aside, TTL, stampede), Spring Cache
abstraction, HikariCP connection pooling, DB indexing, N+1 detection, pagination, JMeter/k6.

### The shape of what you're building this week

The user sees **one confidence/prediction score and a plain-language summary explaining it** —
not a dashboard of separate indicator tabs. Everything below exists to produce that one number
honestly: several small, independently-testable, **pure** scorers, each responsible for one
category of API-sourced evidence, combined by an engine that also writes the reasoning. No
scorer talks to the network or the DB — they take data already fetched, return a score plus
the raw figures behind it, and are trivial to unit test because of it.

### Build
- **`FnoScorer`** — pure, no HTTP, no DB inside the math. Input: option-chain/futures snapshot
  (already carries `market`). Output: `fno_score` (0–100) plus the raw PCR, Max Pain distance,
  IV-vs-average, and OI buildup it was computed from. Formulas in the platform spec (PCR, Max
  Pain, basis, buildup, IV score) — identical per market, every input scoped to one.
- JUnit tests: hand-computable Max Pain fixture **for each market**; obviously-bullish →
  high `fno_score`; obviously bearish → low; balanced → mid-range.
- **`TechnicalIndicatorService` — the "graph indicators."** Same pure discipline: input is the
  last ~200 `price_candles` rows for `(market, symbol)`, output is `technical_score` plus the
  raw RSI/SMA/volume figures. Compute:
  - **RSI(14)** — Wilder's smoothing, not a naive average; the difference matters for the
    fixture test below.
  - **SMA(50)** and **SMA(200)**, plus `above_sma_50` / `above_sma_200` booleans (the
    "vs 50/200-day average" indicators the app already renders).
  - **Volume vs 30-day average** — `(todayVolume / avg(last 30 days) - 1) * 100`.
  - If fewer than 200 candles exist for a symbol, `sma_200` (and anything derived from it) is
    `null` — that's the correct answer, not a bug (see week 1's backfill note in
    `03-DATA-MODEL.md`). Never substitute a shorter window silently; a mislabeled "200-day"
    average computed from 40 days of data is exactly the kind of fabricated number this whole
    plan tries to design against.
  - MACD and Bollinger Bands are a natural, self-contained addition once RSI/SMA are solid and
    tested — same input, same pure-function shape — but they're not required for `technical_score`
    v1, so treat them as a week-4 stretch, not a blocker.
- JUnit tests for `TechnicalIndicatorService`: a hand-computed RSI(14) fixture (there are
  published worked examples — use one, don't trust your own arithmetic on the first pass), a
  candle series that should sit clearly above both moving averages and one clearly below, and
  the `< 200 candles → null sma_200` case. **For each market** — the formulas are identical,
  but a fixture built only from India data can hide a bug that only shows up on US data with a
  different price scale (₹1000s vs $100s) or a different volume scale.
- **`SessionMovementScorer`** — pure. Input: today's `session_movement` rows for
  `(market, symbol)`. Output: `premarket_score`, from the pre-open/pre-market gap % (and the
  post-market gap where that session exists — see `03-DATA-MODEL.md`). No row for a session
  means **no contribution to the score**, not a zero or a bearish default — a market that
  genuinely has no post-market session (India, today) must not be silently penalised for
  "missing" data it was never going to have.
- **`FlowScorer`** — pure. Input: latest `institutional_flow` row for `(market, symbol's
  segment)`. Output: `flow_score`, from FII/DII net (India) or the latest COT positioning (US).
- **`ConfidenceEngine`** — the composition step, also pure. Takes the four sub-scores, applies
  documented weights (pick numbers, write down *why*, e.g. F&O and technical weighted heavier
  than flow since they update far more often), and produces `overall`, `signal`
  (`BULLISH`/`BEARISH`/`NEUTRAL`), and `recommendation` (`BUY`/`WATCH`/`AVOID`).
- **The summary — "why this score."** A deterministic template, not an LLM call, run
  immediately after `ConfidenceEngine`: identify the one or two sub-scores that pulled hardest
  in the winning direction and the one that pulled against it, and state them by name with
  their actual figures — *"BULLISH (74): strong OI buildup and RSI at 68, tempered by a flat
  pre-market gap."* Because it's built directly from the same numbers stored alongside it, it
  cannot say something the data doesn't support. This ships in week 4; a richer, RAG-grounded
  rewrite of the same facts is a week-7 upgrade (`ai_explanation`), never a replacement source
  of truth (see `05-AI-RAG-AGENTS.md`).
- Persist everything — `overall`, `signal`, `recommendation`, the four sub-scores, the raw
  figures, and `summary` — to `confidence_score` (see `03-DATA-MODEL.md`).
- Redis cache-aside on read endpoints. Keys and TTLs, now market-scoped:
  `confidence:{market}:{symbol}` 120s · `chain:{market}:{symbol}` 60s ·
  `technical:{market}:{symbol}` 3600s (technical indicators only change once a day, so an
  hourly TTL is generous, not stale) · `global:board` 300s (global markets board is inherently
  cross-market, so it stays unkeyed by a single market).
- **Only the scheduler writes through to Redis.** A client request must never trigger an
  upstream broker fetch — that's how you exhaust your rate limit at either market's open
  (09:15 IST or 09:30 ET).
- Handle **cache stampede**: when 500 users hit an expired key at once, for either market's
  most-watched symbol. Learn the options (lock/single-flight, jittered TTL, refresh-ahead) and
  pick one.
- Load test with **k6**: measure p50/p95/p99 on `/stocks/{symbol}/confidence` before and after
  caching, for both an India symbol and a US symbol.

### Concept work
This is your first real **optimization** week, so make it measured, not vibes:
1. Baseline: k6 at 100 VUs, record p95, for each market.
2. Find the bottleneck (enable `spring.jpa.show-sql`, check the query plan, watch Hikari pool
   metrics).
3. Fix one thing. Re-measure. Write down the delta.

Optimising without measuring first is the single most common junior mistake — do the loop
properly once and you'll never skip it again.

### Verify gate
- [ ] `FnoScorer` tests pass, including the hand-computed Max Pain for **both** markets
- [ ] `TechnicalIndicatorService` tests pass, including the hand-computed RSI(14) and the
      `< 200 candles → null sma_200` case, for **both** markets
- [ ] `SessionMovementScorer` returns "no contribution," not zero, when India has no post-market
      row for a symbol
- [ ] `ConfidenceEngine`'s weights are written down somewhere durable (a doc comment or this
      file), not just live in code
- [ ] The generated `summary` for a hand-built fixture names the actual top driver(s) — swap
      which sub-score is highest and confirm the summary text changes to match
- [ ] p95 latency documented before and after caching, for an India and a US symbol
- [ ] Cache hit ratio observable, broken down by market
- [ ] `/stocks/{symbol}/confidence` serves a real computed `overall` + `signal` +
      `recommendation` + `summary` from real ingested data, for both markets
- [ ] A stock/index with a genuinely golden-cross-like candle history returns
      `above_sma_50 = true, above_sma_200 = true` and the reverse for a clearly bearish one —
      checked by eye against the same symbol's chart, not just asserted in a unit test

---

# WEEK 5 · Kafka & user events

**Concepts:** log-based streaming, topics, partitions, keys, consumer groups, offsets,
at-least-once delivery, idempotency, DLQ, retention, event-driven design, event schema.

### Why Kafka here (not contrived)
Market snapshots are an **immutable, ordered, replayable stream** — per market. When you
change the signal engine, you'll want to re-run it over last week's data for either market,
that's a replay from an offset, which is exactly what a log gives you and a work queue doesn't.

### Build
- Kafka in Docker Compose (KRaft mode, no ZooKeeper).
- Ingestion becomes a **producer**: publishes to `market.chain`, `market.futures`, `market.news`.
  **Key by `market:symbol`** (e.g. `IN:NIFTY`, `US:SPX`), not `symbol` alone, so all events for
  one market+symbol land on one partition and stay ordered — and so an India-heavy day doesn't
  accidentally skew partition load if you ever key by symbol text alone and two tickers hash
  unevenly.
- **Consumers**: a persistence consumer (writes to Postgres) and a signal consumer (runs the
  scorers and `ConfidenceEngine`). Separate consumer groups — both see every event, from both
  markets.
- **User events pipeline**: the mobile app's telemetry (`device_registered`, `alert_opened`,
  screen views) → `POST /events` → Kafka topic `user.events` → consumer → analytics table.
  This is your event-sourcing-flavoured learning ground.
- **Idempotency**: consumers must tolerate redelivery. Use a natural key
  (`market + symbol + expiry + captured_at`) with an upsert, or a processed-event table.
- **DLQ**: a poison message must not stall the partition forever.

### Concept work
- Kill a consumer mid-batch. Restart. Did you lose or duplicate messages? Why?
- Change the partition count. What breaks about ordering guarantees?
- Set a short retention and watch messages age out.
- Read about at-most-once vs at-least-once vs exactly-once, and be able to say which you have.

### Verify gate
- [ ] Ingestion → Kafka → two independent consumers, both working, for both markets
- [ ] Consumer restart causes no duplicate DB rows (idempotency proven), for both markets
- [ ] Poison message lands in the DLQ; the consumer keeps going
- [ ] User events from the phone appear in your analytics table

---

# WEEK 6 · RabbitMQ, WebSocket & alerts

**Concepts:** work queues vs event logs, exchanges (direct/topic/fanout), routing keys, acks,
`nack`/requeue, dead-letter exchanges, prefetch, priority queues, STOMP.

### Why RabbitMQ *as well as* Kafka
This is the distinction worth internalising — and you'll feel it, not just read it:

| | Kafka | RabbitMQ |
|---|---|---|
| Model | durable **log**, consumers track offsets | **broker-managed queue**, messages ack'd and removed |
| Good for | replayable event streams, fan-out to many readers | task distribution, per-message retry, work that must be *done once* |
| Here | market data + user events, both markets | alert dispatch, crawl jobs, embedding jobs |

Sending a push notification is a **task**: it must happen once, retry on failure, and go to a
DLQ if it keeps failing. Replaying it a week later would be wrong. That's a queue, not a log.

### Build
- RabbitMQ in Compose (with the management UI — use it, it's the best learning tool here).
- Alert engine: signal consumer detects a threshold breach (either market) → publishes an
  alert **task** to RabbitMQ → a worker dispatches via **Firebase Admin SDK** to the device.
- Manual acks, `prefetch=1` for slow workers, DLX with a retry-count header, exponential retry.
- **Dead FCM token pruning** on `UNREGISTERED` / `INVALID_ARGUMENT`.
- Per-user throttling/coalescing before dispatch (a noisy IV rule can fire 30 times at either
  market's open — 09:10 IST or 09:25 ET).
- **STOMP WebSocket** endpoint `/ws` (no SockJS — the RN client uses a raw WebSocket).
  JWT validated in a `ChannelInterceptor`, `Principal` set so `/user/queue/**` resolves.
- Push the updated confidence score to `/topic/confidence.{MARKET}.{SYMBOL}` after each
  scheduler run, for whichever market that run just computed.

### Verify gate
- [ ] Alert fires end-to-end to a real phone, in all three app states (foreground/background/killed),
      for an alert originating from either market
- [ ] Worker crash mid-task → message redelivered, not lost
- [ ] Repeated failure → DLQ, with the reason visible
- [ ] Mobile Dashboard updates live with no pull-to-refresh, watching a symbol from each market
- [ ] You can explain, unprompted, why alerts use Rabbit and market data uses Kafka

---

# WEEK 7 · Crawler, Vector DB, RAG & Agents

The densest week. Build in this order — each piece feeds the next.

**Concepts:** polite web crawling, HTML parsing, chunking, embeddings, vector similarity,
pgvector/Qdrant, hybrid search, RAG grounding, tool-calling agents, prompt injection.

### 7a · Web crawler (Mon–Tue)
- Jsoup-based fetcher, crawl jobs distributed via **RabbitMQ** (reusing week 6 — the work-queue
  shape fits perfectly).
- Seed sources for **both** markets: India financial press/RSS (e.g. exchange circulars,
  business-news RSS) alongside US financial press/RSS (e.g. market-wire feeds). One crawler,
  one pipeline, tagged by which market(s) an article is relevant to.
- **Non-negotiables:** honour `robots.txt`, set a real `User-Agent` with contact info,
  rate-limit per domain (1 req/sec is a decent default), respect `Crawl-delay`, obey each
  site's ToS. Prefer official RSS feeds and APIs over scraping — they exist for this purpose.
- Dedupe by URL hash + content hash. Store raw HTML + extracted text separately.

### 7b · Vector store & embeddings (Wed)
- **pgvector** extension on your existing Postgres. Start here rather than a separate vector
  DB — one less system to run, and it teaches the same concepts. Qdrant/Weaviate become
  worthwhile at millions of vectors, which you won't have.
- Chunk articles (~500 tokens, ~50 overlap), embed via an embedding API, store
  `(chunk_text, embedding vector(1536), metadata)` — metadata includes a `market` tag where
  the article is clearly market-specific, `null`/both where it's macro (Fed policy affects
  both markets' sentiment, for instance).
- HNSW index. Cosine similarity search.
- **Hybrid search**: combine vector similarity with Postgres full-text (`tsvector`) and fuse
  the rankings. Pure vector search is surprisingly bad at exact tickers and numbers — feeling
  that failure yourself is the lesson, and it bites in both markets' terminology.

### 7c · RAG (Thu)
- Pipeline: query → retrieve top-k chunks → rerank → assemble prompt with **citations** →
  LLM → response with sources.
- Ground the AI market explanation in retrieved news instead of free-generating it.
- **Evaluate it.** Build 20 question/expected-source pairs (mix both markets) and measure
  retrieval hit rate. Otherwise you have no idea whether it works — RAG demos look great and
  are often wrong.

### 7d · Agent (Fri–weekend)
- A **tool-calling loop**, not magic: the LLM is given tools (`getOptionChain`, `searchNews`,
  `getConfidenceScore`, `computeMaxPain`), decides which to call, you execute, feed results back, loop
  until it answers. Every tool takes `(market, symbol)`, not `symbol` alone.
- **Guardrails, non-optional:** max iterations (5), per-request token budget, timeout,
  tool allowlist, no tool that writes data or spends money.
- Expose as `POST /ai/ask` — "why is BANKNIFTY bearish today?" and "why is SPX cautious into
  the open?" should both work through the same endpoint and the same tool set.

### Honest limits to design around
- The LLM **will** state wrong numbers confidently. Every figure in a response must come from
  a tool result you can cite, never from the model's own generation.
- **Prompt injection is real**: crawled web content is untrusted input. A page containing
  "ignore previous instructions" reaches your prompt. Never let retrieved text authorise a
  tool call; keep instructions and data clearly separated.
- Retrieval quality dominates output quality. A better prompt won't save bad chunks.
- If the model isn't told which market a question is about, don't guess from the ticker text
  alone in cases that could be ambiguous — make the client pass `market` explicitly (the
  mobile app always knows which market screen the user is on).

### Verify gate
- [ ] Crawler respects robots.txt (test against a disallowed path) and per-domain rate limits
- [ ] Vector search returns sensibly relevant chunks for 10 hand-checked queries, split across
      both markets
- [ ] Hybrid beats pure vector on your eval set — with numbers
- [ ] Every AI explanation cites the sources it used
- [ ] Agent answers a multi-step question for an India symbol and a US symbol, and stops at
      the iteration cap
- [ ] A page containing an injection string does **not** change agent behaviour

---

# WEEK 8 · Scale, load balancing & operations

**Concepts:** horizontal scaling, statelessness, nginx load balancing, health checks, external
STOMP broker relay, observability, JVM tuning, graceful shutdown, deployment.

### Build
- Run **two app instances** behind **nginx** (round-robin, health checks, `/actuator/health`).
- **Discover the WebSocket problem yourself**, then fix it — this is the best learning moment
  of the whole plan: with two instances and an in-memory simple broker, a client connected to
  instance A never receives a message published on instance B. Fixes:
  1. sticky sessions (works, but breaks on failover — understand *why* it's a bandaid), or
  2. **RabbitMQ STOMP broker relay** — `enableStompBrokerRelay("/topic","/queue")` points
     Spring at RabbitMQ, and both instances share one broker. Your week-6 RabbitMQ suddenly
     solves your week-8 scaling problem.
- Verify statelessness: kill instance A mid-session; the user shouldn't notice (JWT + Redis
  make this possible — this is the payoff for week 2's stateless choice).
- **Two independent scheduler leaders** (or one leader running two schedules): with two
  instances, `@Scheduled` runs *twice* per market unless you elect a single leader. ShedLock
  (a DB/Redis lock) is per job name, so lock `ingest-IN` and `ingest-US` separately — proving
  the lock actually scopes to the right job is more instructive than one combined lock.
- **Observability:** Actuator + Micrometer → Prometheus → Grafana. Dashboard: request rate,
  p95 latency, cache hit ratio (split by market), Kafka consumer lag, Rabbit queue depth, JVM
  heap/GC.
- Structured JSON logging with a **correlation ID** per pipeline run (tag it with `market`),
  propagated across threads and into Kafka headers (learn `MDC`, and why virtual
  threads/async break it).
- Graceful shutdown (`server.shutdown=graceful`), connection draining.
- **Load test the whole system** with k6 — including **both** daily spike shapes: the 09:15
  IST India open and the 09:30 ET (13:30/14:30 UTC depending on US daylight saving) US open,
  where every user of that market opens the app in the same 60 seconds.

### Verify gate
- [ ] Two instances behind nginx; kill one, app keeps working, for both markets
- [ ] WebSocket pushes reach clients on **both** instances (relay working), for a symbol from
      each market
- [ ] Grafana shows the six metrics above, with market as a dashboard dimension
- [ ] A correlation ID traces one pipeline run end-to-end through the logs, and it's clear
      which market that run was for
- [ ] Load test at your target concurrency with p95 documented for **both** spike windows

---

## Concept coverage map

| Your concept | Primary week | Where it lives in the product |
|---|---|---|
| SQL, schema, indexing | 1, 4 | market snapshots, composite `(market, symbol)` query plans |
| Auth (JWT, refresh) | 2 | mobile login |
| Security, rate limiting | 2, 10-min in 8 | `/auth/*`, `/api/v1/*`, per-market vendor quotas |
| Multithreading, virtual threads | 3 | parallel upstream fetch across two adapters |
| Java Streams | 3, 4 | parsing + signal engine |
| Redis | 4 | read cache, rate-limit buckets, keyed per market |
| Optimization | 4, 8 | measured k6 loops against two daily spikes |
| Kafka | 5 | market data + user events, keyed by `market:symbol` |
| User events | 5 | app telemetry pipeline |
| RabbitMQ | 6 | alert dispatch, crawl/embed jobs |
| WebSocket/STOMP | 6, 8 | live confidence-score push to phone, per `{MARKET}.{SYMBOL}` topic |
| Web crawler | 7 | news ingestion for both markets |
| Vector DB | 7 | pgvector news chunks |
| RAG | 7 | grounded AI explanation |
| Agents | 7 | `/ai/ask` tool loop, market-scoped |
| Load balancers | 8 | nginx + broker relay |

---

## If you fall behind (you probably will)

Realistic triage, in the order I'd cut — **dropping a market is not on this list.** The
`(market, symbol)` skeleton (schema, adapters, keys, scheduler) costs almost the same whether
each market tracks two symbols or six; it's *breadth within a market* you trim, not the market
itself, because the two-market design is most of the actual distributed-systems lesson this
plan is built around.

1. **Drop week 7's agent**, keep RAG. Agents are the most impressive and the least essential.
2. **Drop extended-hours coverage.** Ingest and alert only on each market's regular session
   (09:15–15:30 IST, 09:30–16:00 ET) — skip India's call-auction pre-open detail and skip US
   pre-market/after-hours. Both markets stay live; you just stop chasing the thin edges.
3. **Narrow symbol coverage per market** instead of dropping one: India down to `NIFTY` +
   `BANKNIFTY`, US down to `SPX` + `SPY`. Still two markets, less breadth.
4. **Drop Grafana**, keep Actuator + logs. You still get observability, with less setup.
5. **Never drop:** the signal engine tests (week 4) and idempotency (week 5). Those two
   prevent silent wrongness, which is the only category of bug that really hurts here.

**Do not** compress week 1 to "go faster". A weak schema costs you every subsequent week, and
a schema that doesn't model `market` from the start costs you a painful migration on top of
that.

---

## A note on the numbers this system produces

You're building analytics that people may act on with money, in two different regulatory
jurisdictions (SEBI for India, SEC/FINRA for the US). Two habits worth forming now:

- **Never fabricate.** If a source is stale or missing, the API should say so — a `null` with
  a reason beats an interpolated number that looks fine. This applies equally whether the
  stale source is an India broker feed or a US data vendor.
- **Confidence ≠ probability.** Your confidence score measures how much your inputs agree. It
  is not the chance the market goes up, and the API/UI wording should never imply it is — for
  either market's scores.
