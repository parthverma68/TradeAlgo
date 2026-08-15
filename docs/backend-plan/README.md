# PreMarketIQ · Backend

Spring Boot (Java 21) backend for the PreMarketIQ pre-market intelligence platform —
built as an **8-week learn-by-building programme** covering real distributed-systems concepts
in a system that genuinely needs them.

Serves the bare React Native app already built against a fixed API contract, for **two
markets from day one**: India (NSE/BSE — NIFTY, BANKNIFTY, FINNIFTY) and the US
(NYSE/NASDAQ/CBOE — SPX, NDX, SPY, QQQ). Dual-market isn't a stretch goal bolted on in
week 7 — it's a schema and adapter decision made in week 1, because retrofitting a
second market onto a single-market schema is far more expensive than designing the
`market` dimension in up front.

> **Analytics, not advice.** This system produces signals people may act on with money.
> Two habits to form now: never fabricate a number (a `null` with a reason beats an
> interpolated value), and remember confidence ≠ probability — it measures how much your
> inputs agree, not what the market will do.

---

## Start here

**→ [`01-WEEK-BY-WEEK.md`](01-WEEK-BY-WEEK.md)** — the 8-week plan. Themes, concepts,
deliverables, and a verify gate per week.

**→ [`00-LEARNING-MAP.md`](00-LEARNING-MAP.md)** — why each concept is here, and
which ones are stretch goals. Read this before week 1; it also contains the one prerequisite
that blocks everything.

---

## Two markets, one system

| | India (`IN`) | United States (`US`) |
|---|---|---|
| Exchanges | NSE, BSE | NYSE, NASDAQ, CBOE (for VIX/PCR reference) |
| Index symbols | `NIFTY`, `BANKNIFTY`, `FINNIFTY`, `SENSEX` | `SPX`, `NDX` (index), `SPY`, `QQQ` (liquid ETF proxy) |
| Currency | INR (₹) | USD ($) |
| Exchange timezone | `Asia/Kolkata` (IST, UTC+5:30, no DST) | `America/New_York` (ET, UTC-5/-4, DST twice a year) |
| Regular session | 09:15–15:30 IST | 09:30–16:00 ET |
| Pre-open / pre-market | 09:00–09:08 IST (call auction) | 04:00–09:30 ET (thin, quote-only for most vendors) |
| Institutional flow signal | FII/DII daily net (NSE-published) | CFTC Commitment of Traders (weekly, futures positioning) |
| Regulator / data terms | SEBI; broker APIs generally bundle real-time data for their own customers | SEC/FINRA; **real-time SIP data is separately licensed** — most free/hobby tiers are 15-min delayed |
| Broker/data APIs to evaluate | Kite (Zerodha), Upstox, Fyers, Dhan | Tradier, Alpaca, Polygon.io, IBKR |
| Holiday calendar | NSE trading holidays | NYSE/NASDAQ trading holidays |

The system stores everything in UTC and treats `market` as a first-class column
(`IN` / `US`) alongside `symbol` everywhere a symbol appears — DB keys, cache keys, Kafka
keys, STOMP topics, the symbol whitelist. See `03-DATA-MODEL.md` for the composite-key
rationale.

---

## The 8 weeks at a glance

| Week | Theme | Concepts | You end with |
|---|---|---|---|
| 1 | Foundations & SQL | Spring Boot, JPA, Flyway, indexing, Testcontainers | Contract-shaped API on a real, market-aware schema |
| 2 | Auth & Security | JWT + refresh rotation, BCrypt, rate limiting, OWASP | **Mobile app logs into your backend** |
| 3 | Ingestion & Concurrency | Virtual threads, `CompletableFuture`, Streams, Resilience4j, dual adapters | Real IN + US market data flowing in, in parallel |
| 4 | Engine, Redis & Optimization | Caching patterns, stampede, indexing, k6 | **App fully live on real data, both markets** |
| 5 | Kafka & User Events | Topics, partitions, consumer groups, idempotency, DLQ | Event-driven pipeline keyed by `(market, symbol)` |
| 6 | RabbitMQ & Realtime | Work queues, DLX, STOMP, FCM | **Alert on your phone; live dashboard, both markets** |
| 7 | Crawler, Vector, RAG, Agents | pgvector, hybrid search, grounding, tool loops | Cited AI explanations + `/ai/ask`, market-scoped |
| 8 | Scale & Operate | nginx, broker relay, ShedLock, Prometheus | Two instances, two market schedules, killing one is invisible |

---

## Concept coverage

Everything on your list, mapped to where it does real work:

| Concept | Week | In this system |
|---|---|---|
| SQL, indexing, query plans | 1, 4 | market snapshots at scale, composite `(market, symbol)` indexes |
| Auth (JWT + refresh) | 2 | mobile login, revocable sessions |
| Security, rate limiting | 2, 8 | public API + two independent vendor quotas to protect |
| Multithreading, virtual threads | 3 | parallel upstream fetch across *two* markets' adapters |
| Java Streams | 3, 4 | chain parsing, signal aggregation |
| Redis | 4 | read cache + rate-limit buckets, keyed per market |
| Optimization | 4, 8 | measured k6 loops against **two** daily spikes |
| Kafka | 5 | replayable market + user event streams, keyed by `market:symbol` |
| User events | 5 | app telemetry → analytics |
| RabbitMQ | 6 | alert dispatch, crawl & embed jobs |
| WebSocket / STOMP | 6, 8 | live verdict push per `{MARKET}.{SYMBOL}` topic |
| Web crawler | 7 | news ingestion for both markets (robots.txt, SSRF guards) |
| Vector DB | 7 | pgvector + HNSW |
| RAG | 7 | grounded, cited explanations |
| Agents | 7 | tool-calling loop with guardrails |
| Load balancers | 8 | nginx + the multi-instance WebSocket problem |

---

## Documentation

| Doc | Read when |
|---|---|
| [00 · Learning Map](00-LEARNING-MAP.md) | Before week 1 — why each concept, what's stretch |
| [01 · Week by Week](01-WEEK-BY-WEEK.md) | **The plan** |
| [02 · Architecture](02-ARCHITECTURE.md) | How the design evolves across the 8 weeks |
| [03 · Data Model](03-DATA-MODEL.md) | Full schema with migration order, market as a first-class dimension |
| [04 · Messaging](04-MESSAGING.md) | Kafka vs RabbitMQ, topologies, breakage exercises |
| [05 · Crawler, RAG & Agents](05-AI-RAG-AGENTS.md) | Week 7 in depth, with honest limits |
| [06 · Auth & Security](06-SECURITY-AUTH.md) | Token design, OWASP, SSRF |
| [07 · Performance & Concurrency](07-PERFORMANCE-CONCURRENCY.md) | Threads, caching, measuring, scaling, two spikes a day |
| [08 · Task Board](08-TASK-BOARD.md) | Tickable checklist |

Pair with the mobile repo's **`docs/00-INTEGRATION-RUNBOOK.md`** — it specifies exactly what
the app expects from each endpoint, and its phases map onto weeks 2–6 here.

---

## Three things I'd push back on, said plainly

1. **This is an aggressive 8 weeks for two markets.** The plan has a triage section — if you
   fall behind, drop the agent first, then extended/pre-market hours, then narrow symbol
   coverage per market. Never drop a market outright and never compress week 1; a weak schema
   taxes every week after it, and retrofitting `market` later is much more expensive than
   modelling it now.

2. **Load balancing is over-engineering for your traffic.** One instance would serve you fine
   for a long time. It's in the plan because the multi-instance WebSocket failure is one of the
   best distributed-systems lessons available and you can only learn it by hitting it — not
   because you need the capacity.

3. **Running Kafka *and* RabbitMQ is unusual, and here it's justified.** Market snapshots are
   replayable facts (a log); push notifications are do-once tasks (a queue). Feeling that
   difference in the same codebase is worth more than reading ten comparison articles — and
   with two markets producing snapshots on two independent clocks, the replay story matters
   even more.

---

## The prerequisite that blocks everything

Before week 1: **get both market data sources working.** Open a broker/data API account for
each market, get keys, and `curl` a real option chain by hand from each. Save the responses as
fixtures.

- **India:** Kite (Zerodha), Upstox, Fyers, or Dhan. Real-time data is normally bundled with
  the broker account.
- **US:** Tradier, Alpaca, or Polygon.io. Check whether the tier gives real-time or 15-minute
  delayed SIP data — a hobby-tier US feed delayed by 15 minutes is fine for this project, but
  it changes what "pre-market spike" means for that market, so know which you have.

The most common way this project dies is discovering in week 5 that a feed doesn't provide
what the signal engine assumed — and with two vendors, that risk doubles. Half a day now saves
a fortnight later.

---

## Stack

Java 21 · Spring Boot 3.3 · PostgreSQL 16 + pgvector · Redis 7 · Kafka (KRaft) · RabbitMQ ·
Flyway · Testcontainers · Resilience4j · Micrometer/Prometheus/Grafana · Jsoup · k6 · nginx

Deliberately **not**: Kubernetes, microservices, service mesh, OpenSearch. A modular monolith
teaches more per hour and is far easier to operate solo. Splitting services is a decision you
make when a module needs independent scaling — and by week 8 you'll be able to argue that case
properly. Two markets is a reason to design a clean `MarketDataAdapter` boundary, not a reason
to split into two services.
