# 06 · Auth & Security (Week 2, revisited Week 8)

Your mobile app already expects a specific auth contract. This builds it properly — including
the refresh-token flow the app's v0.1 is missing. Auth itself doesn't fork by market (a user
account isn't India-only or US-only — the same login sees both markets), but two of the
security surfaces below are directly shaped by running two markets: the symbol whitelist and
the regulatory/licensing constraints on the data itself.

---

## Token design

| Token | Lifetime | Stored where | Purpose |
|---|---|---|---|
| Access (JWT) | 15 min | client memory / Keychain | sent on every request |
| Refresh (opaque) | 30 days | DB (**hashed**) + client Keychain | mints new access tokens |

**Why short access + long refresh:** a JWT can't be revoked before it expires, so keep its
window small. Revocation lives on the refresh token, which you *can* delete server-side.

**Why the refresh token is hashed in the DB:** a database leak then isn't a session leak. Same
reasoning as password hashing — treat it as a credential, because it is one.

**Rotation:** every refresh use issues a new refresh token and revokes the old one, chained via
`replaced_by`. If a revoked token is presented, that's a strong signal of theft — revoke the
whole chain and force re-login.

---

## Spring Security setup

```java
http
  .csrf(csrf -> csrf.disable())                 // stateless API, no cookies
  .sessionManagement(s -> s.sessionCreationPolicy(STATELESS))
  .authorizeHttpRequests(a -> a
      .requestMatchers("/api/v1/auth/**", "/actuator/health").permitAll()
      .requestMatchers("/actuator/**").hasRole("ADMIN")
      .anyRequest().authenticated())
  .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class)
  .exceptionHandling(e -> e
      .authenticationEntryPoint(problemJsonEntryPoint));   // must return your error shape
```

**Detail that bites:** the default 401 body is empty/HTML. Your app parses
`{"error":{"code","message"}}` — a custom `AuthenticationEntryPoint` and `AccessDeniedHandler`
are required, or the app shows "Something went wrong" instead of "Session expired".

---

## Password handling

- BCrypt, cost 12 (measure: ~250ms/hash is a reasonable target).
- Minimum 10 characters; check against a common-password list rather than demanding symbols —
  composition rules produce `Password1!` and little else.
- **Never** log passwords, tokens, or the `Authorization` header. Add a log filter and verify it.

---

## User enumeration

Return the **same** error and roughly the same timing for "email not found" and "wrong
password". Otherwise your login endpoint becomes a free account-discovery API.

---

## Rate limiting (Bucket4j + Redis)

| Scope | Limit | Why |
|---|---|---|
| `/auth/login` per IP | 5 / 15 min | brute force |
| `/auth/register` per IP | 3 / hour | spam |
| `/api/v1/**` per user | 120 / min | protects your **two** vendor quotas (India + US are independent budgets) |
| `/ai/ask` per user | 10 / hour | LLM cost |

Counters **must** live in Redis, not in memory — with two instances, in-memory limits silently
double (week 8). Note that the underlying vendor quota this protects is genuinely two separate
budgets (your India broker's rate limit and your US vendor's rate limit have nothing to do with
each other), so a per-user API limit here is protecting your app's aggregate load, not either
vendor directly — the per-vendor protection is the bulkhead/circuit-breaker work in week 3.

Return `429` with your error shape plus a `Retry-After` header. The mobile client already
backs off and retries on 429.

---

## Input validation

Bean Validation on every request body (`@Valid`, `@Email`, `@Size`, `@Pattern`). For market
endpoints, validate `(market, symbol)` **as a pair** against a whitelist — it flows into
queries, cache keys, Kafka keys, and STOMP destinations. An unvalidated symbol is an injection
surface in four systems at once, and an unvalidated `market` value on its own is a smaller but
real one: `market='IN'` with `symbol='SPX'` should be rejected as a mismatched pair, not
silently accepted and passed through to a query that assumes the combination is real.

```java
// symbol whitelist keyed by market — a flat Set<String> of symbols is not enough
Map<Market, Set<String>> ALLOWED_SYMBOLS = Map.of(
    Market.IN, Set.of("NIFTY", "BANKNIFTY", "FINNIFTY", "SENSEX"),
    Market.US, Set.of("SPX", "NDX", "SPY", "QQQ")
);
```

---

## OWASP checklist for this API

| Risk | Mitigation here |
|---|---|
| Broken access control | `@PreAuthorize`; every query scoped by `user_id`; never trust an id from the client |
| Cryptographic failures | TLS everywhere; BCrypt; hashed refresh tokens; ≥256-bit JWT secret |
| Injection | JPA parameter binding; `(market, symbol)` whitelist; never string-concatenate SQL |
| Insecure design | rate limits, iteration caps on the agent, tool allowlist |
| Misconfiguration | Actuator locked to ADMIN; stack traces never returned |
| Vulnerable components | `mvn dependency-check` / Dependabot in CI |
| Auth failures | rotation, revocation, lockout, no enumeration |
| SSRF | **the crawler is your SSRF surface** — see below |
| Logging failures | structured logs, correlation IDs, no secrets |

### SSRF via the crawler — easy to miss

If any user-supplied URL can be crawled, an attacker can point it at
`http://169.254.169.254/` (cloud metadata) or your internal services. Defences: allowlist
schemes (`http`/`https` only), resolve the DNS and **block private/link-local IP ranges**,
disable redirects to private ranges, and set strict timeouts and response size caps. This
applies identically to India and US crawl sources — the SSRF risk is in accepting arbitrary
URLs, not in which market a legitimate source happens to cover.

---

## Regulatory & data-licensing constraints, not just "security"

Two markets means two sets of rules about the data itself, worth treating as a real
constraint rather than an afterthought:

- **India (SEBI):** broker APIs generally bundle real-time market data as part of the broker
  relationship with their own customers. Respect the API's ToS on redistribution — this is a
  personal/learning project serving data back to yourself, not a data-redistribution business.
- **US (SEC/FINRA + exchange data policies):** **real-time SIP data is a separately licensed
  product** in the US, distinct from your brokerage/API access. Many free or hobby-tier US
  market-data APIs (including some brokers' own developer tiers) provide **15-minute delayed**
  data unless you've separately signed an exchange market-data agreement. Know which you have
  per vendor, and **surface the delay honestly in the API response** (an `asOf` timestamp
  already does this if it's accurate) rather than presenting delayed US data as if it were as
  fresh as your real-time India feed.

Neither of these is a security vulnerability in the OWASP sense, but shipping US "real-time"
data that's actually 15 minutes stale — silently — is exactly the kind of "silently wrong"
failure this whole plan tries to design against elsewhere (see the closing note in
`01-WEEK-BY-WEEK.md`).

---

## Secrets

Never in `application.yml`. Env vars locally, parameter store / secrets manager in prod — now
for **two** sets of vendor credentials (India broker keys, US vendor keys) plus the LLM/
embedding key. Rotate the JWT signing key with a key-id (`kid`) header so old tokens verify
during rollover.

Keep a `.env.example` with the *names* and no values, committed. Add real `.env` to `.gitignore`
on day one — leaked broker/vendor API keys are someone else's money, in either currency.

---

## Week 8 additions

- HTTPS/WSS termination at nginx; HSTS.
- Security headers (`X-Content-Type-Options`, `X-Frame-Options`, CSP if you keep the web app).
- Audit log for auth events (login, refresh, revoke, admin actions).
- Automated dependency scanning in CI.

---

## Verify (do these by hand, once)

- [ ] Access token expires → app refreshes silently → user never notices
- [ ] Refresh token reuse after rotation → chain revoked → forced re-login
- [ ] 6th login attempt in 15 min → `429` in your error shape
- [ ] Request another user's watchlist by id → `403`, not their data
- [ ] `market=IN&symbol=SPX` (mismatched pair) → `400`, not a query against a symbol that
      doesn't exist in that market
- [ ] Crawl `http://169.254.169.254/` → blocked
- [ ] `grep -ri "password\|bearer" logs/` → nothing sensitive
