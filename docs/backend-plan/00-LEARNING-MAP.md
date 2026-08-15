# 00 · Learning Map — Why Each Concept Is Here

You listed the concepts you want to learn. This document maps each one to a **real need in
PreMarketIQ**, so you're never doing a toy exercise. It also says plainly where a concept is
a stretch, because knowing which parts are "because I want to learn it" versus "because the
system needs it" is itself a senior skill.

---

## Prerequisite before Week 1 (blocks everything)

**Sort both market data sources.** Open a broker/data API account for **each** market, get
keys, and `curl` a real option chain by hand from each. Save the responses as fixture files.

- **India (NSE/BSE):** Kite (Zerodha), Fyers, Upstox, or Dhan.
- **United States (NYSE/NASDAQ):** Tradier, Alpaca, or Polygon.io. Confirm whether you're
  getting real-time or 15-minute-delayed data — US real-time SIP data is a separately licensed
  product, unlike most Indian broker APIs where real-time is bundled for the broker's own
  customers.

The most common way this project dies is discovering in week 5 that a feed doesn't provide
what the signal engine assumed. With two vendors instead of one, that risk doubles — half a
day now saves a fortnight later.

Also: respect each vendor's terms and rate limits, in both jurisdictions. Broker/vendor APIs
are the clean path; scraping exchange endpoints in production is fragile and ToS-grey
everywhere, and in the US it also runs into exchange data-distribution licensing (see
`06-SECURITY-AUTH.md`).

---

## Why "two markets" belongs in the concept list, not just the product spec

Adding a second market isn't just "more data." It's a forcing function for good design:

- It turns `symbol` alone into an **ambiguous key** the moment two markets could plausibly
  reuse a ticker — you're forced to key everything by `(market, symbol)` from week 1: DB
  constraints, cache keys, Kafka partitioning keys, STOMP topics, the auth-layer symbol
  whitelist. Retrofitting a composite key onto a single-market schema in week 6 is a much
  worse day than designing it in week 1.
- It forces **two independent schedules, two independent trading calendars, two independent
  circuit breakers** — real distributed-systems texture you don't get from one market, and
  the honest reason weeks 3 and 8 both call it out explicitly.
- It's a **bulkhead exercise for free**: an outage in the US vendor must not degrade India
  confidence scores, and vice versa. That's Resilience4j's bulkhead pattern with a genuine reason to
  exist, not a contrived one.

---

## Concept → justification

| Concept | Why this product genuinely needs it | Honest verdict |
|---|---|---|
| **SQL / schema / indexing** | Millions of option-chain rows across two markets; queries must be indexed on `(market, symbol, …)` or the API dies | Core |
| **Auth (JWT + refresh)** | Mobile app needs stateless login; refresh tokens fix v0.1's gap | Core |
| **Security / rate limiting** | Public API, financial data, two upstream vendor quotas to protect | Core |
| **Multithreading / virtual threads** | 4+ independent upstream calls per market per cycle, all I/O-bound — now ×2 markets | Core — a natural fit, and a bigger one with two markets |
| **Java Streams** | Chain parsing, grouping by strike, signal aggregation | Core |
| **Redis** | 09:15 IST *and* 09:30 ET read spikes on data that changes every few minutes | Core |
| **Optimization** | Everyone opens the app in the same 60 seconds — **twice a day**, once per market's open | Core |
| **Kafka** | Market snapshots are an ordered, replayable stream per market; you'll want to re-run the engine over history for either | Core, and the right tool |
| **User events** | App telemetry → analytics; also your event-modelling sandbox | Useful, mildly stretched |
| **RabbitMQ** | Alert dispatch and crawl jobs are *tasks* (do once, retry, DLQ) — genuinely not a log | Core, and the contrast with Kafka is the lesson |
| **WebSocket / STOMP** | Live confidence-score push to the phone, one topic per `(market, symbol)` | Core |
| **Web crawler** | News sentiment needs article text, from sources covering both markets | Core, with real legal/ethical constraints |
| **Vector DB** | Semantic retrieval over news for grounded explanations | Core to the AI feature |
| **RAG** | Stops the LLM inventing market claims — grounds them in retrieved sources | Core, and a safety requirement here |
| **Agents** | "Why is BANKNIFTY bearish?" or "why is SPX cautious into the open?" spanning several data sources | **Stretch.** Impressive, least essential. First to cut. |
| **Load balancers** | Two instances + WebSocket = a real distributed problem to solve | Core for the learning; premature for actual traffic |

**Two honest notes:**

- **Load balancing is over-engineering for your traffic** — one instance would serve you fine
  for a long time. It's in the plan because the multi-instance WebSocket problem is one of the
  best distributed-systems lessons available, and you can only learn it by hitting it.
- **Agents are the most likely thing to eat a week and ship nothing.** Timeboxed to Fri +
  weekend of week 7 deliberately. Two markets are *not* on this "most likely to cut" list —
  the dual-market skeleton is cheap once the schema and adapter interface are right; it's the
  breadth of *symbols per market* you trim if you're behind, not the markets themselves. See
  the triage section in `01-WEEK-BY-WEEK.md`.

> You wrote "aql" — I've read that as **SQL**, covered deeply in weeks 1 and 4. If you actually
> meant ArangoDB's AQL, say so and I'll swap the data-model week; but Postgres + pgvector gives
> you relational *and* vector in one system, which is a better fit here.

---

## What you'll be able to say afterwards

Not "I used Kafka" but the things interviews and real design reviews actually probe:

- Why an event log and a work queue are different tools, with an example of each from a system
  you built
- What happens to your consumer when a message is redelivered, and how you made that safe
- How you found a performance bottleneck — the measurement, not the guess
- Why your WebSocket broke when you added a second instance, and the two ways to fix it
- Why retrieval quality dominates prompt quality in RAG
- Where an LLM in your system can be wrong, and what you did so it can't be *silently* wrong
- Why you modelled `market` as a composite key from day one, and what it would have cost you
  to bolt it on after week 5

---

## Tech stack (fixed for the 8 weeks)

| Layer | Choice | Note |
|---|---|---|
| Language | **Java 21** | virtual threads, records, pattern matching |
| Framework | Spring Boot 3.3 | |
| DB | PostgreSQL 16 + **pgvector** | relational + vector in one system |
| Migrations | Flyway | never `ddl-auto=update` |
| Cache | Redis 7 | cache + rate-limit buckets, keyed per market |
| Event log | Kafka (KRaft) | no ZooKeeper |
| Work queue | RabbitMQ | also the STOMP relay in week 8 |
| Realtime | Spring WebSocket + STOMP | contract already fixed by the mobile app |
| AI | any LLM + embedding API | set a hard monthly spend cap on day one |
| Crawler | Jsoup | robots.txt honoured, sources for both markets |
| Tests | JUnit 5 + Testcontainers | real Postgres, not H2 |
| Observability | Actuator + Micrometer + Prometheus + Grafana | week 8 |
| Load test | k6 | weeks 4 and 8, both daily spikes |
| Runtime | Docker Compose → nginx + 2 instances | week 8 |

Deliberately **not** included: Kubernetes, service mesh, microservices, OpenSearch. A modular
monolith teaches more per hour at this stage and is far easier to operate solo. Splitting
services is a decision you make when a module actually needs independent scaling — and by
week 8 you'll be able to argue that case properly.
