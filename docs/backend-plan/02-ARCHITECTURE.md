# 02 · Architecture & How It Evolves

The architecture **changes over the 8 weeks**. That progression is deliberate: you feel why
each piece was added, instead of inheriting a diagram you don't understand.

`market` (`IN` | `US`) is a dimension present from week 1 onward — not a service split. One
schema, one Kafka cluster, one Redis, one signal engine; every table, key, topic and topic
subscription carries `(market, symbol)` together. The only place the two markets genuinely
fork is the ingestion adapter layer, because that's the only layer touching a
market-specific external API.

---

## Week 1–4 · Modular monolith

```
        ┌──────────── Spring Boot (one process) ────────────┐
 HTTP ──►  controller → service → repository → PostgreSQL   │
        │                    │                              │
        │                    └──► Redis (cache)  [wk4]      │
        │  @Scheduled(IN) ──► India adapter  ─┐   [wk3]     │
        │  @Scheduled(US) ──► US adapter     ─┴─► ingestion │
        └───────────────────────────────────────────────────┘
```

**Package by feature, not by layer.** This matters more than it sounds:

```
com.premarketiq
├── auth/          controller, service, repo, dto
├── market/         controller, service, repo, dto        (market-agnostic)
├── ingestion/
│   ├── MarketDataAdapter.java                              interface
│   ├── in/         InMarketDataAdapter, India DTO mapping
│   └── us/         UsMarketDataAdapter, US DTO mapping
├── signals/        engine (pure), rules                    (market-agnostic)
├── news/           crawler, rag
├── alerts/         rules, dispatch
└── common/         config, errors, security
```

Layer-first packaging (`controllers/`, `services/`, `repositories/`) looks tidy and hides
coupling — everything can reach everything. Feature packages make dependencies visible, and
when you later ask "could this be its own service?", the answer is already drawn on disk. The
`ingestion/in` vs `ingestion/us` split is the one place market-specific code is allowed to
diverge; everything downstream of `MarketDataAdapter` operates on the same normalized DTO
regardless of which market produced it.

---

## Week 5–6 · Event-driven

```
 India adapter          US adapter
      │  @Scheduled(Asia/Kolkata)   │  @Scheduled(America/New_York)
      ▼                             ▼
 ┌──────────┐   market.chain / market.futures / market.news, key=market:symbol
 │ Ingestion├──────────────► KAFKA ──┬──► persistence consumer ──► Postgres
 └──────────┘                        └──► signal consumer ──┐
                                                            ▼
 mobile app ──► POST /events ──► KAFKA user.events      SignalEngine
                                      │                     │
                                      ▼                     ▼
                                analytics consumer     verdict → Redis
                                                     (verdict:{market}:{symbol})
                                            ┌───────────────┼──────────────┐
                                            ▼               ▼              ▼
                                    STOMP /topic       alert rules    Postgres
                                 {MARKET}.{SYMBOL}          │
                                 (live push)                ▼
                                                       RABBITMQ (task)
                                                            │
                                                      dispatch worker ──► FCM
```

**The split to internalise:** Kafka carries *facts that happened* (a snapshot was captured, in
some market). RabbitMQ carries *work that must be done* (send this push). Facts are replayable;
work is not. Both markets' events flow through the same topics — the partition key
(`market:symbol`) is what keeps them from interleaving into a false ordering.

---

## Week 7 · AI subsystem

```
 crawl jobs (IN + US sources) ──► RABBITMQ ──► crawler workers ──► raw_documents (Postgres)
                                                      │
                                              chunk + embed (RabbitMQ jobs)
                                                      ▼
                                document_chunks + vector(1536) + market tag  [pgvector]
                                                      │
 POST /ai/ask {market, symbol, question}
      ──► Agent loop ──► retrieve (hybrid: vector + full-text, market-aware)
                      │              │
                      ├── tools ─────┴──► signal/market services, scoped to (market, symbol)
                      ▼
                    LLM ──► answer + citations
```

Note the AI subsystem **reads** from the same Postgres as everything else. Resist the urge to
give it a separate datastore; you don't have the scale to justify the sync problem you'd
create. A news chunk without a clear market tag (macro content like Fed policy) is retrievable
for either market's questions; a chunk clearly about NIFTY shouldn't surface for an SPX
question, and vice versa — enforce that with a metadata filter in the retrieval query, not by
hoping the embedding space sorts it out.

---

## Week 8 · Scaled

```
                    ┌── nginx (LB, health checks) ──┐
                    ▼                               ▼
             App instance A                  App instance B
                    │                               │
                    └──────────┬────────────────────┘
                               ▼
         shared: Postgres · Redis · Kafka · RabbitMQ (STOMP relay)
                               │
                    Prometheus ← Actuator/Micrometer → Grafana
                               (market is a dashboard dimension)
```

**The lesson lives here:** with an in-memory simple broker, a client on instance A never sees
a message published on B. Two fixes — sticky sessions (a bandaid that fails on failover) or an
external broker relay (RabbitMQ), which makes both instances share one broker. Hit the problem
first, then fix it. Reading about it teaches you far less. This is orthogonal to the two-market
design — it would be true with one market or five.

---

## Statelessness rules (what makes scaling possible at all)

The app instances must hold **no** user state:

| State | Where it lives | Why |
|---|---|---|
| Session | JWT (client-held) | any instance can serve any request |
| Cache | Redis | shared, not per-instance, keyed per `(market, symbol)` |
| Rate-limit counters | Redis | otherwise limits multiply by instance count |
| WebSocket routing | RabbitMQ relay | otherwise pushes are instance-local |
| Scheduled jobs | **single leader, per market** | see below |

**Scheduler caution:** with two instances, `@Scheduled` runs *twice* for **each** market's job
— double the upstream calls, double the alerts, for both India and US independently. Fix with
ShedLock (a DB/Redis lock, one lock name per market job — `ingest-IN`, `ingest-US`) or run the
scheduler as a separate single-instance profile. This bug is easy to ship and hard to notice,
so decide in week 8 before you scale out.

---

## Request path (target, week 8)

```
client → nginx → controller
                    ├─ Redis hit  → return (~5ms)
                    └─ Redis miss → Postgres → cache → return (~40ms)
```

The read path **never** calls an upstream vendor, for either market. Only the scheduler does.
This is the single most important architectural rule in the system: it decouples your user
traffic from your vendor rate limits, so a traffic spike in one market can't break ingestion
for that market — or the other one.

---

## When to actually split into services

Not on a schedule — on a trigger:

| Split out | When |
|---|---|
| Ingestion | it needs to scale or deploy independently of the API — e.g. the US and India adapters end up on genuinely different deploy cadences |
| AI/RAG | its resource profile (memory, GPU, latency) diverges |
| Alert dispatch | dispatch volume needs independent scaling |

If none of these are true, a monolith with clean module boundaries is the better system —
and it stays the better system for far longer than most people expect. Two markets inside one
monolith, with a clean `MarketDataAdapter` seam, is not itself a reason to split; a third
market arriving later would still slot into the same seam.
