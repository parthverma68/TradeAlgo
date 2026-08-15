# 08 · Task Board

Flat, tickable, in build order. Copy into GitHub Issues or work top to bottom.
Each item is sized for a single sitting. Both markets (India + US) are built together in each
week, not staged one after the other — items below say so explicitly wherever it matters.

---

## Week 0 — Blockers (do before Week 1)

- [ ] India broker API account + keys (Kite/Upstox/Fyers/Dhan); `curl` a real option chain and save the JSON
- [ ] US data vendor account + keys (Tradier/Alpaca/Polygon.io); `curl` a real option chain and save the JSON
- [ ] Confirm whether the US feed is real-time or 15-min delayed — note it, you'll need it in week 6's copy
- [ ] Save fixtures for both markets: chain, futures, spot, FII/DII (India) / COT (US), global quotes
- [ ] Review both vendors' ToS and rate limits
- [ ] LLM + embedding API keys, **monthly spend cap set**
- [ ] Java 21 + Docker installed; repo created

## Week 1 — Foundations & SQL

- [ ] `docker-compose.yml`: Postgres 16 + Redis
- [ ] Spring Boot 3.3 project, Java 21, **packages by feature**
- [ ] Flyway `V1__core_market.sql` — `market` column + composite `(market, symbol, …)` UNIQUE
      constraints on every market table
- [ ] JPA entities + repositories for the market tables, all keyed by `(market, symbol)`
- [ ] DTOs matching the mobile `03-API-CONTRACT.md` exactly, including the `market`/`currency`
      fields
- [ ] Jackson config: ISO-8601, non-null
- [ ] `@RestControllerAdvice` → `{"error":{"code","message"}}`
- [ ] `GET /market/preopen` (hardcoded, contract-shaped) for one India symbol and one US symbol
- [ ] Testcontainers integration test (real Postgres)
- [ ] `EXPLAIN ANALYZE` on your three main queries for both markets; justify each index,
      confirm `market` leads it

## Week 2 — Auth & Security

- [ ] `users`, `refresh_tokens`, `devices`, `watchlists` migration (`watchlists` keyed by
      `(user_id, market, symbol)`)
- [ ] Spring Security stateless config + JWT filter
- [ ] `POST /auth/register` · `/auth/login`
- [ ] Refresh token issue / rotate / revoke
- [ ] `POST /auth/refresh`
- [ ] BCrypt(12) + password policy
- [ ] Custom `AuthenticationEntryPoint` returning your error shape
- [ ] Bucket4j + Redis rate limiting (auth + api + ai buckets)
- [ ] Bean Validation on all request bodies; `(market, symbol)` pair whitelist
- [ ] **Mobile app logs in against the real backend** (`USE_MOCK=false`)
- [ ] Security verify list from `06-SECURITY-AUTH.md`

## Week 3 — Ingestion, Threads, Streams

- [ ] `MarketDataAdapter` interface + **two** real implementations (India, US)
- [ ] `CompletableFuture` fan-out across sources, both markets' adapters running concurrently
- [ ] Virtual threads vs fixed pool vs sequential — **timings written down**
- [ ] Resilience4j: retry, circuit breaker, bulkhead, time limiter — **isolated per market**
- [ ] Stream-API parsing/normalisation
- [ ] Two `@Scheduled` ingestion jobs: `Asia/Kolkata` (India), `America/New_York` (US)
- [ ] FII/DII daily parser (India)
- [ ] COT weekly parser (US)
- [ ] Break test: dead India upstream → its breaker opens → recovers; **confirm US ingestion
      was unaffected the whole time**
- [ ] Fix one deliberate race condition

## Week 4 — Signal Engine, Redis, Optimization

- [ ] `SignalEngineService` — pure, no I/O, takes `(market, symbol)`-scoped input
- [ ] Tests: Max Pain (hand-computed), bullish, bearish, neutral fixtures — **for both markets**
- [ ] Persist verdicts to `market_sentiment`
- [ ] Redis cache-aside + TTLs, keys namespaced `{market}:{symbol}`
- [ ] Scheduler writes through (refresh-ahead), per market
- [ ] Cache stampede handling (pick and implement one)
- [ ] All remaining GET endpoints, contract-shaped, accepting `market`
- [ ] k6 baseline → optimise → re-measure for an India symbol and a US symbol; **record p95
      before/after, per market**
- [ ] Hikari pool sizing; batch inserts; N+1 hunt
- [ ] **Mobile app fully live on real data, both markets**

## Week 5 — Kafka & User Events

- [ ] Kafka (KRaft) in Compose
- [ ] Topics with partitions/retention per `04-MESSAGING.md`
- [ ] Ingestion → producer, **keyed by `market:symbol`**
- [ ] Persistence consumer group
- [ ] Signals consumer group
- [ ] Idempotent consumers (upsert on natural key, `market` leading)
- [ ] DLT + error handler
- [ ] `POST /events` → `user.events` → analytics consumer → `user_events`
- [ ] Break tests: kill consumer, poison message (confirm the other market's partition keeps
      flowing), add consumer to group

## Week 6 — RabbitMQ, WebSocket, Alerts

- [ ] RabbitMQ + management UI in Compose
- [ ] Exchanges/queues/DLX topology
- [ ] Alert rules in the signal consumer, for both markets' symbols
- [ ] Alert task → Rabbit → FCM dispatch worker (Firebase Admin SDK)
- [ ] Manual ack, prefetch, retry-with-backoff via DLX
- [ ] Dead FCM token pruning
- [ ] Per-user alert throttle/coalesce
- [ ] `POST /devices/register` · `DELETE /devices/{token}`
- [ ] `POST /alerts/{id}/ack`
- [ ] STOMP `/ws` + JWT `ChannelInterceptor` + `Principal`
- [ ] Push to `/topic/verdicts.{MARKET}.{SYMBOL}` and `/user/queue/alerts`
- [ ] **Alert lands on a real phone in all 3 app states**, tested with an India alert and a US alert
- [ ] **Mobile dashboard updates live**, watching a symbol from each market

## Week 7 — Crawler, Vector, RAG, Agents

- [ ] `robots.txt` parser + per-domain rate limiter + real User-Agent
- [ ] Seed sources for both markets (India finance RSS, US finance RSS) + macro/cross-market sources
- [ ] SSRF guard (block private/link-local IPs)
- [ ] Crawl jobs via RabbitMQ; Jsoup extraction; tag each document's `market`
- [ ] `raw_documents` with url/content hash dedupe
- [ ] `CREATE EXTENSION vector`; `document_chunks` + HNSW + tsvector + `metadata->>'market'` index
- [ ] Chunking (500/50) + embedding jobs via RabbitMQ
- [ ] Vector search endpoint, market-filtered
- [ ] Hybrid search with RRF fusion, market filter applied before fusion
- [ ] **20-pair eval set (split across both markets); recall@5 for vector vs lexical vs hybrid**
- [ ] Grounded AI explanation with citations + numeric verification
- [ ] Agent loop with 6 tools (including `getInstitutionalFlow(market)`), all market-scoped
- [ ] Guardrails: iteration cap, token budget, allowlist, `(market, symbol)` pair arg validation
- [ ] `POST /ai/ask` accepting `market` explicitly
- [ ] **Prompt-injection test with a seeded page, one India source and one US source**

## Week 8 — Scale & Operate

- [ ] nginx + two app instances + health checks
- [ ] Observe the WebSocket multi-instance failure (on purpose)
- [ ] RabbitMQ STOMP broker relay → verify pushes reach both instances, for a symbol from each market
- [ ] ShedLock with per-market job names (`ingest-IN`, `ingest-US`) so each `@Scheduled` runs once
- [ ] Verify rate limits don't double, for either market's vendor
- [ ] Actuator + Micrometer + Prometheus + Grafana dashboard (7 metrics, `market` as a tag)
- [ ] Structured JSON logging + correlation ID (carrying `market`) through Kafka headers
- [ ] Graceful shutdown
- [ ] Full k6 load test with **both** spike profiles (09:15 IST, 09:30 ET); document p95 for each
- [ ] Kill an instance under load — no user-visible failure, either market
- [ ] Retention/downsampling job, partitioned by `(market, month)`
- [ ] Secrets in env/param store for both vendor credential sets; dependency scan in CI
- [ ] Deploy

---

## Definition of done (the 8-week goal)

- [ ] Unattended before 09:15 IST: ingest → engine → cache → push → alert, for India
- [ ] Unattended before 09:30 ET: ingest → engine → cache → push → alert, for the US
- [ ] Mobile app fully live for both markets: login, dashboard, chain, futures, news, alerts
- [ ] Two instances behind nginx; killing one is invisible to users, in either market
- [ ] AI explanation grounded and cited, market-scoped; agent answers multi-step questions
      safely for an India symbol and a US symbol
- [ ] Grafana shows the system's health at a glance, broken down by market
- [ ] You can explain every architectural choice — including the ones you'd now make
      differently, and including why `market` is a column and not two services
