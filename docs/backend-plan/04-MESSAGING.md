# 04 · Messaging — Kafka *and* RabbitMQ

Running both is unusual, and normally I'd push back on it. Here it's justified, because the
system genuinely has two different kinds of message — and holding both in your head at once
is the fastest way to actually understand either. With two markets producing independent
streams on independent clocks, the log-vs-queue distinction gets *more* useful, not less.

---

## The distinction

| | **Kafka** (event log) | **RabbitMQ** (work queue) |
|---|---|---|
| Mental model | an append-only file many readers scan at their own offset | a to-do list; a worker takes a task and it's gone |
| Message after consumption | stays until retention expires | removed on ack |
| Replay | yes — reset the offset | no |
| Multiple independent readers | yes, via consumer groups | needs fanout + separate queues |
| Ordering | per partition | per queue, best-effort |
| Retry per message | awkward (blocks the partition) | native (nack/requeue, DLX) |
| Scaling | partitions | competing consumers |

**One-line test:** *would replaying this message next week be correct, or harmful?*
Replaying "NIFTY chain captured at 09:05 IST" → correct. Replaying "SPX chain captured at
09:35 ET" → also correct. Replaying "send push to Parth" → harmful, regardless of market.

---

## Kafka in this system (week 5)

### Topics

| Topic | Key | Partitions | Retention | Producer → Consumers |
|---|---|---|---|---|
| `market.chain` | `market:symbol` | 6 | 7d | ingestion (IN + US) → persistence, signals |
| `market.futures` | `market:symbol` | 6 | 7d | ingestion (IN + US) → persistence, signals |
| `market.news` | `source` | 3 | 30d | crawler → sentiment, embedding |
| `user.events` | `userId` | 3 | 30d | API → analytics |
| `*.DLT` | — | 1 | 30d | failed messages |

**Keying by `market:symbol`** (e.g. `IN:NIFTY`, `US:SPX`) — not `symbol` alone — guarantees
all events for one market+symbol land on one partition and stay ordered, and keeps an India
and a US symbol from ever hashing onto the same partition under the illusion of being the
"same" key. Kafka gives no ordering across partitions — an easy thing to assume and be wrong
about, and worse once there are two markets' worth of symbols to reason about. Partition count
is bumped from 3 to 6 on the two market-data topics for the same reason the symbol set roughly
doubled: more distinct keys benefits from more partitions for parallelism, though the honest
answer is "measure your actual throughput before tuning this further."

### Consumer groups

```
market.chain ──┬── group: persistence  → writes Postgres
               └── group: signals      → computes verdicts
```
Two groups, each with its own offset, both seeing every message **from both markets**. Two
*consumers in one group* would split the messages instead — a distinction worth deliberately
testing. A consumer doesn't need to know which market a message is for until it reads the
`market` field inside the payload; the partitioning is purely about ordering guarantees, not
about routing IN and US to different consumer code.

### Idempotency (the important part)

Spring Kafka default is **at-least-once**: a rebalance or crash re-delivers. Consumers must
tolerate that. Two workable approaches:

1. **Natural-key upsert** — `INSERT ... ON CONFLICT (market, symbol, expiry, strike,
   captured_at) DO UPDATE`. Preferred: no extra state. Note `market` leads the conflict
   target, same as the DB constraint in `03-DATA-MODEL.md`.
2. **Processed-event ledger** — record `event_id` in `processed_events`, skip if present.
   Use when the side effect isn't a DB write.

> "Exactly-once" in Kafka means exactly-once *within Kafka transactions*, not into your
> database. Once you write to Postgres or call FCM, you're back to at-least-once. Design for
> redelivery rather than trying to eliminate it.

### DLQ

`DefaultErrorHandler` + `DeadLetterPublishingRecoverer`, fixed backoff, N attempts, then the
message goes to `<topic>.DLT`. Without this, one poison message stalls a partition **forever** —
break this deliberately once so you recognise the symptom. A poison message from the US
adapter shouldn't be able to stall the partition an India message needed, which is another
reason the partition key matters: a bad `US:SPX` message and good `IN:NIFTY` messages sharing
a partition would still block each other, so keep partition count comfortably above the
number of hot symbols you actually track.

---

## RabbitMQ in this system (week 6)

### Topology

```
exchange: alerts.exchange (topic)
  ├── alert.push    → queue: alerts.push.q     → FCM dispatch worker
  └── alert.email   → queue: alerts.email.q    → email worker

exchange: crawl.exchange (direct)
  └── crawl.fetch   → queue: crawl.fetch.q     → crawler workers (N)

exchange: embed.exchange (direct)
  └── embed.chunk   → queue: embed.chunk.q     → embedding workers

exchange: dlx (dead letter) → queue: dlq
```

Alert, crawl and embed tasks all carry `market` in the message body where relevant (alerts and
crawl-source metadata do; embed jobs mostly don't care). There's deliberately **no separate
per-market exchange** — a worker pool that's agnostic to which market a task came from scales
better than two parallel worker pools, and nothing about dispatching a push notification or
embedding a chunk actually differs by market.

### Settings that matter

| Setting | Value | Why |
|---|---|---|
| `acknowledge-mode` | `manual` | ack only after the work actually succeeded |
| `prefetch` | 1 for slow workers | otherwise one worker hoards the queue |
| `x-dead-letter-exchange` | `dlx` | failures go somewhere inspectable |
| `x-message-ttl` | per queue | a stale India alert shouldn't fire at 14:00 IST post-close, and a stale US alert shouldn't fire at 17:00 ET post-close |
| durable + persistent | true | survive a broker restart |

**Retry pattern:** on failure, `nack` without requeue → message goes to DLX → a delay queue
with TTL routes it back after a backoff → increment a retry-count header → after N attempts,
park it in the DLQ permanently. Straight requeue-on-failure creates an infinite hot loop; do
that once on purpose and watch the CPU graph.

### Idempotency here too

FCM dispatch must be idempotent — a redelivered task shouldn't double-notify, whether the
alert originated from an India or a US signal. Guard with `alerts.dispatched_at`: skip if
already set.

---

## Week 8 bonus: RabbitMQ as your STOMP broker

Your week-6 RabbitMQ solves your week-8 scaling problem. Enable the `rabbitmq_stomp` plugin and:

```java
registry.enableStompBrokerRelay("/topic", "/queue")
        .setRelayHost("rabbitmq").setRelayPort(61613);
```

Both app instances now publish into one shared broker, so a client connected to instance A
receives messages published by B — for `/topic/verdicts.IN.NIFTY` just as much as
`/topic/verdicts.US.SPX`. That's the fix for the multi-instance WebSocket problem — and it's
much more satisfying after you've hit the problem yourself.

---

## Deliberate breakage exercises

Do each of these — they teach more than the happy path:

1. Kill a Kafka consumer mid-batch, restart it. Duplicates? Losses? Do both markets recover
   the same way?
2. Publish a malformed message for one market. Does it reach the DLT, or stall the partition —
   and does the other market's traffic on a different partition keep flowing while it's stuck?
3. Stop RabbitMQ while alerts are queued for both markets. Restart. Did durable messages
   survive, for both?
4. Make the FCM worker throw every time. Watch the retry/DLQ path.
5. Add a second consumer to the same Kafka group. Watch the partition rebalance across the
   now-larger keyspace (two markets' worth of symbols).
6. Set `prefetch=100` on a slow worker and observe the queue distribution go wrong.
