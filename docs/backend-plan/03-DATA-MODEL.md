# 03 · Data Model

PostgreSQL 16 + **pgvector**. Flyway migrations only — never `ddl-auto=update`.

Conventions: `snake_case`; UTC `timestamptz` everywhere (convert to the market's local time
only at the API edge — `Asia/Kolkata` for `IN`, `America/New_York` for `US`); money/prices as
`numeric`, never `float`; every market-scoped table carries a `market TEXT NOT NULL CHECK
(market IN ('IN','US'))` column, leading every composite key and index.

---

## Why `market` is a column, not two schemas

Two markets could be modelled as two parallel table sets (`market_indices_in`,
`market_indices_us`, …) or as one table set with `market` as a discriminator column. This
plan uses the discriminator, deliberately:

- The signal engine, caching layer, and API DTOs are **market-agnostic** — they operate on
  "a snapshot for `(market, symbol)`," and a single table set means one code path, not two
  parallel ones that will drift.
- Kafka partitioning, Redis keys and STOMP topics already need a `market` component in the
  key; having it as a real column means the same value flows through the whole system instead
  of being encoded only in a topic/table name.
- A third market later (say, a European or Japanese exchange) is a new row value plus a new
  `MarketDataAdapter`, not a new set of tables and a copy-pasted repository layer.

The cost is that **every** natural key and lookup index must lead with `market` — forgetting
it once (a `WHERE symbol = ?` with no `market` clause, or a `UNIQUE(symbol, expiry)` instead
of `UNIQUE(market, symbol, expiry)`) silently mixes India and US rows. Treat that as the one
rule that must never slip in week 1.

---

## Migration order

```
V1__core_market.sql       week 1
V2__auth.sql              week 2
V3__signals_alerts.sql    week 4-6
V4__events.sql            week 5
V5__vector_rag.sql        week 7   (CREATE EXTENSION vector;)
```

---

## Week 1 · Core market

```sql
CREATE TABLE market_indices (
  id          BIGSERIAL PRIMARY KEY,
  market      TEXT NOT NULL CHECK (market IN ('IN','US')),
  symbol      TEXT NOT NULL,
  currency    TEXT NOT NULL,           -- 'INR' | 'USD' — derivable from market, stored for cheap reads
  spot        NUMERIC(14,4) NOT NULL,
  prev_close  NUMERIC(14,4),
  captured_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_indices_market_symbol_time ON market_indices (market, symbol, captured_at DESC);

CREATE TABLE option_chain (
  id          BIGSERIAL PRIMARY KEY,
  market      TEXT NOT NULL CHECK (market IN ('IN','US')),
  symbol      TEXT NOT NULL,
  expiry      DATE NOT NULL,
  strike      NUMERIC(14,4) NOT NULL,
  call_oi BIGINT, call_chg_oi BIGINT, call_iv NUMERIC(6,2),
  call_ltp NUMERIC(14,4), call_volume BIGINT,
  put_oi  BIGINT, put_chg_oi  BIGINT, put_iv  NUMERIC(6,2),
  put_ltp  NUMERIC(14,4), put_volume  BIGINT,
  captured_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- natural key: makes consumer redelivery idempotent (week 5); market leads it
  CONSTRAINT uq_chain UNIQUE (market, symbol, expiry, strike, captured_at)
);
CREATE INDEX idx_chain_lookup ON option_chain (market, symbol, expiry, captured_at DESC);

CREATE TABLE futures_data (
  id BIGSERIAL PRIMARY KEY,
  market TEXT NOT NULL CHECK (market IN ('IN','US')),
  symbol TEXT NOT NULL, expiry DATE NOT NULL,
  fut_price NUMERIC(14,4) NOT NULL, spot_price NUMERIC(14,4),
  basis NUMERIC(14,4), oi BIGINT, chg_oi BIGINT, volume BIGINT,
  buildup TEXT CHECK (buildup IN
    ('long_buildup','short_buildup','short_covering','long_unwinding')),
  captured_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_futures UNIQUE (market, symbol, expiry, captured_at)
);
CREATE INDEX idx_futures_lookup ON futures_data (market, symbol, captured_at DESC);

-- Institutional flow, generalized across markets: India publishes daily FII/DII net
-- flow (NSE); the US doesn't have a direct equivalent, so we track the closest
-- comparable institutional-positioning signal per market via `source_type`.
CREATE TABLE institutional_flow (
  id BIGSERIAL PRIMARY KEY,
  market      TEXT NOT NULL CHECK (market IN ('IN','US')),
  source_type TEXT NOT NULL CHECK (source_type IN ('FII_DII', 'COT')),
  -- IN / FII_DII: as-of a trading day. US / COT: as-of the CFTC report date (weekly, Fridays).
  as_of_date  DATE NOT NULL,
  segment     TEXT NOT NULL,      -- IN: 'equity' | 'derivatives'. US: CFTC contract name, e.g. 'E-MINI S&P 500'.
  net_value   NUMERIC(18,2),      -- IN: net INR (crore or absolute, pick one and document it).
                                   -- US: net contracts (COT reports positions, not currency).
  metadata    JSONB,              -- long/short breakdown, category (institutional/leveraged/retail) etc.
  UNIQUE (market, source_type, as_of_date, segment)
);
CREATE INDEX idx_flow_market_date ON institutional_flow (market, as_of_date DESC);
```

> Those `UNIQUE` natural keys look like week-1 detail but they're what makes week 5's
> at-least-once Kafka consumers safe. Add them now, with `market` leading every one of them.

> **Why `institutional_flow` instead of two separate tables:** FII/DII and COT measure
> different things (India: net rupee flow by institution type; US: net futures contracts by
> trader category) and update on different cadences (daily vs weekly). They're not the same
> metric wearing different units — they're the closest available proxy for "what are large
> players doing" in each market. One table with a `source_type` discriminator and a `metadata`
> JSONB for the fields that don't line up keeps the ingestion and signal-engine code paths
> unified, at the cost of the consuming code having to branch on `source_type` when it needs
> the market-specific detail. That trade-off is worth making explicitly, not by accident.

---

## Week 2 · Auth

```sql
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'ROLE_USER',
  enabled       BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Store a HASH of the refresh token: a DB leak must not become a session leak.
CREATE TABLE refresh_tokens (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  TEXT NOT NULL UNIQUE,
  expires_at  TIMESTAMPTZ NOT NULL,
  revoked_at  TIMESTAMPTZ,
  replaced_by UUID REFERENCES refresh_tokens(id),   -- rotation chain
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_refresh_user ON refresh_tokens (user_id) WHERE revoked_at IS NULL;

CREATE TABLE devices (
  id         BIGSERIAL PRIMARY KEY,
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token      TEXT NOT NULL UNIQUE,     -- unique by TOKEN, not by user
  platform   TEXT NOT NULL,
  last_seen  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE watchlists (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  market  TEXT NOT NULL CHECK (market IN ('IN','US')),
  symbol  TEXT NOT NULL,
  UNIQUE (user_id, market, symbol)
);
```

---

## Weeks 4–6 · Signals & alerts

```sql
CREATE TABLE market_sentiment (
  id BIGSERIAL PRIMARY KEY,
  market TEXT NOT NULL CHECK (market IN ('IN','US')),
  symbol TEXT NOT NULL,
  signal TEXT NOT NULL CHECK (signal IN ('BULLISH','BEARISH','NEUTRAL')),
  confidence INT NOT NULL CHECK (confidence BETWEEN 0 AND 100),
  bull_score INT, bear_score INT, risk_score INT,
  pcr NUMERIC(8,3), iv_score NUMERIC(8,3), vol_score INT, gap_up_prob INT,
  max_pain NUMERIC(14,4), basis NUMERIC(14,4),
  range_low NUMERIC(14,4), range_high NUMERIC(14,4),
  ai_explanation TEXT,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_sentiment_market_symbol_time ON market_sentiment (market, symbol, computed_at DESC);

CREATE TABLE alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  market TEXT NOT NULL CHECK (market IN ('IN','US')),
  type TEXT NOT NULL, symbol TEXT NOT NULL, message TEXT NOT NULL,
  read_at TIMESTAMPTZ, dispatched_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_alerts_user ON alerts (user_id, created_at DESC);
```

**Backtesting your own signals:** `market_sentiment` stores what you predicted and when. Join
it against the next session's actual open — India's next 09:15 IST print, or the US's next
09:30 ET print — and you can honestly measure whether the engine has any edge, per market. Do
this before ever claiming it does. Don't pool both markets' hit rates into one number; a
signal that works on NIFTY and not on SPX (or vice versa) is a real, useful finding that a
combined average would hide.

---

## Week 5 · Events

```sql
CREATE TABLE user_events (
  id          BIGSERIAL PRIMARY KEY,
  user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
  event_name  TEXT NOT NULL,
  props       JSONB,
  occurred_at TIMESTAMPTZ NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_events_name_time ON user_events (event_name, occurred_at DESC);
CREATE INDEX idx_events_props ON user_events USING GIN (props);

-- Idempotency ledger for at-least-once consumers
CREATE TABLE processed_events (
  event_id    TEXT PRIMARY KEY,
  topic       TEXT NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

`props` may carry `{"market": "IN", "symbol": "NIFTY"}` for market-scoped events (e.g.
`alert_opened`) — keep it inside the JSONB rather than adding dedicated columns, since not
every event is market-scoped and this table is intentionally schema-loose.

**Privacy:** no emails, tokens, or holdings in `props`. Telemetry on a trading app is sensitive.

---

## Week 7 · Vector / RAG

```sql
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE raw_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  url TEXT NOT NULL,
  url_hash TEXT NOT NULL UNIQUE,        -- crawl dedupe
  content_hash TEXT NOT NULL,           -- change detection
  source TEXT, title TEXT,
  raw_html TEXT, extracted_text TEXT,
  published_at TIMESTAMPTZ,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE document_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES raw_documents(id) ON DELETE CASCADE,
  chunk_index INT NOT NULL,
  chunk_text  TEXT NOT NULL,
  embedding   VECTOR(1536),
  -- metadata.market: 'IN' | 'US' | null (null = macro/cross-market, e.g. Fed policy, oil prices)
  metadata    JSONB,
  UNIQUE (document_id, chunk_index)
);

-- ANN index. Build AFTER bulk loading; it is expensive to maintain during inserts.
CREATE INDEX idx_chunks_embedding ON document_chunks
  USING hnsw (embedding vector_cosine_ops);

-- Hybrid search needs lexical too — pure vector is bad at exact tickers/numbers.
ALTER TABLE document_chunks ADD COLUMN tsv tsvector
  GENERATED ALWAYS AS (to_tsvector('english', chunk_text)) STORED;
CREATE INDEX idx_chunks_tsv ON document_chunks USING GIN (tsv);

-- Filter retrieval by market before ranking, not after: (metadata->>'market' IS NULL
-- OR metadata->>'market' = :market) keeps India questions from surfacing NIFTY-only
-- chunks were the question about SPX, while still allowing macro chunks through both.
CREATE INDEX idx_chunks_metadata_market ON document_chunks ((metadata->>'market'));

CREATE TABLE news (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES raw_documents(id) ON DELETE CASCADE,
  market TEXT CHECK (market IN ('IN','US')),   -- nullable: macro news isn't market-exclusive
  headline TEXT NOT NULL, source TEXT,
  sentiment NUMERIC(4,2) CHECK (sentiment BETWEEN -1 AND 1),
  classification TEXT, tag TEXT,
  published_at TIMESTAMPTZ
);
CREATE INDEX idx_news_market_time ON news (market, published_at DESC);
```

---

## Retention (add in week 8)

Snapshot tables grow fast — a full chain every few minutes, for two markets, is millions of
rows per month.

- Downsample `option_chain` / `futures_data` older than 7 days to one snapshot per hour, per
  market — don't downsample across markets together, or you'll average an India strike ladder
  against a US one.
- Consider partitioning by `(market, month)` once a table passes ~50M rows — partitioning by
  market first is a natural fit here, since almost every query already filters on it.
- Never delete `market_sentiment` — it's your only honest record of what the engine predicted,
  for either market.
